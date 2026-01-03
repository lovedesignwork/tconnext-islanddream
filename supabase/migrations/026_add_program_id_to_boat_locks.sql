-- Add program_id column to boat_assignment_locks if it doesn't exist
-- This migration ensures the program_id column exists for storing program assignments

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'boat_assignment_locks' 
        AND column_name = 'program_id'
    ) THEN
        ALTER TABLE boat_assignment_locks 
        ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE SET NULL;
    END IF;
END $$;








