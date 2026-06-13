-- Team leader assigned per region (home region library)

ALTER TABLE library_regions ADD COLUMN IF NOT EXISTS team_leader_name TEXT;
