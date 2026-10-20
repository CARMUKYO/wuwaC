import { z } from 'zod';
import { snapshotSchema, type Snapshot } from './schema.ts';

/**
 * Data layer: the reviewed game-data publication served next to the app.
 *
 * CI syncs the provider (`providerSync.ts`, via `npm run sync`), a human
 * merges the snapshot PR, and the build (vite.config.ts `gamedataPublication`
 * plugin) emits two same-origin files from the committed snapshot:
 *   - `gamedata/manifest.json`: { snapshotVersion, fetchedAt, checksum, path, bytes }
 *   - `gamedata/snapshot-<checksum>.json`: the snapshot as canonical JSON
 * Browsers revalidate against the manifest (`activeSnapshot.ts`) and never
 * call the provider. Pure: shared by the build plugin, the client and tests.
 */

/** Manifest location, relative to the app base (`import.meta.env.BASE_URL`). */
export const GAMEDATA_MANIFEST_PATH = 'gamedata/manifest.json';

/** FNV-1a 32-bit checksum, hex-encoded. Cheap corruption guard, not security. */
export function checksumJson(canonical: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * The manifest a client reads. `snapshotVersion` is a plain number (not the
 * schema literal) so a newer-than-app publication is recognised as such
 * instead of failing validation; `path` is pinned to the content-addressed
 * payload name so a manifest can only ever point inside `gamedata/`.
 */
export const gamedataManifestSchema = z.object({
  snapshotVersion: z.number().int().positive(),
  fetchedAt: z.string().min(1),
  checksum: z.string().regex(/^[0-9a-f]{8}$/),
  path: z.string().regex(/^gamedata\/snapshot-[0-9a-f]{8}\.json$/),
  bytes: z.number().int().positive(),
});

export type GamedataManifest = z.infer<typeof gamedataManifestSchema>;

export interface GamedataPublication {
  manifest: GamedataManifest;
  /** Canonical JSON of the validated snapshot: what the payload file holds. */
  payload: string;
}

/**
 * Build the manifest and payload for a snapshot. The payload is the
 * canonical JSON `JSON.stringify(snapshotSchema.parse(raw))` — exactly what
 * `writeCachedSnapshot` checksums for the IndexedDB cache — so manifest,
 * payload and cache row all carry the same checksum. Throws on invalid data,
 * so a broken snapshot fails the build.
 */
export function buildGamedataPublication(raw: unknown): GamedataPublication {
  const payload = JSON.stringify(snapshotSchema.parse(raw));
  const snapshot = JSON.parse(payload) as Snapshot;
  const checksum = checksumJson(payload);
  return {
    payload,
    manifest: {
      snapshotVersion: snapshot.snapshotVersion,
      fetchedAt: snapshot.fetchedAt,
      checksum,
      path: `gamedata/snapshot-${checksum}.json`,
      bytes: new TextEncoder().encode(payload).byteLength,
    },
  };
}
