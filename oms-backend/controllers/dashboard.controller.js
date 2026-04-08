const prisma = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const TREND_DAYS = 30;
const LOW_STOCK_THRESHOLD = 10;

const STATUS_META = {
  PENDING: { label: "Pending", color: "#f59e0b" },
  CONFIRMED: { label: "Confirmed", color: "#2563eb" },
  SHIPPED: { label: "Shipped", color: "#8b5cf6" },
  DELIVERED: { label: "Delivered", color: "#10b981" },
  CANCELLED: { label: "Cancelled", color: "#ef4444" },
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatTrendLabel = (value) =>
  value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

const buildTrend = (orders) => {
  const today = startOfDay(new Date());
  const buckets = [];
  const bucketMap = new Map();

  for (let index = TREND_DAYS - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);

    const key = date.toISOString().slice(0, 10);
    const bucket = {
      key,
      date: formatTrendLabel(date),
      revenue: 0,
      orders: 0,
    };

    buckets.push(bucket);
    bucketMap.set(key, bucket);
  }

  orders
    .filter((order) => order.status !== "CANCELLED")
    .forEach((order) => {
      const createdAt = new Date(order.createdAt);
      const key = startOfDay(createdAt).toISOString().slice(0, 10);
      const bucket = bucketMap.get(key);

      if (!bucket) return;

      bucket.revenue += Number(order.totalAmount || 0);
      bucket.orders += 1;
    });

  return buckets;
};

const buildStatusData = (orders) =>
  Object.entries(STATUS_META).map(([status, meta]) => ({
    key: status,
    name: meta.label,
    value: orders.filter((order) => order.status === status).length,
    color: meta.color,
  }));

const buildTopProducts = (orders) => {
  const lookup = new Map();

  orders
    .filter((order) => order.status !== "CANCELLED")
    .forEach((order) => {
      order.items?.forEach((item) => {
        const id = item.product?.id || item.productId;
        if (!id) return;

        const current = lookup.get(id) || {
          id,
          name: item.product?.name || "Product",
          image: item.product?.image || null,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += Number(item.quantity || 0);
        current.revenue +=
          Number(item.quantity || 0) * Number(item.priceAtPurchase || 0);

        lookup.set(id, current);
      });
    });

  return [...lookup.values()]
    .sort((left, right) => {
      if (right.quantity !== left.quantity) {
        return right.quantity - left.quantity;
      }
      return right.revenue - left.revenue;
    })
    .slice(0, 5);
};

// GET /api/dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
  // We limit to 1000 for parity with the old frontend logic and decent performance
  const limit = 1000;

  const [orders, totalOrderCount, products] = await Promise.all([
    prisma.order.findMany({
      take: limit,
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
    prisma.order.count(),
    prisma.product.findMany({ take: limit }),
  ]);

  const activeOrders = orders.filter((order) => order.status !== "CANCELLED");
  const deliveredOrders = orders.filter((order) => order.status === "DELIVERED");
  const totalRevenue = activeOrders.reduce(
    (sum, order) => sum + Number(order.totalAmount || 0),
    0
  );
  
  const averageOrderValue = activeOrders.length
    ? totalRevenue / activeOrders.length
    : 0;

  const lowStock = [...products]
    .filter((product) => Number(product.stock || 0) <= LOW_STOCK_THRESHOLD)
    .sort((left, right) => Number(left.stock || 0) - Number(right.stock || 0))
    .slice(0, 6);

  const uniqueCustomers = new Set(
    orders.map((order) => order.userId).filter(Boolean)
  ).size;

  const salesTrend = buildTrend(orders);
  const revenueLast30Days = salesTrend.reduce(
    (sum, entry) => sum + entry.revenue,
    0
  );

  const data = {
    managerName: req.user?.name || "Admin",
    totalRevenue,
    totalOrders: totalOrderCount,
    pendingOrders: orders.filter((order) => order.status === "PENDING").length,
    avgOrderValue: averageOrderValue,
    deliveredOrders: deliveredOrders.length,
    completionRate: orders.length
      ? (deliveredOrders.length / orders.length) * 100
      : 0,
    activeCustomers: uniqueCustomers,
    revenueLast30Days,
    inventoryItems: products.length,
    lowStockCount: lowStock.length,
    lowStock,
    recentOrders: orders.slice(0, 6),
    salesTrend,
    statusData: buildStatusData(orders),
    topProducts: buildTopProducts(orders),
  };

  res.json({ success: true, data });
});

module.exports = {
  getDashboardStats,
};
