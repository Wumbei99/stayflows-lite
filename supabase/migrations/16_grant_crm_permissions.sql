-- Grant table-level permissions to the API roles so they can access the new CRM tables
GRANT ALL ON TABLE public.crm_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.crm_templates TO anon, authenticated, service_role;
