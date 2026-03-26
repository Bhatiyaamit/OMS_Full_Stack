const { z } = require("zod");

const createProductSchema = z.object({
  name: z.string().min(1, "Product name required"),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .positive("Price must be > 0"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
});

const updateProductSchema = createProductSchema.partial();

module.exports = { createProductSchema, updateProductSchema };
