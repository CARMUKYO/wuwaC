import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../state/db.ts';
import { useRosterStore } from '../../state/roster.ts';
import { RosterPage } from './RosterPage.tsx';

beforeEach(async () => {
  await db.roster.clear();
  useRosterStore.setState({ entries: [], loaded: false });
});

async function addJiyan(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/character/i), 'jiyan');
  await user.click(screen.getByRole('button', { name: /add character/i }));
  await screen.findByText('Jiyan');
}

describe('RosterPage', () => {
  it('shows an empty state with zero entries', async () => {
    render(<RosterPage />);
    expect(await screen.findByText(/no characters tracked/i)).toBeInTheDocument();
  });

  it('adds a character and persists it', async () => {
    const user = userEvent.setup();
    render(<RosterPage />);
    await addJiyan(user);

    expect(await db.roster.get('jiyan')).toMatchObject({ level: 90 });
  });

  it('edits level via slider and persists', async () => {
    const user = userEvent.setup();
    render(<RosterPage />);
    await addJiyan(user);

    // fireEvent: controlled range inputs need change events in jsdom.
    // Anchored: "Weapon level for Jiyan" would also match loosely.
    fireEvent.change(screen.getByRole('slider', { name: /^level for jiyan/i }), { target: { value: '80' } });
    await waitFor(async () => {
      expect((await db.roster.get('jiyan'))?.level).toBe(80);
    });
  });

  it('renders forte sliders per scorable skill with a 10 default', async () => {
    const user = userEvent.setup();
    render(<RosterPage />);
    await addJiyan(user);

    const slider = screen.getByRole('slider', { name: /lone lance/i });
    expect(slider).toHaveValue('10');
    fireEvent.change(slider, { target: { value: '8' } });
    await waitFor(async () => {
      expect((await db.roster.get('jiyan'))?.forteLevels['1001101']).toBe(8);
    });
  });

  it('removes a character', async () => {
    const user = userEvent.setup();
    render(<RosterPage />);
    await addJiyan(user);

    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(await screen.findByText(/no characters tracked/i)).toBeInTheDocument();
    expect(await db.roster.count()).toBe(0);
  });

  it('lists only matching-type weapons for a resonator', async () => {
    const user = userEvent.setup();
    render(<RosterPage />);
    await addJiyan(user);

    // Jiyan is a Broadblade resonator: pistols are out, broadblades are in.
    const select = screen.getByLabelText(/weapon for jiyan/i);
    expect(within(select).queryByRole('option', { name: 'Thunderbolt' })).not.toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Autumntrace' })).toBeInTheDocument();
  });

  it('warns on a saved wrong-type weapon instead of hiding it', async () => {
    await useRosterStore.getState().upsert({
      characterId: 'jiyan',
      level: 90,
      ascension: 6,
      resonanceChain: 0,
      forteLevels: {},
      weaponId: 'thunderbolt',
      weaponLevel: 90,
      weaponRank: 1,
    });
    render(<RosterPage />);

    expect(await screen.findByText(/needs a broadblade/i)).toBeInTheDocument();
    // The stored value stays selectable so the user can see what to fix.
    expect(
      within(screen.getByLabelText(/weapon for jiyan/i)).getByRole('option', { name: /thunderbolt.*wrong type/i }),
    ).toBeInTheDocument();
  });
});
