import type { DepartmentReference } from './auth';

export type TicketStatusName = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type SlaStatus = 'on_track' | 'breached';

export type TicketAction =
  | 'assign'
  | 'unassign'
  | 'start'
  | 'resolve'
  | 'close'
  | 'cancel'
  | 'reopen'
  | 'change_priority'
  | 'comment'
  | 'attach'
  | 'edit';

export interface TicketCategoryReference {
  id: number;
  name: string;
}

export interface TicketCategory {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  parent?: TicketCategory | null;
  created_at?: string;
  updated_at?: string;
}

export interface TicketPriorityReference {
  id: number;
  name: string;
  sla_minutes: number;
}

export interface TicketPriority {
  id: number;
  name: string;
  level?: number;
  sla_minutes: number;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TicketStatusReference {
  id: number;
  name: TicketStatusName;
}

export interface TicketListItem {
  id: number;
  ticket_number: string;
  title: string;
  status: TicketStatusReference;
  priority: TicketPriorityReference;
  category: TicketCategoryReference;
  reporter: { id: number; full_name: string };
  technician: { id: number; full_name: string } | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  sla_status: SlaStatus;
  created_at: string;
}

export interface TicketDetail {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  status: TicketStatusReference;
  priority: TicketPriorityReference;
  category: TicketCategoryReference;
  reporter: {
    id: number;
    full_name: string;
    department?: string | null;
  };
  technician: { id: number; full_name: string } | null;
  department: DepartmentReference | null;
  asset: {
    id: number;
    asset_tag: string;
    name: string;
    deleted?: boolean;
  } | null;
  sla_duration_minutes: number;
  sla_deadline: string | null;
  sla_breached: boolean;
  sla_status: SlaStatus;
  sla_remaining_minutes: number | null;
  resolved_at: string | null;
  closed_at: string | null;
  comments_count: number;
  attachments_count: number;
  available_actions: TicketAction[];
  editable_fields: ('title' | 'description' | 'category_id')[];
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  user: {
    id: number;
    full_name?: string | null;
  };
  body: string;
  created_at: string;
  updated_at: string;
}

export interface TicketHistoryItem {
  id: number;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  user: {
    id: number;
    full_name?: string | null;
  } | null;
  created_at: string;
}

export interface TicketAttachment {
  id: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_by: {
    id: number;
    full_name: string;
  } | null;
  download_url: string;
  created_at: string;
}
