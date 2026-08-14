-- Allow the dashboard to insert and update rooms while we are in development without Auth
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_rooms" ON rooms FOR DELETE TO anon USING (true);
