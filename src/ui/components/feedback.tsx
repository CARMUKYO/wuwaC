import { useAnimatedNumber } from '../motion.ts';
import type { Toast } from '../toasts.ts';

/* Live-feedback primitives: animated readouts, bars, skeletons, toasts.
 * All motion degrades to instant under reduced motion (see motion.ts +
 * index.css); tests cover the settled states, not the frames. */

/** Count-up/down readout. `format` turns the eased value into text. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className = '',
  label,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  label?: string;
}) {
  const display = useAnimatedNumber(value);
  return (
    <span aria-label={label} className={`tnum ${className}`}>
      {format(display)}
    </span>
  );
}

/** +/- percent chip vs the previous value (tide up, ember down, dim flat). */
export function DeltaChip({ current, previous }: { current: number; previous: number }) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.05) return null;
  const up = pct > 0;
  return (
    <span
      className={`rounded px-1 py-px font-mono text-[10px] font-medium tnum ${
        up ? 'bg-tide-wash text-tide' : 'bg-ember-wash text-ember'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

/** Damage/score share bar. Width eases via `.score-bar-fill` (CSS-gated). */
export function ScoreBar({ share, className = '' }: { share: number; className?: string }) {
  return (
    <div className={`h-1 rounded-full bg-panel-3 ${className}`} aria-hidden="true">
      <div
        className="score-bar-fill h-1 rounded-full bg-seal"
        style={{ width: `${Math.max(0, Math.min(100, share))}%` }}
      />
    </div>
  );
}

/** Loading placeholder: shimmer rows + screen-reader text. */
export function Skeleton({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading" className={`space-y-2 ${className}`}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="skeleton h-12 rounded-lg"
          style={{ width: `${100 - (i % 3) * 7}%` }}
        />
      ))}
    </div>
  );
}

const TOAST_STYLES: Record<Toast['tone'], string> = {
  success: 'border-tide/40 bg-panel text-ink',
  info: 'border-line-strong bg-panel text-ink',
  danger: 'border-ember/40 bg-panel text-ink',
};

const TOAST_DOT: Record<Toast['tone'], string> = {
  success: 'bg-tide',
  info: 'bg-seal',
  danger: 'bg-ember',
};

/** Fixed bottom-right toast stack. */
export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-72 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'danger' ? 'alert' : 'status'}
          className={`animate-tt-toast flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg ${TOAST_STYLES[toast.tone]}`}
        >
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${TOAST_DOT[toast.tone]}`} />
          <span className="min-w-0 flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label={`Dismiss: ${toast.message}`}
            className="shrink-0 rounded px-1 font-mono text-xs text-dim hover:text-ink"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
