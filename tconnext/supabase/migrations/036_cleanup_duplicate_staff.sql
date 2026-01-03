-- Migration: Clean up duplicate agent_staff entries
-- This removes duplicate staff entries keeping only the first one (oldest) for each unique combination of agent_id + full_name

-- First, let's identify and delete duplicates
-- We keep the row with the earliest created_at for each agent_id + full_name combination

DELETE FROM agent_staff
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY agent_id, LOWER(TRIM(full_name))
        ORDER BY created_at ASC
      ) as row_num
    FROM agent_staff
  ) duplicates
  WHERE row_num > 1
);

-- Add a comment to document this cleanup
COMMENT ON TABLE agent_staff IS 'Agent staff members. Duplicates cleaned up in migration 035.';

