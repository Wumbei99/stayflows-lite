-- Create the webhook trigger to fire the Edge Function when a new CRM log is inserted

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION trigger_send_crm_email()
RETURNS TRIGGER AS $$
BEGIN
  -- We use the built-in supabase_functions.http_request to send the webhook
  PERFORM supabase_functions.http_request(
    'https://aumfdgzeausgwsapeqsk.supabase.co/functions/v1/send-crm-email',
    'POST',
    '{"Content-type":"application/json"}',
    json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)
    )::text,
    '1000'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to the crm_logs table
DROP TRIGGER IF EXISTS on_crm_log_inserted ON public.crm_logs;
CREATE TRIGGER on_crm_log_inserted
AFTER INSERT ON public.crm_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_send_crm_email();
