import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/authApi";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";

/**
 * useLogin — POST /api/auth/login
 * On success, syncs user data to Zustand store.
 */
export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const mergeGuestCart = useCartStore((s) => s.mergeGuestCart);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      setAuth(res.data); // { id, name, email, role }
      mergeGuestCart([]); // keep guest items after login
    },
  });
};

/**
 * useRegister — POST /api/auth/register
 * Auto-logs the user in on success.
 */
export const useRegister = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const mergeGuestCart = useCartStore((s) => s.mergeGuestCart);

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      setAuth(res.data);
      mergeGuestCart([]); // keep guest items after register
    },
  });
};

/**
 * useLogout — POST /api/auth/logout
 * Clears Zustand state + all React Query cache.
 */
export const useLogout = () => {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const clearCart = useCartStore((s) => s.clearCart);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAuth();
      clearCart(); // wipe cart on logout
      queryClient.clear();
    },
    onError: () => {
      // Force clear even if the API call fails (e.g. cookie already expired)
      clearAuth();
      clearCart();
      queryClient.clear();
    },
  });
};

/**
 * useUser — GET /api/auth/me
 * Only fires if Zustand says we're authenticated.
 * Revalidates user data from the server.
 */
export const useUser = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ["authUser"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
};
