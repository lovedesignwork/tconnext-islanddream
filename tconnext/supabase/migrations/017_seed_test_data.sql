-- Migration: Seed Test Data Template
-- This migration is a TEMPLATE for seeding test/demo data
-- It should be customized and run manually for each customer setup if needed

-- The original migration created:
-- - 15 drivers with unique link IDs
-- - 7 agents with 3-5 staff each
-- - 200 sample bookings for a date range

-- To create test data for a customer, customize the script below with:
-- 1. Replace the company_id with the actual company UUID
-- 2. Modify driver names, phones, and vehicle info as needed
-- 3. Adjust booking date ranges as needed

-- Note: This script is commented out by default
-- Uncomment and modify for testing purposes only

/*
-- Example: Insert a sample driver
INSERT INTO drivers (company_id, name, phone, whatsapp, vehicle_info, status, access_pin, unique_link_id)
VALUES (
    '<your_company_id>',
    'Sample Driver',
    '+66812345000',
    '+66812345000',
    'Toyota Innova (White)',
    'active',
    '1234',
    'driver-sample-001'
);

-- Example: Insert a sample agent with staff
DO $$
DECLARE
    v_agent_id UUID;
BEGIN
    INSERT INTO agents (company_id, name, contact_person, email, phone, whatsapp, status, agent_type, notes)
    VALUES ('<your_company_id>', 'Sample Agency', 'Contact Person', 'agency@example.com', '+66890000000', '+66890000000', 'active', 'partner', 'Sample partner agent')
    RETURNING id INTO v_agent_id;
    
    INSERT INTO agent_staff (agent_id, full_name, nickname, phone, status) VALUES
        (v_agent_id, 'Staff Member 1', 'Staff1', '+66890000001', 'active'),
        (v_agent_id, 'Staff Member 2', 'Staff2', '+66890000002', 'active');
END $$;
*/
