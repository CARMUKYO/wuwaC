import { useEffect, useRef, useState } from 'react';

/** True when the OS asks for reduced motion. Live-updates on change. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (): void => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Eased count-up/down toward `target` (cubic out, ~350ms). Settles
 * instantly under reduced motion, without rAF (SSR/tests), or for
 * non-finite targets. Formatting stays at the call site.
 */
export function useAnimatedNumber(target: number, durationMs = 350): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const canAnimate =
    !reduced && Number.isFinite(target) && typeof requestAnimationFrame === 'function';
  // No animation path: sync during render (the endorsed adjust-state
  // pattern — no effect, no cascading render). The ref resyncs in the
  // effect below, where ref writes are allowed.
  if (!canAnimate && display !== target) {
    setDisplay(target);
  }
  useEffect(() => {
    if (!canAnimate) {
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const value = from + (target - from) * eased;
      fromRef.current = value;
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, canAnimate]);
  return display;
}
