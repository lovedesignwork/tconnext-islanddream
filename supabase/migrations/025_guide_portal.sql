-- Guide Portal Migration
-- Adds unique_link_id and access_pin fields for guide public portal access

-- Add unique_link_id column for public portal URL
ALTER TABLE guides ADD COLUMN IF NOT EXISTS unique_link_id VARCHAR(100) UNIQUE;

-- Add access_pin column for PIN authentication (bcrypt hashed)
ALTER TABLE guides ADD COLUMN IF NOT EXISTS access_pin VARCHAR(255);

-- Create index for faster lookup by unique_link_id
CREATE INDEX IF NOT EXISTS idx_guides_unique_link_id ON guides(unique_link_id);

-- Generate unique_link_id for existing guides that don't have one
-- Using a combination of gen_random_uuid() to create unique identifiers
UPDATE guides 
SET unique_link_id = REPLACE(gen_random_uuid()::text, '-', '')::varchar(32)
WHERE unique_link_id IS NULL;

-- Set a default PIN hash for existing guides (PIN: 1234)
-- bcrypt hash for '1234' - guides should change this
UPDATE guides 
SET access_pin = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqJf1H8.4r.J5VL5r9J5VL5r9J5VL'
WHERE access_pin IS NULL;










