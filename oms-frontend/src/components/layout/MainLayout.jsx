import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { useLogout, useUser } from "../../hooks/useAuth";
import { Spin, notification } from "antd";

/**
 * MainLayout — matches the exact Stitch "Admin Dashboard (Minimal)" sidebar.
 * Uses Material Symbols Outlined icons exactly as the Stitch HTML.
 */
const MainLayout = () => {
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const { isLoading } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        notification.success({ message: "Logged out successfully", placement: "top" });
        navigate("/login");
      },
    });
  };

  // Role-based navigation — matches Stitch sidebar links
  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
      roles: ["ADMIN", "MANAGER", "CUSTOMER"],
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
    <div className="flex h-screen bg-background overflow-hidden font-inter">
      {/* ── Sidebar — exact Stitch structure ── */}
      <aside className="h-screen w-64 fixed left-0 top-0 border-r-0 bg-slate-50 flex flex-col py-8 px-6 transition-all duration-200 ease-in-out z-20">
        {/* Brand */}
        <div className="mb-10">
          <h1 className="text-xl font-semibold tracking-tighter text-slate-900">OMS</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mt-1">
            System Controller
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "font-semibold text-blue-700 border-r-2 border-blue-700 bg-slate-100"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom user card */}
        <div className="mt-auto pt-6">
          <button
            onClick={handleLogout}
            className="w-full bg-primary text-on-primary py-3 rounded-full text-xs font-semibold tracking-widest uppercase transition-transform active:scale-95 hover:opacity-90"
          >
            Logout
          </button>
          <div className="mt-6 flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface">{user?.name || "User"}</p>
              <p className="text-[10px] text-outline uppercase">{user?.role || "—"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="ml-64 flex-1 min-h-screen overflow-auto">
        <div className="px-12 pb-12 max-w-[1440px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
