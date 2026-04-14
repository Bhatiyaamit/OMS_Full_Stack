const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../services/uploadService");
const {
  createProductSchema,
  updateProductSchema,
} = require("../validators/product.schema");

// GET /api/products
const getAllProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = search
    ? { name: { contains: search, mode: "insensitive" } }
    : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

// GET /api/products/:id
const getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ success: true, data: product });
});

// POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const body = {
    ...req.body,
    price: Number(req.body.price),
    stock: Number(req.body.stock),
    discountValue: req.body.discountValue ? Number(req.body.discountValue) : 0,
    // Empty string → null so Prisma stores NULL (no discount)
    discountType: req.body.discountType || null,
  };
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(422, parsed.error.errors[0].message);

  const existing = await prisma.product.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) throw new ApiError(409, "Product name already exists");

  let imageUrl = null;
  if (req.file) {
    imageUrl = await uploadToCloudinary(req.file.path, "oms/products");
  }

  const product = await prisma.product.create({
    data: { ...parsed.data, image: imageUrl },
  });

  res.status(201).json({ success: true, data: product });
});

// PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) throw new ApiError(404, "Product not found");

  const body = { ...req.body };
  if (body.price) body.price = Number(body.price);
  if (body.stock !== undefined) body.stock = Number(body.stock);
  if (body.discountValue !== undefined)
    body.discountValue = Number(body.discountValue);
  if (body.discountType === "") body.discountType = null;

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(422, parsed.error.errors[0].message);

  let imageUrl = existing.image;
  if (req.file) {
    if (existing.image) await deleteFromCloudinary(existing.image);
    imageUrl = await uploadToCloudinary(req.file.path, "oms/products");
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { ...parsed.data, image: imageUrl },
  });

  res.json({ success: true, data: product });
});

// DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });
  if (!product) throw new ApiError(404, "Product not found");

  // Check if any orders reference this product
  const orderCount = await prisma.orderItem.count({
    where: { productId: req.params.id },
  });
  if (orderCount > 0)
    throw new ApiError(400, "Cannot delete — product has existing orders");

  if (product.image) await deleteFromCloudinary(product.image);

  await prisma.product.delete({ where: { id: req.params.id } });

  res.json({ success: true, message: "Product deleted successfully" });
});

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
