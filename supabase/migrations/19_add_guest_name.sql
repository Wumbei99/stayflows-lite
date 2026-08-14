-- Add guest_name column to rooms table (for check-in capture)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS guest_name text;

-- Add guest_name column to crm_logs table (passed to Edge Function)
ALTER TABLE public.crm_logs ADD COLUMN IF NOT EXISTS guest_name text;
