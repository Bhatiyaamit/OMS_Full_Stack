const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getCart, syncCart, updateItem, clearCart } = require("../controllers/cartController");

// All cart routes require authentication
router.use(protect);

router.get("/", getCart);          // GET  /api/cart
router.post("/sync", syncCart);    // POST /api/cart/sync
router.patch("/item", updateItem); // PATCH /api/cart/item
router.delete("/", clearCart);     // DELETE /api/cart

module.exports = router;
