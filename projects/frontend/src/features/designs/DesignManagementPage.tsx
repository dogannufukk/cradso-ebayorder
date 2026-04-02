import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designsApi } from '../../api/endpoints/designs';
import type { DesignRequestDto } from '../../api/endpoints/designs';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  DESIGN_TYPE_LABELS,
  DESIGN_REQUEST_STATUS_LABELS,
  DESIGN_REQUEST_STATUS_COLORS,
} from '../../utils/constants';
import { DesignRequestStatus } from '../../types/order';

type PrintDecision = 'ok' | 'nok';
interface PrintDecisions {
  [designRequestId: string]: { decision: PrintDecision; reason: string };
}

export default function DesignManagementPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printDecisions, setPrintDecisions] = useState<PrintDecisions>({});
  const [submittingPrint, setSubmittingPrint] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAll, setSubmittingAll] = useState(false);

  const { data: designs, isLoading } = useQuery({
    queryKey: ['designs', orderId],
    queryFn: () => designsApi.getByOrder(orderId!).then((r) => r.data),
    enabled: !!orderId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ designRequestId, file }: { designRequestId: string; file: File }) =>
      designsApi.uploadFile(designRequestId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', orderId] });
      setSuccess('File uploaded successfully.');
      setError('');
    },
    onError: (err: any) => { setError(err.response?.data?.errors?.[0] || 'Upload failed'); setSuccess(''); },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => designsApi.submitForApproval(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', orderId] });
      setSuccess('Submitted for customer approval.');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Submit failed'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => designsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setSuccess('Design approved.');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Approve failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => designsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', orderId] });
      setRejectId(null);
      setRejectReason('');
      setSuccess('Design rejected.');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Reject failed'),
  });

  // Items that are in CustomerUploaded status (need print review)
  const reviewableItems = designs?.filter((d) => d.status === DesignRequestStatus.CustomerUploaded) || [];
  const allReviewed = reviewableItems.length > 0 && reviewableItems.every((d) => printDecisions[d.id]);

  const setPrintDecision = (id: string, decision: PrintDecision | undefined, reason = '') => {
    if (!decision) {
      setPrintDecisions((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      setPrintDecisions((prev) => ({ ...prev, [id]: { decision, reason } }));
    }
  };

  const handleSubmitAllPrintDecisions = async () => {
    if (!allReviewed || submittingPrint) return;
    setSubmittingPrint(true);
    setError('');

    try {
      for (const dr of reviewableItems) {
        const dec = printDecisions[dr.id];
        if (!dec) continue;
        if (dec.decision === 'ok') {
          await designsApi.approvePrint(dr.id);
        } else {
          await designsApi.rejectPrint(dr.id, dec.reason);
        }
      }
      setPrintDecisions({});
      queryClient.invalidateQueries({ queryKey: ['designs', orderId] });
      setSuccess('Print review completed for all items.');
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0] || 'Print review failed.');
    } finally {
      setSubmittingPrint(false);
    }
  };

  // Items in InDesign with active files — ready to send to customer
  const inDesignReadyItems = designs?.filter(
    (d) => d.status === DesignRequestStatus.InDesign && d.files.some((f) => f.isActive)
  ) || [];

  const handleSubmitAllToCustomer = async () => {
    if (inDesignReadyItems.length === 0 || submittingAll) return;
    setSubmittingAll(true);
    setError('');
    try {
      for (const dr of inDesignReadyItems) {
        await designsApi.submitForApproval(dr.id);
      }
      queryClient.invalidateQueries({ queryKey: ['designs', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setSuccess('All designs sent to customer for approval.');
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0] || 'Failed to submit designs.');
    } finally {
      setSubmittingAll(false);
    }
  };

  const handleFileUpload = (designRequestId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ designRequestId, file });
      e.target.value = '';
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link to={`/orders/${orderId}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to Order</Link>
        <h1 className="text-2xl font-bold text-gray-900">Design Management</h1>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{success}</div>}

      {!designs || designs.length === 0 ? (
        <p className="text-gray-500">No design requests for this order.</p>
      ) : (
        <div className="space-y-6">
          {/* Print review banner */}
          {reviewableItems.length > 0 && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">Print Suitability Review</p>
                <p className="text-xs text-orange-600 mt-0.5">{reviewableItems.length} item(s) need review. Mark each as suitable or not, then submit all decisions.</p>
              </div>
            </div>
          )}

          {/* All reviewed success banner */}
          {reviewableItems.length === 0 && designs && designs.some(d => d.status === DesignRequestStatus.PrintApproved) && designs.every(d => d.status !== DesignRequestStatus.CustomerUploaded) && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-green-800">Print review completed for all items.</p>
                <p className="text-xs text-green-600 mt-0.5">Upload your designs and send to customer for approval.</p>
              </div>
            </div>
          )}

          {designs.map((dr) => (
            <DesignRequestCard
              key={dr.id}
              dr={dr}
              printDecision={printDecisions[dr.id]}
              onSetPrintDecision={(decision, reason) => setPrintDecision(dr.id, decision, reason)}
              onUpload={(e) => handleFileUpload(dr.id, e)}
              onSubmitForApproval={() => submitMutation.mutate(dr.id)}
              onApprove={() => approveMutation.mutate(dr.id)}
              onReject={() => setRejectId(dr.id)}
              isUploading={uploadMutation.isPending}
            />
          ))}

          {/* Submit all print decisions button */}
          {reviewableItems.length > 0 && (
            <div className="rounded-lg bg-white border border-gray-200 p-4">
              <button
                onClick={handleSubmitAllPrintDecisions}
                disabled={!allReviewed || submittingPrint}
                className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingPrint ? 'Submitting decisions...' : `Submit Print Review (${Object.keys(printDecisions).length}/${reviewableItems.length} reviewed)`}
              </button>
              {!allReviewed && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Review all items before submitting.
                </p>
              )}
            </div>
          )}

          {/* Send all designs to customer button */}
          {inDesignReadyItems.length > 0 && (
            <div className="rounded-lg bg-white border border-orange-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Send Designs to Customer</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {inDesignReadyItems.length} item(s) with design files ready to send for customer approval.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSubmitAllToCustomer}
                disabled={submittingAll}
                className="w-full rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingAll ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  `Send All to Customer (${inDesignReadyItems.length} items)`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reject Design Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Reject Design</h3>
            <textarea
              className="w-full rounded-lg border px-4 py-2 text-sm focus:border-red-500 focus:outline-none"
              rows={3}
              placeholder="Please provide a reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >{rejectMutation.isPending ? 'Rejecting...' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DesignRequestCard({
  dr,
  printDecision,
  onSetPrintDecision,
  onUpload,
  onSubmitForApproval,
  onApprove,
  onReject,
  isUploading,
}: {
  dr: DesignRequestDto;
  printDecision?: { decision: PrintDecision; reason: string };
  onSetPrintDecision: (decision: PrintDecision | undefined, reason: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmitForApproval: () => void;
  onApprove: () => void;
  onReject: () => void;
  isUploading: boolean;
}) {
  const [nokReason, setNokReason] = useState('');
  const [showNokForm, setShowNokForm] = useState(false);
  const activeFiles = dr.files.filter((f) => f.isActive);
  const canSubmitForApproval = dr.status === DesignRequestStatus.InDesign && activeFiles.length > 0;

  // Group files by version
  const versions = [...new Set(dr.files.map(f => f.version))].sort((a, b) => b - a);

  const statusConfig: Record<number, { bg: string; border: string; icon: string; text: string }> = {
    [DesignRequestStatus.WaitingUpload]: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⏳', text: 'Waiting for customer upload' },
    [DesignRequestStatus.CustomerUploaded]: { bg: 'bg-orange-50', border: 'border-orange-200', icon: '📋', text: 'Review print suitability' },
    [DesignRequestStatus.PrintRejected]: { bg: 'bg-red-50', border: 'border-red-200', icon: '❌', text: 'Rejected — waiting for re-upload' },
    [DesignRequestStatus.PrintApproved]: { bg: 'bg-teal-50', border: 'border-teal-200', icon: '✅', text: 'Print approved — upload design' },
    [DesignRequestStatus.InDesign]: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '🎨', text: 'Design in progress' },
    [DesignRequestStatus.WaitingApproval]: { bg: 'bg-purple-50', border: 'border-purple-200', icon: '👁', text: 'Waiting for customer approval' },
    [DesignRequestStatus.Approved]: { bg: 'bg-green-50', border: 'border-green-200', icon: '✓', text: 'Approved — ready for production' },
    [DesignRequestStatus.Rejected]: { bg: 'bg-red-50', border: 'border-red-200', icon: '↩', text: 'Customer requested changes' },
  };

  const sc = statusConfig[dr.status] || statusConfig[0];

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-3 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
            {dr.itemSKU.slice(0, 3)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{dr.itemSKU}</p>
            <p className="text-[11px] text-gray-400">{DESIGN_TYPE_LABELS[dr.type as keyof typeof DESIGN_TYPE_LABELS]}</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${DESIGN_REQUEST_STATUS_COLORS[dr.status as keyof typeof DESIGN_REQUEST_STATUS_COLORS] || 'bg-gray-100 text-gray-600'}`}>
          {DESIGN_REQUEST_STATUS_LABELS[dr.status as keyof typeof DESIGN_REQUEST_STATUS_LABELS]}
        </span>
      </div>

      {/* Status banner */}
      <div className={`${sc.bg} ${sc.border} border-b px-5 py-2.5 flex items-center gap-2`}>
        <span className="text-sm">{sc.icon}</span>
        <span className="text-xs font-medium text-gray-700">{sc.text}</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Rejection reason (PrintRejected or Rejected) */}
        {dr.rejectionReason && (dr.status === DesignRequestStatus.PrintRejected || dr.status === DesignRequestStatus.Rejected) && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Rejection Reason</p>
            <p className="text-sm text-red-700">{dr.rejectionReason}</p>
          </div>
        )}

        {/* Files grouped by version */}
        {dr.files.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Files ({dr.files.length})</p>
            {versions.map((ver) => {
              const versionFiles = dr.files.filter(f => f.version === ver);
              const isActiveVersion = versionFiles.some(f => f.isActive);
              const rejectedFile = versionFiles.find(f => f.rejectionReason);
              return (
                <details key={ver} open={isActiveVersion} className={`rounded-lg border ${isActiveVersion ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-gray-50/50'} overflow-hidden group`}>
                  <summary className={`flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-gray-50 ${isActiveVersion ? 'bg-blue-100/50 hover:bg-blue-100/70' : 'bg-gray-100/50'}`}>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-gray-400 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActiveVersion ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'}`}>v{ver}</span>
                      <span className="text-[10px] text-gray-500">{versionFiles.length} file(s)</span>
                      {isActiveVersion && <span className="text-[10px] text-blue-600 font-semibold">Current</span>}
                      {rejectedFile?.rejectionReason && !isActiveVersion && <span className="text-[10px] text-red-500 font-medium">Rejected</span>}
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(versionFiles[0].createdDate).toLocaleDateString()}</span>
                  </summary>
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {versionFiles.map((f) => {
                      const fileUrl = f.fileUrl.startsWith('/') ? f.fileUrl : `/files/${f.fileUrl}`;
                      const isImage = ['jpg', 'jpeg', 'png'].includes(f.fileType.toLowerCase());
                      return (
                        <div key={f.id} className="flex items-center gap-2 px-3 py-2">
                          <span className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${f.uploadedBy === 0 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {f.fileType.toUpperCase().slice(0, 3)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-700 truncate">{f.fileName}</p>
                            <p className="text-[10px] text-gray-400">
                              {(f.fileSizeBytes / 1024).toFixed(1)} KB · <span className={f.uploadedBy === 0 ? 'text-orange-500' : 'text-blue-500'}>{f.uploadedBy === 0 ? 'Customer' : 'Admin'}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isImage && (
                              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-blue-600 px-1">view</a>
                            )}
                            <a href={fileUrl} download={f.fileName} target="_blank" rel="noopener noreferrer" className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50">↓</a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {rejectedFile?.rejectionReason && (
                    <div className="px-3 py-2 bg-red-50 border-t border-red-100">
                      <p className="text-[10px] text-red-600"><span className="font-semibold">Rejected:</span> {rejectedFile.rejectionReason}</p>
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        )}

        {/* === Action sections === */}

        {/* CustomerUploaded: Print review */}
        {dr.status === DesignRequestStatus.CustomerUploaded && (
          <div className="space-y-3">
            {!printDecision && !showNokForm && (
              <div className="flex items-center gap-2">
                <button onClick={() => onSetPrintDecision('ok', '')}
                  className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700">
                  ✓ Print Suitable
                </button>
                <button onClick={() => setShowNokForm(true)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
                  ✕ Not Suitable
                </button>
              </div>
            )}

            {showNokForm && !printDecision && (
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2">
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-red-400 focus:outline-none"
                  rows={2}
                  placeholder="e.g., Resolution too low, wrong format..."
                  value={nokReason}
                  onChange={(e) => setNokReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => { onSetPrintDecision('nok', nokReason); setShowNokForm(false); setNokReason(''); }}
                    disabled={!nokReason.trim()}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">Confirm</button>
                  <button onClick={() => { setShowNokForm(false); setNokReason(''); }}
                    className="rounded-md border px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">Cancel</button>
                </div>
              </div>
            )}

            {printDecision && (
              <div className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center justify-between ${
                printDecision.decision === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <span>{printDecision.decision === 'ok' ? '✓ Marked: Print Suitable' : `✕ Not Suitable — ${printDecision.reason}`}</span>
                <button onClick={() => onSetPrintDecision(undefined as any, '')}
                  className="text-[10px] underline opacity-70 hover:opacity-100">Change</button>
              </div>
            )}
          </div>
        )}

        {/* PrintApproved / InDesign: Upload + Submit */}
        {(dr.status === DesignRequestStatus.PrintApproved || dr.status === DesignRequestStatus.InDesign) && (
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              {isUploading ? 'Uploading...' : 'Upload Design'}
              <input type="file" className="hidden" onChange={onUpload} disabled={isUploading} accept=".pdf,.jpg,.jpeg,.png,.psd,.ai,.tiff,.tif" />
            </label>
            {canSubmitForApproval && (
              <button onClick={onSubmitForApproval}
                className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700">
                Send to Customer
              </button>
            )}
          </div>
        )}

        {/* WaitingApproval: Manual approve/reject */}
        {dr.status === DesignRequestStatus.WaitingApproval && (
          <div className="flex items-center gap-2">
            <button onClick={onApprove} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700">Approve</button>
            <button onClick={onReject} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Reject</button>
          </div>
        )}

        {/* Portal link */}
        {dr.approvalToken && (
          <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 flex items-center justify-between">
            <div className="text-[10px] text-gray-500 truncate">
              <span className="font-medium">Portal:</span> <code className="text-blue-600">/portal/design/{dr.approvalToken}</code>
            </div>
            {dr.tokenExpiresAt && (
              <span className="text-[10px] text-gray-400 shrink-0 ml-2">exp {new Date(dr.tokenExpiresAt).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
