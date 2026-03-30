import { Outlet } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import MainLayout from "./MainLayout";
import CustomerLayout from "./CustomerLayout";

/**
 * RoleBasedLayout
 *
 * Picks the correct shell based on who is viewing.
 *
 * ADMIN or MANAGER  →  MainLayout
 *                       Dark sidebar with nav links:
 *                       Dashboard, Products, Orders, Settings
 *
 * CUSTOMER or GUEST →  CustomerLayout
 *                       Top navbar with:
 *                       Dashboard, Products, Cart, Login/Avatar
 *
 * Note: user === null means guest. Guests get CustomerLayout
 * so they can browse /dashboard, /products, and /cart freely.
 */
const RoleBasedLayout = () => {
  const { user } = useAuthStore();

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  if (isAdminOrManager) {
    return <MainLayout />;
  }

  // Covers CUSTOMER (logged in) and GUEST (user is null)
  return <CustomerLayout />;
};

export default RoleBasedLayout;
