-- Migration: Add voucher image upload support
-- This adds a voucher_image_url column to bookings and sets up storage bucket

-- Add voucher_image_url column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voucher_image_url TEXT;

-- =====================================================
-- IMPORTANT: MANUAL STEP REQUIRED FOR STORAGE BUCKET
-- =====================================================
-- The 'vouchers' storage bucket MUST be created manually via Supabase Dashboard:
-- 
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: vouchers
-- 4. Public bucket: OFF (uncheck - keep it private)
-- 5. Click "Create bucket"
-- 6. After creation, go to bucket Settings and set:
--    - File size limit: 5MB (5242880 bytes)
--    - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, application/pdf
--
-- Then add these RLS policies for the bucket:
-- 
-- Policy Name: "Authenticated users can upload vouchers"
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression: true
--
-- Policy Name: "Authenticated users can view vouchers"  
-- Allowed operation: SELECT
-- Target roles: authenticated
-- USING expression: true
--
-- Policy Name: "Authenticated users can delete vouchers"
-- Allowed operation: DELETE
-- Target roles: authenticated
-- USING expression: true
-- =====================================================

COMMENT ON COLUMN bookings.voucher_image_url IS 'URL to the uploaded voucher image in Supabase Storage';










