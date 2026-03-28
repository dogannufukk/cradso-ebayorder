export const OrderStatus = {
  Draft: 0,
  WaitingDesign: 1,
  InDesign: 2,
  WaitingApproval: 3,
  Approved: 4,
  Rejected: 5,
  InProduction: 6,
  Shipped: 7,
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const DesignRequestType = {
  CustomerUpload: 0,
  RequestFromUs: 1,
  Template: 2,
} as const;
export type DesignRequestType = (typeof DesignRequestType)[keyof typeof DesignRequestType];

export const DesignRequestStatus = {
  WaitingUpload: 0,
  CustomerUploaded: 1,
  PrintRejected: 2,
  PrintApproved: 3,
  InDesign: 4,
  WaitingApproval: 5,
  Approved: 6,
  Rejected: 7,
} as const;
export type DesignRequestStatus = (typeof DesignRequestStatus)[keyof typeof DesignRequestStatus];

export const DeliveryType = {
  Tracked48: 0,
  NextDay: 1,
} as const;
export type DeliveryType = (typeof DeliveryType)[keyof typeof DeliveryType];

export interface OrderListItem {
  id: string;
  ebayOrderNo: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  itemCount: number;
  createdDate: string;
}

export interface OrderDetail {
  id: string;
  ebayOrderNo: string;
  status: OrderStatus;
  notes: string | null;
  createdDate: string;
  customer: CustomerSummary;
  items: OrderItem[];
  designRequests: DesignRequestSummary[];
  shipment: ShipmentSummary | null;
}

export interface CustomerSummary {
  id: string;
  customerName: string;
  email: string;
}

export interface OrderItem {
  id: string;
  sku: string;
  quantity: number;
  description: string | null;
}

export interface DesignRequestSummary {
  id: string;
  orderItemId: string;
  type: DesignRequestType;
  status: DesignRequestStatus;
  fileCount: number;
}

export interface ShipmentSummary {
  id: string;
  trackingNumber: string;
  carrier: string;
  deliveryType: DeliveryType;
  shipmentDate: string;
}

export interface CreateOrderRequest {
  ebayOrderNo: string;
  customerId: string;
  notes?: string;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  sku: string;
  quantity: number;
  description?: string;
  designType: DesignRequestType;
}
