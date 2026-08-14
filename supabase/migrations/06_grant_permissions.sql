-- Grant baseline PostgreSQL permissions to the API roles
GRANT ALL ON TABLE public.rooms TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tenants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.hotel_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.service_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.compendium_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.guest_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.in_house_feedback TO anon, authenticated, service_role;

-- Also grant usage on sequences if any exist
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
