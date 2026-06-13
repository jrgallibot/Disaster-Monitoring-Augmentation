-- Employee time-in / time-out attendance monitoring

CREATE TABLE IF NOT EXISTS employee_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('time_in', 'time_out')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_attendance_employee_id_idx ON employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS employee_attendance_created_at_idx ON employee_attendance(created_at DESC);

ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employee read own attendance" ON employee_attendance;
CREATE POLICY "Employee read own attendance"
  ON employee_attendance FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Employee insert own attendance" ON employee_attendance;
CREATE POLICY "Employee insert own attendance"
  ON employee_attendance FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Public read attendance" ON employee_attendance;
CREATE POLICY "Public read attendance"
  ON employee_attendance FOR SELECT
  USING (TRUE);
