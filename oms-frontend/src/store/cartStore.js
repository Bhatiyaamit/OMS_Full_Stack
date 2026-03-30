import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Cart store — works for both guests and authenticated users.
 *
 * Guest flow:
 *   - Items are stored in localStorage via `persist` so they survive page refresh.
 *   - `isGuestCart` flag is true when the user is not logged in.
 *
 * Login / merge flow:
 *   - After login, call `mergeGuestCart()`.
 *   - It deduplicates by product id, summing quantities.
 *   - Then resets the guest flag.
 *
 * Auth-aware helpers:
 *   - `clearCart()` — wipe everything (call on logout).
 *   - `mergeGuestCart()` — call immediately after a successful login response.
 */
const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],          // [{ id, name, price, stock, image, quantity }]
      isGuestCart: true,  // true until user logs in

      /* ── Add one unit of a product ── */
      addItem: (product) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id
                  ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                id:       product.id,
                name:     product.name,
                price:    product.price,
                stock:    product.stock,
                image:    product.image,
                quantity: 1,
              },
            ],
          };
        });
      },

      /* ── Remove one unit (or drop item if qty reaches 0) ── */
      removeItem: (productId) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === productId);
          if (!existing) return state;
          if (existing.quantity <= 1) {
            return { items: state.items.filter((i) => i.id !== productId) };
          }
          return {
            items: state.items.map((i) =>
              i.id === productId ? { ...i, quantity: i.quantity - 1 } : i
            ),
          };
        });
      },

      /* ── Drop item entirely ── */
      deleteItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== productId) })),

      /* ── Clear entire cart ── */
      clearCart: () => set({ items: [], isGuestCart: true }),

      /**
       * mergeGuestCart — call right after login succeeds.
       *
       * Strategy: the guest items are already in `state.items`.
       * We just flip the flag and keep them — no API needed here.
       * If you have a server-side cart, pass `serverItems` and we deduplicate.
       *
       * @param {Array} serverItems  (optional) items already in the user's server cart
       */
      mergeGuestCart: (serverItems = []) => {
        set((state) => {
          // Start with server items as base
          const merged = [...serverItems];

          // For each guest item, add to merged or bump quantity
          state.items.forEach((guestItem) => {
            const match = merged.find((m) => m.id === guestItem.id);
            if (match) {
              match.quantity = Math.min(
                match.quantity + guestItem.quantity,
                guestItem.stock
              );
            } else {
              merged.push({ ...guestItem });
            }
          });

          return { items: merged, isGuestCart: false };
        });
      },

      /* ── Mark cart as belonging to an authenticated user ── */
      setAuthenticated: () => set({ isGuestCart: false }),

      /* ── Derived helpers ── */
      get totalItems() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
      get totalPrice() {
        return get().items.reduce(
          (sum, i) => sum + parseFloat(i.price) * i.quantity,
          0
        );
      },
    }),
    {
      name: "shopnest-cart", // localStorage key
      // Only persist items + guest flag — skip derived getters
      partialize: (state) => ({ items: state.items, isGuestCart: state.isGuestCart }),
    }
  )
);

export default useCartStore;
