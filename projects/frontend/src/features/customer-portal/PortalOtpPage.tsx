import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { portalApi } from '../../api/endpoints/designs';
import { settingsApi } from '../../api/endpoints/settings';

export default function PortalOtpPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if already verified
  useEffect(() => {
    if (!token) return;
    const stored = sessionStorage.getItem(`otp_verified_${token}`);
    if (stored) {
      const data = JSON.parse(stored);
      if (new Date(data.expiresAt) > new Date()) {
        navigate(`/portal/design/${token}`, { replace: true });
      } else {
        sessionStorage.removeItem(`otp_verified_${token}`);
      }
    }
  }, [token, navigate]);

  const requestOtp = useCallback(async () => {
    if (!token || sending) return;
    setSending(true);
    setError(null);
    try {
      // If OTP is not required, skip directly to the design page
      const otpCheck = await settingsApi.isOtpRequired();
      if (!otpCheck.data.required) {
        navigate(`/portal/design/${token}`, { replace: true });
        return;
      }
      const res = await portalApi.requestOtp(token);
      setMaskedEmail(res.data.maskedEmail);
      setCountdown(60);
      setCanResend(false);
      setOtpValues(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Invalid or expired link.';
      setLinkError(msg);
    } finally {
      setSending(false);
    }
  }, [token, sending]);

  // Request OTP on mount
  useEffect(() => {
    requestOtp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const verifyOtp = async (code: string) => {
    if (!token || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await portalApi.verifyOtp(token, code);
      if (res.data.verified) {
        sessionStorage.setItem(
          `otp_verified_${token}`,
          JSON.stringify({ verified: true, expiresAt: res.data.expiresAt })
        );
        navigate(`/portal/design/${token}`, { replace: true });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        'Verification failed.';
      setError(msg);
      setOtpValues(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...otpValues];

    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newValues[i] = digits[i] || '';
      }
      setOtpValues(newValues);
      const nextEmpty = newValues.findIndex((v) => !v);
      if (nextEmpty === -1) {
        inputRefs.current[5]?.focus();
        // Auto-verify
        verifyOtp(newValues.join(''));
      } else {
        inputRefs.current[nextEmpty]?.focus();
      }
      return;
    }

    newValues[index] = value;
    setOtpValues(newValues);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (value && newValues.every((v) => v)) {
      verifyOtp(newValues.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      handleChange(0, pasted);
    }
  };

  if (linkError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center shadow-sm max-w-md w-full">
          <div className="text-4xl mb-3">&#128683;</div>
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Link Invalid or Expired
          </h2>
          <p className="text-sm text-red-600">{linkError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="rounded-2xl bg-white border border-gray-100 shadow-lg p-8 max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          Verify Your Identity
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          {maskedEmail ? (
            <>
              We sent a 6-digit code to{' '}
              <span className="font-medium text-gray-700">{maskedEmail}</span>
            </>
          ) : (
            'Sending verification code...'
          )}
        </p>

        {/* OTP Inputs */}
        <div className="flex gap-2 justify-center mb-4">
          {otpValues.map((value, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={verifying}
              className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all ${
                error
                  ? 'border-red-300 bg-red-50'
                  : value
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 text-center mb-4">{error}</p>
        )}

        {/* Verifying indicator */}
        {verifying && (
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-blue-600">
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Verifying...
          </div>
        )}

        {/* Countdown & Resend */}
        <div className="text-center">
          {!canResend ? (
            <p className="text-sm text-gray-400">
              Code expires in{' '}
              <span className="font-semibold text-gray-600">
                {countdown}s
              </span>
            </p>
          ) : (
            <button
              onClick={requestOtp}
              disabled={sending}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Resend Code'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
