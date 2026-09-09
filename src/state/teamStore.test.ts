import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db.ts';
import { useTeamStore } from './teamStore.ts';

beforeEach(async () => {
  await db.teams.clear();
  useTeamStore.setState({ teams: [], loaded: false });
});

describe('team store', () => {
  it('starts empty and unloaded', () => {
    expect(useTeamStore.getState().teams).toEqual([]);
    expect(useTeamStore.getState().loaded).toBe(false);
  });

  it('createTeam persists and updates state', async () => {
    const team = await useTeamStore.getState().createTeam('Main', ['jiyan', 'verina', 'rover']);
    expect(team.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(useTeamStore.getState().teams).toHaveLength(1);
    expect(await db.teams.get(team.id)).toMatchObject({ name: 'Main' });
  });

  it('createTeam rejects duplicate members and blank names', async () => {
    await expect(
      useTeamStore.getState().createTeam('Dup', ['jiyan', 'jiyan', 'verina']),
    ).rejects.toThrow(/same character twice/);
    await expect(useTeamStore.getState().createTeam('', ['a', 'b', 'c'])).rejects.toThrow();
    expect(useTeamStore.getState().teams).toEqual([]);
    expect(await db.teams.count()).toBe(0);
  });

  it('renameTeam and setMembers persist', async () => {
    const team = await useTeamStore.getState().createTeam('Main', ['jiyan', 'verina', 'rover']);
    await useTeamStore.getState().renameTeam(team.id, 'Renamed');
    await useTeamStore.getState().setMembers(team.id, ['a', 'b', 'c']);
    expect(await db.teams.get(team.id)).toMatchObject({
      name: 'Renamed',
      characterIds: ['a', 'b', 'c'],
    });
  });

  it('renameTeam throws for unknown ids and blank names', async () => {
    await expect(useTeamStore.getState().renameTeam('missing', 'x')).rejects.toThrow(/unknown team/);
    const team = await useTeamStore.getState().createTeam('Main', ['a', 'b', 'c']);
    await expect(useTeamStore.getState().renameTeam(team.id, '')).rejects.toThrow();
    await expect(useTeamStore.getState().setMembers(team.id, ['a', 'a', 'b'])).rejects.toThrow(
      /same character twice/,
    );
  });

  it('removeTeam deletes and throws for unknown ids', async () => {
    const team = await useTeamStore.getState().createTeam('Main', ['a', 'b', 'c']);
    await useTeamStore.getState().removeTeam(team.id);
    expect(useTeamStore.getState().teams).toEqual([]);
    expect(await db.teams.count()).toBe(0);
    await expect(useTeamStore.getState().removeTeam(team.id)).rejects.toThrow(/unknown team/);
  });
});
