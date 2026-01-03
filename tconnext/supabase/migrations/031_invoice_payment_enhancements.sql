-- Migration: Invoice payment enhancements
-- Adds payment type tracking, internal notes, and ensures updated_at is tracked

-- 1. Create invoice_payment_types table for company-specific payment methods
CREATE TABLE IF NOT EXISTS invoice_payment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_payment_types_company_id ON invoice_payment_types(company_id);

-- 2. Add new columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_type_id UUID REFERENCES invoice_payment_types(id) ON DELETE SET NULL;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Create index for payment_type lookups
CREATE INDEX IF NOT EXISTS idx_invoices_payment_type_id ON invoices(payment_type_id);

-- 3. Seed some default payment types for existing companies
INSERT INTO invoice_payment_types (company_id, name, is_active)
SELECT id, 'Bank Transfer', true FROM companies
ON CONFLICT DO NOTHING;

INSERT INTO invoice_payment_types (company_id, name, is_active)
SELECT id, 'Cash', true FROM companies
ON CONFLICT DO NOTHING;

INSERT INTO invoice_payment_types (company_id, name, is_active)
SELECT id, 'Credit Card', true FROM companies
ON CONFLICT DO NOTHING;

-- 4. Create trigger to auto-update updated_at on invoices
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

-- 5. Create trigger to auto-update updated_at on invoice_payment_types
DROP TRIGGER IF EXISTS trigger_invoice_payment_types_updated_at ON invoice_payment_types;
CREATE TRIGGER trigger_invoice_payment_types_updated_at
    BEFORE UPDATE ON invoice_payment_types
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();







