/**
 * Ask the browser to keep this origin's IndexedDB out of storage-pressure
 * eviction. On a public host (GitHub Pages) user data lives only in the
 * visitor's browser, so "best-effort" storage can silently disappear.
 */
export type StorageStatus = 'persistent' | 'best-effort' | 'unsupported';

type StorageLike = Pick<StorageManager, 'persist' | 'persisted'>;

function defaultStorage(): StorageLike | undefined {
  return typeof navigator !== 'undefined' && navigator.storage?.persist !== undefined ? navigator.storage : undefined;
}

/** Current status without prompting. */
export async function storageStatus(storage: StorageLike | undefined = defaultStorage()): Promise<StorageStatus> {
  if (storage === undefined) return 'unsupported';
  try {
    return (await storage.persisted()) ? 'persistent' : 'best-effort';
  } catch {
    return 'best-effort';
  }
}

/**
 * Request persistence (idempotent; browsers may grant silently, prompt, or
 * deny based on engagement). Never throws.
 */
export async function requestPersistentStorage(
  storage: StorageLike | undefined = defaultStorage(),
): Promise<StorageStatus> {
  if (storage === undefined) return 'unsupported';
  try {
    if (await storage.persisted()) return 'persistent';
    return (await storage.persist()) ? 'persistent' : 'best-effort';
  } catch {
    return 'best-effort';
  }
}
