-- Migration: Stripe Connect and Direct Booking Enhancement
-- Adds Stripe Connect fields to companies and booking-related fields to programs

-- =============================================
-- COMPANIES TABLE: Stripe Connect fields
-- =============================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMPTZ;

-- =============================================
-- PROGRAMS TABLE: Direct booking fields
-- =============================================
-- Slug for URL-friendly program names (e.g., "phi-phi-island", "james-bond")
ALTER TABLE programs ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Thumbnail image for program gallery
ALTER TABLE programs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Toggle to enable/disable program for direct booking
ALTER TABLE programs ADD COLUMN IF NOT EXISTS direct_booking_enabled BOOLEAN DEFAULT false;

-- Short description for the booking page (different from full description)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Create unique index on slug per company (slug must be unique within a company)
CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_company_slug 
ON programs(company_id, slug) 
WHERE slug IS NOT NULL;

-- =============================================
-- BOOKINGS TABLE: Add booking source field
-- =============================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source VARCHAR(100);

-- Set default booking source for existing direct bookings
UPDATE bookings 
SET booking_source = 'DIRECT BOOKING - website purchase' 
WHERE is_direct_booking = true AND booking_source IS NULL;

-- =============================================
-- Function to generate slug from program name
-- =============================================
CREATE OR REPLACE FUNCTION generate_program_slug(program_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(program_name),
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    )
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Trigger to auto-generate slug if not provided
-- =============================================
CREATE OR REPLACE FUNCTION set_program_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Only generate slug if not provided and name exists
  IF NEW.slug IS NULL AND NEW.name IS NOT NULL THEN
    base_slug := generate_program_slug(NEW.name);
    final_slug := base_slug;
    
    -- Check for uniqueness within company and append number if needed
    WHILE EXISTS (
      SELECT 1 FROM programs 
      WHERE company_id = NEW.company_id 
      AND slug = final_slug 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating slug
DROP TRIGGER IF EXISTS trigger_set_program_slug ON programs;
CREATE TRIGGER trigger_set_program_slug
  BEFORE INSERT OR UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION set_program_slug();

-- =============================================
-- Generate slugs for existing programs
-- =============================================
DO $$
DECLARE
  prog RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR prog IN SELECT id, company_id, name FROM programs WHERE slug IS NULL
  LOOP
    base_slug := generate_program_slug(prog.name);
    final_slug := base_slug;
    counter := 0;
    
    WHILE EXISTS (
      SELECT 1 FROM programs 
      WHERE company_id = prog.company_id 
      AND slug = final_slug 
      AND id != prog.id
    ) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    UPDATE programs SET slug = final_slug WHERE id = prog.id;
  END LOOP;
END $$;

-- =============================================
-- Comments for documentation
-- =============================================
COMMENT ON COLUMN companies.stripe_account_id IS 'Stripe Connect Express account ID';
COMMENT ON COLUMN companies.stripe_connected IS 'Whether Stripe account is connected';
COMMENT ON COLUMN companies.stripe_onboarding_complete IS 'Whether Stripe onboarding is fully complete';
COMMENT ON COLUMN companies.stripe_connected_at IS 'When Stripe was connected';
COMMENT ON COLUMN programs.slug IS 'URL-friendly slug for direct booking page';
COMMENT ON COLUMN programs.thumbnail_url IS 'Image URL for program gallery';
COMMENT ON COLUMN programs.direct_booking_enabled IS 'Whether program appears on public booking page';
COMMENT ON COLUMN programs.short_description IS 'Brief description for booking page';
COMMENT ON COLUMN bookings.booking_source IS 'Source of booking (e.g., DIRECT BOOKING - website purchase)';






