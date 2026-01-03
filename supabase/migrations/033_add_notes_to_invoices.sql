-- Migration: Add notes column to invoices table
-- This column was referenced in the code but missing from the schema

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS notes TEXT;







