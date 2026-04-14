const { z } = require("zod");

const createProductSchema = z.object({
  name: z.string().min(1, "Product name required"),
  description: z.string().optional().nullable(),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .positive("Price must be > 0"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  // '' means "no discount" (sent when type is NONE)
  discountType: z
    .enum(["PERCENTAGE", "FIXED", ""])
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
  discountValue: z.coerce.number().min(0).optional().nullable().default(0),
});

const updateProductSchema = createProductSchema.partial();

module.exports = { createProductSchema, updateProductSchema };
