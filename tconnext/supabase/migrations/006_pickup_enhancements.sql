-- Add is_come_direct flag to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_come_direct BOOLEAN DEFAULT FALSE;

-- Add come_direct_location to programs table (stores location name, address, google maps link, contact)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS come_direct_location JSONB DEFAULT NULL;

-- Example come_direct_location structure:
-- {
--   "name": "Rassada Pier",
--   "address": "Rassada Pier, Phuket",
--   "google_maps_url": "https://maps.google.com/...",
--   "contact_info": "Call: 076-123-456"
-- }












