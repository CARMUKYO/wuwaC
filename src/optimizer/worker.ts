import type { RunMessage } from './protocol.ts';
import { isWorkerOut } from './protocol.ts';
import { mergeShardResults, type OptimizeRequest, type SearchData, type SearchResult } from './search.ts';

/**
 * Optimizer layer: Web Worker host.
 * Runs the search off the main thread, split into deterministic shards
 * across several workers (`searchExhaustive`'s `shard`), and merges their
 * top-N lists into the single-run result. Cancel, or a new run replacing
 * this one, terminates every worker. The worker factory is injectable so
 * the dispatch logic is unit-testable without a real Worker (jsdom has none).
 */

export interface WorkerLike {
  postMessage: (message: unknown) => void;
  terminate: () => void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { message: string }) => void) | null;
}

export interface OptimizationHandle {
  promise: Promise<SearchResult>;
  cancel: () => void;
  onProgress: (callback: (evaluated: number, total: number) => void) => void;
}

export interface RunOptimizationDeps {
  createWorker?: () => WorkerLike;
  /** Worker count; defaults to `defaultConcurrency` for this pool and device. */
  concurrency?: number;
}

/** Pools this small finish in well under a second on one worker. */
const SMALL_POOL = 40;
const MAX_WORKERS = 8;

/**
 * Workers for a pool of `poolSize` echoes: one for small pools, else one per
 * logical core minus one for the page, capped at 8.
 */
export function defaultConcurrency(poolSize: number, hardwareConcurrency: number | undefined): number {
  if (poolSize < SMALL_POOL) return 1;
  return Math.min(MAX_WORKERS, Math.max(1, (hardwareConcurrency ?? 2) - 1));
}

/** Post a search to worker shards; resolves with the merged result, rejects on any error. */
export function runOptimization(
  data: SearchData,
  request: OptimizeRequest,
  deps: RunOptimizationDeps = {},
): OptimizationHandle {
  const createWorker = deps.createWorker ?? defaultCreateWorker;
  const cores = typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency;
  const count = Math.max(1, Math.floor(deps.concurrency ?? defaultConcurrency(data.echoes.length, cores)));
  const id = nextId();
  const workers: WorkerLike[] = [];
  const covered = new Array<number>(count).fill(0);
  const results = new Array<SearchResult | null>(count).fill(null);
  let total = 0;
  let progressCallback: ((evaluated: number, total: number) => void) | null = null;
  let settled = false;
  let resolvePromise!: (result: SearchResult) => void;
  let rejectPromise!: (error: Error) => void;
  const promise = new Promise<SearchResult>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const finish = (action: () => void): void => {
    if (settled) return;
    settled = true;
    for (const worker of workers) worker.terminate();
    action();
  };

  for (let index = 0; index < count; index += 1) {
    const worker = createWorker();
    workers.push(worker);
    worker.onmessage = (event) => {
      const message = event.data;
      if (settled || !isWorkerOut(message) || message.id !== id) return;
      if (message.type === 'progress') {
        covered[index] = message.evaluated;
        total = message.total;
        progressCallback?.(covered.reduce((sum, c) => sum + c, 0), total);
      } else if (message.type === 'result') {
        results[index] = message.result;
        if (results.every((r) => r !== null)) {
          const done = results as SearchResult[];
          const merged = count === 1 ? done[0] : mergeShardResults(data, request.topN, done);
          finish(() => resolvePromise(merged));
        }
      } else {
        finish(() => rejectPromise(new Error(message.message)));
      }
    };
    worker.onerror = (event) => {
      finish(() => rejectPromise(new Error(event.message)));
    };
    const runMessage: RunMessage = { type: 'run', id, data, request, shard: { index, count } };
    worker.postMessage(runMessage);
  }

  return {
    promise,
    cancel: () => {
      finish(() => undefined);
    },
    onProgress: (callback) => {
      progressCallback = callback;
    },
  };
}

function defaultCreateWorker(): WorkerLike {
  const worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), { type: 'module' });
  return worker as unknown as WorkerLike;
}

let lastId = 0;
function nextId(): number {
  lastId += 1;
  return lastId;
}
