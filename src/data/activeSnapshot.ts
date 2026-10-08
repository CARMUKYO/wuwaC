import { db } from '../state/db.ts';
import { loadBundledSnapshot } from './index.ts';
import {
  assembleSnapshot,
  createSilentReporter,
  DETAIL_DELAY_MS,
  fetchGameDataParts,
  fetchJsonFromProvider,
} from './providerSync.ts';
import { SNAPSHOT_VERSION, snapshotSchema, type Snapshot } from './schema.ts';

/**
 * Data layer: runtime snapshot freshness (reference doc §8.2).
 *
 * Fallback order, implemented exactly:
 *   1. IndexedDB-cached snapshot (validated + version-usable), else
 *   2. the bundled `snapshot.json` shipped with the app, else
 *   3. an opportunistic background revalidation against the provider that
 *      NEVER blocks load or interaction (see `fetchFreshSnapshot`).
 *
 * Freshness policy (deliberately simple):
 * - VERSION decides who serves: a cached payload wins iff it validates
 *   against the current schema AND its `snapshotVersion` is
 *   matching-or-newer than bundled. An older cache (e.g. after an app
 *   update ships a newer bundled snapshot) falls back to bundled.
 *   Note: the zod schema pins `snapshotVersion` to the app's known
 *   version, so a newer-than-app payload cannot validate yet — it is held
 *   out until the app (and its schema) updates. The `>=` comparison is the
 *   documented rule; validation is the gate.
 * - AGE decides when to revalidate: a snapshot older than
 *   `SNAPSHOT_STALE_AFTER_DAYS` triggers one background refresh attempt
 *   per session. Age never demotes the cache below bundled — bundled can
 *   only be older, so demoting would serve worse data.
 * - ADOPTION decides what a refresh keeps: a fetched candidate replaces
 *   the active snapshot only if it validates AND is strictly newer
 *   (higher version, or same version with a newer `fetchedAt`). Anything
 *   else — network error, invalid payload, older version — keeps serving
 *   the current snapshot silently (warning logged, no blocking error).
 *
 * This module owns the policy and the cache mechanics. React state lives in
 * `src/state/snapshotStore.ts`; domain/optimizer code keeps receiving a
 * plain `Snapshot` and never imports this module's Dexie paths.
 */

/** The `gamedataCache` table holds exactly one row, under this id. */
export const SNAPSHOT_CACHE_ID = 'active';

/**
 * Days after `fetchedAt` before a background revalidation is attempted.
 * The game patches roughly every 6 weeks — weekly is polite to the fan-run
 * API (one background sync per week at most) while still catching
 * mid-patch data fixes. Manual "Check for updates" always revalidates.
 */
export const SNAPSHOT_STALE_AFTER_DAYS = 7;

const STALE_AFTER_MS = SNAPSHOT_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;

export type SnapshotSource = 'cache' | 'bundled';

export interface ActiveSnapshot {
  snapshot: Snapshot;
  source: SnapshotSource;
  /** `fetchedAt` of the winning snapshot (== snapshot.fetchedAt, handy for UI). */
  fetchedAt: string;
  /** `fetchedAt` of the bundled snapshot, for "bundled from <date>" notes. */
  bundledFetchedAt: string;
}

/** FNV-1a 32-bit checksum, hex-encoded. Cheap corruption guard, not security. */
export function checksumJson(canonical: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

type CacheRow = { checksum: string; payload: unknown } | undefined;

/**
 * Read + validate the cached snapshot. Returns `null` when there is no row,
 * the checksum mismatches, or the payload fails schema validation — every
 * failure is a warning, never a throw, so a corrupt cache degrades to
 * bundled instead of breaking the page.
 */
export async function readCachedSnapshot(
  readRow: () => Promise<CacheRow> = () =>
    db.gamedataCache.get(SNAPSHOT_CACHE_ID).then((row) =>
      row === undefined ? undefined : { checksum: row.checksum, payload: row.payload },
    ),
): Promise<Snapshot | null> {
  try {
    if (typeof indexedDB === 'undefined') return null;
    const row = await readRow();
    if (row === undefined) return null;
    const parsed = snapshotSchema.safeParse(row.payload);
    if (!parsed.success) {
      console.warn('cached game-data snapshot failed validation; using bundled data instead');
      return null;
    }
    if (checksumJson(JSON.stringify(row.payload)) !== row.checksum) {
      console.warn('cached game-data snapshot failed its checksum; using bundled data instead');
      return null;
    }
    return parsed.data;
  } catch (err) {
    console.warn('could not read the cached game-data snapshot; using bundled data instead', err);
    return null;
  }
}

/**
 * Validate + persist a snapshot to the cache. Throws on invalid input and
 * writes nothing — invalid data is never cached.
 */
export async function writeCachedSnapshot(
  snapshot: Snapshot,
  writeRow: (row: { checksum: string; payload: Snapshot }) => Promise<void> = async (row) => {
    await db.gamedataCache.put({
      id: SNAPSHOT_CACHE_ID,
      fetchedAt: snapshot.fetchedAt,
      provider: 'encore.moe',
      snapshotVersion: snapshot.snapshotVersion,
      checksum: row.checksum,
      payload: row.payload,
    });
  },
): Promise<void> {
  const validated = snapshotSchema.parse(snapshot);
  const payloadJson = JSON.stringify(validated);
  await writeRow({ checksum: checksumJson(payloadJson), payload: validated });
}

/** Pure selection step of the fallback order: usable cache wins, else bundled. */
export function selectActiveSnapshot(cached: Snapshot | null, bundled: Snapshot): ActiveSnapshot {
  if (cached !== null && cached.snapshotVersion >= bundled.snapshotVersion) {
    return {
      snapshot: cached,
      source: 'cache',
      fetchedAt: cached.fetchedAt,
      bundledFetchedAt: bundled.fetchedAt,
    };
  }
  return {
    snapshot: bundled,
    source: 'bundled',
    fetchedAt: bundled.fetchedAt,
    bundledFetchedAt: bundled.fetchedAt,
  };
}

/** True when `fetchedAt` is older than the staleness threshold (or unparsable). */
export function isSnapshotStale(fetchedAt: string, nowMs: number = Date.now()): boolean {
  const fetchedMs = Date.parse(fetchedAt);
  if (Number.isNaN(fetchedMs)) return true;
  return nowMs - fetchedMs > STALE_AFTER_MS;
}

/**
 * True when a refresh candidate should replace the active snapshot:
 * strictly newer by version, or same version with a newer fetch time.
 * (`fetchedAt` is ISO-8601 UTC, so lexicographic comparison is chronological.)
 */
export function shouldAdoptCandidate(candidate: Snapshot, active: Snapshot): boolean {
  return (
    candidate.snapshotVersion > active.snapshotVersion ||
    (candidate.snapshotVersion === active.snapshotVersion && candidate.fetchedAt > active.fetchedAt)
  );
}

export interface LoadActiveSnapshotDeps {
  readRow?: () => Promise<CacheRow>;
  /** Injectable so tests never depend on the bundled file's contents. */
  bundled?: Snapshot;
}

/**
 * Resolve the active snapshot via the fallback order (cache -> bundled).
 * Async only because the cache read is async — it never touches the network.
 * Throws only when BOTH bundled and cache are unusable.
 */
export async function loadActiveSnapshot(deps: LoadActiveSnapshotDeps = {}): Promise<ActiveSnapshot> {
  let bundled: Snapshot | null = null;
  try {
    bundled = deps.bundled ?? loadBundledSnapshot();
  } catch (err) {
    console.warn('bundled game-data snapshot failed validation; trying the cache', err);
  }
  const cached = await readCachedSnapshot(deps.readRow);
  if (bundled === null) {
    if (cached === null) throw new Error('no usable game-data snapshot (bundled and cache both failed)');
    return { snapshot: cached, source: 'cache', fetchedAt: cached.fetchedAt, bundledFetchedAt: cached.fetchedAt };
  }
  return selectActiveSnapshot(cached, bundled);
}

export interface FetchFreshSnapshotOptions {
  fetchJson?: (path: string) => Promise<unknown>;
  detailDelayMs?: number;
  fetchedAt?: string;
}

/**
 * Full provider re-sync through the SHARED pipeline (`providerSync.ts` —
 * the same code the CLI sync runs, not a fork). Slow (~370 sequential
 * detail requests with a politeness delay): call only from background or
 * explicit-refresh paths, never on the load path. Throws on network or
 * validation failure — the caller decides how to degrade.
 */
export async function fetchFreshSnapshot(options: FetchFreshSnapshotOptions = {}): Promise<Snapshot> {
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const parts = await fetchGameDataParts({
    fetchJson: options.fetchJson ?? fetchJsonFromProvider,
    fetchedAt,
    detailDelayMs: options.detailDelayMs ?? DETAIL_DELAY_MS,
    reporter: createSilentReporter(),
  });
  return assembleSnapshot(parts, fetchedAt);
}

export interface RefreshActiveSnapshotDeps {
  /** Defaults to the shared provider pipeline. Injectable for tests. */
  fetchSnapshot?: () => Promise<Snapshot>;
  writeRow?: (row: { checksum: string; payload: Snapshot }) => Promise<void>;
}

export type RefreshOutcome =
  | { status: 'updated'; snapshot: Snapshot }
  | { status: 'current'; snapshot: Snapshot };

/**
 * Classified refresh failure. `unavailable` = the fetch itself threw
 * (network, HTTP, abort); `invalid` = the payload failed schema
 * validation; `newer-than-app` = the provider moved to a snapshot version
 * this app's schema cannot validate yet (needs an app update, not a
 * retry). Callers keep serving the current snapshot in all three cases.
 */
export class SnapshotRefreshError extends Error {
  readonly kind: 'unavailable' | 'invalid' | 'newer-than-app';

  constructor(kind: SnapshotRefreshError['kind'], message: string) {
    super(message);
    this.name = 'SnapshotRefreshError';
    this.kind = kind;
  }
}

function rawSnapshotVersion(raw: unknown): number | null {
  if (typeof raw !== 'object' || raw === null || !('snapshotVersion' in raw)) return null;
  const version = (raw as { snapshotVersion: unknown }).snapshotVersion;
  return typeof version === 'number' ? version : null;
}

/**
 * Revalidate against the provider and adopt the candidate iff strictly
 * newer (validated before persisting — invalid data never reaches the
 * cache). Resolves `current` when the active snapshot stays — including
 * when the provider's version is OLDER than active (silent keep, warning
 * logged). REJECTS with `SnapshotRefreshError` on network/validation
 * failure so the caller can choose its feedback (silent warn for
 * background, toast for manual).
 */
export async function refreshActiveSnapshot(
  active: Snapshot,
  deps: RefreshActiveSnapshotDeps = {},
): Promise<RefreshOutcome> {
  const fetchSnapshot = deps.fetchSnapshot ?? fetchFreshSnapshot;
  let raw: unknown;
  try {
    raw = await fetchSnapshot();
  } catch (err) {
    if (err instanceof SnapshotRefreshError) throw err;
    throw new SnapshotRefreshError(
      'unavailable',
      `provider request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const rawVersion = rawSnapshotVersion(raw);
  if (rawVersion !== null && rawVersion < active.snapshotVersion) {
    console.warn(
      `provider snapshot version ${rawVersion} is older than active ${active.snapshotVersion}; keeping current data`,
    );
    return { status: 'current', snapshot: active };
  }
  if (rawVersion !== null && rawVersion > SNAPSHOT_VERSION) {
    throw new SnapshotRefreshError(
      'newer-than-app',
      `provider snapshot version ${rawVersion} is newer than this app understands (${SNAPSHOT_VERSION})`,
    );
  }
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SnapshotRefreshError('invalid', 'provider snapshot failed validation');
  }
  const candidate = parsed.data;
  if (!shouldAdoptCandidate(candidate, active)) {
    if (
      candidate.snapshotVersion < active.snapshotVersion ||
      (candidate.snapshotVersion === active.snapshotVersion && candidate.fetchedAt <= active.fetchedAt)
    ) {
      console.warn(
        `provider snapshot (${candidate.fetchedAt}) is not newer than active (${active.fetchedAt}); keeping current data`,
      );
    }
    return { status: 'current', snapshot: active };
  }
  await writeCachedSnapshot(candidate, deps.writeRow);
  return { status: 'updated', snapshot: candidate };
}
