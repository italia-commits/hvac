import api from '../lib/api';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive' | 'at-risk';
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name?: string;
  name: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  install_date: string;
  status: 'good' | 'aging' | 'end-of-life';
  age_years: number;
  next_service_date?: string;
  created_at: string;
}

export interface MaintenanceAgreement {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name?: string;
  type: string;
  description?: string;
  start_date: string;
  end_date: string;
  value: number;
  status: 'active' | 'expiring' | 'expired' | 'cancelled';
  auto_renew: boolean;
  renewal_probability: number;
  churn_risk_score: number;
  created_at: string;
}

export interface ServiceCall {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name?: string;
  type: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  technician_id?: string;
  technician_name?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  cost?: number;
  created_at: string;
}

export interface ReplacementOpportunity {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name?: string;
  equipment_id: string;
  equipment_name?: string;
  equipment_age: number;
  probability: number;
  estimated_value: number;
  reason: string;
  source: string;
  status: 'new' | 'contacted' | 'quoted' | 'closed-won' | 'closed-lost';
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name?: string;
  invoice_number: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date?: string;
  line_items?: any[];
  created_at: string;
}

// Dashboard stats
export interface DashboardStats {
  active_agreements: number;
  renewal_rate: number;
  at_risk_accounts: number;
  monthly_recurring: number;
}

// Generic fetching hook
export function createApiService<T>(basePath: string) {
  return {
    list: (params?: Record<string, any>) =>
      api.get<PaginatedResponse<T>>(basePath, { params }).then(r => r.data),
    getById: (id: string) =>
      api.get<T>(`${basePath}/${id}`).then(r => r.data),
    create: (data: Partial<T>) =>
      api.post<T>(basePath, data).then(r => r.data),
    update: (id: string, data: Partial<T>) =>
      api.put<T>(`${basePath}/${id}`, data).then(r => r.data),
    delete: (id: string) =>
      api.delete(`${basePath}/${id}`).then(r => r.data),
  };
}

export const customersApi = createApiService<Customer>('/api/customers');
export const equipmentApi = createApiService<Equipment>('/api/equipment');
export const agreementsApi = createApiService<MaintenanceAgreement>('/api/agreements');
export const serviceCallsApi = createApiService<ServiceCall>('/api/service-calls');
export const opportunitiesApi = createApiService<ReplacementOpportunity>('/api/opportunities');
export const invoicesApi = createApiService<Invoice>('/api/invoices');