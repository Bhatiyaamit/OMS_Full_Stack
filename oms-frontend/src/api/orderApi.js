import axiosInstance from "./axiosInstance";

export const orderApi = {
  placeOrder: (data) => axiosInstance.post("/orders", data),
  getMyOrders: (query) => axiosInstance.get("/orders", { params: query }),
  getAllOrders: (query) => axiosInstance.get("/orders", { params: query }),
  getOrderById: (id) => axiosInstance.get(`/orders/${id}`),
  updateStatus: (id, status) => axiosInstance.put(`/orders/${id}/status`, { status }),
  cancelOrder: (id) => axiosInstance.delete(`/orders/${id}`),
};
