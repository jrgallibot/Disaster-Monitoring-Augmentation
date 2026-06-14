-- Encrypted portal passwords (viewable by full admin after re-authentication)

CREATE TABLE IF NOT EXISTS employee_portal_passwords (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  encrypted_password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS employee_portal_passwords_updated_at_idx
  ON employee_portal_passwords (updated_at DESC);

ALTER TABLE employee_portal_passwords ENABLE ROW LEVEL SECURITY;

-- No public policies: accessed only via service role in server actions.
