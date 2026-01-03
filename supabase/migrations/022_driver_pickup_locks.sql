-- Create driver_pickup_locks table to persist lock state for pickup assignments
CREATE TABLE IF NOT EXISTS driver_pickup_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, driver_id, activity_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_driver_pickup_locks_company_date 
  ON driver_pickup_locks(company_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_driver_pickup_locks_driver_date 
  ON driver_pickup_locks(driver_id, activity_date);

-- Enable RLS
ALTER TABLE driver_pickup_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's pickup locks"
  ON driver_pickup_locks FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pickup locks for their company"
  ON driver_pickup_locks FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's pickup locks"
  ON driver_pickup_locks FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's pickup locks"
  ON driver_pickup_locks FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );










