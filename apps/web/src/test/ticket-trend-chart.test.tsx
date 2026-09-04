import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TicketTrendChartPanel, formatTrendTick, summarizeTrend } from '../components/dashboard/manager/ticket-trend-chart';
import type { TicketTrendItem } from '../types/dashboard';

const mockTrend: TicketTrendItem[] = [
  { date: '2026-09-01', created: 50, resolved: 40 },
  { date: '2026-09-02', created: 45, resolved: 50 },
  { date: '2026-09-03', created: 29, resolved: 8 },
];

describe('ticket-trend-chart', () => {
  describe('pure helpers', () => {
    it('summarizeTrend calculates totals correctly', () => {
      const { totalCreated, totalResolved } = summarizeTrend(mockTrend);
      expect(totalCreated).toBe(124);
      expect(totalResolved).toBe(98);
    });

    it('formatTrendTick formats date string to localized short date', () => {
      expect(formatTrendTick('2026-09-04')).toBe('4 Sep');
      expect(formatTrendTick('2026-08-01')).toBe('1 Agt');
    });
  });

  describe('TicketTrendChartPanel', () => {
    it('renders empty state when trend is empty', () => {
      render(<TicketTrendChartPanel trend={[]} />);
      expect(screen.getByText('Belum ada data tren pada rentang ini.')).toBeInTheDocument();
    });

    it('renders empty state when all values are zero', () => {
      const zeroTrend: TicketTrendItem[] = [
        { date: '2026-09-01', created: 0, resolved: 0 },
        { date: '2026-09-02', created: 0, resolved: 0 },
      ];
      render(<TicketTrendChartPanel trend={zeroTrend} />);
      expect(screen.getByText('Belum ada data tren pada rentang ini.')).toBeInTheDocument();
    });

    it('renders loading skeleton when isLoading is true', () => {
      const { container } = render(<TicketTrendChartPanel trend={[]} isLoading={true} />);
      // Our DashboardPanel renders a div with animate-pulse when loading
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders chart with accessibility wrapper and summary', () => {
      render(<TicketTrendChartPanel trend={mockTrend} />);
      
      const figure = screen.getByRole('img');
      expect(figure).toBeInTheDocument();
      expect(figure).toHaveAttribute('aria-label', 'Grafik tren tiket');
      
      // The figcaption text should contain the summary
      const summary = screen.getByText(/Total 124 ticket dibuat, 98 selesai\./);
      expect(summary).toBeInTheDocument();
      expect(summary).toHaveClass('sr-only');
    });
  });
});
