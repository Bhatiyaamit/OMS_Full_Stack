import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboardApi";
import useAuthStore from "../store/authStore";

export const useDashboardStats = () => {
  const user = useAuthStore((state) => state.user);
  const canViewDashboard =
    user?.role === "ADMIN" || user?.role === "MANAGER";

  return useQuery({
    queryKey: ["dashboardStats", user?.id],
    enabled: !!canViewDashboard,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data?.data;
    },
  });
};
