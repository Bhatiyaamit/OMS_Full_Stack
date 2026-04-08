require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const cartRoutes = require("./routes/cart.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ── Core middleware ───────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true, // required for cookies
  }),
);
// ── Stripe Webhook (Must be before express.json) ───────
app.use(
  "/api/orders/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// ── Routes ────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ── Swagger docs ──────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Health check ──────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// ── Global error handler (always last) ───────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
