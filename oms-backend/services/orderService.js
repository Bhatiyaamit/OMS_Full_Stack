const prisma = require("../config/db");
const stripe = require("../config/stripe");
const ApiError = require("../utils/ApiError");
const { sendOrderConfirmation, sendStatusUpdate } = require("./emailService");

// ── Status transition rules ───────────────────────────────────────────────────
const STATUS_FLOW = {
  PENDING: "CONFIRMED",
  CONFIRMED: "SHIPPED",
  SHIPPED: "DELIVERED",
  DELIVERED: null, // terminal — no next state
};

// ── Place order ───────────────────────────────────────────────────────────────
const placeOrderService = async (userId, items, stripePaymentId = null) => {
  // 1. Fetch all products in one query
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  // 2. Validate — every product must exist and have enough stock
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      throw new ApiError(404, `Product ${item.productId} not found`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for "${product.name}". Available: ${product.stock}`,
      );
    }
  }

  // 3. Calculate total using current price as snapshot
  const totalAmount = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + product.price * item.quantity;
  }, 0);

  // 4. Create order + deduct stock atomically inside a transaction
  const order = await prisma.$transaction(async (tx) => {
    // Deduct stock for every product
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Create the order with price snapshot on each item
    return tx.order.create({
      data: {
        userId,
        totalAmount,
        status: stripePaymentId ? "CONFIRMED" : "PENDING",
        stripePaymentId: stripePaymentId || null,
        items: {
          create: items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: product.price, // snapshot at purchase time
            };
          }),
        },
      },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  });

  // 5. Send confirmation email (non-blocking — don't await)
  sendOrderConfirmation(order).catch(console.error);

  return order;
};

// ── Update order status ───────────────────────────────────────────────────────
const updateStatusService = async (orderId, newStatus, userRole) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found");

  // Enforce transition rules
  const allowedNext = STATUS_FLOW[order.status];
  if (allowedNext === null) {
    throw new ApiError(400, "Order is already delivered — no further updates");
  }
  if (newStatus !== allowedNext) {
    throw new ApiError(
      400,
      `Invalid transition: ${order.status} → ${newStatus}. Next allowed: ${allowedNext}`,
    );
  }

  // Only Admin can mark DELIVERED
  if (newStatus === "DELIVERED" && userRole !== "ADMIN") {
    throw new ApiError(403, "Only Admin can mark an order as DELIVERED");
  }

  // Manager cannot go beyond SHIPPED
  if (userRole === "MANAGER" && newStatus === "DELIVERED") {
    throw new ApiError(403, "Manager can update status up to SHIPPED only");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
    include: {
      items: { include: { product: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Send status update email (non-blocking)
  sendStatusUpdate(updated).catch(console.error);

  return updated;
};

// ── Cancel order ──────────────────────────────────────────────────────────────
const cancelOrderService = async (orderId, userId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new ApiError(404, "Order not found");
  if (order.userId !== userId) throw new ApiError(403, "Not your order");
  if (order.status !== "PENDING") {
    throw new ApiError(400, `Cannot cancel — order is already ${order.status}`);
  }

  // Restore stock + mark cancelled inside a transaction
  const cancelled = await prisma.$transaction(async (tx) => {
    // Restore stock for every item
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // Delete the order (cascade deletes OrderItems via schema)
    return tx.order.delete({ where: { id: orderId } });
  });

  return cancelled;
};

// ── Create Payment Intent ──────────────────────────────────────────────────────
const createPaymentIntentService = async (userId, items) => {
  // 1. Fetch all products in one query
  const productIds = items.map((i) => i.productId);
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  // 2. Validate — every product must exist and have enough stock
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      throw new ApiError(404, `Product ${item.productId} not found`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for "${product.name}". Available: ${product.stock}`
      );
    }
  }

  // 3. Calculate total in rupees
  const totalAmount = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + product.price * item.quantity;
  }, 0);

  // 4. Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalAmount * 100),
    currency: "inr",
    metadata: {
      userId,
      itemCount: items.length.toString(),
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    totalAmount,
  };
};

module.exports = {
  placeOrderService,
  updateStatusService,
  cancelOrderService,
  createPaymentIntentService,
};
