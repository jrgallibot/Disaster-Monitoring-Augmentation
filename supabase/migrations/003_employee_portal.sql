-- Employee self-service portal: link auth users to employee records

-- Add user_id to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update profiles role constraint to include employee
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'viewer', 'employee'));

-- Updated trigger: link employee on signup with metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  emp_id TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  emp_id := NEW.raw_user_meta_data->>'employee_id';

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role;

  IF user_role = 'employee' AND emp_id IS NOT NULL THEN
    UPDATE employees
    SET user_id = NEW.id
    WHERE employee_id = emp_id
      AND LOWER(email) = LOWER(NEW.email)
      AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: employees can update their own record
DROP POLICY IF EXISTS "Employee update own record" ON employees;
CREATE POLICY "Employee update own record"
  ON employees FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: employees can read their own record (redundant with public read but explicit)
DROP POLICY IF EXISTS "Employee read own record" ON employees;
CREATE POLICY "Employee read own record"
  ON employees FOR SELECT
  USING (user_id = auth.uid() OR TRUE);

-- Index for faster employee lookups
CREATE INDEX IF NOT EXISTS employees_user_id_idx ON employees(user_id);
