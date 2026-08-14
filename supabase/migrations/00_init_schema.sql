-- Phase 1: Database Architecture & Multi-Tenancy

CREATE TABLE tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE hotel_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    profile jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE in_house_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    room_number text,
    rating int CHECK (rating >= 1 AND rating <= 5),
    category text,
    message text,
    status text DEFAULT 'Unread',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE crm_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    subject text,
    html_content text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE crm_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    guest_email text NOT NULL,
    template_name text NOT NULL,
    status text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE guest_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reservation_id text,
    sender text CHECK (sender IN ('guest', 'hotel')),
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_house_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Tenant Isolation" ON tenants FOR ALL USING (id = (select auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "Tenant Isolation" ON hotel_settings FOR ALL USING (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "Tenant Isolation" ON in_house_feedback FOR ALL USING (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "Tenant Isolation" ON crm_templates FOR ALL USING (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "Tenant Isolation" ON crm_logs FOR ALL USING (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "Tenant Isolation" ON guest_messages FOR ALL USING (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

-- Create Indexes
CREATE INDEX idx_feedback_tenant ON in_house_feedback(tenant_id);
CREATE INDEX idx_messages_tenant ON guest_messages(tenant_id);
CREATE INDEX idx_crm_logs_tenant ON crm_logs(tenant_id);
