-- Ensure drivers table has car_capacity column required by dashboard
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS car_capacity integer DEFAULT 4;

COMMENT ON COLUMN drivers.car_capacity IS 'Number of passenger slots available in the vehicle. All guests (adults, children, infants) count as 1 slot each.';











