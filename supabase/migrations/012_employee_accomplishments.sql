-- Employee accomplishment updates (time-stamped activity reports)

CREATE TABLE IF NOT EXISTS employee_accomplishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_accomplishments_employee_id_idx
  ON employee_accomplishments(employee_id);
CREATE INDEX IF NOT EXISTS employee_accomplishments_created_at_idx
  ON employee_accomplishments(created_at DESC);

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
