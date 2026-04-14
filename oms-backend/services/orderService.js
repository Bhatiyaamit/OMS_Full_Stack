const prisma = require("../config/db");
const stripe = require("../config/stripe");
const ApiError = require("../utils/ApiError");
const { sendOrderConfirmation, sendStatusUpdate } = require("./emailService");
const { effectivePrice, validateCouponService } = require("./couponService");

// ── Status transition rules ───────────────────────────────────────────────────
const STATUS_FLOW = {
  PENDING: "CONFIRMED",
  CONFIRMED: "SHIPPED",
  SHIPPED: "DELIVERED",
  DELIVERED: null, // terminal — no next state
};

// ── Place order ───────────────────────────────────────────────────────────────
const placeOrderService = async (
  userId,
  items,
  stripePaymentId = null,
  couponCode = null,
) => {
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

  // 3. Calculate subtotal using product-level discounted price
  const productSubtotal = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + effectivePrice(product) * item.quantity;
  }, 0);

  // 4. Validate and apply coupon discount (server-side re-validation)
  let discountAmount = 0;
  let validatedCoupon = null;
  if (couponCode) {
    const couponResult = await validateCouponService(
      couponCode,
      productSubtotal,
    );
    discountAmount = couponResult.discountAmount;
    validatedCoupon = couponResult.coupon;
  }

  const totalAmount = Math.max(0, productSubtotal - discountAmount);

  // 5. Create order + deduct stock + increment coupon usage atomically
  const order = await prisma.$transaction(async (tx) => {
    // Deduct stock for every product
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Increment coupon usedCount
    if (validatedCoupon) {
      await tx.coupon.update({
        where: { id: validatedCoupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Create the order with price snapshot on each item
    return tx.order.create({
      data: {
        userId,
        totalAmount,
        discountAmount,
        couponCode: validatedCoupon ? validatedCoupon.code : null,
        status: stripePaymentId ? "CONFIRMED" : "PENDING",
        stripePaymentId: stripePaymentId || null,
        items: {
          create: items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: effectivePrice(product), // snapshot after product discount
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

  // 6. Send confirmation email (non-blocking)
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
    // Restore stock quantity for each item
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // Decrement coupon usedCount if a coupon was used
    if (order.couponCode) {
      await tx.coupon
        .update({
          where: { code: order.couponCode },
          data: { usedCount: { decrement: 1 } },
        })
        .catch(() => {}); // coupon might have been deleted
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
  });

  return cancelled;
};

// ── Create Payment Intent ──────────────────────────────────────────────────────
const createPaymentIntentService = async (userId, items, couponCode = null) => {
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

  // 3. Calculate subtotal with product discounts
  const productSubtotal = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + effectivePrice(product) * item.quantity;
  }, 0);

  // 4. Apply coupon if provided
  let discountAmount = 0;
  if (couponCode) {
    const couponResult = await validateCouponService(
      couponCode,
      productSubtotal,
    );
    discountAmount = couponResult.discountAmount;
  }

  const totalAmount = Math.max(0, productSubtotal - discountAmount);

  // 5. Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalAmount * 100),
    currency: "inr",
    metadata: {
      userId,
      itemCount: items.length.toString(),
      couponCode: couponCode || "",
    },
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    productSubtotal,
    discountAmount,
    totalAmount,
  };
};

module.exports = {
  placeOrderService,
  updateStatusService,
  cancelOrderService,
  createPaymentIntentService,
};
