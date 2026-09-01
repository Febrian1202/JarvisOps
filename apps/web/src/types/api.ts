export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  status: string;
  role: Role;
  department?: { id: number; name: string } | null;
  profile?: {
    employee_code?: string | null;
    position?: string | null;
    phone?: string | null;
  } | null;
  permissions?: string[];
}
