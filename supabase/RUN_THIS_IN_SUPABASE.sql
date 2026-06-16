-- ============================================================
-- DSWD Augmented Employee Monitoring System
-- PASTE THIS ENTIRE FILE into Supabase SQL Editor, then click RUN
-- DO NOT paste the file path — paste the SQL code only!
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Library: Specializations
CREATE TABLE IF NOT EXISTS library_specializations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Library: Regions
CREATE TABLE IF NOT EXISTS library_regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Library: Statuses
CREATE TABLE IF NOT EXISTS library_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  specialization_id UUID REFERENCES library_specializations(id) ON DELETE SET NULL,
  region_id UUID REFERENCES library_regions(id) ON DELETE SET NULL,
  status_id UUID REFERENCES library_statuses(id) ON DELETE SET NULL,
  deployment_location TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employees_updated_at ON employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Library policies
DROP POLICY IF EXISTS "Public read active specializations" ON library_specializations;
CREATE POLICY "Public read active specializations"
  ON library_specializations FOR SELECT
  USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admin manage specializations" ON library_specializations;
CREATE POLICY "Admin manage specializations"
  ON library_specializations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Public read active regions" ON library_regions;
CREATE POLICY "Public read active regions"
  ON library_regions FOR SELECT
  USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admin manage regions" ON library_regions;
CREATE POLICY "Admin manage regions"
  ON library_regions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Public read active statuses" ON library_statuses;
CREATE POLICY "Public read active statuses"
  ON library_statuses FOR SELECT
  USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admin manage statuses" ON library_statuses;
CREATE POLICY "Admin manage statuses"
  ON library_statuses FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Employee policies
DROP POLICY IF EXISTS "Public read employees" ON employees;
CREATE POLICY "Public read employees"
  ON employees FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin manage employees" ON employees;
CREATE POLICY "Admin manage employees"
  ON employees FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Seed: Philippine Regions
INSERT INTO library_regions (name, code, sort_order) VALUES
  ('National Capital Region', 'NCR', 1),
  ('Cordillera Administrative Region', 'CAR', 2),
  ('Region I - Ilocos', 'Region I', 3),
  ('Region II - Cagayan Valley', 'Region II', 4),
  ('Region III - Central Luzon', 'Region III', 5),
  ('Region IV-A - CALABARZON', 'Region IV-A', 6),
  ('Region IV-B - MIMAROPA', 'Region IV-B', 7),
  ('Region V - Bicol', 'Region V', 8),
  ('Region VI - Western Visayas', 'Region VI', 9),
  ('Region VII - Central Visayas', 'Region VII', 10),
  ('Region VIII - Eastern Visayas', 'Region VIII', 11),
  ('Region IX - Zamboanga Peninsula', 'Region IX', 12),
  ('Region X - Northern Mindanao', 'Region X', 13),
  ('Region XI - Davao', 'Region XI', 14),
  ('Region XII - SOCCSKSARGEN', 'Region XII', 15),
  ('Region XIII - Caraga', 'Region XIII', 16),
  ('Bangsamoro Autonomous Region', 'BARMM', 17)
ON CONFLICT (code) DO NOTHING;

-- Seed: Statuses
INSERT INTO library_statuses (name, color, sort_order) VALUES
  ('Deployed', '#16A34A', 1),
  ('On Standby', '#D97706', 2),
  ('On Leave', '#6B7280', 3),
  ('Unavailable', '#DC2626', 4)
ON CONFLICT (name) DO NOTHING;

-- Seed: Specializations
INSERT INTO library_specializations (name, description, sort_order) VALUES
  ('Social Worker', 'Provides social welfare services and case management', 1),
  ('Disaster Response Officer', 'Leads and coordinates disaster response operations', 2),
  ('Logistics Coordinator', 'Manages supply chain and resource distribution', 3),
  ('Medical Personnel', 'Provides medical aid and health services', 4),
  ('Psychosocial Support', 'Offers mental health and psychosocial assistance', 5),
  ('Information Officer', 'Handles communications and public information', 6),
  ('Field Coordinator', 'Coordinates field operations and team deployment', 7),
  ('Data Encoder', 'Manages data entry and reporting', 8)
ON CONFLICT (name) DO NOTHING;

-- Seed: Sample employees
INSERT INTO employees (employee_id, first_name, last_name, middle_name, email, phone, specialization_id, region_id, status_id, deployment_location, notes)
SELECT 'DSWD-2024-001', 'Maria', 'Santos', 'Cruz', 'maria.santos@dswd.gov.ph', '09171234567',
  (SELECT id FROM library_specializations WHERE name = 'Social Worker' LIMIT 1),
  (SELECT id FROM library_regions WHERE code = 'NCR' LIMIT 1),
  (SELECT id FROM library_statuses WHERE name = 'Deployed' LIMIT 1),
  'Quezon City Evacuation Center', 'Team lead for NCR earthquake response'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'DSWD-2024-001');

INSERT INTO employees (employee_id, first_name, last_name, middle_name, email, phone, specialization_id, region_id, status_id, deployment_location, notes)
SELECT 'DSWD-2024-002', 'Juan', 'Reyes', 'Dela', 'juan.reyes@dswd.gov.ph', '09181234567',
  (SELECT id FROM library_specializations WHERE name = 'Disaster Response Officer' LIMIT 1),
  (SELECT id FROM library_regions WHERE code = 'Region III' LIMIT 1),
  (SELECT id FROM library_statuses WHERE name = 'On Standby' LIMIT 1),
  'Pampanga Field Office', 'Ready for deployment within 24 hours'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'DSWD-2024-002');

INSERT INTO employees (employee_id, first_name, last_name, middle_name, email, phone, specialization_id, region_id, status_id, deployment_location, notes)
SELECT 'DSWD-2024-003', 'Ana', 'Garcia', 'Lopez', 'ana.garcia@dswd.gov.ph', '09191234567',
  (SELECT id FROM library_specializations WHERE name = 'Medical Personnel' LIMIT 1),
  (SELECT id FROM library_regions WHERE code = 'Region VII' LIMIT 1),
  (SELECT id FROM library_statuses WHERE name = 'Deployed' LIMIT 1),
  'Cebu City Disaster Hub', 'Medical team stationed at central hub'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'DSWD-2024-003');

INSERT INTO employees (employee_id, first_name, last_name, middle_name, email, phone, specialization_id, region_id, status_id, deployment_location, notes)
SELECT 'DSWD-2024-004', 'Pedro', 'Mendoza', NULL, 'pedro.mendoza@dswd.gov.ph', '09201234567',
  (SELECT id FROM library_specializations WHERE name = 'Logistics Coordinator' LIMIT 1),
  (SELECT id FROM library_regions WHERE code = 'Region XI' LIMIT 1),
  (SELECT id FROM library_statuses WHERE name = 'On Standby' LIMIT 1),
  'Davao Regional Office', 'Managing relief goods inventory'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'DSWD-2024-004');

INSERT INTO employees (employee_id, first_name, last_name, middle_name, email, phone, specialization_id, region_id, status_id, deployment_location, notes)
SELECT 'DSWD-2024-005', 'Rosa', 'Fernandez', 'Bautista', 'rosa.fernandez@dswd.gov.ph', '09211234567',
  (SELECT id FROM library_specializations WHERE name = 'Psychosocial Support' LIMIT 1),
  (SELECT id FROM library_regions WHERE code = 'Region VIII' LIMIT 1),
  (SELECT id FROM library_statuses WHERE name = 'Deployed' LIMIT 1),
  'Tacloban Response Center', 'Providing trauma counseling services'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'DSWD-2024-005');

-- ============================================================
-- Migration 006: Employee logs, geo, and profile photo storage
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_latitude DOUBLE PRECISION;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_longitude DOUBLE PRECISION;

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

-- ============================================================
-- Migration 012: Employee accomplishments
-- ============================================================

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

-- ============================================================
-- Migration 014: Region team leader employee FK
-- ============================================================

ALTER TABLE library_regions
  ADD COLUMN IF NOT EXISTS team_leader_employee_id UUID;

ALTER TABLE library_regions
  DROP CONSTRAINT IF EXISTS library_regions_team_leader_fkey;

ALTER TABLE library_regions
  ADD CONSTRAINT library_regions_team_leader_fkey
  FOREIGN KEY (team_leader_employee_id)
  REFERENCES employees(id)
  ON DELETE SET NULL;

ALTER TABLE library_regions DROP COLUMN IF EXISTS team_leader_name;
ALTER TABLE employees DROP COLUMN IF EXISTS team_leader_name;

-- ============================================================
-- Migration 015: Multiple team leaders per region
-- ============================================================

CREATE TABLE IF NOT EXISTS library_region_team_leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id UUID NOT NULL REFERENCES library_regions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(region_id, employee_id)
);

INSERT INTO library_region_team_leaders (region_id, employee_id)
SELECT id, team_leader_employee_id
FROM library_regions
WHERE team_leader_employee_id IS NOT NULL
ON CONFLICT (region_id, employee_id) DO NOTHING;

ALTER TABLE library_regions DROP CONSTRAINT IF EXISTS library_regions_team_leader_fkey;
ALTER TABLE library_regions DROP COLUMN IF EXISTS team_leader_employee_id;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS assigned_team_leader_id UUID;

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_assigned_team_leader_fkey;

ALTER TABLE employees
  ADD CONSTRAINT employees_assigned_team_leader_fkey
  FOREIGN KEY (assigned_team_leader_id)
  REFERENCES employees(id)
  ON DELETE SET NULL;

UPDATE employees e
SET assigned_team_leader_id = sub.employee_id
FROM (
  SELECT rtl.region_id, rtl.employee_id
  FROM library_region_team_leaders rtl
  INNER JOIN (
    SELECT region_id
    FROM library_region_team_leaders
    GROUP BY region_id
    HAVING COUNT(*) = 1
  ) single ON single.region_id = rtl.region_id
) sub
WHERE e.region_id = sub.region_id
  AND e.assigned_team_leader_id IS NULL
  AND e.id != sub.employee_id;

CREATE INDEX IF NOT EXISTS idx_region_team_leaders_region ON library_region_team_leaders(region_id);
CREATE INDEX IF NOT EXISTS idx_region_team_leaders_employee ON library_region_team_leaders(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_assigned_team_leader ON employees(assigned_team_leader_id);

ALTER TABLE library_region_team_leaders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read region team leaders" ON library_region_team_leaders;
CREATE POLICY "Public read region team leaders"
  ON library_region_team_leaders FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin manage region team leaders" ON library_region_team_leaders;
CREATE POLICY "Admin manage region team leaders"
  ON library_region_team_leaders FOR ALL
  USING (is_admin());

-- ============================================================
-- Migration 016: Team leader portal role on profiles
-- ============================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'viewer', 'employee', 'team_leader'));

-- ============================================================
-- Migration 017: Actual task for deployed employees
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS actual_task TEXT;

ALTER TABLE employee_deployment_logs
  ADD COLUMN IF NOT EXISTS actual_task TEXT;

-- ============================================================
-- Migration 018: Team leader accomplishment sharing
-- ============================================================

ALTER TABLE employee_accomplishments
  ADD COLUMN IF NOT EXISTS source_accomplishment_id UUID
    REFERENCES employee_accomplishments(id) ON DELETE SET NULL;

ALTER TABLE employee_accomplishments
  ADD COLUMN IF NOT EXISTS shared_by_team_leader_id UUID
    REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employee_accomplishments_source_id_idx
  ON employee_accomplishments(source_accomplishment_id);

CREATE INDEX IF NOT EXISTS employee_accomplishments_shared_by_idx
  ON employee_accomplishments(shared_by_team_leader_id);

-- ============================================================
-- Migration 019: Admin + co-admin (viewer) account profiles
-- Create users via: node scripts/create-portal-admin-users.mjs
-- ============================================================

INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE lower(email) = lower('admin@dswd.gov.ph')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'admin';

INSERT INTO profiles (id, email, role)
SELECT id, email, 'viewer'
FROM auth.users
WHERE lower(email) = lower('coadmin@dswd.gov.ph')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'viewer';

-- ============================================================
-- Migration 020: Daily deployment reset tracking
-- ============================================================

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

-- ============================================================
-- Migration 021: Encrypted employee portal password vault
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_portal_passwords (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  encrypted_password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS employee_portal_passwords_updated_at_idx
  ON employee_portal_passwords (updated_at DESC);

ALTER TABLE employee_portal_passwords ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Migration 022: Employee augmentation mobilization lifecycle
-- ============================================================

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

-- ============================================================
-- Migration 023: Deployment remarks for non-deployed statuses
-- ============================================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS deployment_remarks TEXT;

ALTER TABLE employee_deployment_logs
  ADD COLUMN IF NOT EXISTS deployment_remarks TEXT;
