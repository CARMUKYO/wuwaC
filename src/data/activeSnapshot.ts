import { db } from '../state/db.ts';
import {
  checksumJson,
  GAMEDATA_MANIFEST_PATH,
  gamedataManifestSchema,
  type GamedataManifest,
} from './gamedataPublication.ts';
import { loadBundledSnapshot } from './index.ts';
import { SNAPSHOT_VERSION, snapshotSchema, type Snapshot } from './schema.ts';

export { checksumJson };

/**
 * Data layer: runtime snapshot freshness (reference doc §8.2).
 *
 * Fallback order, implemented exactly:
 *   1. IndexedDB-cached snapshot (validated + version-usable), else
 *   2. the bundled `snapshot.json` shipped with the app, else
 *   3. an opportunistic background revalidation against the reviewed
 *      same-origin publication (`<base>gamedata/manifest.json`, built from
 *      the committed snapshot — see `gamedataPublication.ts`) that NEVER
 *      blocks load or interaction. Browsers never call the provider API:
 *      `providerSync.ts` runs only in the CLI and the scheduled CI sync.
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
 * - WHEN to revalidate: once per session (one small manifest GET), plus
 *   the manual "Check for updates". Age never demotes the cache below
 *   bundled — bundled can only be older, so demoting would serve worse data.
 * - ADOPTION decides what a refresh keeps: the manifest is compared first
 *   and the payload is fetched only when the manifest is strictly newer
 *   (higher version, or same version with a newer `fetchedAt`); the payload
 *   must then match the manifest's checksum, version and time and validate
 *   against the schema before it is cached. Anything else — network error,
 *   invalid manifest or payload, older version — keeps serving the current
 *   snapshot (warning logged, no blocking error).
 *
 * This module owns the policy and the cache mechanics. React state lives in
 * `src/state/snapshotStore.ts`; domain/optimizer code keeps receiving a
 * plain `Snapshot` and never imports this module's Dexie paths.
 */

/** The `gamedataCache` table holds exactly one row, under this id. */
export const SNAPSHOT_CACHE_ID = 'active';

export type SnapshotSource = 'cache' | 'bundled';

export interface ActiveSnapshot {
  snapshot: Snapshot;
  source: SnapshotSource;
  /** `fetchedAt` of the winning snapshot (== snapshot.fetchedAt, handy for UI). */
  fetchedAt: string;
  /** `fetchedAt` of the bundled snapshot, for "bundled from <date>" notes. */
  bundledFetchedAt: string;
}

type CacheRow = { checksum: string; payload: unknown } | undefined;

/**
 * Validation memo for the cached payload (startup cost: zod over the
 * multi-MB snapshot is the most expensive step of a cache read).
 *
 * zod parsing is a pure function of (schema, payload), and the cached
 * payload is itself a parse output (written by `writeCachedSnapshot`;
 * parse-idempotence on snapshot data is pinned by `index.test.ts`). So once
 * the payload with checksum C has validated under app build B, validating it
 * again under B can only return the same data. The memo records `B:C`; the
 * checksum is still recomputed from the payload on every read, so a
 * corrupted payload never matches a memo entry.
 *
 * B is the content-hashed URL of this module's production chunk: any code
 * change in it or its imports (schema, zod) renames the chunk and so
 * invalidates the memo. Dev and test builds have no such identity, so the
 * memo is off there (always validate).
 */
export interface ValidationMemo {
  buildId: string;
  read: () => string | null;
  write: (value: string) => void;
}

/** localStorage key of the memo (prefixed: the Pages origin is shared). */
export const SNAPSHOT_VALIDATED_KEY = 'wuwa-optimizer-snapshot-validated';

/** The production memo, or `null` (validate every read) outside a hashed build. */
export function defaultValidationMemo(): ValidationMemo | null {
  if (!import.meta.env.PROD || typeof localStorage === 'undefined') return null;
  return {
    buildId: import.meta.url,
    read: () => localStorage.getItem(SNAPSHOT_VALIDATED_KEY),
    write: (value) => localStorage.setItem(SNAPSHOT_VALIDATED_KEY, value),
  };
}

function memoEntry(memo: ValidationMemo, checksum: string): string {
  return `${memo.buildId}:${checksum}`;
}

/** Best-effort: a memo that can't be written only costs a re-validation. */
function rememberValidated(memo: ValidationMemo | null, checksum: string): void {
  if (memo === null) return;
  try {
    memo.write(memoEntry(memo, checksum));
  } catch {
    // storage full/blocked — next read validates again
  }
}

function isMemoized(memo: ValidationMemo | null, checksum: string): boolean {
  if (memo === null) return false;
  try {
    return memo.read() === memoEntry(memo, checksum);
  } catch {
    return false;
  }
}

/**
 * Read + validate the cached snapshot. Returns `null` when there is no row,
 * the checksum mismatches, or the payload fails schema validation — every
 * failure is a warning, never a throw, so a corrupt cache degrades to
 * bundled instead of breaking the page. Schema validation is skipped when
 * the memo shows this exact payload already validated under this build.
 */
export async function readCachedSnapshot(
  readRow: () => Promise<CacheRow> = () =>
    db.gamedataCache.get(SNAPSHOT_CACHE_ID).then((row) =>
      row === undefined ? undefined : { checksum: row.checksum, payload: row.payload },
    ),
  memo: ValidationMemo | null = defaultValidationMemo(),
): Promise<Snapshot | null> {
  try {
    if (typeof indexedDB === 'undefined') return null;
    const row = await readRow();
    if (row === undefined) return null;
    if (checksumJson(JSON.stringify(row.payload)) !== row.checksum) {
      console.warn('cached game-data snapshot failed its checksum; using bundled data instead');
      return null;
    }
    if (isMemoized(memo, row.checksum)) return row.payload as Snapshot;
    const parsed = snapshotSchema.safeParse(row.payload);
    if (!parsed.success) {
      console.warn('cached game-data snapshot failed validation; using bundled data instead');
      return null;
    }
    rememberValidated(memo, row.checksum);
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
  memo: ValidationMemo | null = defaultValidationMemo(),
): Promise<void> {
  const validated = snapshotSchema.parse(snapshot);
  const checksum = checksumJson(JSON.stringify(validated));
  await writeRow({ checksum, payload: validated });
  rememberValidated(memo, checksum);
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

/** The two fields the adoption rule compares (a snapshot or a manifest). */
export interface SnapshotStamp {
  snapshotVersion: number;
  fetchedAt: string;
}

/**
 * True when a refresh candidate should replace the active snapshot:
 * strictly newer by version, or same version with a newer fetch time.
 * (`fetchedAt` is ISO-8601 UTC, so lexicographic comparison is chronological.)
 */
export function shouldAdoptCandidate(candidate: SnapshotStamp, active: SnapshotStamp): boolean {
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

/** Absolute-path URL of a publication file under the app base. */
function gamedataUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

async function fetchOk(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response;
}

/** Same-origin manifest GET, bypassing the HTTP cache (it is tiny and must be current). */
export async function fetchGamedataManifest(): Promise<unknown> {
  const response = await fetchOk(gamedataUrl(GAMEDATA_MANIFEST_PATH), { cache: 'no-store' });
  return response.json() as Promise<unknown>;
}

/** Payload GET; the name is content-addressed, so normal HTTP caching is safe. */
export async function fetchGamedataPayload(path: string): Promise<string> {
  const response = await fetchOk(gamedataUrl(path));
  return response.text();
}

export interface RefreshActiveSnapshotDeps {
  /** Defaults to the same-origin manifest. Injectable for tests. */
  fetchManifest?: () => Promise<unknown>;
  /** Defaults to the same-origin payload file. Injectable for tests. */
  fetchPayload?: (path: string) => Promise<string>;
  writeRow?: (row: { checksum: string; payload: Snapshot }) => Promise<void>;
}

export type RefreshOutcome =
  | { status: 'updated'; snapshot: Snapshot }
  | { status: 'current'; snapshot: Snapshot };

/**
 * Classified refresh failure. `unavailable` = a fetch threw (network,
 * HTTP, abort); `invalid` = the manifest or payload failed validation
 * (schema, checksum, or a payload that disagrees with its manifest);
 * `newer-than-app` = the publication moved to a snapshot version
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

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Revalidate against the same-origin publication: read the manifest, fetch
 * the payload only when the manifest is strictly newer than `active`, and
 * adopt it after checksum + manifest-consistency + schema checks (invalid
 * data never reaches the cache). Resolves `current` when the active
 * snapshot stays — including when the publication is OLDER than active
 * (silent keep, warning logged). REJECTS with `SnapshotRefreshError` on
 * network/validation failure so the caller can choose its feedback (silent
 * warn for background, toast for manual).
 */
export async function refreshActiveSnapshot(
  active: Snapshot,
  deps: RefreshActiveSnapshotDeps = {},
): Promise<RefreshOutcome> {
  const fetchManifest = deps.fetchManifest ?? fetchGamedataManifest;
  const fetchPayload = deps.fetchPayload ?? fetchGamedataPayload;

  let rawManifest: unknown;
  try {
    rawManifest = await fetchManifest();
  } catch (err) {
    throw new SnapshotRefreshError('unavailable', `game-data manifest request failed: ${describe(err)}`);
  }
  const parsedManifest = gamedataManifestSchema.safeParse(rawManifest);
  if (!parsedManifest.success) {
    throw new SnapshotRefreshError('invalid', 'game-data manifest failed validation');
  }
  const manifest: GamedataManifest = parsedManifest.data;
  if (manifest.snapshotVersion < active.snapshotVersion) {
    console.warn(
      `published snapshot version ${manifest.snapshotVersion} is older than active ${active.snapshotVersion}; keeping current data`,
    );
    return { status: 'current', snapshot: active };
  }
  if (manifest.snapshotVersion > SNAPSHOT_VERSION) {
    throw new SnapshotRefreshError(
      'newer-than-app',
      `published snapshot version ${manifest.snapshotVersion} is newer than this app understands (${SNAPSHOT_VERSION})`,
    );
  }
  // Up to date (the common case): no payload download.
  if (!shouldAdoptCandidate(manifest, active)) return { status: 'current', snapshot: active };

  let payload: string;
  try {
    payload = await fetchPayload(manifest.path);
  } catch (err) {
    throw new SnapshotRefreshError('unavailable', `game-data payload request failed: ${describe(err)}`);
  }
  if (checksumJson(payload) !== manifest.checksum) {
    throw new SnapshotRefreshError('invalid', 'game-data payload failed its checksum');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    throw new SnapshotRefreshError('invalid', 'game-data payload is not JSON');
  }
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SnapshotRefreshError('invalid', 'game-data payload failed validation');
  }
  const candidate = parsed.data;
  if (candidate.snapshotVersion !== manifest.snapshotVersion || candidate.fetchedAt !== manifest.fetchedAt) {
    throw new SnapshotRefreshError('invalid', 'game-data payload does not match its manifest');
  }
  await writeCachedSnapshot(candidate, deps.writeRow);
  return { status: 'updated', snapshot: candidate };
}
