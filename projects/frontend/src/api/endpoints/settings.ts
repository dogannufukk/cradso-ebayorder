import apiClient from '../axiosClient';

export interface SettingDto {
  key: string;
  value: string;
  description: string | null;
}

export const settingsApi = {
  getAll: () => apiClient.get<SettingDto[]>('/settings'),
  update: (key: string, value: string) => apiClient.put('/settings', { key, value }),
  isOtpRequired: () => apiClient.get<{ required: boolean }>('/settings/portal-otp-required'),
};
