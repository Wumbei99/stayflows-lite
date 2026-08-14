-- Add email column to tenant_users table to display team emails in settings dashboard
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS email text;

-- Backfill emails from auth.users (runs as postgres superuser, so it works)
UPDATE public.tenant_users tu
SET email = u.email
FROM auth.users u
WHERE tu.user_id = u.id AND tu.email IS NULL;
