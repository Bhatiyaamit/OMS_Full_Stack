const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");

/**
 * Calculate the effective unit price for a product after product-level discount.
 */
const effectivePrice = (product) => {
  const { price, discountType, discountValue } = product;
  if (!discountType || !discountValue) return price;
  if (discountType === "PERCENTAGE") {
    return Math.max(0, price - (price * discountValue) / 100);
  }
  if (discountType === "FIXED") {
    return Math.max(0, price - discountValue);
  }
  return price;
};

/**
 * Validate a coupon code against a subtotal (after product discounts).
 * Returns { coupon, discountAmount } or throws ApiError.
 */
const validateCouponService = async (code, subtotal) => {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon) throw new ApiError(404, "Coupon not found");
  if (!coupon.isActive) throw new ApiError(400, "Coupon is inactive");
  if (new Date() > new Date(coupon.expiryDate))
    throw new ApiError(400, "Coupon has expired");
  if (coupon.usedCount >= coupon.usageLimit)
    throw new ApiError(400, "Coupon usage limit reached");
  if (subtotal < coupon.minAmount)
    throw new ApiError(
      400,
      `Minimum order amount of ₹${coupon.minAmount} required for this coupon`,
    );

  let discountAmount =
    coupon.discountType === "PERCENTAGE"
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;

  // Apply maxDiscount cap
  if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
    discountAmount = coupon.maxDiscount;
  }

  discountAmount = Math.min(discountAmount, subtotal); // never exceed subtotal

  return { coupon, discountAmount: parseFloat(discountAmount.toFixed(2)) };
};

/**
 * Create a coupon (Admin/Manager only).
 */
const createCouponService = async (data) => {
  const {
    code,
    discountType,
    discountValue,
    minAmount,
    maxDiscount,
    expiryDate,
    usageLimit,
    isActive,
  } = data;

  const existing = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (existing)
    throw new ApiError(409, "A coupon with this code already exists");

  return prisma.coupon.create({
    data: {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue,
      minAmount: minAmount ?? 0,
      maxDiscount: maxDiscount ?? null,
      expiryDate: new Date(expiryDate),
      usageLimit: usageLimit ?? 1,
      isActive: isActive ?? true,
    },
  });
};

/**
 * List all coupons (Admin/Manager).
 */
const listCouponsService = async () => {
  return prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
};

/**
 * Delete a coupon by ID (Admin only).
 */
const deleteCouponService = async (id) => {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return prisma.coupon.delete({ where: { id } });
};

/**
 * Toggle coupon active state (Admin/Manager).
 */
const toggleCouponService = async (id) => {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new ApiError(404, "Coupon not found");
  return prisma.coupon.update({
    where: { id },
    data: { isActive: !coupon.isActive },
  });
};

module.exports = {
  effectivePrice,
  validateCouponService,
  createCouponService,
  listCouponsService,
  deleteCouponService,
  toggleCouponService,
};
