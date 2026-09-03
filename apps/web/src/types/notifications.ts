export type NotificationType =
  | 'TICKET_ASSIGNED'
  | 'TICKET_REASSIGNED'
  | 'TICKET_UNASSIGNED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_SELF_ASSIGNED'
  | 'TICKET_REOPENED'
  | 'TICKET_RESOLVED'
  | 'TICKET_CLOSED'
  | 'TICKET_CANCELLED'
  | 'TICKET_COMMENTED'
  | 'TICKET_SLA_BREACHED';

export interface NotificationData {
  ticket_id?: number;
  ticket_number?: string;
  title?: string;
  actor_name?: string;
  message: string;
  url?: string;
  [key: string]: unknown;
}

export interface NotificationItem {
  id: number;
  type: NotificationType;
  data: NotificationData;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}
