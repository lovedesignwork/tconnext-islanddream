-- Migration: Superadmin Billing and Subscription Management
-- Adds billing tracking, subscription management, and company owner fields

-- =============================================
-- COMPANIES TABLE: Owner and billing fields
-- =============================================

-- Company owner information
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(50);

-- Subscription and billing fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS next_billing_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_notes TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- =============================================
-- SUBSCRIPTION PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('stripe', 'bank_transfer', 'cash', 'other')),
    stripe_payment_id VARCHAR(255),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_payments_company_id ON subscription_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_date ON subscription_payments(payment_date);

-- Enable RLS on subscription_payments
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Only super_admin can access subscription_payments
CREATE POLICY "Super admin can manage subscription payments" ON subscription_payments
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- =============================================
-- SUBSCRIPTION ACTIVITY LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_by_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_activity_log_company_id ON subscription_activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_activity_log_created_at ON subscription_activity_log(created_at);

-- Enable RLS on subscription_activity_log
ALTER TABLE subscription_activity_log ENABLE ROW LEVEL SECURITY;

-- Only super_admin can access subscription_activity_log
CREATE POLICY "Super admin can manage subscription activity log" ON subscription_activity_log
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- =============================================
-- PLATFORM SETTINGS TABLE (for default pricing, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super_admin can access platform_settings
CREATE POLICY "Super admin can manage platform settings" ON platform_settings
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
    ('default_monthly_price', '{"amount": 1500, "currency": "THB"}', 'Default monthly subscription price for new tenants'),
    ('billing_reminder_days', '{"days": [7, 3, 1]}', 'Days before due date to send billing reminders'),
    ('grace_period_days', '{"days": 7}', 'Days after due date before suspension')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- UPDATE FUNCTION FOR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_subscription_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription_payments
DROP TRIGGER IF EXISTS trigger_update_subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER trigger_update_subscription_payments_updated_at
    BEFORE UPDATE ON subscription_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_payments_updated_at();

-- =============================================
-- HELPER FUNCTION: Get months paid for a company
-- =============================================
CREATE OR REPLACE FUNCTION get_company_months_paid(p_company_id UUID)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT DATE_TRUNC('month', period_start))
        FROM subscription_payments
        WHERE company_id = p_company_id
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Get months since subscription started
-- =============================================
CREATE OR REPLACE FUNCTION get_company_months_active(p_company_id UUID)
RETURNS INT AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    SELECT subscription_started_at INTO start_date
    FROM companies
    WHERE id = p_company_id;
    
    IF start_date IS NULL THEN
        SELECT created_at INTO start_date
        FROM companies
        WHERE id = p_company_id;
    END IF;
    
    RETURN GREATEST(1, EXTRACT(MONTH FROM AGE(NOW(), start_date)) + 
                       EXTRACT(YEAR FROM AGE(NOW(), start_date)) * 12 + 1);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Set subscription_started_at for existing active companies
-- =============================================
UPDATE companies 
SET subscription_started_at = created_at 
WHERE subscription_started_at IS NULL 
AND subscription_status = 'active';

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON COLUMN companies.owner_name IS 'Primary contact/owner name for the company';
COMMENT ON COLUMN companies.owner_email IS 'Primary contact/owner email for billing communications';
COMMENT ON COLUMN companies.owner_phone IS 'Primary contact/owner phone number';
COMMENT ON COLUMN companies.monthly_price IS 'Custom monthly subscription price (0 = use default)';
COMMENT ON COLUMN companies.trial_ends_at IS 'Trial period end date (null = no trial)';
COMMENT ON COLUMN companies.subscription_started_at IS 'When the paid subscription began';
COMMENT ON COLUMN companies.next_billing_date IS 'Next payment due date';
COMMENT ON COLUMN companies.billing_notes IS 'Internal notes about billing for this company';
COMMENT ON COLUMN companies.suspended_at IS 'When the company was suspended';
COMMENT ON COLUMN companies.suspended_reason IS 'Reason for suspension';

COMMENT ON TABLE subscription_payments IS 'Records all subscription payments from tenants';
COMMENT ON TABLE subscription_activity_log IS 'Audit log for subscription-related actions';
COMMENT ON TABLE platform_settings IS 'Global platform configuration settings';

