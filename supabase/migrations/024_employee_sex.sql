-- Employee sex for dashboard disaggregation

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female'));
