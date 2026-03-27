import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";

const CustomerLayout = () => {
  const { user, logout } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Top Navbar — Glassmorphism, Rounded, Floating */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-3 bg-white/60 backdrop-blur-xl rounded-full mt-4 mx-auto max-w-7xl border border-white/20 shadow-[0px_20px_40px_rgba(25,28,28,0.06)]">
        <div className="flex items-center gap-8">
          <span 
            onClick={() => navigate("/dashboard")}
            className="text-2xl font-black tracking-tighter text-slate-900 cursor-pointer"
          >
            nitec.
          </span>
          <div className="hidden md:flex items-center gap-6">
            <NavLink 
              to="/products"
              className={({ isActive }) => 
                `font-bold font-sans text-sm tracking-tight transition-all duration-300 px-3 py-1 rounded-full ${
                  isActive ? "text-primary bg-primary/10" : "text-slate-600 hover:bg-white/40"
                }`
              }
            >
              Shop
            </NavLink>
            <NavLink 
              to="/orders"
              className={({ isActive }) => 
                `font-bold font-sans text-sm tracking-tight transition-all duration-300 px-3 py-1 rounded-full ${
                  isActive ? "text-primary bg-primary/10" : "text-slate-600 hover:bg-white/40"
                }`
              }
            >
              My Orders
            </NavLink>
          </div>
        </div>

        {/* Center Search (Optional/Decorative for now) */}
        <div className="flex-1 max-w-md mx-8 hidden lg:block">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input 
              className="w-full bg-surface-container-highest rounded-full border-none pl-12 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
              placeholder="Search products..." 
              type="text"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/cart")}
            className="p-2 text-on-surface-variant hover:bg-white/40 rounded-full transition-all scale-95 active:scale-90 relative"
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            {items.length > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-error text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {items.length}
              </span>
            )}
          </button>
          
          <div className="flex items-center gap-3 ml-2 pl-4 border-l border-outline-variant/30 relative group cursor-pointer">
            <span className="text-sm font-semibold text-on-surface truncate max-w-[100px]">{user?.name}</span>
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold border-2 border-white shadow-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            {/* Hover Logout Menu */}
            <div className="absolute top-12 right-0 w-32 bg-surface-container-lowest rounded-xl shadow-soft opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2">
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-error font-semibold hover:bg-error/10 rounded-lg flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-32 pb-24 px-8 max-w-7xl mx-auto">
        <Outlet />
      </main>

      {/* Minimal Footer */}
      <footer className="w-full py-12 bg-transparent">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="space-y-4 text-center md:text-left">
            <span className="text-lg font-bold text-slate-900">nitec.</span>
            <p className="font-sans text-xs uppercase tracking-widest font-semibold text-slate-500">
              © 2024 nitec. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-12 mt-8 md:mt-0">
            <a className="font-sans text-xs uppercase tracking-widest font-semibold text-slate-500 hover:text-primary transition-colors hover:scale-105 active:scale-95" href="#">Privacy Policy</a>
            <a className="font-sans text-xs uppercase tracking-widest font-semibold text-slate-500 hover:text-primary transition-colors hover:scale-105 active:scale-95" href="#">Terms of Service</a>
            <a className="font-sans text-xs uppercase tracking-widest font-semibold text-slate-500 hover:text-primary transition-colors hover:scale-105 active:scale-95" href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
