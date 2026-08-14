-- Create the scheduled messages queue table for mid-stay check-ins
CREATE TABLE IF NOT EXISTS crm_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  guest_name TEXT,
  guest_email TEXT NOT NULL,
  room_number TEXT,
  message_type TEXT NOT NULL DEFAULT 'mid_stay',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Add checkout_date column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS checkout_date DATE;

-- Grant permissions
GRANT ALL ON crm_scheduled_messages TO anon;
GRANT ALL ON crm_scheduled_messages TO authenticated;
GRANT ALL ON crm_scheduled_messages TO service_role;

-- Add mid_stay template type
INSERT INTO crm_templates (tenant_id, name, subject, body)
SELECT t.id, 'mid_stay', 'How is your stay so far?', 
'We hope you are enjoying your time with us! Your comfort matters to us, and we would love to hear how things are going.

If there is anything we can do to make your stay even better — whether it is extra pillows, room temperature, or anything at all — please do not hesitate to let us know.

We would also really appreciate it if you could take a moment to share your experience. Your feedback helps us serve you better!'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM crm_templates ct WHERE ct.tenant_id = t.id AND ct.name = 'mid_stay'
);
