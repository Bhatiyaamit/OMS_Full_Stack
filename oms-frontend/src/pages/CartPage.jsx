import { useState } from "react";
import useCartStore from "../store/cartStore";
import useAuthStore from "../store/authStore";
import { usePlaceOrder } from "../hooks/useOrders";
import { useNavigate, Link } from "react-router-dom";
import { notification, Modal, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axiosInstance";
import CheckoutAuthModal from "../components/cart/CheckoutAuthModal";

const CartPage = () => {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const deleteItem = useCartStore((s) => s.deleteItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const { user } = useAuthStore();
  const isGuest = !user;

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get("/auth/me").then((r) => r.data.data),
    enabled: !!user,
  });

  const addressComplete =
    profile?.address && profile?.city && profile?.state && profile?.pincode;

  const { mutate: placeOrder, isPending } = usePlaceOrder();
  const navigate = useNavigate();

  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const totalPrice = items.reduce(
    (sum, i) => sum + parseFloat(i.price) * i.quantity,
    0,
  );
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const deliveryFee = totalPrice >= 999 ? 0 : 99;
  const orderTotal = totalPrice + deliveryFee;

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
  };

  const proceedToOrder = () => {
    Modal.confirm({
      title: "Place Order",
      content: `Confirm order of ${totalItems} item(s) for ₹${orderTotal.toLocaleString()}?`,
      okText: "Place Order",
      cancelText: "Cancel",
      onOk: () => {
        const orderPayload = {
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        };
        placeOrder(orderPayload, {
          onSuccess: (res) => {
            clearCart();
            notification.success({ message: "Order placed successfully!" });
            navigate(`/order-success/${res.data.id}`);
          },
          onError: (err) => {
            notification.error({
              message: "Order failed",
              description:
                err?.response?.data?.message ||
                err?.message ||
                "Please try again",
            });
          },
        });
      },
    });
  };

  const handleCheckout = () => {
    if (items.length === 0) return;

    if (isGuest) {
      setAuthModalOpen(true);
      return;
    }

    if (!addressComplete) {
      notification.warning({ message: "Please add a delivery address first." });
      navigate("/profile");
      return;
    }

    proceedToOrder();
  };

  return (
    <div className="pb-24 space-y-8">
      {/* Page Header */}
      <header className="flex justify-between items-end border-b border-surface-container pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface">
            Shopping Cart
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-error flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">
              delete_sweep
            </span>
            Clear Cart
          </button>
        )}
      </header>

      {items.length === 0 ? (
        /* ── Empty State ── */
        <div className="bg-surface-container-lowest rounded-2xl p-16 shadow-sm border border-surface-container flex flex-col items-center text-center mt-4">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-6">
            shopping_cart
          </span>
          <h3 className="text-xl font-semibold text-on-surface">
            Your cart is empty
          </h3>
          <p className="text-sm text-on-surface-variant mt-2 mb-8">
            Browse our products and add items to your cart.
          </p>
          <button
            onClick={() => navigate("/products")}
            className="bg-primary text-on-primary px-8 py-3 rounded-full font-semibold text-sm hover:bg-primary-dim transition-all active:scale-95 flex items-center gap-2"
          >
            Browse Products
            <span className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </button>
        </div>
      ) : (
        /* ── Cart Content ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
          {/* ── Left: Cart Items (65%) ── */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-xl bg-surface-container shrink-0 overflow-hidden">
                    {getImageUrl(item.image) ? (
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-outline-variant">
                          image
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <h3 className="text-base font-bold tracking-tight text-on-surface">
                      {item.name}
                    </h3>
                    <p className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mt-1">
                      {item.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-on-surface-variant mt-1">
                      ₹{parseFloat(item.price).toLocaleString()} each
                    </p>
                  </div>

                  {/* Right: Price + Stepper + Remove */}
                  <div className="flex flex-col items-center sm:items-end gap-3 shrink-0">
                    {/* Subtotal */}
                    <span className="text-lg font-black text-primary">
                      ₹
                      {(
                        parseFloat(item.price) * item.quantity
                      ).toLocaleString()}
                    </span>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-3 bg-surface-container-low rounded-full px-2 py-1">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-full bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-on-surface font-bold transition-colors active:scale-90"
                      >
                        <span className="material-symbols-outlined text-sm">
                          remove
                        </span>
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-on-surface">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addItem(item)}
                        disabled={item.quantity >= item.stock}
                        className="w-8 h-8 rounded-full bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-on-surface font-bold transition-colors active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-sm">
                          add
                        </span>
                      </button>
                    </div>

                    {/* Remove Button — icon only, visible on hover */}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-red-50 hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove item"
                    >
                      <span className="material-symbols-outlined text-sm">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Right: Order Summary (35%) ── */}
          <div className="lg:col-span-4">
            <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-surface-container sticky top-24">
              <h2 className="text-xl font-bold tracking-tight text-on-surface">
                Order Summary
              </h2>

              {/* Line Items */}
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">
                    Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})
                  </span>
                  <span className="text-sm font-semibold text-on-surface">
                    ₹{totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">
                    Delivery
                  </span>
                  <span
                    className={`text-sm font-bold ${deliveryFee === 0 ? "text-green-600" : "text-on-surface"}`}
                  >
                    {deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-on-surface-variant">Taxes</span>
                  <span className="text-sm text-on-surface-variant">
                    Included
                  </span>
                </div>
              </div>

              <div className="border-t border-surface-container my-6" />

              {/* Total */}
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Total
                </span>
                <span className="text-3xl font-black text-primary tracking-tight">
                  ₹{orderTotal.toLocaleString()}
                </span>
              </div>

              <div className="border-t border-surface-container my-6" />

              {/* Deliver To */}
              {user && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Deliver To
                    </p>
                    <Link
                      to="/profile"
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {addressComplete ? "Change" : "Add Address"}
                    </Link>
                  </div>

                  {addressComplete ? (
                    <div className="bg-surface-container-low rounded-lg p-4 flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-lg mt-0.5">
                        location_on
                      </span>
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {profile.name}
                        </p>
                        <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                          {profile.address}, {profile.city}, {profile.state} —{" "}
                          {profile.pincode}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3">
                      <span className="material-symbols-outlined text-amber-600 text-base">
                        warning
                      </span>
                      <p className="text-xs font-semibold text-amber-700">
                        Please add a delivery address before ordering
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Order Button */}
              <button
                onClick={handleCheckout}
                disabled={isPending || (!!user && !addressComplete)}
                className="w-full mt-6 bg-primary text-on-primary py-4 rounded-full font-semibold text-sm hover:bg-primary-dim transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isPending ? (
                  <Spin size="small" />
                ) : (
                  <>
                    {isGuest ? "Sign in to Checkout" : "Confirm Order"}
                    <span className="material-symbols-outlined text-sm font-normal">
                      {isGuest ? "login" : "shopping_cart"}
                    </span>
                  </>
                )}
              </button>

              {/* Secure Footer */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">lock</span>
                Secure 256-bit encrypted checkout
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal for Guests */}
      {isGuest && (
        <CheckoutAuthModal
          open={isAuthModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            proceedToOrder();
          }}
        />
      )}
    </div>
  );
};

export default CartPage;
