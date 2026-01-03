-- Migration: Company Logo Storage
-- Creates storage bucket for company assets (logos, etc.)
-- This allows companies to upload their logos instead of using external URLs

-- ============================================
-- STORAGE BUCKET: company-assets
-- ============================================
-- Note: Storage buckets are typically created via Supabase Dashboard
-- Go to: Storage > New Bucket > Create "company-assets" with these settings:
--   - Name: company-assets
--   - Public bucket: YES (so logos can be displayed in emails/PDFs)
--   - File size limit: 2MB
--   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, image/svg+xml

-- ============================================
-- STORAGE POLICIES (run in Supabase Dashboard SQL Editor)
-- ============================================

-- Allow authenticated users to upload logos for their company
-- CREATE POLICY "Users can upload company logos"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'company-assets' AND
--   (storage.foldername(name))[1] = 'company-logos'
-- );

-- Allow authenticated users to update their company logos
-- CREATE POLICY "Users can update company logos"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'company-assets' AND
--   (storage.foldername(name))[1] = 'company-logos'
-- );

-- Allow authenticated users to delete their company logos
-- CREATE POLICY "Users can delete company logos"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'company-assets' AND
--   (storage.foldername(name))[1] = 'company-logos'
-- );

-- Allow public read access to company logos (needed for emails/PDFs)
-- CREATE POLICY "Public can view company logos"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'company-assets');

-- ============================================
-- INSTRUCTIONS FOR SETUP
-- ============================================
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name: company-assets
-- 4. Check "Public bucket" 
-- 5. Click "Create bucket"
-- 6. Go to Policies tab and add the policies above
--    OR enable "Allow public access" for simpler setup

-- Note: Storage bucket should be created via Supabase Dashboard
-- This migration is documentation only - no executable SQL commands






