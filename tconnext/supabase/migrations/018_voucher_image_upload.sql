-- Migration: Add voucher image upload support
-- This adds a voucher_image_url column to bookings and sets up storage bucket

-- Add voucher_image_url column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voucher_image_url TEXT;

-- Create storage bucket for vouchers (if not exists)
-- Note: This needs to be run via Supabase Dashboard or CLI as storage buckets 
-- are managed separately from the database schema.
-- The bucket should be named 'vouchers' with the following settings:
-- - Public: false (private bucket)
-- - File size limit: 5MB
-- - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, application/pdf

-- Create storage policies for the vouchers bucket
-- These policies allow authenticated users to upload/view vouchers for their company

-- Policy: Users can upload vouchers
-- INSERT policy for vouchers bucket
-- Path format: {company_id}/{booking_id}/{filename}

-- Policy: Users can view vouchers from their company
-- SELECT policy for vouchers bucket

-- Policy: Users can delete vouchers from their company
-- DELETE policy for vouchers bucket

COMMENT ON COLUMN bookings.voucher_image_url IS 'URL to the uploaded voucher image in Supabase Storage';










