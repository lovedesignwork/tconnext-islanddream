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






