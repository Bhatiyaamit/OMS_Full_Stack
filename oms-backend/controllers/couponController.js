const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { z } = require("zod");
const {
  validateCouponService,
  createCouponService,
  listCouponsService,
  deleteCouponService,
  toggleCouponService,
} = require("../services/couponService");

const createCouponSchema = z.object({
  code: z.string().min(2, "Code is required"),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive("Discount value must be positive"),
  minAmount: z.number().min(0).optional(),
  maxDiscount: z.number().positive().optional().nullable(),
  expiryDate: z.string().datetime({ offset: true }).or(z.string().min(10)),
  usageLimit: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

// POST /api/coupons/validate  (Customer — validate before payment)
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code || subtotal === undefined)
    throw new ApiError(422, "code and subtotal are required");

  const result = await validateCouponService(code, Number(subtotal));
  res.json({
    success: true,
    coupon: {
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
      maxDiscount: result.coupon.maxDiscount,
    },
    discountAmount: result.discountAmount,
  });
});

// POST /api/coupons  (Admin/Manager)
const createCoupon = asyncHandler(async (req, res) => {
  const parsed = createCouponSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, parsed.error.errors[0].message);

  const coupon = await createCouponService(parsed.data);
  res.status(201).json({ success: true, data: coupon });
});

// GET /api/coupons  (Admin/Manager)
const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = await listCouponsService();
  res.json({ success: true, data: coupons });
});

// DELETE /api/coupons/:id  (Admin only)
const deleteCoupon = asyncHandler(async (req, res) => {
  await deleteCouponService(req.params.id);
  res.json({ success: true, message: "Coupon deleted" });
});

// PATCH /api/coupons/:id/toggle  (Admin/Manager)
const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await toggleCouponService(req.params.id);
  res.json({ success: true, data: coupon });
});

module.exports = {
  validateCoupon,
  createCoupon,
  listCoupons,
  deleteCoupon,
  toggleCoupon,
};
