import apiClient from '../axiosClient';
import type { PaginatedList } from '../../types/common';
import type { EmailLogItem } from '../../types/emailLog';

export const emailLogsApi = {
  getAll: (params: Record<string, string | number | undefined>) =>
    apiClient.get<PaginatedList<EmailLogItem>>('/email-logs', { params }),

  retry: (id: string) =>
    apiClient.post(`/email-logs/${id}/retry`),
};
