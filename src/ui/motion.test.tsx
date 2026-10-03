import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnimatedNumber, usePrefersReducedMotion } from './motion.ts';

function mockMatchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('usePrefersReducedMotion', () => {
  it('is false when the OS reports no preference', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('is true when the OS asks for reduced motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });
});

describe('useAnimatedNumber', () => {
  it('returns the target on first render', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useAnimatedNumber(1234.5));
    expect(result.current).toBe(1234.5);
  });

  it('settles instantly under reduced motion', () => {
    mockMatchMedia(true);
    const { result, rerender } = renderHook(({ target }: { target: number }) => useAnimatedNumber(target), {
      initialProps: { target: 100 },
    });
    rerender({ target: 250 });
    expect(result.current).toBe(250);
  });
});
