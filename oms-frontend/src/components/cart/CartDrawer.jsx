import { useState } from "react";
import { Drawer } from "antd";
import { useNavigate } from "react-router-dom";
import LottieModule from "lottie-react";
const Lottie = LottieModule?.default ?? LottieModule;
import emptyOrderAnimation from "../../assets/empty-order.json";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import CheckoutAuthModal from "./CheckoutAuthModal";

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || ""}${image}`;
};

/* ══════════════════════════════════════════════════════════
 *  CartDrawer
 *
 *  Props:
 *    open     boolean
 *    onClose  () => void
 * ══════════════════════════════════════════════════════════ */
const CartDrawer = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isGuest = !user;

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const deleteItem = useCartStore((s) => s.deleteItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const effectiveItemPrice = (item) => {
    const price = parseFloat(item.price);
    if (!item.discountType || !item.discountValue || item.discountValue <= 0)
      return price;
    let discounted = price;
    if (item.discountType === "PERCENTAGE") {
      discounted -= (price * item.discountValue) / 100;
    } else if (item.discountType === "FIXED") {
      discounted -= item.discountValue;
    }
    return Math.max(0, discounted);
  };

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce(
    (s, i) => s + effectiveItemPrice(i) * i.quantity,
    0,
  );

  const handleCheckout = () => {
    if (isGuest) {
      setAuthModalOpen(true);
    } else {
      onClose();
      navigate("/cart");
    }
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    onClose();
    navigate("/cart");
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        placement="right"
        title={null}
        closable={false}
        styles={{
          body: {
            padding: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          },
          wrapper: {
            width: 420,
            boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
          },
        }}
      >
        <div className="flex flex-col h-full">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-white text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shopping_bag
                </span>
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-base tracking-tight">
                  Your Cart
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={clearCart.bind(null, !isGuest)}
                  className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-600 text-base">
                  close
                </span>
              </button>
            </div>
          </div>

          {/* ── Guest banner ── */}
          {isGuest && items.length > 0 && (
            <div className="mx-4 mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <span
                className="material-symbols-outlined text-amber-500 text-lg flex-shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                info
              </span>
              <div>
                <p className="text-xs font-black text-amber-800">
                  You're browsing as a guest
                </p>
                <p className="text-[11px] font-medium text-amber-600">
                  Sign in at checkout — your cart will be saved
                </p>
              </div>
            </div>
          )}

          {/* ── Items ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <Lottie
                  animationData={emptyOrderAnimation}
                  loop={true}
                  style={{ width: 220, height: 220 }}
                />
                <h3 className="font-black text-slate-900 text-lg mb-1 -mt-2">
                  Your cart is lonely
                </h3>
                <p className="text-sm text-slate-400 font-medium mb-6">
                  "Go on, treat yourself"
                </p>
                <button
                  onClick={() => {
                    onClose();
                    navigate("/products");
                  }}
                  className="bg-slate-900 text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              items.map((item) => {
                const effPrice = effectiveItemPrice(item);
                const hasDiscount = effPrice < parseFloat(item.price);

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100 group"
                  >
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                      {getImageUrl(item.image) ? (
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-slate-300">
                            image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {hasDiscount && (
                          <p className="text-xs line-through text-slate-400 font-medium">
                            ₹{parseFloat(item.price).toLocaleString()}
                          </p>
                        )}
                        <p
                          className={`text-sm font-black ${hasDiscount ? "text-red-500" : "text-slate-900"}`}
                        >
                          ₹
                          {(effPrice * item.quantity).toLocaleString("en-IN", {
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-xs font-medium text-slate-400">
                          ₹
                          {effPrice.toLocaleString("en-IN", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          each
                        </p>
                        {hasDiscount && (
                          <span className="bg-red-500 text-white text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded shadow-sm">
                            {item.discountType === "PERCENTAGE"
                              ? `${item.discountValue}% OFF`
                              : `₹${item.discountValue} OFF`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stepper + delete */}
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => deleteItem(item.id, !isGuest)}
                        className="text-slate-300 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-base">
                          delete
                        </span>
                      </button>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-2 py-1">
                        <button
                          onClick={() => removeItem(item.id, !isGuest)}
                          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                        >
                          <span className="material-symbols-outlined text-slate-600 text-sm">
                            remove
                          </span>
                        </button>
                        <span className="text-sm font-black text-slate-900 w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addItem(item, !isGuest)}
                          disabled={item.quantity >= item.stock}
                          className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-700 transition-colors disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-white text-sm">
                            add
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer / Checkout ── */}
          {items.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-5 space-y-4 bg-white">
              {/* Price breakdown */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">
                    Subtotal ({totalItems} items)
                  </span>
                  <span className="font-bold text-slate-900">
                    ₹{totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Delivery</span>
                  <span className="font-bold text-emerald-600">Free</span>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="flex justify-between">
                  <span className="font-black text-slate-900 text-base">
                    Total
                  </span>
                  <span className="font-black text-slate-900 text-xl">
                    ₹{totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={handleCheckout}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
              >
                <span
                  className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isGuest ? "login" : "shopping_cart_checkout"}
                </span>
                {isGuest ? "Sign In to Checkout" : "Proceed to Checkout"}
              </button>

              {isGuest && (
                <p className="text-center text-[11px] font-medium text-slate-400">
                  <span
                    className="material-symbols-outlined text-[13px] align-middle mr-1"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    lock
                  </span>
                  Your cart is saved locally — won't disappear on refresh
                </p>
              )}
            </div>
          )}
        </div>
      </Drawer>

      {/* Auth modal — shown when guest clicks checkout */}
      <CheckoutAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

export default CartDrawer;
