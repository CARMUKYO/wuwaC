import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BACKUP_FORMAT } from '../../state/backup.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error('kaboom in render');
  return <p>healthy view</p>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy view')).toBeInTheDocument();
  });

  it('shows the error with reload and backup export instead of a blank page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const createObjectURL = vi.fn((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob);
      return 'blob:backup';
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });

    render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('kaboom in render');
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /export backup/i }));
    expect(await screen.findByText(/backup downloaded/i)).toBeInTheDocument();
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatch(/^wuwa-optimizer-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const blob = createObjectURL.mock.calls[0][0];
    expect((JSON.parse(await blob.text()) as { format: string }).format).toBe(BACKUP_FORMAT);
  });

  it('recovers when resetKey changes (e.g. switching section)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary resetKey="calculator">
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <ErrorBoundary resetKey="inventory">
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy view')).toBeInTheDocument();
  });
});
