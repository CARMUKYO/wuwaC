import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToasts } from './toasts.ts';

afterEach(() => {
  vi.useRealTimers();
});

describe('useToasts', () => {
  it('pushes, dismisses, and auto-expires toasts', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToasts(1000));
    act(() => {
      result.current.push('Echo saved.');
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      result.current.dismiss(result.current.toasts[0].id);
    });
    expect(result.current.toasts).toHaveLength(0);

    act(() => {
      result.current.push('Expiring.');
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});
