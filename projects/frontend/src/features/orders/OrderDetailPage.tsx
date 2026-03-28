import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/endpoints/orders';
import { designsApi } from '../../api/endpoints/designs';
import type { DesignRequestDto, DesignFileDto } from '../../api/endpoints/designs';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { OrderStatus, DesignRequestStatus } from '../../types/order';
import type { OrderDetail } from '../../types/order';
import {
  DESIGN_TYPE_LABELS,
  DESIGN_REQUEST_STATUS_LABELS,
  DESIGN_REQUEST_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '../../utils/constants';
import { useState } from 'react';

const NEXT_STATUS_MAP: Partial<Record<number, { status: number; label: string; color: string }[]>> = {
  [OrderStatus.Draft]: [
    { status: OrderStatus.WaitingDesign, label: 'Submit Order', color: 'bg-blue-600 hover:bg-blue-700' },
  ],
  [OrderStatus.Approved]: [
    { status: OrderStatus.InProduction, label: 'Start Production', color: 'bg-purple-600 hover:bg-purple-700' },
  ],
  // InProduction → Shipped handled via shipping modal (requires tracking number)
};

interface EditItem {
  id?: string;
  sku: string;
  quantity: number;
  description: string;
}

type PrintDecision = 'ok' | 'nok';
interface PrintDecisions {
  [designRequestId: string]: { decision: PrintDecision; reason: string };
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editEbayOrderNo, setEditEbayOrderNo] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [printDecisions, setPrintDecisions] = useState<PrintDecisions>({});
  const [submittingPrint, setSubmittingPrint] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAll, setSubmittingAll] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: designs } = useQuery({
    queryKey: ['designs', id],
    queryFn: () => designsApi.getByOrder(id!).then((r) => r.data),
    enabled: !!id && order?.status !== OrderStatus.Draft,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: number) => ordersApi.updateStatus(id!, newStatus as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setError('');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Status update failed'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      ordersApi.update(id!, {
        ebayOrderNo: editEbayOrderNo,
        notes: editNotes || undefined,
        items: editItems.filter((i) => i.sku.trim()).map((i) => ({
          id: i.id,
          sku: i.sku,
          quantity: i.quantity,
          description: i.description || undefined,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setIsEditing(false);
      setError('');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => ordersApi.delete(id!),
    onSuccess: () => navigate('/orders'),
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Delete failed'),
  });

  // Design mutations
  const uploadMutation = useMutation({
    mutationFn: ({ designRequestId, file }: { designRequestId: string; file: File }) =>
      designsApi.uploadFile(designRequestId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', id] });
      setSuccess('File uploaded successfully.');
      setError('');
    },
    onError: (err: any) => { setError(err.response?.data?.errors?.[0] || 'Upload failed'); setSuccess(''); },
  });

  const submitMutation = useMutation({
    mutationFn: (designId: string) => designsApi.submitForApproval(designId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', id] });
      setSuccess('Submitted for customer approval.');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Submit failed'),
  });

  const approveMutation = useMutation({
    mutationFn: (designId: string) => designsApi.approve(designId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', id] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setSuccess('Design approved.');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Approve failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id: designId, reason }: { id: string; reason: string }) => designsApi.reject(designId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', id] });
      setRejectId(null);
      setRejectReason('');
      setSuccess('Design rejected.');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Reject failed'),
  });

  const deleteFileMutation = useMutation({
    mutationFn: ({ designRequestId, fileId }: { designRequestId: string; fileId: string }) =>
      designsApi.deleteFile(designRequestId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designs', id] });
      setSuccess('File deleted.');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Delete failed'),
  });

  // Print review logic
  const reviewableItems = designs?.filter((d) => d.status === DesignRequestStatus.CustomerUploaded) || [];
  const allReviewed = reviewableItems.length > 0 && reviewableItems.every((d) => printDecisions[d.id]);

  const setPrintDecision = (drId: string, decision: PrintDecision | undefined, reason = '') => {
    if (!decision) {
      setPrintDecisions((prev) => { const next = { ...prev }; delete next[drId]; return next; });
    } else {
      setPrintDecisions((prev) => ({ ...prev, [drId]: { decision, reason } }));
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
      queryClient.invalidateQueries({ queryKey: ['designs', id] });
      setSuccess('Print review completed for all items.');
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0] || 'Print review failed.');
    } finally {
      setSubmittingPrint(false);
    }
  };

  // Items that need admin design work (InDesign, PrintApproved, or Rejected by customer)
  const designWorkItems = designs?.filter(
    (d) => d.status === DesignRequestStatus.InDesign
      || d.status === DesignRequestStatus.PrintApproved
      || d.status === DesignRequestStatus.Rejected
  ) || [];
  // Which ones have admin design files ready
  const designWithFiles = designWorkItems.filter((d) =>
    d.status === DesignRequestStatus.InDesign && d.files.some((f) => f.isActive && f.uploadedBy === 1)
  );
  // Which ones still need design work
  const designNeedingWork = designWorkItems.filter((d) =>
    d.status === DesignRequestStatus.Rejected
    || d.status === DesignRequestStatus.PrintApproved
    || (d.status === DesignRequestStatus.InDesign && !d.files.some((f) => f.isActive && f.uploadedBy === 1))
  );
  // All design items must be InDesign with admin files to enable send
  const allDesignsReady = designWorkItems.length > 0 && designNeedingWork.length === 0;
  // Only InDesign items with files can be submitted
  const inDesignReadyItems = designs?.filter(
    (d) => d.status === DesignRequestStatus.InDesign && d.files.some((f) => f.isActive && f.uploadedBy === 1)
  ) || [];

  const handleSubmitAllToCustomer = async () => {
    if (inDesignReadyItems.length === 0 || submittingAll) return;
    setSubmittingAll(true);
    setError('');
    try {
      for (const dr of inDesignReadyItems) {
        await designsApi.submitForApproval(dr.id);
      }
      queryClient.invalidateQueries({ queryKey: ['designs', id] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setSuccess('All designs sent to customer for approval.');
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0] || 'Failed to submit designs.');
    } finally {
      setSubmittingAll(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!trackingNumber.trim() || shippingLoading || !id) return;
    setShippingLoading(true);
    try {
      await ordersApi.createShipment(id, trackingNumber.trim(), 0); // Tracked48
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setShowShipModal(false);
      setTrackingNumber('');
      setSuccess('Order marked as shipped!');
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0] || 'Failed to create shipment.');
    } finally {
      setShippingLoading(false);
    }
  };

  const handleFileUpload = (designRequestId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ designRequestId, file });
      e.target.value = '';
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this draft order?')) {
      deleteMutation.mutate();
    }
  };

  const startEditing = (order: OrderDetail) => {
    setEditEbayOrderNo(order.ebayOrderNo);
    setEditNotes(order.notes || '');
    setEditItems(
      order.items.map((i) => ({
        id: i.id,
        sku: i.sku,
        quantity: i.quantity,
        description: i.description || '',
      }))
    );
    setIsEditing(true);
    setError('');
  };

  const addEditItem = () => {
    setEditItems([...editItems, { sku: '', quantity: 1, description: '' }]);
  };

  const removeEditItem = (index: number) => {
    if (editItems.length <= 1) return;
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateEditItem = (index: number, field: keyof EditItem, value: string | number) => {
    const updated = [...editItems];
    (updated[index] as any)[field] = value;
    setEditItems(updated);
  };

  if (isLoading) return <LoadingSpinner />;
  if (!order) return <div className="text-gray-500">Order not found.</div>;

  const isDraft = order.status === OrderStatus.Draft;
  const nextActions = NEXT_STATUS_MAP[order.status] || [];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link to="/orders" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Orders
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          {isEditing ? (
            <input
              className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 bg-transparent outline-none"
              value={editEbayOrderNo}
              onChange={(e) => setEditEbayOrderNo(e.target.value)}
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.ebayOrderNo}</h1>
          )}
          <p className="text-sm text-gray-500">Created {new Date(order.createdDate).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {isDraft && !isEditing && (
            <>
              <button
                onClick={() => startEditing(order)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit Order
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
          {!isEditing &&
            nextActions.map((action) => (
              <button
                key={action.status}
                onClick={() => statusMutation.mutate(action.status)}
                disabled={statusMutation.isPending}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${action.color}`}
              >
                {statusMutation.isPending ? '...' : action.label}
              </button>
            ))}
          {!isEditing && order.status === OrderStatus.InProduction && (
            <button
              onClick={() => setShowShipModal(true)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
            >
              Ship Order
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{success}</div>
      )}

      {/* Notes */}
      {isEditing ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes..."
          />
        </div>
      ) : (
        order.notes && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
            <span className="font-medium">Notes:</span> {order.notes}
          </div>
        )
      )}

      {/* Customer Info */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Customer</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 font-medium">{order.customer.customerName}</p>
            <p className="text-sm text-gray-500">{order.customer.email}</p>
          </div>
          <Link to={`/customers/${order.customer.id}`} className="text-sm text-blue-600 hover:underline">
            View Customer
          </Link>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Order Progress</h2>
        <div className="flex items-center gap-1">
          {Object.entries(ORDER_STATUS_LABELS).map(([statusVal, label]) => {
            const val = Number(statusVal);
            const isCurrent = order.status === val;
            const isPast = order.status > val;
            return (
              <div key={val} className="flex items-center gap-1">
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isPast
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {label}
                </div>
                {val < 7 && <div className={`w-4 h-px ${isPast ? 'bg-green-400' : 'bg-gray-300'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Items - Draft mode only (editable) */}
      {isDraft && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Items ({isEditing ? editItems.length : order.items.length})
            </h2>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              {editItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">SKU</label>
                    <input
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      value={item.sku}
                      onChange={(e) => updateEditItem(index, 'sku', e.target.value)}
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      value={item.quantity}
                      onChange={(e) => updateEditItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      value={item.description}
                      onChange={(e) => updateEditItem(index, 'description', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  {editItems.length > 1 && (
                    <button
                      onClick={() => removeEditItem(index)}
                      className="mt-5 text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addEditItem} className="text-sm text-blue-600 hover:underline">
                + Add item
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">SKU</th>
                  <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">Qty</th>
                  <th className="py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 text-sm font-medium">{item.sku}</td>
                    <td className="py-3 text-sm">{item.quantity}</td>
                    <td className="py-3 text-sm text-gray-500">{item.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Design Management - only show when order is NOT Draft */}
      {!isDraft && designs && designs.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Design Management</h2>

          {/* Print review banner */}
          {reviewableItems.length > 0 && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 flex items-center gap-3 mb-4">
              <span className="text-xl">&#128203;</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">Print Suitability Review</p>
                <p className="text-xs text-orange-600 mt-0.5">{reviewableItems.length} item(s) need review. Mark each as suitable or not, then submit all decisions.</p>
              </div>
            </div>
          )}

          {/* All reviewed success banner */}
          {reviewableItems.length === 0 && designs.some(d => d.status === DesignRequestStatus.PrintApproved) && designs.every(d => d.status !== DesignRequestStatus.CustomerUploaded) && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3 mb-4">
              <span className="text-xl">&#9989;</span>
              <div>
                <p className="text-sm font-semibold text-green-800">Print review completed for all items.</p>
                <p className="text-xs text-green-600 mt-0.5">Upload your designs and send to customer for approval.</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {designs.map((dr) => (
              <DesignRequestCard
                key={dr.id}
                dr={dr}
                printDecision={printDecisions[dr.id]}
                onSetPrintDecision={(decision, reason) => setPrintDecision(dr.id, decision, reason)}
                onUpload={(e) => handleFileUpload(dr.id, e)}
                onDeleteFile={(fileId) => deleteFileMutation.mutate({ designRequestId: dr.id, fileId })}
                onApprove={() => approveMutation.mutate(dr.id)}
                onReject={() => setRejectId(dr.id)}
                isUploading={uploadMutation.isPending}
              />
            ))}
          </div>

          {/* Submit all print decisions button */}
          {reviewableItems.length > 0 && (
            <div className="mt-6 rounded-lg bg-white border border-gray-200 p-4">
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
          {designWorkItems.length > 0 && (
            <div className={`mt-6 rounded-lg border p-4 ${allDesignsReady ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">Send Designs to Customer</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {designWithFiles.length}/{designWorkItems.length} item(s) have design files ready.
                </p>
              </div>
              {!allDesignsReady && (
                <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 space-y-1">
                  {designNeedingWork.filter(d => d.status === DesignRequestStatus.Rejected).length > 0 && (
                    <p className="text-xs text-red-600">
                      ✕ <span className="font-medium">Rejected by customer:</span>{' '}
                      {designNeedingWork.filter(d => d.status === DesignRequestStatus.Rejected).map(d => d.itemSKU).join(', ')}
                      <span className="text-gray-500"> — upload revised design files</span>
                    </p>
                  )}
                  {designNeedingWork.filter(d => d.status === DesignRequestStatus.InDesign && !d.files.some(f => f.isActive && f.uploadedBy === 1)).length > 0 && (
                    <p className="text-xs text-amber-700">
                      ⚠ <span className="font-medium">Needs design:</span>{' '}
                      {designNeedingWork.filter(d => d.status === DesignRequestStatus.InDesign).map(d => d.itemSKU).join(', ')}
                    </p>
                  )}
                  {designNeedingWork.filter(d => d.status === DesignRequestStatus.PrintApproved).length > 0 && (
                    <p className="text-xs text-teal-700">
                      ⏳ <span className="font-medium">Awaiting design:</span>{' '}
                      {designNeedingWork.filter(d => d.status === DesignRequestStatus.PrintApproved).map(d => d.itemSKU).join(', ')}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={handleSubmitAllToCustomer}
                disabled={!allDesignsReady || submittingAll}
                className="w-full rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submittingAll ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  `Send All to Customer (${designWorkItems.length} items)`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Shipment */}
      {order.shipment && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-emerald-600">📦</span> Shipment
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Tracking Number</dt>
              <dd className="mt-1 text-sm font-bold text-gray-900">{order.shipment.trackingNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Carrier</dt>
              <dd className="mt-1 text-sm">{order.shipment.carrier}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Ship Date</dt>
              <dd className="mt-1 text-sm">{new Date(order.shipment.shipmentDate).toLocaleDateString()}</dd>
            </div>
          </div>
          <a
            href={`http://www.royalmail.com/portal/rm/track?trackNumber=${order.shipment.trackingNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            Track on Royal Mail
          </a>
        </div>
      )}

      {/* Ship Order Modal */}
      {showShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowShipModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-lg">📦</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Ship Order</h3>
                <p className="text-xs text-gray-500">Enter the Royal Mail tracking number</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Tracking Number</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                placeholder="e.g. RM123456789GB"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowShipModal(false); setTrackingNumber(''); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleCreateShipment}
                disabled={!trackingNumber.trim() || shippingLoading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {shippingLoading ? 'Shipping...' : 'Confirm & Ship'}
              </button>
            </div>
          </div>
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
  onDeleteFile,
  onApprove,
  onReject,
  isUploading,
}: {
  dr: DesignRequestDto;
  printDecision?: { decision: PrintDecision; reason: string };
  onSetPrintDecision: (decision: PrintDecision | undefined, reason: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteFile: (fileId: string) => void;
  onApprove: () => void;
  onReject: () => void;
  isUploading: boolean;
}) {
  const [nokReason, setNokReason] = useState('');
  const [showNokForm, setShowNokForm] = useState(false);

  // Separate customer files and admin design files
  const customerFiles = dr.files.filter(f => f.uploadedBy === 0);
  const adminFiles = dr.files.filter(f => f.uploadedBy === 1);
  const customerVersions = [...new Set(customerFiles.map(f => f.version))].sort((a, b) => b - a);
  const adminVersions = [...new Set(adminFiles.map(f => f.version))].sort((a, b) => b - a);

  const statusConfig: Record<number, { bg: string; border: string; icon: string; text: string }> = {
    [DesignRequestStatus.WaitingUpload]: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '\u23F3', text: 'Waiting for customer upload' },
    [DesignRequestStatus.CustomerUploaded]: { bg: 'bg-orange-50', border: 'border-orange-200', icon: '\uD83D\uDCCB', text: 'Review print suitability' },
    [DesignRequestStatus.PrintRejected]: { bg: 'bg-red-50', border: 'border-red-200', icon: '\u274C', text: 'Rejected \u2014 waiting for re-upload' },
    [DesignRequestStatus.PrintApproved]: { bg: 'bg-teal-50', border: 'border-teal-200', icon: '\u2705', text: 'Print approved \u2014 upload design' },
    [DesignRequestStatus.InDesign]: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '\uD83C\uDFA8', text: 'Design in progress' },
    [DesignRequestStatus.WaitingApproval]: { bg: 'bg-purple-50', border: 'border-purple-200', icon: '\uD83D\uDC41', text: 'Waiting for customer approval' },
    [DesignRequestStatus.Approved]: { bg: 'bg-green-50', border: 'border-green-200', icon: '\u2713', text: 'Approved \u2014 ready for production' },
    [DesignRequestStatus.Rejected]: { bg: 'bg-red-50', border: 'border-red-200', icon: '\u21A9', text: 'Customer requested changes' },
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

        {/* Customer uploaded files */}
        {customerFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              Customer Files ({customerFiles.length})
            </p>
            {customerVersions.map((ver) => {
              const vFiles = customerFiles.filter(f => f.version === ver);
              const isActive = vFiles.some(f => f.isActive);
              const rejFile = vFiles.find(f => f.rejectionReason);
              return (
                <details key={`c${ver}`} open={isActive} className={`rounded-lg border ${isActive ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100 bg-gray-50/50'} overflow-hidden group`}>
                  <summary className={`flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-gray-50 ${isActive ? 'bg-orange-100/50 hover:bg-orange-100/70' : 'bg-gray-100/50'}`}>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-gray-400 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-orange-500 text-white' : 'bg-gray-300 text-white'}`}>v{ver}</span>
                      <span className="text-[10px] text-gray-500">{vFiles.length} file(s)</span>
                      {isActive && <span className="text-[10px] text-orange-600 font-semibold">Current</span>}
                      {rejFile?.rejectionReason && !isActive && <span className="text-[10px] text-red-500 font-medium">Rejected</span>}
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(vFiles[0].createdDate).toLocaleDateString()}</span>
                  </summary>
                  <FileVersionContent files={vFiles} />
                  {rejFile?.rejectionReason && (
                    <div className="px-3 py-2 bg-red-50 border-t border-red-100">
                      <p className="text-[10px] text-red-600"><span className="font-semibold">Rejected:</span> {rejFile.rejectionReason}</p>
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        )}

        {/* Admin design files */}
        {adminFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Design Files ({adminFiles.length})
            </p>
            {adminVersions.map((ver) => {
              const vFiles = adminFiles.filter(f => f.version === ver);
              const isActive = vFiles.some(f => f.isActive);
              return (
                <details key={`a${ver}`} open={isActive} className={`rounded-lg border ${isActive ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-gray-50/50'} overflow-hidden group`}>
                  <summary className={`flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-gray-50 ${isActive ? 'bg-blue-100/50 hover:bg-blue-100/70' : 'bg-gray-100/50'}`}>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-gray-400 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'}`}>v{ver}</span>
                      <span className="text-[10px] text-gray-500">{vFiles.length} file(s)</span>
                      {isActive && <span className="text-[10px] text-blue-600 font-semibold">Current</span>}
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(vFiles[0].createdDate).toLocaleDateString()}</span>
                  </summary>
                  <FileVersionContent
                    files={vFiles}
                    onDelete={(dr.status === DesignRequestStatus.InDesign || dr.status === DesignRequestStatus.PrintApproved)
                      ? (fileId) => onDeleteFile(fileId)
                      : undefined}
                  />
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
                  Print Suitable
                </button>
                <button onClick={() => setShowNokForm(true)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
                  Not Suitable
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
                <span>{printDecision.decision === 'ok' ? 'Marked: Print Suitable' : `Not Suitable \u2014 ${printDecision.reason}`}</span>
                <button onClick={() => onSetPrintDecision(undefined as any, '')}
                  className="text-[10px] underline opacity-70 hover:opacity-100">Change</button>
              </div>
            )}
          </div>
        )}

        {/* PrintApproved / InDesign: Upload only (no per-item submit) */}
        {(dr.status === DesignRequestStatus.PrintApproved || dr.status === DesignRequestStatus.InDesign) && (
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              {isUploading ? 'Uploading...' : 'Upload Design'}
              <input type="file" className="hidden" onChange={onUpload} disabled={isUploading} accept=".pdf,.jpg,.jpeg,.png,.psd,.ai,.tiff,.tif" />
            </label>
          </div>
        )}

        {/* WaitingApproval: customer decides, admin just waits */}

        {/* Rejected by customer: admin can revise and re-upload */}
        {dr.status === DesignRequestStatus.Rejected && (
          <div className="space-y-3">
            <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 w-fit">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              {isUploading ? 'Uploading...' : 'Upload Revised Design'}
              <input type="file" className="hidden" onChange={onUpload} disabled={isUploading} accept=".pdf,.jpg,.jpeg,.png,.psd,.ai,.tiff,.tif" />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function FileVersionContent({ files, onDelete }: { files: DesignFileDto[]; onDelete?: (fileId: string) => void }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmFile = confirmDeleteId ? files.find(f => f.id === confirmDeleteId) : null;

  return (
    <>
      <div className="divide-y divide-gray-100 border-t border-gray-100">
        {files.map((f) => {
          const fileUrl = f.fileUrl.startsWith('/') ? f.fileUrl : `/files/${f.fileUrl}`;
          const isImage = ['jpg', 'jpeg', 'png'].includes(f.fileType.toLowerCase());
          return (
            <div key={f.id} className="flex items-center gap-2 px-3 py-2 group">
              <span className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${f.uploadedBy === 0 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {f.fileType.toUpperCase().slice(0, 3)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">{f.fileName}</p>
                <p className="text-[10px] text-gray-400">
                  {(f.fileSizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isImage && (
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-blue-600 px-1">view</a>
                )}
                <a href={fileUrl} download={f.fileName} target="_blank" rel="noopener noreferrer" className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50">&darr;</a>
                {onDelete && (
                  <button
                    onClick={() => setConfirmDeleteId(f.id)}
                    className="rounded border border-red-200 bg-white p-1 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete file"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && confirmFile && onDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmDeleteId(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Delete File</h3>
                <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 mb-4">
              <p className="text-xs font-medium text-gray-700 truncate">{confirmFile.fileName}</p>
              <p className="text-[10px] text-gray-400">{(confirmFile.fileSizeBytes / 1024).toFixed(1)} KB · {confirmFile.fileType.toUpperCase()}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
