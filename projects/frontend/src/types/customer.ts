export interface Customer {
  id: string;
  customerName: string | null;
  companyName: string | null;
  email: string;
  mobilePhone: string | null;
  phone: string | null;
  city: string | null;
  postCode: string | null;
  country: string | null;
  createdDate: string;
}

export interface CustomerDetail {
  id: string;
  customerName: string | null;
  companyName: string | null;
  email: string;
  mobilePhone: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postCode: string | null;
  country: string | null;
  createdDate: string;
  orderCount: number;
}

export interface CreateCustomerRequest {
  customerName?: string;
  companyName?: string;
  email: string;
  mobilePhone?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postCode?: string;
  country?: string;
}

export interface UpdateCustomerRequest {
  customerName?: string | null;
  companyName?: string | null;
  email: string;
  mobilePhone?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  county?: string | null;
  postCode?: string | null;
  country?: string | null;
}
