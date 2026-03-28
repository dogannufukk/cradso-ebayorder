import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/endpoints/orders';
import StatusBadge from '../../components/ui/StatusBadge';
import DataGrid, { type ColumnDef } from '../../components/ui/DataGrid';
import { useDataGridParams, toQueryParams } from '../../hooks/useDataGridParams';
import type { OrderListItem } from '../../types/order';
import { OrderStatus } from '../../types/order';
import { ORDER_STATUS_LABELS } from '../../utils/constants';

export default function OrderListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useDataGridParams();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.getAll(toQueryParams(params)).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this draft order?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns: ColumnDef<OrderListItem>[] = [
    {
      key: 'ebayOrderNo',
      header: 'eBay Order No',
      sortable: true,
      filterable: true,
      render: (row) => (
        <Link to={`/orders/${row.id}`} className="font-medium text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
          {row.ebayOrderNo}
        </Link>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      filterable: true,
    },
    {
      key: 'customerEmail',
      header: 'Email',
      sortable: true,
      filterable: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
        value: String(value),
        label,
      })),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'itemCount',
      header: 'Items',
    },
    {
      key: 'createdDate',
      header: 'Date',
      sortable: true,
      render: (row) => new Date(row.createdDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (row) =>
        row.status === OrderStatus.Draft ? (
          <button
            onClick={(e) => handleDelete(e, row.id)}
            disabled={deleteMutation.isPending}
            className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
          >
            Delete
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Link
          to="/orders/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Order
        </Link>
      </div>

      <DataGrid
        data={data}
        columns={columns}
        isLoading={isLoading}
        params={params}
        onParamsChange={setParams}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
      />
    </div>
  );
}
