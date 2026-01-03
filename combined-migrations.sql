-- ============================================
-- COMBINED MIGRATIONS FOR TCONNEXT
-- Generated: 2026-01-03 21:12:40
-- Total Migrations: 53
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute all migrations
--
-- ============================================


-- ============================================
-- MIGRATION: 001_initial_schema.sql
-- ============================================

-- TConnext Database Schema
-- Initial migration with all core tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Companies table (tenants)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    initials VARCHAR(10) NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_status VARCHAR(50) DEFAULT 'active',
    booking_sequence INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('master_admin', 'staff')),
    permissions JSONB DEFAULT '{}',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration VARCHAR(100),
    base_price DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program availability table
CREATE TABLE IF NOT EXISTS program_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_open BOOLEAN DEFAULT true,
    total_slots INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id, date)
);

-- Hotels (pickup locations) table
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    area VARCHAR(100) NOT NULL,
    address TEXT,
    pickup_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent pricing table
CREATE TABLE IF NOT EXISTS agent_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    selling_price DECIMAL(10, 2) NOT NULL,
    agent_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, program_id)
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    vehicle_info VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    access_pin VARCHAR(255) NOT NULL,
    unique_link_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boats table
CREATE TABLE IF NOT EXISTS boats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    captain_name VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    booking_number VARCHAR(20) NOT NULL,
    activity_date DATE NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_whatsapp VARCHAR(50),
    adults INT DEFAULT 0,
    children INT DEFAULT 0,
    infants INT DEFAULT 0,
    hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
    room_number VARCHAR(50),
    pickup_time TIME,
    notes TEXT,
    collect_money DECIMAL(10, 2) DEFAULT 0,
    internal_remarks TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'cancelled', 'completed')),
    is_direct_booking BOOLEAN DEFAULT false,
    stripe_payment_id VARCHAR(255),
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    boat_id UUID REFERENCES boats(id) ON DELETE SET NULL,
    pickup_email_sent BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, booking_number)
);

-- Booking attachments table
CREATE TABLE IF NOT EXISTS booking_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, invoice_number)
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_programs_company_id ON programs(company_id);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_program_availability_program_id ON program_availability(program_id);
CREATE INDEX IF NOT EXISTS idx_program_availability_date ON program_availability(date);
CREATE INDEX IF NOT EXISTS idx_hotels_company_id ON hotels(company_id);
CREATE INDEX IF NOT EXISTS idx_hotels_area ON hotels(area);
CREATE INDEX IF NOT EXISTS idx_agents_company_id ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_unique_link_id ON drivers(unique_link_id);
CREATE INDEX IF NOT EXISTS idx_boats_company_id ON boats(company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_company_id ON bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_activity_date ON bookings(activity_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_program_id ON bookings(program_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_boat_id ON bookings(boat_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_agent_id ON invoices(agent_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_program_availability_updated_at BEFORE UPDATE ON program_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_pricing_updated_at BEFORE UPDATE ON agent_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boats_updated_at BEFORE UPDATE ON boats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_booking_attachments_updated_at BEFORE UPDATE ON booking_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate next booking number
CREATE OR REPLACE FUNCTION generate_booking_number(p_company_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_initials VARCHAR(10);
    v_sequence INT;
    v_booking_number VARCHAR(20);
BEGIN
    -- Get company initials and increment sequence
    UPDATE companies 
    SET booking_sequence = booking_sequence + 1
    WHERE id = p_company_id
    RETURNING initials, booking_sequence INTO v_initials, v_sequence;
    
    -- Generate booking number
    v_booking_number := v_initials || '-' || LPAD(v_sequence::TEXT, 6, '0');
    
    RETURN v_booking_number;
END;
$$ LANGUAGE plpgsql;











-- ============================================
-- MIGRATION: 002_rls_policies.sql
-- ============================================

-- TConnext Row Level Security Policies
-- Enable RLS on all tables

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id 
        FROM users 
        WHERE auth_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'super_admin' 
        FROM users 
        WHERE auth_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Companies policies
-- Super admin can see all companies
CREATE POLICY "Super admin can view all companies" ON companies
    FOR SELECT
    TO authenticated
    USING (is_super_admin());

-- Super admin can manage companies
CREATE POLICY "Super admin can manage companies" ON companies
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Users can view their own company
CREATE POLICY "Users can view own company" ON companies
    FOR SELECT
    TO authenticated
    USING (id = get_user_company_id());

-- Users policies
-- Super admin can view all users
CREATE POLICY "Super admin can view all users" ON users
    FOR SELECT
    TO authenticated
    USING (is_super_admin());

-- Users can view users in their company
CREATE POLICY "Users can view own company users" ON users
    FOR SELECT
    TO authenticated
    USING (company_id = get_user_company_id());

-- Super admin and master admin can manage users
CREATE POLICY "Admin can manage users" ON users
    FOR ALL
    TO authenticated
    USING (
        is_super_admin() OR 
        (company_id = get_user_company_id() AND (
            SELECT role FROM users WHERE auth_id = auth.uid()
        ) = 'master_admin')
    )
    WITH CHECK (
        is_super_admin() OR 
        (company_id = get_user_company_id() AND (
            SELECT role FROM users WHERE auth_id = auth.uid()
        ) = 'master_admin')
    );

-- Programs policies
CREATE POLICY "Users can view own company programs" ON programs
    FOR SELECT
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Users can manage own company programs" ON programs
    FOR ALL
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Public can view active programs
CREATE POLICY "Public can view active programs" ON programs
    FOR SELECT
    TO anon
    USING (status = 'active');

-- Program availability policies
CREATE POLICY "Users can view own company availability" ON program_availability
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM programs 
            WHERE programs.id = program_availability.program_id 
            AND (programs.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "Users can manage own company availability" ON program_availability
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM programs 
            WHERE programs.id = program_availability.program_id 
            AND (programs.company_id = get_user_company_id() OR is_super_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM programs 
            WHERE programs.id = program_availability.program_id 
            AND (programs.company_id = get_user_company_id() OR is_super_admin())
        )
    );

-- Public can view availability
CREATE POLICY "Public can view availability" ON program_availability
    FOR SELECT
    TO anon
    USING (is_open = true);

-- Hotels policies
CREATE POLICY "Users can view own company hotels" ON hotels
    FOR SELECT
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Users can manage own company hotels" ON hotels
    FOR ALL
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Public can view hotels for booking
CREATE POLICY "Public can view hotels" ON hotels
    FOR SELECT
    TO anon
    USING (true);

-- Agents policies
CREATE POLICY "Users can view own company agents" ON agents
    FOR SELECT
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Users can manage own company agents" ON agents
    FOR ALL
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Agent pricing policies
CREATE POLICY "Users can view own company agent pricing" ON agent_pricing
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_pricing.agent_id 
            AND (agents.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "Users can manage own company agent pricing" ON agent_pricing
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_pricing.agent_id 
            AND (agents.company_id = get_user_company_id() OR is_super_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_pricing.agent_id 
            AND (agents.company_id = get_user_company_id() OR is_super_admin())
        )
    );

-- Drivers policies
CREATE POLICY "Users can view own company drivers" ON drivers
    FOR SELECT
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Users can manage own company drivers" ON drivers
    FOR ALL
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Boats policies
CREATE POLICY "Users can view own company boats" ON boats
    FOR SELECT
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Users can manage own company boats" ON boats
    FOR ALL
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Bookings policies
CREATE POLICY "Users can view own company bookings" ON bookings
    FOR SELECT
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Users can manage own company bookings" ON bookings
    FOR ALL
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Public can create direct bookings
CREATE POLICY "Public can create bookings" ON bookings
    FOR INSERT
    TO anon
    WITH CHECK (is_direct_booking = true);

-- Booking attachments policies
CREATE POLICY "Users can view own company booking attachments" ON booking_attachments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = booking_attachments.booking_id 
            AND (bookings.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "Users can manage own company booking attachments" ON booking_attachments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = booking_attachments.booking_id 
            AND (bookings.company_id = get_user_company_id() OR is_super_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = booking_attachments.booking_id 
            AND (bookings.company_id = get_user_company_id() OR is_super_admin())
        )
    );

-- Invoices policies
CREATE POLICY "Users can view own company invoices" ON invoices
    FOR SELECT
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin());

CREATE POLICY "Users can manage own company invoices" ON invoices
    FOR ALL
    TO authenticated
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- Invoice items policies
CREATE POLICY "Users can view own company invoice items" ON invoice_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND (invoices.company_id = get_user_company_id() OR is_super_admin())
        )
    );

CREATE POLICY "Users can manage own company invoice items" ON invoice_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND (invoices.company_id = get_user_company_id() OR is_super_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND (invoices.company_id = get_user_company_id() OR is_super_admin())
        )
    );

















-- ============================================
-- MIGRATION: 003_seed_data.sql
-- ============================================

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





-- ============================================
-- MIGRATION: 004_agent_staff_and_bookings_update.sql
-- ============================================

-- Migration: Add agent staff support and update bookings table
-- Run this in Supabase SQL Editor

-- 1. Create agent_staff table
CREATE TABLE IF NOT EXISTS agent_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for agent_staff
CREATE INDEX IF NOT EXISTS idx_agent_staff_agent_id ON agent_staff(agent_id);

-- Add trigger for updated_at
CREATE TRIGGER update_agent_staff_updated_at 
    BEFORE UPDATE ON agent_staff 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Update bookings table
-- Note: booking_date was already renamed to activity_date in initial schema

-- Add agent_staff_id column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agent_staff_id UUID REFERENCES agent_staff(id) ON DELETE SET NULL;

-- Add void_reason column for soft delete with reason
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- Create index for agent_staff_id
CREATE INDEX IF NOT EXISTS idx_bookings_agent_staff_id ON bookings(agent_staff_id);

-- 3. Add RLS policies for agent_staff
ALTER TABLE agent_staff ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view agent_staff for their company's agents
CREATE POLICY "Users can view agent staff for their company" ON agent_staff
    FOR SELECT
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE company_id IN (
                SELECT company_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

-- Policy: Users can insert agent_staff for their company's agents
CREATE POLICY "Users can insert agent staff for their company" ON agent_staff
    FOR INSERT
    WITH CHECK (
        agent_id IN (
            SELECT id FROM agents WHERE company_id IN (
                SELECT company_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

-- Policy: Users can update agent_staff for their company's agents
CREATE POLICY "Users can update agent staff for their company" ON agent_staff
    FOR UPDATE
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE company_id IN (
                SELECT company_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

-- Policy: Users can delete agent_staff for their company's agents
CREATE POLICY "Users can delete agent staff for their company" ON agent_staff
    FOR DELETE
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE company_id IN (
                SELECT company_id FROM users WHERE auth_id = auth.uid()
            )
        )
    );

-- 4. Insert sample agent staff data for demo company
INSERT INTO agent_staff (agent_id, full_name, nickname, phone)
SELECT 
    a.id,
    staff.full_name,
    staff.nickname,
    staff.phone
FROM agents a
CROSS JOIN (
    VALUES 
        ('John Smith', 'John', '+66891234567'),
        ('Mary Johnson', 'Mary', '+66891234568')
) AS staff(full_name, nickname, phone)
WHERE a.name = 'Thailand Tours Co.'
ON CONFLICT DO NOTHING;

INSERT INTO agent_staff (agent_id, full_name, nickname, phone)
SELECT 
    a.id,
    staff.full_name,
    staff.nickname,
    staff.phone
FROM agents a
CROSS JOIN (
    VALUES 
        ('Sarah Lee', 'Sarah', '+66892345678'),
        ('David Wong', 'Dave', '+66892345679')
) AS staff(full_name, nickname, phone)
WHERE a.name = 'Phuket Adventures'
ON CONFLICT DO NOTHING;

INSERT INTO agent_staff (agent_id, full_name, nickname, phone)
SELECT 
    a.id,
    staff.full_name,
    staff.nickname,
    staff.phone
FROM agents a
CROSS JOIN (
    VALUES 
        ('Michael Chen', 'Mike', '+66893456789')
) AS staff(full_name, nickname, phone)
WHERE a.name = 'Asia Pacific Travel'
ON CONFLICT DO NOTHING;

















-- ============================================
-- MIGRATION: 005_program_default_pickup_time.sql
-- ============================================

-- Add default_pickup_time column to programs table
ALTER TABLE programs ADD COLUMN IF NOT EXISTS default_pickup_time TIME DEFAULT '08:00';

-- Update existing programs with default value
UPDATE programs SET default_pickup_time = '08:00' WHERE default_pickup_time IS NULL;

















-- ============================================
-- MIGRATION: 006_pickup_enhancements.sql
-- ============================================

-- Add is_come_direct flag to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_come_direct BOOLEAN DEFAULT FALSE;

-- Add come_direct_location to programs table (stores location name, address, google maps link, contact)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS come_direct_location JSONB DEFAULT NULL;

-- Example come_direct_location structure:
-- {
--   "name": "Rassada Pier",
--   "address": "Rassada Pier, Phuket",
--   "google_maps_url": "https://maps.google.com/...",
--   "contact_info": "Call: 076-123-456"
-- }

















-- ============================================
-- MIGRATION: 007_agent_type_and_sources.sql
-- ============================================

-- Migration: Add agent type and seed direct booking sources
-- This migration adds agent_type to distinguish partner agents from direct booking

-- 1. Add agent_type column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50) DEFAULT 'partner' CHECK (agent_type IN ('partner', 'direct'));

-- 2. Create index for agent_type
CREATE INDEX IF NOT EXISTS idx_agents_agent_type ON agents(agent_type);

-- 3. Update existing agents to be 'partner' type (they already default to this)
UPDATE agents SET agent_type = 'partner' WHERE agent_type IS NULL;

-- Note: Direct Booking agent and sources should be created during customer setup
-- Template below for reference:
-- 
-- INSERT INTO agents (company_id, name, agent_type, status, notes)
-- VALUES (
--     '<company_id>',
--     'Direct Booking',
--     'direct',
--     'active',
--     'Direct bookings from various sources'
-- );





-- ============================================
-- MIGRATION: 008_voucher_and_hotels_seed.sql
-- ============================================

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

















-- ============================================
-- MIGRATION: 009_import_hotels_from_mysql.sql
-- ============================================

-- Migration: Import hotels from MySQL database
-- Source: Phuket_Hotel.csv and Phang_Nga_Hotel.csv
-- Generated: 2025-11-30T11:13:12.835Z
-- Total Phuket Hotels: 1763
-- Total Phang Nga Hotels: 235

-- First, create the reference_hotels table if it doesn't exist
CREATE TABLE IF NOT EXISTS reference_hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'Phuket',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear existing reference_hotels and insert fresh data
TRUNCATE TABLE reference_hotels;

-- =====================================================
-- PHUKET HOTELS (1763 hotels)
-- =====================================================

INSERT INTO reference_hotels (name, area, province) VALUES
('Kamala Phuket Guesthouse', 'Kamala', 'Phuket'),
('Good 9 At Home', 'Rawai', 'Phuket'),
('Naiharn Garden Resort Vil', 'Rawai', 'Phuket'),
('Palm Oasis Boutique Hotel', 'Rawai', 'Phuket'),
('OYO 1037 Kamala Phuket Guesthouse', 'Kamala', 'Phuket'),
('Baan Kamala Hostel and Guesthouse', 'Kamala', 'Phuket'),
('At Kamala', 'Kamala', 'Phuket'),
('Surintra Boutique Resort', 'Surin', 'Phuket'),
('Lespalm Waterfall Pool Villa', 'Surin', 'Phuket'),
('Discovery House Hotel', 'Sakhu', 'Phuket'),
('Airport Phuket Garden Resort', 'Sakhu', 'Phuket'),
('Baantonsai Garden Resort', 'Patong', 'Phuket'),
('Larn Park Resortel', 'Patong', 'Phuket'),
('Karon Studio Service Apartment', 'Karon', 'Phuket'),
('Welcome Guest House', 'Patong', 'Phuket'),
('Welcome Inn Hotel Karon Beach', 'Karon', 'Phuket'),
('De Blue At Sea Rawai Hotel', 'Rawai', 'Phuket'),
('Elcidium Boutique Guesthouse', 'Karon', 'Phuket'),
('Jazz U Garden Resort', 'Karon', 'Phuket'),
('Capannina Inn', 'Kata', 'Phuket'),
('Oceanstone by Holy Cow', 'Choeng Thale', 'Phuket'),
('Allamanda room 3122 Laguna', 'Choeng Thale', 'Phuket'),
('Bk Villa', 'Thep Krasattri', 'Phuket'),
('Layan Beach Resort & Spa Village', 'Layan', 'Phuket'),
('Tyler Naiyang', 'Nai Yang', 'Phuket'),
('Wecare Hostel Naiyang', 'Nai Yang', 'Phuket'),
('OYO 1117 Phuket Airport Suites', 'Nai Yang', 'Phuket'),
('JJW House Phuket', 'Sakhu', 'Phuket'),
('OYO 433 Iwp Wake Park & Resort Hotel', 'Mai Khao', 'Phuket'),
('Maikhao Beach Guest House', 'Mai Khao', 'Phuket'),
('Bungalow@Maikhao', 'Mai Khao', 'Phuket'),
('Maikhao Boutique Hostel', 'Mai Khao', 'Phuket'),
('Summer Breeze Inn', 'Phuket Town', 'Phuket'),
('Yuwadee Resort', 'Chalong', 'Phuket'),
('OYO 368 Aoi Apartment', 'Chalong', 'Phuket'),
('Anda Orange Pier Guesthouse', 'Chalong', 'Phuket'),
('Supergreen Hotel', 'Chalong', 'Phuket'),
('Vimonsiri Hill Resort & Spa', 'Chalong', 'Phuket'),
('Patong Eyes', 'Patong', 'Phuket'),
('Chusri Hotel - SHA Extra Plus', 'Patong', 'Phuket'),
('Stanley''s Guesthouse', 'Phuket', 'Phuket'),
('Guesthouse Belvedere', 'Patong', 'Phuket'),
('The Luka Guesthouse and Restaurant', 'Patong', 'Phuket'),
('Patong 7Days Premium Hotel Phuket', 'Patong', 'Phuket'),
('Baramee Hip Hotel', 'Patong', 'Phuket'),
('SK Residence', 'Phuket', 'Phuket'),
('Relax Guest House', 'Patong', 'Phuket'),
('Desire Guesthouse Patong', 'Patong', 'Phuket'),
('Rayaan 6 Guesthouse', 'Patong', 'Phuket'),
('Rayaan Guest House', 'Patong', 'Phuket'),
('Ansino Bukit', 'Patong', 'Phuket'),
('Phuket Paradise Hotel', 'Patong', 'Phuket'),
('A Casa Di Luca Patong', 'Patong', 'Phuket'),
('New Era Guesthouse', 'Patong', 'Phuket'),
('Small Shells', 'Patong', 'Phuket'),
('OYO 605 Lake View Phuket Place', 'Phuket', 'Phuket'),
('Charin Village', 'Chalong', 'Phuket'),
('Studio 77 Phuket', 'Chalong', 'Phuket'),
('Ocean12 Chic Hotel', 'Chalong', 'Phuket'),
('Gamers Paradise Hotel', 'Chalong', 'Phuket'),
('BaanSattaBun', 'Chalong', 'Phuket'),
('OYO 466 Vibes Patong', 'Patong', 'Phuket'),
('Sea view Panwa Cottage Hostel', 'Cape Panwa', 'Phuket'),
('OYO 617 Tira Hostel @ Chalong Phuket', 'Chalong', 'Phuket'),
('Sunset Seaside Beachfront', 'Cape Panwa', 'Phuket'),
('ZEN Premium Chalong Phuket', 'Chalong', 'Phuket'),
('Patong Panomporn Phuket', 'Patong', 'Phuket'),
('Emerald Terrace Apartment Patong By OHM', 'Patong', 'Phuket'),
('OYO 1032 Beds Patong', 'Patong', 'Phuket'),
('Guesthouse Belvedere - Lovely Room for 2 People, Free Ac and Wi-fi', 'Patong', 'Phuket'),
('Bucintoro Restaurant & Guesthouse Belvedere - Central Double Room With Ac & Wifi', 'Patong', 'Phuket'),
('Green Mango Guesthouse - Hostel', 'Wichit', 'Phuket'),
('Centre Point Nanai', 'Patong', 'Phuket'),
('Loveli Boutique Guesthouse', 'Phuket', 'Phuket'),
('The Coconut Nanai Resort', 'Patong', 'Phuket'),
('Buasri Boutique Patong', 'Patong', 'Phuket'),
('The Landmark Patong', 'Patong', 'Phuket'),
('The Bed Hostel at Patong', 'Patong', 'Phuket'),
('Sabai Inn Patong Phuket', 'Patong', 'Phuket'),
('Patong Blue - Hostel', 'Patong', 'Phuket'),
('Same Same Guesthouse', 'Patong', 'Phuket'),
('7 Sky Residency', 'Patong', 'Phuket'),
('ME Hotel Beach View - Hostel', 'Patong', 'Phuket'),
('Enrico Hostel Patong', 'Patong', 'Phuket'),
('Royal Swiss Guest House', 'Patong', 'Phuket'),
('Sawasdee Mansion', 'Patong', 'Phuket'),
('BL Rabbit hotel', 'Rawai', 'Phuket'),
('Som Guesthouse', 'Phuket', 'Phuket'),
('กะทู้', 'Phuket', 'Phuket'),
('The Lantine Hostel', 'Chalong', 'Phuket'),
('Patong RK', 'Patong', 'Phuket'),
('Smile Inn Patong', 'Patong', 'Phuket'),
('OYO 423 Baan Lucky Guesthouse', 'Karon', 'Phuket'),
('Panda hotel', 'Patong', 'Phuket'),
('Room Actually by Zuzu', 'Karon', 'Phuket'),
('White Snapper Kitchen & Guesthouse', 'Karon', 'Phuket'),
('Welcome Inn Hotel Karon Beach', 'Karon', 'Phuket'),
('The Ark By Veloche Group', 'Karon', 'Phuket'),
('Karon Sunshine Guesthouse & Bar', 'Karon', 'Phuket'),
('Nin Apartments Karon Beach', 'Karon', 'Phuket'),
('Roberto''s Guesthouse', 'Karon', 'Phuket'),
('Karon Cliff Contemporary Boutique Bungalows', 'Karon', 'Phuket'),
('Phuket Racha Guesthouse', 'Phuket Town', 'Phuket'),
('Pitstop Restaurant and Guesthouse', 'Kata', 'Phuket'),
('Sharaya Kata Hotel', 'Kata', 'Phuket'),
('Hotel Surf Blue Kata', 'Kata', 'Phuket'),
('The Bedroom Nai Harn Beach', 'Rawai', 'Phuket'),
('Get Along Residence', 'Si Sunthon', 'Phuket'),
('Thaimond Residence by TropicLook', 'Rawai', 'Phuket'),
('Le''Da Hotel Sha', 'Rawai', 'Phuket'),
('Le'' Da Hotel', 'Rawai', 'Phuket'),
('Room in B&B - Belvedere - Bucintoro', 'Patong', 'Phuket'),
('Butterfly House', 'Patong', 'Phuket'),
('Asia Inn', 'Phuket', 'Phuket'),
('Patong Cottage', 'Patong', 'Phuket'),
('Thai Corner Hotel Patong', 'Patong', 'Phuket'),
('Mild Guesthouse', 'Patong', 'Phuket'),
('Sabai Inn Patong', 'Patong', 'Phuket'),
('G&B Guesthouse', 'Patong', 'Phuket'),
('Adonis Guest House', 'Patong', 'Phuket'),
('Five hundred miles Hostel', 'Patong', 'Phuket'),
('Exhicon New Life Classic', 'Wichit', 'Phuket'),
('Patong Premier Resort', 'Patong', 'Phuket'),
('Ping An Hotel', 'Patong', 'Phuket'),
('Patong Pearl Hotel', 'Patong', 'Phuket'),
('Slumber Party Patong', 'Patong', 'Phuket'),
('Rayaan Oriental Guest House & Restaurant', 'Patong', 'Phuket'),
('OYO 250 July Hotel Patong', 'Patong', 'Phuket'),
('Cool Sea House', 'Patong', 'Phuket'),
('Nina''s Guest House 2', 'Phuket', 'Phuket'),
('2025-01-23 02:46:35', 'Phuket', 'Phuket'),
('OYO 277 Pumpui Boutique Hotel', 'Patong', 'Phuket'),
('Fish and summer House', 'Phuket', 'Phuket'),
('Memory 2', 'Patong', 'Phuket'),
('Thira Residence Patong', 'Patong', 'Phuket'),
('Rawai Suites Phuket', 'Rawai', 'Phuket'),
('Colora Hotel', 'Patong', 'Phuket'),
('Condo in Karon in Chic Condo - Unit B505', 'Karon', 'Phuket'),
('Leelawadee Boutique Hotel', 'Wichit', 'Phuket'),
('Lemongrass Hotel', 'Phuket', 'Phuket'),
('Sharaya Patong Hotel', 'Patong', 'Phuket'),
('Blue Ocean Studio', 'Patong', 'Phuket'),
('Sharaya Boutique Hotel Patong', 'Patong', 'Phuket'),
('OYO 444 Sea Beach Paradise', 'Patong', 'Phuket'),
('Happy Fish Guesthouse', 'Patong', 'Phuket'),
('Grande Elegance Serviced Apartment', 'Patong', 'Phuket'),
('Kata Ocean View Wellness D7', 'Kata', 'Phuket'),
('Welcome Inn Hotel Karon Beach', 'Karon', 'Phuket'),
('Welcome Inn Hotel Karon Beach Double Superior Room From Only 700 Baht', 'Karon', 'Phuket'),
('Dreamz House Boutique', 'Karon', 'Phuket'),
('Thira House', 'Phuket', 'Phuket'),
('Chanpirom Boutique Hotel', 'Karon', 'Phuket'),
('Capri Inn', 'Phuket', 'Phuket'),
('Baan Kawkaew Kata', 'Kata', 'Phuket'),
('Khok Chang Building', 'Karon', 'Phuket'),
('Grand Nai Harn Suites', 'Rawai', 'Phuket'),
('OYO 75344 Ban Elephant Blanc Apartment', 'Kata', 'Phuket'),
('Rama Kata Beach Hotel', 'Kata', 'Phuket'),
('The Pool at Thalassa Kata Beach', 'Kata', 'Phuket'),
('Natalie House Kata Beach', 'Kata', 'Phuket'),
('TP Hostel Kata Beach Phuket', 'Kata', 'Phuket'),
('OYO 1005 Pacotte Boutique Resort', 'Rawai', 'Phuket'),
('Freedom Kata Hotel', 'Kata', 'Phuket'),
('Kata Country House', 'Kata', 'Phuket'),
('OYO 744 @Home Kamala Hills', 'Kamala', 'Phuket'),
('Da Moreno Rawai', 'Rawai', 'Phuket'),
('Family Guesthouse Rawai', 'Rawai', 'Phuket'),
('The Nice Mangoes', 'Rawai', 'Phuket'),
('OYO 450 Rawai Studios Resort', 'Rawai', 'Phuket'),
('Grand Blue Kamala', 'Kamala', 'Phuket'),
('Circle Phuket Resort & Spa', 'Kamala', 'Phuket'),
('Sure Guesthouse', 'Kamala', 'Phuket'),
('Chollada Inn', 'Kamala', 'Phuket'),
('Sirin Bungalow', 'Choeng Thale', 'Phuket'),
('The Aristo Resort 202 by Holy Cow', 'Surin', 'Phuket'),
('Nice Nap Hostel', 'Sakhu', 'Phuket'),
('OYO 1029 Os Rooms', 'Nai Yang', 'Phuket'),
('MEMO Residence - Hostel', 'Mai Khao', 'Phuket'),
('Betterview Bed Breakfast & Bungalow', 'Phuket', 'Phuket'),
('Ruankaew Homestay', 'Mai Khao', 'Phuket'),
('OYO 75373 Chamil House', 'Thalang', 'Phuket'),
('OYO 669 Koh Yao Beach Bungalows', 'Phuket', 'Phuket'),
('Racha HiFi Homestay', 'Phuket Town', 'Phuket'),
('Nasa Mansion', 'Phuket Town', 'Phuket'),
('Ananas Phuket Central Hostel - Adults Only', 'Wichit', 'Phuket'),
('Carpio Hotel Phuket', 'Phuket Town', 'Phuket'),
('Sky Silk Decoration House', 'Patong', 'Phuket'),
('Bangkok Residence', 'Patong', 'Phuket'),
('The Allano Phuket Hotel', 'Patong', 'Phuket'),
('Azure Bangla Phuket', 'Patong', 'Phuket'),
('Paksaa Boutique Hotel Patong Phuket', 'Patong', 'Phuket'),
('Ash Lodge', 'Patong', 'Phuket'),
('Chongko Guesthouse', 'Patong', 'Phuket'),
('Troy Patong by NSW', 'Patong', 'Phuket'),
('Roar Inn Patong', 'Patong', 'Phuket'),
('Wire Hostel Patong', 'Patong', 'Phuket'),
('Hangover Inn', 'Patong', 'Phuket'),
('Patong Terrace', 'Patong', 'Phuket'),
('Sanga Villas', 'Patong', 'Phuket'),
('Kudo Hotel', 'Patong', 'Phuket'),
('Goldsea Beach', 'Patong', 'Phuket'),
('Chic Condo', 'Patong', 'Phuket'),
('Azure Phuket Hotel', 'Patong', 'Phuket'),
('Santi White House Patong Hotel', 'Patong', 'Phuket'),
('Blue Star Hotel', 'Patong', 'Phuket'),
('Saiyuan Estate by TropicLook', 'Rawai', 'Phuket'),
('Silla Patong Hostel', 'Patong', 'Phuket'),
('Knock Knock Beach Boutique', 'Patong', 'Phuket'),
('Haven Lagoon Condominium', 'Patong', 'Phuket'),
('Absolute Sea Pearl Beach Resort', 'Patong', 'Phuket'),
('Le Chada Villa', 'Karon', 'Phuket'),
('Welcome Inn Karon', 'Karon', 'Phuket'),
('The Kris Residence', 'Patong', 'Phuket'),
('OYO 255 The Ocean Hotel Patong', 'Patong', 'Phuket'),
('Avantika Boutique Hotel', 'Patong', 'Phuket'),
('OYO 328 Onion House', 'Karon', 'Phuket'),
('Samakkee Resort', 'Rawai', 'Phuket'),
('BaanNueng at Kata', 'Kata', 'Phuket'),
('South Siam Guesthouse', 'Kata', 'Phuket'),
('Glitter House', 'Kata', 'Phuket'),
('Simply Hotel', 'Kata', 'Phuket'),
('OYO 453 Thai Boutique Resort', 'Rawai', 'Phuket'),
('Cool Breeze Bungalows', 'Kata', 'Phuket'),
('Kata Hiview Resort', 'Kata', 'Phuket'),
('CAPITAL O847 Orchid Garden Villa', 'Rawai', 'Phuket'),
('Kokyang Estate by Tropiclook', 'Rawai', 'Phuket'),
('CAPITAL O887 Orchid Garden Villa 2', 'Rawai', 'Phuket'),
('Spaboat', 'Rawai', 'Phuket'),
('Pool Access 89 at Rawai', 'Rawai', 'Phuket'),
('Room 4 Smart Travelers Rawai', 'Rawai', 'Phuket'),
('Nicha Residence', 'Kamala', 'Phuket'),
('Kamala Cool Hotel', 'Kamala', 'Phuket'),
('The Mamatel Boutique', 'Kamala', 'Phuket'),
('La Maison Ya Nui Resort Phuket', 'Rawai', 'Phuket'),
('OYO 259 Baan Napatr', 'Choeng Thale', 'Phuket'),
('Classic Home', 'Bang Tao', 'Phuket'),
('Nice Lagoon Beach', 'Choeng Thale', 'Phuket'),
('Surin Sweet Hotel', 'Surin', 'Phuket'),
('Lin House', 'Phuket Town', 'Phuket'),
('At Panta Phuket', 'Sakhu', 'Phuket'),
('Kittiya Mansion', 'Phuket Town', 'Phuket'),
('Private Pool Villas by The Slate', 'Nai Yang', 'Phuket'),
('Seapines Villa Liberg', 'Nai Yang', 'Phuket'),
('Happy Mountain Airport Resort', 'Sakhu', 'Phuket'),
('Tanamas House', 'Phuket Town', 'Phuket'),
('Sleepwell@Naiyang', 'Nai Yang', 'Phuket'),
('Naiyang Beach Hotel', 'Nai Yang', 'Phuket'),
('Sabai Sure Hostel', 'Phuket Town', 'Phuket'),
('Hubb Hostel Phuket Airport', 'Sakhu', 'Phuket'),
('Sirikul Mansion', 'Phuket Town', 'Phuket'),
('Laemsai Resort', 'Kamala', 'Phuket'),
('Room Hostel at Phuket Airport', 'Sakhu', 'Phuket'),
('Sunset Resort', 'Patong', 'Phuket'),
('OYO 435 Frame Residence', 'Phuket Town', 'Phuket'),
('Sansuko Ville Bungalow Resort', 'Phuket Town', 'Phuket'),
('OYO 736 Green Poshtel - Hostel', 'Wichit', 'Phuket'),
('OYO 586 I Hostel', 'Phuket Town', 'Phuket'),
('Pause Kathu - Hostel', 'Kathu', 'Phuket'),
('Suuko Wellness and Spa Resort', 'Phuket', 'Phuket'),
('Pon House', 'Chalong', 'Phuket'),
('Chalong Hill Tropical Garden Homes', 'Chalong', 'Phuket'),
('4 Houses Boutique Resort Phuket', 'Chalong', 'Phuket'),
('Airport Hostel Phuket', 'Wichit', 'Phuket'),
('Shanmen Art House', 'Patong', 'Phuket'),
('Kelly’s Residency', 'Patong', 'Phuket'),
('Ol''Masta Hotel & Lounge', 'Patong', 'Phuket'),
('Patong Gallery Hotel', 'Patong', 'Phuket'),
('Tyler Kathu', 'Kathu', 'Phuket'),
('Hilltop Hotel', 'Patong', 'Phuket'),
('OYO 1101 Tanrak Bungalow', 'Kathu', 'Phuket'),
('Escape Villa', 'Phuket Town', 'Phuket'),
('Breezy Andaman', 'Patong', 'Phuket'),
('Baan Boa Guest House', 'Patong', 'Phuket'),
('Andaman Boutique Patong', 'Patong', 'Phuket'),
('Fulla Place', 'Patong', 'Phuket'),
('Sea Star Patong Hotel', 'Patong', 'Phuket'),
('Grand View', 'Patong', 'Phuket'),
('The Bluewater Hotel', 'Patong', 'Phuket'),
('Eriksson Guesthouse', 'Patong', 'Phuket'),
('Palma Resort', 'Patong', 'Phuket'),
('Chang Club', 'Patong', 'Phuket'),
('Centro at Sansabai', 'Patong', 'Phuket'),
('IL MARE PATONG PLACE', 'Patong', 'Phuket'),
('Qhkl Hotel', 'Patong', 'Phuket'),
('Thai Classic Hotel', 'Patong', 'Phuket'),
('Panda Boutique Hotel Phuket', 'Patong', 'Phuket'),
('Tropical Sunset Hotel Patong', 'Patong', 'Phuket'),
('Guan Chao Yin Hotel', 'Patong', 'Phuket'),
('Cat Story Hotel', 'Chalong', 'Phuket'),
('Patong Station House', 'Patong', 'Phuket'),
('Inn Patong Beach Hotel, Phuket', 'Patong', 'Phuket'),
('Ratana Patong Beach Hotel by Shanaya', 'Patong', 'Phuket'),
('Hotel Sea Princess', 'Phuket Town', 'Phuket'),
('Patong Terrace Boutique Hotel', 'Patong', 'Phuket'),
('Elite Guesthouse', 'Patong', 'Phuket'),
('Sea Room''s at Patong', 'Patong', 'Phuket'),
('Lars-Lita Residence', 'Patong', 'Phuket'),
('Lords Palace', 'Patong', 'Phuket'),
('Patong Beach Bed and Breakfast', 'Patong', 'Phuket'),
('Sharaya Residence Patong', 'Patong', 'Phuket'),
('Patong Swiss', 'Patong', 'Phuket'),
('Boondaree Home Resort', 'Karon', 'Phuket'),
('Washington Residence', 'Karon', 'Phuket'),
('Villa Tona Phuket', 'Karon', 'Phuket'),
('Living by Grace', 'Si Sunthon', 'Phuket'),
('SP Residence Phuket', 'Phuket', 'Phuket'),
('Doolay Beachfront Hostel', 'Karon', 'Phuket'),
('Be My Guest Boutique Hotel', 'Karon', 'Phuket'),
('Eazy Resort', 'Kata', 'Phuket'),
('At Zea Hotel Phuket', 'Tri Trang', 'Phuket'),
('Two Villas Holiday Oriental Style Naiharn Beach', 'Rawai', 'Phuket'),
('Purimas Resortel', 'Phuket', 'Phuket'),
('The Trees Club Resort', 'Kamala', 'Phuket'),
('Casa DeeDee (Dee Inn)', 'Rawai', 'Phuket'),
('Golden Teak Resort - Baan Sapparot', 'Kamala', 'Phuket'),
('Sawasdee Rawai Phuket', 'Rawai', 'Phuket'),
('Nai Harn Condominium', 'Rawai', 'Phuket'),
('Villa Oxavia', 'Rawai', 'Phuket'),
('Grand Bleu Ocean View Pool Suite', 'Kamala', 'Phuket'),
('Rawai Paradise', 'Rawai', 'Phuket'),
('The Club Kamala Beach Phuket', 'Kamala', 'Phuket'),
('Rojjana Residence', 'Kamala', 'Phuket'),
('Serene Boutique Garden Resorts', 'Pa Klok', 'Phuket'),
('Yanui Beach Hideaway', 'Rawai', 'Phuket'),
('Diamond Condominium 2706', 'Choeng Thale', 'Phuket'),
('The Aristo by Holy Cow 420', 'Choeng Thale', 'Phuket'),
('Infinity Pool 1 Bedroom at Surin Beach', 'Surin', 'Phuket'),
('Bangtao Tropical Residence Resort & Spa', 'Bang Tao', 'Phuket'),
('Oceanstone Phuket by Holy Cow 1-BR room', 'Choeng Thale', 'Phuket'),
('Areeca Mahogany Zone', 'Choeng Thale', 'Phuket'),
('The Aristo Beach Resort Surin', 'Surin', 'Phuket'),
('Two Villas Holiday Oriental Style Layan Beach', 'Thalang', 'Phuket'),
('Nada Place Layan', 'Layan', 'Phuket'),
('The White House Koh Yao Yai Resort', 'Phuket', 'Phuket'),
('Bussarin Apartment', 'Phuket', 'Phuket'),
('Pasai Cottage', 'Phuket', 'Phuket'),
('Mookdamun Bungalows', 'Phuket', 'Phuket'),
('Lulu Hotel', 'Phuket Town', 'Phuket'),
('Laila Pool Village', 'Phuket', 'Phuket'),
('Hotel on Hilltop', 'Kathu', 'Phuket'),
('The Cozy', 'Patong', 'Phuket'),
('Phuket Botanic Resort', 'Chalong', 'Phuket'),
('The Bird Cage Patong Guesthouse', 'Patong', 'Phuket'),
('OYO 345 The Click Guesthouse At Chalong', 'Rawai', 'Phuket'),
('Sapaan Pla Residence', 'Rawai', 'Phuket'),
('Game Boutique', 'Patong', 'Phuket'),
('Beehive Magenta Patong Hostel', 'Patong', 'Phuket'),
('Alen Guest House', 'Patong', 'Phuket'),
('Chic Boutique Hotel', 'Patong', 'Phuket'),
('DB Residence', 'Patong', 'Phuket'),
('A&J Boutique Hotel Nanai', 'Patong', 'Phuket'),
('Tuana Blue Sky Patong', 'Patong', 'Phuket'),
('Bedbox Guesthouse & Hostel', 'Patong', 'Phuket'),
('The C Park Phuket', 'Patong', 'Phuket'),
('Mali Garden Resort', 'Phuket', 'Phuket'),
('Putter House', 'Phuket', 'Phuket'),
('Nakara spa phuket', 'Patong', 'Phuket'),
('The Room Patong Hotel', 'Patong', 'Phuket'),
('OYO 422 Jane Homestay And Resort', 'Rawai', 'Phuket'),
('OYO 851 On Hill Residence Patong', 'Patong', 'Phuket'),
('Priew Wan Guesthouse', 'Patong', 'Phuket'),
('The Corner Hotel', 'Kathu', 'Phuket'),
('BE Rendez Vous Hotel', 'Patong', 'Phuket'),
('Chill Patong Hotel', 'Patong', 'Phuket'),
('AT HOME hotel&service', 'Chalong', 'Phuket'),
('OYO 288 The Minotel Hotel', 'Patong', 'Phuket'),
('TJ House Patong', 'Patong', 'Phuket'),
('Lupta Hostel', 'Patong', 'Phuket'),
('Platinum Hotel', 'Patong', 'Phuket'),
('The Shades Boutique Hotel Patong Phuket', 'Patong', 'Phuket'),
('Sea Safari', 'Si Sunthon', 'Phuket'),
('Asena Karon Resort', 'Karon', 'Phuket'),
('Allstar Guesthouse', 'Karon', 'Phuket'),
('Bamboo House Phuket', 'Rawai', 'Phuket'),
('Kata Bella Resort', 'Kata', 'Phuket'),
('Rice Restaurant & Rooms', 'Patong', 'Phuket'),
('JR Siam Kata Resort', 'Kata', 'Phuket'),
('Batic House By Sharaya Hotel', 'Karon', 'Phuket'),
('Merit Hill', 'Karon', 'Phuket'),
('Stay@kata Poshtel - Hostel', 'Kata', 'Phuket'),
('Shanti Estate by Tropiclook', 'Rawai', 'Phuket'),
('Paradise Beach Backpackers Hostel', 'Patong', 'Phuket'),
('Boutique Guesthouse by Clearhouse', 'Phuket', 'Phuket'),
('Near Beach Hostel - Adults Only', 'Choeng Thale', 'Phuket'),
('Journey Residence Phuket', 'Choeng Thale', 'Phuket'),
('Parida Resort', 'Choeng Thale', 'Phuket'),
('The Aristo Resort Phuket by Holy Cow 218', 'Choeng Thale', 'Phuket'),
('Wanaburi Hotel', 'Thep Krasattri', 'Phuket'),
('The Stand By Phuket Airport', 'Nai Yang', 'Phuket'),
('Jinda Resort', 'Sakhu', 'Phuket'),
('PP Residence Phuket', 'Nai Yang', 'Phuket'),
('Pranee Mansion Airport', 'Sakhu', 'Phuket'),
('Airport Mansion Phuket', 'Mai Khao', 'Phuket'),
('Nam Naka Boutique Hotel', 'Phuket Town', 'Phuket'),
('MeeTangNangNon Bed&Breakfast', 'Phuket Town', 'Phuket'),
('De42 Hotel', 'Kathu', 'Phuket'),
('Crystal Wild Resort Panwa Phuket', 'Phuket Town', 'Phuket'),
('The Bel Air Resort & Spa - Panwa, Phuket', 'Wichit', 'Phuket'),
('Baba La Casa Hotel', 'Chalong', 'Phuket'),
('The Pixel Panwa', 'Phuket Town', 'Phuket'),
('Diana Pool Access Phuket', 'Chalong', 'Phuket'),
('Dee Viking Hotel Patong', 'Patong', 'Phuket'),
('Silla Loft', 'Patong', 'Phuket'),
('Meesuk Place', 'Patong', 'Phuket'),
('Cello Hotel', 'Patong', 'Phuket'),
('88 Hotel Phuket', 'Patong', 'Phuket'),
('Hanuman Residence', 'Patong', 'Phuket'),
('OYO 996 Phunara Residence', 'Patong', 'Phuket'),
('@ White Patong', 'Patong', 'Phuket'),
('Andatel Grandé Patong Phuket', 'Patong', 'Phuket'),
('New Patong Premier Resort', 'Patong', 'Phuket'),
('Sweet Home Patong', 'Patong', 'Phuket'),
('Baan Ketkeaw Guesthouse 1', 'Patong', 'Phuket'),
('Minatale Phuket', 'Phuket', 'Phuket'),
('Lavender Hotel', 'Phuket', 'Phuket'),
('Saladee Gallery Residence', 'Patong', 'Phuket'),
('Onibaku Hotel', 'Patong', 'Phuket'),
('Happy Holiday Resort and Apartment', 'Patong', 'Phuket'),
('Fruit Paradise Hotel', 'Patong', 'Phuket'),
('Frog House Bed & Breakfast - Adults Only - Hostel', 'Phuket', 'Phuket'),
('Sunflower HLD Hotel', 'Patong', 'Phuket'),
('Patong Buri Hotel', 'Patong', 'Phuket'),
('Benetti House', 'Patong', 'Phuket'),
('Blue Ocean Resort', 'Patong', 'Phuket'),
('Renoir boutique hotel', 'Patong', 'Phuket'),
('At We Patong hostel', 'Patong', 'Phuket'),
('Kanita Garden At Phuket', 'Karon', 'Phuket'),
('Wynn House', 'Karon', 'Phuket'),
('Nori House Kata Beach', 'Kata', 'Phuket'),
('The Guide Hometel', 'Phuket', 'Phuket'),
('Thailand', 'Phuket', 'Phuket'),
('Malinda Villa Phuket', 'Pa Klok', 'Phuket'),
('The Seaton House Phuket', 'Rawai', 'Phuket'),
('The Boathouse Phuket', 'Kata', 'Phuket'),
('Niche Villas by TropicLook', 'Rawai', 'Phuket'),
('Wabi-Sabi Kamala Falls Boutique Residences Resort', 'Kamala', 'Phuket'),
('JT Guesthouse', 'Kamala', 'Phuket'),
('The Quarter Resort Phuket', 'Choeng Thale', 'Phuket'),
('The Aristo Resort', 'Choeng Thale', 'Phuket'),
('Sweet Bungalow', 'Choeng Thale', 'Phuket'),
('Sang Un Bungalow', 'Phuket', 'Phuket'),
('Modern Resort at Naiyang', 'Nai Yang', 'Phuket'),
('OYO 1075 The View at Naiyang', 'Nai Yang', 'Phuket'),
('OYO 325 Naiyang Cottage', 'Nai Yang', 'Phuket'),
('Slowlife Beach - Hostel', 'Sakhu', 'Phuket'),
('T.Y. Airport Inn', 'Sakhu', 'Phuket'),
('Bambooraya Villa', 'Ratsada', 'Phuket'),
('Three Monkeys Bungalows Koh Yao Noi', 'Phuket', 'Phuket'),
('Rassada Place', 'Phuket Town', 'Phuket'),
('OYO 792 Omsaga Phuket Hotel', 'Ratsada', 'Phuket'),
('T-House', 'Phuket', 'Phuket'),
('Phuket Ecozy Hotel', 'Kathu', 'Phuket'),
('Lucky Loft Phuket', 'Phuket Town', 'Phuket'),
('Star Hotel Patong', 'Patong', 'Phuket'),
('Da Mario Hotel And Restaurant', 'Phuket', 'Phuket'),
('Dome Resort by Phuket9', 'Phuket', 'Phuket'),
('Pgs Hotels Casa Del Sol', 'Karon', 'Phuket'),
('Kata Minta Phuket', 'Kata', 'Phuket'),
('Pai Villa Phuket', 'Patong', 'Phuket'),
('Vivi Bungalows Resort', 'Rawai', 'Phuket'),
('Mood Mansion', 'Patong', 'Phuket'),
('Tyler Banpon', 'Si Sunthon', 'Phuket'),
('Vivace Hotel', 'Kamala', 'Phuket'),
('Royal Lee Resort & Spa', 'Sakhu', 'Phuket'),
('Niramaya Villa and Wellness', 'Phuket', 'Phuket'),
('Sun Globe Resort', 'Phuket', 'Phuket'),
('Onnicha Hotel', 'Phuket Town', 'Phuket'),
('M.U.DEN Patong Phuket Hotel', 'Patong', 'Phuket'),
('Tiger Hotel', 'Patong', 'Phuket'),
('OYO 861 Patong Dynasty Hotel', 'Patong', 'Phuket'),
('Art Patong Residence', 'Patong', 'Phuket'),
('Patong Heaven', 'Patong', 'Phuket'),
('The Royal Palm Beachfront', 'Patong', 'Phuket'),
('Lap Roi Karon Beachfront', 'Karon', 'Phuket'),
('KB Apartments 1 Karon Beach by PHR', 'Karon', 'Phuket'),
('The Happy Elephant Resort', 'Phuket Town', 'Phuket'),
('Anchan Resort at Bangtao Beach', 'Bang Tao', 'Phuket'),
('Janya Homestay', 'Chalong', 'Phuket'),
('Namadee House', 'Mai Khao', 'Phuket'),
('Pasai Beach Lodge', 'Phuket', 'Phuket'),
('Phuket Garden Home', 'Chalong', 'Phuket'),
('Rawai Guesthouse', 'Rawai', 'Phuket'),
('Dwell At Chalong Hill', 'Chalong', 'Phuket'),
('Phuket Jula Place', 'Chalong', 'Phuket'),
('The Aristo Seaview Hotel Patong', 'Patong', 'Phuket'),
('Triple Three Patong', 'Patong', 'Phuket'),
('Capital O806 Sira Grande Hotel and Spa', 'Patong', 'Phuket'),
('The Landmark Patong', 'Patong', 'Phuket'),
('The Elegant Patong', 'Patong', 'Phuket'),
('J Sweet Dream Boutique Patong', 'Patong', 'Phuket'),
('Arita House', 'Patong', 'Phuket'),
('I-kroon Café & Hotel', 'Patong', 'Phuket'),
('Small Shells Hotel Phuket', 'Patong', 'Phuket'),
('Kata Blue Sea Resort', 'Kata', 'Phuket'),
('Aloha Residence', 'Karon', 'Phuket'),
('Secret Cliff Villa', 'Karon', 'Phuket'),
('Tananza Resort and Homestay Phuket', 'Thalang', 'Phuket'),
('Villa Elisabeth', 'Kata', 'Phuket'),
('Baan Armeen Cottage', 'Choeng Thale', 'Phuket'),
('Naithon Beach Mansion', 'Thalang', 'Phuket'),
('Phuket Sirinapha Resort', 'Sakhu', 'Phuket'),
('Blue Voyage Thailand', 'Mai Khao', 'Phuket'),
('Koh Yao Chukit Dachanan Resort', 'Phuket', 'Phuket'),
('Chalong Stay Well by Palai Seafood', 'Chalong', 'Phuket'),
('Fiji Palms Phuket', 'Phuket Town', 'Phuket'),
('Pool Access Hotel Near Fitness Street soi Ta Iad', 'Chalong', 'Phuket'),
('Phumundra Resort', 'Phuket Town', 'Phuket'),
('Falang Paradise', 'Chalong', 'Phuket'),
('Candy House', 'Phuket', 'Phuket'),
('Raha Grand Hotel Patong', 'Patong', 'Phuket'),
('Mėnulis Coolly House Patong', 'Patong', 'Phuket'),
('Niku Guesthouse', 'Patong', 'Phuket'),
('Orange Hotel', 'Phuket', 'Phuket'),
('Beam House', 'Patong', 'Phuket'),
('The Gallery Hotel', 'Rawai', 'Phuket'),
('Ricos Hotel Patong', 'Patong', 'Phuket'),
('Karon Sea Side', 'Karon', 'Phuket'),
('Pro Andaman Place', 'Karon', 'Phuket'),
('Your Place Inn', 'Karon', 'Phuket'),
('ZEN Villa', 'Rawai', 'Phuket'),
('OYO 888 Apinya''s Place Karon', 'Karon', 'Phuket'),
('Assada Boutique Hotel', 'Phuket Town', 'Phuket'),
('Kata Green Beach Hotel', 'Kata', 'Phuket'),
('Black Pearl Patong Beach', 'Patong', 'Phuket'),
('Again at Naiharn Beach Resort', 'Rawai', 'Phuket'),
('Clear House Resort', 'Kamala', 'Phuket'),
('Na Kamala Homestay', 'Kamala', 'Phuket'),
('Nua Tone Resort & Cafe', 'Bang Tao', 'Phuket'),
('Bangtao Mango House - Adults Only', 'Bang Tao', 'Phuket'),
('Bang Tidlay Koh Yao Noi', 'Phuket', 'Phuket'),
('Green Mountain Resort Koh Yao', 'Phuket', 'Phuket'),
('Dusit Naka Place', 'Wichit', 'Phuket'),
('Blue Carina Inn 2', 'Phuket Town', 'Phuket'),
('Summer Breeze Inn Hotel', 'Phuket Town', 'Phuket'),
('Tawee Garden and Resort', 'Phuket Town', 'Phuket'),
('Phuket Kata Resotel', 'Kata', 'Phuket'),
('Escape De Phuket Hotel', 'Ratsada', 'Phuket'),
('Cloud 19 Panwa', 'Phuket Town', 'Phuket'),
('Pier 42 Boutique Resort & Spa', 'Chalong', 'Phuket'),
('Two Color Patong', 'Patong', 'Phuket'),
('Times Sri Boutique Hotel', 'Patong', 'Phuket'),
('The Coconut Resort', 'Patong', 'Phuket'),
('Maikhao Residence', 'Mai Khao', 'Phuket'),
('Lemon Tree Naturist Resort Naiharn Beach', 'Rawai', 'Phuket'),
('Frutta Hostel', 'Patong', 'Phuket'),
('OYO 1134 Baan Zarn Guesthouse', 'Patong', 'Phuket'),
('The Orchid Hotel Kalim Bay Resort', 'Patong', 'Phuket'),
('OYO 1074 Fin Hostel', 'Kata', 'Phuket'),
('Fin Hostel Co Working', 'Kata', 'Phuket'),
('Baan Bua Estate by Tropiclook', 'Rawai', 'Phuket'),
('Up2you Hotel', 'Patong', 'Phuket'),
('Baanmee Phuket Sha Plus', 'Chalong', 'Phuket'),
('Phoomjai House', 'Chalong', 'Phuket'),
('Andaman House', 'Patong', 'Phuket'),
('OYO 1007 Vech Guesthouse', 'Patong', 'Phuket'),
('Baan Rosa', 'Choeng Thale', 'Phuket'),
('Oceanstone Laguna Phuket', 'Choeng Thale', 'Phuket'),
('Jantra Residence by Chinocollection', 'Kathu', 'Phuket'),
('Taj Phuket Inn', 'Kathu', 'Phuket'),
('The Beachfront Hotel Phuket', 'Rawai', 'Phuket'),
('Swissotel Resort Phuket Patong Beach', 'Patong', 'Phuket'),
('Chalong Boutique Inn', 'Karon', 'Phuket'),
('Baan Yuyen Karon Guesthouse', 'Karon', 'Phuket'),
('OYO 295 Salamat Bangtao', 'Bang Tao', 'Phuket'),
('Title Residencies by Phuket Apartments', 'Sakhu', 'Phuket'),
('Naiyang Tour Room For Rent', 'Nai Yang', 'Phuket'),
('Baan Panwa Resort&Spa', 'Phuket Town', 'Phuket'),
('Sea Sun Sand Resort & Spa', 'Patong', 'Phuket'),
('Oceana Resort Phuket', 'Kamala', 'Phuket'),
('Koh Yao Heaven Beach Resort', 'Phuket', 'Phuket'),
('Royal Crown Hotel & Palm Spa Resort', 'Patong', 'Phuket'),
('Chalong Beach Hotel Phuket', 'Rawai', 'Phuket'),
('Araya Beach Hotel Patong', 'Patong', 'Phuket'),
('Time Out Hotel Beach Front', 'Patong', 'Phuket'),
('Hyton Leelavadee', 'Patong', 'Phuket'),
('Baan Vanida Garden Resort', 'Karon', 'Phuket'),
('Ratana Apart-Hotel at Kamala', 'Kamala', 'Phuket'),
('Phuket"', 'Phuket', 'Phuket'),
('Beachfront Phuket', 'Choeng Thale', 'Phuket'),
('Add Plus Hotel & Spa', 'Patong', 'Phuket'),
('Madam Inn Patong', 'Patong', 'Phuket'),
('Coco Palace Resort', 'Rawai', 'Phuket'),
('Surin Sunset Hotel', 'Surin', 'Phuket'),
('Connect Guesthouse', 'Patong', 'Phuket'),
('Kata Silver Sand Hotel', 'Kata', 'Phuket'),
('Bangtao Beach Garden', 'Bang Tao', 'Phuket'),
('White Sand Phuket Residence', 'Phuket Town', 'Phuket'),
('Phuket7-inn Hotel', 'Phuket Town', 'Phuket'),
('Jang Resort', 'Patong', 'Phuket'),
('Karon Whale Resort', 'Karon', 'Phuket'),
('Outrigger Laguna Phuket Resort Villas', 'Bang Tao', 'Phuket'),
('SM Resort Phuket', 'Patong', 'Phuket'),
('Ricos Bungalows Kata', 'Kata', 'Phuket'),
('Tri Trang Beach Resort', 'Patong', 'Phuket'),
('Tha Khao Bay View', 'Phuket', 'Phuket'),
('Phuket Marine Poshtel - Hostel', 'Chalong', 'Phuket'),
('Yindee Residence', 'Patong', 'Phuket'),
('Bayshore Ocean View', 'Patong', 'Phuket'),
('Tiger Inn', 'Patong', 'Phuket'),
('Action Point Fitness Resort', 'Rawai', 'Phuket'),
('Smile House Karon', 'Karon', 'Phuket'),
('Metadee Elite - SHA Extra Plus', 'Kata', 'Phuket'),
('Kamala Regent Phuket Serviced Apartment', 'Kamala', 'Phuket'),
('The Mareeya Place', 'Kamala', 'Phuket'),
('At The Tree Phuket', 'Rawai', 'Phuket'),
('Chandara Resort & Spa Phuket', 'Pa Klok', 'Phuket'),
('Phuthara Mansion', 'Phuket Town', 'Phuket'),
('Omsaga Phuket Hotel', 'Ratsada', 'Phuket'),
('T Resort Palai', 'Chalong', 'Phuket'),
('At Phuket Inn Patong Beach', 'Patong', 'Phuket'),
('ELLA Bar, Bistro & Bed', 'Phuket', 'Phuket'),
('Charcoal Panwa Beach', 'Wichit', 'Phuket'),
('I AM O''TEL PATONG', 'Patong', 'Phuket'),
('Coconoi Residence', 'Rawai', 'Phuket'),
('Lespalm Taraburi Pool Villa', 'Phuket', 'Phuket'),
('Bann Anattaya Koh Yao Noi', 'Phuket', 'Phuket'),
('Alpina Phuket Nalina Resort & Spa', 'Phuket', 'Phuket'),
('OYO 232 Patong City Hometel', 'Patong', 'Phuket'),
('Relaxing House Koh Yao Yai', 'Phuket', 'Phuket'),
('Pachumas Mansion', 'Karon', 'Phuket'),
('U Tai Tip Guest House', 'Patong', 'Phuket'),
('Hotel DSure Patong', 'Patong', 'Phuket'),
('OYO 472 Tang Cheng Holiday Hotel', 'Phuket', 'Phuket'),
('Wayla Villa Maikhao Beach', 'Mai Khao', 'Phuket'),
('Komaree Mansion', 'Patong', 'Phuket'),
('SB Park Mansion', 'Kathu', 'Phuket'),
('B-Lay Tong Beach Resort', 'Patong', 'Phuket'),
('In On The Beach', 'Karon', 'Phuket'),
('Bussarin Mansion', 'Phuket', 'Phuket'),
('Squareone - Hostel', 'Patong', 'Phuket'),
('Baan Coconut', 'Choeng Thale', 'Phuket'),
('Phumi Resort', 'Thep Krasattri', 'Phuket'),
('Chaiyo Resort', 'Phuket Town', 'Phuket'),
('Calypso Patong Hotel', 'Patong', 'Phuket'),
('Baan Suan Leela', 'Sakhu', 'Phuket'),
('Lavender Patong Hotel', 'Patong', 'Phuket'),
('I Dee Hotel Patong', 'Patong', 'Phuket'),
('KB Apartments 3 Karon Beach by PHR', 'Karon', 'Phuket'),
('I Am Residence', 'Patong', 'Phuket'),
('Condo in Kata in Ozonec- Unit D618', 'Kata', 'Phuket'),
('The Kara Pool Villa', 'Sakhu', 'Phuket'),
('TP House@Naka', 'Phuket Town', 'Phuket'),
('Hotel Orchid Residence', 'Patong', 'Phuket'),
('Serenity Grand Seaview Suite', 'Rawai', 'Phuket'),
('Sonya Residence', 'Patong', 'Phuket'),
('Popeyes Hostel Coffeeshop and Beer Bar', 'Patong', 'Phuket'),
('Vacation Time House', 'Thalang', 'Phuket'),
('Ban Elephant Blanc Bungalow', 'Karon', 'Phuket'),
('Phuket Paradiso Hotel', 'Chalong', 'Phuket'),
('Awana Villa Resort Yaonoi', 'Phuket', 'Phuket'),
('Rawai Princess Hotel', 'Rawai', 'Phuket'),
('Koola Guesthouse', 'Phuket', 'Phuket'),
('Yamin Seaview Hotel', 'Phuket Town', 'Phuket'),
('KRAAM Silhouette Hotel and Cafe Phuket', 'Rawai', 'Phuket'),
('Jinta Andaman', 'Kata', 'Phuket'),
('The Silk Hill Hotel', 'Patong', 'Phuket'),
('Hill Side Hotel', 'Patong', 'Phuket'),
('One World One Home Naiharn Hotel', 'Rawai', 'Phuket'),
('Oceana Kamala Resort', 'Kamala', 'Phuket'),
('Baan Norkna Bangtao', 'Bang Tao', 'Phuket'),
('The Touch Green Naiyang Hotel & Fitness', 'Nai Yang', 'Phuket'),
('Pennapa Chalet', 'Phuket', 'Phuket'),
('Modern Place Patong Beach', 'Patong', 'Phuket'),
('Arun Seaview', 'Phuket Town', 'Phuket'),
('RangRong Hotel', 'Patong', 'Phuket'),
('Pineapple Guesthouse', 'Karon', 'Phuket'),
('The Umbrella House', 'Kamala', 'Phuket'),
('Baannueng', 'Kathu', 'Phuket'),
('Tharaburi at Panwa', 'Phuket Town', 'Phuket'),
('Condo in Karon in Chic Condo - Unit A609', 'Karon', 'Phuket'),
('Angelina Guesthouse', 'Patong', 'Phuket'),
('The Regent Phuket Serviced Apartment Kamala Beach', 'Kamala', 'Phuket'),
('Phant at Thalang Service Apartment', 'Thep Krasattri', 'Phuket'),
('Andaman Place@baandon', 'Phuket Town', 'Phuket'),
('BJ&Radisson Sea View Resort Koh Yao Yai', 'Phuket', 'Phuket'),
('Anchan Private Pool Villas', 'Chalong', 'Phuket'),
('OYO 1162 Chalong Home Place', 'Chalong', 'Phuket'),
('Natural Mystic Patong Residence', 'Patong', 'Phuket'),
('Condo in Karon in Chic Condo - Unit A108', 'Karon', 'Phuket'),
('Orchid Hotel and Spa', 'Patong', 'Phuket'),
('JJ Guesthouse', 'Phuket', 'Phuket'),
('Condo in Kata in Ozone - A604', 'Kata', 'Phuket'),
('Mayan Apartment', 'Phuket', 'Phuket'),
('The Bread Basket', 'Kathu', 'Phuket'),
('The Sunflower Holiday Hostel', 'Choeng Thale', 'Phuket'),
('SunSeaSand Hotel', 'Patong', 'Phuket'),
('Reuan Thai Villa', 'Patong', 'Phuket'),
('The Wave Patong Boutique Hotel', 'Patong', 'Phuket'),
('Hemingway''s Hotel', 'Patong', 'Phuket'),
('Sino Hostel Kata', 'Kata', 'Phuket'),
('Surin Loft by Holiplanet', 'Surin', 'Phuket'),
('The Way Phuket Resort', 'Thalang', 'Phuket'),
('My Friend''s House', 'Karon', 'Phuket'),
('May House Karon Beach', 'Karon', 'Phuket'),
('Kata Bai D Inn', 'Kata', 'Phuket'),
('Naiyang Cottage', 'Nai Yang', 'Phuket'),
('Bangtao Corner', 'Bang Tao', 'Phuket'),
('Thuan Resort', 'Rawai', 'Phuket'),
('Sabina Guesthouse', 'Kamala', 'Phuket'),
('Muchshima House', 'Bang Tao', 'Phuket'),
('Dwell Phuket Airport', 'Sakhu', 'Phuket'),
('Kata S.T House 2', 'Kata', 'Phuket'),
('Hi Karon Beach Hotel', 'Karon', 'Phuket'),
('Big Buddha Hillside Hotel', 'Chalong', 'Phuket'),
('Crest Pool Villas', 'Patong', 'Phuket'),
('My Style Resort Hotel', 'Patong', 'Phuket'),
('Lamai Guesthouse', 'Patong', 'Phuket'),
('The Title Condo by TropicLook', 'Rawai', 'Phuket'),
('Arch39 Phuket Beach Front', 'Chalong', 'Phuket'),
('Sugar and Spice Inn', 'Kata', 'Phuket'),
('Holiday Resort Ko Yao', 'Phuket', 'Phuket'),
('The Oceanic Sportel', 'Phuket Town', 'Phuket'),
('The LifeCo Phuket Well-Being Detox Center', 'Sakhu', 'Phuket'),
('Bonus Bungalow', 'Chalong', 'Phuket'),
('Natika Apartment', 'Patong', 'Phuket'),
('Smile Home', 'Patong', 'Phuket'),
('Patong Beach Hotel', 'Patong', 'Phuket'),
('OYO 389 Sira Boutique Residence', 'Patong', 'Phuket'),
('W Hostel', 'Mai Khao', 'Phuket'),
('Pipikuku Hotel & Restaurant', 'Patong', 'Phuket'),
('Garden Phuket Phuket', 'Phuket', 'Phuket'),
('OYO 503 Phuket Numnoi - Hostel', 'Choeng Thale', 'Phuket'),
('Patong Bay Inn', 'Patong', 'Phuket'),
('Heaven House', 'Patong', 'Phuket'),
('MONTANA Hotel & Hostel Phuket', 'Karon', 'Phuket'),
('Happy Eight Resort Phuket', 'Rawai', 'Phuket'),
('Prayai Changthai Resort', 'Chalong', 'Phuket'),
('bistrot helene', 'Kata', 'Phuket'),
('Baan Mai Beachfront Phuket Lone Island', 'Rawai', 'Phuket'),
('Bodega Patong Phuket - Hostel', 'Patong', 'Phuket'),
('Baantonkhao Kata Beach', 'Kata', 'Phuket'),
('The Way Patong Hotel', 'Patong', 'Phuket'),
('Ramada by Wyndham Phuket Southsea', 'Karon', 'Phuket'),
('The Pace Phuket Resort', 'Rawai', 'Phuket'),
('Arita Hotel', 'Patong', 'Phuket'),
('The Melody Phuket Hotel', 'Karon', 'Phuket'),
('Mirage Express Patong Phuket Hotel', 'Patong', 'Phuket'),
('Hiran Residence', 'Kathu', 'Phuket'),
('Panwa Boutique Beachfront', 'Wichit', 'Phuket'),
('Baan Sudarat', 'Patong', 'Phuket'),
('Rico''s Patong Residence', 'Patong', 'Phuket'),
('Ra Residence Phuket', 'Chalong', 'Phuket'),
('The One Cozy Vacation Residence', 'Phuket Town', 'Phuket'),
('Le Tanjong House', 'Patong', 'Phuket'),
('Splash Beach Villa Resort', 'Mai Khao', 'Phuket'),
('Raya Rawai Place', 'Rawai', 'Phuket'),
('Phuket Airport Villa', 'Sakhu', 'Phuket'),
('MT Hotel Patong', 'Patong', 'Phuket'),
('Tyler Cherngtalay', 'Choeng Thale', 'Phuket'),
('Living Residence Phuket', 'Phuket', 'Phuket'),
('D C Patong', 'Patong', 'Phuket'),
('Rattana Beach Hotel', 'Karon', 'Phuket'),
('Sawasdee Orange Phuket Guest House', 'Rawai', 'Phuket'),
('The Regent Hotel Kamala Beach', 'Kamala', 'Phuket'),
('Kata S.T. House', 'Kata', 'Phuket'),
('Baan Kalaya Garden', 'Thep Krasattri', 'Phuket'),
('Sala Bua Room Karon', 'Karon', 'Phuket'),
('Maikhao Home Garden Bungalow', 'Mai Khao', 'Phuket'),
('Casa Bella Phuket', 'Chalong', 'Phuket'),
('NB House', 'Karon', 'Phuket'),
('Serenity Resort & Residences Phuket', 'Rawai', 'Phuket'),
('Green Island Guesthouse', 'Karon', 'Phuket'),
('Fong Kaew and Baan Nang Fa Guesthouse', 'Patong', 'Phuket'),
('Studio Deluxe Avec Services Hôteliers - Adults Only', 'Rawai', 'Phuket'),
('The Chalet Phuket Resort', 'Phuket Town', 'Phuket'),
('BGW Phuket - Hostel', 'Patong', 'Phuket'),
('Baan Yamu Residences', 'Thalang', 'Phuket'),
('Neptuna Kata Hotel', 'Kata', 'Phuket'),
('Nasa Hotel', 'Phuket', 'Phuket'),
('Days Inn by Wyndham Patong Beach Phuket', 'Patong', 'Phuket'),
('Serene Villa', 'Chalong', 'Phuket'),
('Surintra Boutique Resort', 'Surin', 'Phuket'),
('Rawai Apartment', 'Rawai', 'Phuket'),
('Golden Manora Hotel Bangtao Beach', 'Bang Tao', 'Phuket'),
('OYO 358 Rattana Residence Thalang', 'Thalang', 'Phuket'),
('Ideo Phuket Hotel', 'Sakhu', 'Phuket'),
('Tall Tree Kata Phuket - Hostel', 'Kata', 'Phuket'),
('Benyada Lodge', 'Surin', 'Phuket'),
('Sandy House Rawai', 'Rawai', 'Phuket'),
('Ocean Pie Phuket', 'Rawai', 'Phuket'),
('Phuket Siam Villas', 'Chalong', 'Phuket'),
('JJ Residence Phuket Town', 'Phuket Town', 'Phuket'),
('Art Mansion Patong Hotel', 'Patong', 'Phuket'),
('Karon Princess Hotel', 'Karon', 'Phuket'),
('PKL Residence', 'Patong', 'Phuket'),
('Lucky Buako Hotel Patong', 'Patong', 'Phuket'),
('Z&Z House', 'Rawai', 'Phuket'),
('Tulip Inn', 'Patong', 'Phuket'),
('Kata Sun Beach Hotel', 'Kata', 'Phuket'),
('Silla Villa', 'Karon', 'Phuket'),
('LaXenia', 'Karon', 'Phuket'),
('Laguna Holiday Club Phuket Resort', 'Choeng Thale', 'Phuket'),
('Shade House - Phuket Downtown', 'Kathu', 'Phuket'),
('Beau and Blonde House Kamala', 'Kamala', 'Phuket'),
('Turtle Rooms', 'Si Sunthon', 'Phuket'),
('Siralanna Phuket', 'Patong', 'Phuket'),
('SP House Phuket', 'Karon', 'Phuket'),
('Kata Station', 'Kata', 'Phuket'),
('Bests village & villa', 'Chalong', 'Phuket'),
('Soul Villas By The Beach - Phuket', 'Wichit', 'Phuket'),
('Q Victory Patong', 'Patong', 'Phuket'),
('Hasanah Guesthouse', 'Bang Tao', 'Phuket'),
('Palmview Resort', 'Patong', 'Phuket'),
('Phuket View Coffee and Resort', 'Chalong', 'Phuket'),
('Ratana Hill Patong', 'Patong', 'Phuket'),
('NR Nanai Patong', 'Patong', 'Phuket'),
('Phuket Kata Resotel', 'Kata', 'Phuket'),
('Floraville Phuket Resort', 'Chalong', 'Phuket'),
('Ruan Mai Naiyang Beach Resort', 'Nai Yang', 'Phuket'),
('K.L.Apartment', 'Rawai', 'Phuket'),
('Lamai Apartment', 'Phuket', 'Phuket'),
('Mr. T Kamala Room', 'Kamala', 'Phuket'),
('Amici Miei Hotel', 'Phuket', 'Phuket'),
('Patong V Hotel', 'Patong', 'Phuket'),
('Dream Phuket Hotel & Spa', 'Phuket', 'Phuket'),
('The Lantern Hostel and SPA', 'Chalong', 'Phuket'),
('Central Residences', 'Wichit', 'Phuket'),
('Recenta Phuket Suanluang', 'Phuket Town', 'Phuket'),
('Tina Boutique Resort', 'Thep Krasattri', 'Phuket'),
('J and N Mansion 2', 'Patong', 'Phuket'),
('Nature Pine Residence', 'Rawai', 'Phuket'),
('Pimrada Hotel', 'Patong', 'Phuket'),
('Dlux Condominium', 'Chalong', 'Phuket'),
('Babylon Pool Villas', 'Rawai', 'Phuket'),
('CAPITAL O75345 Praewa Villas Naiyang Phuket', 'Nai Yang', 'Phuket'),
('KB Apartments 2 Karon Beach by PHR', 'Karon', 'Phuket'),
('Phuket Campground', 'Mai Khao', 'Phuket'),
('Fern House Retreat', 'Chalong', 'Phuket'),
('Naiyang Discovery Beach Resort', 'Nai Yang', 'Phuket'),
('Again Thaicharm House at Patong Beach', 'Patong', 'Phuket'),
('RK Guesthouse', 'Patong', 'Phuket'),
('Cview boutique', 'Rawai', 'Phuket'),
('Be Leaf Resort', 'Thep Krasattri', 'Phuket'),
('Anayara Luxury Retreat Panwa Resort', 'Phuket Town', 'Phuket'),
('Tuna Resort', 'Rawai', 'Phuket'),
('Angus O''Tool''s Irish Pub Guesthouse', 'Karon', 'Phuket'),
('Memory Boutique Hotel', 'Patong', 'Phuket'),
('Ruan Mai Sang Ngam Resort', 'Sakhu', 'Phuket'),
('Swiss House', 'Patong', 'Phuket'),
('Majestic Villas Phuket', 'Rawai', 'Phuket'),
('Eden Resort & Villas', 'Patong', 'Phuket'),
('The Orchid House', 'Kata', 'Phuket'),
('Nan inn Bungalow', 'Karon', 'Phuket'),
('Lime Hotel', 'Patong', 'Phuket'),
('ETK Patong', 'Patong', 'Phuket'),
('Sleep Box Patong - Hostel', 'Patong', 'Phuket'),
('Coral Inn', 'Karon', 'Phuket'),
('The Regent Resort Phuket', 'Kamala', 'Phuket'),
('Khao Oat Airport', 'Mai Khao', 'Phuket'),
('Baan Suan Villas Resort', 'Chalong', 'Phuket'),
('Pumeria Resort Phuket', 'Bang Tao', 'Phuket'),
('OYO 885 You And Me House', 'Patong', 'Phuket'),
('Baan Suay Hotel Resort', 'Karon', 'Phuket'),
('OYO 343 Wanna Marine', 'Patong', 'Phuket'),
('Hop On Phuket', 'Mai Khao', 'Phuket'),
('99 Residence', 'Patong', 'Phuket'),
('Kamala Cool 2', 'Kamala', 'Phuket'),
('Phu NaNa Boutique Hotel', 'Phuket Town', 'Phuket'),
('Oceana Sea View Apartments by Alexanders', 'Kamala', 'Phuket'),
('Monaburi Hotel', 'Rawai', 'Phuket'),
('Oneloft Hotel', 'Karon', 'Phuket'),
('Vipa House Phuket', 'Rawai', 'Phuket'),
('S2 Airport Residence', 'Nai Yang', 'Phuket'),
('D.J. House', 'Patong', 'Phuket'),
('Ice Kamala Beach Hotel', 'Kamala', 'Phuket'),
('Praew Mansion', 'Kamala', 'Phuket'),
('Amala Grand Bleu Resort Hilltops', 'Kamala', 'Phuket'),
('Karon Living Room', 'Karon', 'Phuket'),
('2 Home Resort', 'Chalong', 'Phuket'),
('Sea Hills Resort', 'Patong', 'Phuket'),
('TT Naiyang Beach Phuket', 'Nai Yang', 'Phuket'),
('Phusita House 3', 'Patong', 'Phuket'),
('Khaleej Mass Hotel Patong', 'Patong', 'Phuket'),
('Serenity Lakeside Resort', 'Kathu', 'Phuket'),
('Malin Patong Hotel', 'Patong', 'Phuket'),
('Sweet Dreams', 'Patong', 'Phuket'),
('Hotel Grand Orchid Inn', 'Patong', 'Phuket'),
('Rawai Grand House', 'Rawai', 'Phuket'),
('Good Day Phuket', 'Phuket Town', 'Phuket'),
('Lemonade Phuket', 'Chalong', 'Phuket'),
('Isayarada Apartment', 'Thep Krasattri', 'Phuket'),
('Jasmine Village', 'Rawai', 'Phuket'),
('Pensiri House', 'Nai Yang', 'Phuket'),
('Sun Shine Patong', 'Patong', 'Phuket'),
('Sabai Corner Bungalows', 'Phuket', 'Phuket'),
('Blue Sky Residence', 'Patong', 'Phuket'),
('Kata Interhouse Resort by Haii Collection', 'Kata', 'Phuket'),
('Panda Hotel（Patong Beach）', 'Patong', 'Phuket'),
('Rat Villa', 'Pa Klok', 'Phuket'),
('Amin Resort', 'Choeng Thale', 'Phuket'),
('Hotel de Karon', 'Karon', 'Phuket'),
('The Green Mansion', 'Patong', 'Phuket'),
('Le Desir Resortel', 'Chalong', 'Phuket'),
('Phu-Kamala', 'Kamala', 'Phuket'),
('Hotel De Ratt', 'Phuket Town', 'Phuket'),
('The Fusion Resort', 'Chalong', 'Phuket'),
('Patong Rai Rom Yen Resort SHA', 'Patong', 'Phuket'),
('Lemon House', 'Patong', 'Phuket'),
('Supicha pool access hotel', 'Phuket', 'Phuket'),
('The Residence Resort & Spa Retreat', 'Choeng Thale', 'Phuket'),
('Phuket La Siesta', 'Rawai', 'Phuket'),
('Magnific Patong', 'Patong', 'Phuket'),
('Happy Cottages Phuket', 'Chalong', 'Phuket'),
('Baan SS Karon', 'Karon', 'Phuket'),
('Ma Maison Phuket', 'Bang Tao', 'Phuket'),
('N&N HOUSE Laem Hin', 'Phuket Town', 'Phuket'),
('Baan Kim Lian Sha', 'Phuket Town', 'Phuket'),
('Naya Bungalow', 'Rawai', 'Phuket'),
('The Snug Airportel', 'Sakhu', 'Phuket'),
('Surin Bay Inn', 'Surin', 'Phuket'),
('Ruenthai Boutique', 'Nai Yang', 'Phuket'),
('Phoenix Grand Hotel', 'Patong', 'Phuket'),
('Louis'' Runway View Hotel', 'Mai Khao', 'Phuket'),
('Holiday Home Patong', 'Patong', 'Phuket'),
('BE Baan Paradise Hotel', 'Kathu', 'Phuket'),
('Blue Canyon Country Club', 'Mai Khao', 'Phuket'),
('Kata Leaf Resort', 'Kata', 'Phuket'),
('Eat n Sleep', 'Phuket Town', 'Phuket'),
('Safari Beach Hotel', 'Patong', 'Phuket'),
('Peace Blue Naiharn Naturist Resort Phuket', 'Rawai', 'Phuket'),
('Sunset Mansion', 'Patong', 'Phuket'),
('The Palms Residence', 'Kathu', 'Phuket'),
('Duangjai Residence', 'Phuket', 'Phuket'),
('Naiya Buree Boutique Resort', 'Rawai', 'Phuket'),
('Grace Patong Hotel', 'Patong', 'Phuket'),
('VII HOUSE RAWAI PHUKET', 'Rawai', 'Phuket'),
('The Chic Patong', 'Patong', 'Phuket'),
('Patong Signature Boutique Hotel', 'Patong', 'Phuket'),
('Splendid Sea View Resort', 'Karon', 'Phuket'),
('Bangtao Beach Chalet', 'Bang Tao', 'Phuket'),
('Cocoon Deva Hotel', 'Patong', 'Phuket'),
('Phoenix Hotel Karon Beach', 'Karon', 'Phuket'),
('Chez Charly Bungalow', 'Sakhu', 'Phuket'),
('Canal Resort', 'Thalang', 'Phuket'),
('Mission Hills Phuket Golf Resort', 'Pa Klok', 'Phuket'),
('Lokal Phuket', 'Patong', 'Phuket'),
('Meir Jarr Hotel', 'Patong', 'Phuket'),
('Prince Edouard Apartment & Resort', 'Patong', 'Phuket'),
('The Baray Villa by Sawasdee Village', 'Kata', 'Phuket'),
('Sugar Palm Grand Hillside', 'Karon', 'Phuket'),
('Hemingways Silk Hotel', 'Patong', 'Phuket'),
('Outdoor Inn Kata Hotel', 'Kata', 'Phuket'),
('On Hotel Phuket', 'Karon', 'Phuket'),
('Thai Modern Resort & Spa', 'Chalong', 'Phuket'),
('Mangosteen Ayurveda & Wellness Resort', 'Rawai', 'Phuket'),
('ChillHub Hostel', 'Bang Tao', 'Phuket'),
('The Casita Phuket', 'Mai Khao', 'Phuket'),
('KK - Karon Kata Boutique Hotel', 'Kata', 'Phuket'),
('The Par Phuket', 'Kathu', 'Phuket'),
('Casa Brazil Homestay & Gallery', 'Karon', 'Phuket'),
('G1 Touch Blue Sky', 'Kamala', 'Phuket'),
('Vech Guesthouse Patong', 'Patong', 'Phuket'),
('Boomerang Village Resort Kata', 'Kata', 'Phuket'),
('Dee Homestay', 'Pa Klok', 'Phuket'),
('Kata Beach Studio', 'Kata', 'Phuket'),
('Austrian Garden Hotel Patong', 'Patong', 'Phuket'),
('Martin''s Swiss Guesthouse', 'Patong', 'Phuket'),
('Dan''s Koyao Retreat', 'Phuket', 'Phuket'),
('iCheck inn Residences Patong', 'Patong', 'Phuket'),
('Neptuna Hotel by Maduzi', 'Patong', 'Phuket'),
('P.S. Hotel -SHA Plus', 'Patong', 'Phuket'),
('Lanting House Phuket', 'Patong', 'Phuket'),
('Choophorn House', 'Karon', 'Phuket'),
('Terminal 58', 'Sakhu', 'Phuket'),
('Laguna Villas Boutique Hotel', 'Laguna', 'Phuket'),
('The Elysium Residence', 'Chalong', 'Phuket'),
('Rabbit Mansion Patong Hotel', 'Patong', 'Phuket'),
('Kata Noi Resort', 'Kata', 'Phuket'),
('BS Airport at Phuket', 'Nai Yang', 'Phuket'),
('Backpacker Street Airport Place', 'Sakhu', 'Phuket'),
('Di Pantai Boutique Beach Resort', 'Patong', 'Phuket'),
('Andaman Place', 'Phuket Town', 'Phuket'),
('Thai Siam', 'Patong', 'Phuket'),
('Sugar Ohana Poshtel', 'Kata', 'Phuket'),
('Be Live Residence', 'Thep Krasattri', 'Phuket'),
('Must Sea Hotel Kata', 'Kata', 'Phuket'),
('Amalthea Hotel', 'Patong', 'Phuket'),
('The Gallery Hotel Nai Harn', 'Rawai', 'Phuket'),
('Kanya Cozy Bungalows Kata Beach', 'Kata', 'Phuket'),
('Ginis Beach Resort', 'Kamala', 'Phuket'),
('Cocoville Phuket Resort', 'Chalong', 'Phuket'),
('Blue Carina Hotel', 'Phuket Town', 'Phuket'),
('The Mantra Hotel', 'Kata', 'Phuket'),
('Phuket Racha at Kata Homestay', 'Kata', 'Phuket'),
('Baramee Resortel', 'Patong', 'Phuket'),
('Kata Tranquil Villa', 'Kata', 'Phuket'),
('1715 House & Caff Resort Phuket', 'Rawai', 'Phuket'),
('Siray Green Resort', 'Ratsada', 'Phuket'),
('Leam Sai Bungalows Koh Yao Noi', 'Phuket', 'Phuket'),
('Ron''s Bungalow', 'Choeng Thale', 'Phuket'),
('Karon Sino House', 'Karon', 'Phuket'),
('Koyao Bay Pavilions', 'Phuket', 'Phuket'),
('Naiyang Seaview Place', 'Nai Yang', 'Phuket'),
('Swiss Villas Panoramic', 'Patong', 'Phuket'),
('TAJH Pool Villas', 'Chalong', 'Phuket'),
('Tann Anda Resort', 'Thalang', 'Phuket'),
('Patong Platinums', 'Patong', 'Phuket'),
('Black Pearl Patong Beach', 'Patong', 'Phuket'),
('Villa Sonata Phuket', 'Chalong', 'Phuket'),
('Unotel Karon Beach', 'Karon', 'Phuket'),
('Prime Town - Posh & Port Hotel Phuket', 'Phuket Town', 'Phuket'),
('Dfeel House', 'Patong', 'Phuket'),
('Bougainvillea Terrace House', 'Karon', 'Phuket'),
('Anchanlina Hotel', 'Chalong', 'Phuket'),
('Baan Taranya Koh Yao Yai', 'Phuket', 'Phuket'),
('Sue at Cozy Guesthouse', 'Phuket', 'Phuket'),
('D Varee Mai Khao Beach', 'Mai Khao', 'Phuket'),
('ibis Phuket Kata', 'Kata', 'Phuket'),
('Hotel COCO Phuket Bangtao', 'Bang Tao', 'Phuket'),
('T-Villa Phuket Nai Yang Beach', 'Nai Yang', 'Phuket'),
('Royal Thai Villas Phuket', 'Rawai', 'Phuket'),
('Patong Princess Hotel', 'Patong', 'Phuket'),
('9 Hornbills Tented Camp', 'Phuket', 'Phuket'),
('Nanai 2 Residence Patong', 'Patong', 'Phuket'),
('Best Western Premier Bangtao Beach Resort & Spa', 'Bang Tao', 'Phuket'),
('Beachwalk Patong', 'Patong', 'Phuket'),
('Kamala Beach Residence', 'Kamala', 'Phuket'),
('Baan Pron Phateep', 'Patong', 'Phuket'),
('Big Boys'' Bed & Burger', 'Patong', 'Phuket'),
('77 Bangla Hotel', 'Patong', 'Phuket'),
('The Cove Phuket', 'Phuket Town', 'Phuket'),
('Freedom Kata', 'Kata', 'Phuket'),
('Thalang Resort', 'Si Sunthon', 'Phuket'),
('Le Piman Resort', 'Rawai', 'Phuket'),
('The Rubber Hotel', 'Thep Krasattri', 'Phuket'),
('Rayaburi Hotel Patong', 'Patong', 'Phuket'),
('Ya Nui Resort', 'Rawai', 'Phuket'),
('Baan Kongdee Sunset Resort', 'Karon', 'Phuket'),
('Chalong Princess Pool Villa Resort', 'Chalong', 'Phuket'),
('Naiyang Boutique Resort', 'Nai Yang', 'Phuket'),
('Kamala Resotel', 'Kamala', 'Phuket'),
('Jiraporn Hill Resort', 'Patong', 'Phuket'),
('Sungthong Kamala Beach Resort', 'Kamala', 'Phuket'),
('Simplitel', 'Karon', 'Phuket'),
('Am Surin Place', 'Surin', 'Phuket'),
('C&N Resort and Spa', 'Kathu', 'Phuket'),
('OYO 241 Ratana Hotel Sakdidet', 'Phuket', 'Phuket'),
('Thai Kamala Beach Front', 'Kamala', 'Phuket'),
('TIRAS Patong Beach Hotel', 'Patong', 'Phuket'),
('The Privilege Residences', 'Patong', 'Phuket'),
('Baan Sailom Resort', 'Karon', 'Phuket'),
('Baan Karon Resort', 'Karon', 'Phuket'),
('Airport Overnight Hotel', 'Mai Khao', 'Phuket'),
('Phuket Jungle Experience Resort', 'Karon', 'Phuket'),
('Break Point Hotel', 'Patong', 'Phuket'),
('Baan Krating Phuket Resort', 'Rawai', 'Phuket'),
('Mellow Space Boutique Rooms', 'Karon', 'Phuket'),
('Impress Resort', 'Thep Krasattri', 'Phuket'),
('Glur Phuket Patong Beach', 'Patong', 'Phuket'),
('P.S Hill Resort', 'Patong', 'Phuket'),
('Alphabeto Resort', 'Rawai', 'Phuket'),
('Phuket Gay Home Stay - Caters to Men', 'Kathu', 'Phuket'),
('Baan Waru Seaview', 'Phuket', 'Phuket'),
('B Happy Resort', 'Kamala', 'Phuket'),
('Norn Talay Surin Beach Phuket', 'Surin', 'Phuket'),
('Green House Phuket', 'Pa Klok', 'Phuket'),
('Patong Buri Resort', 'Patong', 'Phuket'),
('Siray House', 'Ratsada', 'Phuket'),
('Gu Hotel Patong', 'Patong', 'Phuket'),
('Kata Sea Host', 'Kata', 'Phuket'),
('Pai Tan Villas', 'Bang Tao', 'Phuket'),
('At Kamala Hotel', 'Kamala', 'Phuket'),
('Peranakan House', 'Phuket Town', 'Phuket'),
('Lotus Hotel Patong', 'Patong', 'Phuket'),
('Patong Sino House', 'Patong', 'Phuket'),
('BLU PINE Villa & Pool Access', 'Karon', 'Phuket'),
('Sun Hill Hotel Patong', 'Patong', 'Phuket'),
('Gemma Patong', 'Patong', 'Phuket'),
('Best Western Phuket Ocean Resort', 'Karon', 'Phuket'),
('Beehive Boutique Hotel Phuket', 'Phuket Town', 'Phuket'),
('Guesthouse Belvedere', 'Patong', 'Phuket'),
('Summer Breeze Hotel', 'Patong', 'Phuket'),
('Patong Moon Inn Guesthouse', 'Patong', 'Phuket'),
('Bora Bora Villa Phuket', 'Chalong', 'Phuket'),
('The Front Village', 'Karon', 'Phuket'),
('Paradise Inn', 'Phuket', 'Phuket'),
('Royal Beach Residence', 'Patong', 'Phuket'),
('Andaman Seaside Resort', 'Bang Tao', 'Phuket'),
('Hivetel', 'Chalong', 'Phuket'),
('Shanti Lodge Phuket', 'Chalong', 'Phuket'),
('Andaman Seaview Hotel', 'Karon', 'Phuket'),
('ANGPAO HOTEL', 'Ratsada', 'Phuket'),
('Maikhao Hotel', 'Mai Khao', 'Phuket'),
('Saiyuan Residence Phuket', 'Rawai', 'Phuket'),
('Kamala Dreams', 'Kamala', 'Phuket'),
('Minimal House Patong - Adults Only', 'Patong', 'Phuket'),
('Sky Wave Patong', 'Patong', 'Phuket'),
('Wyndham Royal Lee Phuket', 'Sakhu', 'Phuket'),
('iCheck Inn Chill Patong', 'Patong', 'Phuket'),
('Seaview Patong Hotel', 'Patong', 'Phuket'),
('FunDee Boutique Hotel', 'Patong', 'Phuket'),
('Allamanda Laguna Phuket by RESAVA', 'Choeng Thale', 'Phuket'),
('Kalim Resort', 'Patong', 'Phuket'),
('The AIM Patong Hotel', 'Patong', 'Phuket'),
('Chill House @ Nai Yang Beach', 'Nai Yang', 'Phuket'),
('De coze'' Hotel', 'Patong', 'Phuket'),
('Chivatara Resort & Spa Bang Tao Beach', 'Bang Tao', 'Phuket'),
('Malabar Pool Villa Phuket', 'Ratsada', 'Phuket'),
('Micky Monkey Beach Hotel Phuket Maikhao Thailand', 'Mai Khao', 'Phuket'),
('Kamala Cool', 'Kamala', 'Phuket'),
('Memory Karon Resort', 'Karon', 'Phuket'),
('Coconut Village Resort', 'Patong', 'Phuket'),
('Maikhao Beach Residence', 'Mai Khao', 'Phuket'),
('CA Hotel and Residence Phuket', 'Phuket Town', 'Phuket'),
('Racha Island Resort', 'Rawai', 'Phuket'),
('Hip Hostel', 'Patong', 'Phuket'),
('Naka Resort', 'Kamala', 'Phuket'),
('Roost Glamping', 'Rawai', 'Phuket'),
('The Palmery Resort', 'Karon', 'Phuket'),
('Signature Phuket Resort', 'Chalong', 'Phuket'),
('B & B Patong Beach House', 'Patong', 'Phuket'),
('Recenta Suite Phuket Suanluang', 'Phuket Town', 'Phuket'),
('Breezotel', 'Patong', 'Phuket'),
('The Simple Koh Yao Noi', 'Phuket', 'Phuket'),
('OYO 118 Beach Walk Stay', 'Phuket', 'Phuket'),
('Nu Phuket Airport Residence', 'Mai Khao', 'Phuket'),
('Winrisa Place', 'Sakhu', 'Phuket'),
('Naiyang Beach Hotel', 'Nai Yang', 'Phuket'),
('Sugar Marina Hotel - NAUTICAL - Kata Beach', 'Kata', 'Phuket'),
('Moonlight Cottage Phuket', 'Pa Klok', 'Phuket'),
('Garden Home Kata', 'Kata', 'Phuket'),
('Mala Hotel', 'Karon', 'Phuket'),
('Absolute Bangla Suites', 'Patong', 'Phuket'),
('Kata Garden Resort', 'Kata', 'Phuket'),
('Club Bamboo Boutique Patong Beach Resort', 'Patong', 'Phuket'),
('Amarin Hotel Patong', 'Patong', 'Phuket'),
('Seven Seas Hotel', 'Patong', 'Phuket'),
('Baan Boa Resort', 'Patong', 'Phuket'),
('PK Mansion', 'Phuket Town', 'Phuket'),
('Himaphan Boutique Resort', 'Nai Yang', 'Phuket'),
('Coco Paradiso Phuket Hotel', 'Chalong', 'Phuket'),
('Neon Patong Hotel', 'Patong', 'Phuket'),
('Forty Winks Phuket', 'Patong', 'Phuket'),
('Golden Paradise Hotel', 'Karon', 'Phuket'),
('Porterhouse Beach Hotel', 'Patong', 'Phuket'),
('The Front Hotel and Apartment', 'Patong', 'Phuket'),
('The Beach Boutique House', 'Kata', 'Phuket'),
('Loftpical Resort', 'Phuket', 'Phuket'),
('Karon Beach Pool Hotel', 'Karon', 'Phuket'),
('Oceanstone by RESAVA', 'Choeng Thale', 'Phuket'),
('Anattaya Holiday Home', 'Phuket', 'Phuket'),
('Phuket Nonnita Boutique Resort', 'Phuket Town', 'Phuket'),
('Good Nice Hotel Patong', 'Patong', 'Phuket'),
('Villoft Zen Living', 'Choeng Thale', 'Phuket'),
('The Nice Patong Hotel', 'Patong', 'Phuket'),
('Mai Morn Resort', 'Phuket Town', 'Phuket'),
('The Artist House', 'Patong', 'Phuket'),
('Diamond Cottage Resort & Spa', 'Karon', 'Phuket'),
('Ruen Buathong Boutique Hotel', 'Patong', 'Phuket'),
('Park 38 Hotel', 'Phuket Town', 'Phuket'),
('The Pe La Resort, Phuket', 'Kamala', 'Phuket'),
('AJ Residence', 'Ratsada', 'Phuket'),
('Smile Residence', 'Rawai', 'Phuket'),
('P.S2 Resort', 'Patong', 'Phuket'),
('Nankanok Bungalow', 'Phuket', 'Phuket'),
('Kantary Bay Hotel, Phuket', 'Phuket Town', 'Phuket'),
('NOBLE HOUSE PATONG', 'Patong', 'Phuket'),
('Baan Laimai Beach Resort & Spa', 'Patong', 'Phuket'),
('The Guest House - SHA', 'Phuket', 'Phuket'),
('Aquarius Gay Guesthouse & Sauna', 'Patong', 'Phuket'),
('Sleepy Station - Hostel', 'Karon', 'Phuket'),
('Sai Rougn Residence', 'Patong', 'Phuket'),
('Chabana Resort', 'Choeng Thale', 'Phuket'),
('Little Nyonya Hotel', 'Wichit', 'Phuket'),
('Sugar Marina Hotel – FASHION – Kata Beach', 'Kata', 'Phuket'),
('Dome Resort', 'Kata', 'Phuket'),
('Marina House MUAYTHAI Ta-iad Phuket', 'Chalong', 'Phuket'),
('Lae Lay Suites', 'Karon', 'Phuket'),
('Nipa Resort', 'Patong', 'Phuket'),
('Ban Raya Resort and Spa', 'Rawai', 'Phuket'),
('Wanna Marine', 'Patong', 'Phuket'),
('Wyndham La Vita Rawai Phuket', 'Rawai', 'Phuket'),
('Impiana Private Villas Kata Noi', 'Kata', 'Phuket'),
('Sivana Place Phuket', 'Choeng Thale', 'Phuket'),
('Naiyang Place Phuket Airport', 'Nai Yang', 'Phuket'),
('Palm Garden Resort', 'Rawai', 'Phuket'),
('Casa Jip Guesthouse', 'Patong', 'Phuket'),
('Z&Z Resort', 'Rawai', 'Phuket'),
('The Kiri Villas Resort', 'Si Sunthon', 'Phuket'),
('Leelawadee Naka', 'Phuket Town', 'Phuket'),
('Karon Café Inn', 'Karon', 'Phuket'),
('Pamookkoo Resort', 'Kata', 'Phuket'),
('Starbeach Guest House', 'Patong', 'Phuket'),
('New Forest Patong', 'Patong', 'Phuket'),
('Sunrise Beach Koh Yao Resort', 'Phuket', 'Phuket'),
('The Mangrove Panwa Phuket Resort', 'Phuket Town', 'Phuket'),
('Naka Residence', 'Phuket Town', 'Phuket'),
('Grand Sunset Hotel Phuket', 'Karon', 'Phuket'),
('Kana Triple L Hotel', 'Patong', 'Phuket'),
('Tinidee Golf Resort Phuket', 'Kathu', 'Phuket'),
('ASHLEE Heights Hotel Patong', 'Patong', 'Phuket'),
('The Palms Kamala Beach', 'Kamala', 'Phuket'),
('Mom Tri''s Villa Royale', 'Kata', 'Phuket'),
('Chalong Chalet Resort & Longstay', 'Chalong', 'Phuket'),
('Ramaburin Resort', 'Patong', 'Phuket'),
('Citrus Patong Hotel by Compass Hospitality', 'Patong', 'Phuket'),
('The Expat Hotel', 'Patong', 'Phuket'),
('Coco Retreat Phuket Resort & Spa', 'Chalong', 'Phuket'),
('Capricorn Village', 'Patong', 'Phuket'),
('Kata Hill Sea View', 'Kata', 'Phuket'),
('The View Rawada Phuket', 'Phuket', 'Phuket'),
('The Lake Chalong Hotel', 'Chalong', 'Phuket'),
('Hotel Sole', 'Patong', 'Phuket'),
('Karon Village Hotel', 'Karon', 'Phuket'),
('The Regent Phuket Bangtao Beach', 'Bang Tao', 'Phuket'),
('Twinpalms MontAzure Phuket Resort', 'Kamala', 'Phuket'),
('Amber Residence', 'Phuket', 'Phuket'),
('Phuket Boat Quay', 'Phuket', 'Phuket'),
('The Album Hotel', 'Patong', 'Phuket'),
('A2 Pool Resort', 'Phuket Town', 'Phuket'),
('Baan Yin Dee Boutique Resort', 'Patong', 'Phuket'),
('beHOME Phuket', 'Nai Yang', 'Phuket'),
('Patong Mansion Hotel', 'Patong', 'Phuket'),
('Patong Palace Hotel', 'Patong', 'Phuket'),
('The Racha', 'Rawai', 'Phuket'),
('The Viridian Resort', 'Patong', 'Phuket'),
('Quality Beach Resorts and Spa Patong', 'Patong', 'Phuket'),
('The Woods Natural Park Resort Phuket', 'Kamala', 'Phuket'),
('Nonnee', 'Kata', 'Phuket'),
('Casa Del M Phuket', 'Patong', 'Phuket'),
('ASHLEE Hub Hotel Patong', 'Patong', 'Phuket'),
('The Blue Pearl Kata Hotel', 'Kata', 'Phuket'),
('Koyao Island Resort', 'Phuket', 'Phuket'),
('Bangtao Village Resort', 'Bang Tao', 'Phuket'),
('Artisan Koh Yao Yai', 'Phuket', 'Phuket'),
('JB Green Hotel Patong', 'Patong', 'Phuket'),
('The Mooring Resort', 'Wichit', 'Phuket'),
('Kokotel Phuket Patong', 'Patong', 'Phuket'),
('7Q Patong Beach Hotel', 'Patong', 'Phuket'),
('The Album Loft at Nanai', 'Kathu', 'Phuket'),
('The Beach Heights Resort', 'Kata', 'Phuket'),
('Kamala Beach Estate', 'Kamala', 'Phuket'),
('Kamala Beachfront Apartment', 'Kamala', 'Phuket'),
('Nicky''s Handlebar Hotel', 'Patong', 'Phuket'),
('Sugar Marina Resort -Surf- Kata Beach', 'Kata', 'Phuket'),
('Pimnara Boutique Hotel', 'Patong', 'Phuket'),
('Hotel The Journey Patong New', 'Patong', 'Phuket'),
('The House Patong', 'Patong', 'Phuket'),
('The Sixteenth Naiyang Beach Hotel', 'Nai Yang', 'Phuket'),
('The Loft Panwa Resort', 'Phuket Town', 'Phuket'),
('Sai Kaew House', 'Thalang', 'Phuket'),
('Phaithong Sotel Resort', 'Chalong', 'Phuket'),
('The Yorkshire Hotel', 'Patong', 'Phuket'),
('Rak Elegant Hotel Patong', 'Patong', 'Phuket'),
('Clarian Hotel Beach Patong', 'Patong', 'Phuket'),
('Chalong Miracle Lakeview Resort & Spa', 'Chalong', 'Phuket'),
('Phuketa Hotel', 'Phuket Town', 'Phuket'),
('My Hotel', 'Phuket', 'Phuket'),
('Thanyapura Sports & Health Resort', 'Thep Krasattri', 'Phuket'),
('ACCESS Resort & Villas', 'Karon', 'Phuket'),
('Airport Beach Hotel Phuket', 'Sakhu', 'Phuket'),
('Princess Seaview Resort & Spa', 'Phuket Town', 'Phuket'),
('Armoni Patong Beach Hotel', 'Patong', 'Phuket'),
('Andaman Beach Suites Hotel', 'Patong', 'Phuket'),
('Bel Aire Resort Phuket', 'Patong', 'Phuket'),
('ibis Phuket Patong', 'Patong', 'Phuket'),
('Marina Gallery Resort Kacha Kalim Bay', 'Patong', 'Phuket'),
('Homm Bliss Southbeach Patong', 'Patong', 'Phuket'),
('Nize Hotel', 'Phuket', 'Phuket'),
('The Patong Center Hotel', 'Patong', 'Phuket'),
('Wabi Sabi Boutique Hotel', 'Kamala', 'Phuket'),
('Centro One Patong', 'Patong', 'Phuket'),
('Naiya Beach Bungalow', 'Phuket', 'Phuket'),
('The Little Mermaid Guesthouse & Restaurant', 'Karon', 'Phuket'),
('At Night Airport Resort', 'Phuket', 'Phuket'),
('Lamai Hotel', 'Patong', 'Phuket'),
('Little Loft Hotel', 'Wichit', 'Phuket'),
('Chalong Sea Breeze', 'Rawai', 'Phuket'),
('Horizon Karon Beach Resort & Spa', 'Karon', 'Phuket'),
('Ban Paea', 'Phuket', 'Phuket'),
('Baan Kamala Fantasea Hotel', 'Kamala', 'Phuket'),
('Areca Resort & Spa', 'Phuket Town', 'Phuket'),
('Koh Yao Yai Hillside Resort', 'Phuket', 'Phuket'),
('Baan Thai Beach Side Residence', 'Patong', 'Phuket'),
('The Lantern Resorts Patong', 'Patong', 'Phuket'),
('Baipho Lifestyle', 'Kathu', 'Phuket'),
('Purana Resort Koh Yao Noi', 'Phuket', 'Phuket'),
('Patong Dynasty Royal Hotel', 'Patong', 'Phuket'),
('Paradise KohYao', 'Phuket', 'Phuket'),
('Peach Blossom Resort', 'Karon', 'Phuket'),
('Naiyang Park Resort', 'Nai Yang', 'Phuket'),
('Orchid Garden Hotel', 'Kathu', 'Phuket'),
('Kata Poolside Resort', 'Kata', 'Phuket'),
('ASHLEE Plaza Patong Hotel & Spa', 'Patong', 'Phuket'),
('Anda Beachside Hotel', 'Karon', 'Phuket'),
('Beyond Patong', 'Patong', 'Phuket'),
('Thanthip Beach Resort', 'Patong', 'Phuket'),
('Centre Point Patong', 'Patong', 'Phuket'),
('O''nya Phuket Hotel', 'Phuket Town', 'Phuket'),
('Phuvaree Resort', 'Patong', 'Phuket'),
('foto Hotel Phuket', 'Ratsada', 'Phuket'),
('The Color Kata', 'Kata', 'Phuket'),
('Karon Phunaka Resort', 'Karon', 'Phuket'),
('Patong Lodge Hotel', 'Patong', 'Phuket'),
('Phuket Island View Resort', 'Karon', 'Phuket'),
('Paripas Express Hotel Patong', 'Patong', 'Phuket'),
('The Frutta Boutique Patong Beach', 'Patong', 'Phuket'),
('Sea Front Home', 'Patong', 'Phuket'),
('Boomerang Inn', 'Phuket', 'Phuket'),
('SR Sea View Apartments', 'Patong', 'Phuket'),
('The Thames Pool Access Resort SHA+', 'Chalong', 'Phuket'),
('GLOW Mira Karon Beach', 'Karon', 'Phuket'),
('Alfresco Phuket Hotel', 'Kathu', 'Phuket'),
('Red Planet Phuket Patong', 'Patong', 'Phuket'),
('Aqua Resort', 'Rawai', 'Phuket'),
('V Villas Phuket - MGallery', 'Phuket Town', 'Phuket'),
('Peach Hill Resort', 'Karon', 'Phuket'),
('Patong Hemingway''s Hotel', 'Patong', 'Phuket'),
('Sino Maison Hotel', 'Patong', 'Phuket'),
('By the Sea', 'Wichit', 'Phuket'),
('Maikhao Dream Villa Resort & Spa', 'Mai Khao', 'Phuket'),
('Sugar Marina Hotel - ART - Karon Beach', 'Karon', 'Phuket'),
('Kamala Phuyai Resort', 'Patong', 'Phuket'),
('Beyond Karon', 'Karon', 'Phuket'),
('Naina Resort & Spa', 'Patong', 'Phuket'),
('Banhalawee', 'Phuket', 'Phuket'),
('Phuket Sea Resort', 'Rawai', 'Phuket'),
('R Mar Resort and Spa', 'Patong', 'Phuket'),
('The Luna Hostel', 'Nai Yang', 'Phuket'),
('DARA Hotel', 'Phuket Town', 'Phuket'),
('Coco Boutique Hotel', 'Patong', 'Phuket'),
('Wekata Luxury', 'Kata', 'Phuket'),
('Kudo Hotel & Beach Club (Adults Only)', 'Patong', 'Phuket'),
('The Boathouse Phuket', 'Kata', 'Phuket'),
('The Bell Airport Phuket Hotel', 'Nai Yang', 'Phuket'),
('Perennial Resort', 'Phuket', 'Phuket'),
('BYD Lofts Boutique Hotel & Serviced Apartments - Patong Beach, Phuket', 'Patong', 'Phuket'),
('Baumancasa Beach Resort', 'Karon', 'Phuket'),
('CRAFT Resort & Villas', 'Phuket Town', 'Phuket'),
('Mövenpick Phuket Bangtao', 'Bang Tao', 'Phuket'),
('On The Hill Karon Resort', 'Karon', 'Phuket'),
('Coriacea Boutique Resort', 'Mai Khao', 'Phuket'),
('Paresa Resort Phuket', 'Kamala', 'Phuket'),
('Absolute Twin Sands Resort & Spa', 'Patong', 'Phuket'),
('Kata White Villas', 'Kata', 'Phuket'),
('New Square Patong Hotel', 'Patong', 'Phuket'),
('La Vista Patong Hotel', 'Patong', 'Phuket'),
('The Village Resort & Spa', 'Karon', 'Phuket'),
('Trisara Villas & Residences Phuket', 'Choeng Thale', 'Phuket'),
('Cape Kudu Hotel', 'Phuket', 'Phuket'),
('Woraburi Phuket Resort & Spa', 'Karon', 'Phuket'),
('Ratana Apart Hotel at Chalong', 'Chalong', 'Phuket'),
('JonoX Phuket Karon Hotel', 'Karon', 'Phuket'),
('Phuket Orchid Resort and Spa', 'Karon', 'Phuket'),
('BearPacker Patong Hostel', 'Patong', 'Phuket'),
('Ratana Hotel Rassada', 'Phuket Town', 'Phuket'),
('myPatong Social Hostel', 'Patong', 'Phuket'),
('Elixir Koh Yao Yai', 'Phuket', 'Phuket'),
('Secret Cliff Resort Phuket', 'Karon', 'Phuket'),
('Beyond Kata', 'Kata', 'Phuket'),
('Nai Yang Beach Resort & Spa', 'Nai Yang', 'Phuket'),
('Royal Yao Yai Island Beach Resort -sha Extra Plus+', 'Phuket', 'Phuket'),
('77 Patong Hotel & Spa', 'Patong', 'Phuket'),
('Six Senses Yao Noi', 'Phuket', 'Phuket'),
('TreeHouse Villas - Adults Only', 'Phuket', 'Phuket'),
('Cape Panwa Hotel', 'Phuket Town', 'Phuket'),
('SALA Phuket Mai Khao Beach Resort', 'Mai Khao', 'Phuket'),
('Karon Sea Sands Resort', 'Karon', 'Phuket'),
('Navatara Phuket Resort', 'Rawai', 'Phuket'),
('Karona Resort & Spa', 'Karon', 'Phuket'),
('Naiharn Beach Resort', 'Rawai', 'Phuket'),
('Baan Karon Hill Phuket Resort', 'Karon', 'Phuket'),
('Ramada by Wyndham Phuket Deevana Patong', 'Patong', 'Phuket'),
('Icheck Inn Darisa Patong', 'Patong', 'Phuket'),
('The Little Moon Residence', 'Patong', 'Phuket'),
('B2 Phuket Premier Hotel', 'Kathu', 'Phuket'),
('Kata Rocks', 'Kata', 'Phuket'),
('Tour De Phuket Hotel', 'Si Sunthon', 'Phuket'),
('Ma Doo Bua Phuket (มาดูบัวภูเก็ต)', 'Choeng Thale', 'Phuket'),
('Benjamin Resort', 'Kathu', 'Phuket'),
('The Old Phuket - Karon Beach Resort', 'Karon', 'Phuket'),
('Wyndham Grand Nai Harn Beach Phuket', 'Rawai', 'Phuket'),
('The Crystal Beach Hotel', 'Patong', 'Phuket'),
('Centro One Bangla', 'Patong', 'Phuket'),
('Slumber Party Surf Kata Phuket', 'Kata', 'Phuket'),
('Royal Phawadee Village', 'Patong', 'Phuket'),
('SKYVIEW Resort Phuket Patong Beach', 'Patong', 'Phuket'),
('Honey Resort', 'Kata', 'Phuket'),
('Maya Phuket Airport Hotel', 'Nai Yang', 'Phuket'),
('Tuana Hotels Casa Del Sol', 'Karon', 'Phuket'),
('Island Patong Beachfront Apartments', 'Patong', 'Phuket'),
('Thiw Son Beach Resort', 'Phuket', 'Phuket'),
('Suuko Wellness & Spa Resort', 'Chalong', 'Phuket'),
('Freedom', 'Kathu', 'Phuket'),
('Phuket Airport Place', 'Mai Khao', 'Phuket'),
('Seabed Grand Hotel Phuket', 'Wichit', 'Phuket'),
('CC''s Hideaway', 'Karon', 'Phuket'),
('Baumanburi', 'Patong', 'Phuket'),
('Limburi Hometel', 'Patong', 'Phuket'),
('Layalina Hotel', 'Kamala', 'Phuket'),
('Andaman White Beach Resort', 'Thalang', 'Phuket'),
('Bt Inn Patong', 'Patong', 'Phuket'),
('Phuket Airport Sonwa Resort', 'Sakhu', 'Phuket'),
('TJ Patong Hotel', 'Patong', 'Phuket'),
('Chanalai Hillside Resort, Karon Beach', 'Karon', 'Phuket'),
('Chabana Kamala Hotel', 'Patong', 'Phuket'),
('Aurico Kata Resort & Spa', 'Kata', 'Phuket'),
('Andaman Beach Hotel Phuket - Handwritten Collection', 'Patong', 'Phuket'),
('The Beachfront Hotel Phuket', 'Rawai', 'Phuket'),
('Phunawa Resort', 'Phuket Town', 'Phuket'),
('Sleep Inn Phuket', 'Patong', 'Phuket'),
('Best Western Patong Beach', 'Patong', 'Phuket'),
('Andaman Cannacia Resort & Spa', 'Kata', 'Phuket'),
('Orchidacea Resort', 'Karon', 'Phuket'),
('Airport Resort Phuket', 'Sakhu', 'Phuket'),
('Tanawan Phuket Hotel', 'Patong', 'Phuket'),
('Kata Sea Breeze Resort', 'Kata', 'Phuket'),
('S4 Nai Yang Beach', 'Nai Yang', 'Phuket'),
('Naithonburi Beach Resort', 'Sakhu', 'Phuket'),
('Woovo Phuket Patong', 'Patong', 'Phuket'),
('Sunray Beach Hotel', 'Patong', 'Phuket'),
('Centara Karon Resort Phuket', 'Karon', 'Phuket'),
('Ocean View Treasure Residence', 'Patong', 'Phuket'),
('Mövenpick Myth Hotel Patong Phuket', 'Patong', 'Phuket'),
('Phuket Airport Hotel', 'Phuket', 'Phuket'),
('MAZI Design Hotel by Kalima', 'Patong', 'Phuket'),
('Amora Beach Resort Phuket', 'Bang Tao', 'Phuket'),
('NH Boat Lagoon Phuket Resort', 'Phuket Town', 'Phuket'),
('Sea Pearl Beach Resort', 'Patong', 'Phuket'),
('Metadee Concept Hotel', 'Kata', 'Phuket'),
('SLEEP WITH ME HOTEL design hotel @ patong', 'Patong', 'Phuket'),
('David Residence', 'Mai Khao', 'Phuket'),
('Aspery Hotel', 'Patong', 'Phuket'),
('The Bloc Hotel', 'Patong', 'Phuket'),
('Thavorn Palm Beach Resort Phuket', 'Karon', 'Phuket'),
('Avani+ Mai Khao Phuket Suites', 'Mai Khao', 'Phuket'),
('Princess Kamala Beachfront Hotel', 'Kamala', 'Phuket'),
('Sunsuri Phuket', 'Phuket Town', 'Phuket'),
('Cassia Phuket - a brand of Banyan Group', 'Choeng Thale', 'Phuket'),
('OZO Phuket', 'Kata', 'Phuket'),
('The Kee Resort & Spa', 'Patong', 'Phuket'),
('Novotel Phuket Kamala Beach', 'Kamala', 'Phuket'),
('The Crib Patong', 'Patong', 'Phuket'),
('The Senses Resort & Pool Villas, Phuket', 'Patong', 'Phuket'),
('APK Resort', 'Patong', 'Phuket'),
('Dusit Thani Laguna Phuket', 'Choeng Thale', 'Phuket'),
('Acca Patong Apartments', 'Patong', 'Phuket'),
('Patong Bay Residence', 'Patong', 'Phuket'),
('Melia Phuket Mai Khao', 'Mai Khao', 'Phuket'),
('Rosewood Phuket', 'Patong', 'Phuket'),
('The Naka Island, a Luxury Collection Resort & Spa, Phuket', 'Pa Klok', 'Phuket'),
('Keemala', 'Kamala', 'Phuket'),
('Andakira Hotel', 'Patong', 'Phuket'),
('Silver Resortel', 'Patong', 'Phuket'),
('Baan Yuree Resort and Spa', 'Patong', 'Phuket'),
('Renaissance Phuket Resort & Spa', 'Mai Khao', 'Phuket'),
('Noku Phuket', 'Chalong', 'Phuket'),
('Barcelo Coconut Island Phuket', 'Phuket Town', 'Phuket'),
('Chanalai Flora Resort, Kata Beach', 'Kata', 'Phuket'),
('The Surin Phuket', 'Surin', 'Phuket'),
('Orchid Resortel', 'Patong', 'Phuket'),
('The Gig Hotel', 'Patong', 'Phuket'),
('IndoChine Resort & Villas', 'Patong', 'Phuket'),
('Kata Palm Resort', 'Kata', 'Phuket'),
('Buasri Boutique Patong', 'Patong', 'Phuket'),
('Radisson Resort and Suites Phuket', 'Kamala', 'Phuket'),
('Aochalong Villa Resort & Spa', 'Chalong', 'Phuket'),
('Baan Karonburi Resort', 'Karon', 'Phuket'),
('Patong Poshtel - Adults Only - Hostel', 'Patong', 'Phuket'),
('PJ Patong Resortel', 'Patong', 'Phuket'),
('Friendship Beach Resort & Atmanjai Wellness Spa', 'Rawai', 'Phuket'),
('Nouveau Guesthouse', 'Kathu', 'Phuket'),
('P R Patong Hotel', 'Patong', 'Phuket'),
('Sugar Marina Hotel - AVIATOR - Phuket Airport', 'Sakhu', 'Phuket'),
('Bauman residence Patong, Phuket', 'Patong', 'Phuket'),
('The Lunar Patong', 'Patong', 'Phuket'),
('Baba House Phuket Hotel', 'Wichit', 'Phuket'),
('Tropica Bungalow Resort', 'Patong', 'Phuket'),
('Zenmaya Oceanfront Phuket, Trademark Collection by Wyndham', 'Phuket', 'Phuket'),
('Sunwing Kamala Beach', 'Kamala', 'Phuket'),
('Twinpalms Surin Phuket Resort', 'Surin', 'Phuket'),
('Phuket Airport Inn', 'Sakhu', 'Phuket'),
('Rawai Palm Beach Resort', 'Rawai', 'Phuket'),
('Proud Phuket', 'Nai Yang', 'Phuket'),
('Bandara Villas Phuket', 'Phuket Town', 'Phuket'),
('OUTRIGGER Surin Beach Resort', 'Surin', 'Phuket'),
('The SIS Kata Resort - Adult Only', 'Kata', 'Phuket'),
('Fusion Suites Phuket Patong', 'Patong', 'Phuket'),
('The Yama Hotel Phuket', 'Karon', 'Phuket'),
('Koh Yao Yai Village', 'Phuket', 'Phuket'),
('Impiana Resort Patong', 'Patong', 'Phuket'),
('Andamantra Resort and Villa Phuket', 'Patong', 'Phuket'),
('Andaman Embrace Patong', 'Patong', 'Phuket'),
('Selina Serenity Rawai Phuket', 'Rawai', 'Phuket'),
('Bauman Ville Hotel', 'Patong', 'Phuket'),
('LIV Hotel Phuket Patong Beachfront', 'Patong', 'Phuket'),
('Maikhao Palm Beach Resort', 'Mai Khao', 'Phuket'),
('Patong Paragon Resort & Spa', 'Patong', 'Phuket'),
('Arinara Beach Resort Phuket', 'Bang Tao', 'Phuket'),
('Chanalai Romantica Resort Kata Beach - Adults Only', 'Kata', 'Phuket'),
('The Pago Design Hotel Phuket', 'Phuket Town', 'Phuket'),
('THE NATURAL RESORT', 'Patong', 'Phuket'),
('MIDA Grande Resort Phuket', 'Surin', 'Phuket'),
('Tony Resort', 'Patong', 'Phuket'),
('La Flora Resort Patong', 'Patong', 'Phuket'),
('Patong Heritage', 'Patong', 'Phuket'),
('Sinae Phuket', 'Phuket Town', 'Phuket'),
('Angsana Laguna Phuket', 'Choeng Thale', 'Phuket'),
('C & N Hotel Patong', 'Patong', 'Phuket'),
('Kata Beachwalk Hotel and Bungalows', 'Kata', 'Phuket'),
('Deevana Plaza Phuket', 'Patong', 'Phuket'),
('Journeyhub Phuket Patong', 'Patong', 'Phuket'),
('Phuket Siray Hut Resort', 'Rawai', 'Phuket'),
('Fishermen''s Harbour Urban Resort', 'Patong', 'Phuket'),
('Le Meridien Phuket Beach Resort', 'Karon', 'Phuket'),
('Zenseana Resort & Spa', 'Patong', 'Phuket'),
('Le Resort and Villas', 'Kata', 'Phuket'),
('Katathani Phuket Beach Resort', 'Kata', 'Phuket'),
('Phuket Marriott Resort and Spa, Nai Yang Beach', 'Nai Yang', 'Phuket'),
('JW Marriott Phuket Resort & Spa', 'Mai Khao', 'Phuket'),
('COMO Point Yamu, Phuket', 'Pa Klok', 'Phuket'),
('Nap Patong', 'Patong', 'Phuket'),
('Pullman Phuket Karon Beach Resort', 'Karon', 'Phuket'),
('Hotel Indigo Phuket Patong, an IHG Hotel', 'Patong', 'Phuket'),
('Pullman Phuket Arcadia Naithon Beach', 'Phuket', 'Phuket'),
('Wyndham Sea Pearl Resort Phuket', 'Patong', 'Phuket'),
('The Nature Phuket', 'Patong', 'Phuket'),
('Panwaburi Beachfront Resort', 'Phuket Town', 'Phuket'),
('Hotel Baya Patong', 'Patong', 'Phuket'),
('Patong Resort', 'Patong', 'Phuket'),
('Seeka Boutique Resort', 'Patong', 'Phuket'),
('Splash Beach Resort, Mai Khao, Phuket', 'Mai Khao', 'Phuket'),
('SAii Laguna Phuket', 'Bang Tao', 'Phuket'),
('Grand Mercure Phuket Patong', 'Patong', 'Phuket'),
('The Charm Resort Phuket', 'Patong', 'Phuket'),
('Kamala Beach Resort, A Sunprime Resort - Adults Only', 'Kamala', 'Phuket'),
('Courtyard by Marriott Phuket, Patong Beach Resort', 'Patong', 'Phuket'),
('Novotel Phuket Resort', 'Patong', 'Phuket'),
('The Marina Phuket Hotel', 'Patong', 'Phuket'),
('Avista Hideaway Phuket Patong - MGallery', 'Patong', 'Phuket'),
('Oceanfront Beach Resort', 'Patong', 'Phuket'),
('Holiday Inn Resort Phuket, an IHG Hotel', 'Patong', 'Phuket'),
('Holiday Inn Express Phuket Patong Beach Central, an IHG Hotel', 'Patong', 'Phuket'),
('Centara Grand Beach Resort Phuket', 'Karon', 'Phuket'),
('Pacific Club Resort', 'Phuket', 'Phuket'),
('Amatara Welleisure Resort', 'Phuket', 'Phuket'),
('Dinso Resort & Villas Phuket, Vignette Collection, an IHG Hotel', 'Patong', 'Phuket'),
('Phuket Panwa Beachfront Resort', 'Phuket Town', 'Phuket'),
('M Social Hotel Phuket', 'Patong', 'Phuket'),
('Palmyra Patong Resort', 'Patong', 'Phuket'),
('Amata Patong', 'Patong', 'Phuket'),
('The Royal Paradise Hotel & Spa', 'Patong', 'Phuket'),
('Dewa Phuket Resort & Villas', 'Thalang', 'Phuket'),
('The Shore at Katathani', 'Kata', 'Phuket'),
('Holiday Inn Resort Phuket Surin Beach, an IHG Hotel', 'Surin', 'Phuket'),
('Burasari Phuket Resort & Spa', 'Patong', 'Phuket'),
('Stay Wellbeing & Lifestyle Resort', 'Rawai', 'Phuket'),
('Crest Resort & Pool Villas', 'Patong', 'Phuket'),
('Le Méridien Phuket Mai Khao Beach Resort', 'Mai Khao', 'Phuket'),
('Hallo Patong Hotel & Restaurant', 'Patong', 'Phuket'),
('Wyndham Grand Phuket Kalim Bay', 'Kamala', 'Phuket'),
('Hotel IKON Phuket', 'Karon', 'Phuket'),
('Hyatt Regency Phuket Resort', 'Kamala', 'Phuket'),
('The Vijitt Resort Phuket', 'Rawai', 'Phuket'),
('L''esprit de Naiyang Beach Resort', 'Nai Yang', 'Phuket'),
('Novotel Phuket Kata Avista Resort And Spa', 'Kata', 'Phuket'),
('Kalima Resort & Spa, Phuket', 'Patong', 'Phuket'),
('InterContinental Phuket Resort, an IHG Hotel', 'Kamala', 'Phuket'),
('Chanalai Garden Resort, Kata Beach', 'Kata', 'Phuket'),
('Lub d Phuket Patong - Hostel', 'Patong', 'Phuket'),
('Thavorn Beach Village Resort & Spa Phuket', 'Kamala', 'Phuket'),
('Cape Sienna Gourmet Hotel & Villas', 'Kamala', 'Phuket'),
('DoubleTree by Hilton Phuket Banthai Resort', 'Patong', 'Phuket'),
('Novotel Phuket Vintage Park', 'Patong', 'Phuket'),
('Duangjitt Resort, Phuket', 'Patong', 'Phuket'),
('The Pavilions Phuket', 'Choeng Thale', 'Phuket'),
('Panphuree Residence', 'Sakhu', 'Phuket'),
('Centara Kata Resort Phuket', 'Kata', 'Phuket'),
('Modern Living Hotel', 'Patong', 'Phuket'),
('Ramada Plaza by Wyndham Chao Fah', 'Wichit', 'Phuket'),
('Destination Patong', 'Patong', 'Phuket'),
('Paripas Patong Resort', 'Patong', 'Phuket'),
('Sawasdee Village', 'Kata', 'Phuket'),
('Centara Villas Phuket', 'Karon', 'Phuket'),
('The Slate', 'Sakhu', 'Phuket'),
('My Beach Resort Phuket', 'Phuket Town', 'Phuket'),
('Bandara Phuket Beach Resort', 'Phuket Town', 'Phuket'),
('Deevana Patong Resort & Spa', 'Patong', 'Phuket'),
('The Chilli by Golden Ray', 'Kathu', 'Phuket'),
('The Nai Harn', 'Rawai', 'Phuket'),
('Sawaddi Patong Resort & Spa by Tolani', 'Patong', 'Phuket'),
('Sunwing Bangtao Beach', 'Bang Tao', 'Phuket'),
('Anantara Layan Phuket Resort', 'Choeng Thale', 'Phuket'),
('Star Guesthouse', 'Patong', 'Phuket'),
('The BluEco Hotel', 'Karon', 'Phuket'),
('Pullman Phuket Panwa Beach Resort', 'Wichit', 'Phuket'),
('Avista Grande Phuket Karon - MGallery', 'Karon', 'Phuket'),
('Villa Zolitude Resort & Spa', 'Chalong', 'Phuket'),
('Hilton Garden Inn Phuket, Thailand', 'Choeng Thale', 'Phuket'),
('La Vintage Resort', 'Patong', 'Phuket'),
('Supalai Scenic Bay Resort And Spa', 'Pa Klok', 'Phuket'),
('The Naka Phuket, a member of Design Hotels', 'Kamala', 'Phuket'),
('Grand Kata VIP - Kata Beach', 'Kata', 'Phuket'),
('Sunset Beach Resort', 'Patong', 'Phuket'),
('Patong Bay Hill Resort', 'Patong', 'Phuket'),
('Namaka Resort Kamala', 'Kamala', 'Phuket'),
('Anantara Mai Khao Phuket Villas', 'Mai Khao', 'Phuket'),
('Anantara Koh Yao Yai Resort & Villas', 'Phuket', 'Phuket'),
('Island Escape Burasari', 'Phuket', 'Phuket'),
('At Night Airport Resort', 'Phuket', 'Phuket'),
('Andara Resort Villas', 'Kathu', 'Phuket'),
('Remember @ Phuket Town', 'Phuket Town', 'Phuket'),
('Gotum Hostel 2 at Thalang Road', 'Phuket Town', 'Phuket'),
('Green Leaf Hostel', 'Phuket Town', 'Phuket'),
('Sino Inn', 'Phuket Town', 'Phuket'),
('Le Hua', 'Phuket Town', 'Phuket'),
('bloo Hostel', 'Phuket Town', 'Phuket'),
('PERA Space Capsule Hotel', 'Phuket Town', 'Phuket'),
('Eco Hostel Phuket', 'Phuket Town', 'Phuket'),
('The Royal P Boutique Hotel', 'Phuket Town', 'Phuket'),
('Ritsurin Boutique Hotel', 'Phuket Town', 'Phuket'),
('Sunny Hostel Phuket', 'Phuket Town', 'Phuket'),
('Capzule Bed Phuket', 'Phuket Town', 'Phuket'),
('BAAN125 STAY', 'Phuket Town', 'Phuket'),
('Siri Hotel Phuket', 'Phuket Town', 'Phuket'),
('Baan Sutra Guesthouse', 'Phuket Town', 'Phuket'),
('C.A.P. Mansion Hotel', 'Wichit', 'Phuket'),
('Chaphone Guesthouse', 'Phuket Town', 'Phuket'),
('Nawaporn Place Guesthouse', 'Phuket Town', 'Phuket'),
('Twin Hotel', 'Phuket Town', 'Phuket'),
('Shunli Hostel', 'Phuket Town', 'Phuket'),
('OYO 1172 Goodnight Resort', 'Phuket Town', 'Phuket'),
('Sabaidee Residence', 'Phuket Town', 'Phuket'),
('Beehive Phuket Old Town - Hostel', 'Phuket Town', 'Phuket'),
('Rome Place Hotel', 'Phuket Town', 'Phuket'),
('Ang Mor Lao Poshtel - Adults Only - Hostel', 'Phuket Town', 'Phuket'),
('Studio309@Phuket', 'Phuket Town', 'Phuket'),
('The WIDE Condotel - Phuket', 'Phuket Town', 'Phuket'),
('Sino Imperial Design Hotel', 'Phuket Town', 'Phuket'),
('Baan Baan Hostel', 'Phuket Town', 'Phuket'),
('The Duck', 'Phuket Town', 'Phuket'),
('The Rommanee Boutique Guesthouse', 'Phuket Town', 'Phuket'),
('Ai Phuket Hostel', 'Phuket Town', 'Phuket'),
('Sunrise Phuket Homestay', 'Phuket', 'Phuket'),
('Phuthara Hostel', 'Phuket Town', 'Phuket'),
('The urban room', 'Phuket Town', 'Phuket'),
('Gotum Hostel & Restaurant', 'Phuket Town', 'Phuket'),
('The One Place Prasart', 'Phuket', 'Phuket'),
('Rang Hill Residence', 'Phuket Town', 'Phuket'),
('Little Bird Phuket', 'Phuket Town', 'Phuket'),
('Vitamin Sea Hostel Phuket', 'Phuket', 'Phuket'),
('Art C House', 'Phuket Town', 'Phuket'),
('Feel Good Hostel', 'Phuket Town', 'Phuket'),
('Best Stay Hostel', 'Phuket', 'Phuket'),
('ZEN Rooms Takua Thung Road', 'Phuket', 'Phuket'),
('OYO 501 At Night Hostel', 'Phuket Town', 'Phuket'),
('Ok Chic Phuket Hostel', 'Phuket Town', 'Phuket'),
('White Wall Poshtel - Hostel', 'Phuket Town', 'Phuket'),
('Seabreeze Mansion', 'Phuket Town', 'Phuket'),
('Nine Inn at Town', 'Chalong', 'Phuket'),
('Karnvela Phuket', 'Phuket Town', 'Phuket'),
('OYO 75311 Bed One', 'Phuket Town', 'Phuket'),
('Pakta Phuket', 'Phuket', 'Phuket'),
('Baan Rachapuek', 'Phuket Town', 'Phuket'),
('Ekkamon Mansion', 'Phuket Town', 'Phuket'),
('Go Inn Phuket Old Town', 'Phuket Town', 'Phuket'),
('Bed Hostel', 'Phuket Town', 'Phuket'),
('OYO 778 21 Poshtel', 'Phuket Town', 'Phuket'),
('OYO 1163 Eden Hostel', 'Phuket Town', 'Phuket'),
('Cafe66 Hostel', 'Phuket Town', 'Phuket'),
('OYO 1054 Phuket Backpacker Hostel', 'Phuket Town', 'Phuket'),
('Feelgood@Journey Hostel', 'Phuket Town', 'Phuket'),
('OYO 889 Baan Sakdidet', 'Phuket Town', 'Phuket'),
('Befine Guesthouse', 'Phuket Town', 'Phuket'),
('Phuket Town Inn', 'Phuket Town', 'Phuket'),
('The Urban Room', 'Phuket', 'Phuket'),
('Eden Hostel', 'Phuket Town', 'Phuket'),
('Thalang Guesthouse', 'Phuket Town', 'Phuket'),
('ZEN Rooms Dibuk Phuket Town', 'Phuket Town', 'Phuket'),
('Paradox Resort Phuket', 'Karon', 'Phuket'),
('Amari Phuket', 'Patong', 'Phuket'),
('Four Points by Sheraton Phuket Patong Beach Resort', 'Patong', 'Phuket'),
('Phuket Marriott Resort & Spa, Merlin Beach', 'Patong', 'Phuket'),
('Diamond Cliff Resort & Spa, Patong Beach', 'Patong', 'Phuket'),
('Santhiya Koh Yao Yai Resort & Spa - Compulsory Join Santhiya Speedboat from / to Ao Po Grand Marina at Phuket', 'Phuket', 'Phuket'),
('Mandarava Resort and Spa Karon Beach', 'Karon', 'Phuket'),
('The Westin Siray Bay Resort & Spa, Phuket', 'Phuket Town', 'Phuket'),
('Banyan Tree Phuket', 'Choeng Thale', 'Phuket'),
('Phuket Graceland Resort And Spa', 'Patong', 'Phuket'),
('Hotel Clover Patong Phuket', 'Patong', 'Phuket'),
('Courtyard by Marriott Phuket Town', 'Surin', 'Phuket'),
('Pearl Hotel Phuket', 'Phuket Town', 'Phuket'),
('Vapa Hotel', 'Phuket Town', 'Phuket'),
('Nanachart Mansion', 'Phuket', 'Phuket'),
('Baan Suwantawe', 'Phuket Town', 'Phuket'),
('Novotel Phuket City Phokeethra Hotel', 'Phuket Town', 'Phuket'),
('Royal Phuket City Hotel', 'Phuket Town', 'Phuket'),
('The Memory at On On Hotel', 'Phuket Town', 'Phuket'),
('The Neighbors Hostel - Adults Only', 'Phuket Town', 'Phuket'),
('Hotel Midtown Ratsada', 'Phuket Town', 'Phuket'),
('Ratri Hotel Phuket Old Town', 'Phuket Town', 'Phuket'),
('ibis Styles Phuket City Hotel', 'Phuket Town', 'Phuket'),
('Nora Bukit Hotel', 'Phuket Town', 'Phuket'),
('EcoLoft Hotel', 'Phuket Town', 'Phuket'),
('Bedline Hotel', 'Phuket Town', 'Phuket'),
('Isara Boutique Hotel and Cafe', 'Phuket Town', 'Phuket'),
('The Tint at Phuket town', 'Phuket Town', 'Phuket'),
('Quip Bed & Breakfast Phuket Hotel', 'Phuket Town', 'Phuket'),
('The Dorm Hostel', 'Phuket Town', 'Phuket'),
('Grand Supicha City Hotel', 'Phuket Town', 'Phuket'),
('Crystal Inn Phuket', 'Phuket Town', 'Phuket'),
('Sino House Phuket Hotel', 'Phuket Town', 'Phuket'),
('Samkong Place', 'Phuket', 'Phuket'),
('Pure Phuket Residence', 'Phuket Town', 'Phuket'),
('Aekkeko Hostel', 'Phuket Town', 'Phuket'),
('Blu Monkey Hub and Hotel Phuket', 'Phuket Town', 'Phuket'),
('The Blanket Hotel', 'Phuket', 'Phuket'),
('Recenta Style Phuket Town', 'Phuket Town', 'Phuket'),
('Phuket Chinoinn Hotel', 'Phuket Town', 'Phuket'),
('Mei Zhou Phuket Hotel', 'Phuket Town', 'Phuket'),
('Lamoon Resotel', 'Phuket Town', 'Phuket'),
('The Malika', 'Phuket Town', 'Phuket'),
('Casa Blanca Boutique hotel', 'Phuket Town', 'Phuket'),
('Phuket 346 Guest House', 'Phuket Town', 'Phuket'),
('Pattra Mansion by AKSARA Collection', 'Phuket Town', 'Phuket'),
('Xinlor House', 'Phuket Town', 'Phuket'),
('Rabbitel Phuket', 'Phuket Town', 'Phuket'),
('99 OLDTOWN BOUTIQUE GUESTHOUSE', 'Phuket Town', 'Phuket'),
('The Besavana Phuket', 'Phuket Town', 'Phuket'),
('Sugar Palm Residence', 'Phuket Town', 'Phuket'),
('Phuket Merlin Hotel', 'Phuket Town', 'Phuket'),
('Book a Bed Poshtel - Hostel', 'Phuket Town', 'Phuket'),
('Chinotel', 'Phuket Town', 'Phuket'),
('Fulfill Phuket Hostel', 'Phuket Town', 'Phuket'),
('I Pavilion Hotel Phuket', 'Phuket Town', 'Phuket'),
('Cool Residence', 'Phuket Town', 'Phuket'),
('Bhukitta Boutique Hotel', 'Phuket Town', 'Phuket'),
('Pek House', 'Phuket Town', 'Phuket'),
('Meroom', 'Phuket Town', 'Phuket'),
('In Phuket House', 'Phuket Town', 'Phuket'),
('The Little Nest Phuket', 'Phuket Town', 'Phuket'),
('Phuket Old Town Hostel', 'Phuket Town', 'Phuket'),
('Blu Monkey Boutique Phuket Town', 'Phuket Town', 'Phuket'),
('Sleep at Phuket', 'Phuket', 'Phuket'),
('Chino Town at Yaowarat Phuket', 'Phuket', 'Phuket'),
('Lub Sbuy Hostel', 'Phuket Town', 'Phuket'),
('The Arbern Hostel x Bistro', 'Phuket Town', 'Phuket'),
('Baan PhuAnda Phuket', 'Phuket Town', 'Phuket'),
('Tee Pak Dee Resident Phuket', 'Phuket Town', 'Phuket'),
('Lub Sbuy House', 'Phuket Town', 'Phuket'),
('Blu Monkey Bed & Breakfast Phuket', 'Phuket Town', 'Phuket'),
('The Topaz Residence', 'Phuket Town', 'Phuket'),
('Chino Town Gallery Alley', 'Phuket Town', 'Phuket'),
('Snoozy', 'Phuket Town', 'Phuket'),
('D''s Corner & Guesthouse', 'Phuket Town', 'Phuket'),
('HAO Hotel Phuket', 'Phuket Town', 'Phuket'),
('Woo Gallery and Boutique Hotel', 'Phuket Town', 'Phuket'),
('Machima House', 'Phuket Town', 'Phuket'),
('Peranakan Boutique Hotel', 'Phuket', 'Phuket'),
('Phupara Place', 'Phuket Town', 'Phuket'),
('The Pho Thong Phuket', 'Phuket Town', 'Phuket'),
('Sleep Sheep Phuket Hostel SHA', 'Phuket Town', 'Phuket'),
('S.B. Living Place', 'Phuket Town', 'Phuket'),
('Na Siam Guesthouse', 'Phuket Town', 'Phuket'),
('The Rommanee Classic Guesthouse', 'Phuket Town', 'Phuket'),
('Surachet at 257 Boutique House', 'Phuket Town', 'Phuket'),
('Ming Shou Boutique House', 'Phuket Town', 'Phuket'),
('Borbaboom Poshtel - Hostel', 'Phuket Town', 'Phuket'),
('217 at HKT', 'Phuket Town', 'Phuket'),
('Hostel Our Nomad', 'Phuket Town', 'Phuket'),
('The Z Nite Hostel', 'Phuket Town', 'Phuket'),
('Sound Gallery House - Hostel', 'Phuket Town', 'Phuket'),
('Ananas Phuket Hostel', 'Surin', 'Phuket');

-- =====================================================
-- PHANG NGA HOTELS (235 hotels)
-- =====================================================

INSERT INTO reference_hotels (name, area, province) VALUES
('Bedter Hotel Phang Nga', 'Mueang Phang Nga', 'Phang Nga'),
('White House', 'Mueang Phang Nga', 'Phang Nga'),
('Katathong Golf Resort & Spa', 'Phang Nga', 'Phang Nga'),
('Bor Saen Pool Villa', 'Phang Nga', 'Phang Nga'),
('Lukmuang 2 Hotel', 'Phang Nga', 'Phang Nga'),
('Le Erawan Hotel', 'Phang Nga', 'Phang Nga'),
('Phu Nga Hotel', 'Phang Nga', 'Phang Nga'),
('Manora Garden B & B', 'Phang Nga', 'Phang Nga'),
('The Sleep Phang Nga', 'Phang Nga Town', 'Phang Nga'),
('Baan Rim Nam Resort', 'Phang Nga', 'Phang Nga'),
('Phang Nga Guesthouse', 'Phang Nga Town', 'Phang Nga'),
('Ingthara Resort', 'Phang Nga', 'Phang Nga'),
('Home Phang-Nga Guesthouse', 'Phang Nga', 'Phang Nga'),
('Pranee Home', 'Phang Nga', 'Phang Nga'),
('Najjamee Bungalows Koh Yao Noi', 'Koh Yao Noi', 'Phang Nga'),
('Thaweesuk Hotel', 'Phang Nga', 'Phang Nga'),
('Blue Mountain Phangnga Resort', 'Phang Nga', 'Phang Nga'),
('Guesthouse 88', 'Phang Nga', 'Phang Nga'),
('Tayida Resort & Homestay', 'Phang Nga', 'Phang Nga'),
('B.O Best Residence', 'Phang Nga', 'Phang Nga'),
('Tambai Resort', 'Phang Nga', 'Phang Nga'),
('JW Marriott Khao Lak Resort and Spa', 'Khao Lak', 'Phang Nga'),
('The Sands Khao Lak by Katathani', 'Khao Lak', 'Phang Nga'),
('The Little Shore Khao Lak by Katathani', 'Khao Lak', 'Phang Nga'),
('Le Meridien Khao Lak Resort & Spa', 'Khao Lak', 'Phang Nga'),
('Grand Mercure Khao Lak Bangsak', 'Khao Lak', 'Phang Nga'),
('Robinson Khao Lak', 'Khao Lak', 'Phang Nga'),
('Ayara Villas Khaolak', 'Khao Lak', 'Phang Nga'),
('Moracea by Khao Lak Resort', 'Khao Lak', 'Phang Nga'),
('The Leaf On The Sands by Katathani', 'Phang Nga', 'Phang Nga'),
('La Flora Khao Lak', 'Khao Lak', 'Phang Nga'),
('Aleenta Phuket - Phang Nga', 'Phang Nga Town', 'Phang Nga'),
('X10 Khaolak', 'Khao Lak', 'Phang Nga'),
('Khaolak Merlin Resort', 'Khao Lak', 'Phang Nga'),
('Khao Lak Marriott Beach Resort & Spa', 'Khao Lak', 'Phang Nga'),
('Six Senses Yao Noi', 'Koh Yao', 'Phang Nga'),
('Outrigger Khao Lak Beach Resort', 'Khao Lak', 'Phang Nga'),
('Cape Kudu Hotel', 'Koh Yao Noi', 'Phang Nga'),
('La Vela Khao Lak', 'Khao Lak', 'Phang Nga'),
('The Haven Khao Lak', 'Khao Lak', 'Phang Nga'),
('Natai Beach Resort', 'Natai', 'Phang Nga'),
('Sentido Khaolak', 'Khao Lak', 'Phang Nga'),
('Graceland Khaolak Beach Resort', 'Khao Lak', 'Phang Nga'),
('The Leaf Oceanside', 'Khuk Khak', 'Phang Nga'),
('TreeHouse Villas - Adults Only', 'Koh Yao', 'Phang Nga'),
('Santhiya Phuket Natai Resort & Spa', 'Natai', 'Phang Nga'),
('Devasom Khao Lak Beach Resort & Villas', 'Khao Lak', 'Phang Nga'),
('Bangsak Village - Adults Only', 'Bang Sak', 'Phang Nga'),
('Thiw Son Beach Resort', 'Koh Yao', 'Phang Nga'),
('The Waters Khao Lak by Katathani', 'Khao Lak', 'Phang Nga'),
('The Chu’s boutique hotel', 'Phang Nga', 'Phang Nga'),
('JW Marriott Khao Lak Resort Suites', 'Khao Lak', 'Phang Nga'),
('Beyond Skywalk Nangshi', 'Phang Nga', 'Phang Nga'),
('Kalima Resort & Villas Khaolak', 'Khao Lak', 'Phang Nga'),
('Paradise KohYao', 'Koh Yao', 'Phang Nga'),
('Ramada Resort by Wyndham Khao Lak', 'Khao Lak', 'Phang Nga'),
('Khao Lak Palm Beach Resort', 'Khao Lak', 'Phang Nga'),
('Eden Beach Khaolak Resort and Spa A Lopesan Collection Hotel', 'Khao Lak', 'Phang Nga'),
('Le Menara Khao Lak', 'Khao Lak', 'Phang Nga'),
('Koh Yao Yai Hillside Resort', 'Koh Yao Yai', 'Phang Nga'),
('The Sarojin', 'Phang Nga', 'Phang Nga'),
('Chongfah Resort', 'Takua Pa', 'Phang Nga'),
('Purana Resort Koh Yao Noi', 'Koh Yao Noi', 'Phang Nga'),
('APSARA Beachfront Resort and Villa', 'Phang Nga', 'Phang Nga'),
('Kokotel Khao Lak Lighthouse', 'Khao Lak', 'Phang Nga'),
('Bangmara Hill', 'Phang Nga', 'Phang Nga'),
('The Briza Beach Resort Khaolak', 'Khao Lak', 'Phang Nga'),
('Khaolak Oriental Resort', 'Khao Lak', 'Phang Nga'),
('Baan Khaolak Beach Resort', 'Khao Lak', 'Phang Nga'),
('Hotel Gahn', 'Phang Nga', 'Phang Nga'),
('Casa de La Flora', 'Khuk Khak', 'Phang Nga'),
('Palm Galleria Resort', 'Phang Nga', 'Phang Nga'),
('Good Morning Hotel at TakuaPa', 'Takua Pa', 'Phang Nga'),
('Koyao Island Resort', 'Koh Yao', 'Phang Nga'),
('Isara Khao Lak', 'Khao Lak', 'Phang Nga'),
('The Mouth Resort', 'Khuk Khak', 'Phang Nga'),
('Sudala Beach Resort', 'Khuk Khak', 'Phang Nga'),
('Nautical Home & Seashell House B&B', 'Phang Nga', 'Phang Nga'),
('Khaolak Bhandari Resort & Spa', 'Khao Lak', 'Phang Nga'),
('Fanari Khaolak Resort - Courtyard Zone', 'Khao Lak', 'Phang Nga'),
('Baan Kong Hostel', 'Phang Nga', 'Phang Nga'),
('Takuapa Station Hotel', 'Takua Pa', 'Phang Nga'),
('Mai Khao Lak Beach Resort & Spa (TUI BLUE Mai Khaolak)', 'Khao Lak', 'Phang Nga'),
('Seaview Resort Khao Lak', 'Khao Lak', 'Phang Nga'),
('Dan''s Koyao Retreat', 'Koh Yao Noi', 'Phang Nga'),
('Cousin Resort', 'Phang Nga', 'Phang Nga'),
('Beyond Khaolak', 'Khao Lak', 'Phang Nga'),
('Baan Krating Khao Lak Resort', 'Khao Lak', 'Phang Nga'),
('Nankanok Bungalow', 'Koh Yao', 'Phang Nga'),
('Kuapa Resort', 'Phang Nga', 'Phang Nga'),
('Khaolak Laguna Resort', 'Khao Lak', 'Phang Nga'),
('ThaiLife Wellness and Meditation Resort', 'Phang Nga', 'Phang Nga'),
('Bai Bai Home', 'Phang Nga', 'Phang Nga'),
('Khaolak Wanaburee Resort', 'Khao Lak', 'Phang Nga'),
('Khaolak Emerald Beach Resort and Spa', 'Khao Lak', 'Phang Nga'),
('Kokotel Khao Lak Isara Casa', 'Khao Lak', 'Phang Nga'),
('Les Fleurs', 'Phang Nga', 'Phang Nga'),
('9 Hornbills Tented Camp', 'Koh Yao', 'Phang Nga'),
('The Hotspring Beach Resort & Spa', 'Phang Nga', 'Phang Nga'),
('Samet Nangshe Goodview', 'Phang Nga', 'Phang Nga'),
('Sunset Khaolak Resort', 'Khao Lak', 'Phang Nga'),
('Khaolak Boutique Heritage', 'Khao Lak', 'Phang Nga'),
('Merlin Plaza Apartments', 'Phang Nga', 'Phang Nga'),
('Elephant Hills Khao Sok', 'Phang Nga', 'Phang Nga'),
('Khaolak Bay Front Resort', 'Khao Lak', 'Phang Nga'),
('Khaolak Summer House Resort', 'Khao Lak', 'Phang Nga'),
('Khaolak Summer House Resort 2', 'Khao Lak', 'Phang Nga'),
('Haadson Resort', 'Phang Nga', 'Phang Nga'),
('Ruk Cozy Khao Lak', 'Khao Lak', 'Phang Nga'),
('Baba Beach Club Natai Luxury Pool Villa Hotel by Sri panwa', 'Natai', 'Phang Nga'),
('Khaolak Suthawan Resort', 'Khao Lak', 'Phang Nga'),
('The Anda Mani Khaolak Beachfront Villas', 'Khao Lak', 'Phang Nga'),
('Three ladies', 'Koh Yao', 'Phang Nga'),
('Khaolak Palm Hill Resort', 'Khao Lak', 'Phang Nga'),
('Fondness Hotel', 'Phang Nga', 'Phang Nga'),
('Jaiyen Eco Resort', 'Koh Yao', 'Phang Nga'),
('Baanchongfa Resort', 'Phang Nga', 'Phang Nga'),
('R.T. Hotel', 'Khao Lak', 'Phang Nga'),
('Sunrise Beach Koh Yao Resort', 'Koh Yao', 'Phang Nga'),
('Le Passe-Temps', 'Phang Nga', 'Phang Nga'),
('Khao Lak Relax Resort', 'Khao Lak', 'Phang Nga'),
('White Cat Hotel', 'Phang Nga', 'Phang Nga'),
('Theppahrak Home', 'Takua Pa', 'Phang Nga'),
('Koyao Bay Pavilions', 'Koh Yao', 'Phang Nga'),
('The Glory Gold Hotel', 'Khao Lak', 'Phang Nga'),
('Laguna Villas Boutique Hotel', 'Koh Yao Noi', 'Phang Nga'),
('Mai Holiday By Mai Khao Lak', 'Khao Lak', 'Phang Nga'),
('Khaolak Forest Resort', 'Khao Lak', 'Phang Nga'),
('The Leaf on the Sands by Katathani', 'Phang Nga', 'Phang Nga'),
('Srichada Hotel Khaolak', 'Khao Lak', 'Phang Nga'),
('Andamania Beach Resort', 'Takua Pa', 'Phang Nga'),
('Sawasdee Lagoon Resort', 'Phang Nga', 'Phang Nga'),
('Khaolak Orchid Beach Resort', 'Khao Lak', 'Phang Nga'),
('Big Sun Residence by iRETREAT', 'Koh Yao', 'Phang Nga'),
('The Simple Koh Yao Noi', 'Koh Yao Noi', 'Phang Nga'),
('Le Coral Beach Resort and Cafe', 'Natai', 'Phang Nga'),
('Anattaya Holiday Home', 'Koh Yao Noi', 'Phang Nga'),
('Kantary Beach Hotel Villas & Suites, Khao Lak', 'Khao Lak', 'Phang Nga'),
('Khao Lak Blue Lagoon Resort', 'Khao Lak', 'Phang Nga'),
('Iniala Beach House', 'Phang Nga', 'Phang Nga'),
('Kokotel Khao Lak Seascape', 'Khao Lak', 'Phang Nga'),
('The Grand Southsea Khaolak Beach Resort', 'Khao Lak', 'Phang Nga'),
('Ocean Breeze Resort Khao Lak', 'Khao Lak', 'Phang Nga'),
('Kokotel Khao Lak Montana', 'Khao Lak', 'Phang Nga'),
('Loma Resort', 'Phang Nga', 'Phang Nga'),
('Sabai Corner Bungalows', 'Koh Yao', 'Phang Nga'),
('Khaolak Paradise Resort', 'Khao Lak', 'Phang Nga'),
('Motive Cottage Resort', 'Phang Nga', 'Phang Nga'),
('Fanari Khaolak Resort - Seafront Wing', 'Khao Lak', 'Phang Nga'),
('Bangsak Merlin Resort', 'Bang Sak', 'Phang Nga'),
('Seabox Khaolak Hostel', 'Khao Lak', 'Phang Nga'),
('OYO 619 Water Palm Resort', 'Phang Nga', 'Phang Nga'),
('Andamania Beach Resort & Spa', 'Takua Pa', 'Phang Nga'),
('Natai House', 'Natai', 'Phang Nga'),
('Palm Garden Resort Khaolak', 'Khao Lak', 'Phang Nga'),
('Khaolak Sunset Resort - Adults Only (SHA Extra Plus)', 'Khao Lak', 'Phang Nga'),
('Zimbei Cozytel Khaolak', 'Khao Lak', 'Phang Nga'),
('Takolaburi Cultural Resort', 'Phang Nga', 'Phang Nga'),
('Erawan Hotel', 'Phang Nga', 'Phang Nga'),
('Lantala Residence', 'Phang Nga', 'Phang Nga'),
('Bann Anattaya Koh Yao Noi', 'Koh Yao Noi', 'Phang Nga'),
('Sweet Mango Khaolak', 'Khao Lak', 'Phang Nga'),
('MJ Boutique Hotel Khao Lak', 'Khao Lak', 'Phang Nga'),
('Ao Thong Beach Bungalows & Restaurant', 'Khao Lak', 'Phang Nga'),
('DKaYa Hostel', 'Phang Nga', 'Phang Nga'),
('Chomphu Resort Khaolak', 'Khao Lak', 'Phang Nga'),
('Khaolak Mohintara Resort', 'Khao Lak', 'Phang Nga'),
('Villa Colina', 'Phang Nga', 'Phang Nga'),
('2025-07-12 02:10:00', 'Phang Nga', 'Phang Nga'),
('Khaolak Hillside Villa', 'Khao Lak', 'Phang Nga'),
('Khaolak Mountain View', 'Khao Lak', 'Phang Nga'),
('Casacool Hotel Khoalak', 'Phang Nga', 'Phang Nga'),
('Tuaprodhome', 'Phang Nga', 'Phang Nga'),
('Baan Mek Lom', 'Phang Nga', 'Phang Nga'),
('Garden Villa Khaolak', 'Khao Lak', 'Phang Nga'),
('Gerd and Noi Resort Khao Lak', 'Khao Lak', 'Phang Nga'),
('Nestvilla Khok-kloi Phang-nga', 'Phang Nga', 'Phang Nga'),
('Holiday Resort Ko Yao', 'Koh Yao', 'Phang Nga'),
('Khaolak Paradise Resort', 'Khao Lak', 'Phang Nga'),
('Bangsak Hut', 'Takua Pa', 'Phang Nga'),
('Capital O 75518 Baan Rose Resort Ao Luk', 'Phang Nga', 'Phang Nga'),
('Leam Sai Bungalows Koh Yao Noi', 'Koh Yao Noi', 'Phang Nga'),
('AP Hotel', 'Phang Nga', 'Phang Nga'),
('Khao Lak Riverside Resort & Spa', 'Khao Lak', 'Phang Nga'),
('Mukdara Beach Villa & Spa Resort', 'Khuk Khak', 'Phang Nga'),
('To Zleep Hotel Khaolak', 'Khao Lak', 'Phang Nga'),
('Phurafa Resort', 'Phang Nga', 'Phang Nga'),
('OYO 75517 Mananchaya Resort', 'Phang Nga', 'Phang Nga'),
('Slumber Party Surf Khao Lak Hostel', 'Khao Lak', 'Phang Nga'),
('Kunna House', 'Koh Yao', 'Phang Nga'),
('The Retreat Khaolak Resort', 'Khao Lak', 'Phang Nga'),
('Bania Boutique House', 'Phang Nga', 'Phang Nga'),
('Khaolak C-nior Bungalows', 'Khao Lak', 'Phang Nga'),
('Suksompong Resort', 'Takua Pa', 'Phang Nga'),
('Awana Villa Resort Yaonoi', 'Koh Yao Noi', 'Phang Nga'),
('Khao Lak Golden Coconut Resort', 'Khao Lak', 'Phang Nga'),
('At Bangsak Resort', 'Bang Sak', 'Phang Nga'),
('Khaolak Grand City', 'Khao Lak', 'Phang Nga'),
('Hongte Khaolak Resort', 'Khao Lak', 'Phang Nga'),
('OYO 75304 Riverside Guesthouse', 'Khao Lak', 'Phang Nga'),
('APA-TREE Boutique Hotel', 'Phang Nga', 'Phang Nga'),
('The Oasis Khaolak Resort', 'Khao Lak', 'Phang Nga'),
('Lah Own Khaolak Resort', 'Khao Lak', 'Phang Nga'),
('Baan Chong Fa Resort', 'Phang Nga', 'Phang Nga'),
('Banana Lodge', 'Phang Nga', 'Phang Nga'),
('Buppha Resort', 'Phang Nga', 'Phang Nga'),
('Grandfather Khao Lak Resort', 'Khao Lak', 'Phang Nga'),
('Baan Khao Lak Resort', 'Khao Lak', 'Phang Nga'),
('Tha Khao Bay View', 'Koh Yao', 'Phang Nga'),
('Mae-Porn Hostel', 'Khao Lak', 'Phang Nga'),
('Mookdamun Bungalows', 'Koh Yao Noi', 'Phang Nga'),
('Koh Yao Chukit Dachanan Resort', 'Koh Yao', 'Phang Nga'),
('Khaolak Mind Home Hostel - Adults Only', 'Khao Lak', 'Phang Nga'),
('Betterview Bed Breakfast & Bungalow', 'Koh Yao', 'Phang Nga'),
('Ranyatavi Resort', 'Phang Nga', 'Phang Nga'),
('Ladda Resort', 'Khao Lak', 'Phang Nga'),
('Baan Bamboo Resort', 'Phang Nga', 'Phang Nga'),
('Reuanpruhong Na Bangthong', 'Phang Nga', 'Phang Nga'),
('Jerung Hotel', 'Phang Nga', 'Phang Nga'),
('Leelawadee Resort Khaolak', 'Khao Lak', 'Phang Nga'),
('OYO 75331 Hareeya Hotel', 'Phang Nga', 'Phang Nga'),
('Pasai Beach Lodge', 'Koh Yao', 'Phang Nga'),
('Namkhem Inn', 'Phang Nga', 'Phang Nga'),
('Namkhem Inn 2', 'Phang Nga', 'Phang Nga'),
('Sun Globe Resort', 'Koh Yao Noi', 'Phang Nga'),
('Niramaya Villa and Wellness', 'Koh Yao', 'Phang Nga'),
('Makai NAP', 'Phang Nga', 'Phang Nga'),
('OYO 732 Juthamas Hotel', 'Phang Nga', 'Phang Nga'),
('At Home Khaolak', 'Khao Lak', 'Phang Nga'),
('Coconut Homes & Cafe', 'Phang Nga', 'Phang Nga'),
('Rnana Grand', 'Phang Nga', 'Phang Nga'),
('Wandee Bed and Breakfast - Hostel', 'Phang Nga', 'Phang Nga'),
('We Hostel', 'Phang Nga', 'Phang Nga'),
('Villa Chaya', 'Phang Nga', 'Phang Nga'),
('Nimit Bungalow', 'Phang Nga', 'Phang Nga');

-- Create indexes for better performance (indexes already exist from 008 migration)
-- CREATE INDEX IF NOT EXISTS idx_reference_hotels_name ON reference_hotels(name);
-- CREATE INDEX IF NOT EXISTS idx_reference_hotels_area ON reference_hotels(area);
-- CREATE INDEX IF NOT EXISTS idx_reference_hotels_province ON reference_hotels(province);

-- Summary
-- Total hotels imported: 1998





-- ============================================
-- MIGRATION: 010_import_all_reference_hotels_to_company.sql
-- ============================================

-- Migration: Import reference hotels into company's hotels table
-- This migration is a TEMPLATE - run with actual company_id during setup
-- Reference hotels are already populated from migration 008 and 009

-- To import hotels for a specific company, run:
-- 
-- INSERT INTO hotels (company_id, name, area)
-- SELECT 
--     '<your_company_id>' as company_id,
--     name,
--     area
-- FROM reference_hotels
-- WHERE NOT EXISTS (
--     SELECT 1 FROM hotels h 
--     WHERE h.company_id = '<your_company_id>' 
--     AND LOWER(h.name) = LOWER(reference_hotels.name)
-- );

-- Note: The reference_hotels table contains 1,998 hotels from Phuket and Phang Nga
-- Companies can import all or select specific areas during setup





-- ============================================
-- MIGRATION: 011_company_region.sql
-- ============================================

-- Migration: Add region column to companies table
-- This allows Super Admin to assign a region (Phuket, Phang Nga, or Both) to each company
-- The region determines which reference hotels are available to the company

-- Add region column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Phuket';

-- Add check constraint for valid regions
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_region_check;
ALTER TABLE companies ADD CONSTRAINT companies_region_check 
  CHECK (region IN ('Phuket', 'Phang Nga', 'Both'));

-- Create index for region lookups
CREATE INDEX IF NOT EXISTS idx_companies_region ON companies(region);

-- Enable RLS on reference_hotels if not already enabled
ALTER TABLE reference_hotels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read reference hotels" ON reference_hotels;
DROP POLICY IF EXISTS "Authenticated users can read reference hotels" ON reference_hotels;

-- Allow all authenticated users to read reference_hotels (it's a shared resource)
CREATE POLICY "Authenticated users can read reference hotels" ON reference_hotels
    FOR SELECT
    TO authenticated
    USING (true);

-- Update existing companies to have default region
UPDATE companies SET region = 'Phuket' WHERE region IS NULL;

















-- ============================================
-- MIGRATION: 012_program_default_slots.sql
-- ============================================

-- Add default_slots column to programs table
-- This provides a default slot count for programs when no specific date availability is set

ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS default_slots INT DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN programs.default_slots IS 'Default number of available slots per day for this program when no specific date availability is configured';

-- Update index for program_availability to improve upsert performance
CREATE INDEX IF NOT EXISTS idx_program_availability_program_date 
ON program_availability(program_id, date);

















-- ============================================
-- MIGRATION: 013_program_booking_cutoff_time.sql
-- ============================================

-- Add booking_cutoff_time column to programs table
-- This column stores the latest time of day when bookings can be accepted for the same day

ALTER TABLE programs
ADD COLUMN IF NOT EXISTS booking_cutoff_time TIME DEFAULT '18:00';

-- Add comment for documentation
COMMENT ON COLUMN programs.booking_cutoff_time IS 'The cutoff time for same-day bookings. After this time, the program will not appear on the public availability page for today.';

















-- ============================================
-- MIGRATION: 014_payment_type.sql
-- ============================================

-- Migration: Add payment_type column to bookings table
-- Payment types: regular (default), foc (Free of Charge), insp (Inspection)
-- This affects booking number suffix: IDE-000007-FOC or IDE-000007-INSP

-- 1. Add payment_type column to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'regular';

-- Add check constraint (using a separate ALTER to handle IF NOT EXISTS logic)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_type_check'
    ) THEN
        ALTER TABLE bookings ADD CONSTRAINT bookings_payment_type_check 
            CHECK (payment_type IN ('regular', 'foc', 'insp'));
    END IF;
END $$;

-- 2. Create or replace the generate_booking_number function to support payment_type suffix
CREATE OR REPLACE FUNCTION generate_booking_number(p_company_id UUID, p_payment_type VARCHAR DEFAULT 'regular')
RETURNS VARCHAR(30) AS $$
DECLARE
    v_initials VARCHAR(10);
    v_sequence INT;
    v_booking_number VARCHAR(30);
    v_suffix VARCHAR(10);
BEGIN
    -- Get company initials and increment sequence
    UPDATE companies 
    SET booking_sequence = booking_sequence + 1
    WHERE id = p_company_id
    RETURNING initials, booking_sequence INTO v_initials, v_sequence;
    
    -- Determine suffix based on payment type
    IF p_payment_type = 'foc' THEN
        v_suffix := '-FOC';
    ELSIF p_payment_type = 'insp' THEN
        v_suffix := '-INSP';
    ELSE
        v_suffix := '';
    END IF;
    
    -- Generate booking number with optional suffix
    v_booking_number := v_initials || '-' || LPAD(v_sequence::TEXT, 6, '0') || v_suffix;
    
    RETURN v_booking_number;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to update booking number suffix when payment_type changes
CREATE OR REPLACE FUNCTION update_booking_number_suffix(p_booking_id UUID, p_payment_type VARCHAR)
RETURNS VARCHAR(30) AS $$
DECLARE
    v_current_number VARCHAR(30);
    v_base_number VARCHAR(20);
    v_new_number VARCHAR(30);
    v_suffix VARCHAR(10);
BEGIN
    -- Get current booking number
    SELECT booking_number INTO v_current_number
    FROM bookings
    WHERE id = p_booking_id;
    
    -- Strip existing suffix (-FOC or -INSP) to get base number
    v_base_number := regexp_replace(v_current_number, '-(FOC|INSP)$', '');
    
    -- Determine new suffix based on payment type
    IF p_payment_type = 'foc' THEN
        v_suffix := '-FOC';
    ELSIF p_payment_type = 'insp' THEN
        v_suffix := '-INSP';
    ELSE
        v_suffix := '';
    END IF;
    
    -- Generate new booking number
    v_new_number := v_base_number || v_suffix;
    
    -- Update the booking
    UPDATE bookings 
    SET booking_number = v_new_number,
        payment_type = p_payment_type
    WHERE id = p_booking_id;
    
    RETURN v_new_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Create index for payment_type lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_type ON bookings(payment_type);

















-- ============================================
-- MIGRATION: 015_pricing_pin_protection.sql
-- ============================================

-- Migration: Add PIN protection for pricing and unique agent codes
-- Date: 2024-12-01

-- Add pricing PIN fields to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS pricing_pin VARCHAR(4),
ADD COLUMN IF NOT EXISTS pricing_pin_enabled BOOLEAN DEFAULT false;

-- Add unique_code to agents table (unique per company)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS unique_code VARCHAR(20);

-- Create unique index for agent unique_code within a company
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_company_unique_code 
ON agents(company_id, unique_code) 
WHERE unique_code IS NOT NULL AND status != 'deleted';

-- Add comment for documentation
COMMENT ON COLUMN companies.pricing_pin IS '4-digit PIN for protecting access to agent pricing';
COMMENT ON COLUMN companies.pricing_pin_enabled IS 'Whether PIN protection is enabled for pricing access';
COMMENT ON COLUMN agents.unique_code IS 'Unique identifier code for the agent within the company';

















-- ============================================
-- MIGRATION: 016_driver_car_capacity.sql
-- ============================================

-- Add car_capacity field to drivers table
-- This field represents the number of passenger slots available in the driver's vehicle
-- Infants, children, and adults all count as 1 slot each

ALTER TABLE drivers
ADD COLUMN car_capacity integer DEFAULT 4;

-- Add a comment to explain the field
COMMENT ON COLUMN drivers.car_capacity IS 'Number of passenger slots available in the vehicle. All guests (adults, children, infants) count as 1 slot each.';

















-- ============================================
-- MIGRATION: 017_seed_test_data.sql
-- ============================================

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





-- ============================================
-- MIGRATION: 018_voucher_image_upload.sql
-- ============================================

-- Migration: Add voucher image upload support
-- This adds a voucher_image_url column to bookings and sets up storage bucket

-- Add voucher_image_url column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voucher_image_url TEXT;

-- =====================================================
-- IMPORTANT: MANUAL STEP REQUIRED FOR STORAGE BUCKET
-- =====================================================
-- The 'vouchers' storage bucket MUST be created manually via Supabase Dashboard:
-- 
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: vouchers
-- 4. Public bucket: OFF (uncheck - keep it private)
-- 5. Click "Create bucket"
-- 6. After creation, go to bucket Settings and set:
--    - File size limit: 5MB (5242880 bytes)
--    - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, application/pdf
--
-- Then add these RLS policies for the bucket:
-- 
-- Policy Name: "Authenticated users can upload vouchers"
-- Allowed operation: INSERT
-- Target roles: authenticated
-- WITH CHECK expression: true
--
-- Policy Name: "Authenticated users can view vouchers"  
-- Allowed operation: SELECT
-- Target roles: authenticated
-- USING expression: true
--
-- Policy Name: "Authenticated users can delete vouchers"
-- Allowed operation: DELETE
-- Target roles: authenticated
-- USING expression: true
-- =====================================================

COMMENT ON COLUMN bookings.voucher_image_url IS 'URL to the uploaded voucher image in Supabase Storage';















-- ============================================
-- MIGRATION: 019_program_color.sql
-- ============================================

-- Add color column to programs table
-- Stores hex color code (e.g., '#3B82F6') for visual identification

ALTER TABLE programs ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

-- Add comment for documentation
COMMENT ON COLUMN programs.color IS 'Hex color code for visual program identification (e.g., #3B82F6)';















-- ============================================
-- MIGRATION: 020_driver_nickname.sql
-- ============================================

-- Add nickname field to drivers table
-- This allows drivers to have a short nickname in addition to their full name

ALTER TABLE drivers
ADD COLUMN nickname VARCHAR(100);

-- Add a comment to explain the field
COMMENT ON COLUMN drivers.nickname IS 'Optional short nickname for the driver';















-- ============================================
-- MIGRATION: 021_fix_driver_car_capacity.sql
-- ============================================

-- Ensure drivers table has car_capacity column required by dashboard
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS car_capacity integer DEFAULT 4;

COMMENT ON COLUMN drivers.car_capacity IS 'Number of passenger slots available in the vehicle. All guests (adults, children, infants) count as 1 slot each.';
















-- ============================================
-- MIGRATION: 022_driver_pickup_locks.sql
-- ============================================

-- Create driver_pickup_locks table to persist lock state for pickup assignments
CREATE TABLE IF NOT EXISTS driver_pickup_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, driver_id, activity_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_driver_pickup_locks_company_date 
  ON driver_pickup_locks(company_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_driver_pickup_locks_driver_date 
  ON driver_pickup_locks(driver_id, activity_date);

-- Enable RLS
ALTER TABLE driver_pickup_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's pickup locks"
  ON driver_pickup_locks FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pickup locks for their company"
  ON driver_pickup_locks FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's pickup locks"
  ON driver_pickup_locks FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's pickup locks"
  ON driver_pickup_locks FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );















-- ============================================
-- MIGRATION: 023_program_nickname.sql
-- ============================================

-- Add nickname column to programs table
-- This is a short name for admin use only, not shown to customers

ALTER TABLE programs
ADD COLUMN nickname TEXT;

-- Add a comment to explain the purpose
COMMENT ON COLUMN programs.nickname IS 'Short name for admin use only - helps identify programs quickly without reading full name';















-- ============================================
-- MIGRATION: 024_set_boat_feature.sql
-- ============================================

-- Set Boat Feature Migration
-- Creates guides, restaurants tables and related booking fields

-- Guides table
CREATE TABLE IF NOT EXISTS guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    languages TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    capacity INT DEFAULT 50,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boat assignment locks table (similar to driver_pickup_locks)
CREATE TABLE IF NOT EXISTS boat_assignment_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    guide_id UUID REFERENCES guides(id) ON DELETE SET NULL,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, boat_id, activity_date)
);

-- Add guide_id and restaurant_id to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guide_id UUID REFERENCES guides(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guides_company_id ON guides(company_id);
CREATE INDEX IF NOT EXISTS idx_guides_status ON guides(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_company_id ON restaurants(company_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_boat_assignment_locks_company_date ON boat_assignment_locks(company_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_bookings_guide_id ON bookings(guide_id);
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_id ON bookings(restaurant_id);

-- Create triggers for updated_at
CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON guides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boat_assignment_locks_updated_at BEFORE UPDATE ON boat_assignment_locks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Boats, guides, and restaurants should be created during customer setup
-- Template commands for reference:
-- 
-- INSERT INTO boats (company_id, name, capacity, captain_name, status, notes)
-- VALUES ('<company_id>', 'Boat Name', 35, 'Captain Name', 'active', 'Notes');
--
-- INSERT INTO guides (company_id, name, nickname, phone, whatsapp, languages, status, notes)
-- VALUES ('<company_id>', 'Guide Name', 'Nickname', '+66...', '+66...', ARRAY['English', 'Thai'], 'active', 'Notes');
--
-- INSERT INTO restaurants (company_id, name, location, capacity, phone, status, notes)
-- VALUES ('<company_id>', 'Restaurant Name', 'Location', 50, '+66...', 'active', 'Notes');






-- ============================================
-- MIGRATION: 025_guide_portal.sql
-- ============================================

-- Guide Portal Migration
-- Adds unique_link_id and access_pin fields for guide public portal access

-- Add unique_link_id column for public portal URL
ALTER TABLE guides ADD COLUMN IF NOT EXISTS unique_link_id VARCHAR(100) UNIQUE;

-- Add access_pin column for PIN authentication (bcrypt hashed)
ALTER TABLE guides ADD COLUMN IF NOT EXISTS access_pin VARCHAR(255);

-- Create index for faster lookup by unique_link_id
CREATE INDEX IF NOT EXISTS idx_guides_unique_link_id ON guides(unique_link_id);

-- Generate unique_link_id for existing guides that don't have one
-- Using a combination of gen_random_uuid() to create unique identifiers
UPDATE guides 
SET unique_link_id = REPLACE(gen_random_uuid()::text, '-', '')::varchar(32)
WHERE unique_link_id IS NULL;

-- Set a default PIN hash for existing guides (PIN: 1234)
-- bcrypt hash for '1234' - guides should change this
UPDATE guides 
SET access_pin = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqJf1H8.4r.J5VL5r9J5VL5r9J5VL'
WHERE access_pin IS NULL;















-- ============================================
-- MIGRATION: 026_add_program_id_to_boat_locks.sql
-- ============================================

-- Add program_id column to boat_assignment_locks if it doesn't exist
-- This migration ensures the program_id column exists for storing program assignments

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'boat_assignment_locks' 
        AND column_name = 'program_id'
    ) THEN
        ALTER TABLE boat_assignment_locks 
        ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE SET NULL;
    END IF;
END $$;













-- ============================================
-- MIGRATION: 027_booking_invoice_tracking.sql
-- ============================================

-- Add invoice_id to bookings table for tracking invoiced status
-- This allows quick filtering of bookings that haven't been invoiced yet

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Create index for faster queries on invoice_id
CREATE INDEX IF NOT EXISTS idx_bookings_invoice_id ON bookings(invoice_id);

-- Add notes field to invoices for additional information
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS notes TEXT;












-- ============================================
-- MIGRATION: 028_program_pricing_type.sql
-- ============================================

-- Migration: Add pricing type to programs
-- This allows programs to have either single pricing (per person) or adult/child pricing

-- Add pricing type and selling price columns to programs
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) DEFAULT 'single' CHECK (pricing_type IN ('single', 'adult_child')),
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adult_selling_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS child_selling_price DECIMAL(10, 2) DEFAULT 0;

-- Add adult/child agent pricing columns to agent_pricing
ALTER TABLE agent_pricing
ADD COLUMN IF NOT EXISTS adult_agent_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS child_agent_price DECIMAL(10, 2);

-- Update existing programs to have selling_price equal to base_price for backwards compatibility
UPDATE programs SET selling_price = base_price WHERE selling_price = 0 OR selling_price IS NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN programs.pricing_type IS 'single = one price per person, adult_child = separate adult and child prices';
COMMENT ON COLUMN programs.selling_price IS 'Selling price for single pricing type (per person)';
COMMENT ON COLUMN programs.adult_selling_price IS 'Adult selling price for adult_child pricing type';
COMMENT ON COLUMN programs.child_selling_price IS 'Child selling price for adult_child pricing type';
COMMENT ON COLUMN agent_pricing.adult_agent_price IS 'Agent price for adults (used when program has adult_child pricing)';
COMMENT ON COLUMN agent_pricing.child_agent_price IS 'Agent price for children (used when program has adult_child pricing)';












-- ============================================
-- MIGRATION: 029_merge_duplicate_agents.sql
-- ============================================

-- Migration: Merge duplicate agents and consolidate their bookings
-- This script identifies duplicate agents by name within each company,
-- keeps the one with the most bookings (or oldest if tied), and merges the rest.

-- Step 1: Create a temporary table to identify duplicates and which agent to keep
CREATE TEMP TABLE agent_duplicates AS
WITH agent_booking_counts AS (
  SELECT 
    a.id,
    a.company_id,
    a.name,
    a.created_at,
    COALESCE(COUNT(b.id), 0) as booking_count
  FROM agents a
  LEFT JOIN bookings b ON b.agent_id = a.id AND b.deleted_at IS NULL
  WHERE a.status != 'deleted'
  GROUP BY a.id, a.company_id, a.name, a.created_at
),
ranked_agents AS (
  SELECT 
    id,
    company_id,
    name,
    booking_count,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, LOWER(TRIM(name))
      ORDER BY booking_count DESC, created_at ASC
    ) as rank
  FROM agent_booking_counts
)
SELECT 
  r1.id as keep_agent_id,
  r2.id as duplicate_agent_id,
  r1.company_id,
  r1.name
FROM ranked_agents r1
JOIN ranked_agents r2 ON r1.company_id = r2.company_id 
  AND LOWER(TRIM(r1.name)) = LOWER(TRIM(r2.name))
  AND r1.rank = 1 
  AND r2.rank > 1;

-- Step 2: Update bookings to point to the kept agent
UPDATE bookings b
SET agent_id = d.keep_agent_id
FROM agent_duplicates d
WHERE b.agent_id = d.duplicate_agent_id;

-- Step 3: Update agent_pricing to point to the kept agent (if not already exists)
-- First, delete pricing records that would create duplicates
DELETE FROM agent_pricing ap
USING agent_duplicates d
WHERE ap.agent_id = d.duplicate_agent_id
  AND EXISTS (
    SELECT 1 FROM agent_pricing ap2 
    WHERE ap2.agent_id = d.keep_agent_id 
    AND ap2.program_id = ap.program_id
  );

-- Then update remaining pricing records
UPDATE agent_pricing ap
SET agent_id = d.keep_agent_id
FROM agent_duplicates d
WHERE ap.agent_id = d.duplicate_agent_id;

-- Step 4: Move agent_staff to the kept agent
UPDATE agent_staff s
SET agent_id = d.keep_agent_id
FROM agent_duplicates d
WHERE s.agent_id = d.duplicate_agent_id;

-- Step 5: Soft delete the duplicate agents
UPDATE agents a
SET status = 'deleted'
FROM agent_duplicates d
WHERE a.id = d.duplicate_agent_id;

-- Step 6: Log what was merged (for reference)
DO $$
DECLARE
  merge_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO merge_count FROM agent_duplicates;
  RAISE NOTICE 'Merged % duplicate agent records', merge_count;
END $$;

-- Clean up
DROP TABLE agent_duplicates;












-- ============================================
-- MIGRATION: 030_fix_program_pricing_columns.sql
-- ============================================

-- Migration: Fix program pricing columns
-- This migration adds the pricing columns if they don't exist

-- Add pricing type and selling price columns to programs (if not exists)
DO $$
BEGIN
    -- Add pricing_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'pricing_type') THEN
        ALTER TABLE programs ADD COLUMN pricing_type VARCHAR(20) DEFAULT 'single' CHECK (pricing_type IN ('single', 'adult_child'));
    END IF;
    
    -- Add selling_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'selling_price') THEN
        ALTER TABLE programs ADD COLUMN selling_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Add adult_selling_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'adult_selling_price') THEN
        ALTER TABLE programs ADD COLUMN adult_selling_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Add child_selling_price column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'child_selling_price') THEN
        ALTER TABLE programs ADD COLUMN child_selling_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- Add adult_agent_price column to agent_pricing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pricing' AND column_name = 'adult_agent_price') THEN
        ALTER TABLE agent_pricing ADD COLUMN adult_agent_price DECIMAL(10, 2);
    END IF;
    
    -- Add child_agent_price column to agent_pricing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_pricing' AND column_name = 'child_agent_price') THEN
        ALTER TABLE agent_pricing ADD COLUMN child_agent_price DECIMAL(10, 2);
    END IF;
END $$;

-- Update existing programs to have selling_price equal to base_price for backwards compatibility
UPDATE programs SET selling_price = base_price WHERE selling_price = 0 OR selling_price IS NULL;












-- ============================================
-- MIGRATION: 031_invoice_payment_enhancements.sql
-- ============================================

-- Migration: Invoice payment enhancements
-- Adds payment type tracking, internal notes, and ensures updated_at is tracked

-- 1. Create invoice_payment_types table for company-specific payment methods
CREATE TABLE IF NOT EXISTS invoice_payment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_payment_types_company_id ON invoice_payment_types(company_id);

-- 2. Add new columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_type_id UUID REFERENCES invoice_payment_types(id) ON DELETE SET NULL;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Create index for payment_type lookups
CREATE INDEX IF NOT EXISTS idx_invoices_payment_type_id ON invoices(payment_type_id);

-- 3. Seed some default payment types for existing companies
INSERT INTO invoice_payment_types (company_id, name, is_active)
SELECT id, 'Bank Transfer', true FROM companies
ON CONFLICT DO NOTHING;

INSERT INTO invoice_payment_types (company_id, name, is_active)
SELECT id, 'Cash', true FROM companies
ON CONFLICT DO NOTHING;

INSERT INTO invoice_payment_types (company_id, name, is_active)
SELECT id, 'Credit Card', true FROM companies
ON CONFLICT DO NOTHING;

-- 4. Create trigger to auto-update updated_at on invoices
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

-- 5. Create trigger to auto-update updated_at on invoice_payment_types
DROP TRIGGER IF EXISTS trigger_invoice_payment_types_updated_at ON invoice_payment_types;
CREATE TRIGGER trigger_invoice_payment_types_updated_at
    BEFORE UPDATE ON invoice_payment_types
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();












-- ============================================
-- MIGRATION: 032_invoice_payment_types_rls.sql
-- ============================================

-- Migration: Add RLS policies for invoice_payment_types table

-- Enable RLS
ALTER TABLE invoice_payment_types ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their company's payment types
CREATE POLICY "Users can view own company payment types" ON invoice_payment_types
    FOR SELECT
    USING (company_id = get_user_company_id() OR is_super_admin());

-- Policy: Users can manage their company's payment types
CREATE POLICY "Users can manage own company payment types" ON invoice_payment_types
    FOR ALL
    USING (company_id = get_user_company_id() OR is_super_admin())
    WITH CHECK (company_id = get_user_company_id() OR is_super_admin());












-- ============================================
-- MIGRATION: 033_add_notes_to_invoices.sql
-- ============================================

-- Migration: Add notes column to invoices table
-- This column was referenced in the code but missing from the schema

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS notes TEXT;












-- ============================================
-- MIGRATION: 034_invoice_settings.sql
-- ============================================

-- Invoice Settings Enhancement Migration
-- Adds tax_id, address, phone fields to companies and agents tables

-- Add tax_id to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Add address to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;

-- Add phone to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add tax_id to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Add address to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies.tax_id IS 'Company Tax ID for invoices';
COMMENT ON COLUMN companies.address IS 'Company address for invoices';
COMMENT ON COLUMN companies.phone IS 'Company phone number for invoices';
COMMENT ON COLUMN agents.tax_id IS 'Agent Tax ID for invoices (optional)';
COMMENT ON COLUMN agents.address IS 'Agent address for invoices (optional)';






-- ============================================
-- MIGRATION: 035_agent_address.sql
-- ============================================

-- Add address column to agents table for invoice purposes
ALTER TABLE agents ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN agents.address IS 'Agent address for invoices (optional)';











-- ============================================
-- MIGRATION: 036_cleanup_duplicate_staff.sql
-- ============================================

-- Migration: Clean up duplicate agent_staff entries
-- This removes duplicate staff entries keeping only the first one (oldest) for each unique combination of agent_id + full_name

-- First, let's identify and delete duplicates
-- We keep the row with the earliest created_at for each agent_id + full_name combination

DELETE FROM agent_staff
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY agent_id, LOWER(TRIM(full_name))
        ORDER BY created_at ASC
      ) as row_num
    FROM agent_staff
  ) duplicates
  WHERE row_num > 1
);

-- Add a comment to document this cleanup
COMMENT ON TABLE agent_staff IS 'Agent staff members. Duplicates cleaned up in migration 035.';






-- ============================================
-- MIGRATION: 037_invoice_due_date.sql
-- ============================================

-- Add due date columns to invoices table
ALTER TABLE invoices
ADD COLUMN due_date DATE,
ADD COLUMN due_days INT;

-- Add comment for clarity
COMMENT ON COLUMN invoices.due_date IS 'The date by which payment is due';
COMMENT ON COLUMN invoices.due_days IS 'Number of days from creation until due (1, 3, 7, 14, 21, 30, 45, 60)';











-- ============================================
-- MIGRATION: 038_agent_tax_applied.sql
-- ============================================

-- Add tax_applied column to agents table
-- When false, invoices for this agent will not show tax information

ALTER TABLE agents
ADD COLUMN tax_applied BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN agents.tax_applied IS 'When false, invoices for this agent will not display tax IDs or calculate tax';











-- ============================================
-- MIGRATION: 039_page_lock_settings.sql
-- ============================================

-- Migration: Add page lock settings to companies
-- This allows companies to configure which pages require PIN protection

-- Add page_locks JSONB column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS page_locks JSONB DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN companies.page_locks IS 'JSON object storing which pages require PIN protection. Keys are page identifiers, values are booleans.';











-- ============================================
-- MIGRATION: 040_company_team.sql
-- ============================================

-- Migration: Company Team Members
-- Allows companies to have multiple staff members with granular permissions

CREATE TABLE IF NOT EXISTS company_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auth_id UUID UNIQUE,  -- Links to Supabase auth.users
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_team_members_company_id ON company_team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_team_members_auth_id ON company_team_members(auth_id);
CREATE INDEX IF NOT EXISTS idx_company_team_members_email ON company_team_members(email);

-- Enable RLS
ALTER TABLE company_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admins can do everything
CREATE POLICY "Super admins have full access to team members"
  ON company_team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Master admins can manage their company's team members
CREATE POLICY "Master admins can manage their company team members"
  ON company_team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'master_admin'
      AND users.company_id = company_team_members.company_id
    )
  );

-- Team members can view their own record
CREATE POLICY "Team members can view their own record"
  ON company_team_members
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_company_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_team_members_updated_at
  BEFORE UPDATE ON company_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_company_team_members_updated_at();

-- Comment for documentation
COMMENT ON TABLE company_team_members IS 'Staff members belonging to a company with granular permissions';
COMMENT ON COLUMN company_team_members.permissions IS 'JSON object with granular permissions per page/feature. Structure: { page: { view, create, edit, delete } }';











-- ============================================
-- MIGRATION: 041_last_modified_tracking.sql
-- ============================================

-- Migration: Add last modified tracking to bookings and invoices
-- This adds columns to track who last modified a record and when

-- Add last_modified_by to bookings table
-- This will store the user ID (from users table) or name of who last modified the booking
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_modified_by_name VARCHAR(255);

-- Add last_modified_by to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_modified_by_name VARCHAR(255);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_last_modified_by ON bookings(last_modified_by);
CREATE INDEX IF NOT EXISTS idx_invoices_last_modified_by ON invoices(last_modified_by);

-- Comment on columns for documentation
COMMENT ON COLUMN bookings.last_modified_by IS 'User ID who last modified this booking';
COMMENT ON COLUMN bookings.last_modified_by_name IS 'Name of user who last modified this booking (denormalized for display)';
COMMENT ON COLUMN invoices.last_modified_by IS 'User ID who last modified this invoice';
COMMENT ON COLUMN invoices.last_modified_by_name IS 'Name of user who last modified this invoice (denormalized for display)';











-- ============================================
-- MIGRATION: 042_stripe_connect_direct_booking.sql
-- ============================================

-- Migration: Stripe Connect and Direct Booking Enhancement
-- Adds Stripe Connect fields to companies and booking-related fields to programs

-- =============================================
-- COMPANIES TABLE: Stripe Connect fields
-- =============================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMPTZ;

-- =============================================
-- PROGRAMS TABLE: Direct booking fields
-- =============================================
-- Slug for URL-friendly program names (e.g., "phi-phi-island", "james-bond")
ALTER TABLE programs ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Thumbnail image for program gallery
ALTER TABLE programs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Toggle to enable/disable program for direct booking
ALTER TABLE programs ADD COLUMN IF NOT EXISTS direct_booking_enabled BOOLEAN DEFAULT false;

-- Short description for the booking page (different from full description)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Create unique index on slug per company (slug must be unique within a company)
CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_company_slug 
ON programs(company_id, slug) 
WHERE slug IS NOT NULL;

-- =============================================
-- BOOKINGS TABLE: Add booking source field
-- =============================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source VARCHAR(100);

-- Set default booking source for existing direct bookings
UPDATE bookings 
SET booking_source = 'DIRECT BOOKING - website purchase' 
WHERE is_direct_booking = true AND booking_source IS NULL;

-- =============================================
-- Function to generate slug from program name
-- =============================================
CREATE OR REPLACE FUNCTION generate_program_slug(program_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(program_name),
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    )
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Trigger to auto-generate slug if not provided
-- =============================================
CREATE OR REPLACE FUNCTION set_program_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Only generate slug if not provided and name exists
  IF NEW.slug IS NULL AND NEW.name IS NOT NULL THEN
    base_slug := generate_program_slug(NEW.name);
    final_slug := base_slug;
    
    -- Check for uniqueness within company and append number if needed
    WHILE EXISTS (
      SELECT 1 FROM programs 
      WHERE company_id = NEW.company_id 
      AND slug = final_slug 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating slug
DROP TRIGGER IF EXISTS trigger_set_program_slug ON programs;
CREATE TRIGGER trigger_set_program_slug
  BEFORE INSERT OR UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION set_program_slug();

-- =============================================
-- Generate slugs for existing programs
-- =============================================
DO $$
DECLARE
  prog RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INT;
BEGIN
  FOR prog IN SELECT id, company_id, name FROM programs WHERE slug IS NULL
  LOOP
    base_slug := generate_program_slug(prog.name);
    final_slug := base_slug;
    counter := 0;
    
    WHILE EXISTS (
      SELECT 1 FROM programs 
      WHERE company_id = prog.company_id 
      AND slug = final_slug 
      AND id != prog.id
    ) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    UPDATE programs SET slug = final_slug WHERE id = prog.id;
  END LOOP;
END $$;

-- =============================================
-- Comments for documentation
-- =============================================
COMMENT ON COLUMN companies.stripe_account_id IS 'Stripe Connect Express account ID';
COMMENT ON COLUMN companies.stripe_connected IS 'Whether Stripe account is connected';
COMMENT ON COLUMN companies.stripe_onboarding_complete IS 'Whether Stripe onboarding is fully complete';
COMMENT ON COLUMN companies.stripe_connected_at IS 'When Stripe was connected';
COMMENT ON COLUMN programs.slug IS 'URL-friendly slug for direct booking page';
COMMENT ON COLUMN programs.thumbnail_url IS 'Image URL for program gallery';
COMMENT ON COLUMN programs.direct_booking_enabled IS 'Whether program appears on public booking page';
COMMENT ON COLUMN programs.short_description IS 'Brief description for booking page';
COMMENT ON COLUMN bookings.booking_source IS 'Source of booking (e.g., DIRECT BOOKING - website purchase)';











-- ============================================
-- MIGRATION: 043_superadmin_billing.sql
-- ============================================

-- Migration: Superadmin Billing and Subscription Management
-- Adds billing tracking, subscription management, and company owner fields

-- =============================================
-- COMPANIES TABLE: Owner and billing fields
-- =============================================

-- Company owner information
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(50);

-- Subscription and billing fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS next_billing_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_notes TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- =============================================
-- SUBSCRIPTION PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('stripe', 'bank_transfer', 'cash', 'other')),
    stripe_payment_id VARCHAR(255),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_payments_company_id ON subscription_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_date ON subscription_payments(payment_date);

-- Enable RLS on subscription_payments
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Only super_admin can access subscription_payments
CREATE POLICY "Super admin can manage subscription payments" ON subscription_payments
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- =============================================
-- SUBSCRIPTION ACTIVITY LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_by_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_activity_log_company_id ON subscription_activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_activity_log_created_at ON subscription_activity_log(created_at);

-- Enable RLS on subscription_activity_log
ALTER TABLE subscription_activity_log ENABLE ROW LEVEL SECURITY;

-- Only super_admin can access subscription_activity_log
CREATE POLICY "Super admin can manage subscription activity log" ON subscription_activity_log
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- =============================================
-- PLATFORM SETTINGS TABLE (for default pricing, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super_admin can access platform_settings
CREATE POLICY "Super admin can manage platform settings" ON platform_settings
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
    ('default_monthly_price', '{"amount": 1500, "currency": "THB"}', 'Default monthly subscription price for new tenants'),
    ('billing_reminder_days', '{"days": [7, 3, 1]}', 'Days before due date to send billing reminders'),
    ('grace_period_days', '{"days": 7}', 'Days after due date before suspension')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- UPDATE FUNCTION FOR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_subscription_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription_payments
DROP TRIGGER IF EXISTS trigger_update_subscription_payments_updated_at ON subscription_payments;
CREATE TRIGGER trigger_update_subscription_payments_updated_at
    BEFORE UPDATE ON subscription_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_payments_updated_at();

-- =============================================
-- HELPER FUNCTION: Get months paid for a company
-- =============================================
CREATE OR REPLACE FUNCTION get_company_months_paid(p_company_id UUID)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT DATE_TRUNC('month', period_start))
        FROM subscription_payments
        WHERE company_id = p_company_id
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- HELPER FUNCTION: Get months since subscription started
-- =============================================
CREATE OR REPLACE FUNCTION get_company_months_active(p_company_id UUID)
RETURNS INT AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    SELECT subscription_started_at INTO start_date
    FROM companies
    WHERE id = p_company_id;
    
    IF start_date IS NULL THEN
        SELECT created_at INTO start_date
        FROM companies
        WHERE id = p_company_id;
    END IF;
    
    RETURN GREATEST(1, EXTRACT(MONTH FROM AGE(NOW(), start_date)) + 
                       EXTRACT(YEAR FROM AGE(NOW(), start_date)) * 12 + 1);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Set subscription_started_at for existing active companies
-- =============================================
UPDATE companies 
SET subscription_started_at = created_at 
WHERE subscription_started_at IS NULL 
AND subscription_status = 'active';

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON COLUMN companies.owner_name IS 'Primary contact/owner name for the company';
COMMENT ON COLUMN companies.owner_email IS 'Primary contact/owner email for billing communications';
COMMENT ON COLUMN companies.owner_phone IS 'Primary contact/owner phone number';
COMMENT ON COLUMN companies.monthly_price IS 'Custom monthly subscription price (0 = use default)';
COMMENT ON COLUMN companies.trial_ends_at IS 'Trial period end date (null = no trial)';
COMMENT ON COLUMN companies.subscription_started_at IS 'When the paid subscription began';
COMMENT ON COLUMN companies.next_billing_date IS 'Next payment due date';
COMMENT ON COLUMN companies.billing_notes IS 'Internal notes about billing for this company';
COMMENT ON COLUMN companies.suspended_at IS 'When the company was suspended';
COMMENT ON COLUMN companies.suspended_reason IS 'Reason for suspension';

COMMENT ON TABLE subscription_payments IS 'Records all subscription payments from tenants';
COMMENT ON TABLE subscription_activity_log IS 'Audit log for subscription-related actions';
COMMENT ON TABLE platform_settings IS 'Global platform configuration settings';






-- ============================================
-- MIGRATION: 044_platform_storage.sql
-- ============================================

-- Migration: Platform Storage for Admin Assets
-- Creates storage bucket for platform branding assets (logo, favicon)

-- =============================================
-- CREATE STORAGE BUCKET
-- =============================================

-- Note: Storage buckets are typically created via Supabase Dashboard or CLI
-- This migration adds the bucket configuration if it doesn't exist

-- Insert bucket configuration (this is a reference, actual bucket creation
-- should be done via Supabase Dashboard: Storage > New Bucket > "platform-assets")

-- The bucket should be configured as:
-- Name: platform-assets
-- Public: true (for serving logo/favicon publicly)
-- Allowed MIME types: image/png, image/jpeg, image/svg+xml, image/x-icon, image/vnd.microsoft.icon

-- =============================================
-- UPDATE PLATFORM_SETTINGS WITH BRANDING KEYS
-- =============================================

INSERT INTO platform_settings (key, value, description) VALUES
    ('branding', '{"logo_url": null, "favicon_url": null}', 'Platform branding assets (logo and favicon URLs)'),
    ('subscription_defaults', '{"monthly_price": 1500, "currency": "THB", "grace_period_days": 7}', 'Default subscription settings for new tenants')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- STORAGE POLICIES (run these in Supabase Dashboard SQL Editor)
-- =============================================

-- These policies should be applied after creating the bucket:

-- Allow super_admin to upload files
-- CREATE POLICY "Super admin can upload platform assets"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'platform-assets' AND
--   (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'super_admin'
-- );

-- Allow super_admin to update files
-- CREATE POLICY "Super admin can update platform assets"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'platform-assets' AND
--   (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'super_admin'
-- );

-- Allow super_admin to delete files
-- CREATE POLICY "Super admin can delete platform assets"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'platform-assets' AND
--   (SELECT role FROM public.users WHERE auth_id = auth.uid()) = 'super_admin'
-- );

-- Allow public read access for logo and favicon
-- CREATE POLICY "Public can view platform assets"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'platform-assets');

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE platform_settings IS 'Global platform configuration including branding and subscription defaults';











-- ============================================
-- MIGRATION: 045_op_report_auto_email.sql
-- ============================================

-- Migration: Add OP Report Auto Email Settings
-- This adds settings for automatic daily OP report emails to companies

-- The settings are stored in the existing company.settings JSONB column
-- Structure:
-- {
--   "op_report_auto_email": {
--     "send_time": "23:30",  -- HH:MM format
--     "recipient_emails": ["email1@example.com", "email2@example.com"]
--   }
-- }

-- No schema changes needed as we use the existing settings JSONB column
-- This migration serves as documentation for the feature

COMMENT ON COLUMN companies.settings IS 'Company settings JSON including:
- branding: logo_url, primary_color, secondary_color
- payment: bank_name, account_name, account_number, payment_instructions
- email: from_name, reply_to, footer_text
- pickup: contact_info
- availability: days_to_display, contact_phone, contact_email, contact_whatsapp
- invoice: logo_url, payment_footer, tax_percentage
- booking: thank_you_message, failed_payment_message, contact_for_manual_booking, page_header_text, page_footer_text
- op_report_auto_email: send_time (HH:MM), recipient_emails (string array)';











-- ============================================
-- MIGRATION: 046_company_logo_storage.sql
-- ============================================

-- Migration: Company Logo Storage
-- Creates storage bucket for company assets (logos, etc.)
-- This allows companies to upload their logos instead of using external URLs

-- ============================================
-- STORAGE BUCKET: company-assets
-- ============================================
-- Note: Storage buckets are typically created via Supabase Dashboard
-- Go to: Storage > New Bucket > Create "company-assets" with these settings:
--   - Name: company-assets
--   - Public bucket: YES (so logos can be displayed in emails/PDFs)
--   - File size limit: 2MB
--   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, image/svg+xml

-- ============================================
-- STORAGE POLICIES (run in Supabase Dashboard SQL Editor)
-- ============================================

-- Allow authenticated users to upload logos for their company
-- CREATE POLICY "Users can upload company logos"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'company-assets' AND
--   (storage.foldername(name))[1] = 'company-logos'
-- );

-- Allow authenticated users to update their company logos
-- CREATE POLICY "Users can update company logos"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'company-assets' AND
--   (storage.foldername(name))[1] = 'company-logos'
-- );

-- Allow authenticated users to delete their company logos
-- CREATE POLICY "Users can delete company logos"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'company-assets' AND
--   (storage.foldername(name))[1] = 'company-logos'
-- );

-- Allow public read access to company logos (needed for emails/PDFs)
-- CREATE POLICY "Public can view company logos"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'company-assets');

-- ============================================
-- INSTRUCTIONS FOR SETUP
-- ============================================
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name: company-assets
-- 4. Check "Public bucket" 
-- 5. Click "Create bucket"
-- 6. Go to Policies tab and add the policies above
--    OR enable "Allow public access" for simpler setup

-- Note: Storage bucket should be created via Supabase Dashboard
-- This migration is documentation only - no executable SQL commands











-- ============================================
-- MIGRATION: 047_staff_management.sql
-- ============================================

-- Migration: Staff Management System
-- Adds company codes and staff codes for staff authentication

-- Add company_code and staff_sequence to companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS company_code INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS staff_sequence INTEGER DEFAULT 0;

-- Add staff_code to company_team_members table
ALTER TABLE company_team_members
  ADD COLUMN IF NOT EXISTS staff_code VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS username VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_company_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_company_team_members_staff_code ON company_team_members(staff_code);
CREATE INDEX IF NOT EXISTS idx_company_team_members_username ON company_team_members(username);

-- Function to generate unique company code between 30000-99999
CREATE OR REPLACE FUNCTION generate_unique_company_code()
RETURNS INTEGER AS $$
DECLARE
  new_code INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random code between 30000-99999
    new_code := floor(random() * (99999 - 30000 + 1) + 30000)::INTEGER;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM companies WHERE company_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to generate next staff code for a company
CREATE OR REPLACE FUNCTION generate_staff_code(p_company_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_company_code INTEGER;
  v_sequence INTEGER;
  v_staff_code VARCHAR(20);
BEGIN
  -- Get company code and increment sequence
  UPDATE companies 
  SET staff_sequence = staff_sequence + 1
  WHERE id = p_company_id
  RETURNING company_code, staff_sequence INTO v_company_code, v_sequence;
  
  -- Generate staff code
  v_staff_code := v_company_code::TEXT || '-' || v_sequence::TEXT;
  
  RETURN v_staff_code;
END;
$$ LANGUAGE plpgsql;

-- Generate company codes for existing companies that don't have one
DO $$
DECLARE
  company_record RECORD;
  new_code INTEGER;
BEGIN
  FOR company_record IN SELECT id FROM companies WHERE company_code IS NULL
  LOOP
    new_code := generate_unique_company_code();
    UPDATE companies SET company_code = new_code WHERE id = company_record.id;
  END LOOP;
END $$;

-- Generate staff codes for existing team members that don't have one
DO $$
DECLARE
  member_record RECORD;
  new_staff_code VARCHAR(20);
BEGIN
  FOR member_record IN 
    SELECT ctm.id, ctm.company_id 
    FROM company_team_members ctm 
    WHERE ctm.staff_code IS NULL
    ORDER BY ctm.created_at
  LOOP
    new_staff_code := generate_staff_code(member_record.company_id);
    UPDATE company_team_members 
    SET staff_code = new_staff_code, username = new_staff_code 
    WHERE id = member_record.id;
  END LOOP;
END $$;

-- Make company_code NOT NULL after populating existing records
ALTER TABLE companies ALTER COLUMN company_code SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN companies.company_code IS 'Unique company identifier (30000-99999) used for staff code generation';
COMMENT ON COLUMN companies.staff_sequence IS 'Auto-incrementing counter for staff numbering within this company';
COMMENT ON COLUMN company_team_members.staff_code IS 'Unique staff ID in format: company_code-sequence (e.g., 35688-1)';
COMMENT ON COLUMN company_team_members.username IS 'Username for login, same as staff_code';






-- ============================================
-- MIGRATION: 048_fix_user_rls_for_login.sql
-- ============================================

-- Fix RLS policy for user login
-- Allow users to view their own record by auth_id (needed for login)

CREATE POLICY "Users can view own record by auth_id" ON users
    FOR SELECT
    TO authenticated
    USING (auth_id = auth.uid());






-- ============================================
-- MIGRATION: 049_program_brochure_itinerary.sql
-- ============================================

-- Add brochure_images, itinerary_html, and itinerary_title fields to programs table
-- brochure_images: JSONB array of image URLs (up to 10 images)
-- itinerary_html: Rich text/HTML content for itinerary
-- itinerary_title: Custom title for the itinerary accordion

ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS brochure_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS itinerary_html TEXT,
ADD COLUMN IF NOT EXISTS itinerary_title TEXT DEFAULT 'Itinerary';

-- Add comment for documentation
COMMENT ON COLUMN programs.brochure_images IS 'Array of brochure image URLs (up to 10), displayed in lightbox on booking page';
COMMENT ON COLUMN programs.itinerary_html IS 'HTML/rich text content for itinerary accordion on booking page';
COMMENT ON COLUMN programs.itinerary_title IS 'Custom title for the itinerary accordion (defaults to Itinerary)';






-- ============================================
-- MIGRATION: 050_structured_booking_number.sql
-- ============================================

-- ===================================
-- MIGRATION: Structured Booking Number
-- Run this in your Supabase SQL Editor
-- ===================================
-- Format: {INITIALS}-{SEQUENCE}{-SUFFIX}
-- Example: TDC-000001, TDC-000002-FOC, TDC-000003-INSP
-- ===================================

-- Ensure columns exist on companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS initials VARCHAR(10);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS booking_sequence INTEGER DEFAULT 0;

-- Function to generate initials from company name
CREATE OR REPLACE FUNCTION generate_company_initials(company_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    cleaned_name TEXT;
    words TEXT[];
    initials TEXT := '';
    word TEXT;
BEGIN
    -- Remove common suffixes and punctuation
    cleaned_name := regexp_replace(company_name, '(Co\.|Ltd\.?|Inc\.?|LLC|Corporation|Corp\.?|,)', '', 'gi');
    cleaned_name := trim(cleaned_name);
    
    -- Split into words
    words := string_to_array(cleaned_name, ' ');
    
    -- Take first letter of each word (up to 5 letters)
    FOREACH word IN ARRAY words
    LOOP
        IF length(word) > 0 AND length(initials) < 5 THEN
            initials := initials || upper(substring(word from 1 for 1));
        END IF;
    END LOOP;
    
    -- Default to 'BK' if empty
    IF length(initials) = 0 THEN
        initials := 'BK';
    END IF;
    
    RETURN initials;
END;
$$;

-- Updated generate_booking_number function with structured format
CREATE OR REPLACE FUNCTION generate_booking_number(
    p_company_id UUID,
    p_payment_type TEXT DEFAULT 'paid'
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_initials TEXT;
    v_sequence INTEGER;
    v_booking_number TEXT;
    v_suffix TEXT := '';
    v_company_name TEXT;
BEGIN
    -- Get company info
    SELECT name, initials, COALESCE(booking_sequence, 0)
    INTO v_company_name, v_initials, v_sequence
    FROM companies
    WHERE id = p_company_id;
    
    -- Generate initials if not set
    IF v_initials IS NULL OR v_initials = '' THEN
        v_initials := generate_company_initials(v_company_name);
    END IF;
    
    -- Increment sequence
    v_sequence := v_sequence + 1;
    
    -- Update company with new sequence and initials
    UPDATE companies 
    SET booking_sequence = v_sequence,
        initials = v_initials
    WHERE id = p_company_id;
    
    -- Add suffix for special payment types
    IF p_payment_type = 'foc' THEN
        v_suffix := '-FOC';
    ELSIF p_payment_type = 'insp' THEN
        v_suffix := '-INSP';
    END IF;
    
    -- Generate booking number: INITIALS-000001(-FOC/-INSP)
    v_booking_number := v_initials || '-' || lpad(v_sequence::TEXT, 6, '0') || v_suffix;
    
    RETURN v_booking_number;
END;
$$;

-- Add comment
COMMENT ON FUNCTION generate_booking_number IS 'Generates structured booking numbers in format: INITIALS-SEQUENCE(-SUFFIX). Example: TDC-000001, TDC-000002-FOC';

-- Sync existing sequences (run once to update booking_sequence based on existing bookings)
-- This finds the highest sequence number from existing bookings and updates the company
DO $$
DECLARE
    company_record RECORD;
    max_seq INTEGER;
    company_initials TEXT;
BEGIN
    FOR company_record IN SELECT id, name, initials, booking_sequence FROM companies
    LOOP
        -- Generate initials if not set
        company_initials := COALESCE(company_record.initials, generate_company_initials(company_record.name));
        
        -- Find max sequence from existing bookings with matching prefix
        SELECT COALESCE(MAX(
            CASE 
                WHEN booking_number ~ ('^' || company_initials || '-(\d+)')
                THEN CAST(substring(booking_number from ('^' || company_initials || '-(\d+)')) AS INTEGER)
                ELSE 0
            END
        ), 0) INTO max_seq
        FROM bookings
        WHERE company_id = company_record.id;
        
        -- Update company with synced values
        UPDATE companies 
        SET 
            initials = company_initials,
            booking_sequence = GREATEST(COALESCE(company_record.booking_sequence, 0), max_seq)
        WHERE id = company_record.id;
    END LOOP;
END $$;

SELECT 'Sequences synchronized with existing bookings!' AS result;






-- ============================================
-- MIGRATION: 051_stripe_payment_intent.sql
-- ============================================

-- Add stripe_payment_intent_id column to bookings table
-- This enables idempotent booking creation (webhook + client fallback won't create duplicates)

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Add unique constraint to prevent duplicate bookings for same payment
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_payment_intent_id_unique 
ON bookings(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS bookings_stripe_payment_intent_id_idx 
ON bookings(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON COLUMN bookings.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for online payments, used for idempotency';

SELECT 'Added stripe_payment_intent_id column to bookings table' AS result;






-- ============================================
-- MIGRATION: 052_fix_rls_helper_functions.sql
-- ============================================

-- Fix RLS helper functions to support team members
-- Team members are stored in company_team_members, not users table
-- Also fix infinite recursion by ensuring SECURITY DEFINER properly bypasses RLS

-- Update get_user_company_id to check both users and company_team_members tables
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- First check users table (SECURITY DEFINER ensures this bypasses RLS)
    SELECT company_id INTO v_company_id
    FROM public.users 
    WHERE auth_id = auth.uid();
    
    -- If not found in users, check company_team_members
    IF v_company_id IS NULL THEN
        SELECT company_id INTO v_company_id
        FROM public.company_team_members 
        WHERE auth_id = auth.uid();
    END IF;
    
    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update is_super_admin to handle team members (they are never super admin)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.users 
    WHERE auth_id = auth.uid();
    
    -- If user found in users table, check if super_admin
    IF v_role IS NOT NULL THEN
        RETURN v_role = 'super_admin';
    END IF;
    
    -- Team members are never super admin
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;






-- ============================================
-- MIGRATION: 053_fix_agent_staff_rls.sql
-- ============================================

-- Fix agent_staff RLS policies to use helper function instead of direct users table query
-- This prevents infinite recursion when team members try to manage agent staff

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view agent staff for their company" ON agent_staff;
DROP POLICY IF EXISTS "Users can insert agent staff for their company" ON agent_staff;
DROP POLICY IF EXISTS "Users can update agent staff for their company" ON agent_staff;
DROP POLICY IF EXISTS "Users can delete agent staff for their company" ON agent_staff;

-- Recreate policies using get_user_company_id() helper function
-- This helper function is SECURITY DEFINER and bypasses RLS

CREATE POLICY "Users can view agent staff for their company" ON agent_staff
    FOR SELECT
    TO authenticated
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE company_id = get_user_company_id()
        )
    );

CREATE POLICY "Users can insert agent staff for their company" ON agent_staff
    FOR INSERT
    TO authenticated
    WITH CHECK (
        agent_id IN (
            SELECT id FROM agents WHERE company_id = get_user_company_id()
        )
    );

CREATE POLICY "Users can update agent staff for their company" ON agent_staff
    FOR UPDATE
    TO authenticated
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE company_id = get_user_company_id()
        )
    );

CREATE POLICY "Users can delete agent staff for their company" ON agent_staff
    FOR DELETE
    TO authenticated
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE company_id = get_user_company_id()
        )
    );





