-- Migration: Add RLS policies for invoice_payment_types table

-- Enable RLS
ALTER TABLE invoice_payment_types ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their company's payment types
CREATE POLICY "Users can view own company payment types" ON invoice_payment_types
    FOR SELECT
    USING (company_id = get_user_company_id() OR is_super_admin());

-- Policy: Users can manage their company's payment types
CREATE POLICY "Users can manage own company payment types" ON invoice_payment_types
    FOR ALL
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());







