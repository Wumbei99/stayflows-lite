-- Add 'status' column to rooms if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rooms' AND column_name = 'status'
    ) THEN
        ALTER TABLE rooms ADD COLUMN status text NOT NULL DEFAULT 'vacant';
    END IF;
END $$;

-- Set all existing rooms to 'vacant' by default
UPDATE rooms SET status = 'vacant' WHERE status IS NULL;
