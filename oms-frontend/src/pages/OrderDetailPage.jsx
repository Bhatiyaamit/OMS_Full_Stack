import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spin, Modal } from "antd";
import { toast } from "sonner";
import api from "../api/axiosInstance";
import { PDFDownloadLink } from "@react-pdf/renderer";
import InvoicePDF from "../components/InvoicePDF";

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
};

const STATUS_CONFIG = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch Order
  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data),
  });

  // Fetch Profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get("/auth/me").then((r) => r.data),
  });

  if (loadingOrder || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-5xl mx-auto py-20 px-4 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Order not found</h2>
        <p className="text-on-surface-variant mb-6">We couldn't find the order you're looking for.</p>
        <button
          onClick={() => navigate("/orders")}
          className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold hover:bg-primary-dim transition-all"
        >
          Back to My Orders
        </button>
      </div>
    );
  }

  // Stepper logic
  const steps = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];
  const currentIndex = steps.indexOf(order.status);
  
  const getStepData = (stepStr) => {
      switch(stepStr) {
          case "PENDING": return { icon: "hourglass_empty", label: "Order Placed", desc: "Your order has been received" };
          case "CONFIRMED": return { icon: "verified", label: "Payment Confirmed", desc: "Payment verified, being processed" };
          case "SHIPPED": return { icon: "local_shipping", label: "Order Shipped", desc: "Package is on its way to you" };
          case "DELIVERED": return { icon: "inventory", label: "Delivered", desc: "Order delivered successfully" };
          default: return { icon: "info", label: stepStr, desc: "" };
      }
  };

  const handleCancelOrder = () => {
    Modal.confirm({
      title: "Cancel this order?",
      content: "Stock will be restored. This cannot be undone.",
      okText: "Yes, Cancel",
      okType: "danger",
      cancelText: "Keep Order",
      onOk: () => {
        api.delete(`/orders/${id}`)
          .then(() => {
            toast.success("Order successfully cancelled");
            navigate("/orders");
          })
          .catch((err) => {
            toast.error(err.response?.data?.message || "Failed to cancel order");
          });
      },
    });
  };

  const addressComplete = profile?.address && profile?.city && profile?.state && profile?.pincode;

  return (
    <div className="max-w-5xl mx-auto py-2 px-4 pb-24">
      {/* ── Section 1: Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface uppercase font-mono">
              #{order.id.split("-")[0]}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_CONFIG[order.status] || "bg-surface-container text-on-surface"}`}
            >
              {order.status}
            </span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(order.status === "PENDING" || order.status === "CONFIRMED") && (
            <button
              onClick={handleCancelOrder}
              className="text-sm bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors border border-red-200 px-4 py-2 rounded-full font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              <span className="hidden sm:inline">Cancel Order</span>
            </button>
          )}
          <button
            onClick={() => navigate("/orders")}
            className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors bg-secondary-container border border-surface-container px-4 py-2 rounded-full hover:shadow-sm"
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            <span className="font-semibold hidden sm:inline">Back to Orders</span>
            <span className="font-semibold sm:hidden">Back</span>
          </button>
        </div>
      </div>

      {/* ── Section 2: Two Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* === LEFT COLUMN === */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card 1: Order Items */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container p-6 sm:p-8">
            <h2 className="text-lg font-bold mb-6 text-on-surface">
              Items Ordered ({order.items?.length || 0})
            </h2>

            <div className="space-y-4">
              {order.items?.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 && (
                    <div className="border-t border-surface-container my-4" />
                  )}
                  <div className="flex items-center gap-4">
                    <img
                      src={getImageUrl(item.product?.image)}
                      alt={item.product?.name}
                      className="w-18 h-18 rounded-xl object-cover bg-surface-container shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate pr-2">
                        {item.product?.name}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Qty: {item.quantity}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        ₹{parseFloat(item.priceAtPurchase).toLocaleString()}{" "}
                        each
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-primary">
                        ₹
                        {(
                          item.quantity * item.priceAtPurchase
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="border-t-2 border-surface-container pt-5 mt-6 flex justify-between items-center">
              <span className="text-sm font-bold text-on-surface-variant">
                Order Total
              </span>
              <span className="text-2xl font-black text-primary">
                ₹{parseFloat(order.totalAmount).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 2: Order Timeline */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container p-6 sm:p-8">
            <h2 className="text-lg font-bold mb-6 text-on-surface">
              Order Progress
            </h2>

            <div className="space-y-0">
              {steps.map((step, stepIndex) => {
                const stepData = getStepData(step);
                const isCompleted = stepIndex < currentIndex;
                const isCurrent = stepIndex === currentIndex;
                const isFuture = stepIndex > currentIndex;
                const isLast = stepIndex === steps.length - 1;

                return (
                  <div key={step} className="flex flex-row relative min-h-20">
                    {/* Left: Indicator */}
                    <div className="flex flex-col items-center mr-4">
                      <div className="relative flex items-center justify-center shrink-0">
                        {isCompleted && (
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-white text-sm">
                              {stepData.icon}
                            </span>
                          </div>
                        )}
                        {isCurrent && (
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center relative">
                            <span className="material-symbols-outlined text-white text-sm">
                              {stepData.icon}
                            </span>
                            <div className="absolute inset-0 rounded-full ring-4 ring-primary/20 animate-pulse" />
                          </div>
                        )}
                        {isFuture && (
                          <div className="w-10 h-10 rounded-full border-2 border-surface-container-high flex items-center justify-center bg-surface-container-lowest">
                            <span className="material-symbols-outlined text-outline-variant text-sm">
                              {stepData.icon}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Connector logic */}
                      {!isLast && (
                        <div
                          className={`w-0.5 h-full min-h-8 my-1 ${isCompleted ? "bg-primary" : "bg-surface-container-high"}`}
                        />
                      )}
                    </div>

                    {/* Right: Content */}
                    <div className={`pt-2 ${!isLast ? "pb-8" : ""}`}>
                      <p
                        className={`font-bold text-sm ${isCompleted || isCurrent ? "text-on-surface" : "text-on-surface-variant"}`}
                      >
                        {stepData.label}
                      </p>

                      {/* Timestamp Logic */}
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {stepIndex === 0 &&
                          new Date(order.createdAt).toLocaleString()}
                        {isCurrent &&
                          stepIndex !== 0 &&
                          new Date(order.updatedAt).toLocaleString()}
                        {isFuture && "Pending"}
                      </p>

                      <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                        {stepData.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="lg:col-span-1 space-y-4">
          {/* Card 3: Order Details */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container p-6 sm:p-8">
            <h2 className="text-lg font-bold mb-6 text-on-surface">
              Order Details
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold capitalize tracking-widest text-on-surface-variant">
                  Order ID
                </span>
                <span className="text-sm font-bold text-on-surface font-mono">
                  #{order.id.split("-")[0]}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold capitalize tracking-widest text-on-surface-variant">
                  Status
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_CONFIG[order.status] || "bg-surface-container text-on-surface"}`}
                >
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold capitalize tracking-widest text-on-surface-variant">
                  Date Placed
                </span>
                <span className="text-xs font-semibold text-on-surface">
                  {new Date(order.createdAt).toLocaleString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-bold capitalize tracking-widest text-on-surface-variant">
                  Items Count
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {order.items?.length || 0} items
                </span>
              </div>
              <div className="pt-2 border-t border-surface-container/50 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Total Amount
                </span>
                <span className="text-base font-black text-primary">
                  ₹{parseFloat(order.totalAmount).toLocaleString()}
                </span>
              </div>

              <div className="pt-6">
                <PDFDownloadLink
                  document={<InvoicePDF order={order} profile={profile} />}
                  fileName={`Invoice-${order.id.split("-")[0].toUpperCase()}.pdf`}
                  className="w-full py-2.5 rounded-full border-2 border-slate-200 text-sm font-bold text-slate-600 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 group"
                >
                  {({ loading }) => (
                    <React.Fragment>
                      <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : 'group-hover:-translate-y-0.5 transition-transform'}`}>
                        {loading ? "sync" : "receipt_long"}
                      </span>
                      {loading ? "Generating PDF..." : "Download Invoice"}
                    </React.Fragment>
                  )}
                </PDFDownloadLink>
              </div>
            </div>
          </div>

          {/* Card 5: Delivery Address */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-on-surface">Deliver To</h2>
              <Link
                to="/profile"
                className="text-xs font-bold text-primary hover:underline transition-all"
              >
                Change
              </Link>
            </div>

            {addressComplete ? (
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">
                  location_on
                </span>
                <div className="flex-1">
                  <p className="font-bold text-sm text-on-surface mb-1">
                    {order.user?.name}
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {profile.address}
                    <br />
                    {profile.city}, {profile.state} {profile.pincode}
                  </p>
                  {profile.phone && (
                    <p className="text-sm text-on-surface-variant mt-2 font-medium">
                      Phone: +91 {profile.phone}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 bg-amber-50 rounded-xl border border-amber-100/50">
                <span className="material-symbols-outlined text-amber-500 text-3xl mb-2">
                  warning
                </span>
                <p className="text-sm font-semibold text-amber-700 text-center mb-3">
                  No delivery address saved
                </p>
                <button
                  onClick={() => navigate("/profile")}
                  className="bg-white border border-amber-200 text-amber-700 text-xs px-4 py-1.5 rounded-full font-bold hover:bg-amber-50"
                >
                  Add Address
                </button>
              </div>
            )}
          </div>

          {/* Card 6: Payment Info */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container p-6 sm:p-8">
            <h2 className="text-lg font-bold mb-4 text-on-surface">Payment</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl">
                  credit_card
                </span>
                <p className="text-sm font-semibold text-on-surface">
                  Cash on Delivery
                </p>
              </div>

              <div className="flex items-start gap-3">
                {order.stripePaymentId ? (
                  <reactFragment>
                    <span className="material-symbols-outlined text-green-600 text-xl">
                      check_circle
                    </span>
                    <div>
                      <p className="text-sm font-bold text-green-700">
                        Payment Successful
                      </p>
                      <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                        {order.stripePaymentId}
                      </p>
                    </div>
                  </reactFragment>
                ) : (
                  <reactFragment>
                    <span className="material-symbols-outlined text-amber-500 text-xl">
                      schedule
                    </span>
                    <div>
                      <p className="text-sm font-bold text-amber-700">
                        Payment Pending
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Pay on delivery
                      </p>
                    </div>
                  </reactFragment>
                )}
              </div>
            </div>

            <p className="text-xs text-on-surface-variant italic mt-5 pt-4 border-t border-surface-container">
              Stripe payment integration coming soon
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default OrderDetailPage;
