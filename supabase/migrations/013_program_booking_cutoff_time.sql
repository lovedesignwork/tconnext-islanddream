-- Add booking_cutoff_time column to programs table
-- This column stores the latest time of day when bookings can be accepted for the same day

ALTER TABLE programs
ADD COLUMN IF NOT EXISTS booking_cutoff_time TIME DEFAULT '18:00';

-- Add comment for documentation
COMMENT ON COLUMN programs.booking_cutoff_time IS 'The cutoff time for same-day bookings. After this time, the program will not appear on the public availability page for today.';












