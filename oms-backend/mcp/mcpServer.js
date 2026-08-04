const path = require("path");
const { McpServer } = require(path.join(
  __dirname,
  "..",
  "node_modules",
  "@modelcontextprotocol/sdk",
  "dist",
  "cjs",
  "server",
  "mcp.js",
));
const {
  StreamableHTTPServerTransport,
} = require(path.join(
  __dirname,
  "..",
  "node_modules",
  "@modelcontextprotocol/sdk",
  "dist",
  "cjs",
  "server",
  "streamableHttp.js",
));
const { z } = require("zod");
const prisma = require("../config/db");

const ORDER_INCLUDE = {
  items: {
    include: {
      product: true,
    },
  },
  user: {
    select: { id: true, name: true, email: true },
  },
};

const buildToolResult = (payload) => ({
  content: [
    {
      type: "text",
      text: JSON.stringify(payload, null, 2),
    },
  ],
});

const registerMcpTools = (server) => {
  server.registerTool(
    "getOrderById",
    {
      description: "Retrieve a single order by ID using the existing OMS order lookup logic.",
      inputSchema: {
        orderId: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ orderId }) => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: ORDER_INCLUDE,
      });

      if (!order) {
        throw new Error("Order not found");
      }

      return buildToolResult({ order });
    },
  );

  server.registerTool(
    "searchOrders",
    {
      description: "Search orders by status, date range, and customer using the existing OMS order query patterns.",
      inputSchema: {
        status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        customer: z.string().optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ status, startDate, endDate, customer }) => {
      const where = {};

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      if (customer) {
        where.OR = [
          { user: { name: { contains: customer, mode: "insensitive" } } },
          { user: { email: { contains: customer, mode: "insensitive" } } },
        ];
      }

      const orders = await prisma.order.findMany({
        where,
        take: 50,
        orderBy: { createdAt: "desc" },
        include: ORDER_INCLUDE,
      });

      return buildToolResult({ orders, count: orders.length });
    },
  );

  server.registerTool(
    "getInvoice",
    {
      description: "Build a read-only invoice payload for an existing order using the OMS order details already returned by the app.",
      inputSchema: {
        orderId: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ orderId }) => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: ORDER_INCLUDE,
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const invoice = {
        invoiceNumber: `INV-${order.id.slice(0, 8).toUpperCase()}`,
        orderId: order.id,
        status: order.status,
        customer: order.user,
        createdAt: order.createdAt,
        subtotal: order.items.reduce(
          (sum, item) => sum + Number(item.priceAtPurchase || 0) * Number(item.quantity || 0),
          0,
        ),
        discountAmount: Number(order.discountAmount || 0),
        totalAmount: Number(order.totalAmount || 0),
        items: order.items.map((item) => ({
          productName: item.product?.name || "Unknown product",
          quantity: item.quantity,
          priceAtPurchase: Number(item.priceAtPurchase || 0),
          lineTotal: Number(item.priceAtPurchase || 0) * Number(item.quantity || 0),
        })),
      };

      return buildToolResult({ invoice });
    },
  );

  server.registerTool(
    "getRevenueSummary",
    {
      description: "Return a revenue summary for a date range using the same order aggregation approach as the dashboard stats.",
      inputSchema: {
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ startDate, endDate }) => {
      const where = { status: { not: "CANCELLED" } };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const totalRevenue = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount || 0),
        0,
      );
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

      return buildToolResult({
        revenueSummary: {
          startDate: startDate || null,
          endDate: endDate || null,
          totalRevenue,
          totalOrders,
          averageOrderValue,
          deliveredOrders: orders.filter((order) => order.status === "DELIVERED").length,
          pendingOrders: orders.filter((order) => order.status === "PENDING").length,
        },
      });
    },
  );

  server.registerTool(
    "getInventoryStatus",
    {
      description: "Return read-only stock status for a specific product or a product group matching a category-like search term.",
      inputSchema: {
        productId: z.string().optional(),
        category: z.string().optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ productId, category }) => {
      if (productId) {
        const product = await prisma.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          throw new Error("Product not found");
        }

        return buildToolResult({
          inventoryStatus: {
            product,
            lowStock: Number(product.stock || 0) <= 10,
          },
        });
      }

      const where = category
        ? {
            OR: [
              { name: { contains: category, mode: "insensitive" } },
              { description: { contains: category, mode: "insensitive" } },
            ],
          }
        : {};

      const products = await prisma.product.findMany({
        where,
        orderBy: { stock: "asc" },
        take: 50,
      });

      return buildToolResult({
        inventoryStatus: {
          category: category || null,
          products: products.map((product) => ({
            ...product,
            lowStock: Number(product.stock || 0) <= 10,
          })),
        },
      });
    },
  );
};

const createMcpServer = () => {
  const server = new McpServer({
    name: "oms-backend-mcp",
    version: "1.0.0",
  });

  registerMcpTools(server);
  return server;
};

const createTransport = () => new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

const handleMcpRequest = async (req, res, body) => {
  const transport = createTransport();
  const server = createMcpServer();

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } finally {
    await server.close().catch(() => {});
  }
};

const requireMcpApiKey = (req, res, next) => {
  const expectedKey = process.env.MCP_API_KEY;

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      message: "MCP_API_KEY is not configured.",
    });
  }

  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token || token !== expectedKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Send Authorization: Bearer <MCP_API_KEY>.",
    });
  }

  return next();
};

module.exports = {
  createMcpServer,
  createTransport,
  handleMcpRequest,
  requireMcpApiKey,
};
