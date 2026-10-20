import { useState } from 'react';
import { movedShareUrl } from '../../site.ts';
import { useAppStore } from '../../state/store.ts';
import { downloadBackup } from '../download.ts';
import { movedTarget } from '../movedMode.ts';
import { btnOutline, btnPrimary } from './classes.ts';
import { Alert } from './ui.tsx';

/**
 * Persistent notice on the old origin: the app still works normally, but the
 * data lives in this browser's storage for THIS origin, so the way across is
 * export here, import there. A `#b=` share link pending in this tab gets an
 * "Open on the new site" link carrying the same fragment.
 */
export function MovedBanner() {
  const target = movedTarget();
  const shareLink = useAppStore((s) => s.shareLink);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'done' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  if (target === null) return null;
  const shareUrl = movedShareUrl(target, shareLink);
  const site = new URL(target).host + new URL(target).pathname;

  const handleExport = async (): Promise<void> => {
    try {
      await downloadBackup();
      setState({ kind: 'done' });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Could not create the backup.' });
    }
  };

  return (
    <Alert tone="info" role="status" className="mb-4">
      <p>
        <span className="font-bold">WuWa Optimizer has moved to </span>
        <a href={target} rel="noopener" className="font-bold text-accent-text underline">
          {site}
        </a>
        . Your Echoes and builds are stored in this browser for this address only: export a backup here, then import it
        there (Database page, “Restore from backup”).
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void handleExport()} className={btnPrimary}>
          Export backup
        </button>
        <a href={target} rel="noopener" className={btnOutline}>
          Go to the new site
        </a>
        {shareUrl !== null && (
          <a href={shareUrl} rel="noopener" className={btnOutline}>
            Open this shared build on the new site
          </a>
        )}
      </div>
      {state.kind === 'done' && <p className="mt-2">Backup downloaded. Import it on the new site.</p>}
      {state.kind === 'error' && <p className="mt-2 text-ember-ink">{state.message}</p>}
    </Alert>
  );
}
