import { useParams, useNavigate } from "react-router-dom";
import { useMyOrders } from "../hooks/useOrders";
import { Spin } from "antd";

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: myOrders, isLoading } = useMyOrders();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spin size="large" />
      </div>
    );
  }

  const order = myOrders?.data?.find(o => o.id === id);

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <span className="material-symbols-outlined text-error text-6xl">error</span>
        <h1 className="text-2xl font-black text-on-surface">Order not found</h1>
        <button onClick={() => navigate("/orders")} className="gradient-primary text-white py-2 px-6 rounded-full font-bold shadow-soft">
          Back to Orders
        </button>
      </div>
    );
  }

  const STATUS_BADGE = {
    PENDING: "bg-primary/10 text-primary",
    CONFIRMED: "bg-surface-tint/10 text-surface-tint",
    SHIPPED: "bg-secondary-container text-on-secondary-container",
    DELIVERED: "bg-surface-dim text-on-surface",
    CANCELLED: "bg-error/10 text-error",
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
  };

  return (
    <div className="min-h-screen bg-background pb-24 space-y-12">
      {/* Header Back Button */}
      <header className="border-b border-surface-container py-6 relative">
          <button 
            onClick={() => navigate("/orders")}
            className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold text-sm tracking-widest uppercase p-4"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back
          </button>
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface">Order Detail</h1>
            <p className="text-sm font-bold text-outline uppercase tracking-[0.2em] mt-2">Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-8">
        
        {/* Left Column (Items) */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-2xl font-black text-on-surface tracking-tight mb-8">Purchased Items</h2>
          
          <div className="glass-panel p-8 rounded-[2rem] ghost-border shadow-soft flex flex-col gap-6">
            {order.items?.map(it => (
              <div key={it.id} className="flex items-center gap-6 border-b border-surface-container pb-6 last:border-0 last:pb-0 group">
                {/* Product Image */}
                <div className="w-24 h-24 rounded-xl bg-surface-container-low flex-shrink-0 overflow-hidden relative shadow-sm">
                  {getImageUrl(it.product.image) ? (
                    <img 
                      src={getImageUrl(it.product.image)} 
                      alt={it.product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline-variant">image</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold tracking-tight text-on-surface group-hover:text-primary transition-colors">
                    {it.product.name}
                  </h3>
                  <p className="text-xs font-mono text-outline uppercase tracking-wider mt-1">
                     SKU: {it.product.id.slice(0, 8)}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                   <h4 className="text-xl font-black text-on-surface">
                     ₹{(parseFloat(it.product.price) * it.quantity).toLocaleString()}
                   </h4>
                   <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Qty: {it.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (Summary) */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-inverse-surface rounded-[2rem] p-8 shadow-soft relative overflow-hidden text-white">
             {/* Gradient glow decoration */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

             <div className="flex justify-between items-start mb-8 z-10 relative">
               <h2 className="text-xl font-bold tracking-tight text-white/90">Order Summary</h2>
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${STATUS_BADGE[order.status]} shadow-lg shadow-black/20`}>
                  {order.status}
               </span>
             </div>

             <div className="space-y-4 font-medium z-10 relative">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Order ID</span>
                  <span className="font-mono font-bold tracking-widest uppercase">#{order.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Subtotal</span>
                  <span className="font-bold">₹{parseFloat(order.totalAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Shipping</span>
                  <span className="font-bold text-secondary-container">Free</span>
                </div>
                
                <div className="w-full h-[1px] bg-white/10 my-6"></div>
                
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#a8b8c8] opacity-80 mb-1">Total</span>
                  <span className="text-4xl font-extrabold tracking-tighter text-white">₹{parseFloat(order.totalAmount).toLocaleString()}</span>
                </div>
             </div>

             {/* Minimalist Contact Prompt */}
             <div className="mt-8 pt-8 border-t border-white/10 flex items-start gap-4 z-10 relative">
               <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-primary-fixed-dim border border-white/10">
                 <span className="material-symbols-outlined text-sm">support_agent</span>
               </div>
               <div>
                  <h4 className="text-sm font-bold text-white mb-1">Need resolving issues?</h4>
                  <p className="text-xs font-medium text-white/60 mb-2">If you have any questions, our support team is ready to help 24/7.</p>
                  <a href="#" className="text-xs font-bold uppercase tracking-widest text-primary-fixed hover:text-white transition-colors">Contact Support</a>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
