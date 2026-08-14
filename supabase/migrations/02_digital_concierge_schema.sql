-- Phase 2: GuestPulse 2.0 Digital Concierge Extensions

-- 1. ROOMS Table
-- Stores specific rooms, their types, and the unique QR code identifier
CREATE TABLE rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    room_number text NOT NULL,
    room_type text, -- e.g., 'Suite', 'Standard', 'Penthouse'
    qr_code_hash text UNIQUE NOT NULL, -- Used in URL: ?t=TENANT&r=HASH
    is_occupied boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, room_number)
);

-- 2. SERVICE_REQUESTS Table
-- Ticketing system for housekeeping, maintenance, amenities
CREATE TABLE service_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    request_type text NOT NULL, -- e.g., 'Towels', 'Cleaning', 'Late Checkout', 'Maintenance'
    description text,
    status text DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved'
    priority text DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. COMPENDIUM_ITEMS Table
-- Digital binder for menus, guides, and WiFi info
CREATE TABLE compendium_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category text NOT NULL, -- e.g., 'WiFi', 'Dining', 'Amenities', 'Local Guide'
    title text NOT NULL,
    description text,
    image_url text,
    action_url text, -- e.g., link to external menu if needed
    display_order int DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compendium_items ENABLE ROW LEVEL SECURITY;

-- ROOMS POLICIES
CREATE POLICY "anon_select_rooms" ON rooms FOR SELECT TO anon USING (true);
CREATE POLICY "service_role_all_rooms" ON rooms FOR ALL TO service_role USING (true) WITH CHECK (true);

-- SERVICE_REQUESTS POLICIES
CREATE POLICY "anon_insert_requests" ON service_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_requests" ON service_requests FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_requests" ON service_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_requests" ON service_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

-- COMPENDIUM_ITEMS POLICIES
CREATE POLICY "anon_select_compendium" ON compendium_items FOR SELECT TO anon USING (true);
CREATE POLICY "service_role_all_compendium" ON compendium_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ENABLE REALTIME ON TICKETING
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- INDEXES
CREATE INDEX idx_rooms_tenant ON rooms(tenant_id);
CREATE INDEX idx_rooms_qr ON rooms(qr_code_hash);
CREATE INDEX idx_requests_tenant ON service_requests(tenant_id);
CREATE INDEX idx_compendium_tenant ON compendium_items(tenant_id);
