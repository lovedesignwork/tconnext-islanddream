-- =====================================================
-- Minimal Sample Data - Island Dream Exploration
-- =====================================================
-- This adds only the essential data to get started
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add Programs (Tours) - These should work!
INSERT INTO programs (company_id, name, description, duration, base_price, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Phi Phi Islands Day Trip', 'Visit stunning Phi Phi Islands with snorkeling and lunch', 'Full Day', 2800, 'active'),
    ('00000000-0000-0000-0000-000000000001', 'James Bond Island Tour', 'Explore James Bond Island and Phang Nga Bay', 'Full Day', 2500, 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Sunset Cruise', 'Romantic sunset cruise with dinner', 'Half Day', 1800, 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Scuba Diving Adventure', 'Diving trip with equipment and lunch', 'Full Day', 3800, 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Similan Islands', 'Premium snorkeling at Similan Islands', 'Full Day', 3500, 'active')
ON CONFLICT DO NOTHING;

-- Add Hotels (Pickup Locations)
INSERT INTO hotels (company_id, name, area, address)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Patong Beach Hotel', 'Patong', '123 Beach Road, Patong'),
    ('00000000-0000-0000-0000-000000000001', 'Kata Beach Resort', 'Kata', '456 Kata Road, Kata Beach'),
    ('00000000-0000-0000-0000-000000000001', 'Laguna Phuket', 'Bang Tao', '789 Laguna Road, Bang Tao'),
    ('00000000-0000-0000-0000-000000000001', 'Phuket Town Hotel', 'Phuket Town', '321 Town Street'),
    ('00000000-0000-0000-0000-000000000001', 'Rawai Beach Resort', 'Rawai', '555 Rawai Beach Road'),
    ('00000000-0000-0000-0000-000000000001', 'Karon View Resort', 'Karon', '888 Karon Hill')
ON CONFLICT DO NOTHING;

-- Add Agents (Travel Agencies)
INSERT INTO agents (company_id, name, contact_person, email, phone, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Phuket Travel Center', 'Somchai Tanaka', 'info@phukettravel.com', '+66812345678', 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Island Paradise Tours', 'Nisa Pattana', 'nisa@islandparadise.com', '+66823456789', 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Andaman Travel', 'Preecha Wong', 'info@andamantravel.com', '+66834567890', 'active'),
    ('00000000-0000-0000-0000-000000000001', 'Direct Customer', 'Walk-in', 'info@islanddreamexploration.com', '+66800000000', 'active')
ON CONFLICT DO NOTHING;

-- Skip drivers and guides for now - they have complex requirements
-- You can add them manually through the app later

-- Verify what was added
SELECT 'Sample data added successfully!' AS result;

SELECT 
    'Programs' AS type, COUNT(*) AS count FROM programs WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Hotels', COUNT(*) FROM hotels WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Agents', COUNT(*) FROM agents WHERE company_id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- DONE! Now refresh your dashboard
-- =====================================================
-- You should now be able to create bookings!
-- Dashboard: https://www.islanddreamexploration.live/dashboard
--
-- To add drivers and guides, use the app interface:
-- - Go to /drivers page and click "Add Driver"
-- - Go to /guides page and click "Add Guide"

