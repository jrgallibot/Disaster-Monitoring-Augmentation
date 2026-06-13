-- Fix RLS policies for employee_accomplishments (if table exists but reads return empty)

ALTER TABLE employee_accomplishments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employee read own accomplishments" ON employee_accomplishments;
CREATE POLICY "Employee read own accomplishments"
  ON employee_accomplishments FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Employee insert own accomplishments" ON employee_accomplishments;
CREATE POLICY "Employee insert own accomplishments"
  ON employee_accomplishments FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Public read accomplishments" ON employee_accomplishments;
CREATE POLICY "Public read accomplishments"
  ON employee_accomplishments FOR SELECT
  USING (TRUE);
