-- Track when deployment was last set (resets visually each calendar day at midnight PH time)

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS deployment_set_at TIMESTAMPTZ;

UPDATE employees e
SET deployment_set_at = COALESCE(
  (
    SELECT MAX(created_at)
    FROM employee_deployment_logs
    WHERE employee_id = e.id
  ),
  CASE WHEN e.status_id IS NOT NULL THEN e.updated_at ELSE NULL END
)
WHERE e.deployment_set_at IS NULL;

CREATE INDEX IF NOT EXISTS employees_deployment_set_at_idx
  ON employees (deployment_set_at DESC);
