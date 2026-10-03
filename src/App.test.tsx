import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.tsx';
import { useAppStore } from './state/store.ts';
import { useThemeStore } from './state/theme.ts';

beforeEach(() => {
  useAppStore.setState({ activeSection: 'inventory' });
  useThemeStore.getState().setTheme('paper');
});

describe('App shell', () => {
  it('opens on the inventory section', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /echo inventory/i })).toBeInTheDocument();
  });

  it('switches sections from the terminal nav', async () => {
    const user = userEvent.setup();
    render(<App />);
    // Sidebar and mobile top bar both render (CSS hides one); either navigates.
    const [rosterButton] = screen.getAllByRole('button', { name: /roster/i });
    await user.click(rosterButton);
    expect(await screen.findByRole('heading', { name: /character roster/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /echo inventory/i })).not.toBeInTheDocument();
  });

  it('toggles between paper and ink themes', async () => {
    const user = userEvent.setup();
    render(<App />);
    const [toggle] = screen.getAllByRole('button', { name: /switch to ink theme/i });
    await user.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('ink');
    expect(screen.getAllByRole('button', { name: /switch to paper theme/i })).not.toHaveLength(0);
  });
});
