CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
    demo_tenant_id uuid := '00000000-0000-0000-0000-000000000123';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@hotel.com') THEN
        
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, 
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
            created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
            new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager@hotel.com',
            crypt('password123', gen_salt('bf')),
            now(), '{"provider":"email","providers":["email"]}', '{}',
            now(), now(), '', '', '', ''
        );

        INSERT INTO auth.identities (
            id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            new_user_id, new_user_id::text, new_user_id, 
            format('{"sub":"%s","email":"manager@hotel.com"}', new_user_id)::jsonb, 
            'email', now(), now(), now()
        );

        INSERT INTO public.tenant_users (user_id, tenant_id, role)
        VALUES (new_user_id, demo_tenant_id, 'manager');

    END IF;
END $$;
