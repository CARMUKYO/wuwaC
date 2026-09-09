import type { RunMessage } from './protocol.ts';
import { isWorkerOut } from './protocol.ts';
import type { OptimizeRequest, SearchData, SearchResult } from './search.ts';

/**
 * Optimizer layer: Web Worker host.
 * Runs the search off the main thread; terminate-on-new-run keeps one
 * search alive at a time. The worker factory is injectable so the dispatch
 * logic is unit-testable without a real Worker (jsdom has none).
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
}

/** Post a search to a worker; resolves with its result, rejects on error. */
export function runOptimization(
  data: SearchData,
  request: OptimizeRequest,
  deps: RunOptimizationDeps = {},
): OptimizationHandle {
  const createWorker = deps.createWorker ?? defaultCreateWorker;
  const worker = createWorker();
  const id = nextId();
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
    worker.terminate();
    action();
  };

  worker.onmessage = (event) => {
    const message = event.data;
    if (!isWorkerOut(message) || message.id !== id) return;
    if (message.type === 'progress') {
      progressCallback?.(message.evaluated, message.total);
    } else if (message.type === 'result') {
      finish(() => resolvePromise(message.result));
    } else {
      finish(() => rejectPromise(new Error(message.message)));
    }
  };
  worker.onerror = (event) => {
    finish(() => rejectPromise(new Error(event.message)));
  };
  const runMessage: RunMessage = { type: 'run', id, data, request };
  worker.postMessage(runMessage);

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
