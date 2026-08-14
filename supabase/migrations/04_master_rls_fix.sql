-- DANGER: This script disables all Row Level Security restrictions for anon users.
-- This is ONLY for local development before we implement actual Supabase Authentication!

-- 1. Drop any existing policies that might be conflicting
DROP POLICY IF EXISTS "anon_select_rooms" ON rooms;
DROP POLICY IF EXISTS "service_role_all_rooms" ON rooms;
DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
DROP POLICY IF EXISTS "anon_delete_rooms" ON rooms;

-- 2. Grant FULL access to anon for ALL tables
CREATE POLICY "dev_anon_rooms" ON rooms FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "dev_anon_tenants" ON tenants FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "dev_anon_hotel_settings" ON hotel_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "dev_anon_service_requests" ON service_requests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "dev_anon_compendium" ON compendium_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "dev_anon_guest_messages" ON guest_messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "dev_anon_in_house_feedback" ON in_house_feedback FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. Ensure RLS is enabled so these policies actually apply
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compendium_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_house_feedback ENABLE ROW LEVEL SECURITY;
