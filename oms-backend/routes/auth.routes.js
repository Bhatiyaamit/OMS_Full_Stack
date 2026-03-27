const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & user session
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [ADMIN, MANAGER, CUSTOMER]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: secret123
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, CUSTOMER]
 *                 default: CUSTOMER
 *     responses:
 *       201:
 *         description: User registered successfully (JWT set in HttpOnly cookie)
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Validation error
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email & password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@oms.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful (JWT set in HttpOnly cookie)
 *       401:
 *         description: Invalid email or password
 *       422:
 *         description: Validation error
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */
router.get("/me", protect, getMe);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout (clears auth cookie)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post("/logout", protect, logout);

module.exports = router;
