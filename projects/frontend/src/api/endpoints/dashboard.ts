import apiClient from '../axiosClient';

export interface RecentOrderDto {
  id: string;
  ebayOrderNo: string;
  customerName: string;
  status: number;
  createdDate: string;
}

export interface DashboardSummaryDto {
  totalOrders: number;
  draftOrders: number;
  waitingDesignOrders: number;
  inDesignOrders: number;
  waitingApprovalOrders: number;
  approvedOrders: number;
  inProductionOrders: number;
  shippedOrders: number;
  rejectedOrders: number;
  totalCustomers: number;
  totalDesignRequests: number;
  pendingDesignRequests: number;
  recentOrders: RecentOrderDto[];
}

export const dashboardApi = {
  getSummary: () => apiClient.get<DashboardSummaryDto>('/dashboard/summary'),
};
