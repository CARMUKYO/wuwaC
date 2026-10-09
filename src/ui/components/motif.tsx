import type { ReactNode } from 'react';

/* Tacet Terminal signature motif: the living frequency strip, specimen
 * plates with a seal stamp, and motif empty states. All decorative —
 * aria-hidden where pure garnish, so screen readers skip the art. */

/** Deterministic bar heights from a string seed (FNV-1a + mulberry32). */
function barsForSeed(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = (): number => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => 4 + rand() * 20);
}

/**
 * Waveform ribbon — the Tacet frequency motif as a stretchable strip.
 * Same seed always draws the same wave; `animated` bars drift with the
 * `tt-eq` keyframe (inert under reduced motion via CSS).
 */
export function FrequencyStrip({
  seed,
  bars = 48,
  animated = true,
  className = '',
}: {
  seed: string;
  bars?: number;
  animated?: boolean;
  className?: string;
}) {
  const heights = barsForSeed(seed, bars);
  const width = bars * 5;
  return (
    <svg
      viewBox={`0 0 ${width} 24`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={`block ${className}`}
    >
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 5}
          y={24 - h}
          width="3"
          height={h}
          rx="1"
          className={animated ? 'eq-bar fill-seal' : 'fill-seal'}
          style={
            animated
              ? {
                  animationDelay: `${(i % 12) * -0.2}s`,
                  animationDuration: `${2 + (i % 5) * 0.3}s`,
                }
              : undefined
          }
          opacity={0.3 + (i % 4) * 0.14}
        />
      ))}
    </svg>
  );
}

/** Empty state with a still waveform mark above the message. */
export function MotifEmptyState({ seed, children }: { seed: string; children: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-line-strong bg-panel px-4 py-8 text-center">
      <FrequencyStrip seed={seed} bars={24} animated={false} className="mx-auto h-6 w-44 opacity-70" />
      <p className="mt-3 text-sm text-fog">{children}</p>
    </div>
  );
}
