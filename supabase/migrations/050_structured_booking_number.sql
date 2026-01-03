-- ===================================
-- MIGRATION: Structured Booking Number
-- Run this in your Supabase SQL Editor
-- ===================================
-- Format: {INITIALS}-{SEQUENCE}{-SUFFIX}
-- Example: TDC-000001, TDC-000002-FOC, TDC-000003-INSP
-- ===================================

-- Ensure columns exist on companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS initials VARCHAR(10);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_sequence INTEGER DEFAULT 0;

-- Function to generate initials from company name
CREATE OR REPLACE FUNCTION generate_company_initials(company_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    cleaned_name TEXT;
    words TEXT[];
    initials TEXT := '';
    word TEXT;
BEGIN
    -- Remove common suffixes and punctuation
    cleaned_name := regexp_replace(company_name, '(Co\.|Ltd\.?|Inc\.?|LLC|Corporation|Corp\.?|,)', '', 'gi');
    cleaned_name := trim(cleaned_name);
    
    -- Split into words
    words := string_to_array(cleaned_name, ' ');
    
    -- Take first letter of each word (up to 5 letters)
    FOREACH word IN ARRAY words
    LOOP
        IF length(word) > 0 AND length(initials) < 5 THEN
            initials := initials || upper(substring(word from 1 for 1));
        END IF;
    END LOOP;
    
    -- Default to 'BK' if empty
    IF length(initials) = 0 THEN
        initials := 'BK';
    END IF;
    
    RETURN initials;
END;
$$;

-- Updated generate_booking_number function with structured format
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

-- Sync existing sequences (run once to update booking_sequence based on existing bookings)
-- This finds the highest sequence number from existing bookings and updates the company
DO $$
DECLARE
    company_record RECORD;
    max_seq INTEGER;
    company_initials TEXT;
BEGIN
    FOR company_record IN SELECT id, name, initials, booking_sequence FROM companies
    LOOP
        -- Generate initials if not set
        company_initials := COALESCE(company_record.initials, generate_company_initials(company_record.name));
        
        -- Find max sequence from existing bookings with matching prefix
        SELECT COALESCE(MAX(
            CASE 
                WHEN booking_number ~ ('^' || company_initials || '-(\d+)')
                THEN CAST(substring(booking_number from ('^' || company_initials || '-(\d+)')) AS INTEGER)
                ELSE 0
            END
        ), 0) INTO max_seq
        FROM bookings
        WHERE company_id = company_record.id;
        
        -- Update company with synced values
        UPDATE companies 
        SET 
            initials = company_initials,
            booking_sequence = GREATEST(COALESCE(company_record.booking_sequence, 0), max_seq)
        WHERE id = company_record.id;
    END LOOP;
END $$;

SELECT 'Sequences synchronized with existing bookings!' AS result;

