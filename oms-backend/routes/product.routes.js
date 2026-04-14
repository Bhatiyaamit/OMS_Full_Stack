const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { bulkImportProducts } = require("../controllers/bulkImportController");
const { protect } = require("../middleware/authMiddleware");
const { optionalProtect } = require("../middleware/optionalAuthMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { upload } = require("../services/uploadService");
const { uploadZip } = require("../middleware/uploadZipMiddleware");

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product catalogue management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         price:
 *           type: number
 *           format: float
 *         stock:
 *           type: integer
 *         image:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products (paginated, searchable)
 *     tags: [Products]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name (case-insensitive)
 *     responses:
 *       200:
 *         description: Paginated product list
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
 *                     $ref: '#/components/schemas/Product'
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
// Public — guests can browse products (no auth required)
router.get("/", optionalProtect, getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
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
 *         description: Product details
 *       404:
 *         description: Product not found
 */
// Public — guests can view individual products
router.get("/:id", optionalProtect, getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price, stock]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Wireless Keyboard
 *               price:
 *                 type: number
 *                 example: 1499.99
 *               stock:
 *                 type: integer
 *                 example: 50
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Product created
 *       403:
 *         description: Forbidden — Admin only
 *       409:
 *         description: Product name already exists
 *       422:
 *         description: Validation error
 */
// POST /api/products/bulk-import — ADMIN only, ZIP upload
router.post(
  "/bulk-import",
  protect,
  authorize("ADMIN", "MANAGER"),
  uploadZip.single("zipFile"),
  bulkImportProducts,
);

router.post(
  "/",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  createProduct,
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product (Admin only)
 *     tags: [Products]
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
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Product updated
 *       403:
 *         description: Forbidden — Admin only
 *       404:
 *         description: Product not found
 *       422:
 *         description: Validation error
 */
router.put(
  "/:id",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  updateProduct,
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
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
 *         description: Product deleted
 *       400:
 *         description: Cannot delete — product has existing orders
 *       403:
 *         description: Forbidden — Admin only
 *       404:
 *         description: Product not found
 */
router.delete("/:id", protect, authorize("ADMIN"), deleteProduct);

module.exports = router;
