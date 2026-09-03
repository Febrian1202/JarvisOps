import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AssetHistoryTimeline } from '@/components/assets/AssetHistoryTimeline';
import { AssetDetailCard } from '@/components/assets/AssetDetailCard';
import type { AssetDetail, AssetTimelineEvent } from '@/types/assets';

const detail: AssetDetail = {
  id: 1,
  asset_tag: 'LPT-0001',
  name: 'ThinkPad T14',
  category: 'Laptop',
  brand: 'Lenovo',
  model: 'T14 Gen 3',
  serial_number: 'SN12345',
  status: 'assigned',
  purchase_date: '2025-01-10',
  notes: 'Digunakan untuk divisi Engineering',
  current_assignment: { id: 1, user_id: 9, full_name: 'Andi Kusuma', assigned_at: '2025-02-20T09:00:00Z' },
  created_at: '2025-01-10T08:00:00Z',
  updated_at: '2025-02-20T09:00:00Z',
};

describe('AssetDetailCard', () => {
  it('renders banner and metadata fields', () => {
    render(<AssetDetailCard asset={detail} />);
    expect(screen.getAllByText('LPT-0001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ThinkPad T14').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Digunakan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lenovo')).toBeInTheDocument();
    expect(screen.getByText('SN12345')).toBeInTheDocument();
  });
});

describe('AssetHistoryTimeline', () => {
  it('renders assignment and release events in order', () => {
    const events: AssetTimelineEvent[] = [
      { type: 'assignment', action: 'assigned', user: { id: 9, full_name: 'Andi Kusuma' }, notes: 'Untuk kebutuhan project', occurred_at: '2025-02-20T09:00:00Z' },
      { type: 'assignment', action: 'released', user: { id: 9, full_name: 'Andi Kusuma' }, notes: null, occurred_at: '2025-03-01T09:00:00Z' },
    ];
    render(<AssetHistoryTimeline events={events} />);
    expect(screen.getByText(/ditugaskan ke/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Andi Kusuma/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/dilepaskan/i)).toBeInTheDocument();
    expect(screen.getByText(/untuk kebutuhan project/i)).toBeInTheDocument();
  });

  it('renders history description entries', () => {
    const events: AssetTimelineEvent[] = [
      { type: 'history', action: 'asset_created', description: 'Aset dibuat dengan tag LPT-0001', user: null, notes: null, occurred_at: '2025-01-10T08:00:00Z' },
    ];
    render(<AssetHistoryTimeline events={events} />);
    expect(screen.getByText(/Aset dibuat dengan tag LPT-0001/i)).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(<AssetHistoryTimeline events={[]} />);
    expect(screen.getByText(/belum ada riwayat/i)).toBeInTheDocument();
  });
});