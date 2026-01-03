-- Add color column to programs table
-- Stores hex color code (e.g., '#3B82F6') for visual identification

ALTER TABLE programs ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

-- Add comment for documentation
COMMENT ON COLUMN programs.color IS 'Hex color code for visual program identification (e.g., #3B82F6)';










