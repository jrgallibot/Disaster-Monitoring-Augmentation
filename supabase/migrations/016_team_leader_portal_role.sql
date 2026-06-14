-- Add team_leader as a portal access role on profiles

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'viewer', 'employee', 'team_leader'));
