import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { useLogout, useUser } from "../../hooks/useAuth";
import { Spin } from "antd";
import { toast } from "sonner";

/**
 * MainLayout — matches the exact Stitch "Admin Dashboard (Minimal)" sidebar.
 * Uses Material Symbols Outlined icons exactly as the Stitch HTML.
 */
const MainLayout = () => {
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const { isLoading } = useUser();
  const navigate = useNavigate();

  // Responsive sidebar state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // If we jump back to desktop size, auto-close the drawer
      if (window.innerWidth >= 1280) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast.success("Logged out successfully");
        navigate("/login");
      },
    });
  };

  // Role-based navigation — matches Stitch sidebar links
  const navItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: "dashboard",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      label: "Orders",
      path: "/orders",
      icon: "package_2",
      roles: ["CUSTOMER"],
    },
    {
      label: "Manage Orders",
      path: "/admin/orders",
      icon: "package_2",
      roles: ["ADMIN", "MANAGER"],
    },
    {
      label: "Inventory",
      path: "/products",
      icon: "inventory_2",
      roles: ["ADMIN", "MANAGER", "CUSTOMER"],
    },
    {
      label: "My Cart",
      path: "/cart",
      icon: "shopping_cart",
      roles: ["CUSTOMER"],
    },
  ];

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(user?.role || "CUSTOMER")
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-inter relative">
      {/* ── Mobile/Tablet Overlay ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed xl:static left-0 top-0 h-full bg-slate-50 border-r border-slate-200 flex flex-col py-8 z-50 w-60 shrink-0 transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="mb-10 px-6">
          <h1 className="text-xl font-semibold tracking-tighter text-slate-900">
            OMS
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mt-1">
            System Controller
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center transition-colors gap-3 px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "text-blue-700 bg-slate-100 border-r-2 border-blue-700 font-semibold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom user card */}
        <div className="mt-auto pt-6 px-6">
          <button
            onClick={handleLogout}
            className="bg-primary text-on-primary rounded-full font-semibold transition-transform active:scale-95 hover:opacity-90 flex items-center justify-center w-full py-3 text-xs tracking-widest uppercase"
          >
            Logout
          </button>
          <div className="mt-6 flex items-center gap-3 px-2">
            <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-on-surface truncate">
                {user?.name || "User"}
              </p>
              <p className="text-[10px] text-outline uppercase truncate">
                {user?.role || "—"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main
        className="flex-1 min-w-0 min-h-screen flex flex-col transition-all duration-300 ease-in-out overflow-x-hidden"
      >
        {/* Mobile/Tablet header line (visible below xl). 
            If your page has its own hamburger, you can choose to use that instead. 
            We keep this generic one. */}
        <header className="xl:hidden h-16 shrink-0 bg-white border-b border-slate-100 flex items-center px-4 sticky top-0 z-10 w-full">
           <button
             onClick={() => setIsMobileOpen((open) => !open)}
             className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-slate-600 transition-colors"
           >
             <span className="material-symbols-outlined">menu</span>
           </button>
           <span className="ml-2 font-black text-slate-900 tracking-tighter text-lg">OMS</span>
        </header>

        {/* Scrollable Container (Page-level scrolling) */}
        <div className="flex-1 overflow-y-auto bg-background min-w-0">
          <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 min-h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
