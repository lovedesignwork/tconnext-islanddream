-- Migration: Add payment_type column to bookings table
-- Payment types: regular (default), foc (Free of Charge), insp (Inspection)
-- This affects booking number suffix: IDE-000007-FOC or IDE-000007-INSP

-- 1. Add payment_type column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'regular';

-- Add check constraint (using a separate ALTER to handle IF NOT EXISTS logic)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_type_check'
    ) THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_payment_type_check 
            CHECK (payment_type IN ('regular', 'foc', 'insp'));
    END IF;
END $$;

-- 2. Create or replace the generate_booking_number function to support payment_type suffix
CREATE OR REPLACE FUNCTION generate_booking_number(p_company_id UUID, p_payment_type VARCHAR DEFAULT 'regular')
RETURNS VARCHAR(30) AS $$
DECLARE
    v_initials VARCHAR(10);
    v_sequence INT;
    v_booking_number VARCHAR(30);
    v_suffix VARCHAR(10);
BEGIN
    -- Get company initials and increment sequence
    UPDATE companies 
    SET booking_sequence = booking_sequence + 1
    WHERE id = p_company_id
    RETURNING initials, booking_sequence INTO v_initials, v_sequence;
    
    -- Determine suffix based on payment type
    IF p_payment_type = 'foc' THEN
        v_suffix := '-FOC';
    ELSIF p_payment_type = 'insp' THEN
        v_suffix := '-INSP';
    ELSE
        v_suffix := '';
    END IF;
    
    -- Generate booking number with optional suffix
    v_booking_number := v_initials || '-' || LPAD(v_sequence::TEXT, 6, '0') || v_suffix;
    
    RETURN v_booking_number;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to update booking number suffix when payment_type changes
CREATE OR REPLACE FUNCTION update_booking_number_suffix(p_booking_id UUID, p_payment_type VARCHAR)
RETURNS VARCHAR(30) AS $$
DECLARE
    v_current_number VARCHAR(30);
    v_base_number VARCHAR(20);
    v_new_number VARCHAR(30);
    v_suffix VARCHAR(10);
BEGIN
    -- Get current booking number
    SELECT booking_number INTO v_current_number
    FROM bookings
    WHERE id = p_booking_id;
    
    -- Strip existing suffix (-FOC or -INSP) to get base number
    v_base_number := regexp_replace(v_current_number, '-(FOC|INSP)$', '');
    
    -- Determine new suffix based on payment type
    IF p_payment_type = 'foc' THEN
        v_suffix := '-FOC';
    ELSIF p_payment_type = 'insp' THEN
        v_suffix := '-INSP';
    ELSE
        v_suffix := '';
    END IF;
    
    -- Generate new booking number
    v_new_number := v_base_number || v_suffix;
    
    -- Update the booking
    UPDATE bookings 
    SET booking_number = v_new_number,
        payment_type = p_payment_type
    WHERE id = p_booking_id;
    
    RETURN v_new_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Create index for payment_type lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_type ON bookings(payment_type);












