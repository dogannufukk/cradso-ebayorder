import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ordersApi } from '../../api/endpoints/orders';
import { customersApi } from '../../api/endpoints/customers';
import { DesignRequestType } from '../../types/order';
import type { CreateOrderItemRequest } from '../../types/order';

interface OrderItemForm {
  sku: string;
  quantity: number;
  description: string;
  designType: number;
}

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Step 1: Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: '', email: '', mobilePhone: '', phone: '',
    addressLine1: '', addressLine2: '', city: '', county: '', postCode: '', country: 'United Kingdom',
  });

  // Step 2: Order info
  const [ebayOrderNo, setEbayOrderNo] = useState('');
  const [notes, setNotes] = useState('');

  // Step 3: Items
  const [items, setItems] = useState<OrderItemForm[]>([
    { sku: '', quantity: 1, description: '', designType: DesignRequestType.CustomerUpload },
  ]);

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    setSelectedCustomerId('');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const { data: customers } = useQuery({
    queryKey: ['customers-search', debouncedSearch],
    queryFn: () => customersApi.getAll({ page: 1, pageSize: 10, search: debouncedSearch || undefined }).then(r => r.data),
    enabled: debouncedSearch.length > 1,
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: typeof newCustomer) => customersApi.create(data).then(r => r.data),
  });

  const createOrderMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (res) => navigate(`/orders/${res.data}`),
    onError: (err: any) => setError(err.response?.data?.errors?.[0] || 'Failed to create order'),
  });

  const addItem = () => {
    setItems([...items, { sku: '', quantity: 1, description: '', designType: DesignRequestType.CustomerUpload }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItemForm, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleNextStep = async () => {
    setError('');
    if (step === 1) {
      if (!selectedCustomerId && !showNewCustomer) {
        setError('Please select or create a customer.');
        return;
      }
      if (showNewCustomer) {
        if (!newCustomer.customerName || !newCustomer.email) {
          setError('Customer name and email are required.');
          return;
        }
        try {
          const id = await createCustomerMutation.mutateAsync(newCustomer);
          setSelectedCustomerId(id);
          setShowNewCustomer(false);
        } catch (err: any) {
          setError(err.response?.data?.errors?.[0] || 'Failed to create customer');
          return;
        }
      }
      setStep(2);
    } else if (step === 2) {
      if (!ebayOrderNo.trim()) {
        setError('eBay order number is required.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = () => {
    setError('');
    const validItems = items.filter(i => i.sku.trim());
    if (validItems.length === 0) {
      setError('At least one item with a SKU is required.');
      return;
    }

    const orderItems: CreateOrderItemRequest[] = validItems.map(i => ({
      sku: i.sku,
      quantity: i.quantity,
      description: i.description || undefined,
      designType: i.designType as any,
    }));

    createOrderMutation.mutate({
      ebayOrderNo,
      customerId: selectedCustomerId,
      notes: notes || undefined,
      items: orderItems,
    });
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Order</h1>

      {/* Steps indicator */}
      <div className="flex items-center mb-8 gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {s}
            </div>
            <span className={`text-sm ${step >= s ? 'text-gray-900' : 'text-gray-400'}`}>
              {s === 1 ? 'Customer' : s === 2 ? 'Order Info' : 'Items'}
            </span>
            {s < 3 && <div className="w-12 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Step 1: Customer */}
      {step === 1 && (
        <div className="space-y-4">
          {!showNewCustomer ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Customer</label>
                <input
                  type="text"
                  placeholder="Type name or email to search..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={customerSearch}
                  onChange={e => handleCustomerSearch(e.target.value)}
                />
              </div>

              {customers && customers.items.length > 0 && !selectedCustomerId && (
                <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                  {customers.items.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.customerName); }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center gap-2"
                    >
                      <span className="font-medium">{c.customerName}</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-500 text-xs">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedCustomerId && (
                <div className="text-sm text-green-600 font-medium">Customer selected</div>
              )}

              <button
                onClick={() => setShowNewCustomer(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                + Create new customer
              </button>
            </>
          ) : (
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium text-gray-900">New Customer</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.customerName}
                    onChange={e => setNewCustomer({...newCustomer, customerName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                  <input type="email" className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.email}
                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Phone</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.mobilePhone}
                    onChange={e => setNewCustomer({...newCustomer, mobilePhone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Address Line 1</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.addressLine1}
                    onChange={e => setNewCustomer({...newCustomer, addressLine1: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Address Line 2</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.addressLine2}
                    onChange={e => setNewCustomer({...newCustomer, addressLine2: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.city}
                    onChange={e => setNewCustomer({...newCustomer, city: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">County</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.county}
                    onChange={e => setNewCustomer({...newCustomer, county: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">PostCode</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.postCode}
                    onChange={e => setNewCustomer({...newCustomer, postCode: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={newCustomer.country}
                    onChange={e => setNewCustomer({...newCustomer, country: e.target.value})} />
                </div>
              </div>
              <button
                onClick={() => setShowNewCustomer(false)}
                className="text-sm text-gray-500 hover:underline"
              >
                Cancel - Search existing
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Order Info */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">eBay Order Number *</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={ebayOrderNo}
              onChange={e => setEbayOrderNo(e.target.value)}
              placeholder="e.g. 12-34567-89012"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes about this order..."
            />
          </div>
        </div>
      )}

      {/* Step 3: Items */}
      {step === 3 && (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Item #{index + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(index)} className="text-xs text-red-500 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">SKU *</label>
                  <input className="w-full rounded border px-3 py-2 text-sm" value={item.sku}
                    onChange={e => updateItem(index, 'sku', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quantity *</label>
                  <input type="number" min={1} className="w-full rounded border px-3 py-2 text-sm"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Design Type</label>
                  <input className="w-full rounded border px-3 py-2 text-sm bg-gray-50" value="Customer Upload" disabled />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input className="w-full rounded border px-3 py-2 text-sm" value={item.description}
                  onChange={e => updateItem(index, 'description', e.target.value)}
                  placeholder="Optional description..." />
              </div>
            </div>
          ))}

          <button onClick={addItem} className="text-sm text-blue-600 hover:underline">
            + Add another item
          </button>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/orders')}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {step > 1 ? 'Back' : 'Cancel'}
        </button>

        {step < 3 ? (
          <button
            onClick={handleNextStep}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createOrderMutation.isPending}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
          </button>
        )}
      </div>
    </div>
  );
}
