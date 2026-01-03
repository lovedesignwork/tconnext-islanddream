-- Add car_capacity field to drivers table
-- This field represents the number of passenger slots available in the driver's vehicle
-- Infants, children, and adults all count as 1 slot each

ALTER TABLE drivers
ADD COLUMN car_capacity integer DEFAULT 4;

-- Add a comment to explain the field
COMMENT ON COLUMN drivers.car_capacity IS 'Number of passenger slots available in the vehicle. All guests (adults, children, infants) count as 1 slot each.';












