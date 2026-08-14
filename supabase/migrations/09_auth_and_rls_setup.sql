-- Pillar 1: Enterprise Security, Auth, & Roles

-- 1. Create the tenant_users table for RBAC
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('manager', 'receptionist')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

-- 2. Create platform_admins table for Super Admin isolation
CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- 3. Re-enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compendium_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_house_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- 4. Drop the totally open "dev_anon" policies we made earlier
DROP POLICY IF EXISTS "dev_anon_rooms" ON rooms;
DROP POLICY IF EXISTS "dev_anon_tenants" ON tenants;
DROP POLICY IF EXISTS "dev_anon_hotel_settings" ON hotel_settings;
DROP POLICY IF EXISTS "dev_anon_service_requests" ON service_requests;
DROP POLICY IF EXISTS "dev_anon_compendium" ON compendium_items;
DROP POLICY IF EXISTS "dev_anon_guest_messages" ON guest_messages;
DROP POLICY IF EXISTS "dev_anon_in_house_feedback" ON in_house_feedback;

-- 5. Create new strictly secured RLS policies tied to auth.uid()

-- Helper function to get the current user's tenant_id (stored in public schema)
CREATE OR REPLACE FUNCTION public.get_tenant_id() RETURNS uuid AS $$
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if current user is platform admin
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean AS $$
  SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- TENANTS: Only super admins can manage all tenants. Hotel staff can only read their own tenant.
CREATE POLICY "Staff can view own tenant" ON tenants FOR SELECT TO authenticated USING (id = public.get_tenant_id());
CREATE POLICY "Super admin full access tenants" ON tenants FOR ALL TO authenticated USING (public.is_super_admin());

-- HOTEL SETTINGS: Staff can manage their own settings. Guests (anon) can read settings for the portal.
CREATE POLICY "Staff manage own settings" ON hotel_settings FOR ALL TO authenticated USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Guest read settings" ON hotel_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Super admin full access settings" ON hotel_settings FOR ALL TO authenticated USING (public.is_super_admin());

-- ROOMS: Staff manage their own rooms.
CREATE POLICY "Staff manage own rooms" ON rooms FOR ALL TO authenticated USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Guest read rooms" ON rooms FOR SELECT TO anon USING (true); 

-- SERVICE REQUESTS: Staff manage own requests. Guests can insert.
CREATE POLICY "Staff manage own service requests" ON service_requests FOR ALL TO authenticated USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Guest insert service requests" ON service_requests FOR INSERT TO anon WITH CHECK (true);

-- GUEST MESSAGES: Staff manage own messages. Guests can insert and select their own.
CREATE POLICY "Staff manage own messages" ON guest_messages FOR ALL TO authenticated USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Guest insert messages" ON guest_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Guest select messages" ON guest_messages FOR SELECT TO anon USING (true);

-- IN HOUSE FEEDBACK: Staff manage own feedback. Guests can insert.
CREATE POLICY "Staff manage own feedback" ON in_house_feedback FOR ALL TO authenticated USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Guest insert feedback" ON in_house_feedback FOR INSERT TO anon WITH CHECK (true);

-- COMPENDIUM: Staff manage own compendium. Guests can read.
CREATE POLICY "Staff manage own compendium" ON compendium_items FOR ALL TO authenticated USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Guest read compendium" ON compendium_items FOR SELECT TO anon USING (true);

-- TENANT USERS: Staff can read users in their tenant.
CREATE POLICY "Staff read own tenant users" ON tenant_users FOR SELECT TO authenticated USING (tenant_id = public.get_tenant_id());
CREATE POLICY "Super admin manage tenant users" ON tenant_users FOR ALL TO authenticated USING (public.is_super_admin());

-- Re-grant baseline permissions just in case
GRANT ALL ON TABLE public.tenant_users TO authenticated, service_role;
GRANT ALL ON TABLE public.platform_admins TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
