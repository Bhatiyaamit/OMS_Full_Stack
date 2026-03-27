import axiosInstance from "./axiosInstance";

export const productApi = {
  getAll: (params) => axiosInstance.get("/products", { params }),
  getById: (id) => axiosInstance.get(`/products/${id}`),
  create: (data) => axiosInstance.post("/products", data),
  update: (id, data) => axiosInstance.put(`/products/${id}`, data),
  delete: (id) => axiosInstance.delete(`/products/${id}`),
};
