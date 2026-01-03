-- Migration: Add OP Report Auto Email Settings
-- This adds settings for automatic daily OP report emails to companies

-- The settings are stored in the existing company.settings JSONB column
-- Structure:
-- {
--   "op_report_auto_email": {
--     "send_time": "23:30",  -- HH:MM format
--     "recipient_emails": ["email1@example.com", "email2@example.com"]
--   }
-- }

-- No schema changes needed as we use the existing settings JSONB column
-- This migration serves as documentation for the feature

COMMENT ON COLUMN companies.settings IS 'Company settings JSON including:
- branding: logo_url, primary_color, secondary_color
- payment: bank_name, account_name, account_number, payment_instructions
- email: from_name, reply_to, footer_text
- pickup: contact_info
- availability: days_to_display, contact_phone, contact_email, contact_whatsapp
- invoice: logo_url, payment_footer, tax_percentage
- booking: thank_you_message, failed_payment_message, contact_for_manual_booking, page_header_text, page_footer_text
- op_report_auto_email: send_time (HH:MM), recipient_emails (string array)';






