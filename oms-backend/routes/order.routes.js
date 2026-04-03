const express = require("express");
const router = express.Router();
const {
  placeOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  createPaymentIntent,
  handleWebhook,
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// IMPORTANT: webhook route must come BEFORE any middleware that parses JSON body
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order placement & lifecycle management
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: token
 *   schemas:
 *     OrderItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         productId:
 *           type: string
 *           format: uuid
 *         quantity:
 *           type: integer
 *         priceAtPurchase:
 *           type: number
 *           format: float
 *         product:
 *           $ref: '#/components/schemas/Product'
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         totalAmount:
 *           type: number
 *           format: float
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED]
 *         stripePaymentId:
 *           type: string
 *           nullable: true
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         user:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place a new order (Customer only)
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *           example:
 *             items:
 *               - productId: "uuid-here"
 *                 quantity: 2
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Insufficient stock
 *       403:
 *         description: Forbidden — Customer only
 *       404:
 *         description: Product not found
 *       422:
 *         description: Validation error
 */
router.post("/", protect, authorize("CUSTOMER"), placeOrder);

/**
 * @swagger
 * /api/orders/create-payment-intent:
 *   post:
 *     summary: Create Stripe Payment Intent (Customer only)
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 */
router.post(
  "/create-payment-intent",
  protect,
  authorize("CUSTOMER"),
  createPaymentIntent
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List orders (Customers see own, Admin/Manager see all)
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: Paginated order list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get("/", protect, getAllOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order details with items and user
 *       403:
 *         description: Not authorized to view this order
 *       404:
 *         description: Order not found
 */
router.get("/:id", protect, getOrderById);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin/Manager only)
 *     description: |
 *       Follows strict status transitions:
 *       PENDING → CONFIRMED → SHIPPED → DELIVERED.
 *       Only Admin can mark DELIVERED.
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED]
 *           example:
 *             status: CONFIRMED
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Forbidden — Admin/Manager only
 *       404:
 *         description: Order not found
 */
router.put(
  "/:id/status",
  protect,
  authorize("ADMIN", "MANAGER"),
  updateOrderStatus,
);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Cancel an order (Customer only, PENDING orders only)
 *     description: Cancels the order and restores product stock.
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order cancelled and stock restored
 *       400:
 *         description: Cannot cancel — order is no longer PENDING
 *       403:
 *         description: Not your order / Forbidden
 *       404:
 *         description: Order not found
 */
router.delete("/:id", protect, authorize("CUSTOMER"), cancelOrder);

module.exports = router;
