import { Component, type ErrorInfo, type ReactNode } from 'react';
import { downloadBackup } from '../download.ts';
import { btnOutline, btnPrimary } from './classes.ts';

type BackupState = 'idle' | 'busy' | 'done' | { failed: string };

interface ErrorBoundaryState {
  error: Error | null;
  backup: BackupState;
}

/**
 * Catches render errors so one broken view can't blank the app. The
 * fallback keeps the user's data reachable: Export backup works without
 * any of the crashed UI. `resetKey` clears the error when it changes (pass
 * the active section so navigating away recovers).
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: unknown }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, backup: 'idle' };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error: error instanceof Error ? error : new Error(String(error)), backup: 'idle' };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Render error caught by ErrorBoundary', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: unknown }): void {
    if (this.state.error !== null && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleBackup = async (): Promise<void> => {
    this.setState({ backup: 'busy' });
    try {
      await downloadBackup();
      this.setState({ backup: 'done' });
    } catch (err) {
      this.setState({ backup: { failed: err instanceof Error ? err.message : String(err) } });
    }
  };

  render(): ReactNode {
    const { error, backup } = this.state;
    if (error === null) return this.props.children;
    return (
      <section
        role="alert"
        aria-labelledby="error-boundary-title"
        className="px-frame mx-auto my-6 max-w-2xl bg-panel p-4"
      >
        <h2 id="error-boundary-title" className="font-display text-2xl font-bold text-ink">
          Something broke
        </h2>
        <p className="mt-2 text-sm text-fog">
          This view hit an error. Your data is still saved in this browser; export a backup if you want a
          copy before reloading.
        </p>
        <pre className="mt-3 overflow-x-auto border-2 border-ember/40 bg-ember-wash px-3 py-2 text-xs whitespace-pre-wrap text-ember-ink">
          {error.message || error.name}
        </pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void this.handleBackup()}
            disabled={backup === 'busy'}
            className={btnPrimary}
          >
            Export backup
          </button>
          <button type="button" onClick={() => this.setState({ error: null })} className={btnOutline}>
            Try again
          </button>
          <button type="button" onClick={() => window.location.reload()} className={btnOutline}>
            Reload
          </button>
        </div>
        {backup === 'done' && (
          <p role="status" className="mt-3 text-sm text-tide">
            Backup downloaded.
          </p>
        )}
        {typeof backup === 'object' && (
          <p className="mt-3 text-sm text-ember-ink">Backup failed: {backup.failed}</p>
        )}
      </section>
    );
  }
}
