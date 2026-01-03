-- Migration: Add voucher_number, custom_pickup_location to bookings + seed Phuket/Phang Nga hotels
-- Created: 2024

-- 1. Add voucher_number column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voucher_number TEXT;

-- 2. Add custom_pickup_location for non-hotel pickups (7-Eleven, mall, etc.)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS custom_pickup_location TEXT;

-- 3. Seed popular Phuket hotels by area
-- Note: These will be inserted for each company when they first use the system
-- For now, we create a reference table that companies can import from

-- Create a reference hotels table for seeding
CREATE TABLE IF NOT EXISTS reference_hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'Phuket',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Phuket hotels
INSERT INTO reference_hotels (name, area, province) VALUES
-- Patong Beach Area
('Amari Phuket', 'Patong', 'Phuket'),
('Andaman Embrace Patong', 'Patong', 'Phuket'),
('Avista Hideaway Phuket Patong', 'Patong', 'Phuket'),
('Banthai Beach Resort & Spa', 'Patong', 'Phuket'),
('Best Western Patong Beach', 'Patong', 'Phuket'),
('Burasari Phuket', 'Patong', 'Phuket'),
('Centara Blue Marine Resort & Spa', 'Patong', 'Phuket'),
('Deevana Patong Resort & Spa', 'Patong', 'Phuket'),
('Diamond Cliff Resort & Spa', 'Patong', 'Phuket'),
('Duangjitt Resort & Spa', 'Patong', 'Phuket'),
('Four Points by Sheraton Phuket Patong Beach Resort', 'Patong', 'Phuket'),
('Graceland Resort & Spa', 'Patong', 'Phuket'),
('Holiday Inn Express Phuket Patong Beach Central', 'Patong', 'Phuket'),
('Holiday Inn Resort Phuket', 'Patong', 'Phuket'),
('Horizon Patong Beach Resort & Spa', 'Patong', 'Phuket'),
('Impiana Resort Patong Phuket', 'Patong', 'Phuket'),
('La Flora Resort Patong', 'Patong', 'Phuket'),
('Millennium Resort Patong Phuket', 'Patong', 'Phuket'),
('Novotel Phuket Resort', 'Patong', 'Phuket'),
('Patong Bay Hill Resort', 'Patong', 'Phuket'),
('Patong Merlin Hotel', 'Patong', 'Phuket'),
('Phuket Graceland Resort & Spa', 'Patong', 'Phuket'),
('Ramada by Wyndham Phuket Deevana Patong', 'Patong', 'Phuket'),
('Red Planet Patong Phuket', 'Patong', 'Phuket'),
('Royal Paradise Hotel & Spa', 'Patong', 'Phuket'),
('Swissotel Resort Phuket Patong Beach', 'Patong', 'Phuket'),
('The Kee Resort & Spa', 'Patong', 'Phuket'),
('The Nap Patong', 'Patong', 'Phuket'),
('The Royal Palm Beachfront', 'Patong', 'Phuket'),
('Thara Patong Beach Resort & Spa', 'Patong', 'Phuket'),

-- Kata Beach Area
('Beyond Resort Kata', 'Kata', 'Phuket'),
('Centara Kata Resort Phuket', 'Kata', 'Phuket'),
('Club Med Phuket', 'Kata', 'Phuket'),
('Kata Beach Resort & Spa', 'Kata', 'Phuket'),
('Kata Palm Resort & Spa', 'Kata', 'Phuket'),
('Kata Poolside Resort', 'Kata', 'Phuket'),
('Kata Sea Breeze Resort', 'Kata', 'Phuket'),
('Kata Thani Phuket Beach Resort', 'Kata', 'Phuket'),
('Katathani Phuket Beach Resort', 'Kata', 'Phuket'),
('Marina Phuket Resort', 'Kata', 'Phuket'),
('Metadee Resort and Villas', 'Kata', 'Phuket'),
('Mom Tri Villa Royale', 'Kata', 'Phuket'),
('Peach Hill Hotel & Resort', 'Kata', 'Phuket'),
('Sugar Marina Resort - Art', 'Kata', 'Phuket'),
('The Boathouse Phuket', 'Kata', 'Phuket'),
('The Shore at Katathani', 'Kata', 'Phuket'),

-- Karon Beach Area
('Andaman Seaview Hotel', 'Karon', 'Phuket'),
('Centara Grand Beach Resort Phuket', 'Karon', 'Phuket'),
('Centara Villas Phuket', 'Karon', 'Phuket'),
('Hilton Phuket Arcadia Resort & Spa', 'Karon', 'Phuket'),
('Karon Beach Resort', 'Karon', 'Phuket'),
('Karon Princess Hotel', 'Karon', 'Phuket'),
('Karon Sea Sands Resort & Spa', 'Karon', 'Phuket'),
('Le Meridien Phuket Beach Resort', 'Karon', 'Phuket'),
('Movenpick Resort & Spa Karon Beach Phuket', 'Karon', 'Phuket'),
('Novotel Phuket Karon Beach Resort & Spa', 'Karon', 'Phuket'),
('On The Rock Karon', 'Karon', 'Phuket'),
('Sunwing Bangtao Beach', 'Karon', 'Phuket'),
('The Front Village', 'Karon', 'Phuket'),
('Woraburi Phuket Resort & Spa', 'Karon', 'Phuket'),

-- Kamala Beach Area
('Cape Sienna Phuket Gourmet Hotel & Villas', 'Kamala', 'Phuket'),
('Hyatt Regency Phuket Resort', 'Kamala', 'Phuket'),
('InterContinental Phuket Resort', 'Kamala', 'Phuket'),
('Kamala Beach Resort', 'Kamala', 'Phuket'),
('Novotel Phuket Kamala Beach', 'Kamala', 'Phuket'),
('Paresa Resort Phuket', 'Kamala', 'Phuket'),
('Sunprime Kamala Beach Resort', 'Kamala', 'Phuket'),
('Swissotel Kamala Beach Phuket', 'Kamala', 'Phuket'),
('The Andaman Beach Hotel', 'Kamala', 'Phuket'),

-- Surin Beach Area
('Amanpuri', 'Surin', 'Phuket'),
('Baan Kilee', 'Surin', 'Phuket'),
('Chava Resort', 'Surin', 'Phuket'),
('Manathai Surin Phuket', 'Surin', 'Phuket'),
('Surin Beach Resort', 'Surin', 'Phuket'),
('The Surin Phuket', 'Surin', 'Phuket'),
('Twin Palms Phuket', 'Surin', 'Phuket'),

-- Bang Tao Beach Area
('Angsana Laguna Phuket', 'Bang Tao', 'Phuket'),
('Banyan Tree Phuket', 'Bang Tao', 'Phuket'),
('Cassia Phuket', 'Bang Tao', 'Phuket'),
('Dusit Thani Laguna Phuket', 'Bang Tao', 'Phuket'),
('Laguna Holiday Club Phuket Resort', 'Bang Tao', 'Phuket'),
('Outrigger Laguna Phuket Beach Resort', 'Bang Tao', 'Phuket'),
('SAii Laguna Phuket', 'Bang Tao', 'Phuket'),
('Sunwing Bangtao Beach', 'Bang Tao', 'Phuket'),
('The Pavilions Phuket', 'Bang Tao', 'Phuket'),
('Twinpalms MontAzure', 'Bang Tao', 'Phuket'),

-- Nai Harn / Rawai Area
('All Seasons Naiharn Phuket', 'Nai Harn', 'Phuket'),
('Naiharn Beach Resort', 'Nai Harn', 'Phuket'),
('The Nai Harn', 'Nai Harn', 'Phuket'),
('Wyndham Grand Nai Harn Beach Phuket', 'Nai Harn', 'Phuket'),
('Rawai Palm Beach Resort', 'Rawai', 'Phuket'),
('Serenity Resort & Residences Phuket', 'Rawai', 'Phuket'),

-- Mai Khao Beach Area
('Anantara Mai Khao Phuket Villas', 'Mai Khao', 'Phuket'),
('JW Marriott Phuket Resort & Spa', 'Mai Khao', 'Phuket'),
('SALA Phuket Mai Khao Beach Resort', 'Mai Khao', 'Phuket'),
('Renaissance Phuket Resort & Spa', 'Mai Khao', 'Phuket'),
('The Slate', 'Mai Khao', 'Phuket'),

-- Nai Yang Beach Area
('Dewa Phuket Resort & Villas', 'Nai Yang', 'Phuket'),
('Holiday Inn Resort Phuket Mai Khao Beach', 'Nai Yang', 'Phuket'),
('Nai Yang Beach Resort', 'Nai Yang', 'Phuket'),
('Pullman Phuket Arcadia Naithon Beach', 'Nai Yang', 'Phuket'),

-- Phuket Town Area
('Casa Blanca Boutique Hotel', 'Phuket Town', 'Phuket'),
('Metropole Hotel Phuket', 'Phuket Town', 'Phuket'),
('On On Hotel', 'Phuket Town', 'Phuket'),
('Royal Phuket City Hotel', 'Phuket Town', 'Phuket'),
('The Memory at On On Hotel', 'Phuket Town', 'Phuket'),

-- Phang Nga Province Hotels
('Aleenta Phuket Resort & Spa', 'Natai Beach', 'Phang Nga'),
('Aman Nai', 'Phang Nga Bay', 'Phang Nga'),
('Baba Beach Club Phuket', 'Natai Beach', 'Phang Nga'),
('JW Marriott Khao Lak Resort & Spa', 'Khao Lak', 'Phang Nga'),
('Khao Lak Emerald Beach Resort & Spa', 'Khao Lak', 'Phang Nga'),
('La Flora Khao Lak', 'Khao Lak', 'Phang Nga'),
('Le Meridien Khao Lak Resort & Spa', 'Khao Lak', 'Phang Nga'),
('Pullman Khao Lak Resort', 'Khao Lak', 'Phang Nga'),
('Ramada Resort Khao Lak', 'Khao Lak', 'Phang Nga'),
('Sensimar Khao Lak Beachfront Resort', 'Khao Lak', 'Phang Nga'),
('The Sarojin', 'Khao Lak', 'Phang Nga'),
('X10 Khao Lak Resort', 'Khao Lak', 'Phang Nga')

ON CONFLICT DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reference_hotels_name ON reference_hotels(name);
CREATE INDEX IF NOT EXISTS idx_reference_hotels_area ON reference_hotels(area);
CREATE INDEX IF NOT EXISTS idx_reference_hotels_province ON reference_hotels(province);

-- Create index for voucher_number lookups
CREATE INDEX IF NOT EXISTS idx_bookings_voucher_number ON bookings(voucher_number) WHERE voucher_number IS NOT NULL;












