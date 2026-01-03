-- TConnext Seed Data Template
-- This file is a TEMPLATE - the actual data is created during customer setup
-- 
-- To set up a new customer:
-- 1. Create an auth user in Supabase Auth dashboard
-- 2. Run the INSERT statements below with actual values

-- =====================================================
-- TEMPLATE: Replace values and uncomment when setting up
-- =====================================================

-- Step 1: Create the company
-- INSERT INTO companies (id, name, slug, initials, settings, subscription_status)
-- VALUES (
--     '00000000-0000-0000-0000-000000000001',
--     'Your Company Name',
--     'your-company',
--     'YC',
--     '{
--         "branding": {
--             "primary_color": "#0EA5E9",
--             "secondary_color": "#06B6D4"
--         },
--         "email": {
--             "from_name": "Your Company Name",
--             "reply_to": "contact@yourcompany.com",
--             "footer_text": "Thank you for choosing Your Company Name!"
--         }
--     }',
--     'active'
-- );

-- Step 2: After creating auth user, link it to the company
-- INSERT INTO users (auth_id, company_id, role, permissions, name, email)
-- VALUES (
--     '<auth_user_id_from_supabase_auth>',
--     '00000000-0000-0000-0000-000000000001',
--     'master_admin',
--     '{}',
--     'Admin Name',
--     'admin@yourcompany.com'
-- );

-- =====================================================
-- OPTIONAL: Sample data for testing/demo purposes
-- =====================================================

-- Sample programs
-- INSERT INTO programs (company_id, name, description, duration, base_price, status)
-- VALUES 
--     ('00000000-0000-0000-0000-000000000001', 'Sample Tour 1', 'Description', 'Full Day', 2500, 'active');

-- Sample hotels
-- INSERT INTO hotels (company_id, name, area, address, pickup_notes)
-- VALUES 
--     ('00000000-0000-0000-0000-000000000001', 'Sample Hotel', 'Area 1', 'Address', 'Pickup at lobby');

-- Sample agents
-- INSERT INTO agents (company_id, name, contact_person, email, phone, status)
-- VALUES 
--     ('00000000-0000-0000-0000-000000000001', 'Sample Agent', 'Contact', 'agent@example.com', '+66800000000', 'active');
