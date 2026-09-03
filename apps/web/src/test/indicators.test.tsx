import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { SlaIndicator } from '@/components/shared/sla-indicator';
import { RelativeTime } from '@/components/shared/relative-time';

describe('StatusBadge, PriorityBadge, SlaIndicator, and RelativeTime Components', () => {
  it('renders translated status label in Indonesian', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('Sedang Dikerjakan')).toBeInTheDocument();
  });

  it('renders priority badge correctly', () => {
    render(<PriorityBadge priority="Critical" />);
    expect(screen.getByText('Kritis')).toBeInTheDocument();
  });

  it('renders breached SLA with proper warning text', () => {
    render(<SlaIndicator slaStatus="breached" remainingMinutes={-45} />);
    expect(screen.getByText(/terlambat 45 mnt/i)).toBeInTheDocument();
  });

  it('renders on-track SLA with remaining minutes', () => {
    render(<SlaIndicator slaStatus="on_track" remainingMinutes={120} />);
    expect(screen.getByText(/sisa 120 mnt/i)).toBeInTheDocument();
  });

  it('renders RelativeTime component with formatted output', () => {
    const isoDate = new Date(Date.now() - 3600000).toISOString();
    render(<RelativeTime date={isoDate} />);
    expect(screen.getByText(/1 jam yang lalu/i)).toBeInTheDocument();
  });
});
