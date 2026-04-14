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
  return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || ""}${image}`;
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
        <h2 className="text-2xl font-bold text-on-surface mb-2">
          Order not found
        </h2>
        <p className="text-on-surface-variant mb-6">
          We couldn't find the order you're looking for.
        </p>
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
    switch (stepStr) {
      case "PENDING":
        return {
          icon: "hourglass_empty",
          label: "Order Placed",
          desc: "Your order has been received",
        };
      case "CONFIRMED":
        return {
          icon: "verified",
          label: "Payment Confirmed",
          desc: "Payment verified, being processed",
        };
      case "SHIPPED":
        return {
          icon: "local_shipping",
          label: "Order Shipped",
          desc: "Package is on its way to you",
        };
      case "DELIVERED":
        return {
          icon: "inventory",
          label: "Delivered",
          desc: "Order delivered successfully",
        };
      default:
        return { icon: "info", label: stepStr, desc: "" };
    }
  };

  const handleCancelOrder = () => {
    Modal.confirm({
      title: (
        <div className="text-xl font-bold tracking-tight text-slate-900 mt-1">
          Cancel this order?
        </div>
      ),
      content: (
        <div className="text-sm font-medium text-slate-500 mt-2">
          Stock will be restored. This action cannot be undone.
        </div>
      ),
      icon: (
        <span className="material-symbols-outlined text-red-500 text-4xl mr-3 mt-1.5">
          error
        </span>
      ),
      okText: "Yes, Cancel",
      okButtonProps: {
        className:
          "bg-red-500 hover:bg-red-600 text-white border-none shadow-sm font-semibold rounded-full px-6 h-10",
      },
      cancelText: "Keep Order",
      cancelButtonProps: {
        className:
          "border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 font-semibold rounded-full px-6 h-10",
      },
      className:
        "rounded-3xl overflow-hidden [&_.ant-modal-content]:rounded-[1.5rem] [&_.ant-modal-content]:p-8 shadow-2xl",
      maskStyle: { backdropFilter: "blur(4px)" },
      onOk: () => {
        api
          .delete(`/orders/${id}`)
          .then(() => {
            toast.success("Order successfully cancelled");
            navigate("/orders");
          })
          .catch((err) => {
            toast.error(
              err.response?.data?.message || "Failed to cancel order",
            );
          });
      },
    });
  };

  const addressComplete =
    profile?.address && profile?.city && profile?.state && profile?.pincode;

  return (
    <div className="max-w-5xl mx-auto py-2 px-4 pb-24">
      {/* ── Section 1: Header ── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface uppercase font-mono truncate">
              #{order.id.split("-")[0]}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${STATUS_CONFIG[order.status] || "bg-surface-container text-on-surface"}`}
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

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
          {(order.status === "PENDING" || order.status === "CONFIRMED") && (
            <button
              onClick={handleCancelOrder}
              className="hidden lg:flex text-sm bg-red-50 text-red-600 hover:bg-red-800 hover:text-white transition-colors border border-red-200 px-4 py-2 rounded-full font-semibold items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">
                delete
              </span>
              <span className="hidden sm:inline">Cancel Order</span>
            </button>
          )}
          <button
            onClick={() => navigate("/orders")}
            className="hidden sm:flex text-sm text-on-surface-variant hover:text-on-surface items-center gap-1.5 transition-colors bg-secondary-container border border-surface-container px-4 py-2 rounded-full hover:shadow-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            <span className="font-semibold hidden sm:inline">
              Back to Orders
            </span>
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

              <div className="pt-4 border-t border-surface-container/60 mt-2 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-[14px]">
                    receipt_long
                  </span>
                  Receipt Breakdown
                </p>

                {(() => {
                  const orderSubtotal =
                    order.items?.reduce(
                      (sum, item) =>
                        sum +
                        parseFloat(
                          item.product?.price || item.priceAtPurchase,
                        ) *
                          item.quantity,
                      0,
                    ) || 0;
                  const purchasesTotal =
                    order.items?.reduce(
                      (sum, item) =>
                        sum + parseFloat(item.priceAtPurchase) * item.quantity,
                      0,
                    ) || 0;
                  const itemDiscount = orderSubtotal - purchasesTotal;
                  const couponDiscount = parseFloat(order.discountAmount || 0);
                  const totalSavings = itemDiscount + couponDiscount;

                  return (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant font-medium">
                          Subtotal
                        </span>
                        <span className="font-semibold text-on-surface">
                          ₹
                          {orderSubtotal.toLocaleString("en-IN", {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {totalSavings > 0 && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-on-surface-variant font-medium">
                              Total Savings
                            </span>
                            <span className="font-bold text-green-600">
                              -₹
                              {totalSavings.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>

                          {itemDiscount > 0 && (
                            <div className="flex justify-between items-center text-xs pl-2">
                              <span className="text-on-surface-variant/80">
                                ↳ Item Discount
                              </span>
                              <span className="text-green-600/80">
                                -₹
                                {itemDiscount.toLocaleString("en-IN", {
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}

                          {couponDiscount > 0 && (
                            <div className="flex justify-between items-center text-xs pl-2">
                              <span className="text-on-surface-variant/80">
                                ↳ Coupon ({order.couponCode || "Promo"})
                              </span>
                              <span className="text-green-600/80">
                                -₹
                                {couponDiscount.toLocaleString("en-IN", {
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant font-medium">
                          Shipping Fee
                        </span>
                        <span className="font-semibold text-on-surface flex items-center gap-1">
                          ₹0{" "}
                          <span className="text-[10px] bg-surface-container-low px-1.5 py-0.5 rounded text-on-surface-variant uppercase tracking-widest font-black">
                            Free
                          </span>
                        </span>
                      </div>

                      <div className="pt-3 border-t border-surface-container/60 flex justify-between items-center mt-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                          Total Paid
                        </span>
                        <div className="text-right">
                          {totalSavings > 0 && (
                            <p className="text-[10px] line-through text-on-surface-variant font-medium mb-0.5">
                              ₹
                              {orderSubtotal.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          )}
                          <span className="text-xl font-black text-primary leading-none block">
                            ₹
                            {parseFloat(order.totalAmount).toLocaleString(
                              "en-IN",
                              { maximumFractionDigits: 2 },
                            )}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="pt-6">
                <PDFDownloadLink
                  document={<InvoicePDF order={order} profile={profile} />}
                  fileName={`Invoice-${order.id.split("-")[0].toUpperCase()}.pdf`}
                  className="w-full py-2.5 rounded-full border-2 border-slate-200 text-sm font-bold text-slate-600 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 group"
                >
                  {({ loading }) => (
                    <React.Fragment>
                      <span
                        className={`material-symbols-outlined text-lg ${loading ? "animate-spin" : "group-hover:-translate-y-0.5 transition-transform"}`}
                      >
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
              <h2 className="text-lg font-bold text-on-surface">
                {order.status === "DELIVERED" ? "Delivered To" : "Deliver To"}
              </h2>
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
                {order.stripePaymentId ? (
                  <React.Fragment>
                    <span className="material-symbols-outlined text-primary text-xl">
                      credit_card
                    </span>
                    <p className="text-sm font-semibold text-on-surface">
                      Card Payment
                    </p>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <span className="material-symbols-outlined text-primary text-xl">
                      local_shipping
                    </span>
                    <p className="text-sm font-semibold text-on-surface">
                      Cash on Delivery
                    </p>
                  </React.Fragment>
                )}
              </div>

              <div className="flex items-start gap-3">
                {order.stripePaymentId ? (
                  <React.Fragment>
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
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <span className="material-symbols-outlined text-amber-500 text-xl">
                      schedule
                    </span>
                    <div>
                      <p className="text-sm font-bold text-amber-700">
                        Payment Pending
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Amount to be paid upon delivery
                      </p>
                    </div>
                  </React.Fragment>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {(order.status === "PENDING" || order.status === "CONFIRMED") && (
        <div className="mt-4 lg:hidden">
          <button
            onClick={handleCancelOrder}
            className="w-full rounded-full border border-red-400 bg-transparent py-3 text-red-500 hover:bg-red-50 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">
              delete
            </span>
            Cancel Order
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
