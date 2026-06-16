-- ============================================================
-- HVAC RenewIQ — Initial Schema Migration
-- Multi-tenant SaaS platform for HVAC contractors
-- Version: 001 (2026-06-16)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'super_admin', 'company_admin', 'manager', 'technician', 'dispatcher'
);

CREATE TYPE agreement_status AS ENUM (
  'active', 'expiring_soon', 'expired', 'cancelled', 'renewed'
);

CREATE TYPE service_call_status AS ENUM (
  'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
);

CREATE TYPE invoice_status AS ENUM (
  'draft', 'sent', 'paid', 'overdue', 'cancelled'
);

CREATE TYPE opportunity_status AS ENUM (
  'new', 'contacted', 'quoted', 'converted', 'lost'
);

CREATE TYPE plan_tier AS ENUM (
  'starter', 'growth', 'pro'
);

CREATE TYPE audit_action AS ENUM (
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT'
);

CREATE TYPE priority_level AS ENUM (
  'low', 'medium', 'high', 'emergency'
);

CREATE TYPE opportunity_source AS ENUM (
  'age_based', 'condition_based', 'service_history', 'ai_detected', 'manual'
);

-- ============================================================
-- COMPANIES (Tenant root)
-- ============================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  plan_tier plan_tier NOT NULL DEFAULT 'starter',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  subscription_end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_users INTEGER NOT NULL DEFAULT 5,
  max_agreements INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_stripe_customer ON companies(stripe_customer_id);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'technician',
  google_id VARCHAR(255),
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMPTZ,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  is_two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret VARCHAR(255),
  refresh_token TEXT,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, email)
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google ON users(google_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(last_name, first_name);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================================
-- EQUIPMENT
-- ============================================================

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  installation_date DATE,
  warranty_expiration DATE,
  last_service_date DATE,
  age_years INTEGER GENERATED ALWAYS AS (
    CASE WHEN installation_date IS NOT NULL
      THEN EXTRACT(YEAR FROM age(installation_date))::INTEGER
      ELSE NULL
    END
  ) STORED,
  condition_score INTEGER CHECK (condition_score >= 1 AND condition_score <= 10),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equipment_company ON equipment(company_id);
CREATE INDEX idx_equipment_customer ON equipment(customer_id);
CREATE INDEX idx_equipment_type ON equipment(type);
CREATE INDEX idx_equipment_manufacturer ON equipment(manufacturer);

-- ============================================================
-- MAINTENANCE AGREEMENTS
-- ============================================================

CREATE TABLE maintenance_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  equipment_ids UUID[] DEFAULT '{}',
  agreement_number VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  status agreement_status NOT NULL DEFAULT 'active',
  plan_name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  churn_risk_score INTEGER CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
  renewal_probability INTEGER CHECK (renewal_probability >= 0 AND renewal_probability <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, agreement_number)
);

CREATE INDEX idx_agreements_company ON maintenance_agreements(company_id);
CREATE INDEX idx_agreements_customer ON maintenance_agreements(customer_id);
CREATE INDEX idx_agreements_status ON maintenance_agreements(status);
CREATE INDEX idx_agreements_end_date ON maintenance_agreements(end_date);
CREATE INDEX idx_agreements_renewal_date ON maintenance_agreements(renewal_date);

-- ============================================================
-- SERVICE CALLS
-- ============================================================

CREATE TABLE service_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id),
  agreement_id UUID REFERENCES maintenance_agreements(id),
  technician_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status service_call_status NOT NULL DEFAULT 'scheduled',
  priority priority_level NOT NULL DEFAULT 'medium',
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  labor_hours DECIMAL(8, 2),
  labor_cost DECIMAL(10, 2),
  parts_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_calls_company ON service_calls(company_id);
CREATE INDEX idx_service_calls_customer ON service_calls(customer_id);
CREATE INDEX idx_service_calls_technician ON service_calls(technician_id);
CREATE INDEX idx_service_calls_status ON service_calls(status);
CREATE INDEX idx_service_calls_scheduled ON service_calls(scheduled_date);
CREATE INDEX idx_service_calls_priority ON service_calls(priority);

-- ============================================================
-- REPLACEMENT OPPORTUNITIES
-- ============================================================

CREATE TABLE replacement_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  agreement_id UUID REFERENCES maintenance_agreements(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status opportunity_status NOT NULL DEFAULT 'new',
  estimated_value DECIMAL(10, 2),
  probability_score INTEGER CHECK (probability_score >= 0 AND probability_score <= 100),
  priority_score INTEGER CHECK (priority_score >= 0 AND priority_score <= 100),
  recommended_action TEXT,
  source opportunity_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_company ON replacement_opportunities(company_id);
CREATE INDEX idx_opportunities_customer ON replacement_opportunities(customer_id);
CREATE INDEX idx_opportunities_equipment ON replacement_opportunities(equipment_id);
CREATE INDEX idx_opportunities_status ON replacement_opportunities(status);
CREATE INDEX idx_opportunities_priority ON replacement_opportunities(priority_score);
CREATE INDEX idx_opportunities_source ON replacement_opportunities(source);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES maintenance_agreements(id),
  service_call_id UUID REFERENCES service_calls(id),
  invoice_number VARCHAR(100) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date TIMESTAMPTZ,
  notes TEXT,
  line_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_agreement ON invoices(agreement_id);

-- ============================================================
-- ACTIVITY LOGS (Audit Trail)
-- ============================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_company ON activity_logs(company_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- Partition by month for performance at scale
CREATE INDEX idx_activity_logs_created_month ON activity_logs((date_trunc('month', created_at)));

-- ============================================================
-- SESSIONS TABLE (for refresh token tracking)
-- ============================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_info VARCHAR(255),
  ip_address VARCHAR(45),
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name NOT LIKE 'pg_%'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW
       EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate a unique agreement number
CREATE OR REPLACE FUNCTION generate_agreement_number(company_slug TEXT)
RETURNS VARCHAR(100) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_part VARCHAR(10);
BEGIN
  year_part := to_char(NOW(), 'YYYY');
  seq_part := LPAD(floor(random() * 999999)::INT::TEXT, 6, '0');
  RETURN UPPER(company_slug) || '-' || year_part || '-' || seq_part;
END;
$$ LANGUAGE plpgsql;

-- Generate a unique invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(company_slug TEXT)
RETURNS VARCHAR(100) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_part VARCHAR(10);
BEGIN
  year_part := to_char(NOW(), 'YYYY');
  seq_part := LPAD(floor(random() * 99999)::INT::TEXT, 5, '0');
  RETURN 'INV-' || UPPER(company_slug) || '-' || year_part || '-' || seq_part;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMPLETED
-- ============================================================
