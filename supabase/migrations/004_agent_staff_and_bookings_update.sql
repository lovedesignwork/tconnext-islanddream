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












