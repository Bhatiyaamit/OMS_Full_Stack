import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5011/api";

export const dashboardApi = {
  getStats: () =>
    axios.get(`${API_URL}/dashboard`, {
      withCredentials: true,
    }),
};
