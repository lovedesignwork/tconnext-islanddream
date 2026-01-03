-- Add default_slots column to programs table
-- This provides a default slot count for programs when no specific date availability is set

ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS default_slots INT DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN programs.default_slots IS 'Default number of available slots per day for this program when no specific date availability is configured';

-- Update index for program_availability to improve upsert performance
CREATE INDEX IF NOT EXISTS idx_program_availability_program_date 
ON program_availability(program_id, date);












