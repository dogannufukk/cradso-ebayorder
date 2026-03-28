import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/endpoints/customers';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type { UpdateCustomerRequest } from '../../types/customer';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id!).then(r => r.data),
    enabled: !!id,
  });

  const [form, setForm] = useState<UpdateCustomerRequest>({
    customerName: '', companyName: '', email: '',
    addressLine1: '', addressLine2: '', city: '', county: '', postCode: '', country: '',
    phone: '', mobilePhone: '',
  });

  const startEditing = () => {
    if (!customer) return;
    setForm({
      customerName: customer.customerName,
      companyName: customer.companyName,
      email: customer.email,
      addressLine1: customer.addressLine1,
      addressLine2: customer.addressLine2,
      city: customer.city,
      county: customer.county,
      postCode: customer.postCode,
      country: customer.country,
      phone: customer.phone,
      mobilePhone: customer.mobilePhone,
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const deleteMutation = useMutation({
    mutationFn: () => customersApi.delete(id!),
    onSuccess: () => navigate('/customers'),
    onError: (err: any) => setDeleteError(err.response?.data?.errors?.[0] || err.response?.data?.detail || 'Cannot delete this customer.'),
  });

  const updateMutation = useMutation({
    mutationFn: () => customersApi.update(id!, form),
    onSuccess: () => {
      setIsEditing(false);
      setSuccess('Customer updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Failed to update customer'),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!customer) return <div className="text-gray-500">Customer not found.</div>;

  const fields = [
    { label: 'Customer Name', value: customer.customerName },
    { label: 'Company Name', value: customer.companyName },
    { label: 'Email', value: customer.email },
    { label: 'Address Line 1', value: customer.addressLine1 },
    { label: 'Address Line 2', value: customer.addressLine2 },
    { label: 'Town / City', value: customer.city },
    { label: 'County', value: customer.county },
    { label: 'Postcode', value: customer.postCode },
    { label: 'Country', value: customer.country },
    { label: 'Landline', value: customer.phone },
    { label: 'Mobile Number', value: customer.mobilePhone },
  ];

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/customers" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to Customers</Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.customerName}</h1>
          <p className="text-sm text-gray-500">{customer.orderCount} order(s) - Joined {new Date(customer.createdDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            <button onClick={startEditing}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Edit
            </button>
            {customer.orderCount === 0 && (
              <button onClick={() => { setShowDeleteModal(true); setDeleteError(''); }}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {success && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{success}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {!isEditing ? (
          <dl className="grid grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.label}>
                <dt className="text-xs font-medium uppercase text-gray-500">{f.label}</dt>
                <dd className="mt-1 text-sm text-gray-900">{f.value || '-'}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {([
                ['customerName', 'Customer Name'], ['companyName', 'Company Name'],
                ['email', 'Email *'],
                ['addressLine1', 'Address Line 1 *'], ['addressLine2', 'Address Line 2'],
                ['city', 'Town / City *'], ['county', 'County'],
                ['postCode', 'Postcode *'], ['country', 'Country *'],
                ['phone', 'Landline'], ['mobilePhone', 'Mobile Number'],
              ] as const).map(([key, label]) => {
                const isTextarea = key === 'addressLine1' || key === 'addressLine2';
                const isFullWidth = isTextarea;
                return (
                  <div key={key} className={isFullWidth ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                    {isTextarea ? (
                      <textarea
                        rows={2}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
                        value={form[key] ?? ''}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                      />
                    ) : (
                      <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        value={form[key] ?? ''}
                        onChange={e => setForm({ ...form, [key]: e.target.value })} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setIsEditing(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Delete Customer</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            {deleteError && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">{deleteError}</div>}
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete <strong>{customer.customerName || customer.companyName}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
