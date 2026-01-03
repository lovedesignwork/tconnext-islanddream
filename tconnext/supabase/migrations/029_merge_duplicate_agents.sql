-- Migration: Merge duplicate agents and consolidate their bookings
-- This script identifies duplicate agents by name within each company,
-- keeps the one with the most bookings (or oldest if tied), and merges the rest.

-- Step 1: Create a temporary table to identify duplicates and which agent to keep
CREATE TEMP TABLE agent_duplicates AS
WITH agent_booking_counts AS (
  SELECT 
    a.id,
    a.company_id,
    a.name,
    a.created_at,
    COALESCE(COUNT(b.id), 0) as booking_count
  FROM agents a
  LEFT JOIN bookings b ON b.agent_id = a.id AND b.deleted_at IS NULL
  WHERE a.status != 'deleted'
  GROUP BY a.id, a.company_id, a.name, a.created_at
),
ranked_agents AS (
  SELECT 
    id,
    company_id,
    name,
    booking_count,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, LOWER(TRIM(name))
      ORDER BY booking_count DESC, created_at ASC
    ) as rank
  FROM agent_booking_counts
)
SELECT 
  r1.id as keep_agent_id,
  r2.id as duplicate_agent_id,
  r1.company_id,
  r1.name
FROM ranked_agents r1
JOIN ranked_agents r2 ON r1.company_id = r2.company_id 
  AND LOWER(TRIM(r1.name)) = LOWER(TRIM(r2.name))
  AND r1.rank = 1 
  AND r2.rank > 1;

-- Step 2: Update bookings to point to the kept agent
UPDATE bookings b
SET agent_id = d.keep_agent_id
FROM agent_duplicates d
WHERE b.agent_id = d.duplicate_agent_id;

-- Step 3: Update agent_pricing to point to the kept agent (if not already exists)
-- First, delete pricing records that would create duplicates
DELETE FROM agent_pricing ap
USING agent_duplicates d
WHERE ap.agent_id = d.duplicate_agent_id
  AND EXISTS (
    SELECT 1 FROM agent_pricing ap2 
    WHERE ap2.agent_id = d.keep_agent_id 
    AND ap2.program_id = ap.program_id
  );

-- Then update remaining pricing records
UPDATE agent_pricing ap
SET agent_id = d.keep_agent_id
FROM agent_duplicates d
WHERE ap.agent_id = d.duplicate_agent_id;

-- Step 4: Move agent_staff to the kept agent
UPDATE agent_staff s
SET agent_id = d.keep_agent_id
FROM agent_duplicates d
WHERE s.agent_id = d.duplicate_agent_id;

-- Step 5: Soft delete the duplicate agents
UPDATE agents a
SET status = 'deleted'
FROM agent_duplicates d
WHERE a.id = d.duplicate_agent_id;

-- Step 6: Log what was merged (for reference)
DO $$
DECLARE
  merge_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO merge_count FROM agent_duplicates;
  RAISE NOTICE 'Merged % duplicate agent records', merge_count;
END $$;

-- Clean up
DROP TABLE agent_duplicates;







