-- Add invoice_id to bookings table for tracking invoiced status
-- This allows quick filtering of bookings that haven't been invoiced yet

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Create index for faster queries on invoice_id
CREATE INDEX IF NOT EXISTS idx_bookings_invoice_id ON bookings(invoice_id);

-- Add notes field to invoices for additional information
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS notes TEXT;







