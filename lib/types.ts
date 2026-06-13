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

export interface LibraryRegion {
  id: string;
  name: string;
  code: string;
  team_leader_employee_id: string | null;
  team_leader?: TeamLeaderSummary | null;
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
  status_id: string | null;
  deployment_location: string | null;
  notes: string | null;
  photo_url: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithRelations extends Employee {
  specialization: LibrarySpecialization | null;
  region: LibraryRegion | null;
  status: LibraryStatus | null;
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
  generatedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "viewer" | "employee";
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
};

export type ActionResult =
  | { success: true }
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
