export interface LibrarySpecialization {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface LibraryRegion {
  id: string;
  name: string;
  code: string;
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

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "viewer";
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

export type LibraryType = "specializations" | "regions" | "statuses";
