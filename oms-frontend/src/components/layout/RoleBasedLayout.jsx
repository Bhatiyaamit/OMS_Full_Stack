import { Outlet } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import MainLayout from "./MainLayout";
import CustomerLayout from "./CustomerLayout";

/**
 * RoleBasedLayout — picks the correct shell based on user.role.
 * CUSTOMER → top navbar (CustomerLayout)
 * ADMIN / MANAGER → sidebar (MainLayout)
 */
const RoleBasedLayout = () => {
  const { user } = useAuthStore();

  if (user?.role === "CUSTOMER") {
    return <CustomerLayout />;
  }

  return <MainLayout />;
};

export default RoleBasedLayout;
