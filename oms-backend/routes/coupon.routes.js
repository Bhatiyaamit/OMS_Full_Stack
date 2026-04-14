const express = require("express");
const router = express.Router();
const {
  validateCoupon,
  createCoupon,
  listCoupons,
  deleteCoupon,
  toggleCoupon,
} = require("../controllers/couponController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// POST /api/coupons/validate  — any logged-in user (Customer applies coupon at checkout)
router.post("/validate", protect, validateCoupon);

// GET /api/coupons  — Admin or Manager see all coupons
router.get("/", protect, authorize("ADMIN", "MANAGER"), listCoupons);

// POST /api/coupons  — Admin or Manager create
router.post("/", protect, authorize("ADMIN", "MANAGER"), createCoupon);

// PATCH /api/coupons/:id/toggle  — Admin or Manager toggle active
router.patch(
  "/:id/toggle",
  protect,
  authorize("ADMIN", "MANAGER"),
  toggleCoupon,
);

// DELETE /api/coupons/:id  — Admin only
router.delete("/:id", protect, authorize("ADMIN"), deleteCoupon);

module.exports = router;
