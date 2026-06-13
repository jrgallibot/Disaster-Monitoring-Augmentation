-- Employee update logs, geolocation, and profile photo storage

-- Last known location on employee record
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_latitude DOUBLE PRECISION;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_longitude DOUBLE PRECISION;

-- Activity / update logs
CREATE TABLE IF NOT EXISTS employee_update_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  deployment_location TEXT,
  status_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_update_logs_employee_id_idx ON employee_update_logs(employee_id);
CREATE INDEX IF NOT EXISTS employee_update_logs_created_at_idx ON employee_update_logs(created_at DESC);

ALTER TABLE employee_update_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employee read own update logs" ON employee_update_logs;
CREATE POLICY "Employee read own update logs"
  ON employee_update_logs FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Public read update logs" ON employee_update_logs;
CREATE POLICY "Public read update logs"
  ON employee_update_logs FOR SELECT
  USING (TRUE);

-- Profile photo storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-photos',
  'employee-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Employee photos public read" ON storage.objects;
CREATE POLICY "Employee photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'employee-photos');

DROP POLICY IF EXISTS "Employees upload own photos" ON storage.objects;
CREATE POLICY "Employees upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Employees update own photos" ON storage.objects;
CREATE POLICY "Employees update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Employees delete own photos" ON storage.objects;
CREATE POLICY "Employees delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'employee-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
