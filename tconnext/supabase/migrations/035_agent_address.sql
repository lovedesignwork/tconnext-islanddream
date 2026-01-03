-- Add address column to agents table for invoice purposes
ALTER TABLE agents ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN agents.address IS 'Agent address for invoices (optional)';






