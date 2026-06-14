-- Admin and co-admin (viewer) portal accounts
-- Run scripts/create-portal-admin-users.mjs to create auth users, OR create users
-- in Supabase Dashboard → Authentication → Users, then run the profile upserts below.

-- After auth users exist:
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
