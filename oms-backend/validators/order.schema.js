const { z } = require("zod");

const orderItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  stripePaymentId: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"]),
});

module.exports = { createOrderSchema, updateStatusSchema };
