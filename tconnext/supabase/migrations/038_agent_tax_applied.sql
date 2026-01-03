-- Add tax_applied column to agents table
-- When false, invoices for this agent will not show tax information

ALTER TABLE agents
ADD COLUMN tax_applied BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN agents.tax_applied IS 'When false, invoices for this agent will not display tax IDs or calculate tax';






