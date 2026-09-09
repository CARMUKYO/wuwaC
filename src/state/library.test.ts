import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db.ts';
import { serializeBuilds, useLibraryStore } from './library.ts';
import type { Build } from '../data/schema.ts';

type Draft = Omit<Build, 'id' | 'updatedAt'>;

const draft: Draft = {
  name: 'Jiyan Liberation',
  characterId: 'jiyan',
  weaponId: 'verdant-summit',
  echoIds: ['a', 'b', 'c', 'd', 'e'],
  objectiveId: 'Expected damage',
  objective: {
    kind: 'expected-damage',
    skillId: '1001103',
    motionName: 'Lance of Qingloong Stage 1 DMG',
    forteLevel: 10,
    crit: 'expected',
  },
  score: 650.5,
};

beforeEach(async () => {
  await db.builds.clear();
  useLibraryStore.setState({ builds: [], loaded: false });
});

describe('library store', () => {
  it('starts empty and unloaded', () => {
    expect(useLibraryStore.getState().builds).toEqual([]);
    expect(useLibraryStore.getState().loaded).toBe(false);
  });

  it('saveBuild stamps id/updatedAt and persists', async () => {
    const saved = await useLibraryStore.getState().saveBuild(draft);
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(saved.updatedAt).getTime()).not.toBeNaN();
    expect(saved.objective).toEqual(draft.objective);
    expect(useLibraryStore.getState().builds).toHaveLength(1);
    expect(await db.builds.get(saved.id)).toMatchObject({ name: 'Jiyan Liberation' });
  });

  it('saveBuild rejects invalid drafts without writing', async () => {
    await expect(
      useLibraryStore.getState().saveBuild({ ...draft, echoIds: ['a', 'b', 'c', 'd', 'a'] }),
    ).rejects.toThrow(/equipped twice/);
    expect(useLibraryStore.getState().builds).toEqual([]);
    expect(await db.builds.count()).toBe(0);
  });

  it('updateBuild edits name and notes', async () => {
    const saved = await useLibraryStore.getState().saveBuild(draft);
    const updated = await useLibraryStore.getState().updateBuild(saved.id, {
      name: 'Renamed',
      notes: 'hello',
    });
    expect(updated.name).toBe('Renamed');
    expect(updated.notes).toBe('hello');
    expect(await db.builds.get(saved.id)).toMatchObject({ name: 'Renamed', notes: 'hello' });
  });

  it('updateBuild throws for unknown ids and blank names', async () => {
    const saved = await useLibraryStore.getState().saveBuild(draft);
    await expect(useLibraryStore.getState().updateBuild('missing', { name: 'x' })).rejects.toThrow(
      /unknown build/,
    );
    await expect(useLibraryStore.getState().updateBuild(saved.id, { name: '' })).rejects.toThrow();
  });

  it('removeBuild deletes and throws for unknown ids', async () => {
    const saved = await useLibraryStore.getState().saveBuild(draft);
    await useLibraryStore.getState().removeBuild(saved.id);
    expect(useLibraryStore.getState().builds).toEqual([]);
    expect(await db.builds.count()).toBe(0);
    await expect(useLibraryStore.getState().removeBuild(saved.id)).rejects.toThrow(/unknown build/);
  });

  it('importBuilds adds valid builds and reports counts', async () => {
    const now = new Date().toISOString();
    const result = await useLibraryStore.getState().importBuilds([
      { ...draft, name: 'One', updatedAt: now },
      { ...draft, name: 'Two', updatedAt: now },
    ]);
    expect(result).toEqual({ added: 2, skipped: 0 });
    expect(useLibraryStore.getState().builds).toHaveLength(2);
  });

  it('importBuilds throws on garbage without writing anything', async () => {
    await expect(useLibraryStore.getState().importBuilds([{ nope: true }])).rejects.toThrow();
    await expect(useLibraryStore.getState().importBuilds('nope')).rejects.toThrow();
    expect(useLibraryStore.getState().builds).toEqual([]);
    expect(await db.builds.count()).toBe(0);
  });

  it('importBuilds skips id collisions', async () => {
    const saved = await useLibraryStore.getState().saveBuild(draft);
    const result = await useLibraryStore.getState().importBuilds([
      { ...saved, name: 'Collision' },
    ]);
    expect(result).toEqual({ added: 0, skipped: 1 });
    expect(useLibraryStore.getState().builds).toHaveLength(1);
  });
});

describe('serializeBuilds', () => {
  it('round-trips through importBuilds', async () => {
    const saved = await useLibraryStore.getState().saveBuild(draft);
    const json = serializeBuilds([saved]);
    expect(JSON.parse(json)).toHaveLength(1);
    await db.builds.clear();
    useLibraryStore.setState({ builds: [], loaded: true });
    const result = await useLibraryStore.getState().importBuilds(JSON.parse(json));
    expect(result).toEqual({ added: 1, skipped: 0 });
  });
});
