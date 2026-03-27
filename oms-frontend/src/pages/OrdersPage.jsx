import { useState, useMemo } from "react";
import { useAllOrders, useMyOrders, useUpdateOrderStatus, useCancelOrder, useOrder } from "../hooks/useOrders";
import useAuthStore from "../store/authStore";
import { notification, Spin, Drawer, Divider } from "antd";
import { useNavigate } from "react-router-dom";

const OrdersPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const adminView = user?.role === "ADMIN" || user?.role === "MANAGER";

  const { data: allOrders, isLoading: loadingAll, refetch: refetchAll } = useAllOrders();
  const { data: myOrders, isLoading: loadingMy, refetch: refetchMy } = useMyOrders();
  const { mutate: updateStatus, isPending: updating } = useUpdateOrderStatus();
  const { mutate: cancelOrder, isPending: cancelling } = useCancelOrder();

  const [activeTab, setActiveTab] = useState("ALL"); // For Admin
  const [filterStatus, setFilterStatus] = useState("ALL"); // For Customer
  const [detailOrderId, setDetailOrderId] = useState(null);

  const { data: detailData, isLoading: loadingDetail } = useOrder(detailOrderId);
  const detailOrder = detailData?.data;

  const loading = adminView ? loadingAll : loadingMy;
  const rawOrders = adminView ? allOrders?.data : myOrders?.data;
  const orders = rawOrders || [];

  const handleUpdateStatus = (orderId, newStatus) => {
    updateStatus(
      { id: orderId, status: newStatus },
      {
        onSuccess: () => {
          notification.success({ message: `Order updated to ${newStatus}` });
          refetchAll();
        },
      }
    );
  };

  const handleCancelOrder = (orderId) => {
    cancelOrder(orderId, {
      onSuccess: () => {
        notification.success({ message: "Order cancelled successfully" });
        refetchMy();
      },
      onError: (err) => {
        notification.error({ message: err?.message || "Failed to cancel order" });
      },
    });
  };

  const STATUS_FLOW = {
    PENDING: "CONFIRMED",
    CONFIRMED: "SHIPPED",
    SHIPPED: "DELIVERED",
  };

  const STATUS_BADGE = {
    PENDING: "bg-primary/10 text-primary",
    CONFIRMED: "bg-surface-tint/10 text-surface-tint",
    SHIPPED: "bg-secondary-container text-on-secondary-container",
    DELIVERED: "bg-surface-dim text-on-surface",
    CANCELLED: "bg-error/10 text-error",
  };

  /* ═══════════════════════════════════════════════════════
   *  CUSTOMER VIEW — Aesthetic Order Cards
   * ═══════════════════════════════════════════════════════ */
  if (!adminView) {
    const filteredOrders = filterStatus === "ALL" 
      ? orders 
      : orders.filter(o => o.status === filterStatus);

    return (
      <div className="pb-24 space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-surface-container pb-6 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-2">My Orders</h1>
            <p className="text-sm font-bold text-outline uppercase tracking-[0.2em]">{orders.length} orders total</p>
          </div>
          
          <div className="flex bg-surface-container-low p-1.5 rounded-full shadow-inner overflow-x-auto no-scrollbar">
            {["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all whitespace-nowrap ${
                  filterStatus === status 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-on-surface-variant hover:bg-white/40"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center h-64 items-center"><Spin size="large" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="glass-panel p-16 rounded-[2rem] ghost-border shadow-soft flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-6 opacity-50">package_2</span>
            <h3 className="text-2xl font-black tracking-tight text-on-surface mb-2">No orders found</h3>
            <p className="text-on-surface-variant font-medium text-sm">You haven't placed any {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} orders yet.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {filteredOrders.map(order => {
              const getProgress = (status) => {
                switch(status) {
                  case "PENDING": return "w-1/4";
                  case "CONFIRMED": return "w-1/2";
                  case "SHIPPED": return "w-3/4";
                  case "DELIVERED": return "w-full";
                  default: return "w-0";
                }
              };

              return (
                <div 
                  key={order.id} 
                  className="glass-panel p-8 rounded-[2rem] ghost-border shadow-soft group hover:shadow-soft-hover transition-all relative overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/order-detail/${order.id}`)}
                >
                  {order.status === "CANCELLED" && (
                     <div className="absolute inset-0 bg-surface-container/30 backdrop-blur-[1px] z-10 hidden group-hover:block transition-all pointer-events-none"></div>
                  )}
                  {/* Cancel Button Top Right */}
                  {order.status === "PENDING" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                      disabled={cancelling}
                      className="absolute top-8 right-8 text-[10px] font-bold tracking-widest uppercase text-error hover:text-error-dim flex items-center gap-1 transition-colors z-20"
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                      Cancel
                    </button>
                  )}

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                    <div>
                      <p className="text-xs font-bold text-outline uppercase tracking-widest">Order ID</p>
                      <h4 className="text-2xl font-black text-on-surface">#{order.id.slice(0, 8).toUpperCase()}</h4>
                      <p className="text-xs font-medium text-outline-variant mt-2 tracking-wide">
                        Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${STATUS_BADGE[order.status]}`}>
                          {order.status}
                        </span>
                        <span className="text-sm font-semibold text-on-surface">{order.items?.length || 0} items</span>
                      </div>
                    </div>
                    
                    <div className="text-left md:text-right">
                      <p className="text-xs font-bold text-outline uppercase tracking-widest">Total Amount</p>
                      <h4 className="text-3xl font-black text-primary">₹{parseFloat(order.totalAmount).toLocaleString()}</h4>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="flex gap-4 mb-8 overflow-x-auto pb-4 no-scrollbar border-b border-surface-container/50">
                    {order.items?.map(it => (
                       <div key={it.id} className="flex-shrink-0 flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-xl group-hover:bg-white transition-colors border border-surface-container shadow-sm">
                         <span className="text-xs font-bold text-on-surface truncate max-w-[150px]">{it.product.name}</span>
                         <span className="text-[10px] font-black tracking-widest text-[#a8b8c8]">x{it.quantity}</span>
                       </div>
                    ))}
                  </div>
                  
                  {/* Minimalist Stepper */}
                  {order.status !== "CANCELLED" && (
                    <div className="relative pt-4 max-w-2xl mx-auto">
                      <div className="absolute top-0 left-0 w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
                        <div className={`h-full bg-primary ${getProgress(order.status)} transition-all duration-1000`}></div>
                      </div>
                      <div className="flex justify-between mt-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] font-extrabold text-primary uppercase">Pending</span>
                          <span className={`material-symbols-outlined ${order.status !== "PENDING" ? "text-primary" : "text-primary"}`} style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                        </div>
                        <div className={`flex flex-col items-center gap-1 ${order.status === "PENDING" ? "opacity-30" : ""}`}>
                          <span className="text-[10px] font-extrabold text-[#191c1c] uppercase">Confirmed</span>
                          <span className={`material-symbols-outlined ${order.status !== "PENDING" ? "text-primary" : ""}`} style={{fontVariationSettings: order.status !== "PENDING" ? "'FILL' 1" : "'FILL' 0"}}>
                            {order.status !== "PENDING" ? "check_circle" : "radio_button_unchecked"}
                          </span>
                        </div>
                        <div className={`flex flex-col items-center gap-1 ${(order.status === "PENDING" || order.status === "CONFIRMED") ? "opacity-30" : ""}`}>
                          <span className="text-[10px] font-extrabold text-[#191c1c] uppercase">Shipped</span>
                          <span className="material-symbols-outlined" style={{fontVariationSettings: order.status === "SHIPPED" || order.status === "DELIVERED" ? "'FILL' 1" : "'FILL' 0"}}>local_shipping</span>
                        </div>
                        <div className={`flex flex-col items-end gap-1 ${order.status !== "DELIVERED" ? "opacity-30" : ""}`}>
                          <span className="text-[10px] font-extrabold text-[#191c1c] uppercase">Delivered</span>
                          <span className="material-symbols-outlined" style={{fontVariationSettings: order.status === "DELIVERED" ? "'FILL' 1" : "'FILL' 0"}}>package_2</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
   *  ADMIN VIEW
   * ═══════════════════════════════════════════════════════ */
  const filteredAdminOrders =
    activeTab === "ALL"
      ? orders
      : orders.filter((o) => o.status === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <header className="h-20 flex justify-between items-center sticky top-0 bg-surface/80 backdrop-blur-xl z-30 transition-all border-b border-surface-container">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter text-on-surface">Order Management</h2>
          <p className="text-xs text-outline tracking-wider uppercase font-medium mt-1">
            {orders.length} total orders recorded
          </p>
        </div>
      </header>

      <section className="mt-8 rounded-[2rem] bg-surface-container-lowest shadow-soft overflow-hidden border border-surface-container">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-surface-container flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-surface-container-low p-1.5 rounded-full shadow-inner overflow-x-auto max-w-full">
            {["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? "bg-white text-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-white/40"
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          {filteredAdminOrders.length === 0 ? (
            <div className="p-16 text-center text-on-surface-variant font-medium">
              No orders found for this status.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 text-on-surface-variant">
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest border-b border-surface-container">Order ID</th>
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest border-b border-surface-container">Customer</th>
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest border-b border-surface-container">Quantity</th>
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest border-b border-surface-container">Amount</th>
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest border-b border-surface-container">Status</th>
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest border-b border-surface-container">Date</th>
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest border-b border-surface-container text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredAdminOrders.map((order) => {
                  const nextStatus = STATUS_FLOW[order.status];
                  // Hide mark as delivered if not admin
                  const canUpdate = nextStatus && !(nextStatus === "DELIVERED" && user?.role !== "ADMIN");

                  return (
                  <tr 
                    key={order.id} 
                    className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                    onClick={() => setDetailOrderId(order.id)}
                  >
                    <td className="py-5 px-8 font-mono text-xs font-bold text-on-surface">
                      {order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-5 px-8 text-sm font-semibold capitalize text-on-surface">
                      {order.user?.name || "Unknown"}
                    </td>
                    <td className="py-5 px-8 text-sm text-outline font-medium">
                      {order.items?.length || 0} items
                    </td>
                    <td className="py-5 px-8 text-sm font-bold text-on-surface">
                      ₹{parseFloat(order.totalAmount).toLocaleString()}
                    </td>
                    <td className="py-5 px-8">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-xs text-outline font-medium">
                      {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-outline-variant hover:text-primary transition-colors text-xl">visibility</span>
                        {canUpdate && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(order.id, nextStatus);
                            }}
                            disabled={updating}
                            className="px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-primary text-on-primary hover:scale-105 active:scale-95 transition-all disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            → {nextStatus}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Admin Order Detail Drawer */}
      <Drawer
        title={<span className="font-bold text-lg tracking-tight">Order Details</span>}
        placement="right"
        size="large"
        onClose={() => setDetailOrderId(null)}
        open={!!detailOrderId}
        className="bg-surface"
      >
        {loadingDetail ? (
          <div className="flex justify-center items-center h-full">
            <Spin size="large" />
          </div>
        ) : detailOrder ? (
          <div className="space-y-8">
            {/* Header / Meta */}
            <div className="flex justify-between items-start bg-surface-container-lowest p-6 rounded-3xl border border-surface-container">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-outline">Order ID</p>
                <h3 className="text-xl font-mono font-black text-on-surface mt-1">
                  {detailOrder.id.slice(0, 12).toUpperCase()}
                </h3>
                <p className="text-sm text-outline mt-2">
                  Placed {new Date(detailOrder.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest inline-block ${STATUS_BADGE[detailOrder.status]}`}>
                  {detailOrder.status}
                </span>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-4">Customer Info</h4>
              <div className="bg-surface-container-low p-5 rounded-2xl flex flex-col gap-2">
                <p className="text-on-surface font-semibold"><span className="text-outline mr-2 text-sm">Name:</span> {detailOrder.user?.name}</p>
                <p className="text-on-surface font-semibold"><span className="text-outline mr-2 text-sm">Email:</span> {detailOrder.user?.email}</p>
                <p className="text-on-surface font-mono text-sm"><span className="text-outline mr-2 font-sans">User ID:</span> {detailOrder.user?.id}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-outline-variant mb-4">Line Items</h4>
              <div className="space-y-3">
                {detailOrder.items?.map(item => (
                  <div key={item.id} className="flex gap-4 items-center bg-surface-container-low/50 p-4 rounded-2xl border border-surface-container">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center p-2 flex-shrink-0">
                      {item.product?.image ? (
                        <img src={`http://localhost:5011${item.product.image}`} alt={item.product.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="material-symbols-outlined text-outline-variant text-[20px]">inventory_2</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface">{item.product?.name || "Unknown Product"}</p>
                      <p className="text-xs text-outline font-medium">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-on-surface">
                        ₹{(parseFloat(item.priceAtPurchase) * item.quantity).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-outline line-through opacity-70">
                        ₹{parseFloat(item.product?.price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Divider className="border-surface-container" />

            {/* Total / Actions */}
            <div className="flex flex-col items-end gap-6">
              <div className="text-right">
                 <p className="text-xs font-bold uppercase tracking-widest text-outline mb-1">Total Amount</p>
                 <h2 className="text-3xl font-black text-primary">₹{parseFloat(detailOrder.totalAmount).toLocaleString()}</h2>
              </div>
              
              {/* Order Status Action inside Drawer */}
               <div className="flex gap-3 bg-surface-container-lowest p-2 rounded-full shadow-sm border border-surface-container w-full justify-end">
                 {["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].map((st) => {
                    const isCurrent = detailOrder.status === st;
                    const isNext = STATUS_FLOW[detailOrder.status] === st;
                    const disabled = !isNext || (st === "DELIVERED" && user?.role !== "ADMIN") || updating;

                    return (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(detailOrder.id, st)}
                        disabled={disabled || isCurrent}
                        className={`px-4 py-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                          isCurrent 
                            ? "bg-primary text-on-primary shadow-md scale-100" 
                            : isNext && !disabled
                              ? "bg-surface-container-high hover:bg-surface-container-highest text-primary animate-pulse"
                              : "text-outline-variant opacity-50 cursor-not-allowed"
                        }`}
                        title={st === "DELIVERED" && user?.role !== "ADMIN" ? "Only Admins can mark as delivered" : ""}
                      >
                        {st}
                      </button>
                    );
                 })}
               </div>
            </div>
          </div>
        ) : (
          <div className="text-center mt-20 text-outline-variant">Order not found</div>
        )}
      </Drawer>
    </div>
  );
};

export default OrdersPage;
