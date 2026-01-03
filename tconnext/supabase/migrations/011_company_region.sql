-- Migration: Add region column to companies table
-- This allows Super Admin to assign a region (Phuket, Phang Nga, or Both) to each company
-- The region determines which reference hotels are available to the company

-- Add region column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Phuket';

-- Add check constraint for valid regions
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_region_check;
ALTER TABLE companies ADD CONSTRAINT companies_region_check 
  CHECK (region IN ('Phuket', 'Phang Nga', 'Both'));

-- Create index for region lookups
CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region);

-- Enable RLS on reference_hotels if not already enabled
ALTER TABLE reference_hotels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read reference hotels" ON reference_hotels;
DROP POLICY IF EXISTS "Authenticated users can read reference hotels" ON reference_hotels;

-- Allow all authenticated users to read reference_hotels (it's a shared resource)
CREATE POLICY "Authenticated users can read reference hotels" ON reference_hotels
    FOR SELECT
    TO authenticated
    USING (true);

-- Update existing companies to have default region
UPDATE companies SET region = 'Phuket' WHERE region IS NULL;












