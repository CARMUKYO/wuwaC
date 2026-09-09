import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../state/db.ts';
import { useInventoryStore } from '../../state/inventory.ts';
import { useTeamStore } from '../../state/teamStore.ts';
import { TeamsPage } from './TeamsPage.tsx';

beforeEach(async () => {
  await db.teams.clear();
  await db.ownedEchoes.clear();
  useTeamStore.setState({ teams: [], loaded: false });
  useInventoryStore.setState({ echoes: [], loaded: false });
});

async function createTeam(user: ReturnType<typeof userEvent.setup>, name: string): Promise<void> {
  // Member slots are free-text ids with snapshot suggestions (the snapshot
  // holds fewer than three characters, so a closed select cannot work).
  await user.type(screen.getByLabelText(/team name/i), name);
  await user.type(screen.getByLabelText(/member 1/i), 'jiyan');
  await user.type(screen.getByLabelText(/member 2/i), 'verina');
  await user.type(screen.getByLabelText(/member 3/i), 'rover');
  await user.click(screen.getByRole('button', { name: /create team/i }));
  await screen.findByText(name);
}

describe('TeamsPage', () => {
  it('creates a team and persists it', async () => {
    const user = userEvent.setup();
    render(<TeamsPage />);
    await createTeam(user, 'Main');

    expect(useTeamStore.getState().teams).toHaveLength(1);
    expect(await db.teams.count()).toBe(1);
  });

  it('rejects duplicate members without writing', async () => {
    const user = userEvent.setup();
    render(<TeamsPage />);
    await user.type(screen.getByLabelText(/team name/i), 'Dup');
    await user.type(screen.getByLabelText(/member 1/i), 'jiyan');
    await user.type(screen.getByLabelText(/member 2/i), 'jiyan');
    await user.type(screen.getByLabelText(/member 3/i), 'verina');
    await user.click(screen.getByRole('button', { name: /create team/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(useTeamStore.getState().teams).toEqual([]);
    expect(await db.teams.count()).toBe(0);
  });

  it('shows sonata coverage from equipped echoes', async () => {
    const user = userEvent.setup();
    const store = useInventoryStore.getState();
    const mk = (defId: string, equippedTo: string | null) =>
      store.addEcho({
        label: defId,
        echoDefId: defId,
        sonataId: 'sierra-gale',
        cost: 1,
        level: 0,
        rarity: 5,
        mainStat: { stat: 'atk', value: 10 },
        substats: [],
        equippedTo,
      });
    // Distinct def ids = distinct pieces for Sonata counting.
    await mk('hooscamp', 'jiyan');
    await mk('chirpuff', 'jiyan');

    render(<TeamsPage />);
    await createTeam(user, 'Main');
    // Rendered twice by design: once in Jiyan's member block, once in team totals.
    expect(await screen.findAllByText(/Sierra Gale ×2/)).toHaveLength(2);
  });

  it('deletes a team', async () => {
    const user = userEvent.setup();
    render(<TeamsPage />);
    await createTeam(user, 'Main');

    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(useTeamStore.getState().teams).toEqual([]);
    expect(await db.teams.count()).toBe(0);
  });
});
