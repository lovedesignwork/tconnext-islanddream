-- Migration: Fix program pricing columns
-- This migration adds the pricing columns if they don't exist

-- Add pricing type and selling price columns to programs (if not exists)
DO $$
BEGIN
    -- Add pricing_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'pricing_type') THEN
        ALTER TABLE programs ADD COLUMN pricing_type VARCHAR(20) DEFAULT 'single' CHECK (pricing_type IN ('single', 'adult_child'));
    END IF;
    
    -- Add selling_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'selling_price') THEN
        ALTER TABLE programs ADD COLUMN selling_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Add adult_selling_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'adult_selling_price') THEN
        ALTER TABLE programs ADD COLUMN adult_selling_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Add child_selling_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'child_selling_price') THEN
        ALTER TABLE programs ADD COLUMN child_selling_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Add adult_agent_price column to agent_pricing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pricing' AND column_name = 'adult_agent_price') THEN
        ALTER TABLE agent_pricing ADD COLUMN adult_agent_price DECIMAL(10, 2);
    END IF;
    
    -- Add child_agent_price column to agent_pricing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pricing' AND column_name = 'child_agent_price') THEN
        ALTER TABLE agent_pricing ADD COLUMN child_agent_price DECIMAL(10, 2);
    END IF;
END $$;

-- Update existing programs to have selling_price equal to base_price for backwards compatibility
UPDATE programs SET selling_price = base_price WHERE selling_price = 0 OR selling_price IS NULL;







