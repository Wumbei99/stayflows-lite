-- Enable the pg_net extension for making HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Replace the trigger function to use pg_net instead of the missing supabase_functions schema
CREATE OR REPLACE FUNCTION trigger_send_crm_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://aumfdgzeausgwsapeqsk.supabase.co/functions/v1/send-crm-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
