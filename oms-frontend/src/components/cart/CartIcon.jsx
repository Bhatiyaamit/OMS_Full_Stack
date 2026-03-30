import { useState } from "react";
import useCartStore from "../../store/cartStore";
import CartDrawer from "./CartDrawer";

/**
 * CartIcon — drop this anywhere in your Navbar.
 *
 * Shows a live item count badge.
 * Works for guests (localStorage) and logged-in users.
 * Opens CartDrawer on click.
 */
const CartIcon = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="relative w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors group"
        aria-label="Open cart"
      >
        <span
          className="material-symbols-outlined text-slate-700 group-hover:text-slate-900 transition-colors text-xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          shopping_bag
        </span>

        {/* Badge */}
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-slate-900 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-md animate-bounce-once">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </button>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default CartIcon;
