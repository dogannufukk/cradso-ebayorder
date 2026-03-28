import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '../../api/endpoints/customers';
import DataGrid, { type ColumnDef } from '../../components/ui/DataGrid';
import { useDataGridParams, toQueryParams } from '../../hooks/useDataGridParams';
import type { Customer, CreateCustomerRequest } from '../../types/customer';

const emptyForm: CreateCustomerRequest = {
  customerName: '', companyName: '', email: '',
  addressLine1: '', addressLine2: '', city: '', county: '', postCode: '', country: 'United Kingdom',
  phone: '', mobilePhone: '',
};

export default function CustomerListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useDataGridParams();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateCustomerRequest>({ ...emptyForm });
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.getAll(toQueryParams(params)).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteId(null);
      setDeleteError('');
    },
    onError: (err: any) => setDeleteError(err.response?.data?.errors?.[0] || err.response?.data?.detail || 'Cannot delete this customer.'),
  });

  const createMutation = useMutation({
    mutationFn: () => customersApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowModal(false);
      setForm({ ...emptyForm });
      setError('');
    },
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Failed to create customer'),
  });

  const columns: ColumnDef<Customer>[] = [
    {
      key: 'customerName',
      header: 'Name',
      sortable: true,
      filterable: true,
      render: (row) => (
        <span className="font-medium text-blue-600 hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/customers/${row.id}`); }}>
          {row.customerName}
        </span>
      ),
    },
    { key: 'companyName', header: 'Company', sortable: true, filterable: true, render: (row) => row.companyName || '-' },
    { key: 'email', header: 'Email', sortable: true, filterable: true },
    { key: 'mobilePhone', header: 'Phone', sortable: true, filterable: true, render: (row) => row.mobilePhone || '-' },
    { key: 'city', header: 'City', sortable: true, filterable: true, render: (row) => row.city || '-' },
    { key: 'postCode', header: 'PostCode', sortable: true, filterable: true, render: (row) => row.postCode || '-' },
    { key: 'country', header: 'Country', sortable: true, filterable: true, render: (row) => row.country || '-' },
    {
      key: 'createdDate',
      header: 'Date',
      sortable: true,
      render: (row) => new Date(row.createdDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); setDeleteError(''); }}
          className="text-red-400 hover:text-red-600"
          title="Delete customer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ),
    },
  ];

  const formFields = [
    ['customerName', 'Customer Name'],
    ['companyName', 'Company Name'],
    ['email', 'Email *'],
    ['addressLine1', 'Address Line 1 *'],
    ['addressLine2', 'Address Line 2'],
    ['city', 'Town / City *'],
    ['county', 'County'],
    ['postCode', 'Postcode *'],
    ['country', 'Country *'],
    ['phone', 'Landline'],
    ['mobilePhone', 'Mobile Number'],
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button
          onClick={() => { setShowModal(true); setError(''); }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Customer
        </button>
      </div>

      <DataGrid
        data={data}
        columns={columns}
        isLoading={isLoading}
        params={params}
        onParamsChange={setParams}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
      />

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Customer</h2>
            <p className="text-xs text-gray-500 mb-3">Customer Name or Company Name (at least one required). Email and address fields are mandatory.</p>
            {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              {formFields.map(([key, label]) => {
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
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    ) : (
                      <input
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                        value={form[key] ?? ''}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        autoFocus={key === 'customerName'}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowModal(false); setForm({ ...emptyForm }); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={
                  (!(form.customerName?.trim()) && !(form.companyName?.trim())) ||
                  !form.email?.trim() ||
                  !form.addressLine1?.trim() ||
                  !form.city?.trim() ||
                  !form.postCode?.trim() ||
                  createMutation.isPending
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteId(null)}>
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
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this customer?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
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
