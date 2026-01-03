-- Migration: Add pricing type to programs
-- This allows programs to have either single pricing (per person) or adult/child pricing

-- Add pricing type and selling price columns to programs
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) DEFAULT 'single' CHECK (pricing_type IN ('single', 'adult_child')),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adult_selling_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS child_selling_price DECIMAL(10, 2) DEFAULT 0;

-- Add adult/child agent pricing columns to agent_pricing
ALTER TABLE agent_pricing
ADD COLUMN IF NOT EXISTS adult_agent_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS child_agent_price DECIMAL(10, 2);

-- Update existing programs to have selling_price equal to base_price for backwards compatibility
UPDATE programs SET selling_price = base_price WHERE selling_price = 0 OR selling_price IS NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN programs.pricing_type IS 'single = one price per person, adult_child = separate adult and child prices';
COMMENT ON COLUMN programs.selling_price IS 'Selling price for single pricing type (per person)';
COMMENT ON COLUMN programs.adult_selling_price IS 'Adult selling price for adult_child pricing type';
COMMENT ON COLUMN programs.child_selling_price IS 'Child selling price for adult_child pricing type';
COMMENT ON COLUMN agent_pricing.adult_agent_price IS 'Agent price for adults (used when program has adult_child pricing)';
COMMENT ON COLUMN agent_pricing.child_agent_price IS 'Agent price for children (used when program has adult_child pricing)';







