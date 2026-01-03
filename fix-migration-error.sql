-- ============================================
-- FIX FOR MIGRATION ERROR
-- Run this to fix the generate_booking_number function conflict
-- ============================================

-- First, drop any existing versions of the function
DROP FUNCTION IF EXISTS generate_booking_number(UUID, TEXT);
DROP FUNCTION IF EXISTS generate_booking_number(UUID);
DROP FUNCTION IF EXISTS generate_booking_number();

-- Now create the correct version
CREATE OR REPLACE FUNCTION generate_booking_number(
    p_company_id UUID,
    p_payment_type TEXT DEFAULT 'paid'
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_initials TEXT;
    v_sequence INTEGER;
    v_booking_number TEXT;
    v_suffix TEXT := '';
    v_company_name TEXT;
BEGIN
    -- Get company info
    SELECT name, initials, COALESCE(booking_sequence, 0)
    INTO v_company_name, v_initials, v_sequence
    FROM companies
    WHERE id = p_company_id;
    
    -- Generate initials if not set
    IF v_initials IS NULL OR v_initials = '' THEN
        v_initials := generate_company_initials(v_company_name);
    END IF;
    
    -- Increment sequence
    v_sequence := v_sequence + 1;
    
    -- Update company with new sequence and initials
    UPDATE companies 
    SET booking_sequence = v_sequence,
        initials = v_initials
    WHERE id = p_company_id;
    
    -- Add suffix for special payment types
    IF p_payment_type = 'foc' THEN
        v_suffix := '-FOC';
    ELSIF p_payment_type = 'insp' THEN
        v_suffix := '-INSP';
    END IF;
    
    -- Generate booking number: INITIALS-000001(-FOC/-INSP)
    v_booking_number := v_initials || '-' || lpad(v_sequence::TEXT, 6, '0') || v_suffix;
    
    RETURN v_booking_number;
END;
$$;

-- Add comment
COMMENT ON FUNCTION generate_booking_number IS 'Generates structured booking numbers in format: INITIALS-SEQUENCE(-SUFFIX). Example: TDC-000001, TDC-000002-FOC';

SELECT 'Function fixed successfully!' AS result;

