import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MobileFilterSheet } from '@/components/shared/mobile-filter-sheet';
import type { FilterField } from '@/components/shared/filter-bar';

describe('MobileFilterSheet Component', () => {
  const mockFilters: FilterField[] = [
    {
      id: 'status',
      label: 'Status',
      value: 'OPEN',
      options: [
        { label: 'Open', value: 'OPEN' },
        { label: 'Closed', value: 'CLOSED' },
      ],
    },
    {
      id: 'priority',
      label: 'Prioritas',
      value: '',
      options: [{ label: 'Tinggi', value: 'HIGH' }],
    },
  ];

  it('renders trigger button with active count badge', () => {
    render(
      <MobileFilterSheet
        filters={mockFilters}
        hasActiveFilters={true}
      />
    );

    const trigger = screen.getByRole('button', { name: /filter/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens sheet and handles reset filters callback', async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    render(
      <MobileFilterSheet
        filters={mockFilters}
        hasActiveFilters={true}
        onResetFilters={handleReset}
      />
    );

    await user.click(screen.getByRole('button', { name: /filter/i }));
    expect(screen.getByText('Filter Data')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    await user.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
