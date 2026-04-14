import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  fetchCart,
  syncCartToServer,
  patchCartItem,
  deleteCart,
} from "../api/cartApi";

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
 *   - It also calls POST /api/cart/sync to push guest items to DB.
 *   - Then resets the guest flag.
 *
 * Authenticated flow:
 *   - addItem / removeItem / deleteItem / clearCart all hit the API in the background.
 *   - On page load, `hydratFromServer()` fetches the server cart and merges with localStorage.
 */
const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // [{ id, name, price, stock, image, quantity }]
      isGuestCart: true, // true until user logs in

      /* ── Add one unit of a product ── */
      addItem: async (product, isAuthenticated = false) => {
        // Optimistic local update first
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id
                  ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                image: product.image,
                discountType: product.discountType,
                discountValue: product.discountValue,
                quantity: 1,
              },
            ],
          };
        });

        // Sync to DB if authenticated
        if (isAuthenticated) {
          const item = get().items.find((i) => i.id === product.id);
          try {
            await patchCartItem(product.id, item?.quantity ?? 1);
          } catch (_) {
            /* silent — local state already updated */
          }
        }
      },

      /* ── Remove one unit (or drop item if qty reaches 0) ── */
      removeItem: async (productId, isAuthenticated = false) => {
        let newQty = 0;
        set((state) => {
          const existing = state.items.find((i) => i.id === productId);
          if (!existing) return state;
          if (existing.quantity <= 1) {
            newQty = 0;
            return { items: state.items.filter((i) => i.id !== productId) };
          }
          newQty = existing.quantity - 1;
          return {
            items: state.items.map((i) =>
              i.id === productId ? { ...i, quantity: newQty } : i,
            ),
          };
        });

        if (isAuthenticated) {
          try {
            await patchCartItem(productId, newQty);
          } catch (_) {
            /* silent */
          }
        }
      },

      /* ── Drop item entirely ── */
      deleteItem: async (productId, isAuthenticated = false) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== productId),
        }));

        if (isAuthenticated) {
          try {
            await patchCartItem(productId, 0);
          } catch (_) {
            /* silent */
          }
        }
      },

      /* ── Clear entire cart ── */
      clearCart: async (isAuthenticated = false) => {
        set({ items: [], isGuestCart: true });

        if (isAuthenticated) {
          try {
            await deleteCart();
          } catch (_) {
            /* silent */
          }
        }
      },

      /**
       * mergeGuestCart — call right after login succeeds.
       *
       * Strategy:
       *  1. POST /api/cart/sync to merge guest items into DB (server merges intelligently).
       *  2. Fetch server state back and update local store.
       *
       * @param {Array} serverItems  (optional) items already in the user's server cart
       */
      mergeGuestCart: async (serverItems = []) => {
        const guestItems = get().items;

        try {
          if (guestItems.length > 0) {
            // Push guest items to DB — server handles merge/dedup
            const merged = await syncCartToServer(guestItems);
            set({ items: merged, isGuestCart: false });
          } else if (serverItems.length > 0) {
            set({ items: serverItems, isGuestCart: false });
          } else {
            // No guest items — just fetch server cart
            const dbItems = await fetchCart();
            set({ items: dbItems, isGuestCart: false });
          }
        } catch (_) {
          // Fallback: keep local items, still mark authenticated
          set((state) => ({ items: state.items, isGuestCart: false }));
        }
      },

      /**
       * hydrateFromServer — call on mount when the user is already logged in.
       * Server is the single source of truth on reload — just GET, never re-sync.
       * Re-syncing on every reload is what causes quantity doubling.
       */
      hydrateFromServer: async () => {
        try {
          const dbItems = await fetchCart();
          // Server wins — replace local state entirely
          set({ items: dbItems, isGuestCart: false });
        } catch (_) {
          /* keep local items if server is unreachable */
        }
      },

      /* ── Mark cart as belonging to an authenticated user ── */
      setAuthenticated: () => set({ isGuestCart: false }),
    }),
    {
      name: "shopnest-cart",
      partialize: (state) => ({
        items: state.items,
        isGuestCart: state.isGuestCart,
      }),
    },
  ),
);

export default useCartStore;
