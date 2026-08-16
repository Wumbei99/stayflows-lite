-- Add room_number column to crm_logs table so the edge function can append it to the guest portal URL

ALTER TABLE public.crm_logs ADD COLUMN IF NOT EXISTS room_number text;
