import bundledSnapshotJson from './generated/snapshot.json?raw';
import type { Snapshot } from './schema.ts';

/**
 * Data layer entry point.
 *
 * Sync bundled access: serves the bundled snapshot shipped with the app.
 * Kept intact for tests, write-path validation, and sync contexts (the
 * UI's async entry point is `loadActiveSnapshot()` in `./activeSnapshot.ts`,
 * which implements the full fallback order — IndexedDB cache -> bundled
 * snapshot -> background provider refresh with non-blocking fallback,
 * reference doc §8.2).
 *
 * Startup cost: the bundled file is imported as a string and `JSON.parse`d
 * (several times faster than evaluating it as a JS object literal) and is
 * NOT zod-validated at runtime. That is sound because the file is already
 * the schema's parse output — the sync writes `assembleSnapshot()`'s parsed
 * result, and `index.test.ts` pins `snapshotSchema.parse(file)` to deep-equal
 * the file itself, so a re-sync that breaks this fails the test gate instead
 * of shipping. The production build minifies the string (vite.config.ts).
 */
let cached: Snapshot | null = null;

/**
 * The `?raw` import is a string under Vite/Vitest, but plain Node loaders
 * (tsx scripts) ignore the query and hand over the parsed JSON object.
 * Accept both.
 */
export function snapshotFromBundledSource(source: unknown): Snapshot {
  return (typeof source === 'string' ? JSON.parse(source) : source) as Snapshot;
}

/** The bundled snapshot (parsed once, trusted — see above). */
export function loadBundledSnapshot(): Snapshot {
  cached ??= snapshotFromBundledSource(bundledSnapshotJson);
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
