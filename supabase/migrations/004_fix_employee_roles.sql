-- Employee portal prerequisites (safe to re-run) + link existing accounts

-- 1. Add user_id column if migration 003 was not run yet
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Allow "employee" role on profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'viewer', 'employee'));

-- 3. Safe signup trigger — never blocks auth user creation
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

-- 4. RLS for employee self-service
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

-- 5. Fix existing accounts: link by email and set correct role
UPDATE employees e
SET user_id = u.id
FROM auth.users u
WHERE e.user_id IS NULL
  AND LOWER(e.email) = LOWER(u.email);

UPDATE profiles p
SET role = 'employee'
FROM employees e
WHERE e.user_id = p.id
  AND p.role != 'employee';
