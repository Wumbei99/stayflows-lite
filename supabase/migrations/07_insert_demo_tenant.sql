-- Insert the default demo tenant if it doesn't exist to fix the foreign key constraint
INSERT INTO tenants (id, name, slug, is_active) 
VALUES ('00000000-0000-0000-0000-000000000123', 'Acme Grand Hotel', 'acme-grand', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hotel_settings (tenant_id, profile)
VALUES ('00000000-0000-0000-0000-000000000123', '{"hotel_name": "Acme Grand Hotel", "manager_email": "manager@acmegrand.com", "google_review_link": "https://g.page/acmegrand/review", "logo_url": ""}'::jsonb)
ON CONFLICT DO NOTHING;
