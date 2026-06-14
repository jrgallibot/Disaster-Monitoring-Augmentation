export interface TeamLeaderContext {
  isTeamLeader: boolean;
  ledRegions: LibraryRegion[];
  myEmployee: EmployeeWithRelations | null;
}

export interface LibrarySpecialization {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TeamLeaderSummary {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  user_id: string | null;
}

export interface RegionTeamLeaderLink {
  id: string;
  employee_id: string;
  leader?: TeamLeaderSummary | null;
}

export interface LibraryRegion {
  id: string;
  name: string;
  code: string;
  team_leaders?: RegionTeamLeaderLink[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface LibraryStatus {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  specialization_id: string | null;
  region_id: string | null;
  assigned_team_leader_id: string | null;
  status_id: string | null;
  deployment_location: string | null;
  actual_task: string | null;
  notes: string | null;
  photo_url: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  deployment_set_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithRelations extends Employee {
  specialization: LibrarySpecialization | null;
  region: LibraryRegion | null;
  assigned_team_leader?: TeamLeaderSummary | null;
  status: LibraryStatus | null;
  /** True when today's deployment has not been set (resets at midnight PH time). */
  deploymentPending?: boolean;
}

export interface DashboardStats {
  total: number;
  deployed: number;
  onStandby: number;
  onLeave: number;
  byStatus: { name: string; count: number; color: string }[];
  byRegion: { name: string; code: string; count: number }[];
}

export interface AdminDashboardExtended {
  clockedIn: number;
  withPhoto: number;
  withGps: number;
  registeredAccounts: number;
  todayTimeIn: number;
  todayTimeOut: number;
  deploymentRate: number;
}

export interface AdminDashboardData {
  stats: DashboardStats;
  extended: AdminDashboardExtended;
  bySpecialization: { name: string; count: number }[];
  employees: EmployeeWithRelations[];
  clockedInEmployees: {
    id: string;
    employee_id: string;
    name: string;
    lastTimeIn: string;
    deployment_location: string | null;
  }[];
  regionTeams: RegionTeamOverview[];
  statuses: LibraryStatus[];
  generatedAt: string;
}

export interface RegionTeamOverview {
  region: LibraryRegion;
  members: EmployeeWithRelations[];
}

export interface TeamDailyReportMember {
  employee: EmployeeWithRelations;
  todayAccomplishments: EmployeeAccomplishment[];
  todayDutySummary: string;
  todayTimeIn: string | null;
  todayTimeOut: string | null;
  isClockedIn: boolean;
}

export interface TeamDailyReportSummary {
  totalMembers: number;
  deployed: number;
  onStandby: number;
  onLeave: number;
  clockedInNow: number;
  withActivityToday: number;
}

export interface TeamDailyReportData {
  generatedAt: string;
  reportDate: string;
  teamLeader: EmployeeWithRelations;
  ledRegions: LibraryRegion[];
  members: TeamDailyReportMember[];
  summary: TeamDailyReportSummary;
}

export interface AdminTeamLeaderReport {
  region: LibraryRegion;
  teamLeader: EmployeeWithRelations;
  leaderActivity: TeamDailyReportMember;
  members: TeamDailyReportMember[];
  summary: TeamDailyReportSummary;
}

export interface AdminOperationsReportSummary extends TeamDailyReportSummary {
  totalTeams: number;
  totalTeamLeaders: number;
}

export interface AdminOperationsReportData {
  generatedAt: string;
  reportDate: string;
  teams: AdminTeamLeaderReport[];
  summary: AdminOperationsReportSummary;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "viewer" | "employee" | "team_leader";
  created_at: string;
}

export type EmployeeFormData = {
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  specialization_id?: string;
  region_id?: string;
  status_id?: string;
  deployment_location?: string;
  notes?: string;
  photo_url?: string;
  portal_role?: "employee" | "admin" | "team_leader";
};

export type ActionResult =
  | { success: true; sharedCount?: number }
  | { success: false; error: string };

export type SpecializationResolveResult =
  | { success: true; id: string; name: string; created: boolean }
  | { success: false; error: string };

export type EmployeeSelfUpdate = {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  phone?: string;
  address?: string;
  specialization_id?: string;
  region_id?: string;
  assigned_team_leader_id?: string;
  notes?: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
};

export interface EmployeeDeploymentLog {
  id: string;
  employee_id: string;
  user_id: string | null;
  status_id: string | null;
  status_name: string;
  deployment_location: string | null;
  actual_task: string | null;
  created_at: string;
}

export interface EmployeeUpdateLog {
  id: string;
  employee_id: string;
  user_id: string | null;
  summary: string;
  changes: Record<string, { from: string | null; to: string | null }>;
  deployment_location: string | null;
  status_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export type AttendanceAction = "time_in" | "time_out";

export interface EmployeeAttendance {
  id: string;
  employee_id: string;
  user_id: string | null;
  action: AttendanceAction;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface AttendanceStatus {
  isClockedIn: boolean;
  lastRecord: EmployeeAttendance | null;
}

export interface EmployeeAccomplishment {
  id: string;
  employee_id: string;
  user_id: string | null;
  content: string;
  latitude: number | null;
  longitude: number | null;
  source_accomplishment_id?: string | null;
  shared_by_team_leader_id?: string | null;
  created_at: string;
}

export type EmployeeHistoryBundle = {
  employee: EmployeeWithRelations;
  profileLogs: EmployeeUpdateLog[];
  deploymentLogs: EmployeeDeploymentLog[];
  accomplishments: EmployeeAccomplishment[];
  attendance: EmployeeAttendance[];
  errors: {
    profile?: string;
    deployment?: string;
    accomplishments?: string;
    attendance?: string;
  };
};

export type LibraryType = "specializations" | "regions" | "statuses";
