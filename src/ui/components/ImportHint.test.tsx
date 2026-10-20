import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../state/db.ts';
import { useAppStore } from '../../state/store.ts';
import { IMPORT_HINT_KEY, ImportHint } from './ImportHint.tsx';

/** In-memory Storage: Node's own experimental `localStorage` global can shadow jsdom's. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

async function clearUserData(): Promise<void> {
  await Promise.all([db.ownedEchoes.clear(), db.roster.clear(), db.builds.clear(), db.teams.clear()]);
}

beforeEach(async () => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubEnv('VITE_MOVED_TO', '');
  useAppStore.setState({ activeSection: 'inventory' });
  await clearUserData();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('ImportHint', () => {
  it('shows for an empty database and sends the user to the restore on the Database page', async () => {
    const user = userEvent.setup();
    render(<ImportHint />);
    expect(await screen.findByRole('status')).toHaveTextContent(/coming from carmukyo\.github\.io\/wuwaC/i);
    expect(screen.getByRole('link', { name: /carmukyo\.github\.io\/wuwaC\//i })).toHaveAttribute(
      'href',
      'https://carmukyo.github.io/wuwaC/',
    );
    await user.click(screen.getByRole('button', { name: 'Import your backup' }));
    expect(useAppStore.getState().activeSection).toBe('database');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hides once dismissed, and remembers that per browser under a wuwa-* key', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ImportHint />);
    await user.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(IMPORT_HINT_KEY.startsWith('wuwa-')).toBe(true);
    expect(localStorage.getItem(IMPORT_HINT_KEY)).toBe('1');
    unmount();
    render(<ImportHint />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not show when the database already holds data', async () => {
    await db.teams.add({ id: 't1', name: 'Main', characterIds: ['jiyan', 'verina', 'rover'] });
    render(<ImportHint />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('goes away after a restore: emptiness is re-checked when the section changes', async () => {
    render(<ImportHint />);
    expect(await screen.findByRole('status')).toBeInTheDocument();
    await db.teams.add({ id: 't1', name: 'Main', characterIds: ['jiyan', 'verina', 'rover'] });
    useAppStore.setState({ activeSection: 'roster' });
    await vi.waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('is hidden on the Database page, where the restore itself lives', async () => {
    useAppStore.setState({ activeSection: 'database' });
    render(<ImportHint />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('never shows on the moved (old) site, which has its own banner', async () => {
    vi.stubEnv('VITE_MOVED_TO', 'https://wuwa-opt.github.io/wuwaC/');
    render(<ImportHint />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
