-- Migration: Platform Storage for Admin Assets
-- Creates storage bucket for platform branding assets (logo, favicon)

-- =============================================
-- CREATE STORAGE BUCKET
-- =============================================

-- Note: Storage buckets are typically created via Supabase Dashboard or CLI
-- This migration adds the bucket configuration if it doesn't exist

-- Insert bucket configuration (this is a reference, actual bucket creation
-- should be done via Supabase Dashboard: Storage > New Bucket > "platform-assets")

-- The bucket should be configured as:
-- Name: platform-assets
-- Public: true (for serving logo/favicon publicly)
-- Allowed MIME types: image/png, image/jpeg, image/svg+xml, image/x-icon, image/vnd.microsoft.icon

-- =============================================
-- UPDATE PLATFORM_SETTINGS WITH BRANDING KEYS
-- =============================================

INSERT INTO platform_settings (key, value, description) VALUES
    ('branding', '{"logo_url": null, "favicon_url": null}', 'Platform branding assets (logo and favicon URLs)'),
    ('subscription_defaults', '{"monthly_price": 1500, "currency": "THB", "grace_period_days": 7}', 'Default subscription settings for new tenants')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- STORAGE POLICIES (run these in Supabase Dashboard SQL Editor)
-- =============================================

-- These policies should be applied after creating the bucket:

-- Allow super_admin to upload files
-- CREATE POLICY "Super admin can upload platform assets"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'platform-assets' AND
--   (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'super_admin'
-- );

-- Allow super_admin to update files
-- CREATE POLICY "Super admin can update platform assets"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'platform-assets' AND
--   (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'super_admin'
-- );

-- Allow super_admin to delete files
-- CREATE POLICY "Super admin can delete platform assets"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'platform-assets' AND
--   (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'super_admin'
-- );

-- Allow public read access for logo and favicon
-- CREATE POLICY "Public can view platform assets"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'platform-assets');

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE platform_settings IS 'Global platform configuration including branding and subscription defaults';






