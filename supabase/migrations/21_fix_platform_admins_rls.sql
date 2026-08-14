-- 1. Ensure RLS is enabled just to be safe and consistent
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policy just in case
DROP POLICY IF EXISTS "Anyone can read platform_admins" ON public.platform_admins;

-- 3. Create a policy that allows any authenticated user to read the platform_admins table.
-- This is required so the AuthContext can check if the logged-in user is an admin.
CREATE POLICY "Anyone can read platform_admins" 
ON public.platform_admins 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Just to be absolutely sure the user exists in the table, insert them again:
INSERT INTO public.platform_admins (user_id)
VALUES ('ec749659-8168-4bf7-ac15-ca1c5c5d8b39')
ON CONFLICT (user_id) DO NOTHING;
