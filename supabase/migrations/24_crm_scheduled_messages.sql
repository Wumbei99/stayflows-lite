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
SELECT t.id, 'mid_stay', 'A personal check-in regarding your stay', 
'I wanted to personally reach out and see how your stay is going so far. My top priority is making sure you have a beautiful and comfortable experience with us.

If there is absolutely anything you need — whether it is extra towels, a room temperature adjustment, or just a quick question — please do not hesitate to let me know. Even if you are just ''managing'' through a minor inconvenience, I want to hear about it so I can fix it.

I am here to help, and I want to make sure your time here is perfect.'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM crm_templates ct WHERE ct.tenant_id = t.id AND ct.name = 'mid_stay'
);
