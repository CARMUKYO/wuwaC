/**
 * Echo tile tint per Sonata set: five hand-picked tints from the design,
 * every other set hashed (stable, order-independent) onto a fallback pastel.
 */

const NAMED = new Set(['molten-rift', 'void-thunder', 'celestial-light', 'freezing-frost', 'sierra-gale']);

const FALLBACK_COUNT = 8;

/** FNV-1a over the id, so a set keeps its tint across snapshots. */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** CSS color value (a token reference) for a Sonata set's echo tile. */
export function sonataTint(sonataId: string): string {
  if (NAMED.has(sonataId)) return `var(--color-set-${sonataId})`;
  return `var(--color-set-tint-${(hash(sonataId) % FALLBACK_COUNT) + 1})`;
}
