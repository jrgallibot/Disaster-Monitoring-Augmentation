-- Team leader name for augmented employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS team_leader_name TEXT;
