import { OrderStatus, DesignRequestStatus, DesignRequestType } from '../types/order';
import { EmailStatus } from '../types/emailLog';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.Draft]: 'Draft',
  [OrderStatus.WaitingDesign]: 'Waiting Design',
  [OrderStatus.InDesign]: 'In Design',
  [OrderStatus.WaitingApproval]: 'Waiting Approval',
  [OrderStatus.Approved]: 'Approved',
  [OrderStatus.Rejected]: 'Rejected',
  [OrderStatus.InProduction]: 'In Production',
  [OrderStatus.Shipped]: 'Shipped',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.Draft]: 'bg-gray-100 text-gray-700',
  [OrderStatus.WaitingDesign]: 'bg-yellow-100 text-yellow-700',
  [OrderStatus.InDesign]: 'bg-blue-100 text-blue-700',
  [OrderStatus.WaitingApproval]: 'bg-orange-100 text-orange-700',
  [OrderStatus.Approved]: 'bg-green-100 text-green-700',
  [OrderStatus.Rejected]: 'bg-red-100 text-red-700',
  [OrderStatus.InProduction]: 'bg-purple-100 text-purple-700',
  [OrderStatus.Shipped]: 'bg-emerald-100 text-emerald-700',
};

export const DESIGN_REQUEST_STATUS_LABELS: Record<DesignRequestStatus, string> = {
  [DesignRequestStatus.WaitingUpload]: 'Waiting Upload',
  [DesignRequestStatus.CustomerUploaded]: 'Under Review',
  [DesignRequestStatus.PrintRejected]: 'Print Rejected',
  [DesignRequestStatus.PrintApproved]: 'Print Approved',
  [DesignRequestStatus.InDesign]: 'In Design',
  [DesignRequestStatus.WaitingApproval]: 'Waiting Approval',
  [DesignRequestStatus.Approved]: 'Approved',
  [DesignRequestStatus.Rejected]: 'Rejected',
};

export const DESIGN_REQUEST_STATUS_COLORS: Record<DesignRequestStatus, string> = {
  [DesignRequestStatus.WaitingUpload]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [DesignRequestStatus.CustomerUploaded]: 'bg-orange-100 text-orange-700 border-orange-200',
  [DesignRequestStatus.PrintRejected]: 'bg-red-100 text-red-700 border-red-200',
  [DesignRequestStatus.PrintApproved]: 'bg-teal-100 text-teal-700 border-teal-200',
  [DesignRequestStatus.InDesign]: 'bg-blue-100 text-blue-700 border-blue-200',
  [DesignRequestStatus.WaitingApproval]: 'bg-purple-100 text-purple-700 border-purple-200',
  [DesignRequestStatus.Approved]: 'bg-green-100 text-green-700 border-green-200',
  [DesignRequestStatus.Rejected]: 'bg-red-100 text-red-700 border-red-200',
};

export const DESIGN_TYPE_LABELS: Record<DesignRequestType, string> = {
  [DesignRequestType.CustomerUpload]: 'Customer Upload',
  [DesignRequestType.RequestFromUs]: 'Request From Us',
  [DesignRequestType.Template]: 'Template',
};

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  [EmailStatus.Pending]: 'Pending',
  [EmailStatus.Sending]: 'Sending',
  [EmailStatus.Sent]: 'Sent',
  [EmailStatus.Failed]: 'Failed',
};

export const EMAIL_STATUS_COLORS: Record<EmailStatus, string> = {
  [EmailStatus.Pending]: 'bg-yellow-100 text-yellow-700',
  [EmailStatus.Sending]: 'bg-blue-100 text-blue-700',
  [EmailStatus.Sent]: 'bg-green-100 text-green-700',
  [EmailStatus.Failed]: 'bg-red-100 text-red-700',
};
