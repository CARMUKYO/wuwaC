import { describe, expect, it, vi } from 'vitest';
import {
  createProgressTracker,
  isWorkerOut,
} from './protocol.ts';
import { runOptimization, type WorkerLike } from './worker.ts';
import type { SearchResult } from './search.ts';
import { emptySheet } from '../domain/stats.ts';

describe('isWorkerOut', () => {
  it('accepts protocol messages and rejects impostors', () => {
    expect(isWorkerOut({ type: 'progress', id: 1, evaluated: 3, total: 56 })).toBe(true);
    expect(
      isWorkerOut({ type: 'result', id: 1, result: { builds: [], evaluated: 0, prunedEchoes: [] } }),
    ).toBe(true);
    expect(isWorkerOut({ type: 'error', id: 1, message: 'boom' })).toBe(true);
    expect(isWorkerOut({ type: 'nope' })).toBe(false);
    expect(isWorkerOut(null)).toBe(false);
    expect(isWorkerOut('progress')).toBe(false);
    expect(isWorkerOut({ type: 'progress', id: 1 })).toBe(false);
  });
});

describe('createProgressTracker', () => {
  it('fires on step boundaries and flushes the tail', () => {
    const onProgress = vi.fn();
    const tracker = createProgressTracker(10, onProgress, 4);
    tracker.report(1);
    tracker.report(3);
    expect(onProgress).not.toHaveBeenCalled();
    tracker.report(4);
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenLastCalledWith(4, 10);
    tracker.report(9);
    expect(onProgress).toHaveBeenCalledTimes(1);
    tracker.flush();
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(9, 10);
  });
});

class FakeWorker implements WorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  terminated = false;
  posted: unknown[] = [];

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  deliver(data: unknown): void {
    this.onmessage?.({ data });
  }
}

const canned: SearchResult = {
  builds: [{ echoIds: ['a', 'b', 'c', 'd', 'e'], score: 42, sheet: emptySheet(), warnings: [] }],
  evaluated: 56,
  prunedEchoes: [],
};

describe('runOptimization', () => {
  it('posts the run, forwards progress, and resolves the result', async () => {
    const fake = new FakeWorker();
    const handle = runOptimization(
      { character: 'c' } as never,
      { topN: 5 } as never,
      { createWorker: () => fake },
    );
    expect(fake.posted).toHaveLength(1);
    expect(fake.posted[0]).toMatchObject({ type: 'run' });

    const onProgress = vi.fn();
    handle.onProgress(onProgress);
    const id = (fake.posted[0] as { id: number }).id;
    fake.deliver({ type: 'progress', id, evaluated: 3, total: 56 });
    expect(onProgress).toHaveBeenCalledWith(3, 56);

    fake.deliver({ type: 'result', id, result: canned });
    await expect(handle.promise).resolves.toBe(canned);
    expect(fake.terminated).toBe(true);
  });

  it('rejects on worker errors and ignores stale ids', async () => {
    const fake = new FakeWorker();
    const handle = runOptimization({} as never, {} as never, { createWorker: () => fake });
    const id = (fake.posted[0] as { id: number }).id;

    fake.deliver({ type: 'progress', id: 9999, evaluated: 1, total: 2 });
    fake.deliver({ type: 'error', id, message: 'boom' });
    await expect(handle.promise).rejects.toThrow('boom');
  });

  it('cancel terminates without settling', async () => {
    const fake = new FakeWorker();
    const handle = runOptimization({} as never, {} as never, { createWorker: () => fake });
    let settled = false;
    void handle.promise.then(
      () => { settled = true; },
      () => { settled = true; },
    );
    handle.cancel();
    expect(fake.terminated).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(settled).toBe(false);
  });
});
