import apiClient from '../axiosClient';
import type { PaginatedList } from '../../types/common';
import type { CreateCustomerRequest, Customer, CustomerDetail, UpdateCustomerRequest } from '../../types/customer';

export const customersApi = {
  getAll: (params: Record<string, string | number | undefined>) =>
    apiClient.get<PaginatedList<Customer>>('/customers', { params }),

  getById: (id: string) =>
    apiClient.get<CustomerDetail>(`/customers/${id}`),

  create: (data: CreateCustomerRequest) =>
    apiClient.post<string>('/customers', data),

  update: (id: string, data: UpdateCustomerRequest) =>
    apiClient.put(`/customers/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/customers/${id}`),
};
