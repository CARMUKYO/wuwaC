import { createBackup, type Backup } from '../state/backup.ts';

/**
 * UI layer: save a Blob as a file via a temporary object URL.
 *
 * The URL is revoked later, not right after `click()`: some browsers start
 * the download asynchronously and cancel it if the URL is already gone.
 * 40 s matches FileSaver.js; a stray URL for that long costs only memory.
 */
export const REVOKE_DELAY_MS = 40_000;

export function revokeObjectUrlLater(url: string): void {
  const revoke = URL.revokeObjectURL.bind(URL);
  window.setTimeout(() => revoke(url), REVOKE_DELAY_MS);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  revokeObjectUrlLater(url);
}

/** Create a whole-database backup and save it as `wuwa-optimizer-backup-<date>.json`. */
export async function downloadBackup(): Promise<Backup> {
  const backup = await createBackup();
  downloadBlob(
    new Blob([JSON.stringify(backup)], { type: 'application/json' }),
    `wuwa-optimizer-backup-${backup.exportedAt.slice(0, 10)}.json`,
  );
  return backup;
}
