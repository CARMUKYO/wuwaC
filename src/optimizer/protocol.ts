import type { OptimizeRequest, SearchData, SearchResult } from './search.ts';

/**
 * Optimizer layer: worker message protocol.
 * Everything crossing the boundary is plain cloneable data (no functions).
 */

export interface RunMessage {
  type: 'run';
  id: number;
  data: SearchData;
  request: OptimizeRequest;
}

export interface ProgressMessage {
  type: 'progress';
  id: number;
  evaluated: number;
  total: number;
}

export interface ResultMessage {
  type: 'result';
  id: number;
  result: SearchResult;
}

export interface ErrorMessage {
  type: 'error';
  id: number;
  message: string;
}

export type WorkerIn = RunMessage;
export type WorkerOut = ProgressMessage | ResultMessage | ErrorMessage;

/** Narrow an unknown posted message to the protocol. */
export function isWorkerOut(message: unknown): message is WorkerOut {
  if (typeof message !== 'object' || message === null) return false;
  const record = message as Record<string, unknown>;
  if (typeof record.type !== 'string' || typeof record.id !== 'number') return false;
  switch (record.type) {
    case 'progress':
      return typeof record.evaluated === 'number' && typeof record.total === 'number';
    case 'result': {
      if (typeof record.result !== 'object' || record.result === null) return false;
      const result = record.result as Record<string, unknown>;
      return (
        Array.isArray(result.builds) &&
        typeof result.evaluated === 'number' &&
        Array.isArray(result.prunedEchoes)
      );
    }
    case 'error':
      return typeof record.message === 'string';
    default:
      return false;
  }
}

export interface ProgressTracker {
  /** Report progress; the tracker throttles callbacks to `step` granularity. */
  report: (evaluated: number) => void;
  /** Flush a final update (always fires, even below granularity). */
  flush: () => void;
}

/**
 * Throttled progress reporter: `onProgress` fires when the evaluated count
 * lands exactly on a `step` multiple, plus on `flush()` for the tail.
 * Deterministic (no wall clock) — trivially unit-testable.
 */
export function createProgressTracker(
  total: number,
  onProgress: (evaluated: number, total: number) => void,
  step = 1000,
): ProgressTracker {
  if (!Number.isInteger(step) || step < 1) throw new Error(`step must be >= 1, got ${step}`);
  let fired = 0;
  let last = 0;
  return {
    report: (evaluated: number) => {
      last = evaluated;
      if (evaluated > 0 && evaluated % step === 0 && evaluated !== fired) {
        fired = evaluated;
        onProgress(evaluated, total);
      }
    },
    flush: () => {
      if (last > fired) {
        fired = last;
        onProgress(last, total);
      }
    },
  };
}
