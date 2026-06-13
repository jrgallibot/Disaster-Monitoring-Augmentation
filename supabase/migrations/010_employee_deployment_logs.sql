-- Deployment status/location change history (admin-managed)

CREATE TABLE IF NOT EXISTS employee_deployment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status_id UUID REFERENCES library_statuses(id) ON DELETE SET NULL,
  status_name TEXT NOT NULL,
  deployment_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_deployment_logs_employee_id_idx
  ON employee_deployment_logs(employee_id);
CREATE INDEX IF NOT EXISTS employee_deployment_logs_created_at_idx
  ON employee_deployment_logs(created_at DESC);

ALTER TABLE employee_deployment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read deployment logs" ON employee_deployment_logs;
CREATE POLICY "Public read deployment logs"
  ON employee_deployment_logs FOR SELECT
  USING (TRUE);
