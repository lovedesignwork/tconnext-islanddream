-- Migration: Add last modified tracking to bookings and invoices
-- This adds columns to track who last modified a record and when

-- Add last_modified_by to bookings table
-- This will store the user ID (from users table) or name of who last modified the booking
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_modified_by_name VARCHAR(255);

-- Add last_modified_by to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_modified_by_name VARCHAR(255);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_last_modified_by ON bookings(last_modified_by);
CREATE INDEX IF NOT EXISTS idx_invoices_last_modified_by ON invoices(last_modified_by);

-- Comment on columns for documentation
COMMENT ON COLUMN bookings.last_modified_by IS 'User ID who last modified this booking';
COMMENT ON COLUMN bookings.last_modified_by_name IS 'Name of user who last modified this booking (denormalized for display)';
COMMENT ON COLUMN invoices.last_modified_by IS 'User ID who last modified this invoice';
COMMENT ON COLUMN invoices.last_modified_by_name IS 'Name of user who last modified this invoice (denormalized for display)';






