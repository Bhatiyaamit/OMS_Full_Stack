const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const stripe = require("../config/stripe");
const {
  placeOrderService,
  updateStatusService,
  cancelOrderService,
  createPaymentIntentService,
} = require("../services/orderService");
const {
  createOrderSchema,
  updateStatusSchema,
} = require("../validators/order.schema");

// POST /api/orders
const placeOrder = asyncHandler(async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, parsed.error.errors[0].message);

  const { items, stripePaymentId } = parsed.data;
  const order = await placeOrderService(req.user.id, items, stripePaymentId || null);

  res.status(201).json({ success: true, data: order });
});

// GET /api/orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  // Customers see only their own orders
  const where = {
    ...(req.user.role === "CUSTOMER" ? { userId: req.user.id } : {}),
    ...(status ? { status } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, image: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

// GET /api/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: { include: { product: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) throw new ApiError(404, "Order not found");

  // Customer can only view their own order
  if (req.user.role === "CUSTOMER" && order.userId !== req.user.id) {
    throw new ApiError(403, "Not authorized to view this order");
  }

  res.json({ success: true, data: order });
});

// PUT /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, parsed.error.errors[0].message);

  const order = await updateStatusService(
    req.params.id,
    parsed.data.status,
    req.user.role,
  );

  res.json({ success: true, data: order });
});

// DELETE /api/orders/:id  (cancel — Customer only, PENDING only)
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await cancelOrderService(req.params.id, req.user.id);
  res.json({
    success: true,
    data: order,
    message: "Order cancelled and stock restored",
  });
});

// POST /api/orders/create-payment-intent
const createPaymentIntent = asyncHandler(async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(422, parsed.error.errors[0].message);
  }

  const result = await createPaymentIntentService(
    req.user.id,
    parsed.data.items
  );

  res.json({
    success: true,
    clientSecret: result.clientSecret,
    paymentIntentId: result.paymentIntentId,
    totalAmount: result.totalAmount,
  });
});

// POST /api/orders/webhook
const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle payment_intent.succeeded event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const userId = paymentIntent.metadata.userId;

    console.log(
      `PaymentIntent ${paymentIntent.id} succeeded for user ${userId}`
    );
  }

  res.json({ received: true });
});

module.exports = {
  placeOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  createPaymentIntent,
  handleWebhook,
};
