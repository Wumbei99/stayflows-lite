-- Fix column name mismatch: the app code uses 'body' but the table has 'html_content'
ALTER TABLE crm_templates RENAME COLUMN html_content TO body;

-- Insert default templates for the demo tenant so emails can be sent
INSERT INTO crm_templates (tenant_id, name, subject, body)
VALUES 
  (
    '00000000-0000-0000-0000-000000000123',
    'checkin_welcome',
    'Welcome to your stay!',
    'We are absolutely thrilled to host you. Please use this digital concierge to request room service, extra towels, or chat with the front desk directly.'
  ),
  (
    '00000000-0000-0000-0000-000000000123',
    'checkout_thanks',
    'Thank you for staying with us!',
    'We hope you had a wonderful time. We would love to hear your feedback!'
  )
ON CONFLICT (tenant_id, name) DO NOTHING;
