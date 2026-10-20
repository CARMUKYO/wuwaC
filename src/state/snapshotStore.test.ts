import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SnapshotRefreshError, writeCachedSnapshot } from '../data/activeSnapshot.ts';
import { buildGamedataPublication } from '../data/gamedataPublication.ts';
import { loadBundledSnapshot } from '../data/index.ts';
import { db } from './db.ts';
import { resetSnapshotStoreForTests, useSnapshotStore } from './snapshotStore.ts';

/**
 * Store wiring over the data-layer policy: bundled seed, cache resolution,
 * one silent background manifest check per session, manual refresh. The
 * same-origin publication is a stub fetch — never real network.
 */

vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

function rejectFetch(): void {
  vi.stubGlobal('fetch', () => Promise.reject(new Error('offline in tests')));
}

/** Serve `snapshot` as the same-origin publication; returns the requested URLs. */
function servePublication(snapshot: unknown): string[] {
  const { manifest, payload } = buildGamedataPublication(snapshot);
  const seen: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    seen.push(String(url));
    if (url === `${import.meta.env.BASE_URL}gamedata/manifest.json`) {
      return Promise.resolve(new Response(JSON.stringify(manifest)));
    }
    if (url === `${import.meta.env.BASE_URL}${manifest.path}`) return Promise.resolve(new Response(payload));
    return Promise.resolve(new Response('not found', { status: 404 }));
  });
  return seen;
}

beforeEach(async () => {
  await db.gamedataCache.clear();
  resetSnapshotStoreForTests();
  rejectFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('snapshot store', () => {
  it('seeds synchronously from the bundled snapshot (first paint has content)', () => {
    const state = useSnapshotStore.getState();
    expect(state.source).toBe('bundled');
    expect(state.resolving).toBe(true);
    expect(state.snapshot.fetchedAt).toBe(loadBundledSnapshot().fetchedAt);
    expect(state.snapshot.characters.length).toBeGreaterThan(0);
  });

  it('ensureLoaded resolves to bundled when the cache is empty', async () => {
    await useSnapshotStore.getState().ensureLoaded();
    const state = useSnapshotStore.getState();
    expect(state.source).toBe('bundled');
    expect(state.resolving).toBe(false);
    expect(state.snapshot.fetchedAt).toBe(loadBundledSnapshot().fetchedAt);
  });

  it('ensureLoaded swaps in a usable cache', async () => {
    const cachedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await writeCachedSnapshot({ ...loadBundledSnapshot(), fetchedAt: cachedAt });

    await useSnapshotStore.getState().ensureLoaded();
    const state = useSnapshotStore.getState();
    expect(state.source).toBe('cache');
    expect(state.resolving).toBe(false);
    expect(state.snapshot.fetchedAt).toBe(cachedAt);
  });

  it('checks the manifest once per session and keeps serving when that fails', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      seen.push(String(url));
      return Promise.reject(new Error('offline in tests'));
    });
    const cachedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await writeCachedSnapshot({ ...loadBundledSnapshot(), fetchedAt: cachedAt });

    await useSnapshotStore.getState().ensureLoaded();
    await useSnapshotStore.getState().ensureLoaded();
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    // Fresh data is checked too (no age gate), but only once.
    expect(seen).toEqual([`${import.meta.env.BASE_URL}gamedata/manifest.json`]);
    const state = useSnapshotStore.getState();
    expect(state.source).toBe('cache');
    expect(state.snapshot.fetchedAt).toBe(cachedAt);
    expect(state.lastCheckedAt).toBeNull();
  });

  it('adopts a newer publication in the background, same-origin only', async () => {
    const newerAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const seen = servePublication({ ...loadBundledSnapshot(), fetchedAt: newerAt });

    await useSnapshotStore.getState().ensureLoaded();
    await vi.waitFor(() => expect(useSnapshotStore.getState().snapshot.fetchedAt).toBe(newerAt));
    const state = useSnapshotStore.getState();
    expect(state.source).toBe('cache');
    expect(state.lastCheckedAt).not.toBeNull();
    expect((await db.gamedataCache.get('active'))?.fetchedAt).toBe(newerAt);
    expect(seen.every((url) => url.startsWith(`${import.meta.env.BASE_URL}gamedata/`))).toBe(true);
    expect(seen.some((url) => url.includes('encore.moe'))).toBe(false);
  });

  it('manual refresh rejects as unavailable offline and keeps serving bundled', async () => {
    const failure = await useSnapshotStore.getState().refresh().then(
      () => null,
      (err: unknown) => err,
    );
    expect(failure).toBeInstanceOf(SnapshotRefreshError);
    expect((failure as SnapshotRefreshError).kind).toBe('unavailable');
    const state = useSnapshotStore.getState();
    expect(state.refreshing).toBe(false);
    expect(state.source).toBe('bundled');
    expect(state.snapshot.fetchedAt).toBe(loadBundledSnapshot().fetchedAt);
  });

  it('manual refresh reports "current" when the publication is what we serve', async () => {
    const seen = servePublication(loadBundledSnapshot());
    const outcome = await useSnapshotStore.getState().refresh();
    expect(outcome.status).toBe('current');
    expect(useSnapshotStore.getState().source).toBe('bundled');
    expect(useSnapshotStore.getState().lastCheckedAt).not.toBeNull();
    // Up to date: the manifest alone answered it.
    expect(seen).toEqual([`${import.meta.env.BASE_URL}gamedata/manifest.json`]);
  });

  it('manual refresh adopts, persists, and serves a newer publication', async () => {
    const newerAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    servePublication({ ...loadBundledSnapshot(), fetchedAt: newerAt });

    const outcome = await useSnapshotStore.getState().refresh();
    expect(outcome.status).toBe('updated');
    const state = useSnapshotStore.getState();
    expect(state.source).toBe('cache');
    expect(state.refreshing).toBe(false);
    expect(state.snapshot.fetchedAt).toBe(newerAt);
    expect(state.lastCheckedAt).not.toBeNull();
    const row = await db.gamedataCache.get('active');
    expect(row?.fetchedAt).toBe(newerAt);
  });
});
