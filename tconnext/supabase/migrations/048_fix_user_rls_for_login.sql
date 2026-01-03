-- Fix RLS policy for user login
-- Allow users to view their own record by auth_id (needed for login)

CREATE POLICY "Users can view own record by auth_id" ON users
    FOR SELECT
    TO authenticated
    USING (auth_id = auth.uid());

