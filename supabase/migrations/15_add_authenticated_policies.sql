-- Add missing 'authenticated' role RLS policies for manager dashboard access

-- 1. TENANTS
CREATE POLICY "authenticated_select_tenants" ON tenants FOR SELECT TO authenticated USING (is_active = true);

-- 2. HOTEL_SETTINGS
CREATE POLICY "authenticated_select_settings" ON hotel_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update_settings" ON hotel_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_insert_settings" ON hotel_settings FOR INSERT TO authenticated WITH CHECK (true);

-- 3. IN_HOUSE_FEEDBACK
CREATE POLICY "authenticated_select_feedback" ON in_house_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update_feedback" ON in_house_feedback FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. CRM_TEMPLATES
CREATE POLICY "authenticated_select_templates" ON crm_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_templates" ON crm_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_templates" ON crm_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 5. CRM_LOGS
CREATE POLICY "authenticated_select_logs" ON crm_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_logs" ON crm_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 6. GUEST_MESSAGES
CREATE POLICY "authenticated_select_messages" ON guest_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update_messages" ON guest_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 7. ROOMS
CREATE POLICY "authenticated_select_rooms" ON rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update_rooms" ON rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
