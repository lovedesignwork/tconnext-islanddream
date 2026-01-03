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












