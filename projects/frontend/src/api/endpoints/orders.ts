import apiClient from '../axiosClient';
import type { PaginatedList } from '../../types/common';
import type { CreateOrderRequest, OrderDetail, OrderListItem, OrderStatus } from '../../types/order';

export const ordersApi = {
  getAll: (params: Record<string, string | number | undefined>) =>
    apiClient.get<PaginatedList<OrderListItem>>('/orders', { params }),

  getById: (id: string) =>
    apiClient.get<OrderDetail>(`/orders/${id}`),

  create: (data: CreateOrderRequest) =>
    apiClient.post<string>('/orders', data),

  update: (id: string, data: { ebayOrderNo: string; notes?: string; items: { id?: string; sku: string; quantity: number; description?: string }[] }) =>
    apiClient.put(`/orders/${id}`, data),

  updateStatus: (id: string, status: OrderStatus) =>
    apiClient.patch(`/orders/${id}/status`, { status }),

  delete: (id: string) =>
    apiClient.delete(`/orders/${id}`),

  createShipment: (orderId: string, trackingNumber: string, deliveryType: number) =>
    apiClient.post(`/orders/${orderId}/shipments`, { trackingNumber, deliveryType }),
};
