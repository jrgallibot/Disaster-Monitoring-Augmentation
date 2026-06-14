-- Multiple team leaders per region + employee picks their assigned team leader

CREATE TABLE IF NOT EXISTS library_region_team_leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id UUID NOT NULL REFERENCES library_regions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(region_id, employee_id)
);

INSERT INTO library_region_team_leaders (region_id, employee_id)
SELECT id, team_leader_employee_id
FROM library_regions
WHERE team_leader_employee_id IS NOT NULL
ON CONFLICT (region_id, employee_id) DO NOTHING;

ALTER TABLE library_regions DROP CONSTRAINT IF EXISTS library_regions_team_leader_fkey;
ALTER TABLE library_regions DROP COLUMN IF EXISTS team_leader_employee_id;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS assigned_team_leader_id UUID;

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_assigned_team_leader_fkey;

ALTER TABLE employees
  ADD CONSTRAINT employees_assigned_team_leader_fkey
  FOREIGN KEY (assigned_team_leader_id)
  REFERENCES employees(id)
  ON DELETE SET NULL;

UPDATE employees e
SET assigned_team_leader_id = sub.employee_id
FROM (
  SELECT rtl.region_id, rtl.employee_id
  FROM library_region_team_leaders rtl
  INNER JOIN (
    SELECT region_id
    FROM library_region_team_leaders
    GROUP BY region_id
    HAVING COUNT(*) = 1
  ) single ON single.region_id = rtl.region_id
) sub
WHERE e.region_id = sub.region_id
  AND e.assigned_team_leader_id IS NULL
  AND e.id != sub.employee_id;

CREATE INDEX IF NOT EXISTS idx_region_team_leaders_region ON library_region_team_leaders(region_id);
CREATE INDEX IF NOT EXISTS idx_region_team_leaders_employee ON library_region_team_leaders(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_assigned_team_leader ON employees(assigned_team_leader_id);

ALTER TABLE library_region_team_leaders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read region team leaders" ON library_region_team_leaders;
CREATE POLICY "Public read region team leaders"
  ON library_region_team_leaders FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin manage region team leaders" ON library_region_team_leaders;
CREATE POLICY "Admin manage region team leaders"
  ON library_region_team_leaders FOR ALL
  USING (is_admin());
