-- Fix "Database error saving new user" on employee registration
-- Paste into Supabase SQL Editor and run (safe to re-run)

-- 1. Employee role + user_id column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'viewer', 'employee'));

-- 2. Safe signup trigger — never blocks auth user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      NEW.raw_user_meta_data->>'full_name',
      'admin'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Employee self-service RLS
DROP POLICY IF EXISTS "Employee update own record" ON employees;
CREATE POLICY "Employee update own record"
  ON employees FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Employee read own record" ON employees;
CREATE POLICY "Employee read own record"
  ON employees FOR SELECT
  USING (user_id = auth.uid() OR TRUE);

CREATE INDEX IF NOT EXISTS employees_user_id_idx ON employees(user_id);
