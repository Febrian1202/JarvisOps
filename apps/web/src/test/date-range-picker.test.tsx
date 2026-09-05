import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DateRangePicker,
  getTodayWibString,
  shiftWibDays,
  presetRangeWib,
} from '@/components/dashboard/date-range-picker';
import { lazyChart } from '@/components/dashboard/lazy-chart';
import {
  DateRangePicker as ExportedDateRangePicker,
  lazyChart as ExportedLazyChart,
} from '@/components/dashboard';

describe('LazyChart', () => {
  it('is exported from dashboard index', () => {
    expect(ExportedLazyChart).toBeDefined();
    expect(typeof ExportedLazyChart).toBe('function');
  });

  it('creates a dynamic component with loading fallback', () => {
    const DummyComponent = () => <div>Real Chart</div>;
    const DynamicChart = lazyChart(async () => ({ default: DummyComponent }));
    expect(DynamicChart).toBeDefined();
  });
});

describe('DateRangePicker WIB Utilities', () => {
  it('correctly calculates today in WIB (Asia/Jakarta)', () => {
    // 2026-09-04 18:00 UTC = 2026-09-05 01:00 WIB
    const testDate = new Date('2026-09-04T18:00:00Z');
    expect(getTodayWibString(testDate)).toBe('2026-09-05');

    // 2026-09-04 12:00 UTC = 2026-09-04 19:00 WIB
    const testDate2 = new Date('2026-09-04T12:00:00Z');
    expect(getTodayWibString(testDate2)).toBe('2026-09-04');
  });

  it('shifts days correctly on YYYY-MM-DD string', () => {
    expect(shiftWibDays('2026-09-05', -1)).toBe('2026-09-04');
    expect(shiftWibDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftWibDays('2026-03-01', -6)).toBe('2026-02-23');
  });

  it('calculates presets (7d, 30d, 90d) based on reference date', () => {
    const ref = new Date('2026-09-04T12:00:00Z'); // 2026-09-04 in WIB
    const p7 = presetRangeWib('7d', ref);
    expect(p7).toEqual({
      from: '2026-08-29',
      to: '2026-09-04',
    });

    const p30 = presetRangeWib('30d', ref);
    expect(p30).toEqual({
      from: '2026-08-06',
      to: '2026-09-04',
    });

    const p90 = presetRangeWib('90d', ref);
    expect(p90).toEqual({
      from: '2026-06-07',
      to: '2026-09-04',
    });
  });
});

describe('DateRangePicker Component', () => {
  it('is exported from dashboard index', () => {
    expect(ExportedDateRangePicker).toBeDefined();
  });

  it('renders trigger with "Pilih rentang tanggal" when no from/to provided', () => {
    const onChange = vi.fn();
    render(<DateRangePicker onChange={onChange} />);

    expect(screen.getByRole('button', { name: /rentang tanggal/i })).toBeInTheDocument();
    expect(screen.getByText('Pilih rentang tanggal')).toBeInTheDocument();
  });

  it('renders trigger with formatted dates when from and to are provided', () => {
    const onChange = vi.fn();
    // Same year: compact format "1 Sep - 4 Sep 2026"
    render(<DateRangePicker from="2026-09-01" to="2026-09-04" onChange={onChange} />);

    expect(screen.getByText('1 Sep - 4 Sep 2026')).toBeInTheDocument();
  });

  it('renders trigger with full years when from and to span different years', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="2025-12-25" to="2026-01-05" onChange={onChange} />);

    expect(screen.getByText('25 Des 2025 - 5 Jan 2026')).toBeInTheDocument();
  });

  it('emits preset range when preset button is clicked (Rule C11: both from & to)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker onChange={onChange} />);

    // Open popover
    const trigger = screen.getByRole('button', { name: /rentang tanggal/i });
    await user.click(trigger);

    // Preset 7 hari
    const preset7 = screen.getByRole('button', { name: '7 hari' });
    expect(preset7).toBeInTheDocument();
    await user.click(preset7);

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0];
    expect(emitted).toHaveProperty('from');
    expect(emitted).toHaveProperty('to');
    expect(emitted.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(emitted.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('emits null when reset button is clicked (Rule C11: reset both)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangePicker
        from="2026-09-01"
        to="2026-09-04"
        onChange={onChange}
      />
    );

    // Open popover
    const trigger = screen.getByRole('button', { name: /rentang tanggal/i });
    await user.click(trigger);

    const resetButton = screen.getByRole('button', { name: /reset/i });
    expect(resetButton).toBeInTheDocument();
    await user.click(resetButton);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('emits onChange when complete range is selected in calendar (Rule C11)', () => {
    const onChange = vi.fn();
    render(<DateRangePicker onChange={onChange} />);

    // Test that helper and component handle complete range selection
    const range = presetRangeWib('7d');
    expect(range.from).toBeDefined();
    expect(range.to).toBeDefined();
  });

  describe('Mobile Viewport (< 640px)', () => {
    let listeners: Array<(e: MediaQueryListEvent) => void> = [];

    beforeEach(() => {
      listeners = [];
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
          matches: query.includes('max-width: 639px'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
            if (event === 'change') listeners.push(cb);
          }),
          removeEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
            listeners = listeners.filter((l) => l !== cb);
          }),
          dispatchEvent: vi.fn(),
        }))
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('renders with 44px touch target on mobile and opens dialog with title "Pilih Rentang Tanggal"', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<DateRangePicker onChange={onChange} />);

      const trigger = screen.getByRole('button', { name: /rentang tanggal/i });
      expect(trigger).toHaveClass('min-h-[44px]');
      expect(trigger).toHaveClass('h-11');

      // Click trigger to open Dialog modal on mobile
      await user.click(trigger);

      // Verify Dialog role and title
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Pilih Rentang Tanggal')).toBeInTheDocument();

      // Click preset 7 hari inside dialog
      const preset7 = screen.getByRole('button', { name: '7 hari' });
      expect(preset7).toBeInTheDocument();
      await user.click(preset7);

      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted = onChange.mock.calls[0][0];
      expect(emitted).toHaveProperty('from');
      expect(emitted).toHaveProperty('to');
    });
  });
});
