import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../api/orderApi";

export const useMyOrders = () => {
  return useQuery({
    queryKey: ["myOrders"],
    queryFn: orderApi.getMyOrders,
  });
};

export const useAllOrders = () => {
  return useQuery({
    queryKey: ["allOrders"],
    queryFn: orderApi.getAllOrders,
  });
};

export const useOrder = (id) => {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => orderApi.getOrderById(id),
    enabled: !!id,
  });
};

export const usePlaceOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderApi.placeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myOrders"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => orderApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.id] });
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderApi.cancelOrder,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["myOrders"] });
      queryClient.invalidateQueries({ queryKey: ["order", id] });
    },
  });
};
