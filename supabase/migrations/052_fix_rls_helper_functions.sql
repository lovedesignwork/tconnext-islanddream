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

