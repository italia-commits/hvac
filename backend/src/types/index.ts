// ============================================================
// HVAC RenewIQ — Shared TypeScript Types & Interfaces
// ============================================================

// --- Enums ---
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin',
  MANAGER = 'manager',
  TECHNICIAN = 'technician',
  DISPATCHER = 'dispatcher',
}

export enum AgreementStatus {
  ACTIVE = 'active',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  RENEWED = 'renewed',
}

export enum ServiceCallStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum OpportunityStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUOTED = 'quoted',
  CONVERTED = 'converted',
  LOST = 'lost',
}

export enum PlanTier {
  STARTER = 'starter',
  GROWTH = 'growth',
  PRO = 'pro',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
}

// --- Entity Interfaces ---

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan_tier: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  is_active: boolean;
  max_users: number;
  max_agreements: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  password_hash: string | null;
  first_name: string;
  last_name: string;
  role: UserRole;
  google_id: string | null;
  is_email_verified: boolean;
  is_two_factor_enabled: boolean;
  two_factor_secret: string | null;
  refresh_token: string | null;
  last_login_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  company_id: string;
  customer_id: string;
  type: string; // furnace, ac, heat_pump, boiler, thermostat, etc.
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  installation_date: string | null;
  warranty_expiration: string | null;
  last_service_date: string | null;
  age_years: number | null;
  condition_score: number | null; // 1-10
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceAgreement {
  id: string;
  company_id: string;
  customer_id: string;
  equipment_ids: string[]; // JSON array of equipment IDs
  agreement_number: string;
  start_date: string;
  end_date: string;
  renewal_date: string | null;
  status: AgreementStatus;
  plan_name: string; // e.g., "Bronze", "Silver", "Gold"
  price: number;
  auto_renew: boolean;
  churn_risk_score: number | null; // 0-100
  renewal_probability: number | null; // 0-100
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCall {
  id: string;
  company_id: string;
  customer_id: string;
  equipment_id: string | null;
  agreement_id: string | null;
  technician_id: string | null; // references user id
  title: string;
  description: string | null;
  status: ServiceCallStatus;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  scheduled_date: string | null;
  completed_date: string | null;
  labor_hours: number | null;
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReplacementOpportunity {
  id: string;
  company_id: string;
  customer_id: string;
  equipment_id: string;
  agreement_id: string | null;
  title: string;
  description: string | null;
  status: OpportunityStatus;
  estimated_value: number | null;
  probability_score: number | null; // 0-100
  priority_score: number | null; // 0-100 computed
  recommended_action: string | null;
  source: 'age_based' | 'condition_based' | 'service_history' | 'ai_detected' | 'manual';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  agreement_id: string | null;
  service_call_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  due_date: string;
  paid_date: string | null;
  notes: string | null;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ActivityLog {
  id: string;
  company_id: string;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// --- API Types ---

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TokenPayload {
  userId: string;
  companyId: string;
  role: UserRole;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Express request augmentation
// We use a separate `auth` property for JWT-authenticated requests
// to avoid conflicting with Passport's req.user type.
declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
      companyId?: string;
    }
  }
}