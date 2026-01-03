-- Migration: Import reference hotels into company's hotels table
-- This migration is a TEMPLATE - run with actual company_id during setup
-- Reference hotels are already populated from migration 008 and 009

-- To import hotels for a specific company, run:
-- 
-- INSERT INTO hotels (company_id, name, area)
-- SELECT 
--     '<your_company_id>' as company_id,
--     name,
--     area
-- FROM reference_hotels
-- WHERE NOT EXISTS (
--     SELECT 1 FROM hotels h 
--     WHERE h.company_id = '<your_company_id>' 
--     AND LOWER(h.name) = LOWER(reference_hotels.name)
-- );

-- Note: The reference_hotels table contains 1,998 hotels from Phuket and Phang Nga
-- Companies can import all or select specific areas during setup
