-- ============================================
-- COMPLETE DATABASE SETUP
-- Run this entire script in Supabase SQL Editor
-- This will create all tables and your admin user
-- ============================================

-- First, let's check if tables exist and create them if needed
-- This is a minimal setup to get you started quickly

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'USD',
    initials VARCHAR(10),
    booking_sequence INTEGER DEFAULT 0,
    region TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default company if it doesn't exist
INSERT INTO companies (id, name, email, timezone, currency)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'TConnext Island Dream',
    'info@tconnext.com',
    'Asia/Bangkok',
    'THB'
)
ON CONFLICT (id) DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('master_admin', 'staff')),
    permissions JSONB DEFAULT '{}',
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on auth_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view their own company users" ON users;
CREATE POLICY "Users can view their own company users" ON users
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE auth_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Master admins can insert users" ON users;
CREATE POLICY "Master admins can insert users" ON users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role = 'master_admin'
            AND company_id = users.company_id
        )
    );

DROP POLICY IF EXISTS "Master admins can update users" ON users;
CREATE POLICY "Master admins can update users" ON users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role = 'master_admin'
            AND company_id = users.company_id
        )
    );

-- Create RLS policies for companies table
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT
    USING (
        id IN (
            SELECT company_id FROM users WHERE auth_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Master admins can update their company" ON companies;
CREATE POLICY "Master admins can update their company" ON companies
    FOR UPDATE
    USING (
        id IN (
            SELECT company_id FROM users 
            WHERE auth_id = auth.uid() 
            AND role = 'master_admin'
        )
    );

-- Now create your admin user
INSERT INTO users (auth_id, company_id, role, permissions, name, email)
VALUES (
    '172de6e1-6d61-4f2e-93d5-527119a01776',
    '00000000-0000-0000-0000-000000000001',
    'master_admin',
    '{}',
    'Admin User',
    'admin@tconnext.com'
)
ON CONFLICT (auth_id) DO UPDATE
SET 
    role = 'master_admin',
    company_id = '00000000-0000-0000-0000-000000000001',
    name = 'Admin User';

-- Verify everything was created
SELECT 'Setup completed successfully!' AS status;

-- Show your admin user
SELECT 
    'Admin User Details:' AS info,
    id,
    auth_id,
    email,
    name,
    role,
    company_id
FROM users
WHERE auth_id = '172de6e1-6d61-4f2e-93d5-527119a01776';

-- Show company
SELECT 
    'Company Details:' AS info,
    id,
    name,
    email,
    timezone,
    currency
FROM companies
WHERE id = '00000000-0000-0000-0000-000000000001';

