-- Team leader accomplishments shared to assigned team members

ALTER TABLE employee_accomplishments
  ADD COLUMN IF NOT EXISTS source_accomplishment_id UUID
    REFERENCES employee_accomplishments(id) ON DELETE SET NULL;

ALTER TABLE employee_accomplishments
  ADD COLUMN IF NOT EXISTS shared_by_team_leader_id UUID
    REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employee_accomplishments_source_id_idx
  ON employee_accomplishments(source_accomplishment_id);

CREATE INDEX IF NOT EXISTS employee_accomplishments_shared_by_idx
  ON employee_accomplishments(shared_by_team_leader_id);
