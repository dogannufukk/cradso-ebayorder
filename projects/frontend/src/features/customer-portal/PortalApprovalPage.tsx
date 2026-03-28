import { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalApi, type PortalOrderItemDto } from '../../api/endpoints/designs';
import { settingsApi } from '../../api/endpoints/settings';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { DesignRequestStatus } from '../../types/order';
import {
  DESIGN_REQUEST_STATUS_LABELS,
  DESIGN_REQUEST_STATUS_COLORS,
} from '../../utils/constants';

type DesignDecision = 'approve' | 'reject';
interface Decisions {
  [designRequestId: string]: { decision: DesignDecision; reason: string };
}

export default function PortalApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [otpCheckDone, setOtpCheckDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    const checkOtp = async () => {
      try {
        const res = await settingsApi.isOtpRequired();
        if (!res.data.required) { setOtpCheckDone(true); return; }
        const stored = sessionStorage.getItem(`otp_verified_${token}`);
        if (!stored) { navigate(`/portal/verify/${token}`, { replace: true }); return; }
        const data = JSON.parse(stored);
        if (new Date(data.expiresAt) <= new Date()) {
          sessionStorage.removeItem(`otp_verified_${token}`);
          navigate(`/portal/verify/${token}`, { replace: true }); return;
        }
        setOtpCheckDone(true);
      } catch { setOtpCheckDone(true); }
    };
    checkOtp();
  }, [token, navigate]);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, { url: string; name: string }[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Design approval decisions (client-side, not sent until submit)
  const [decisions, setDecisions] = useState<Decisions>({});
  const [rejectingItem, setRejectingItem] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingDecisions, setSubmittingDecisions] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['portal-order', token],
    queryFn: () => portalApi.getOrder(token!).then((r) => r.data),
    enabled: !!token,
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // --- File upload logic ---
  const uploadableItems = useMemo(() => {
    if (!order) return [];
    return order.items.filter(
      (i) => i.status === DesignRequestStatus.WaitingUpload || i.status === DesignRequestStatus.PrintRejected
    );
  }, [order]);

  const allFilesSelected = useMemo(() => {
    if (uploadableItems.length === 0) return false;
    return uploadableItems.every((item) => item.approvalToken && selectedFiles[item.approvalToken]?.length > 0);
  }, [uploadableItems, selectedFiles]);

  const handleFilesSelect = (item: PortalOrderItemDto, files: FileList) => {
    if (!item.approvalToken) return;
    const key = item.approvalToken;
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...newFiles] }));
    const newPreviews = newFiles.map((file) => ({
      url: /\.(jpe?g|png)$/i.test(file.name) ? URL.createObjectURL(file) : '',
      name: file.name,
    }));
    setPreviewUrls((prev) => ({ ...prev, [key]: [...(prev[key] || []), ...newPreviews] }));
  };

  const removeFile = (itemToken: string, index: number) => {
    setSelectedFiles((prev) => ({ ...prev, [itemToken]: prev[itemToken].filter((_, i) => i !== index) }));
    setPreviewUrls((prev) => {
      if (prev[itemToken]?.[index]?.url) URL.revokeObjectURL(prev[itemToken][index].url);
      return { ...prev, [itemToken]: prev[itemToken].filter((_, i) => i !== index) };
    });
  };

  const handleSubmitFiles = async () => {
    if (!allFilesSelected || submitting) return;
    setSubmitting(true);
    try {
      for (const item of uploadableItems) {
        if (!item.approvalToken) continue;
        const files = selectedFiles[item.approvalToken];
        if (!files?.length) continue;
        await portalApi.upload(item.approvalToken, files);
        await portalApi.submit(item.approvalToken);
      }
      Object.values(previewUrls).forEach((p) => p.forEach((x) => { if (x.url) URL.revokeObjectURL(x.url); }));
      setSelectedFiles({});
      setPreviewUrls({});
      setSubmitSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['portal-order', token] });
      showToast('success', 'Files submitted for review!');
    } catch (err: any) {
      showToast('error', err.response?.data?.errors?.[0] || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Design approval logic ---
  const approvableItems = useMemo(() => {
    if (!order) return [];
    return order.items.filter((i) => i.status === DesignRequestStatus.WaitingApproval);
  }, [order]);

  const allDecided = approvableItems.length > 0 && approvableItems.every((i) => decisions[i.designRequestId]);

  const setDecision = (id: string, decision: DesignDecision | undefined, reason = '') => {
    if (!decision) {
      setDecisions((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      setDecisions((prev) => ({ ...prev, [id]: { decision, reason } }));
    }
  };

  const handleSubmitDecisions = async () => {
    if (!allDecided || submittingDecisions) return;
    setSubmittingDecisions(true);
    try {
      for (const item of approvableItems) {
        const dec = decisions[item.designRequestId];
        if (!dec || !item.approvalToken) continue;
        if (dec.decision === 'approve') {
          await portalApi.approve(item.approvalToken);
        } else {
          await portalApi.reject(item.approvalToken, dec.reason);
        }
      }
      setDecisions({});
      queryClient.invalidateQueries({ queryKey: ['portal-order', token] });
      showToast('success', 'Your decisions have been submitted!');
    } catch (err: any) {
      showToast('error', err.response?.data?.errors?.[0] || 'Submission failed.');
    } finally {
      setSubmittingDecisions(false);
    }
  };

  const getFileExtension = (name: string) => name.split('.').pop()?.toUpperCase() || 'FILE';

  if (!otpCheckDone || isLoading) return <div className="flex items-center justify-center py-20"><LoadingSpinner /></div>;

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center shadow-sm">
        <div className="text-4xl mb-3">&#128683;</div>
        <h2 className="text-lg font-semibold text-red-700 mb-2">Link Invalid or Expired</h2>
        <p className="text-sm text-red-600">This design link is no longer valid. Please contact us.</p>
      </div>
    );
  }

  if (!order) return null;

  const allApproved = order.items.every((i) => i.status === DesignRequestStatus.Approved);

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-5 py-3 shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* Order Header */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Welcome, <span className="font-medium text-gray-700">{order.customerName}</span></p>
            <h2 className="text-lg font-bold text-gray-900">Order <span className="text-blue-600">#{order.ebayOrderNo}</span></h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{order.items.length} item(s)</p>
            {allApproved && <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 mt-1">All Approved ✓</span>}
          </div>
        </div>
      </div>

      {/* Approval banner */}
      {approvableItems.length > 0 && (
        <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 flex items-center gap-3">
          <span className="text-lg">🎨</span>
          <div>
            <p className="text-sm font-semibold text-purple-800">Your designs are ready for review</p>
            <p className="text-xs text-purple-600 mt-0.5">Review each item and approve or request changes, then submit your decisions.</p>
          </div>
        </div>
      )}

      {/* Items */}
      {order.items.map((item, index) => {
        const dec = decisions[item.designRequestId];
        return (
          <div key={item.designRequestId} className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{index + 1}</div>
                <p className="text-sm font-semibold text-gray-900">{item.sku}</p>
                {item.description && <p className="text-xs text-gray-400">· {item.description}</p>}
                <span className="text-[10px] text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5">×{item.quantity}</span>
              </div>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${DESIGN_REQUEST_STATUS_COLORS[item.status as keyof typeof DESIGN_REQUEST_STATUS_COLORS] || 'bg-gray-100 text-gray-600'}`}>
                {DESIGN_REQUEST_STATUS_LABELS[item.status as keyof typeof DESIGN_REQUEST_STATUS_LABELS]}
              </span>
            </div>

            <div className="px-5 py-4">
              {/* --- WaitingUpload / PrintRejected --- */}
              {(item.status === DesignRequestStatus.WaitingUpload || item.status === DesignRequestStatus.PrintRejected) && (
                <div className="space-y-3">
                  {item.status === DesignRequestStatus.PrintRejected && (
                    <details className="rounded-lg border border-red-200 bg-red-50/50 overflow-hidden">
                      <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 select-none">
                        <span>Previous submission rejected</span><span className="text-xs text-red-400">details</span>
                      </summary>
                      <div className="px-3 pb-3 border-t border-red-200 pt-2 space-y-2">
                        {item.activeFiles.length > 0 && item.activeFiles.map((file, fi) => (
                          <div key={fi} className="flex items-center gap-2 text-xs bg-white rounded-md border border-gray-100 px-2 py-1.5">
                            <span className="w-6 h-6 rounded bg-red-100 text-red-500 flex items-center justify-center font-bold text-[10px] shrink-0">{file.fileType.toUpperCase()}</span>
                            <span className="truncate text-gray-600 flex-1">{file.fileName}</span>
                            <a href={file.previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline shrink-0">view</a>
                          </div>
                        ))}
                        {item.rejectionReason && (
                          <div className="rounded-md bg-red-100/60 px-2.5 py-2">
                            <p className="text-[10px] font-medium text-red-500 uppercase tracking-wider">Reason</p>
                            <p className="text-xs text-red-700">{item.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  {item.approvalToken && selectedFiles[item.approvalToken]?.length > 0 && (
                    <div className="space-y-1">
                      {selectedFiles[item.approvalToken].map((file, fi) => (
                        <div key={fi} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 group">
                          {previewUrls[item.approvalToken!]?.[fi]?.url ? (
                            <img src={previewUrls[item.approvalToken!][fi].url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <span className="w-8 h-8 rounded bg-blue-100 text-blue-500 flex items-center justify-center font-bold text-[10px] shrink-0">{getFileExtension(file.name)}</span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                            <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button type="button" onClick={() => item.approvalToken && removeFile(item.approvalToken, fi)}
                            className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 shrink-0">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 px-4 py-3 transition-all">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <span className="text-xs text-gray-500">{item.approvalToken && selectedFiles[item.approvalToken]?.length > 0 ? 'Add more files' : 'Select design files'}</span>
                    <span className="text-[10px] text-gray-400">(PDF, JPG, PNG, PSD, AI, TIFF)</span>
                    <input ref={(el) => { fileRefs.current[item.designRequestId] = el; }} type="file" className="hidden" multiple
                      accept=".pdf,.jpg,.jpeg,.png,.psd,.ai,.tiff,.tif"
                      onChange={(e) => { const f = e.target.files; if (f && f.length > 0) handleFilesSelect(item, f); e.target.value = ''; }} />
                  </label>
                </div>
              )}

              {/* --- CustomerUploaded --- */}
              {item.status === DesignRequestStatus.CustomerUploaded && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-center">
                  <p className="text-xs font-medium text-orange-700">Under review by our team</p>
                </div>
              )}

              {/* --- PrintApproved --- */}
              {item.status === DesignRequestStatus.PrintApproved && (
                <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2 text-center">
                  <p className="text-xs font-medium text-teal-700">Approved for printing — design in progress</p>
                </div>
              )}

              {/* --- InDesign --- */}
              {item.status === DesignRequestStatus.InDesign && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-center">
                  <p className="text-xs font-medium text-blue-700">Our team is working on your design</p>
                </div>
              )}

              {/* --- WaitingApproval: review design files + mark decision --- */}
              {item.status === DesignRequestStatus.WaitingApproval && (
                <div className="space-y-3">
                  {/* Show design files */}
                  {item.activeFiles.length > 0 && (
                    <div className="space-y-1">
                      {item.activeFiles.map((file, fi) => (
                        <div key={fi} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <span className="w-7 h-7 rounded bg-purple-100 text-purple-500 flex items-center justify-center font-bold text-[10px] shrink-0">{file.fileType.toUpperCase()}</span>
                          <p className="text-xs text-gray-600 truncate flex-1">{file.fileName}</p>
                          <a href={file.previewUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline shrink-0">preview</a>
                          <a href={file.previewUrl} download={file.fileName} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline shrink-0">download</a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Decision buttons (client-side only, not submitted yet) */}
                  {!dec && rejectingItem !== item.designRequestId && (
                    <div className="flex gap-2">
                      <button onClick={() => setDecision(item.designRequestId, 'approve')}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-700">
                        ✓ Approve
                      </button>
                      <button onClick={() => setRejectingItem(item.designRequestId)}
                        className="flex-1 rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                        Request Changes
                      </button>
                    </div>
                  )}

                  {/* Reject reason form */}
                  {rejectingItem === item.designRequestId && !dec && (
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2">
                      <textarea className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-red-400 focus:outline-none" rows={2}
                        placeholder="Describe what needs to change..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={() => { setDecision(item.designRequestId, 'reject', rejectReason); setRejectingItem(null); setRejectReason(''); }}
                          disabled={!rejectReason.trim()}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">Confirm</button>
                        <button onClick={() => { setRejectingItem(null); setRejectReason(''); }}
                          className="rounded-md border px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Decision badge (marked but not submitted) */}
                  {dec && (
                    <div className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between ${
                      dec.decision === 'approve' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      <span>{dec.decision === 'approve' ? '✓ Marked: Approved' : `✕ Changes requested — ${dec.reason}`}</span>
                      <button onClick={() => setDecision(item.designRequestId, undefined)}
                        className="text-[10px] underline opacity-70 hover:opacity-100">Change</button>
                    </div>
                  )}
                </div>
              )}

              {/* --- Approved --- */}
              {item.status === DesignRequestStatus.Approved && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-center">
                  <p className="text-xs font-medium text-green-700">✓ Approved — proceeding to production</p>
                </div>
              )}

              {/* --- Rejected --- */}
              {item.status === DesignRequestStatus.Rejected && (
                <div className="space-y-2">
                  {item.rejectionReason && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      <p className="text-[10px] font-medium text-red-500 uppercase tracking-wider">Changes Requested</p>
                      <p className="text-xs text-red-700">{item.rejectionReason}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-center">
                    <p className="text-xs font-medium text-amber-700">Revising design based on your feedback</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Submit file uploads */}
      {uploadableItems.length > 0 && !submitSuccess && (
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <button onClick={handleSubmitFiles} disabled={!allFilesSelected || submitting}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</span> : 'Submit for Review'}
          </button>
          {!allFilesSelected && <p className="text-[10px] text-gray-400 text-center mt-1.5">Select at least one file per item</p>}
        </div>
      )}

      {/* Submit design decisions */}
      {approvableItems.length > 0 && (
        <div className={`rounded-xl p-4 shadow-sm border ${allDecided ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100'}`}>
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-900">Submit Your Decisions</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {Object.keys(decisions).length}/{approvableItems.length} item(s) reviewed
            </p>
          </div>
          {!allDecided && (
            <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs text-amber-700">⚠ Please review all items before submitting.</p>
            </div>
          )}
          <button onClick={handleSubmitDecisions} disabled={!allDecided || submittingDecisions}
            className="w-full rounded-lg bg-purple-600 py-2.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {submittingDecisions ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</span> : `Submit Decisions (${Object.keys(decisions).length}/${approvableItems.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
