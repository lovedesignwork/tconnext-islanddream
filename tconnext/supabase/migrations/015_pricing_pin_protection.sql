-- Migration: Add PIN protection for pricing and unique agent codes
-- Date: 2024-12-01

-- Add pricing PIN fields to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS pricing_pin VARCHAR(4),
ADD COLUMN IF NOT EXISTS pricing_pin_enabled BOOLEAN DEFAULT false;

-- Add unique_code to agents table (unique per company)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS unique_code VARCHAR(20);

-- Create unique index for agent unique_code within a company
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_company_unique_code 
ON agents(company_id, unique_code) 
WHERE unique_code IS NOT NULL AND status != 'deleted';

-- Add comment for documentation
COMMENT ON COLUMN companies.pricing_pin IS '4-digit PIN for protecting access to agent pricing';
COMMENT ON COLUMN companies.pricing_pin_enabled IS 'Whether PIN protection is enabled for pricing access';
COMMENT ON COLUMN agents.unique_code IS 'Unique identifier code for the agent within the company';












