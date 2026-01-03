-- Add nickname column to programs table
-- This is a short name for admin use only, not shown to customers

ALTER TABLE programs
ADD COLUMN nickname TEXT;

-- Add a comment to explain the purpose
COMMENT ON COLUMN programs.nickname IS 'Short name for admin use only - helps identify programs quickly without reading full name';










