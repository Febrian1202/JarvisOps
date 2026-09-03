import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from '@/hooks/use-debounce';

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
