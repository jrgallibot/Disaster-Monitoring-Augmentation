-- Augmentation lifecycle (Mobilized / Demobilized) — separate from daily deployment status

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS mobilization_status TEXT NOT NULL DEFAULT 'mobilized'
    CHECK (mobilization_status IN ('mobilized', 'demobilized'));

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS mobilized_at DATE;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS demobilized_at DATE;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS mobilization_updated_at TIMESTAMPTZ;

UPDATE employees
SET mobilization_status = 'mobilized',
    mobilized_at = COALESCE(created_at::date, CURRENT_DATE)
WHERE mobilized_at IS NULL;

CREATE INDEX IF NOT EXISTS employees_mobilization_status_idx
  ON employees (mobilization_status);

CREATE INDEX IF NOT EXISTS employees_mobilized_at_idx
  ON employees (mobilized_at);

CREATE TABLE IF NOT EXISTS employee_mobilization_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mobilization_status TEXT NOT NULL CHECK (mobilization_status IN ('mobilized', 'demobilized')),
  mobilized_at DATE NOT NULL,
  demobilized_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_mobilization_logs_employee_id_idx
  ON employee_mobilization_logs(employee_id);

CREATE INDEX IF NOT EXISTS employee_mobilization_logs_created_at_idx
  ON employee_mobilization_logs(created_at DESC);

ALTER TABLE employee_mobilization_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read mobilization logs" ON employee_mobilization_logs;
CREATE POLICY "Public read mobilization logs"
  ON employee_mobilization_logs FOR SELECT
  USING (TRUE);
