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

