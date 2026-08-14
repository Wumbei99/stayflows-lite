-- Phase 2: Fix RLS policies for guest access and enable Realtime

-- 1. Drop ALL existing "Tenant Isolation" policies
DROP POLICY IF EXISTS "Tenant Isolation" ON tenants;
DROP POLICY IF EXISTS "Tenant Isolation" ON hotel_settings;
DROP POLICY IF EXISTS "Tenant Isolation" ON in_house_feedback;
DROP POLICY IF EXISTS "Tenant Isolation" ON crm_templates;
DROP POLICY IF EXISTS "Tenant Isolation" ON crm_logs;
DROP POLICY IF EXISTS "Tenant Isolation" ON guest_messages;

-- 2. TENANTS policies
CREATE POLICY "anon_select_tenants" ON tenants FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "service_role_all_tenants" ON tenants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. HOTEL_SETTINGS policies
CREATE POLICY "anon_select_settings" ON hotel_settings FOR SELECT TO anon USING (true);
CREATE POLICY "service_role_all_settings" ON hotel_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. IN_HOUSE_FEEDBACK policies (guests INSERT, dashboard SELECT/UPDATE)
CREATE POLICY "anon_insert_feedback" ON in_house_feedback FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_feedback" ON in_house_feedback FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_feedback" ON in_house_feedback FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_feedback" ON in_house_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. CRM_TEMPLATES policies
CREATE POLICY "anon_select_templates" ON crm_templates FOR SELECT TO anon USING (true);
CREATE POLICY "service_role_all_templates" ON crm_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. CRM_LOGS policies
CREATE POLICY "anon_select_logs" ON crm_logs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_logs" ON crm_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "service_role_all_logs" ON crm_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. GUEST_MESSAGES policies (guests INSERT, both sides SELECT, dashboard UPDATE)
CREATE POLICY "anon_insert_messages" ON guest_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_messages" ON guest_messages FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_messages" ON guest_messages FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_messages" ON guest_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Enable Supabase Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE in_house_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE guest_messages;

-- 9. Insert demo tenant so the app works out of the box
INSERT INTO tenants (id, name, slug, is_active) 
VALUES ('00000000-0000-0000-0000-000000000123', 'Acme Grand Hotel', 'acme-grand', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hotel_settings (tenant_id, profile)
VALUES (
  '00000000-0000-0000-0000-000000000123', 
  '{"hotel_name": "Acme Grand Hotel", "manager_email": "manager@acmegrand.com", "google_review_link": "https://g.page/acmegrand/review", "logo_url": ""}'::jsonb
)
ON CONFLICT DO NOTHING;
