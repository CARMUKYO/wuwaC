import bundledSnapshot from './generated/snapshot.json';
import { snapshotSchema, type Snapshot } from './schema.ts';

/**
 * Data layer entry point.
 *
 * v1: validates and serves the bundled snapshot shipped with the app.
 * TODO(Phase 5): full fallback order — IndexedDB cache (fresh) -> bundled
 * snapshot -> explicit user-triggered live refresh with non-blocking
 * fallback (reference doc §8.2).
 */
let cached: Snapshot | null = null;

/** Parse + validate the bundled snapshot (throws on corrupt data). */
export function loadBundledSnapshot(): Snapshot {
  if (cached === null) {
    cached = snapshotSchema.parse(bundledSnapshot);
  }
  return cached;
}

/** Look up helpers over the validated snapshot. */
export function getCharacter(snapshot: Snapshot, id: string) {
  const found = snapshot.characters.find((c) => c.id === id);
  if (found === undefined) throw new Error(`unknown character: ${JSON.stringify(id)}`);
  return found;
}

export function getWeapon(snapshot: Snapshot, id: string) {
  const found = snapshot.weapons.find((w) => w.id === id);
  if (found === undefined) throw new Error(`unknown weapon: ${JSON.stringify(id)}`);
  return found;
}

export function getSonataSet(snapshot: Snapshot, id: string) {
  const found = snapshot.sonataSets.find((s) => s.id === id);
  if (found === undefined) throw new Error(`unknown sonata set: ${JSON.stringify(id)}`);
  return found;
}

export function getEchoDef(snapshot: Snapshot, id: string) {
  const found = snapshot.echoDefs.find((e) => e.id === id);
  if (found === undefined) throw new Error(`unknown echo: ${JSON.stringify(id)}`);
  return found;
}

/** Non-throwing companion for orphan detection (legacy/manual rows). */
export function findEchoDef(snapshot: Snapshot, id: string) {
  return snapshot.echoDefs.find((e) => e.id === id);
}
