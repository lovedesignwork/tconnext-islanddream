-- ============================================
-- CREATE ADMIN USER
-- Run this after migrations are complete
-- ============================================

-- Insert admin user into users table
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
  company_id = '00000000-0000-0000-0000-000000000001';

SELECT 'Admin user created successfully!' AS result;

-- Verify the user was created
SELECT 
  id,
  auth_id,
  email,
  name,
  role,
  company_id
FROM users
WHERE auth_id = '172de6e1-6d61-4f2e-93d5-527119a01776';

