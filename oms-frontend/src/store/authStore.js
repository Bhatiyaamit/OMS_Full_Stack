import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Auth Store — Zustand with localStorage persistence.
 *
 * We store { user, isAuthenticated } in localStorage so the
 * UI can render the correct role-based layout immediately on
 * page load. The actual auth token lives in an HttpOnly cookie
 * managed entirely by the backend — never in JS memory.
 */
const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { id, name, email, role }
      isAuthenticated: false,

      // Called after successful login/register response
      setAuth: (userData) =>
        set({
          user: userData,
          isAuthenticated: true,
        }),

      // Called on logout or 401 interception
      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "oms-auth-storage",
    }
  )
);

export default useAuthStore;
