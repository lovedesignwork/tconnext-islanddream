-- Migration: Add page lock settings to companies
-- This allows companies to configure which pages require PIN protection

-- Add page_locks JSONB column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS page_locks JSONB DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN companies.page_locks IS 'JSON object storing which pages require PIN protection. Keys are page identifiers, values are booleans.';






