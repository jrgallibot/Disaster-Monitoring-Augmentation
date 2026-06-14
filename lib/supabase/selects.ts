const TEAM_LEADER_SUMMARY = `
  id,
  employee_id,
  first_name,
  last_name,
  middle_name,
  user_id
`;

export const REGION_SELECT = `
  *,
  team_leaders:library_region_team_leaders(
    id,
    employee_id,
    leader:employees!employee_id(${TEAM_LEADER_SUMMARY.trim()})
  )
`;

/** Pre-migration 015: single team_leader_employee_id on library_regions */
export const REGION_SELECT_LEGACY = `
  *,
  team_leader_legacy:employees!library_regions_team_leader_fkey(${TEAM_LEADER_SUMMARY.trim()})
`;

export const EMPLOYEE_SELECT = `
  *,
  specialization:library_specializations(*),
  region:library_regions!region_id(${REGION_SELECT.trim()}),
  assigned_team_leader:employees!assigned_team_leader_id(${TEAM_LEADER_SUMMARY.trim()}),
  status:library_statuses(*)
`;

export const EMPLOYEE_SELECT_FALLBACK = `
  *,
  specialization:library_specializations(*),
  region:library_regions!region_id(${REGION_SELECT_LEGACY.trim()}),
  status:library_statuses(*)
`;
