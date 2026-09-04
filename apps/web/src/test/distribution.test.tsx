import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders as render } from './test-utils';
import { PriorityDistributionPanel, mergePriorityDistribution } from '../components/dashboard/manager/priority-distribution';
import { CategoryDistributionPanel, calculateCategoryDistribution } from '../components/dashboard/manager/category-distribution';
import type { PriorityDistribution, CategoryDistribution } from '../types/dashboard';
import type { TicketPriorityReference } from '../types/tickets';

const mockPriorities: TicketPriorityReference[] = [
  { id: 1, name: 'Critical', sla_minutes: 120 },
  { id: 2, name: 'High', sla_minutes: 480 },
  { id: 3, name: 'Medium', sla_minutes: 1440 },
];

vi.mock('../hooks/use-reference-data', () => ({
  useReferenceData: () => ({
    priorities: mockPriorities,
    isLoading: false,
  }),
}));

describe('distribution panels', () => {
  describe('mergePriorityDistribution', () => {
    it('merges API counts with reference list, zero-fills missing, calculates %, formats label', () => {
      const apiData: PriorityDistribution[] = [
        { priority: 'Critical', count: 5 },
        { priority: 'Medium', count: 15 },
      ];
      
      const result = mergePriorityDistribution(apiData, mockPriorities);
      
      expect(result).toHaveLength(3);
      
      expect(result[0].label).toBe('Critical (2j)');
      expect(result[0].count).toBe(5);
      expect(result[0].percentage).toBe(25);
      
      expect(result[1].label).toBe('High (8j)');
      expect(result[1].count).toBe(0);
      expect(result[1].percentage).toBe(0);
      
      expect(result[2].label).toBe('Medium (1h)');
      expect(result[2].count).toBe(15);
      expect(result[2].percentage).toBe(75);
    });

    it('appends soft-deleted priorities that are not in reference', () => {
      const apiData: PriorityDistribution[] = [
        { priority: 'High', count: 10 },
        { priority: 'Legacy Prio', count: 10 },
      ];
      
      const result = mergePriorityDistribution(apiData, mockPriorities);
      
      expect(result).toHaveLength(4); 
      expect(result[3].label).toBe('Legacy Prio');
      expect(result[3].count).toBe(10);
      expect(result[3].percentage).toBe(50);
    });

    it('handles empty API data but still returns reference list zeroed', () => {
      const result = mergePriorityDistribution([], mockPriorities);
      expect(result).toHaveLength(3);
      expect(result[0].count).toBe(0);
      expect(result[0].percentage).toBe(0);
    });
  });

  describe('calculateCategoryDistribution', () => {
    it('calculates percentages and sorts descending', () => {
      const apiData: CategoryDistribution[] = [
        { category: 'Software', count: 10 },
        { category: 'Network', count: 30 },
        { category: 'Hardware', count: 10 },
      ];
      
      const result = calculateCategoryDistribution(apiData);
      
      expect(result).toHaveLength(3);
      expect(result[0].label).toBe('Network');
      expect(result[0].percentage).toBe(60); 
      
      expect(result[1].label).toBe('Software');
      expect(result[1].percentage).toBe(20);
      
      expect(result[2].label).toBe('Hardware');
      expect(result[2].percentage).toBe(20);
    });
  });

  describe('PriorityDistributionPanel', () => {
    it('renders empty state when data is empty', () => {
      render(
        <PriorityDistributionPanel data={[]} />
      );
      expect(screen.getByText('Belum ada data distribusi.')).toBeInTheDocument();
    });

    it('renders list items with role="list" when data exists', () => {
      render(
        <PriorityDistributionPanel data={[{ priority: 'Critical', count: 5 }]} />
      );
      
      const list = screen.getByRole('list', { name: 'Distribusi prioritas' });
      expect(list).toBeInTheDocument();
      expect(screen.getByText('Critical (2j)')).toBeInTheDocument();
      expect(screen.getByText('5 tiket (100%)')).toBeInTheDocument();
    });
  });

  describe('CategoryDistributionPanel', () => {
    it('renders empty state when data is empty', () => {
      render(
        <CategoryDistributionPanel data={[]} />
      );
      expect(screen.getByText('Belum ada data distribusi.')).toBeInTheDocument();
    });

    it('renders list items with role="list" when data exists', () => {
      render(
        <CategoryDistributionPanel data={[{ category: 'Network', count: 10 }]} />
      );
      
      const list = screen.getByRole('list', { name: 'Distribusi kategori' });
      expect(list).toBeInTheDocument();
      expect(screen.getByText('Network')).toBeInTheDocument();
      expect(screen.getByText('10 tiket (100%)')).toBeInTheDocument();
    });
  });
});
