import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/endpoints/settings';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      settingsApi.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      showToast('success', 'Setting updated successfully.');
    },
    onError: () => {
      showToast('error', 'Failed to update setting.');
    },
  });

  const otpSetting = settings?.find((s) => s.key === 'portal.otp.required');
  const otpEnabled = otpSetting?.value === 'true';

  const handleToggleOtp = () => {
    updateMutation.mutate({
      key: 'portal.otp.required',
      value: otpEnabled ? 'false' : 'true',
    });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl px-5 py-3 shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>

      {/* Portal Security Card */}
      <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Portal Security</h2>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Require OTP Verification
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                When enabled, customers must verify their identity via email OTP
                code before accessing the design portal
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={otpEnabled}
              onClick={handleToggleOtp}
              disabled={updateMutation.isPending}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                otpEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  otpEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
