import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import LottieModule from "lottie-react";
import warehouseAnimation from "../assets/warehouse-worker.json";

const Lottie = LottieModule.default || LottieModule;


const OrderSuccessPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // Optionally fire analytics or confetti here
  }, []);

  return (
    <div className="flex flex-col items-center justify-center pt-2 pb-16 px-4">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="relative inline-flex items-center justify-center">
           <Lottie animationData={warehouseAnimation} loop={true} className="w-72 h-72 sm:w-80 sm:h-80 relative z-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black text-on-surface tracking-tighter">
            Thank you, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-base text-on-surface-variant font-medium tracking-wide">
            Your order has been placed successfully.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-4xl ghost-border flex flex-col items-center">
           <p className="text-xs font-bold text-outline transform tracking-[0.2em] uppercase mb-2">Order Tracking ID</p>
           <h2 className="text-xl font-mono font-bold text-on-surface bg-surface-container-low px-6 py-3 rounded-2xl border border-surface-container">
             #{id?.slice(0, 8).toUpperCase() || 'EM-94021'}
           </h2>
           <p className="text-sm font-medium text-outline-variant mt-4 max-w-sm">
             We've sent a confirmation email to you. We will notify you when your order ships.
           </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button 
            onClick={() => navigate(`/order-detail/${id}`)}
            className="w-full sm:w-auto px-10 py-5 rounded-full font-bold text-sm bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-center"
          >
            Track My Order
          </button>
          <button 
            onClick={() => navigate("/products")}
            className="w-full sm:w-auto px-10 py-5 rounded-full font-bold text-sm bg-surface-container-lowest border border-outline-variant/30 text-slate-800 hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
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
