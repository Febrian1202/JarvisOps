export type RoleName = 'administrator' | 'manager' | 'technician' | 'employee';

export type UserStatus = 'active' | 'inactive';

export interface RoleReference {
  id: number;
  name: RoleName | string;
}

export interface DepartmentReference {
  id: number;
  name: string;
}

export interface EmployeeProfile {
  employee_code?: string | null;
  position?: string | null;
  phone?: string | null;
  hire_date?: string | null;
}

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  status: UserStatus | string;
  must_change_password?: boolean;
  role: RoleReference;
  department?: DepartmentReference | null;
  profile?: EmployeeProfile | null;
  permissions?: string[];
}

export type User = AuthUser;

export interface UserListItem {
  id: number;
  full_name: string;
  email: string;
  status: UserStatus | string;
  role: RoleReference;
  department: DepartmentReference | null;
  employee_code: string | null;
  created_at: string;
}

export interface UserAdminDetail {
  id: number;
  full_name: string;
  email: string;
  status: UserStatus | string;
  must_change_password: boolean;
  role: RoleReference;
  department: DepartmentReference | null;
  profile: EmployeeProfile | null;
  created_at: string;
  updated_at: string;
}

export interface TechnicianOption {
  id: number;
  full_name: string;
}
