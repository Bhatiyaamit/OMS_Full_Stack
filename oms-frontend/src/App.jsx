import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";
import RoleBasedLayout from "./components/layout/RoleBasedLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import OrdersPage from "./pages/OrdersPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import OrderDetailPage from "./pages/OrderDetailPage";

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">explore_off</span>
    <h1 className="text-4xl font-semibold tracking-tight text-on-surface mb-2">404</h1>
    <p className="text-on-surface-variant text-sm">This page doesn&apos;t exist.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* All authenticated users — layout auto-selects by role */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleBasedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/orders" element={<OrdersPage adminView={false} />} />

            {/* Customer only */}
            <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/order-success/:id" element={<OrderSuccessPage />} />
              <Route path="/order-detail/:id" element={<OrderDetailPage />} />
            </Route>

            {/* Admin / Manager only */}
            <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]} />}>
              <Route path="/admin/orders" element={<OrdersPage adminView={true} />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
