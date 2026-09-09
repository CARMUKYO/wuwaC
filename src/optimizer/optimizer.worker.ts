import {
  createProgressTracker,
  type ProgressTracker,
  type WorkerIn,
  type WorkerOut,
} from './protocol.ts';
import { searchExhaustive } from './search.ts';

/**
 * Optimizer layer: Web Worker entry (Vite bundles this as a separate chunk).
 * Thin by design — message in, search out. All logic lives in search.ts and
 * is unit-tested there; this file is verified via the production build.
 */
const workerSelf = self as unknown as {
  onmessage: ((event: { data: WorkerIn }) => void) | null;
  postMessage: (message: WorkerOut) => void;
};

workerSelf.onmessage = (event) => {
  const message = event.data;
  if (message.type !== 'run') return;
  const { id, data, request } = message;
  try {
    // Boxed so TypeScript does not narrow the lazy init across the callback.
    const box: { tracker: ProgressTracker | null } = { tracker: null };
    const result = searchExhaustive(data, request, ({ evaluated, total }) => {
      box.tracker ??= createProgressTracker(total, (e, t) =>
        workerSelf.postMessage({ type: 'progress', id, evaluated: e, total: t }),
      );
      box.tracker.report(evaluated);
    });
    box.tracker?.flush();
    workerSelf.postMessage({ type: 'result', id, result });
  } catch (err) {
    workerSelf.postMessage({
      type: 'error',
      id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
