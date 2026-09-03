import type { TicketComment, TicketHistoryItem } from '@/types/tickets';

export interface TimelineEntry {
  type: 'comment' | 'history';
  id: number;
  created_at: string;
  user: { id: number; full_name?: string | null } | null;
  body?: string;
  description?: string;
}

const STATUS_LABELS: Record<string, string> = {
  Open: 'Menunggu',
  Assigned: 'Ditugaskan',
  'In Progress': 'Sedang Dikerjakan',
  Resolved: 'Selesai',
  Closed: 'Ditutup',
};

const PRIORITY_LABELS: Record<string, string> = {
  Critical: 'Kritis',
  High: 'Tinggi',
  Medium: 'Sedang',
  Low: 'Rendah',
};

export function translateHistory(item: TicketHistoryItem): string {
  const field = item.field_changed;
  const oldVal = item.old_value;
  const newVal = item.new_value;

  const displayOld = oldVal ? STATUS_LABELS[oldVal] ?? PRIORITY_LABELS[oldVal] ?? oldVal : '—';
  const displayNew = newVal ? STATUS_LABELS[newVal] ?? PRIORITY_LABELS[newVal] ?? newVal : '—';

  switch (field) {
    case 'status_id':
      return `Status diubah dari ${displayOld} menjadi ${displayNew}`;
    case 'technician_id':
      return `Teknisi diubah dari ${displayOld} menjadi ${displayNew}`;
    case 'priority_id':
      return `Prioritas diubah dari ${displayOld} menjadi ${displayNew}`;
    case 'category_id':
      return `Kategori diubah dari ${oldVal ?? '—'} menjadi ${newVal ?? '—'}`;
    case 'title':
      return 'Judul diubah';
    default:
      return `${field} diubah dari ${oldVal ?? '—'} menjadi ${newVal ?? '—'}`;
  }
}

export function mergeTimeline(
  comments: TicketComment[],
  histories: TicketHistoryItem[]
): TimelineEntry[] {
  const commentEntries: TimelineEntry[] = comments.map((c) => ({
    type: 'comment' as const,
    id: c.id,
    created_at: c.created_at,
    user: c.user,
    body: c.body,
  }));

  const historyEntries: TimelineEntry[] = histories.map((h) => ({
    type: 'history' as const,
    id: h.id,
    created_at: h.created_at,
    user: h.user,
    description: translateHistory(h),
  }));

  return [...commentEntries, ...historyEntries].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
}