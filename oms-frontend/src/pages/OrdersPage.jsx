import { useState } from "react";
import {
  useAllOrders,
  useMyOrders,
  useUpdateOrderStatus,
  useCancelOrder,
  useOrder,
} from "../hooks/useOrders";
import useAuthStore from "../store/authStore";
import { notification, Spin, Drawer, Divider, Modal, Steps } from "antd";
import { useNavigate } from "react-router-dom";

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

  return (
    <div className="w-full pt-2 custom-antd-steps">
      <Steps
        size="small"
        current={currentIdx}
        labelPlacement="vertical"
        items={[
          {
            title: <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">Pending</span>,
            icon: <div className="flex items-center justify-center pt-0.5"><span className="material-symbols-outlined text-[16px]">hourglass_empty</span></div>,
          },
          {
            title: <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">Confirmed</span>,
            icon: <div className="flex items-center justify-center pt-0.5"><span className="material-symbols-outlined text-[16px]">check_circle</span></div>,
          },
          {
            title: <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">Shipped</span>,
            icon: <div className="flex items-center justify-center pt-0.5"><span className="material-symbols-outlined text-[16px]">local_shipping</span></div>,
          },
          {
            title: <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">Delivered</span>,
            icon: <div className="flex items-center justify-center pt-0.5"><span className="material-symbols-outlined text-[16px]">package_2</span></div>,
          },
        ]}
      />
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

  const {
    data: allOrdersData,
    isLoading: loadingAll,
    refetch: refetchAll,
  } = useAllOrders();
  const {
    data: myOrdersData,
    isLoading: loadingMy,
    refetch: refetchMy,
  } = useMyOrders();
  const { mutate: updateStatus, isPending: updating } = useUpdateOrderStatus();
  const { mutate: cancelOrder, isPending: cancelling } = useCancelOrder();

  const [activeTab, setActiveTab] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: detailData, isLoading: loadingDetail } =
    useOrder(detailOrderId);
  const detailOrder = detailData?.data;

  const loading = adminView ? loadingAll : loadingMy;
  const rawOrders = adminView ? allOrdersData?.data : myOrdersData?.data;
  const orders = rawOrders || [];

  const handleUpdateStatus = (orderId, newStatus) => {
    updateStatus(
      { id: orderId, status: newStatus },
      {
        onSuccess: () => {
          notification.success({ message: `Order updated to ${newStatus}` });
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
            notification.success({ message: "Order cancelled" });
            refetchMy();
          },
          onError: (err) =>
            notification.error({ message: err?.message || "Failed to cancel" }),
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
            {detailOrder.status !== "CANCELLED" && detailOrder.status !== "DELIVERED" && (
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
                        src={
                          item.product.image.startsWith("http")
                            ? item.product.image
                            : `http://localhost:5011${item.product.image}`
                        }
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

    const statusFilters = ["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

    return (
      <div className="w-full max-w-[1800px] mx-auto pb-24">
        {/* ── Page header ── */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Orders</h1>
            <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-2 bg-[#C8F04A] text-slate-900 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow hover:scale-105 transition-transform"
            >
              <span className="material-symbols-outlined text-sm">storefront</span>
              Continue Shopping
            </button>
          </div>
          <p className="text-slate-400 font-medium text-sm">
            {orders.length > 0 ? `You have placed ${orders.length} orders` : "No orders yet"}
          </p>
        </header>

        {/* Removed redundant Stat cards grid */}

        {/* ── Two-column layout: Sidebar + Orders list ── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ═══ LEFT SIDEBAR FILTERS ═══ */}
          <aside className="w-full lg:w-72 shrink-0 sticky top-6 self-start">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Sidebar header */}
              <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Filter Orders</p>
              </div>

              {/* Filter items */}
              <nav className="p-3 space-y-1">
                {statusFilters.map((s) => {
                  const cfg = STATUS_CONFIG[s] || {};
                  const isActive = filterStatus === s;
                  const count = s === "ALL"
                    ? orders.length
                    : orders.filter((o) => o.status === s).length;

                  return (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {s !== "ALL" && (
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isActive ? "bg-white" : cfg.dot || "bg-slate-300"
                            }`}
                          />
                        )}
                        {s === "ALL" && (
                          <span
                            className={`material-symbols-outlined text-[18px] shrink-0 ${
                              isActive ? "text-white" : "text-slate-400"
                            }`}
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            apps
                          </span>
                        )}
                        <span className="text-xs font-black uppercase tracking-wider">
                          {s === "ALL" ? "All Orders" : cfg.label || s}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Sidebar footer — quick spend summary */}
              <div className="px-5 py-4 border-t border-slate-50 bg-slate-50/80">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Spent</p>
                <p className="text-base font-black text-slate-900">₹{totalSpend.toLocaleString()}</p>
              </div>
            </div>
          </aside>

          {/* ═══ ORDERS LIST ═══ */}
          <div className="flex-1 min-w-0">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">package_2</span>
                <h3 className="text-xl font-black text-slate-900 mb-2">No orders here</h3>
                <p className="text-slate-400 font-medium text-sm mb-6">
                  {filterStatus !== "ALL" ? `No ${filterStatus.toLowerCase()} orders found.` : "You haven't placed any orders yet."}
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
                  const isDelivered = order.status === "DELIVERED";

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer group ${
                        isCancelled ? "border-rose-100 opacity-75" : "border-slate-100 hover:border-slate-200"
                      }`}
                      onClick={() => navigate(`/order-detail/${order.id}`)}
                    >
                      <div className="p-5 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                          {/* Left: Product Image & Details */}
                          {(() => {
                            const firstItem = order.items?.[0];
                            const product = firstItem?.product;
                            const moreItemsCount = order.items?.length > 1 ? order.items.length - 1 : 0;
                            return (
                             <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                                {product?.image ? (
                                  <img 
                                    src={product.image.startsWith('http') ? product.image : `http://localhost:5011${product.image}`} 
                                    alt={product.name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="material-symbols-outlined text-slate-300">image</span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-black text-slate-900 text-sm tracking-tight truncate max-w-37.5 sm:max-w-xs cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/products/${product?.id}`); }}>
                                    {product?.name || "Unknown Product"}
                                  </h4>
                                  {moreItemsCount > 0 && (
                                    <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                                      +{moreItemsCount} items
                                    </span>
                                  )}
                                  <StatusBadge status={order.status} />
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-500 uppercase">#{order.id.slice(0, 8)}</span>
                                  <span>&bull;</span>
                                  <span>{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                </p>
                              </div>
                             </div>
                            );
                          })()}

                          {/* Right: amount + cancel */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total</p>
                              <p className="text-xl font-black text-slate-900 leading-none">₹{parseFloat(order.totalAmount).toLocaleString()}</p>
                            </div>
                            {order.status === "PENDING" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                                disabled={cancelling}
                                className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                title="Cancel order"
                              >
                                <span className="material-symbols-outlined text-[20px]">cancel</span>
                              </button>
                            )}
                            <div className="p-2 rounded-xl text-slate-300 group-hover:text-slate-600 group-hover:bg-slate-50 transition-colors">
                              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </div>
                          </div>
                        </div>

                        {/* Compact Stepper */}
                        {!isCancelled && !isDelivered && (
                          <div className="border-t border-slate-50 pt-3">
                            <OrderStepper status={order.status} />
                          </div>
                        )}

                        {isCancelled && (
                          <div className="border-t border-rose-50 pt-3 flex items-center gap-1.5 text-rose-400">
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                            <span className="text-[11px] font-bold">This order was cancelled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    shipped: orders.filter((o) => o.status === "SHIPPED").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    revenue: orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0),
  };

  return (
    <div className="pb-24">
      {/* ── Sticky header ── */}
      <header className="h-20 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-xl z-30 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Order Management
          </h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID or customer…"
            className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm w-64 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
          />
        </div>
      </header>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 mb-6">
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
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-3"
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
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                {label}
              </p>
              <p className="text-lg font-black text-slate-900 leading-none">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main table card ── */}
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Tab filter row */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                ? orders.length
                : orders.filter((o) => o.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab
                    ? "bg-slate-900 text-white shadow"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab === "ALL" ? "All" : cfg.label || tab}
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${activeTab === tab ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

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
                      <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                        {order.items?.length || 0} item
                        {order.items?.length !== 1 ? "s" : ""}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-black text-slate-900 text-sm">
                          ₹{parseFloat(order.totalAmount).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400 font-medium">
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
        </div>

        {/* Summary footer */}
        <div className="px-6 py-4 border-t border-slate-50 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
          <span>
            Showing {filteredAdminOrders.length} of {orders.length} orders
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
