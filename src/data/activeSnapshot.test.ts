import 'fake-indexeddb/auto';
import bundledJson from './generated/snapshot.json';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checksumJson,
  defaultValidationMemo,
  loadActiveSnapshot,
  readCachedSnapshot,
  refreshActiveSnapshot,
  selectActiveSnapshot,
  shouldAdoptCandidate,
  SnapshotRefreshError,
  writeCachedSnapshot,
  type ValidationMemo,
  SNAPSHOT_CACHE_ID,
} from './activeSnapshot.ts';
import { buildGamedataPublication } from './gamedataPublication.ts';
import { snapshotSchema, type Snapshot } from './schema.ts';
import { db } from '../state/db.ts';

// The corrupt-bundle tests mock the bundled loader, so fixtures come
// straight from the JSON file instead of `loadBundledSnapshot()`.
vi.mock('./index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('./index.ts')>();
  return { ...original, loadBundledSnapshot: () => { throw new Error('corrupt bundle'); } };
});

// Expected-warning paths are asserted by behavior (fallback selection),
// not by log output — silence them for a clean test report.
vi.spyOn(console, 'warn').mockImplementation(() => {});

const realBundled: Snapshot = snapshotSchema.parse(bundledJson);

/** Small valid snapshot with a controlled fetch time (never the real file's). */
function tinySnapshot(fetchedAt: string): Snapshot {
  return snapshotSchema.parse({
    ...realBundled,
    fetchedAt,
    characters: realBundled.characters.slice(0, 1),
    weapons: realBundled.weapons.slice(0, 1),
    sonataSets: realBundled.sonataSets.slice(0, 1),
    echoDefs: realBundled.echoDefs.slice(0, 1),
  });
}

/** Version override past the zod literal type (older/newer-than-app rows). */
function withVersion(snapshot: Snapshot, snapshotVersion: number): Snapshot {
  return { ...snapshot, snapshotVersion } as unknown as Snapshot;
}

function cacheRowFor(payload: unknown): () => Promise<{ checksum: string; payload: unknown } | undefined> {
  const json = JSON.stringify(payload);
  return () => Promise.resolve({ checksum: checksumJson(json), payload });
}

const missingRow = (): Promise<{ checksum: string; payload: unknown } | undefined> =>
  Promise.resolve(undefined);

beforeEach(async () => {
  await db.gamedataCache.clear();
});

describe('checksumJson', () => {
  it('is the FNV-1a offset basis for the empty string', () => {
    expect(checksumJson('')).toBe('811c9dc5');
  });

  it('is deterministic and content-sensitive', () => {
    expect(checksumJson('{"a":1}')).toBe(checksumJson('{"a":1}'));
    expect(checksumJson('{"a":1}')).not.toBe(checksumJson('{"a":2}'));
  });
});

describe('selectActiveSnapshot', () => {
  const bundled = tinySnapshot('2026-09-19T00:00:00.000Z');

  it('serves the cache when versions match', () => {
    const cached = tinySnapshot('2026-10-01T00:00:00.000Z');
    const active = selectActiveSnapshot(cached, bundled);
    expect(active.source).toBe('cache');
    expect(active.snapshot).toBe(cached);
    expect(active.fetchedAt).toBe('2026-10-01T00:00:00.000Z');
    expect(active.bundledFetchedAt).toBe('2026-09-19T00:00:00.000Z');
  });

  it('falls back to bundled when the cache is missing', () => {
    const active = selectActiveSnapshot(null, bundled);
    expect(active.source).toBe('bundled');
    expect(active.snapshot).toBe(bundled);
  });

  it('falls back to bundled when the cached version is older (post-update downgrade guard)', () => {
    const oldCache = withVersion(tinySnapshot('2026-10-01T00:00:00.000Z'), bundled.snapshotVersion - 1);
    const active = selectActiveSnapshot(oldCache, bundled);
    expect(active.source).toBe('bundled');
    expect(active.snapshot).toBe(bundled);
  });
});

describe('shouldAdoptCandidate', () => {
  const active = tinySnapshot('2026-09-19T00:00:00.000Z');

  it('adopts a same-version candidate with a newer fetch time', () => {
    expect(shouldAdoptCandidate(tinySnapshot('2026-09-20T00:00:00.000Z'), active)).toBe(true);
  });

  it('keeps the active snapshot for same-time or older candidates', () => {
    expect(shouldAdoptCandidate(tinySnapshot('2026-09-19T00:00:00.000Z'), active)).toBe(false);
    expect(shouldAdoptCandidate(tinySnapshot('2026-09-01T00:00:00.000Z'), active)).toBe(false);
  });

  it('adopts a higher version even with an older timestamp, never a lower one', () => {
    const newer = withVersion(tinySnapshot('2026-09-01T00:00:00.000Z'), active.snapshotVersion + 1);
    const older = withVersion(tinySnapshot('2026-10-01T00:00:00.000Z'), active.snapshotVersion - 1);
    expect(shouldAdoptCandidate(newer, active)).toBe(true);
    expect(shouldAdoptCandidate(older, active)).toBe(false);
  });
});

describe('loadActiveSnapshot fallback order', () => {
  const bundled = tinySnapshot('2026-09-19T00:00:00.000Z');

  it('fresh cache wins over bundled', async () => {
    const cached = tinySnapshot('2026-10-01T00:00:00.000Z');
    const active = await loadActiveSnapshot({ bundled, readRow: cacheRowFor(cached) });
    expect(active.source).toBe('cache');
    expect(active.fetchedAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('missing cache falls back to bundled', async () => {
    const active = await loadActiveSnapshot({ bundled, readRow: missingRow });
    expect(active.source).toBe('bundled');
    expect(active.snapshot).toBe(bundled);
  });

  it('an old cache still wins (age never demotes it below bundled)', async () => {
    const oldCache = tinySnapshot('2026-01-01T00:00:00.000Z');
    const active = await loadActiveSnapshot({ bundled, readRow: cacheRowFor(oldCache) });
    expect(active.source).toBe('cache');
  });

  it('version-stale cache falls back to bundled', async () => {
    const oldCache = withVersion(tinySnapshot('2026-10-01T00:00:00.000Z'), bundled.snapshotVersion - 1);
    const active = await loadActiveSnapshot({ bundled, readRow: cacheRowFor(oldCache) });
    expect(active.source).toBe('bundled');
  });

  it('invalid payload falls back to bundled (never served)', async () => {
    const active = await loadActiveSnapshot({ bundled, readRow: cacheRowFor({ bogus: true }) });
    expect(active.source).toBe('bundled');
    expect(active.snapshot).toBe(bundled);
  });

  it('checksum mismatch falls back to bundled (corruption guard)', async () => {
    const cached = tinySnapshot('2026-10-01T00:00:00.000Z');
    const readRow = (): Promise<{ checksum: string; payload: unknown } | undefined> =>
      Promise.resolve({ checksum: 'deadbeef', payload: cached });
    const active = await loadActiveSnapshot({ bundled, readRow });
    expect(active.source).toBe('bundled');
  });

  it('cache read errors fall back to bundled', async () => {
    const readRow = (): Promise<{ checksum: string; payload: unknown } | undefined> =>
      Promise.reject(new Error('IDB exploded'));
    const active = await loadActiveSnapshot({ bundled, readRow });
    expect(active.source).toBe('bundled');
  });

  it('serves the cache when bundled is corrupt (better than a broken page)', async () => {
    const cached = tinySnapshot('2026-10-01T00:00:00.000Z');
    const active = await loadActiveSnapshot({ readRow: cacheRowFor(cached) });
    expect(active.source).toBe('cache');
    expect(active.snapshot.fetchedAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('throws only when bundled AND cache are both unusable', async () => {
    await expect(loadActiveSnapshot({ readRow: missingRow })).rejects.toThrow(/no usable game-data snapshot/);
  });
});

describe('writeCachedSnapshot', () => {
  it('persists valid snapshots with a verifiable checksum', async () => {
    const snapshot = tinySnapshot('2026-10-01T00:00:00.000Z');
    let written: { checksum: string; payload: Snapshot } | null = null;
    await writeCachedSnapshot(snapshot, (row) => {
      written = row;
      return Promise.resolve();
    });
    expect(written).not.toBeNull();
    expect(checksumJson(JSON.stringify(written!.payload))).toBe(written!.checksum);
    expect(written!.payload.fetchedAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('throws on invalid input and writes nothing', async () => {
    let calls = 0;
    await expect(
      writeCachedSnapshot({ bogus: true } as unknown as Snapshot, () => {
        calls += 1;
        return Promise.resolve();
      }),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });
});

describe('Dexie cache round-trip', () => {
  it('writes through the default store and reads back the same snapshot', async () => {
    const snapshot = tinySnapshot('2026-10-01T00:00:00.000Z');
    await writeCachedSnapshot(snapshot);
    const row = await db.gamedataCache.get(SNAPSHOT_CACHE_ID);
    expect(row).toMatchObject({
      id: SNAPSHOT_CACHE_ID,
      fetchedAt: '2026-10-01T00:00:00.000Z',
      provider: 'encore.moe',
      snapshotVersion: snapshot.snapshotVersion,
    });
    expect(await readCachedSnapshot()).toEqual(snapshot);
  });

  it('a directly-corrupted row reads as missing', async () => {
    await writeCachedSnapshot(tinySnapshot('2026-10-01T00:00:00.000Z'));
    await db.gamedataCache.update(SNAPSHOT_CACHE_ID, { checksum: 'deadbeef' });
    expect(await readCachedSnapshot()).toBeNull();
  });

  it('a directly-stored invalid payload reads as missing', async () => {
    const payload = { bogus: true };
    await db.gamedataCache.put({
      id: SNAPSHOT_CACHE_ID,
      fetchedAt: '2026-10-01T00:00:00.000Z',
      provider: 'encore.moe',
      snapshotVersion: 999,
      checksum: checksumJson(JSON.stringify(payload)),
      payload,
    });
    expect(await readCachedSnapshot()).toBeNull();
  });
});

/** In-memory stand-in for the localStorage validation memo. */
function memoryMemo(buildId: string, initial: string | null = null): ValidationMemo & { value: string | null } {
  const memo = {
    buildId,
    value: initial,
    read: () => memo.value,
    write: (value: string) => {
      memo.value = value;
    },
  };
  return memo;
}

describe('cache validation memo', () => {
  const cached = tinySnapshot('2026-10-01T00:00:00.000Z');
  const checksum = checksumJson(JSON.stringify(cached));

  it('is off outside a production build (always validate)', () => {
    expect(defaultValidationMemo()).toBeNull();
  });

  it('validates once per (build, checksum), then skips the schema pass', async () => {
    const memo = memoryMemo('build-A');
    const safeParse = vi.spyOn(snapshotSchema, 'safeParse');
    try {
      expect(await readCachedSnapshot(cacheRowFor(cached), memo)).toEqual(cached);
      expect(memo.value).toBe(`build-A:${checksum}`);
      expect(await readCachedSnapshot(cacheRowFor(cached), memo)).toEqual(cached);
      expect(safeParse).toHaveBeenCalledTimes(1);
    } finally {
      safeParse.mockRestore();
    }
  });

  it('a memo from another build re-validates', async () => {
    const memo = memoryMemo('build-B', `build-A:${checksum}`);
    const safeParse = vi.spyOn(snapshotSchema, 'safeParse');
    try {
      expect(await readCachedSnapshot(cacheRowFor(cached), memo)).toEqual(cached);
      expect(safeParse).toHaveBeenCalledTimes(1);
      expect(memo.value).toBe(`build-B:${checksum}`);
    } finally {
      safeParse.mockRestore();
    }
  });

  it('a memoized checksum never bypasses the checksum check (corrupted payload)', async () => {
    const memo = memoryMemo('build-A', `build-A:${checksum}`);
    const corrupted = { ...cached, provider: 'corrupted' };
    const readRow = (): Promise<{ checksum: string; payload: unknown } | undefined> =>
      Promise.resolve({ checksum, payload: corrupted });
    expect(await readCachedSnapshot(readRow, memo)).toBeNull();
  });

  it('never memoizes an invalid payload', async () => {
    const memo = memoryMemo('build-A');
    expect(await readCachedSnapshot(cacheRowFor({ bogus: true }), memo)).toBeNull();
    expect(memo.value).toBeNull();
  });

  it('an unreadable memo falls back to validating', async () => {
    const memo: ValidationMemo = {
      buildId: 'build-A',
      read: () => {
        throw new Error('storage blocked');
      },
      write: () => {
        throw new Error('storage blocked');
      },
    };
    expect(await readCachedSnapshot(cacheRowFor({ bogus: true }), memo)).toBeNull();
    expect(await readCachedSnapshot(cacheRowFor(cached), memo)).toEqual(cached);
  });

  it('a validated write is memoized, so the next read skips the schema pass', async () => {
    const memo = memoryMemo('build-A');
    let written: { checksum: string; payload: Snapshot } | null = null;
    await writeCachedSnapshot(
      cached,
      (row) => {
        written = row;
        return Promise.resolve();
      },
      memo,
    );
    expect(memo.value).toBe(`build-A:${checksum}`);
    const safeParse = vi.spyOn(snapshotSchema, 'safeParse');
    try {
      expect(await readCachedSnapshot(() => Promise.resolve(written!), memo)).toEqual(cached);
      expect(safeParse).not.toHaveBeenCalled();
    } finally {
      safeParse.mockRestore();
    }
  });
});

describe('refreshActiveSnapshot (same-origin publication)', () => {
  const active = tinySnapshot('2026-09-19T00:00:00.000Z');

  /** A publication for `snapshot`, plus recorders for what the refresh fetched and wrote. */
  function serve(snapshot: unknown, overrides: { manifest?: unknown; payload?: string } = {}) {
    const publication = buildGamedataPublication(snapshot);
    const fetched: string[] = [];
    const written: Snapshot[] = [];
    const deps = {
      fetchManifest: () => Promise.resolve(overrides.manifest ?? publication.manifest),
      fetchPayload: (path: string) => {
        fetched.push(path);
        return Promise.resolve(overrides.payload ?? publication.payload);
      },
      writeRow: (row: { checksum: string; payload: Snapshot }) => {
        written.push(row.payload);
        return Promise.resolve();
      },
    };
    return { publication, fetched, written, deps };
  }

  async function failureOf(promise: Promise<unknown>): Promise<SnapshotRefreshError> {
    const failure = await promise.then(
      () => null,
      (err: unknown) => err,
    );
    expect(failure).toBeInstanceOf(SnapshotRefreshError);
    return failure as SnapshotRefreshError;
  }

  it('adopts and persists a strictly newer publication', async () => {
    const candidate = tinySnapshot('2026-10-01T00:00:00.000Z');
    const { publication, fetched, written, deps } = serve(candidate);
    const outcome = await refreshActiveSnapshot(active, deps);
    expect(outcome).toEqual({ status: 'updated', snapshot: candidate });
    expect(fetched).toEqual([publication.manifest.path]);
    expect(written).toEqual([candidate]);
  });

  it('keeps serving current data for same-time and older publications, without downloading the payload', async () => {
    for (const fetchedAt of ['2026-09-19T00:00:00.000Z', '2026-09-01T00:00:00.000Z']) {
      const { fetched, written, deps } = serve(tinySnapshot(fetchedAt));
      expect(await refreshActiveSnapshot(active, deps)).toEqual({ status: 'current', snapshot: active });
      expect(fetched).toEqual([]);
      expect(written).toEqual([]);
    }
  });

  it('keeps serving current data for an older-version manifest', async () => {
    const { publication } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'));
    const older = { ...publication.manifest, snapshotVersion: active.snapshotVersion - 1 };
    const { fetched, written, deps } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'), { manifest: older });
    expect((await refreshActiveSnapshot(active, deps)).status).toBe('current');
    expect(fetched).toEqual([]);
    expect(written).toEqual([]);
  });

  it('rejects a payload that fails the manifest checksum', async () => {
    const { publication } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'));
    const tampered = publication.payload.replace('"provider":"encore.moe"', '"provider":"elsewhere"');
    expect(tampered).not.toBe(publication.payload);
    const { written, deps } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'), { payload: tampered });
    expect((await failureOf(refreshActiveSnapshot(active, deps))).kind).toBe('invalid');
    expect(written).toEqual([]);
  });

  it('rejects a schema-invalid payload even with a matching checksum', async () => {
    const payload = JSON.stringify({ snapshotVersion: active.snapshotVersion, fetchedAt: '2026-10-01T00:00:00.000Z', bogus: true });
    const { publication } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'));
    const manifest = { ...publication.manifest, checksum: checksumJson(payload) };
    const { written, deps } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'), { manifest, payload });
    const failure = await failureOf(refreshActiveSnapshot(active, deps));
    expect(failure.kind).toBe('invalid');
    expect(failure.message).toMatch(/failed validation/);
    expect(written).toEqual([]);
  });

  it('rejects a valid payload that disagrees with its manifest', async () => {
    const { publication: other } = serve(tinySnapshot('2026-10-02T00:00:00.000Z'));
    const { publication } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'));
    // Manifest claims 10-01 but points at (and checksums) the 10-02 payload.
    const manifest = { ...publication.manifest, checksum: other.manifest.checksum, path: other.manifest.path };
    const { written, deps } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'), { manifest, payload: other.payload });
    expect((await failureOf(refreshActiveSnapshot(active, deps))).message).toMatch(/does not match its manifest/);
    expect(written).toEqual([]);
  });

  it('rejects an invalid manifest (including a path outside gamedata/)', async () => {
    const { publication } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'));
    for (const manifest of [{ bogus: true }, { ...publication.manifest, path: '../evil.json' }]) {
      const { fetched, deps } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'), { manifest });
      expect((await failureOf(refreshActiveSnapshot(active, deps))).kind).toBe('invalid');
      expect(fetched).toEqual([]);
    }
  });

  it('holds out a publication newer than the app, without downloading it', async () => {
    const { publication } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'));
    const manifest = { ...publication.manifest, snapshotVersion: 999 };
    const { fetched, written, deps } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'), { manifest });
    expect((await failureOf(refreshActiveSnapshot(active, deps))).kind).toBe('newer-than-app');
    expect(fetched).toEqual([]);
    expect(written).toEqual([]);
  });

  it('rejects as unavailable when the manifest or the payload request fails', async () => {
    const { deps } = serve(tinySnapshot('2026-10-01T00:00:00.000Z'));
    const noManifest = { ...deps, fetchManifest: () => Promise.reject(new Error('network down')) };
    expect((await failureOf(refreshActiveSnapshot(active, noManifest))).kind).toBe('unavailable');
    const noPayload = { ...deps, fetchPayload: () => Promise.reject(new Error('HTTP 404')) };
    expect((await failureOf(refreshActiveSnapshot(active, noPayload))).kind).toBe('unavailable');
  });

  it('default fetchers hit the same-origin files: manifest uncached, HTTP errors as unavailable', async () => {
    const candidate = tinySnapshot('2026-10-01T00:00:00.000Z');
    const publication = buildGamedataPublication(candidate);
    const requests: { url: string; cache?: RequestCache }[] = [];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      requests.push({ url, cache: init?.cache });
      const body = url.endsWith('manifest.json') ? JSON.stringify(publication.manifest) : publication.payload;
      return Promise.resolve(new Response(body, { status: 200 }));
    });
    try {
      const outcome = await refreshActiveSnapshot(active, { writeRow: () => Promise.resolve() });
      expect(outcome.status).toBe('updated');
      expect(requests).toEqual([
        { url: `${import.meta.env.BASE_URL}gamedata/manifest.json`, cache: 'no-store' },
        { url: `${import.meta.env.BASE_URL}${publication.manifest.path}`, cache: undefined },
      ]);
      vi.stubGlobal('fetch', () => Promise.resolve(new Response('missing', { status: 404 })));
      const failure = await failureOf(refreshActiveSnapshot(active, { writeRow: () => Promise.resolve() }));
      expect(failure.kind).toBe('unavailable');
      expect(failure.message).toMatch(/HTTP 404/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
