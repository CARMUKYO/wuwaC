import { useEffect, useState } from 'react';
import { LEGACY_SITE_URL } from '../../site.ts';
import { hasUserData } from '../../state/db.ts';
import { useAppStore } from '../../state/store.ts';
import { movedTarget } from '../movedMode.ts';
import { btnGhost, btnPrimary } from './classes.ts';
import { Alert } from './ui.tsx';

/** Per-browser dismissal, under the app's `wuwa-*` localStorage prefix. */
export const IMPORT_HINT_KEY = 'wuwa-import-hint-dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(IMPORT_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    localStorage.setItem(IMPORT_HINT_KEY, '1');
  } catch {
    // Private mode: the hint just comes back next visit.
  }
}

/**
 * First-run hint for people arriving from the old address: an empty database
 * plus a pointer to the backup restore. Never shown on the moved (old) site,
 * on the old origin itself, once data exists, or after it was dismissed.
 * Emptiness is re-checked when the section changes, so it goes away after a
 * restore; it is hidden on the Database page where the restore lives.
 */
export function ImportHint() {
  const activeSection = useAppStore((s) => s.activeSection);
  const setActiveSection = useAppStore((s) => s.setActiveSection);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [empty, setEmpty] = useState(false);
  const applicable = movedTarget() === null && window.location.origin !== new URL(LEGACY_SITE_URL).origin;

  useEffect(() => {
    if (!applicable || dismissed) return;
    let live = true;
    hasUserData()
      .then((has) => {
        if (live) setEmpty(!has);
      })
      .catch(() => {
        if (live) setEmpty(false);
      });
    return () => {
      live = false;
    };
  }, [applicable, dismissed, activeSection]);

  if (!applicable || dismissed || !empty || activeSection === 'database') return null;

  return (
    <Alert tone="info" role="status" className="mb-4">
      <p>
        Coming from{' '}
        <a href={LEGACY_SITE_URL} rel="noopener" className="font-bold text-accent-text underline">
          {LEGACY_SITE_URL.replace(/^https:\/\//, '')}
        </a>
        ? Export a backup there, then restore it here.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => setActiveSection('database')} className={btnPrimary}>
          Import your backup
        </button>
        <button
          type="button"
          onClick={() => {
            rememberDismissal();
            setDismissed(true);
          }}
          className={btnGhost}
        >
          Dismiss
        </button>
      </div>
    </Alert>
  );
}
