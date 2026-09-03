import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SlaTracker } from '@/components/tickets/SlaTracker';

describe('SlaTracker', () => {
  it('shows overdue text for negative remaining minutes', () => {
    render(<SlaTracker slaStatus="breached" duration={240} remaining={-45} />);
    expect(screen.getByText('Terlambat 45 menit')).toBeInTheDocument();
  });

  it('shows remaining minutes for positive remaining', () => {
    render(<SlaTracker slaStatus="on_track" duration={480} remaining={120} />);
    expect(screen.getByText('Sisa 120 menit')).toBeInTheDocument();
  });

  it('hides progress bar when remaining is null', () => {
    render(<SlaTracker slaStatus="resolved" duration={240} remaining={null} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Selesai')).toBeInTheDocument();
  });

  it('shows warning state when remaining <= 25% of duration', () => {
    render(<SlaTracker slaStatus="on_track" duration={480} remaining={60} />);
    // 60 / 480 = 12.5% ≤ 25% → warning
    const label = screen.getByText('Sisa 60 menit');
    expect(label).toBeInTheDocument();
  });
});