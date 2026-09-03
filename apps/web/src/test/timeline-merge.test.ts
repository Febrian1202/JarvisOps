import { describe, it, expect } from 'vitest';
import { mergeTimeline, translateHistory } from '@/components/tickets/timeline-merge';
import type { TicketComment, TicketHistoryItem } from '@/types/tickets';

function history(overrides: Partial<TicketHistoryItem>): TicketHistoryItem {
  return {
    id: 1,
    field_changed: 'status_id',
    old_value: null,
    new_value: null,
    user: { id: 1, full_name: 'A' },
    created_at: '2026-09-03T10:00:00Z',
    ...overrides,
  };
}

describe('timeline-merge', () => {
  it('merges comments and histories sorted by created_at ASC', () => {
    const comments: TicketComment[] = [
      { id: 1, ticket_id: 1, user: { id: 1, full_name: 'A' }, body: 'c1', created_at: '2026-09-03T10:00:00Z', updated_at: '2026-09-03T10:00:00Z' },
      { id: 2, ticket_id: 1, user: { id: 2, full_name: 'B' }, body: 'c2', created_at: '2026-09-03T12:00:00Z', updated_at: '2026-09-03T12:00:00Z' },
    ];
    const histories: TicketHistoryItem[] = [
      history({ id: 10, field_changed: 'status_id', old_value: '1', new_value: '2', user: { id: 2, full_name: 'B' }, created_at: '2026-09-03T11:00:00Z' }),
    ];

    const merged = mergeTimeline(comments, histories);
    expect(merged.map((m) => m.created_at)).toEqual([
      '2026-09-03T10:00:00Z',
      '2026-09-03T11:00:00Z',
      '2026-09-03T12:00:00Z',
    ]);
    expect(merged[1].type).toBe('history');
    expect(merged[0].type).toBe('comment');
  });

  it('translates status_id history to Indonesian sentence', () => {
    const text = translateHistory(history({
      field_changed: 'status_id',
      old_value: 'Open',
      new_value: 'Assigned',
    }));
    expect(text).toContain('Status diubah');
    expect(text).toContain('Menunggu');
    expect(text).toContain('Ditugaskan');
  });

  it('translates technician_id history with em dash for empty old value', () => {
    const text = translateHistory(history({
      field_changed: 'technician_id',
      old_value: null,
      new_value: 'Budi Santoso',
    }));
    expect(text).toContain('Teknisi diubah dari');
    expect(text).toContain('—');
    expect(text).toContain('Budi Santoso');
  });

  it('translates priority_id history', () => {
    const text = translateHistory(history({
      field_changed: 'priority_id',
      old_value: 'High',
      new_value: 'Medium',
    }));
    expect(text).toContain('Prioritas diubah dari');
    expect(text).toContain('Tinggi');
    expect(text).toContain('Sedang');
  });

  it('translates category_id history', () => {
    const text = translateHistory(history({
      field_changed: 'category_id',
      old_value: 'Software',
      new_value: 'Hardware',
    }));
    expect(text).toContain('Kategori diubah dari');
    expect(text).toContain('Software');
    expect(text).toContain('Hardware');
  });

  it('translates title history to short sentence', () => {
    const text = translateHistory(history({
      field_changed: 'title',
      old_value: 'Lama',
      new_value: 'Baru',
    }));
    expect(text).toContain('Judul diubah');
  });

  it('falls back to field name for unknown field', () => {
    const text = translateHistory(history({
      field_changed: 'notes',
      old_value: 'a',
      new_value: 'b',
    }));
    expect(text).toContain('notes');
  });
});