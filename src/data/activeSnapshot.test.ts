import 'fake-indexeddb/auto';
import bundledJson from './generated/snapshot.json';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checksumJson,
  isSnapshotStale,
  loadActiveSnapshot,
  readCachedSnapshot,
  refreshActiveSnapshot,
  selectActiveSnapshot,
  shouldAdoptCandidate,
  SnapshotRefreshError,
  writeCachedSnapshot,
  SNAPSHOT_CACHE_ID,
  SNAPSHOT_STALE_AFTER_DAYS,
} from './activeSnapshot.ts';
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

describe('isSnapshotStale', () => {
  const nowMs = Date.parse('2026-10-03T00:00:00.000Z');
  const daysAgo = (days: number): string =>
    new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString();

  it(`treats snapshots younger than ${SNAPSHOT_STALE_AFTER_DAYS} days as fresh`, () => {
    expect(isSnapshotStale(daysAgo(0), nowMs)).toBe(false);
    expect(isSnapshotStale(daysAgo(6), nowMs)).toBe(false);
  });

  it('treats snapshots past the threshold as stale', () => {
    expect(isSnapshotStale(daysAgo(8), nowMs)).toBe(true);
    expect(isSnapshotStale(daysAgo(30), nowMs)).toBe(true);
  });

  it('treats an unparsable timestamp as stale (revalidate, never serve blind)', () => {
    expect(isSnapshotStale('not-a-date', nowMs)).toBe(true);
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

  it('age-stale cache still wins (age triggers revalidation, never demotion)', async () => {
    const oldCache = tinySnapshot('2026-01-01T00:00:00.000Z');
    expect(isSnapshotStale(oldCache.fetchedAt)).toBe(true);
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

describe('refreshActiveSnapshot', () => {
  const active = tinySnapshot('2026-09-19T00:00:00.000Z');

  it('adopts and persists a strictly newer candidate', async () => {
    const candidate = tinySnapshot('2026-10-01T00:00:00.000Z');
    let persisted: Snapshot | null = null;
    const outcome = await refreshActiveSnapshot(active, {
      fetchSnapshot: () => Promise.resolve(candidate),
      writeRow: (row) => {
        persisted = row.payload;
        return Promise.resolve();
      },
    });
    expect(outcome).toEqual({ status: 'updated', snapshot: candidate });
    expect(persisted).toEqual(candidate);
  });

  it('keeps serving current data for same-time and older candidates (no write)', async () => {
    for (const fetchedAt of ['2026-09-19T00:00:00.000Z', '2026-09-01T00:00:00.000Z']) {
      let calls = 0;
      const outcome = await refreshActiveSnapshot(active, {
        fetchSnapshot: () => Promise.resolve(tinySnapshot(fetchedAt)),
        writeRow: () => {
          calls += 1;
          return Promise.resolve();
        },
      });
      expect(outcome).toEqual({ status: 'current', snapshot: active });
      expect(calls).toBe(0);
    }
  });

  it('keeps serving current data for an older-version candidate', async () => {
    let calls = 0;
    const outcome = await refreshActiveSnapshot(active, {
      fetchSnapshot: () => Promise.resolve(withVersion(active, active.snapshotVersion - 1)),
      writeRow: () => {
        calls += 1;
        return Promise.resolve();
      },
    });
    expect(outcome.status).toBe('current');
    expect(calls).toBe(0);
  });

  it('rejects as unavailable on provider failure without persisting (caller chooses feedback)', async () => {
    let calls = 0;
    const failure = await refreshActiveSnapshot(active, {
      fetchSnapshot: () => Promise.reject(new Error('network down')),
      writeRow: () => {
        calls += 1;
        return Promise.resolve();
      },
    }).then(
      () => null,
      (err: unknown) => err,
    );
    expect(failure).toBeInstanceOf(SnapshotRefreshError);
    expect((failure as SnapshotRefreshError).kind).toBe('unavailable');
    expect(calls).toBe(0);
  });

  it('rejects as invalid on corrupt provider payloads without persisting', async () => {
    let calls = 0;
    const failure = await refreshActiveSnapshot(active, {
      fetchSnapshot: () => Promise.resolve({ bogus: true } as unknown as Snapshot),
      writeRow: () => {
        calls += 1;
        return Promise.resolve();
      },
    }).then(
      () => null,
      (err: unknown) => err,
    );
    expect(failure).toBeInstanceOf(SnapshotRefreshError);
    expect((failure as SnapshotRefreshError).kind).toBe('invalid');
    expect(calls).toBe(0);
  });

  it('rejects as newer-than-app when the provider outruns the app schema', async () => {
    let calls = 0;
    const candidate = withVersion(tinySnapshot('2026-10-01T00:00:00.000Z'), 999);
    const failure = await refreshActiveSnapshot(active, {
      fetchSnapshot: () => Promise.resolve(candidate),
      writeRow: () => {
        calls += 1;
        return Promise.resolve();
      },
    }).then(
      () => null,
      (err: unknown) => err,
    );
    expect(failure).toBeInstanceOf(SnapshotRefreshError);
    expect((failure as SnapshotRefreshError).kind).toBe('newer-than-app');
    expect(calls).toBe(0);
  });
});
