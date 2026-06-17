-- Allow employees to update and delete their own accomplishments (not team-leader shared copies)

DROP POLICY IF EXISTS "Employee update own accomplishments" ON employee_accomplishments;
CREATE POLICY "Employee update own accomplishments"
  ON employee_accomplishments FOR UPDATE
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND shared_by_team_leader_id IS NULL
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND shared_by_team_leader_id IS NULL
  );

DROP POLICY IF EXISTS "Employee delete own accomplishments" ON employee_accomplishments;
CREATE POLICY "Employee delete own accomplishments"
  ON employee_accomplishments FOR DELETE
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND shared_by_team_leader_id IS NULL
  );
