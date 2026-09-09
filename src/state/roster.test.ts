import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db.ts';
import { useRosterStore } from './roster.ts';
import type { RosterEntry } from '../data/schema.ts';

const entry: RosterEntry = {
  characterId: 'jiyan',
  level: 90,
  ascension: 6,
  resonanceChain: 0,
  forteLevels: {},
  weaponId: 'verdant-summit',
  weaponLevel: 90,
  weaponRank: 1,
};

beforeEach(async () => {
  await db.roster.clear();
  useRosterStore.setState({ entries: [], loaded: false });
});

describe('roster store', () => {
  it('starts empty and unloaded', () => {
    const state = useRosterStore.getState();
    expect(state.entries).toEqual([]);
    expect(state.loaded).toBe(false);
  });

  it('load() reads rows written directly to Dexie', async () => {
    await db.roster.add(entry);
    await useRosterStore.getState().load();
    const state = useRosterStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.entries.map((e) => e.characterId)).toEqual(['jiyan']);
  });

  it('upsert adds new characters and persists', async () => {
    const saved = await useRosterStore.getState().upsert(entry);
    expect(saved).toMatchObject({ characterId: 'jiyan', level: 90 });
    expect(useRosterStore.getState().entries).toHaveLength(1);
    expect(await db.roster.get('jiyan')).toMatchObject({ weaponRank: 1 });
  });

  it('upsert overwrites the same character (one row per character)', async () => {
    await useRosterStore.getState().upsert(entry);
    await useRosterStore.getState().upsert({ ...entry, level: 80, ascension: 5 });
    expect(useRosterStore.getState().entries).toHaveLength(1);
    expect(useRosterStore.getState().entries[0].level).toBe(80);
    expect(await db.roster.count()).toBe(1);
  });

  it('upsert rejects invalid entries without touching state or Dexie', async () => {
    await expect(
      useRosterStore.getState().upsert({ ...entry, resonanceChain: 7 }),
    ).rejects.toThrow();
    await expect(
      useRosterStore.getState().upsert({ ...entry, ascension: 9 }),
    ).rejects.toThrow();
    expect(useRosterStore.getState().entries).toEqual([]);
    expect(await db.roster.count()).toBe(0);
  });

  it('remove deletes and throws for unknown characters', async () => {
    await useRosterStore.getState().upsert(entry);
    await useRosterStore.getState().remove('jiyan');
    expect(useRosterStore.getState().entries).toEqual([]);
    expect(await db.roster.count()).toBe(0);
    await expect(useRosterStore.getState().remove('jiyan')).rejects.toThrow(/unknown character/);
  });
});
