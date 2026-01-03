-- =====================================================
-- Island Dream Exploration - Add Sample Data (FIXED)
-- =====================================================
-- Run this in Supabase SQL Editor to populate your dashboard
-- This version works with the current schema
-- =====================================================

-- =====================================================
-- STEP 1: Add Sample Programs (Tours/Activities)
-- =====================================================

INSERT INTO programs (company_id, name, description, duration, base_price, status, created_at)
VALUES 
    -- Island Tours
    ('00000000-0000-0000-0000-000000000001', 
     'Phi Phi Islands Day Trip', 
     'Visit the stunning Phi Phi Islands with snorkeling, swimming, and lunch on the beach. Includes Maya Bay, Pileh Lagoon, and Viking Cave.',
     'Full Day', 
     2800, 
     'active', 
     NOW()),
    
    ('00000000-0000-0000-0000-000000000001',
     'James Bond Island Tour',
     'Explore the famous James Bond Island (Khao Phing Kan) and Phang Nga Bay by longtail boat. Includes sea canoeing and lunch.',
     'Full Day',
     2500,
     'active',
     NOW()),
    
    ('00000000-0000-0000-0000-000000000001',
     'Similan Islands Snorkeling',
     'Premium snorkeling trip to the pristine Similan Islands. Crystal clear waters and amazing marine life.',
     'Full Day',
     3500,
     'active',
     NOW()),
    
    -- Sunset & Evening Tours
    ('00000000-0000-0000-0000-000000000001',
     'Sunset Cruise with Dinner',
     'Romantic sunset cruise around Phuket with Thai dinner buffet and live music.',
     'Half Day',
     1800,
     'active',
     NOW()),
    
    ('00000000-0000-0000-0000-000000000001',
     'Phang Nga Bay Sunset Kayaking',
     'Kayak through limestone caves and lagoons at sunset. Includes dinner.',
     'Half Day',
     2200,
     'active',
     NOW()),
    
    -- Water Activities
    ('00000000-0000-0000-0000-000000000001',
     'Scuba Diving - 2 Dives',
     'Certified diving trip to the best dive sites around Phuket. Equipment and lunch included.',
     'Full Day',
     3800,
     'active',
     NOW()),
    
    ('00000000-0000-0000-0000-000000000001',
     'Discover Scuba Diving',
     'Try diving for the first time with professional instructors. No experience needed.',
     'Half Day',
     2800,
     'active',
     NOW()),
    
    ('00000000-0000-0000-0000-000000000001',
     'Speedboat Island Hopping',
     'Visit 4 islands by speedboat: Coral Island, Racha Island, Maiton Island. Snorkeling and lunch.',
     'Full Day',
     3200,
     'active',
     NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 2: Add Sample Hotels (Pickup Locations)
-- =====================================================

INSERT INTO hotels (company_id, name, area, address, pickup_notes, created_at)
VALUES 
    -- Patong Area
    ('00000000-0000-0000-0000-000000000001', 'Patong Beach Hotel', 'Patong', '123 Beach Road, Patong', 'Pickup at main lobby, 08:00 AM', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Amari Phuket', 'Patong', '2 Meun-Ngern Road', 'Pickup at hotel entrance', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Novotel Phuket Vintage Park', 'Patong', '181/1 Soi Sainamyen', 'Pickup at reception area', NOW()),
    
    -- Kata/Karon Area
    ('00000000-0000-0000-0000-000000000001', 'Kata Beach Resort', 'Kata', '1 Kata Road', 'Pickup at main entrance', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Centara Grand Beach Resort', 'Karon', '683 Patak Road', 'Pickup at lobby', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'The Shore at Katathani', 'Kata Noi', '14 Kata Noi Road', 'Pickup at reception', NOW()),
    
    -- Bang Tao/Laguna Area
    ('00000000-0000-0000-0000-000000000001', 'Angsana Laguna Phuket', 'Bang Tao', '10 Moo 4 Srisoonthorn Road', 'Pickup at main lobby', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Dusit Thani Laguna', 'Bang Tao', '390 Srisoonthorn Road', 'Pickup at entrance', NOW()),
    
    -- Phuket Town
    ('00000000-0000-0000-0000-000000000001', 'The Memory at On On Hotel', 'Phuket Town', '19 Phang Nga Road', 'Pickup at hotel front', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Sino House', 'Phuket Town', '1 Montri Road', 'Pickup at reception', NOW()),
    
    -- Rawai/Nai Harn
    ('00000000-0000-0000-0000-000000000001', 'The Nai Harn', 'Nai Harn', '23/3 Moo 1 Viset Road', 'Pickup at main entrance', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Rawai Beach Front', 'Rawai', '45 Viset Road', 'Pickup at lobby', NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 3: Add Sample Agents (Travel Agencies)
-- =====================================================
-- Note: Using only columns that exist in current schema

INSERT INTO agents (company_id, name, contact_person, email, phone, status, created_at)
VALUES 
    -- Local Agents
    ('00000000-0000-0000-0000-000000000001', 
     'Phuket Travel Center', 
     'Somchai Tanaka', 
     'somchai@phukettravel.com', 
     '+66812345678', 
     'active',
     NOW()),
    
    ('00000000-0000-0000-0000-000000000001',
     'Andaman Tours & Travel',
     'Nisa Pattana',
     'nisa@andamantours.com',
     '+66823456789',
     'active',
     NOW()),
    
    ('00000000-0000-0000-0000-000000000001',
     'Island Paradise Agency',
     'Preecha Wong',
     'preecha@islandparadise.com',
     '+66834567890',
     'active',
     NOW()),
    
    -- International Agents
    ('00000000-0000-0000-0000-000000000001',
     'China Travel Service',
     'Wei Zhang',
     'wei@chinatravel.com',
     '+86138000000',
     'active',
     NOW()),
    
    ('00000000-0000-0000-0000-000000000001',
     'European Adventures',
     'Hans Mueller',
     'hans@euroadventures.com',
     '+49170000000',
     'active',
     NOW()),
    
    -- Direct/Walk-in
    ('00000000-0000-0000-0000-000000000001',
     'Direct Booking',
     'Walk-in Customer',
     'info@islanddreamexploration.com',
     '+66800000000',
     'active',
     NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 4: Add Sample Drivers
-- =====================================================

INSERT INTO drivers (company_id, name, phone, status, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Somchai Phuket', '+66845678901', 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Niran Chaiyaporn', '+66856789012', 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Prasert Somboon', '+66867890123', 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Wichai Tanaka', '+66878901234', 'active', NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 5: Add Sample Guides
-- =====================================================

INSERT INTO guides (company_id, name, phone, languages, status, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Sarah Johnson', '+66889012345', 'English, Thai', 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'David Chen', '+66890123456', 'English, Chinese, Thai', 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Anong Suwan', '+66801234567', 'Thai, English, Japanese', 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Marco Rossi', '+66812345670', 'English, Italian, Thai', 'active', NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 6: Verify Data Was Added
-- =====================================================

SELECT 'Island Dream Exploration - Sample Data Added Successfully!' AS result;

-- Show summary
SELECT 
    'Programs' AS category, 
    COUNT(*) AS count 
FROM programs 
WHERE company_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'Hotels' AS category, 
    COUNT(*) AS count 
FROM hotels 
WHERE company_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'Agents' AS category, 
    COUNT(*) AS count 
FROM agents 
WHERE company_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'Drivers' AS category, 
    COUNT(*) AS count 
FROM drivers 
WHERE company_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'Guides' AS category, 
    COUNT(*) AS count 
FROM guides 
WHERE company_id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- DONE! Refresh your dashboard to see the data
-- =====================================================
-- Dashboard URL: https://www.islanddreamexploration.live/dashboard

