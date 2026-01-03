-- ============================================
-- ADD STARTER DATA TO YOUR APP
-- Run this in Supabase SQL Editor
-- ============================================

-- This will add sample data so you can start using the app:
-- - Sample programs (tours)
-- - Sample hotels (pickup locations)
-- - Sample agents (travel agencies)

-- Add sample programs (tours/activities)
INSERT INTO programs (company_id, name, description, duration, base_price, status, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Island Hopping Tour', 'Visit beautiful islands with snorkeling and lunch', 'Full Day', 2500, 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Sunset Cruise', 'Romantic sunset cruise with dinner', 'Half Day', 1800, 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Diving Experience', 'Scuba diving for beginners and certified divers', 'Full Day', 3500, 'active', NOW())
ON CONFLICT DO NOTHING;

-- Add sample hotels (pickup locations)
INSERT INTO hotels (company_id, name, area, address, pickup_notes, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Beach Resort Hotel', 'Patong Beach', '123 Beach Road', 'Pickup at main lobby', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Mountain View Hotel', 'Kata Beach', '456 Hill Street', 'Pickup at reception', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'City Center Hotel', 'Phuket Town', '789 Main Street', 'Pickup at entrance', NOW())
ON CONFLICT DO NOTHING;

-- Add sample agents (travel agencies)
INSERT INTO agents (company_id, name, contact_person, email, phone, status, agent_type, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Island Dreams Travel', 'John Smith', 'john@islanddreams.com', '+66812345678', 'active', 'agent', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Paradise Tours', 'Jane Doe', 'jane@paradisetours.com', '+66823456789', 'active', 'agent', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Direct Customer', 'Walk-in', 'info@islanddreamexploration.com', '+66834567890', 'active', 'direct', NOW())
ON CONFLICT DO NOTHING;

-- Add sample drivers
INSERT INTO drivers (company_id, name, nickname, phone, car_type, car_capacity, status, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Mike Driver', 'Mike', '+66845678901', 'Van', 10, 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Tom Transport', 'Tom', '+66856789012', 'Minibus', 15, 'active', NOW())
ON CONFLICT DO NOTHING;

-- Add sample guides
INSERT INTO guides (company_id, name, phone, languages, status, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Sarah Guide', '+66867890123', 'English, Thai', 'active', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'David Tour', '+66878901234', 'English, Chinese, Thai', 'active', NOW())
ON CONFLICT DO NOTHING;

-- Verify data was added
SELECT 'Starter data added successfully!' AS result;

-- Show what was created
SELECT 'Programs:' AS category, COUNT(*) AS count FROM programs WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Hotels:' AS category, COUNT(*) AS count FROM hotels WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Agents:' AS category, COUNT(*) AS count FROM agents WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Drivers:' AS category, COUNT(*) AS count FROM drivers WHERE company_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Guides:' AS category, COUNT(*) AS count FROM guides WHERE company_id = '00000000-0000-0000-0000-000000000001';

