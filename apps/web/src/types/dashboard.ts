import type { TicketListItem, TicketHistoryItem } from './tickets';
import type { AssignableAsset, AssetStatus } from './assets';
import type { KnowledgeArticleListItem } from './articles';

export interface EmployeeDashboardData {
  my_open_tickets: number;
  my_in_progress_tickets: number;
  my_resolved_tickets: number;
  recent_tickets: TicketListItem[];
  my_assets: AssignableAsset[];
  recent_articles: KnowledgeArticleListItem[];
}

export interface TechnicianDashboardData {
  assigned_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  sla_breached: number;
  avg_resolution_minutes: number | null;
  recent_activity: TicketHistoryItem[];
}

export interface SlaOverview {
  within_sla: number;
  breached: number;
  compliance_percentage: number | null;
  avg_resolution_minutes: number | null;
}

export interface TicketTrendItem {
  date: string;
  created: number;
  resolved: number;
}

export interface PriorityDistribution {
  priority: string;
  count: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
}

export interface TechnicianPerformanceItem {
  technician: {
    id: number;
    full_name: string;
  };
  handled: number;
  resolved: number;
  open: number;
  breached: number;
  avg_resolution_minutes: number | null;
  sla_compliance_percentage: number | null;
}

export interface ManagerDashboardData {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  sla: SlaOverview;
  ticket_trend: TicketTrendItem[];
  by_priority: PriorityDistribution[];
  by_category: CategoryDistribution[];
  technician_performance: TechnicianPerformanceItem[];
}

export interface AdminDashboardData extends ManagerDashboardData {
  total_users: number;
  total_technicians: number;
  total_departments: number;
  total_assets: number;
  assets_by_status: Array<{ status: AssetStatus | string; count: number }>;
  recent_system_activity: Array<{
    id: number;
    user: { id: number; full_name: string } | null;
    action: string;
    module: string;
    description: string | null;
    created_at: string;
  }>;
}
