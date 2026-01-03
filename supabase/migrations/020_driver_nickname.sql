-- Add nickname field to drivers table
-- This allows drivers to have a short nickname in addition to their full name

ALTER TABLE drivers
ADD COLUMN nickname VARCHAR(100);

-- Add a comment to explain the field
COMMENT ON COLUMN drivers.nickname IS 'Optional short nickname for the driver';










