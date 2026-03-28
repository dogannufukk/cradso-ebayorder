import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import OrderListPage from './features/orders/OrderListPage';
import OrderDetailPage from './features/orders/OrderDetailPage';
import OrderCreatePage from './features/orders/OrderCreatePage';
import CustomerListPage from './features/customers/CustomerListPage';
import CustomerDetailPage from './features/customers/CustomerDetailPage';
// DesignManagementPage is now merged into OrderDetailPage
import EmailLogListPage from './features/email-logs/EmailLogListPage';
import SettingsPage from './features/settings/SettingsPage';
import PortalLayout from './features/customer-portal/PortalLayout';
import PortalApprovalPage from './features/customer-portal/PortalApprovalPage';
import PortalOtpPage from './features/customer-portal/PortalOtpPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'orders', element: <OrderListPage /> },
      { path: 'orders/new', element: <OrderCreatePage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'orders/:orderId/designs', element: <Navigate to=".." relative="path" replace /> },
      { path: 'customers', element: <CustomerListPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'email-logs', element: <EmailLogListPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '/portal',
    element: <PortalLayout />,
    children: [
      { path: 'design/:token', element: <PortalApprovalPage /> },
      { path: 'verify/:token', element: <PortalOtpPage /> },
    ],
  },
]);
