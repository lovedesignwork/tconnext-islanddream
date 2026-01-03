-- =====================================================
-- Simple Sample Data for Island Dream Exploration
-- =====================================================
-- This uses only the most basic columns that definitely exist
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add Programs (Tours)
INSERT INTO programs (company_id, name, description, duration, base_price, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Phi Phi Islands Day Trip', 'Visit stunning Phi Phi Islands with snorkeling and lunch', 'Full Day', 2800, 'active'),
    ('00000000-0000-0000-0000-000000000001', 'James Bond Island Tour', 'Explore James Bond Island and Phang Nga Bay', 'Full Day', 2500, 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Sunset Cruise', 'Romantic sunset cruise with dinner', 'Half Day', 1800, 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Scuba Diving', 'Diving trip with equipment and lunch', 'Full Day', 3800, 'active')
ON CONFLICT DO NOTHING;

-- Add Hotels (Pickup Locations)
INSERT INTO hotels (company_id, name, area, address)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Patong Beach Hotel', 'Patong', '123 Beach Road'),
    ('00000000-0000-0000-0000-000000000001', 'Kata Beach Resort', 'Kata', '456 Kata Road'),
    ('00000000-0000-0000-0000-000000000001', 'Laguna Phuket', 'Bang Tao', '789 Laguna Road'),
    ('00000000-0000-0000-0000-000000000001', 'Phuket Town Hotel', 'Phuket Town', '321 Town Street')
ON CONFLICT DO NOTHING;

-- Add Agents (Travel Agencies)
INSERT INTO agents (company_id, name, contact_person, email, phone, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Phuket Travel Center', 'Somchai T.', 'info@phukettravel.com', '+66812345678', 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Island Paradise Tours', 'Nisa P.', 'nisa@islandparadise.com', '+66823456789', 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Direct Customer', 'Walk-in', 'info@islanddream.com', '+66800000000', 'active')
ON CONFLICT DO NOTHING;

-- Add Drivers (with PIN codes)
INSERT INTO drivers (company_id, name, phone, access_pin, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Somchai Driver', '+66845678901', '1234', 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Niran Transport', '+66856789012', '5678', 'active')
ON CONFLICT DO NOTHING;

-- Add Guides (with PIN codes)
INSERT INTO guides (company_id, name, phone, access_pin, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Sarah Guide', '+66889012345', '1111', 'active'),
    ('00000000-0000-0000-0000-000000000001', 'David Tour', '+66890123456', '2222', 'active')
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'Sample data added successfully!' AS result;

SELECT 
    'Programs' AS type, COUNT(*) AS count FROM programs WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Hotels', COUNT(*) FROM hotels WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Agents', COUNT(*) FROM agents WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Drivers', COUNT(*) FROM drivers WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Guides', COUNT(*) FROM guides WHERE company_id = '00000000-0000-0000-0000-000000000001';

