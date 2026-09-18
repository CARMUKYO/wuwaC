import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db.ts';
import { useInventoryStore, type EchoDraft } from './inventory.ts';

const draft: EchoDraft = {
  label: 'Hooscamp',
  echoDefId: 'hooscamp',
  sonataId: 'sierra-gale',
  cost: 1,
  level: 25,
  rarity: 5,
  mainStat: { stat: 'atkPct', value: 0.18 },
  secondMainStat: { stat: 'atk', value: 100 },
  substats: [{ stat: 'critRate', value: 0.063 }],
  equippedTo: null,
};

beforeEach(async () => {
  await db.ownedEchoes.clear();
  useInventoryStore.setState({ echoes: [], loaded: false });
});

describe('inventory store', () => {
  it('starts empty and unloaded', () => {
    const state = useInventoryStore.getState();
    expect(state.echoes).toEqual([]);
    expect(state.loaded).toBe(false);
  });

  it('load() reads rows written directly to Dexie', async () => {
    await db.ownedEchoes.add({
      id: 'seed-1',
      label: 'Hooscamp',
      echoDefId: 'hooscamp',
      sonataId: 'sierra-gale',
      cost: 3,
      level: 25,
      rarity: 5,
      mainStat: { stat: 'dmgBonus:Aero', value: 0.3 },
      substats: [],
      equippedTo: null,
      origin: 'manual',
    });
    await useInventoryStore.getState().load();
    const state = useInventoryStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.echoes.map((e) => e.id)).toEqual(['seed-1']);
  });

  it('addEcho keeps the picked def id, persists, and updates state', async () => {
    const created = await useInventoryStore.getState().addEcho(draft);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.origin).toBe('manual');
    expect(created.echoDefId).toBe('hooscamp');
    expect(useInventoryStore.getState().echoes).toHaveLength(1);
    expect(await db.ownedEchoes.get(created.id)).toMatchObject({ label: 'Hooscamp' });
  });

  it('addEcho rejects def-inconsistent drafts without touching state or Dexie', async () => {
    const store = useInventoryStore.getState();
    await expect(store.addEcho({ ...draft, echoDefId: 'no-such-echo' })).rejects.toThrow(/unknown echo definition/);
    await expect(store.addEcho({ ...draft, cost: 4 })).rejects.toThrow(/1-cost Echo, not 4/);
    await expect(store.addEcho({ ...draft, sonataId: 'void-thunder' })).rejects.toThrow(/cannot roll/);
    await expect(store.addEcho({ ...draft, mainStat: { stat: 'critDmg', value: 0.44 } })).rejects.toThrow(/cannot roll/);
    expect(useInventoryStore.getState().echoes).toEqual([]);
    expect(await db.ownedEchoes.count()).toBe(0);
  });

  it('addEcho rejects invalid drafts without touching state or Dexie', async () => {
    await expect(
      useInventoryStore.getState().addEcho({
        ...draft,
        substats: [
          { stat: 'critRate', value: 0.05 },
          { stat: 'critRate', value: 0.06 },
        ],
      }),
    ).rejects.toThrow(/duplicate substats/);
    expect(useInventoryStore.getState().echoes).toEqual([]);
    expect(await db.ownedEchoes.count()).toBe(0);
  });

  it('updateEcho patches fields and persists', async () => {
    const created = await useInventoryStore.getState().addEcho(draft);
    const updated = await useInventoryStore.getState().updateEcho(created.id, {
      mainStat: { stat: 'atkPct', value: 0.1 },
    });
    expect(updated.mainStat.value).toBeCloseTo(0.1, 10);
    expect(await db.ownedEchoes.get(created.id)).toMatchObject({
      mainStat: { stat: 'atkPct', value: 0.1 },
    });
  });

  it('updateEcho keeps the def id when only the label changes', async () => {
    const created = await useInventoryStore.getState().addEcho(draft);
    const updated = await useInventoryStore.getState().updateEcho(created.id, {
      label: 'Hooscamp Alpha',
    });
    expect(updated.echoDefId).toBe('hooscamp');
    expect(updated.label).toBe('Hooscamp Alpha');
  });

  it('updateEcho rejects def-inconsistent patches', async () => {
    const created = await useInventoryStore.getState().addEcho(draft);
    const store = useInventoryStore.getState();
    await expect(store.updateEcho(created.id, { cost: 4 })).rejects.toThrow(/1-cost Echo/);
    await expect(store.updateEcho(created.id, { echoDefId: 'no-such-echo' })).rejects.toThrow(/unknown echo definition/);
    expect(useInventoryStore.getState().echoes[0].cost).toBe(1);
  });

  it('updateEcho throws for unknown ids', async () => {
    await expect(useInventoryStore.getState().updateEcho('missing', {})).rejects.toThrow(/unknown echo/);
  });

  it('removeEcho deletes from state and Dexie, and throws for unknown ids', async () => {
    const created = await useInventoryStore.getState().addEcho(draft);
    await useInventoryStore.getState().removeEcho(created.id);
    expect(useInventoryStore.getState().echoes).toEqual([]);
    expect(await db.ownedEchoes.count()).toBe(0);
    await expect(useInventoryStore.getState().removeEcho(created.id)).rejects.toThrow(/unknown echo/);
  });
});
