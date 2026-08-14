-- Ensure Supabase Realtime is enabled for these tables
-- We drop the publication first to avoid "already exists" errors if it's there
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add the tables we need real-time subscriptions for
ALTER PUBLICATION supabase_realtime ADD TABLE guest_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
