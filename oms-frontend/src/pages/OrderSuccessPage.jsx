import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const OrderSuccessPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // Optionally fire analytics or confetti here
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-xl w-full text-center space-y-10">
        <div className="relative inline-flex items-center justify-center">
           <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
           <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center border-8 border-surface-container relative z-10 shadow-soft">
             <span className="material-symbols-outlined text-primary text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                task_alt
             </span>
           </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-black text-on-surface tracking-tighter">
            Thank you, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-lg text-on-surface-variant font-medium tracking-wide">
            Your order has been placed successfully.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] ghost-border shadow-soft flex flex-col items-center">
           <p className="text-xs font-bold text-outline transform tracking-[0.2em] uppercase mb-2">Order Tracking ID</p>
           <h2 className="text-2xl font-mono font-bold text-on-surface bg-surface-container-low px-6 py-3 rounded-[1rem] border border-surface-container shadow-inner">
             #{id?.slice(0, 8).toUpperCase() || 'EM-94021'}
           </h2>
           <p className="text-sm font-medium text-outline-variant mt-4 max-w-sm">
             We've sent a confirmation email to you. We will notify you when your order ships.
           </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button 
            onClick={() => navigate("/orders")}
            className="w-full sm:w-auto px-10 py-5 rounded-full font-bold text-sm bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:bg-surface-container-low active:scale-95 transition-all text-on-surface"
          >
            Track My Order
          </button>
          <button 
            onClick={() => navigate("/products")}
            className="w-full sm:w-auto px-10 py-5 rounded-full font-bold text-sm gradient-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Continue Shopping
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
