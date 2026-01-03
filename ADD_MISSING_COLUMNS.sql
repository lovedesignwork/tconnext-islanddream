-- ===================================
-- ADD MISSING COLUMNS TO company_team_members
-- Run this in Supabase SQL Editor
-- ===================================

-- Add staff_code column if it doesn't exist
ALTER TABLE company_team_members 
ADD COLUMN IF NOT EXISTS staff_code TEXT;

-- Add status column if it doesn't exist  
ALTER TABLE company_team_members 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add created_at column if it doesn't exist
ALTER TABLE company_team_members 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Add updated_at column if it doesn't exist
ALTER TABLE company_team_members 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Verify the fix
SELECT 'Columns added successfully!' AS status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'company_team_members';

