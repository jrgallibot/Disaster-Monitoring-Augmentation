-- Allow authenticated employees to write their own deployment history (fallback when using user session)

DROP POLICY IF EXISTS "Employees insert own deployment logs" ON employee_deployment_logs;
CREATE POLICY "Employees insert own deployment logs"
  ON employee_deployment_logs FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Employees update own deployment logs" ON employee_deployment_logs;
CREATE POLICY "Employees update own deployment logs"
  ON employee_deployment_logs FOR UPDATE
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );
