-- Run this SQL in Supabase SQL Editor to insert sample bookings
-- Make sure you have programs, hotels, and agents already inserted

DO $$
DECLARE
    v_program_phi_phi UUID;
    v_program_james_bond UUID;
    v_program_similan UUID;
    v_program_sunset UUID;
    v_hotel_patong UUID;
    v_hotel_holiday UUID;
    v_hotel_kata UUID;
    v_hotel_karon UUID;
    v_agent_thailand UUID;
    v_agent_phuket UUID;
    v_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Get program IDs
    SELECT id INTO v_program_phi_phi FROM programs WHERE company_id = v_company_id AND name = 'Phi Phi Island Tour';
    SELECT id INTO v_program_james_bond FROM programs WHERE company_id = v_company_id AND name = 'James Bond Island';
    SELECT id INTO v_program_similan FROM programs WHERE company_id = v_company_id AND name = 'Similan Islands';
    SELECT id INTO v_program_sunset FROM programs WHERE company_id = v_company_id AND name = 'Sunset Dinner Cruise';
    
    -- Get hotel IDs
    SELECT id INTO v_hotel_patong FROM hotels WHERE company_id = v_company_id AND name = 'Patong Beach Hotel';
    SELECT id INTO v_hotel_holiday FROM hotels WHERE company_id = v_company_id AND name = 'Holiday Inn Phuket';
    SELECT id INTO v_hotel_kata FROM hotels WHERE company_id = v_company_id AND name = 'Kata Beach Resort';
    SELECT id INTO v_hotel_karon FROM hotels WHERE company_id = v_company_id AND name = 'Karon Sea Sands';
    
    -- Get agent IDs
    SELECT id INTO v_agent_thailand FROM agents WHERE company_id = v_company_id AND name = 'Thailand Tours Co.';
    SELECT id INTO v_agent_phuket FROM agents WHERE company_id = v_company_id AND name = 'Phuket Adventures';

    -- Check if we have the required data
    IF v_program_phi_phi IS NULL THEN
        RAISE NOTICE 'Programs not found. Please run seed data first.';
        RETURN;
    END IF;
    
    IF v_hotel_patong IS NULL THEN
        RAISE NOTICE 'Hotels not found. Please run seed data first.';
        RETURN;
    END IF;

    -- Delete existing sample bookings (optional - comment out if you want to keep existing)
    DELETE FROM bookings WHERE company_id = v_company_id AND booking_number LIKE 'IDE-%';

    -- Insert sample bookings
    INSERT INTO bookings (company_id, booking_number, booking_date, program_id, hotel_id, agent_id, customer_name, customer_email, customer_whatsapp, adults, children, infants, room_number, pickup_time, notes, collect_money, status, is_direct_booking)
    VALUES
        -- Today's bookings (3 confirmed)
        (v_company_id, 'IDE-000001', CURRENT_DATE, v_program_phi_phi, v_hotel_patong, v_agent_thailand, 'John Smith', 'john.smith@email.com', '+66891112233', 2, 1, 0, '302', '07:30', 'Vegetarian meal requested', 0, 'confirmed', false),
        (v_company_id, 'IDE-000002', CURRENT_DATE, v_program_james_bond, v_hotel_holiday, v_agent_phuket, 'Sarah Johnson', 'sarah.j@email.com', '+66892223344', 2, 0, 0, '115', '08:00', NULL, 1500, 'confirmed', false),
        (v_company_id, 'IDE-000003', CURRENT_DATE, v_program_phi_phi, v_hotel_kata, NULL, 'Michael Chen', 'michael.chen@email.com', '+66893334455', 4, 2, 1, '201', '07:45', 'Birthday celebration', 0, 'confirmed', true),
        
        -- Tomorrow's bookings (2 pending)
        (v_company_id, 'IDE-000004', CURRENT_DATE + 1, v_program_sunset, v_hotel_karon, v_agent_thailand, 'Emma Wilson', 'emma.w@email.com', '+66894445566', 2, 0, 0, '405', NULL, 'Anniversary dinner', 0, 'pending', false),
        (v_company_id, 'IDE-000005', CURRENT_DATE + 1, v_program_phi_phi, v_hotel_patong, v_agent_phuket, 'David Brown', 'david.b@email.com', '+66895556677', 3, 1, 0, '512', NULL, NULL, 2000, 'pending', false),
        
        -- Future bookings
        (v_company_id, 'IDE-000006', CURRENT_DATE + 3, v_program_similan, v_hotel_holiday, NULL, 'Lisa Anderson', 'lisa.a@email.com', '+66896667788', 2, 0, 0, '308', NULL, 'Diving certified', 0, 'confirmed', true),
        (v_company_id, 'IDE-000007', CURRENT_DATE + 5, v_program_james_bond, v_hotel_kata, v_agent_thailand, 'Robert Taylor', 'robert.t@email.com', '+66897778899', 4, 2, 0, '102', NULL, 'Seafood allergy', 3500, 'pending', false),
        (v_company_id, 'IDE-000008', CURRENT_DATE + 7, v_program_phi_phi, v_hotel_karon, v_agent_phuket, 'Jennifer Martinez', 'jennifer.m@email.com', '+66898889900', 2, 1, 1, '220', NULL, NULL, 0, 'confirmed', false),
        
        -- Past bookings (completed)
        (v_company_id, 'IDE-000009', CURRENT_DATE - 1, v_program_sunset, v_hotel_patong, v_agent_thailand, 'William Davis', 'william.d@email.com', '+66899990011', 2, 0, 0, '601', '17:30', NULL, 0, 'completed', false),
        (v_company_id, 'IDE-000010', CURRENT_DATE - 2, v_program_phi_phi, v_hotel_holiday, NULL, 'Amanda White', 'amanda.w@email.com', '+66890001122', 3, 2, 0, '415', '07:30', 'Child seat needed', 0, 'completed', true),
        (v_company_id, 'IDE-000011', CURRENT_DATE - 3, v_program_james_bond, v_hotel_kata, v_agent_phuket, 'James Miller', 'james.m@email.com', '+66891122334', 2, 0, 0, '303', '08:15', NULL, 1000, 'completed', false),
        
        -- Cancelled booking
        (v_company_id, 'IDE-000012', CURRENT_DATE + 2, v_program_similan, v_hotel_karon, v_agent_thailand, 'Patricia Garcia', 'patricia.g@email.com', '+66892233445', 2, 1, 0, '118', NULL, 'Weather concerns', 0, 'cancelled', false);
    
    -- Update company booking sequence
    UPDATE companies SET booking_sequence = 12 WHERE id = v_company_id;
    
    RAISE NOTICE 'Successfully inserted 12 sample bookings!';
END $$;

-- Verify the data
SELECT 
    booking_number,
    booking_date,
    customer_name,
    adults,
    children,
    status
FROM bookings 
WHERE company_id = '00000000-0000-0000-0000-000000000001'
ORDER BY booking_number;












