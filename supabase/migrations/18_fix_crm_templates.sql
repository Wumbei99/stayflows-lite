-- Fix column name mismatch: the app code uses 'body' but the table has 'html_content'
ALTER TABLE crm_templates RENAME COLUMN html_content TO body;

-- Insert default templates for the demo tenant so emails can be sent
INSERT INTO crm_templates (tenant_id, name, subject, body)
VALUES 
  (
    '00000000-0000-0000-0000-000000000123',
    'checkin_welcome',
    'Welcome — I am personally glad to have you here',
    'I just wanted to take a moment to personally welcome you. It means a lot to me that you chose to stay with us, and I want to make sure every moment of your time here is comfortable and enjoyable.

If there is anything at all that does not feel right — even the tiniest inconvenience — please let me know immediately. Whether it is something in your room, the Wi-Fi, or anything else, I want to fix it for you.

You can reach me anytime by scanning the QR code in your room, or by tapping the button below. I am available 24/7 and always happy to help.'
  ),
  (
    '00000000-0000-0000-0000-000000000123',
    'checkout_thanks',
    'Thank you for staying with us!',
    'We hope you had a wonderful time. We would love to hear your feedback!'
  )
ON CONFLICT (tenant_id, name) DO NOTHING;
