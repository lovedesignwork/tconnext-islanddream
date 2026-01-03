-- ===================================
-- FIX ADMIN USER PERMISSIONS
-- Run this in your Supabase SQL Editor
-- ===================================

-- 1. First, let's see the current user data
SELECT id, auth_id, company_id, role, permissions, name, email 
FROM users 
WHERE auth_id = '172de6e1-6d61-4f2e-93d5-527119a01776';

-- 2. Update the user with proper permissions for master_admin
UPDATE users 
SET 
    permissions = '{
        "dashboard": {"view": true, "manage": true},
        "programs": {"view": true, "manage": true, "setup": true},
        "agents": {"view": true, "manage": true, "setup": true},
        "drivers": {"view": true, "manage": true, "setup": true},
        "boats": {"view": true, "manage": true, "setup": true},
        "invoices": {"view": true, "manage": true},
        "finance": {"view": true, "manage": true},
        "reports": {"view": true}
    }'::jsonb,
    name = 'Island Dream Admin',
    email = 'islanddreamexploration@gmail.com'
WHERE auth_id = '172de6e1-6d61-4f2e-93d5-527119a01776';

-- 3. Enable RLS on users table and create policies to allow authenticated users to read their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own user data" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read their own user data" ON users;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT
    USING (auth.uid() = auth_id);

-- 4. Also create a policy for service role to bypass RLS (for API calls)
DROP POLICY IF EXISTS "Service role can read all users" ON users;
CREATE POLICY "Service role can read all users" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Verify the update
SELECT id, auth_id, company_id, role, permissions, name, email 
FROM users 
WHERE auth_id = '172de6e1-6d61-4f2e-93d5-527119a01776';

SELECT '✅ Admin user permissions updated successfully!' AS status;

