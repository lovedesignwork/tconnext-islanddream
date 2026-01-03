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
