import axios from "axios";
import useAuthStore from "../store/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5011/api";
//"http://192.168.0.59:5011/api"
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Required — sends HttpOnly cookie on every request
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor ──────────────────────────────────
// No Authorization header needed — backend reads JWT from cookie.
// We only clear Content-Type for FormData (file uploads).
axiosInstance.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"]; // Let browser set multipart boundary
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ─────────────────────────────────
// Unwrap { success, data, ... } envelope from backend.
// Auto-logout on 401 — cookie expired or invalid.
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Cookie expired or token invalid — clear local auth state
      const { clearAuth } = useAuthStore.getState();
      clearAuth();

      // Public routes that guests are allowed to visit — do NOT redirect
      const publicPaths = ["/dashboard", "/products", "/cart", "/login", "/register"];
      const isPublicPage = publicPaths.some((p) =>
        window.location.pathname.startsWith(p)
      );

      // Only hard-redirect to /login when the user is on a private page
      if (!isPublicPage) {
        window.location.href = "/login";
      }
    }

    // Reject with backend error payload or fallback message
    return Promise.reject(
      error.response?.data || { message: error.message || "Network error" }
    );
  }
);

export default axiosInstance;
