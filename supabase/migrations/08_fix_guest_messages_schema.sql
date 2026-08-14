-- Fix the guest_messages schema to match the frontend expectations
ALTER TABLE guest_messages RENAME COLUMN reservation_id TO room_number;
ALTER TABLE guest_messages RENAME COLUMN content TO message;
ALTER TABLE guest_messages RENAME COLUMN sender TO sender_type;

-- Update the check constraint to allow 'staff' instead of just 'hotel'
ALTER TABLE guest_messages DROP CONSTRAINT IF EXISTS guest_messages_sender_check;
ALTER TABLE guest_messages ADD CONSTRAINT guest_messages_sender_type_check CHECK (sender_type IN ('guest', 'staff', 'hotel'));
