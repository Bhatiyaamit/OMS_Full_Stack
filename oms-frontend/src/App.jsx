import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import useAuthStore from "./store/authStore";
import useCartStore from "./store/cartStore";

// ── Layouts ──────────────────────────────────────────────
import RoleBasedLayout from "./components/layout/RoleBasedLayout";

// ── Pages ────────────────────────────────────────────────
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import ProfilePage from "./pages/ProfilePage";
import CheckoutPage from "./pages/CheckoutPage";
import CouponsPage from "./pages/CouponsPage";

// ─────────────────────────────────────────────────────────
//  ROUTE GUARDS
// ─────────────────────────────────────────────────────────

/**
 * PrivateRoute
 * Only logged-in users (any role) can access.
 * Guest → redirect to /login
 */
const PrivateRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

/**
 * AdminRoute
 * Only ADMIN or MANAGER can access.
 * Not logged in   → redirect to /login
 * Wrong role      → redirect to /dashboard
 */
const AdminRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

/**
 * AuthRoute
 * Only guests (not logged in) can access /login and /register.
 * Already logged in as Admin/Manager → redirect to /dashboard
 * Already logged in as Customer      → redirect to /dashboard
 */
const AuthRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (!user) return children;
  return <Navigate to="/dashboard" replace />;
};

// ─────────────────────────────────────────────────────────
//  APP
// ─────────────────────────────────────────────────────────

function App() {
  const { user } = useAuthStore();
  const hydrateFromServer = useCartStore((s) => s.hydrateFromServer);
  const defaultDashboardPath =
    user?.role === "ADMIN" || user?.role === "MANAGER"
      ? "/admin/dashboard"
      : "/dashboard";

  // On page load — if user is already logged in, pull their cart from DB
  useEffect(() => {
    if (user) {
      hydrateFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="bottom-left" richColors />
      <Routes>
        {/* ════════════════════════════════════════════════
            AUTH PAGES — no layout shell, full screen pages
            Guests only — logged-in users redirected away
            ════════════════════════════════════════════════ */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <LoginPage />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <RegisterPage />
            </AuthRoute>
          }
        />

        {/* ════════════════════════════════════════════════
            MAIN APP — wrapped in RoleBasedLayout shell
            RoleBasedLayout decides:
              Admin/Manager → MainLayout (dark sidebar)
              Customer/Guest → CustomerLayout (top navbar)
            ════════════════════════════════════════════════ */}
        <Route element={<RoleBasedLayout />}>
          {/* ── / → always redirect to /dashboard ── */}
          <Route
            index
            element={<Navigate to={defaultDashboardPath} replace />}
          />

          {/* ── /dashboard ──────────────────────────────
              FULLY PUBLIC storefront landing page for
              guest and customer users.
              ─────────────────────────────────────────── */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* ── /admin/dashboard ────────────────────────
              ADMIN / MANAGER ONLY.
              Dedicated analytics dashboard for sales,
              orders, fulfillment and inventory health.
              ─────────────────────────────────────────── */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />

          {/* ── /products ───────────────────────────────
              FULLY PUBLIC — guests, customers, admin all see it.
              ProductsPage renders different UI based on role:
                Guest / Customer → product grid with add to cart
                Admin            → inventory table with CRUD
              ─────────────────────────────────────────── */}
          <Route path="/products" element={<ProductsPage />} />

          {/* ── /cart ───────────────────────────────────
              FULLY PUBLIC — guests can add items and view cart.
              CartPage handles the guest checkout flow internally:
                Guest clicks "Place Order"
                  → LoginModal appears (NOT a redirect)
                  → After login, order is placed automatically
                  → Cart data stays intact in Zustand
              ─────────────────────────────────────────── */}
          <Route path="/cart" element={<CartPage />} />

          {/*
            /checkout — PrivateRoute, customer only.
            User must be logged in to reach payment page.
            State passed from CartPage via navigate().
          */}
          <Route
            path="/checkout"
            element={
              <PrivateRoute>
                <CheckoutPage />
              </PrivateRoute>
            }
          />

          {/* ── /orders ─────────────────────────────────
              PRIVATE — must be logged in.
              OrdersPage renders based on role:
                CUSTOMER         → own orders only (card view)
                ADMIN / MANAGER  → all orders (table view)
              ─────────────────────────────────────────── */}
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <OrdersPage />
              </PrivateRoute>
            }
          />

          {/* ── /orders/:id ─────────────────────────────
              PRIVATE — must be logged in.
              CUSTOMER         → can only view their own order
              ADMIN / MANAGER  → can view any order
              (access control enforced inside the component
               and also on the backend API)
              ─────────────────────────────────────────── */}
          <Route
            path="/order-detail/:id"
            element={
              <PrivateRoute>
                <OrderDetailPage />
              </PrivateRoute>
            }
          />

          {/* ── /order-success/:id ──────────────────────
              PRIVATE — user must be logged in to have
              placed an order in the first place.
              Shows order confirmation screen after checkout.
              ─────────────────────────────────────────── */}
          <Route
            path="/order-success/:id"
            element={
              <PrivateRoute>
                <OrderSuccessPage />
              </PrivateRoute>
            }
          />

          {/* ── /profile ────────────────────────────────
              PRIVATE — user must be logged in.
              ─────────────────────────────────────────── */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />

          {/* ── /admin/orders ───────────────────────────
              ADMIN / MANAGER ONLY.
              Dedicated URL for sidebar nav link.
              Same OrdersPage component but accessed via
              admin sidebar — always shows all orders table.
              ─────────────────────────────────────────── */}
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <OrdersPage />
              </AdminRoute>
            }
          />

          {/* ── /coupons ────────────────────────────────
              ADMIN / MANAGER ONLY.
              Create, manage, and monitor discount coupons.
              ─────────────────────────────────────────── */}
          <Route
            path="/coupons"
            element={
              <AdminRoute>
                <CouponsPage />
              </AdminRoute>
            }
          />

          {/* ── catch all ───────────────────────────────
              Any unknown URL → back to the correct
              dashboard based on current role
              ─────────────────────────────────────────── */}
          <Route
            path="*"
            element={<Navigate to={defaultDashboardPath} replace />}
          />
        </Route>
        {/* end RoleBasedLayout */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
