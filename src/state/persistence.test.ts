import { describe, expect, it, vi } from 'vitest';
import { requestPersistentStorage, storageStatus } from './persistence.ts';

function fakeStorage(persisted: boolean, grant: boolean) {
  return {
    persisted: vi.fn(() => Promise.resolve(persisted)),
    persist: vi.fn(() => Promise.resolve(grant)),
  };
}

describe('persistent storage', () => {
  it('reports unsupported when the Storage API is absent', async () => {
    expect(await storageStatus(undefined)).toBe('unsupported');
    expect(await requestPersistentStorage(undefined)).toBe('unsupported');
  });

  it('does not re-request when already persistent', async () => {
    const storage = fakeStorage(true, false);
    expect(await requestPersistentStorage(storage)).toBe('persistent');
    expect(storage.persist).not.toHaveBeenCalled();
  });

  it('maps a grant / denial to persistent / best-effort', async () => {
    expect(await requestPersistentStorage(fakeStorage(false, true))).toBe('persistent');
    expect(await requestPersistentStorage(fakeStorage(false, false))).toBe('best-effort');
    expect(await storageStatus(fakeStorage(false, true))).toBe('best-effort');
  });

  it('treats API errors as best-effort instead of throwing', async () => {
    const storage = { persisted: () => Promise.reject(new Error('nope')), persist: () => Promise.resolve(true) };
    expect(await requestPersistentStorage(storage)).toBe('best-effort');
    expect(await storageStatus(storage)).toBe('best-effort');
  });
});
