const express = require("express");
const router = express.Router();
const {
  placeOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.post("/", protect, authorize("CUSTOMER"), placeOrder);
router.get("/", protect, getAllOrders);
router.get("/:id", protect, getOrderById);
router.put(
  "/:id/status",
  protect,
  authorize("ADMIN", "MANAGER"),
  updateOrderStatus,
);
router.delete("/:id", protect, authorize("CUSTOMER"), cancelOrder);

module.exports = router;
