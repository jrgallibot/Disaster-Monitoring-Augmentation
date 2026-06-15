-- =============================================================================
-- Region XIII - Caraga: replace JUNE 14, 2026 accomplishments ONLY
-- Team Leader: Galing, Lovelyn Sibayan (16-09388)
--
-- IMPORTANT:
--   - Only June 14, 2026 (Philippine time) is affected.
--   - June 15 and all other dates are NOT deleted and NOT changed.
--
-- Run in Supabase SQL Editor:
--   1) STEP 1 — preview June 14 rows that will be deleted
--   2) STEP 2 — preview team members who will get new rows
--   3) STEP 3 — delete June 14 only (uncomment)
--   4) STEP 4 — insert 4 June 14 accomplishments (uncomment)
--   5) STEP 5 — verify
-- =============================================================================

-- June 14, 2026 bounds (Asia/Manila)
-- Start: 2026-06-14 00:00:00+08
-- End:   2026-06-15 00:00:00+08  (exclusive — June 15 is NOT included)


-- -----------------------------------------------------------------------------
-- STEP 1 — PREVIEW: June 14 accomplishments only (will be deleted in STEP 3)
-- -----------------------------------------------------------------------------
WITH caraga_region AS (
  SELECT id, name, code
  FROM library_regions
  WHERE is_active = true
    AND (code ILIKE '%Region XIII%' OR name ILIKE '%Caraga%')
  LIMIT 1
),
team_leader AS (
  SELECT id, employee_id, first_name, last_name
  FROM employees
  WHERE employee_id = '16-09388'
),
caraga_team AS (
  SELECT e.id, e.employee_id, e.first_name, e.last_name
  FROM employees e
  JOIN caraga_region r ON r.id = e.region_id
  JOIN team_leader tl ON true
  WHERE e.id = tl.id
     OR e.assigned_team_leader_id = tl.id
)
SELECT
  cr.name AS region_name,
  ct.employee_id,
  ct.last_name,
  ct.first_name,
  ea.id AS accomplishment_id,
  ea.created_at AT TIME ZONE 'Asia/Manila' AS created_at_manila,
  LEFT(ea.content, 120) AS content_preview
FROM employee_accomplishments ea
JOIN caraga_team ct ON ct.id = ea.employee_id
CROSS JOIN caraga_region cr
WHERE ea.created_at >= TIMESTAMPTZ '2026-06-14 00:00:00+08'
  AND ea.created_at <  TIMESTAMPTZ '2026-06-15 00:00:00+08'
ORDER BY ct.last_name, ct.first_name, ea.created_at;


-- -----------------------------------------------------------------------------
-- STEP 2 — PREVIEW: team leader + assigned members (insert targets)
-- -----------------------------------------------------------------------------
WITH caraga_region AS (
  SELECT id, name, code
  FROM library_regions
  WHERE is_active = true
    AND (code ILIKE '%Region XIII%' OR name ILIKE '%Caraga%')
  LIMIT 1
),
team_leader AS (
  SELECT id, employee_id, first_name, last_name
  FROM employees
  WHERE employee_id = '16-09388'
),
caraga_team AS (
  SELECT e.id, e.employee_id, e.first_name, e.last_name, e.user_id
  FROM employees e
  JOIN caraga_region r ON r.id = e.region_id
  JOIN team_leader tl ON true
  WHERE e.id = tl.id
     OR e.assigned_team_leader_id = tl.id
)
SELECT
  employee_id,
  last_name,
  first_name,
  user_id
FROM caraga_team
ORDER BY last_name, first_name;


-- -----------------------------------------------------------------------------
-- STEP 3 — DELETE: June 14, 2026 ONLY for Lovelyn's team (NOT June 15)
-- Uncomment and run after reviewing STEP 1
-- -----------------------------------------------------------------------------
/*
DELETE FROM employee_accomplishments ea
USING employees e
JOIN library_regions r ON r.id = e.region_id
JOIN employees tl ON tl.employee_id = '16-09388'
WHERE ea.employee_id = e.id
  AND r.is_active = true
  AND (r.code ILIKE '%Region XIII%' OR r.name ILIKE '%Caraga%')
  AND (e.id = tl.id OR e.assigned_team_leader_id = tl.id)
  AND ea.created_at >= TIMESTAMPTZ '2026-06-14 00:00:00+08'
  AND ea.created_at <  TIMESTAMPTZ '2026-06-15 00:00:00+08';
*/


-- -----------------------------------------------------------------------------
-- STEP 4 — INSERT: 4 accomplishments per person on June 14, 2026 ONLY
-- Uncomment and run after STEP 3
-- -----------------------------------------------------------------------------
/*
WITH caraga_region AS (
  SELECT id
  FROM library_regions
  WHERE is_active = true
    AND (code ILIKE '%Region XIII%' OR name ILIKE '%Caraga%')
  LIMIT 1
),
team_leader AS (
  SELECT id, user_id
  FROM employees
  WHERE employee_id = '16-09388'
),
caraga_team AS (
  SELECT e.id, e.user_id, e.employee_id
  FROM employees e
  JOIN caraga_region r ON r.id = e.region_id
  JOIN team_leader tl ON true
  WHERE e.id = tl.id
     OR e.assigned_team_leader_id = tl.id
),
accomplishment_templates AS (
  SELECT *
  FROM (
    VALUES
      (
        1,
        'Our Mobile Kitchen Team successfully prepared and distributed 1,000 packed hot meals for lunch.',
        TIMESTAMPTZ '2026-06-14 09:00:00+08'
      ),
      (
        2,
        'Our CCCM Team, with support from the DROMIC and FNI Teams, assisted in the establishment of the required facilities at the 2nd Evacuation Center located at Glan Central Integrated SPED Center. The team also facilitated the distribution of Family Food Packs (FFPs) and Ready-to-Eat Food (RTEF) to 58 Internally Displaced Persons (IDPs) and administered the FACED forms.',
        TIMESTAMPTZ '2026-06-14 11:30:00+08'
      ),
      (
        3,
        'Our IT Team successfully enhanced the system requested by FO XII for the monitoring of augmented staff and provided technical assistance in the consolidation of FO XII''s DROMIC live file.',
        TIMESTAMPTZ '2026-06-14 14:00:00+08'
      ),
      (
        4,
        'We also encoded additional FACED forms that were endorsed to our team today.',
        TIMESTAMPTZ '2026-06-14 16:30:00+08'
      )
  ) AS t(sort_order, content, created_at)
)
INSERT INTO employee_accomplishments (
  employee_id,
  user_id,
  content,
  latitude,
  longitude,
  created_at,
  shared_by_team_leader_id
)
SELECT
  ct.id,
  ct.user_id,
  at.content,
  NULL,
  NULL,
  at.created_at,
  CASE
    WHEN ct.employee_id = '16-09388' THEN NULL
    ELSE tl.id
  END
FROM caraga_team ct
CROSS JOIN accomplishment_templates at
CROSS JOIN team_leader tl
ORDER BY ct.employee_id, at.sort_order;
*/


-- -----------------------------------------------------------------------------
-- STEP 5 — VERIFY: June 14 only (4 per person). June 15 should be unchanged.
-- -----------------------------------------------------------------------------
/*
WITH caraga_region AS (
  SELECT id, name, code
  FROM library_regions
  WHERE is_active = true
    AND (code ILIKE '%Region XIII%' OR name ILIKE '%Caraga%')
  LIMIT 1
),
team_leader AS (
  SELECT id
  FROM employees
  WHERE employee_id = '16-09388'
),
caraga_team AS (
  SELECT e.id, e.employee_id, e.last_name, e.first_name
  FROM employees e
  JOIN caraga_region r ON r.id = e.region_id
  JOIN team_leader tl ON true
  WHERE e.id = tl.id
     OR e.assigned_team_leader_id = tl.id
)
SELECT
  ct.employee_id,
  ct.last_name,
  ct.first_name,
  COUNT(*) FILTER (
    WHERE ea.created_at >= TIMESTAMPTZ '2026-06-14 00:00:00+08'
      AND ea.created_at <  TIMESTAMPTZ '2026-06-15 00:00:00+08'
  ) AS june_14_count,
  COUNT(*) FILTER (
    WHERE ea.created_at >= TIMESTAMPTZ '2026-06-15 00:00:00+08'
      AND ea.created_at <  TIMESTAMPTZ '2026-06-16 00:00:00+08'
  ) AS june_15_count
FROM caraga_team ct
LEFT JOIN employee_accomplishments ea ON ea.employee_id = ct.id
GROUP BY ct.employee_id, ct.last_name, ct.first_name
ORDER BY ct.last_name, ct.first_name;
*/
