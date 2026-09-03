export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'reassign'
  | 'unassign'
  | 'self_assign'
  | 'status_change'
  | 'priority_change'
  | 'reopen'
  | 'resolve'
  | 'close'
  | 'cancel'
  | 'login'
  | 'logout'
  | 'password_reset'
  | 'sla_breach'
  | 'release'
  | 'publish'
  | 'unpublish'
  | 'activate'
  | 'deactivate';

export type AuditModule =
  | 'ticket'
  | 'asset'
  | 'article'
  | 'user'
  | 'role'
  | 'department'
  | 'ticket_category'
  | 'ticket_priority'
  | 'auth'
  | 'knowledge_category';

export interface AuditLogListItem {
  id: number;
  user: { id: number; full_name: string } | null;
  action: AuditAction | string;
  module: AuditModule | string;
  module_id: number | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogDetail extends AuditLogListItem {
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_agent: string | null;
}
