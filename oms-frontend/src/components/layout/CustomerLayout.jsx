import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { useLogout } from "../../hooks/useAuth";
import CartIcon from "../cart/CartIcon";
import CheckoutAuthModal from "../cart/CheckoutAuthModal";

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
};

const CustomerLayout = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Top Navbar — Glassmorphism, Rounded, Floating */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-3 bg-white/60 backdrop-blur-xl rounded-full mt-4 mx-auto max-w-7xl border border-white/20 shadow-[0px_20px_40px_rgba(25,28,28,0.06)]">
        <div className="flex items-center gap-2 md:gap-8">
          <span
            onClick={() => navigate("/dashboard")}
            className="text-lg md:text-2xl font-black tracking-tighter text-slate-900 cursor-pointer"
          >
            nitec.
          </span>
          <div className="flex items-center gap-2 md:gap-6">
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `font-bold font-sans text-[11px] md:text-sm tracking-tight transition-all duration-300 px-2 md:px-3 py-1 rounded-full ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-slate-600 hover:bg-white/40"
                }`
              }
            >
              Shop
            </NavLink>
            {user ? (
              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  `font-bold font-sans text-[11px] md:text-sm whitespace-nowrap tracking-tight transition-all duration-300 px-2 md:px-3 py-1 rounded-full ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-slate-600 hover:bg-white/40"
                  }`
                }
              >
                My Orders
              </NavLink>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="font-bold font-sans text-[11px] md:text-sm whitespace-nowrap tracking-tight transition-all duration-300 px-2 md:px-3 py-1 rounded-full text-slate-600 hover:bg-white/40"
              >
                My Orders
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Cart Icon — opens drawer, works for guests too */}
          <CartIcon />

          {user ? (
            <div ref={menuRef} className="relative border-l border-outline-variant/30 ml-1 md:ml-2 pl-2 md:pl-4 flex items-center">
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 md:gap-3 cursor-pointer relative z-50"
              >
                <span className="hidden md:block text-sm font-semibold text-on-surface truncate max-w-25">
                  {user.name}
                </span>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold border-2 border-white shadow-sm overflow-hidden shrink-0">
                  {user.avatar ? (
                    <img
                      src={getImageUrl(user.avatar)}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              {/* Click-based Dropdown Menu */}
              <div 
                className={`absolute top-12 right-0 w-40 bg-surface-container-lowest rounded-md shadow-lg transition-all duration-200 p-2 flex flex-col gap-1 z-50 origin-top-right select-none ${isProfileMenuOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 pointer-events-none invisible"}`}
              >
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-on-surface font-semibold hover:bg-surface-container-low rounded-lg flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">
                    person
                  </span>
                  Profile
                </button>
                <div className="h-px w-full bg-surface-container my-0.5" />
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logoutMutation.mutate();
                  }}
                  disabled={logoutMutation.isPending}
                  className="w-full text-left px-4 py-2 text-sm text-error font-semibold hover:bg-error/10 rounded-lg flex items-center gap-2 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-sm">
                    logout
                  </span>
                  {logoutMutation.isPending ? "Signing out…" : "Logout"}
                </button>
              </div>
            </div>
          ) : (
            <div className="ml-1 md:ml-2 pl-2 md:pl-4 border-l border-outline-variant/30">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-slate-900 text-white rounded-full px-3 md:px-5 py-2.5 font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-lg shadow-slate-900/10"
              >
                <span className="material-symbols-outlined text-xs md:text-sm">
                  person
                </span>
                Login
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-24 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
        <Outlet />
      </main>

      {/* Minimal Footer */}
      <footer className="w-full py-12 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="space-y-4 text-center md:text-left">
            <span className="text-lg font-bold text-slate-900">nitec.</span>
            <p className="font-sans text-xs uppercase tracking-widest font-semibold text-slate-500">
              © 2026 nitec. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-12 mt-8 md:mt-0">
            <a
              className="font-sans text-xs uppercase tracking-widest font-semibold text-slate-500 hover:text-primary transition-colors hover:scale-105 active:scale-95"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="font-sans text-xs uppercase tracking-widest font-semibold text-slate-500 hover:text-primary transition-colors hover:scale-105 active:scale-95"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="font-sans text-xs uppercase tracking-widest font-semibold text-slate-500 hover:text-primary transition-colors hover:scale-105 active:scale-95"
              href="#"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>

      {/* General Auth Modal for Guests */}
      <CheckoutAuthModal
        open={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode="general"
        onSuccess={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default CustomerLayout;
