-- Create the webhook trigger to fire the Edge Function when a new feedback is inserted

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION trigger_process_feedback()
RETURNS TRIGGER AS $$
BEGIN
  -- We use the built-in supabase_functions.http_request to send the webhook
  PERFORM supabase_functions.http_request(
    'https://aumfdgzeausgwsapeqsk.supabase.co/functions/v1/process-feedback',
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

-- 2. Attach the trigger to the in_house_feedback table
DROP TRIGGER IF EXISTS on_feedback_inserted ON public.in_house_feedback;
CREATE TRIGGER on_feedback_inserted
AFTER INSERT ON public.in_house_feedback
FOR EACH ROW
EXECUTE FUNCTION trigger_process_feedback();
