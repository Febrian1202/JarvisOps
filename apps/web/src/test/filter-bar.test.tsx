import React from 'react';
import { renderHook, act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from '@/hooks/use-debounce';
import { FilterBar } from '@/components/shared/filter-bar';

describe('useDebounce Hook', () => {
  it('debounces value updates after specified delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ val }) => useDebounce(val, 300),
      {
        initialProps: { val: 'initial' },
      }
    );

    expect(result.current).toBe('initial');
    rerender({ val: 'updated' });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('updated');
    vi.useRealTimers();
  });
});

describe('FilterBar Component', () => {
  it('renders filter trigger button on mobile', () => {
    render(
      <FilterBar
        filters={[
          { id: 'status', label: 'Status', options: [{ label: 'Open', value: 'OPEN' }] },
        ]}
      />
    );
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });
});

