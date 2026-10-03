import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './palette.tsx';
import { useAppStore } from '../../state/store.ts';

beforeEach(() => {
  useAppStore.setState({ activeSection: 'inventory' });
});

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    render(<CommandPalette open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog', { name: /command palette/i })).not.toBeInTheDocument();
  });

  it('lists sections and the theme action when open', () => {
    render(<CommandPalette open onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
    for (const label of ['Inventory', 'Roster', 'Calculator', 'Teams', 'Builds', 'Database']) {
      expect(screen.getByRole('option', { name: new RegExp(`go to ${label}`, 'i') })).toBeInTheDocument();
    }
    expect(screen.getByRole('option', { name: /toggle theme/i })).toBeInTheDocument();
  });

  it('filters actions by query', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open onClose={() => {}} />);
    await user.type(screen.getByRole('combobox'), 'calc');
    expect(screen.getByRole('option', { name: /go to calculator/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /go to roster/i })).not.toBeInTheDocument();
  });

  it('navigates and closes on Enter', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} />);
    await user.type(screen.getByRole('combobox'), 'teams');
    await user.keyboard('{Enter}');
    expect(useAppStore.getState().activeSection).toBe('teams');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('moves highlight with arrow keys', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open onClose={() => {}} />);
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
