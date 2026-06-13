export const REGION_SELECT = `
  *,
  team_leader:employees!team_leader_employee_id(
    id,
    employee_id,
    first_name,
    last_name,
    middle_name,
    user_id
  )
`;

export const EMPLOYEE_SELECT = `
  *,
  specialization:library_specializations(*),
  region:library_regions!region_id(${REGION_SELECT.trim()}),
  status:library_statuses(*)
`;
