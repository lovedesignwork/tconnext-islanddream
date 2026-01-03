-- Migration: Staff Management System
-- Adds company codes and staff codes for staff authentication

-- Add company_code and staff_sequence to companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS company_code INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS staff_sequence INTEGER DEFAULT 0;

-- Add staff_code to company_team_members table
ALTER TABLE company_team_members
  ADD COLUMN IF NOT EXISTS staff_code VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS username VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_company_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_company_team_members_staff_code ON company_team_members(staff_code);
CREATE INDEX IF NOT EXISTS idx_company_team_members_username ON company_team_members(username);

-- Function to generate unique company code between 30000-99999
CREATE OR REPLACE FUNCTION generate_unique_company_code()
RETURNS INTEGER AS $$
DECLARE
  new_code INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random code between 30000-99999
    new_code := floor(random() * (99999 - 30000 + 1) + 30000)::INTEGER;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM companies WHERE company_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to generate next staff code for a company
CREATE OR REPLACE FUNCTION generate_staff_code(p_company_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_company_code INTEGER;
  v_sequence INTEGER;
  v_staff_code VARCHAR(20);
BEGIN
  -- Get company code and increment sequence
  UPDATE companies 
  SET staff_sequence = staff_sequence + 1
  WHERE id = p_company_id
  RETURNING company_code, staff_sequence INTO v_company_code, v_sequence;
  
  -- Generate staff code
  v_staff_code := v_company_code::TEXT || '-' || v_sequence::TEXT;
  
  RETURN v_staff_code;
END;
$$ LANGUAGE plpgsql;

-- Generate company codes for existing companies that don't have one
DO $$
DECLARE
  company_record RECORD;
  new_code INTEGER;
BEGIN
  FOR company_record IN SELECT id FROM companies WHERE company_code IS NULL
  LOOP
    new_code := generate_unique_company_code();
    UPDATE companies SET company_code = new_code WHERE id = company_record.id;
  END LOOP;
END $$;

-- Generate staff codes for existing team members that don't have one
DO $$
DECLARE
  member_record RECORD;
  new_staff_code VARCHAR(20);
BEGIN
  FOR member_record IN 
    SELECT ctm.id, ctm.company_id 
    FROM company_team_members ctm 
    WHERE ctm.staff_code IS NULL
    ORDER BY ctm.created_at
  LOOP
    new_staff_code := generate_staff_code(member_record.company_id);
    UPDATE company_team_members 
    SET staff_code = new_staff_code, username = new_staff_code 
    WHERE id = member_record.id;
  END LOOP;
END $$;

-- Make company_code NOT NULL after populating existing records
ALTER TABLE companies ALTER COLUMN company_code SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN companies.company_code IS 'Unique company identifier (30000-99999) used for staff code generation';
COMMENT ON COLUMN companies.staff_sequence IS 'Auto-incrementing counter for staff numbering within this company';
COMMENT ON COLUMN company_team_members.staff_code IS 'Unique staff ID in format: company_code-sequence (e.g., 35688-1)';
COMMENT ON COLUMN company_team_members.username IS 'Username for login, same as staff_code';

