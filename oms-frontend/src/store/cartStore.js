import { create } from "zustand";
import { persist } from "zustand/middleware";

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // Array of { product, quantity }
      
      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find((item) => item.product.id === product.id);
        
        if (existingItem) {
          set({
            items: items.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ items: [...items, { product, quantity }] });
        }
      },
      
      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.product.id !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        set({
          items: get().items.map((item) => 
            item.product.id === productId ? { ...item, quantity } : item
          )
        });
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + parseFloat(item.product.price) * item.quantity,
          0
        );
      },
    }),
    {
      name: "oms-cart-storage",
    }
  )
);

export default useCartStore;
