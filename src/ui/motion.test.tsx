import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnimatedNumber, usePrefersReducedMotion, useReveal, useTypewriter } from './motion.ts';

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

describe('useReveal', () => {
  it('is visible immediately without IntersectionObserver', () => {
    mockMatchMedia(false);
    vi.stubGlobal('IntersectionObserver', undefined);
    const { result } = renderHook(() => useReveal<HTMLDivElement>());
    expect(result.current.visible).toBe(true);
  });

  it('is visible immediately under reduced motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReveal<HTMLDivElement>());
    expect(result.current.visible).toBe(true);
  });

  it('starts hidden and flips visible once the element intersects', () => {
    mockMatchMedia(false);
    let fire: (entries: { isIntersecting: boolean }[]) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: typeof fire) {
          fire = cb;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    const { result } = renderHook(() => useReveal<HTMLDivElement>());
    expect(result.current.visible).toBe(false);
    act(() => result.current.ref(document.createElement('div')));
    act(() => fire([{ isIntersecting: true }]));
    expect(result.current.visible).toBe(true);
    expect(disconnect).toHaveBeenCalled();
  });
});

describe('useTypewriter', () => {
  it('reveals the text a few characters per tick, then stops at the end', () => {
    mockMatchMedia(false);
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useTypewriter('Hello', 10, 2));
      expect(result.current).toBe('');
      act(() => vi.advanceTimersByTime(10));
      expect(result.current).toBe('He');
      act(() => vi.advanceTimersByTime(20));
      expect(result.current).toBe('Hello');
      act(() => vi.advanceTimersByTime(100));
      expect(result.current).toBe('Hello');
    } finally {
      vi.useRealTimers();
    }
  });

  it('restarts when the text changes', () => {
    mockMatchMedia(false);
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(({ t }) => useTypewriter(t, 10, 2), { initialProps: { t: 'abcd' } });
      act(() => vi.advanceTimersByTime(50));
      expect(result.current).toBe('abcd');
      rerender({ t: 'xyz' });
      expect(result.current).toBe('');
      act(() => vi.advanceTimersByTime(10));
      expect(result.current).toBe('xy');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the full text under reduced motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTypewriter('Hello'));
    expect(result.current).toBe('Hello');
  });
});
