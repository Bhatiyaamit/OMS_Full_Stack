import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import api from "../api/axiosInstance";
import useCartStore from "../store/cartStore";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ items, totalAmount, couponCode }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const clearCart = useCartStore((s) => s.clearCart);

  const [paying, setPaying] = useState(false);
  const [cardError, setCardError] = useState("");

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setCardError("");

    // Step 1 — confirm payment with Stripe
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setCardError(error.message);
      setPaying(false);
      return;
    }

    if (paymentIntent.status === "succeeded") {
      try {
        // Step 2 — create order in our backend (server re-validates coupon)
        const res = await api.post("/orders", {
          items,
          stripePaymentId: paymentIntent.id,
          couponCode: couponCode || null,
        });

        const order = res.data;

        // Step 3 — clear cart (local + server)
        clearCart(true);

        toast.success("Payment successful!", {
          description: "Your order has been placed.",
        });

        navigate(`/order-success/${order.id}`, { replace: true });
      } catch (err) {
        toast.error("Order creation failed", {
          description:
            err?.response?.data?.message ||
            "Payment was taken but order failed. Contact support.",
        });
        setPaying(false);
      }
    }
  };

  return (
    <form onSubmit={handlePay}>
      {/* Stripe PaymentElement */}
      <div className="mb-6">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card"],
          }}
        />
      </div>

      {/* Card error message */}
      {cardError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6">
          <span className="material-symbols-outlined text-error text-base">
            error
          </span>
          <p className="text-sm font-medium text-error">{cardError}</p>
        </div>
      )}

      {/* Pay button */}
      <button
        type="submit"
        disabled={!stripe || !elements || paying}
        className="w-full bg-primary text-on-primary py-4
          rounded-full font-semibold text-sm
          hover:bg-primary-dim transition-all
          active:scale-[0.98] shadow-sm
          flex items-center justify-center gap-2
          disabled:opacity-50 disabled:cursor-not-allowed
          disabled:active:scale-100"
      >
        {paying ? (
          <>
            <span className="material-symbols-outlined text-base animate-spin">
              progress_activity
            </span>
            Processing Payment...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-base">lock</span>
            Pay ₹
            {parseFloat(totalAmount).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </>
        )}
      </button>

      {/* Secure badge */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-sm">lock</span>
        Secured by Stripe · 256-bit SSL encryption
      </div>
    </form>
  );
};

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    clientSecret,
    totalAmount,
    productSubtotal,
    discountAmount,
    couponCode,
    items,
  } = location.state || {};

  // Guard
  if (!clientSecret || !items) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm border border-surface-container">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-6 block">
            shopping_cart_off
          </span>
          <h2 className="text-xl font-bold text-on-surface mb-2">
            No active checkout
          </h2>
          <p className="text-sm text-on-surface-variant mb-8">
            Please add items to your cart first.
          </p>
          <button
            onClick={() => navigate("/products")}
            className="bg-primary text-on-primary px-8 py-3 rounded-full font-semibold text-sm hover:bg-primary-dim transition-all"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  const appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#005cba",
      colorBackground: "#f2f4f6",
      colorText: "#2d3338",
      colorDanger: "#9f403d",
      fontFamily: "Inter, sans-serif",
      borderRadius: "12px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        backgroundColor: "#f2f4f6",
        border: "none",
        boxShadow: "none",
        padding: "14px 16px",
      },
      ".Input:focus": { boxShadow: "0 0 0 1px #005cba" },
      ".Label": {
        fontWeight: "600",
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "#596065",
        marginBottom: "8px",
      },
    },
  };

  const options = { clientSecret, appearance, locale: "en" };

  const displaySubtotal = productSubtotal ?? totalAmount;
  const displayDiscount = discountAmount ?? 0;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={() => navigate("/cart")}
          className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-6"
        >
          <span className="material-symbols-outlined text-base">
            arrow_back
          </span>
          Back to Cart
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          Secure Checkout
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Complete your payment to place the order
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left — Stripe Payment Form ── */}
        <div className="lg:col-span-7">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container p-8">
            <h2 className="text-lg font-bold text-on-surface tracking-tight mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">
                credit_card
              </span>
              Payment Details
            </h2>

            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm
                items={items}
                totalAmount={totalAmount}
                couponCode={couponCode}
              />
            </Elements>
          </div>

          {/* Test card hint */}
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">
              info
            </span>
            <div>
              <p className="text-xs font-bold text-blue-700 mb-1">
                Test Mode — Use these card details
              </p>
              <p className="text-xs text-blue-600 font-mono">
                Card: 4000 0035 6000 0008
              </p>
              <p className="text-xs text-blue-600 font-mono">
                Expiry: 12/26 · CVV: 123 · Name: Any
              </p>
            </div>
          </div>
        </div>

        {/* ── Right — Order Summary ── */}
        <div className="lg:col-span-5">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container p-8 sticky top-24">
            <h2 className="text-lg font-bold text-on-surface tracking-tight mb-6">
              Order Summary
            </h2>

            {/* Items list */}
            <div className="space-y-4 mb-6">
              {items.map((item, i) => {
                const basePrice = parseFloat(item.price || 0);
                let effPrice = basePrice;
                if (item.discountType === "PERCENTAGE" && item.discountValue > 0) {
                  effPrice -= (basePrice * item.discountValue) / 100;
                } else if (item.discountType === "FIXED" && item.discountValue > 0) {
                  effPrice -= item.discountValue;
                }
                effPrice = Math.max(0, effPrice);
                const hasDiscount = effPrice < basePrice;

                return (
                  <div
                    key={i}
                    className="flex flex-col py-3 border-b border-surface-container last:border-0 gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-on-surface-variant">
                            {item.quantity}×
                          </span>
                        </div>
                        <span className="text-sm font-medium text-on-surface truncate">
                          {item.name || `Product ${i + 1}`}
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-4">
                        <span className={`text-sm font-black ${hasDiscount ? "text-red-500" : "text-primary"}`}>
                          ₹{effPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    {hasDiscount && (
                      <div className="flex items-center gap-2 ml-11">
                        <p className="text-[10px] line-through text-slate-400 font-medium tracking-tight">
                          ₹{basePrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                        <span className="bg-red-500 text-white text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded shadow-sm">
                          {item.discountType === "PERCENTAGE"
                            ? `${item.discountValue}% OFF`
                            : `₹${item.discountValue} OFF`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Price breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">
                  Subtotal
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  ₹
                  {parseFloat(displaySubtotal).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {displayDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">
                      local_offer
                    </span>
                    {couponCode ? `Coupon (${couponCode})` : "Discount"}
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    -₹
                    {parseFloat(displayDiscount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">
                  Delivery
                </span>
                <span className="text-sm font-bold text-green-600">Free</span>
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
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Total
              </span>
              <span className="text-2xl font-black text-primary tracking-tight">
                ₹
                {parseFloat(totalAmount).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Payment badges */}
            <div className="mt-6 pt-6 border-t border-surface-container flex items-center justify-center gap-4">
              <span className="text-xs text-on-surface-variant font-medium">
                Secured by
              </span>
              <span className="text-xs font-black text-primary tracking-tight">
                STRIPE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
