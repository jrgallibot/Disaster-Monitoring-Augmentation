-- Remarks/reason when deployment status is On Standby, On Leave, or Unavailable

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS deployment_remarks TEXT;

ALTER TABLE employee_deployment_logs
  ADD COLUMN IF NOT EXISTS deployment_remarks TEXT;
