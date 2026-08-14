-- Add guest_email column to rooms table to track current guest
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS guest_email text;
