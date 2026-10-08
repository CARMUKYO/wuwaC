import { create } from 'zustand';
import {
  isSnapshotStale,
  loadActiveSnapshot,
  refreshActiveSnapshot,
  type RefreshOutcome,
  type SnapshotSource,
} from '../data/activeSnapshot.ts';
import { loadBundledSnapshot } from '../data/index.ts';
import type { Snapshot } from '../data/schema.ts';

/**
 * React bridge for the runtime snapshot layer (`data/activeSnapshot.ts`).
 *
 * The store seeds synchronously from the bundled snapshot so every page
 * renders real content on its first paint (no flash, no skeleton wait for
 * a ~millisecond cache read), then `ensureLoaded()` resolves the IndexedDB
 * cache in the background and swaps in place when a usable cache wins.
 * Domain/optimizer code keeps receiving the plain `Snapshot` object —
 * reactivity stops at this store.
 *
 * Background revalidation: the first `ensureLoaded()` that finds a stale
 * active snapshot fires ONE silent provider refresh for the session
 * (fire-and-forget — it never blocks load or interaction). Any failure
 * keeps serving the current snapshot with a console warning. Manual
 * "Check for updates" goes through `refresh()` and reports its outcome to
 * the caller for toast feedback. Concurrent refreshes share one provider
 * sync (a full sync is ~370 sequential requests — never run two).
 */

interface SnapshotStoreState {
  snapshot: Snapshot;
  source: SnapshotSource;
  /** True until the cache has been consulted (content renders meanwhile). */
  resolving: boolean;
  /** True while a manual refresh is in flight (button busy state). */
  refreshing: boolean;
  /** ISO time of the last completed check (auto or manual), if any. */
  lastCheckedAt: string | null;
  /** Resolve cache -> bundled once; triggers one background refresh if stale. */
  ensureLoaded: () => Promise<void>;
  /**
   * Explicit provider revalidation. Resolves the outcome for toast
   * feedback; REJECTS on network/validation failure (still serving the
   * current snapshot — the caller toasts, nothing blocks).
   */
  refresh: () => Promise<RefreshOutcome>;
}

function seedState(): Pick<
  SnapshotStoreState,
  'snapshot' | 'source' | 'resolving' | 'refreshing' | 'lastCheckedAt'
> {
  return {
    snapshot: loadBundledSnapshot(),
    source: 'bundled',
    resolving: true,
    refreshing: false,
    lastCheckedAt: null,
  };
}

let loadPromise: Promise<void> | null = null;
let refreshPromise: Promise<RefreshOutcome> | null = null;
let autoRefreshAttempted = false;

/** Test-only reset for the module-level once-per-session guards. */
export function resetSnapshotStoreForTests(): void {
  loadPromise = null;
  refreshPromise = null;
  autoRefreshAttempted = false;
  useSnapshotStore.setState(seedState());
}

/** One provider sync shared by concurrent auto/manual refresh callers. */
function sharedRefresh(active: Snapshot): Promise<RefreshOutcome> {
  refreshPromise ??= refreshActiveSnapshot(active).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export const useSnapshotStore = create<SnapshotStoreState>()((set, get) => ({
  ...seedState(),

  ensureLoaded: () => {
    loadPromise ??= (async () => {
      // Identity guard: a manual refresh may have replaced the seed while
      // the cache read was in flight — apply the fallback result only if
      // the store is untouched (a refresh always sets a new object).
      const seed = get().snapshot;
      try {
        const active = await loadActiveSnapshot();
        if (get().snapshot === seed) {
          set({ snapshot: active.snapshot, source: active.source });
        }
        const current = get().snapshot;
        if (!autoRefreshAttempted && isSnapshotStale(current.fetchedAt)) {
          autoRefreshAttempted = true;
          void sharedRefresh(current).then(
            (outcome) => {
              set({ lastCheckedAt: new Date().toISOString() });
              if (outcome.status === 'updated') {
                set({ snapshot: outcome.snapshot, source: 'cache' });
                console.info(`game data refreshed in the background (${outcome.snapshot.fetchedAt})`);
              }
            },
            (err: unknown) => {
              console.warn('background game-data refresh failed; keeping current data', err);
            },
          );
        }
      } catch (err) {
        console.warn('could not resolve game data; keeping bundled data', err);
      } finally {
        set({ resolving: false });
      }
    })();
    return loadPromise;
  },

  refresh: async () => {
    set({ refreshing: true });
    try {
      // Re-resolve the fallback first: a manual check seconds after load
      // must compare against the cache when the cache wins, not the seed.
      const active = await loadActiveSnapshot();
      const outcome = await sharedRefresh(active.snapshot);
      set({ lastCheckedAt: new Date().toISOString() });
      if (outcome.status === 'updated') {
        set({ snapshot: outcome.snapshot, source: 'cache' });
      }
      return outcome;
    } finally {
      set({ refreshing: false });
    }
  },
}));
