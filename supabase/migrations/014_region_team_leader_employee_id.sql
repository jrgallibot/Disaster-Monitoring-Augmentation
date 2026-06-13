-- Link region team leader to an employee record (for portal accounts / monitoring)

ALTER TABLE library_regions
  ADD COLUMN IF NOT EXISTS team_leader_employee_id UUID;

ALTER TABLE library_regions
  DROP CONSTRAINT IF EXISTS library_regions_team_leader_fkey;

ALTER TABLE library_regions
  ADD CONSTRAINT library_regions_team_leader_fkey
  FOREIGN KEY (team_leader_employee_id)
  REFERENCES employees(id)
  ON DELETE SET NULL;

ALTER TABLE library_regions DROP COLUMN IF EXISTS team_leader_name;

ALTER TABLE employees DROP COLUMN IF EXISTS team_leader_name;
