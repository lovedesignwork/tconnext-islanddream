-- Add due date columns to invoices table
ALTER TABLE invoices
ADD COLUMN due_date DATE,
ADD COLUMN due_days INT;

-- Add comment for clarity
COMMENT ON COLUMN invoices.due_date IS 'The date by which payment is due';
COMMENT ON COLUMN invoices.due_days IS 'Number of days from creation until due (1, 3, 7, 14, 21, 30, 45, 60)';






