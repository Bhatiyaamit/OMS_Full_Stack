import api from "./axiosInstance";

/** GET /api/cart */
export const fetchCart = () => api.get("/cart").then((r) => r.data.items);

/** POST /api/cart/sync  — push guest items to DB after login */
export const syncCartToServer = (items) =>
  api
    .post("/cart/sync", {
      items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
    })
    .then((r) => r.data.items);

/** PATCH /api/cart/item — upsert one item (quantity=0 deletes it) */
export const patchCartItem = (productId, quantity) =>
  api.patch("/cart/item", { productId, quantity }).then((r) => r.data.items);

/** DELETE /api/cart — wipe all items */
export const deleteCart = () => api.delete("/cart");
