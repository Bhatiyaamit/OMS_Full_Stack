const prisma = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

// ─────────────────────────────────────────────
// Helper: get or create cart for the current user
// ─────────────────────────────────────────────
const getOrCreateCart = async (userId) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                image: true,
              },
            },
          },
        },
      },
    });
  }

  return cart;
};

// ─────────────────────────────────────────────
// Format cart items for frontend consumption
// ─────────────────────────────────────────────
const formatCartItems = (cart) =>
  cart.items.map((ci) => ({
    id: ci.product.id,
    name: ci.product.name,
    price: ci.product.price,
    stock: ci.product.stock,
    image: ci.product.image,
    quantity: ci.quantity,
  }));

// ─────────────────────────────────────────────
// GET /api/cart
// ─────────────────────────────────────────────
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  res.json({ success: true, data: { items: formatCartItems(cart) } });
});

// ─────────────────────────────────────────────
// POST /api/cart/sync
//  Body: { items: [{ productId, quantity }] }
//  Replaces all cart items atomically. Called after login to push localStorage cart.
// ─────────────────────────────────────────────
const syncCart = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    throw new ApiError(400, "items must be an array");
  }

  // Find or create the cart row
  let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: req.user.id } });
  }

  // Deduplicate incoming items (in case of frontend bugs causing duplicates)
  const itemMap = new Map();
  for (const { productId, quantity } of items) {
    if (!productId || quantity <= 0) continue;
    itemMap.set(productId, (itemMap.get(productId) || 0) + quantity);
  }

  // Strategy A — local wins: gracefully upsert from localStorage
  await prisma.$transaction(async (tx) => {
    // Step 1: Delete any items from the server cart that are NOT in the local cart
    const incomingProductIds = Array.from(itemMap.keys());
    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId: { notIn: incomingProductIds },
      },
    });

    // Step 2: Upsert incoming items (safe against duplicate network requests)
    for (const [productId, quantity] of itemMap.entries()) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      });
      if (!product) continue;

      const finalQuantity = Math.min(quantity, product.stock);

      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        update: { quantity: finalQuantity },
        create: {
          cartId: cart.id,
          productId,
          quantity: finalQuantity,
        },
      });
    }
  });

  // Return saved cart
  const updated = await getOrCreateCart(req.user.id);
  res.json({ success: true, data: { items: formatCartItems(updated) } });
});

// ─────────────────────────────────────────────
// PATCH /api/cart/item
//  Body: { productId, quantity }
//  quantity = 0 → delete; quantity > 0 → upsert
// ─────────────────────────────────────────────
const updateItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId) throw new ApiError(400, "productId is required");
  if (quantity === undefined || quantity < 0)
    throw new ApiError(400, "quantity must be >= 0");

  const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
  if (!cart) throw new ApiError(404, "Cart not found");

  if (quantity === 0) {
    // Delete item
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
  } else {
    // Upsert using compound key — safe and atomic
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity },
      create: { cartId: cart.id, productId, quantity },
    });
  }

  const updated = await getOrCreateCart(req.user.id);
  res.json({ success: true, data: { items: formatCartItems(updated) } });
});

// ─────────────────────────────────────────────
// DELETE /api/cart
// ─────────────────────────────────────────────
const clearCart = asyncHandler(async (req, res) => {
  const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });

  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  res.json({ success: true, message: "Cart cleared" });
});

module.exports = { getCart, syncCart, updateItem, clearCart };
