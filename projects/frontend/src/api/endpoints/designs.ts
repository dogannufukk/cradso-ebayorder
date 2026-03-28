import apiClient from '../axiosClient';
import type { DesignRequestType } from '../../types/order';

export interface DesignRequestDto {
  id: string;
  orderItemId: string;
  itemSKU: string;
  type: number;
  status: number;
  rejectionReason: string | null;
  approvalToken: string | null;
  tokenExpiresAt: string | null;
  createdDate: string;
  files: DesignFileDto[];
}

export interface DesignFileDto {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedBy: number;
  version: number;
  isActive: boolean;
  rejectionReason: string | null;
  createdDate: string;
}

export interface PortalDesignDto {
  designRequestId: string;
  ebayOrderNo: string;
  itemSKU: string;
  type: number;
  status: number;
  rejectionReason: string | null;
  activeFile: {
    fileName: string;
    fileType: string;
    previewUrl: string;
    version: number;
  } | null;
}

export const designsApi = {
  getByOrder: (orderId: string) =>
    apiClient.get<DesignRequestDto[]>(`/design-requests/by-order/${orderId}`),

  getById: (id: string) =>
    apiClient.get<DesignRequestDto>(`/design-requests/${id}`),

  create: (orderId: string, orderItemId: string, type: DesignRequestType) =>
    apiClient.post<string>('/design-requests', { orderId, orderItemId, type }),

  uploadFile: (designRequestId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<string>(`/design-requests/${designRequestId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteFile: (designRequestId: string, fileId: string) =>
    apiClient.delete(`/design-requests/${designRequestId}/files/${fileId}`),

  submitForApproval: (id: string) =>
    apiClient.patch(`/design-requests/${id}/submit-for-approval`),

  approve: (id: string) =>
    apiClient.patch(`/design-requests/${id}/approve`),

  reject: (id: string, reason: string) =>
    apiClient.patch(`/design-requests/${id}/reject`, { reason }),

  approvePrint: (id: string) =>
    apiClient.patch(`/design-requests/${id}/approve-print`),

  rejectPrint: (id: string, reason: string) =>
    apiClient.patch(`/design-requests/${id}/reject-print`, { reason }),
};

export interface PortalOrderDto {
  ebayOrderNo: string;
  customerName: string;
  items: PortalOrderItemDto[];
}

export interface PortalOrderItemDto {
  designRequestId: string;
  sku: string;
  quantity: number;
  description: string | null;
  designType: number;
  status: number;
  rejectionReason: string | null;
  approvalToken: string | null;
  activeFiles: {
    fileName: string;
    fileType: string;
    previewUrl: string;
    version: number;
  }[];
}

export interface RequestOtpResponse {
  maskedEmail: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
  expiresAt: string;
}

export const portalApi = {
  requestOtp: (token: string) =>
    apiClient.get<RequestOtpResponse>(`/portal/request-otp/${token}`),

  verifyOtp: (token: string, otpCode: string) =>
    apiClient.post<VerifyOtpResponse>(`/portal/verify-otp`, { token, otpCode }),

  getDesign: (token: string) =>
    apiClient.get<PortalDesignDto>(`/portal/design/${token}`),

  getOrder: (token: string) =>
    apiClient.get<PortalOrderDto>(`/portal/order/${token}`),

  upload: (token: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return apiClient.post<string[]>(`/portal/design/${token}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteFile: (token: string, fileId: string) =>
    apiClient.delete(`/portal/design/${token}/files/${fileId}`),

  submit: (token: string) =>
    apiClient.post(`/portal/design/${token}/submit`),

  approve: (token: string) =>
    apiClient.post(`/portal/design/${token}/approve`),

  reject: (token: string, reason: string) =>
    apiClient.post(`/portal/design/${token}/reject`, { reason }),
};
