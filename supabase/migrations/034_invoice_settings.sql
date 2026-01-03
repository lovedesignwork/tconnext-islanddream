-- Invoice Settings Enhancement Migration
-- Adds tax_id, address, phone fields to companies and agents tables

-- Add tax_id to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Add address to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;

-- Add phone to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add tax_id to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Add address to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies.tax_id IS 'Company Tax ID for invoices';
COMMENT ON COLUMN companies.address IS 'Company address for invoices';
COMMENT ON COLUMN companies.phone IS 'Company phone number for invoices';
COMMENT ON COLUMN agents.tax_id IS 'Agent Tax ID for invoices (optional)';
COMMENT ON COLUMN agents.address IS 'Agent address for invoices (optional)';

