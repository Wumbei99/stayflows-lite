-- Insert the newly created user into platform_admins
INSERT INTO public.platform_admins (user_id)
VALUES ('ec749659-8168-4bf7-ac15-ca1c5c5d8b39')
ON CONFLICT (user_id) DO NOTHING;
