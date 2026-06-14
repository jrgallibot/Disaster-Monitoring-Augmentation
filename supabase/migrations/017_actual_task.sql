-- Actual task assignment when employee is deployed

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS actual_task TEXT;

ALTER TABLE employee_deployment_logs
  ADD COLUMN IF NOT EXISTS actual_task TEXT;
