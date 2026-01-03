-- Add default_pickup_time column to programs table
ALTER TABLE programs ADD COLUMN IF NOT EXISTS default_pickup_time TIME DEFAULT '08:00';

-- Update existing programs with default value
UPDATE programs SET default_pickup_time = '08:00' WHERE default_pickup_time IS NULL;












