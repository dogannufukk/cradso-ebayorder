import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/endpoints/dashboard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { OrderStatus } from '../../types/order';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../utils/constants';

const statCards = [
  { key: 'totalOrders', label: 'Total Orders', borderColor: 'border-slate-400', statusFilter: '' },
  { key: 'draftOrders', label: 'Draft', borderColor: 'border-gray-400', statusFilter: '0' },
  { key: 'waitingDesignOrders', label: 'Waiting Design', borderColor: 'border-yellow-400', statusFilter: '1' },
  { key: 'inDesignOrders', label: 'In Design', borderColor: 'border-blue-400', statusFilter: '2' },
  { key: 'waitingApprovalOrders', label: 'Waiting Approval', borderColor: 'border-orange-400', statusFilter: '3' },
  { key: 'approvedOrders', label: 'Approved', borderColor: 'border-green-400', statusFilter: '4' },
  { key: 'inProductionOrders', label: 'In Production', borderColor: 'border-purple-400', statusFilter: '6' },
  { key: 'shippedOrders', label: 'Shipped', borderColor: 'border-emerald-400', statusFilter: '7' },
  { key: 'rejectedOrders', label: 'Rejected', borderColor: 'border-red-400', statusFilter: '5' },
] as const;

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary().then((r) => r.data),
  });

  if (isLoading) return <LoadingSpinner />;

  if (!data) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Order Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.key}
            to={card.statusFilter ? `/orders?status=${card.statusFilter}` : '/orders'}
            className={`rounded-lg border-l-4 ${card.borderColor} bg-white p-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-150 cursor-pointer`}
          >
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {data[card.key]}
            </p>
          </Link>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Customers</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{data.totalCustomers}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Design Requests</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{data.totalDesignRequests}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Pending Design Requests</p>
          <p className="mt-1 text-3xl font-semibold text-amber-600">{data.pendingDesignRequests}</p>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">eBay Order No</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.recentOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/orders/${order.id}`} className="font-medium text-blue-600 hover:underline">
                    {order.ebayOrderNo}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.customerName}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ORDER_STATUS_COLORS[order.status as OrderStatus] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(order.createdDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {data.recentOrders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
