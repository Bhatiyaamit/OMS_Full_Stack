import { useState, useEffect } from "react";
import {
  useAllOrders,
  useMyOrders,
  useUpdateOrderStatus,
  useCancelOrder,
  useOrder,
} from "../hooks/useOrders";
import useAuthStore from "../store/authStore";
import { toast } from "sonner";
import { Spin, Drawer, Divider, Modal, Steps, Pagination, Avatar } from "antd";
import { useNavigate } from "react-router-dom";

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || ""}${image}`;
};

/* ── Status config ── */
const STATUS_CONFIG = {
  PENDING: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    dot: "bg-amber-400",
    label: "Pending",
  },
  CONFIRMED: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-400",
    label: "Confirmed",
  },
  SHIPPED: {
    bg: "bg-violet-100",
    text: "text-violet-700",
    dot: "bg-violet-400",
    label: "Shipped",
  },
  DELIVERED: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
    label: "Delivered",
  },
  CANCELLED: {
    bg: "bg-rose-100",
    text: "text-rose-600",
    dot: "bg-rose-400",
    label: "Cancelled",
  },
};

const STATUS_FLOW = {
  PENDING: "CONFIRMED",
  CONFIRMED: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const STEPPER_STEPS = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

/* ── Reusable badge ── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
};

/* ── Order progress stepper (compact) ── */
const OrderStepper = ({ status }) => {
  if (status === "CANCELLED" || status === "DELIVERED") return null;
  const currentIdx = STEPPER_STEPS.indexOf(status);

  const stepsConfig = [
    { key: "PENDING", label: "Pending", icon: "hourglass_empty" },
    { key: "CONFIRMED", label: "Confirmed", icon: "verified" },
    { key: "SHIPPED", label: "Shipped", icon: "local_shipping" },
    { key: "DELIVERED", label: "Delivered", icon: "inventory" },
  ];

  return (
    <div className="w-full pt-2 pb-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting Lines */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[12.5%] right-[12.5%] h-0.5 z-0">
          {/* Background track */}
          <div className="w-full h-full bg-surface-container-high absolute top-0 left-0" />
          {/* Active filled track */}
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
            style={{
              width: `${(currentIdx / (stepsConfig.length - 1)) * 100}%`,
            }}
          />
        </div>

        {stepsConfig.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <div
              key={step.key}
              className="flex flex-col items-center relative z-10 w-1/4"
            >
              <div className="relative flex items-center justify-center shrink-0 bg-white rounded-full">
                {isCompleted && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-white text-[14px]">
                      {step.icon}
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center relative shadow-sm">
                    <span className="material-symbols-outlined text-white text-[14px]">
                      {step.icon}
                    </span>
                    <div className="absolute inset-0 rounded-full ring-4 ring-primary/20 animate-pulse" />
                  </div>
                )}
                {isFuture && (
                  <div className="w-8 h-8 rounded-full border-2 border-surface-container-high flex items-center justify-center bg-white">
                    <span className="material-symbols-outlined text-outline-variant text-[14px]">
                      {step.icon}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ════════════════════════════════════════════════════════ */
const OrdersPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const adminView = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [activeTab, setActiveTab] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Accordion State for Customer View
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const statusParam = adminView ? activeTab : filterStatus;
  const queryParams = {
    page: currentPage,
    limit: pageSize,
    ...(statusParam !== "ALL" && { status: statusParam }),
  };

  const {
    data: allOrdersData,
    isLoading: loadingAll,
    refetch: refetchAll,
  } = useAllOrders(adminView ? queryParams : {});

  const {
    data: myOrdersData,
    isLoading: loadingMy,
    refetch: refetchMy,
  } = useMyOrders(!adminView ? queryParams : {});

  const { mutate: updateStatus, isPending: updating } = useUpdateOrderStatus();
  const { mutate: cancelOrder, isPending: cancelling } = useCancelOrder();

  const { data: detailData, isLoading: loadingDetail } =
    useOrder(detailOrderId);
  const detailOrder = detailData?.data;

  const loading = adminView ? loadingAll : loadingMy;
  const rawOrders = adminView ? allOrdersData?.data : myOrdersData?.data;
  const orders = rawOrders || [];
  const paginationInfo = adminView
    ? allOrdersData?.pagination
    : myOrdersData?.pagination;

  // Auto-expand the first order whenever the list changes (e.g. changing filters/tabs)
  useEffect(() => {
    const firstOrderId = orders[0]?.id;
    if (!adminView && !loading && firstOrderId) {
      const timer = setTimeout(() => {
        setExpandedOrderId((prev) => prev || firstOrderId);
      }, 500); // 500ms delay for attention-grabbing animation
      return () => clearTimeout(timer);
    }
  }, [loading, orders[0]?.id, adminView]);

  // Change handlers to reset page when filtering
  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleUpdateStatus = (orderId, newStatus) => {
    updateStatus(
      { id: orderId, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Order updated to ${newStatus}`);
          refetchAll();
        },
      },
    );
  };

  const handleCancelOrder = (orderId) => {
    Modal.confirm({
      title: "Cancel Order",
      content:
        "Are you sure you want to cancel this order? This cannot be undone.",
      okText: "Yes, Cancel",
      okType: "danger",
      cancelText: "Keep Order",
      onOk: () => {
        cancelOrder(orderId, {
          onSuccess: () => {
            toast.success("Order cancelled");
            refetchMy();
          },
          onError: (err) => toast.error(err?.message || "Failed to cancel"),
        });
      },
    });
  };

  /* ── Shared order detail drawer ── */
  const OrderDetailDrawer = (
    <Drawer
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">
              receipt_long
            </span>
          </div>
          <span className="font-black text-slate-900 tracking-tight">
            Order Details
          </span>
        </div>
      }
      placement="right"
      size="large"
      onClose={() => setDetailOrderId(null)}
      open={!!detailOrderId}
    >
      {loadingDetail ? (
        <div className="flex justify-center items-center h-full">
          <Spin size="large" />
        </div>
      ) : detailOrder ? (
        <div className="space-y-6">
          {/* Meta card */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Order ID
                </p>
                <h3 className="font-mono font-black text-slate-900 text-lg">
                  #{detailOrder.id.slice(0, 8).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  {new Date(detailOrder.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <StatusBadge status={detailOrder.status} />
            </div>
            {detailOrder.status !== "CANCELLED" &&
              detailOrder.status !== "DELIVERED" && (
                <div className="mt-6">
                  <OrderStepper status={detailOrder.status} />
                </div>
              )}
          </div>

          {/* Customer (admin only) */}
          {adminView && detailOrder.user && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                Customer
              </p>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-sm">
                    person
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 text-sm">
                    {detailOrder.user.name}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    {detailOrder.user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Line items */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Items Ordered
            </p>
            <div className="space-y-2">
              {detailOrder.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100"
                >
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.product?.image ? (
                      <img
                        src={getImageUrl(item.product?.image)}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-slate-300 text-xl">
                        image
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {item.product?.name || "Unknown Product"}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-slate-900 text-sm">
                      ₹
                      {(
                        parseFloat(item.priceAtPurchase) * item.quantity
                      ).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      ₹{parseFloat(item.priceAtPurchase).toLocaleString()} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Divider className="my-2" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest text-xs">
              Total Amount
            </span>
            <span className="text-2xl font-black text-slate-900">
              ₹{parseFloat(detailOrder.totalAmount).toLocaleString()}
            </span>
          </div>

          {/* Admin status actions */}
          {adminView && STATUS_FLOW[detailOrder.status] && (
            <button
              onClick={() =>
                handleUpdateStatus(
                  detailOrder.id,
                  STATUS_FLOW[detailOrder.status],
                )
              }
              disabled={
                updating ||
                (STATUS_FLOW[detailOrder.status] === "DELIVERED" &&
                  user?.role !== "ADMIN")
              }
              className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
              Mark as {STATUS_FLOW[detailOrder.status]}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center mt-20 text-slate-400 font-medium">
          Order not found
        </div>
      )}
    </Drawer>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
   *  CUSTOMER VIEW
   * ════════════════════════════════════════════════════════ */
  if (!adminView) {
    const filteredOrders =
      filterStatus === "ALL"
        ? orders
        : orders.filter((o) => o.status === filterStatus);

    const totalSpend = orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);

    const statusFilters = [
      "ALL",
      "PENDING",
      "CONFIRMED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];

    return (
      <div className="w-full px-0 sm:px-4 lg:px-6">
        {/* ── Page header ── */}
        <header className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="hidden text-3xl font-black text-slate-900 tracking-tight sm:block">
              My Orders
            </h1>
            <button
              onClick={() => navigate("/products")}
              className="hidden items-center gap-2 bg-[#C8F04A] text-slate-900 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow hover:scale-105 transition-transform sm:flex"
            >
              <span className="material-symbols-outlined text-sm">
                storefront
              </span>
              Continue Shopping
            </button>
          </div>
          <p className="hidden text-slate-400 font-medium text-sm sm:block">
            {paginationInfo?.total > 0
              ? `You have placed ${paginationInfo.total} orders`
              : "No orders yet"}
          </p>
        </header>

        {/* Removed redundant Stat cards grid */}

        {/* ── Two-column layout: Sidebar + Orders list ── */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          {/* ═══ LEFT SIDEBAR FILTERS ═══ */}
          <aside className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-6 self-start">
            <div className="lg:bg-white lg:rounded-2xl lg:border lg:border-slate-100 lg:shadow-sm overflow-hidden">
              {/* Sidebar header */}
              <div className="hidden lg:block px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Filter Orders
                </p>
              </div>

              {/* Filter items */}
              <nav className="flex lg:flex-col overflow-x-auto gap-2 lg:gap-0 lg:p-3 lg:space-y-1 pb-2 lg:pb-3">
                {statusFilters.map((s) => {
                  const cfg = STATUS_CONFIG[s] || {};
                  const isActive = filterStatus === s;
                  // Due to pagination, we can't reliably count exact unfiltered totals locally unless provided by API. Let's hide exact bubble counts when filtering by status (or just show the current dataset size).
                  // For simplicity, we just won't show the exact total number of orders in other categories since we only fetched the current 'statusParam' page.
                  const showCount =
                    isActive && paginationInfo ? paginationInfo.total : null;

                  return (
                    <button
                      key={s}
                      onClick={() => handleFilterChange(s)}
                      className={`shrink-0 lg:w-full flex items-center justify-between gap-3 lg:gap-4 px-4 py-2.5 lg:py-3 rounded-full lg:rounded-xl text-left transition-all border lg:border-transparent border-slate-200 ${
                        isActive
                          ? "bg-slate-900 border-slate-900 text-white lg:shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 lg:gap-3">
                        {s !== "ALL" && (
                          <span
                            className={`w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full shrink-0 ${
                              isActive ? "bg-white" : cfg.dot || "bg-slate-300"
                            }`}
                          />
                        )}
                        {s === "ALL" && (
                          <span
                            className={`material-symbols-outlined text-[16px] lg:text-[18px] shrink-0 ${
                              isActive ? "text-white" : "text-slate-400"
                            }`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            apps
                          </span>
                        )}
                        <span className="text-[10px] lg:text-xs font-black uppercase tracking-wider whitespace-nowrap">
                          {s === "ALL" ? "All Orders" : cfg.label || s}
                        </span>
                      </div>
                      {showCount !== null && (
                        <span
                          className={`text-[10px] lg:text-[11px] font-black px-2 lg:px-2.5 py-0.5 rounded-full shrink-0 bg-white/20 text-white`}
                        >
                          {showCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Sidebar footer — quick spend summary */}
              <div className="hidden lg:block px-5 py-4 border-t border-slate-50 bg-slate-50/80">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                  Total Spent
                </p>
                <p className="text-base font-black text-slate-900">
                  ₹{totalSpend.toLocaleString()}
                </p>
              </div>
            </div>
          </aside>

          {/* ═══ ORDERS LIST ═══ */}
          <div className="flex-1 min-w-0 w-full">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">
                  package_2
                </span>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  No orders here
                </h3>
                <p className="text-slate-400 font-medium text-sm mb-6">
                  {filterStatus !== "ALL"
                    ? `No ${filterStatus.toLowerCase()} orders found.`
                    : "You haven't placed any orders yet."}
                </p>
                <button
                  onClick={() => navigate("/products")}
                  className="bg-slate-900 text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const isCancelled = order.status === "CANCELLED";
                  const totalItemsCount =
                    order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;
                  const firstProduct = order.items?.[0]?.product;
                  const thumbnailSrc = getImageUrl(firstProduct?.image);

                  return (
                    <div
                      key={order.id}
                      className={`w-full bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer group ${
                        isCancelled
                          ? "border-rose-100 opacity-75"
                          : "border-slate-100 hover:border-slate-300"
                      }`}
                      onClick={() =>
                        setExpandedOrderId((prev) =>
                          prev === order.id ? null : order.id,
                        )
                      }
                    >
                      <div className="px-4 py-3.5 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                          {thumbnailSrc ? (
                            <img
                              src={thumbnailSrc}
                              alt="product"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-sm text-slate-400">
                              image
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col justify-center flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="font-mono font-bold text-slate-900 uppercase">
                              #{order.id.slice(0, 8)}
                            </span>
                            <StatusBadge status={order.status} />
                          </div>

                          <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1.5">
                            <span>
                              {totalItemsCount}{" "}
                              {totalItemsCount === 1 ? "item" : "items"}
                            </span>
                            <span className="opacity-50">&bull;</span>
                            <span>
                              {new Date(order.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          <span className="text-primary text-[15px] font-semibold whitespace-nowrap">
                            ₹{parseFloat(order.totalAmount).toLocaleString()}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedOrderId((prev) =>
                                prev === order.id ? null : order.id,
                              );
                            }}
                            className="p-1.5 rounded-lg text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100 transition-colors flex items-center justify-center relative"
                            title={
                              expandedOrderId === order.id
                                ? "Hide Details"
                                : "Show Details"
                            }
                          >
                            <span
                              className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
                                expandedOrderId === order.id ? "rotate-90" : ""
                              }`}
                            >
                              chevron_right
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* ── Expanded Region ── */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          expandedOrderId === order.id
                            ? "max-h-[1500px] opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                            Items in this Order
                          </p>
                          <div className="space-y-2">
                            {order.items?.map((item) => (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/order-detail/${order.id}`);
                                }}
                                className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all group/item"
                              >
                                <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.product?.image ? (
                                    <img
                                      src={getImageUrl(item.product?.image)}
                                      alt={item.product?.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="material-symbols-outlined text-slate-300 text-xl">
                                      image
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-900 text-sm truncate">
                                    {item.product?.name || "Unknown Product"}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-medium">
                                    Qty: {item.quantity} &bull; ₹
                                    {parseFloat(
                                      item.priceAtPurchase,
                                    ).toLocaleString()}{" "}
                                    each
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-black text-slate-900 text-sm">
                                    ₹
                                    {(
                                      parseFloat(item.priceAtPurchase) *
                                      item.quantity
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/order-detail/${order.id}`);
                              }}
                              className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:shadow"
                            >
                              View Full Order details
                              <span className="material-symbols-outlined text-[14px]">
                                arrow_forward
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* ── End Expanded Region ── */}
                    </div>
                  );
                })}

                {/* Load More Button */}
                {paginationInfo && orders.length < paginationInfo.total && (
                  <div className="flex justify-center mt-8 pt-4 pb-8">
                    <button
                      onClick={() => setPageSize((prev) => prev + 10)}
                      className="group flex items-center gap-2 bg-white px-8 py-3 rounded-full border border-slate-200 shadow-sm hover:shadow hover:border-slate-300 transition-all active:scale-95"
                    >
                      <span className="text-xs font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-900 transition-colors">
                        View More
                      </span>
                      <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-slate-900 group-hover:translate-y-0.5 transition-all">
                        south
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {OrderDetailDrawer}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
   *  ADMIN / MANAGER VIEW
   * ════════════════════════════════════════════════════════ */
  const filteredAdminOrders = (
    activeTab === "ALL" ? orders : orders.filter((o) => o.status === activeTab)
  ).filter((o) =>
    searchQuery
      ? o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  const adminStats = {
    total: paginationInfo?.total || orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    shipped: orders.filter((o) => o.status === "SHIPPED").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    revenue: orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0),
  };

  return (
    <div className="pb-20">
      {/* ── Sticky header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between sticky top-0 bg-white/90 backdrop-blur-xl z-30 py-4 gap-4 border-b border-slate-100/50">
        <div className="hidden md:flex justify-between items-center w-full md:w-auto">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tighter text-slate-900">
              Order Management
            </h2>
            <p className="text-[10px] md:text-xs text-slate-400 tracking-wider uppercase font-medium">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative group w-full md:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-slate-900 transition-colors">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID or customer…"
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm w-full md:w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all text-slate-900"
            />
          </div>
        </div>
      </header>

      {/* ── Stat strip ── */}
      <div className="flex flex-nowrap w-full overflow-x-auto gap-4 mt-6 mb-6 pb-2 pb-2">
        {[
          {
            label: "Total Orders",
            value: adminStats.total,
            icon: "receipt_long",
            iconBg: "bg-slate-100",
            iconColor: "text-slate-700",
          },
          {
            label: "Pending",
            value: adminStats.pending,
            icon: "hourglass_empty",
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
          },
          {
            label: "Shipped",
            value: adminStats.shipped,
            icon: "local_shipping",
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
          },
          {
            label: "Delivered",
            value: adminStats.delivered,
            icon: "check_circle",
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
          },
          {
            label: "Total Revenue",
            value: `₹${adminStats.revenue.toLocaleString()}`,
            icon: "payments",
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
          },
        ].map(({ label, value, icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-100 shadow-sm flex items-center gap-3 shrink-0 min-w-[180px] lg:min-w-[220px]"
          >
            <div
              className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
            >
              <span
                className={`material-symbols-outlined ${iconColor} text-lg`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5 whitespace-nowrap">
                {label}
              </p>
              <p className="text-sm lg:text-lg font-black text-slate-900 leading-none whitespace-nowrap">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Row (Matches ProductPage) ── */}
      <div className="mt-4 md:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status filter pills (horizontally scrollable on mobile) */}
        <div className="flex sm:items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 w-max ">
            {[
              "ALL",
              "PENDING",
              "CONFIRMED",
              "SHIPPED",
              "DELIVERED",
              "CANCELLED",
            ].map((tab) => {
              const cfg = STATUS_CONFIG[tab] || {};
              const count =
                tab === "ALL"
                  ? tab === filterStatus && paginationInfo
                    ? paginationInfo.total
                    : "-"
                  : tab === activeTab && paginationInfo
                    ? paginationInfo.total
                    : "-";
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-2 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 flex items-center gap-1.5 ${
                    activeTab === tab
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {tab === "ALL" ? "All" : cfg.label || tab}
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-black flex items-center justify-center min-w-[20px] ${
                      activeTab === tab
                        ? "bg-white/20 text-white"
                        : "bg-black/5 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main table card ── */}
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          {filteredAdminOrders.length === 0 ? (
            <div className="p-16 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">
                inbox
              </span>
              <p className="text-slate-400 font-semibold">
                No orders match this filter.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400">
                  <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest">
                    Order
                  </th>
                  <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest">
                    Customer
                  </th>
                  <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest">
                    Items
                  </th>
                  <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest">
                    Amount
                  </th>
                  <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest">
                    Status
                  </th>
                  <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest">
                    Date
                  </th>
                  <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-widest text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAdminOrders.map((order) => {
                  const nextStatus = STATUS_FLOW[order.status];
                  const canUpdate =
                    nextStatus &&
                    !(nextStatus === "DELIVERED" && user?.role !== "ADMIN");
                  const cfg =
                    STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => setDetailOrderId(order.id)}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}
                          >
                            <span
                              className={`material-symbols-outlined ${cfg.text} text-sm`}
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              package_2
                            </span>
                          </div>
                          <span className="font-mono font-black text-slate-900 text-sm">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-semibold text-slate-900 capitalize">
                          {order.user?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-[140px]">
                          {order.user?.email || ""}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-[11px] font-bold text-slate-500">
                        <Avatar.Group size="small" maxCount={2}>
                          {order.items?.map((item, idx) => {
                            const imgSrc = getImageUrl(item.product?.image);
                            return (
                              <Avatar
                                key={idx}
                                src={imgSrc}
                                icon={
                                  !imgSrc && (
                                    <span className="material-symbols-outlined text-[10px]">
                                      image
                                    </span>
                                  )
                                }
                              />
                            );
                          })}
                        </Avatar.Group>
                        <span className="ml-2">
                          {order.items?.reduce(
                            (acc, i) => acc + i.quantity,
                            0,
                          ) || 0}{" "}
                          items
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-black text-slate-900 text-sm">
                          ₹{parseFloat(order.totalAmount).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400 font-medium whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailOrderId(order.id);
                            }}
                            className="p-2 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="View details"
                          >
                            <span className="material-symbols-outlined text-base">
                              visibility
                            </span>
                          </button>
                          {canUpdate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(order.id, nextStatus);
                              }}
                              disabled={updating}
                              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[11px]">
                                arrow_forward
                              </span>
                              {nextStatus}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Admin Pagination */}
          {paginationInfo && paginationInfo.totalPages > 1 && (
            <div className="flex justify-end mt-4 px-6 pb-6 pt-2">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={paginationInfo.total}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                }}
                showSizeChanger
              />
            </div>
          )}
        </div>

        {/* Summary footer */}
        <div className="px-6 py-4 border-t border-slate-50 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
          <span>
            Showing {filteredAdminOrders.length}{" "}
            {paginationInfo
              ? `of ${paginationInfo.total}`
              : `of ${orders.length}`}{" "}
            orders
          </span>
          <span>·</span>
          <span className="text-amber-500 font-bold">
            {adminStats.pending} pending
          </span>
          <span>·</span>
          <span className="text-violet-500 font-bold">
            {adminStats.shipped} shipped
          </span>
          <span>·</span>
          <span className="text-emerald-500 font-bold">
            {adminStats.delivered} delivered
          </span>
        </div>
      </div>

      {OrderDetailDrawer}
    </div>
  );
};

export default OrdersPage;
