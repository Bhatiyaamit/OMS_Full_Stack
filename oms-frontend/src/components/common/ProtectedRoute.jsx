import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/authStore";

/**
 * Wrapper for routes that require authentication.
 * Optional `allowedRoles` array can restrict access to specific roles.
 */
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    // Redirect logic: we generally redirect to login, but could save the intended path
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If logged in but wrong role, redirect to a safe home page
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
