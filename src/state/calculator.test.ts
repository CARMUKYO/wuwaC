import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHARACTER_LEVEL,
  DEFAULT_FORTE_LEVEL,
  DEFAULT_ROTATION_TIME,
  useCalculatorStore,
  type EchoSlots,
} from './calculator.ts';
import type { RosterEntry } from '../data/schema.ts';

const entry: RosterEntry = {
  characterId: 'jiyan',
  level: 80,
  ascension: 5,
  resonanceChain: 2,
  forteLevels: { '1001101': 8 },
  weaponId: 'verdant-summit',
  weaponLevel: 70,
  weaponRank: 3,
};

function freshState() {
  useCalculatorStore.getState().resetAll();
  return useCalculatorStore.getState();
}

describe('calculator store', () => {
  it('starts with documented defaults', () => {
    const s = freshState();
    expect(s.characterId).toBe('');
    expect(s.level).toBe(DEFAULT_CHARACTER_LEVEL);
    expect(s.enemyLevel).toBe(90);
    expect(s.enemyBaseRES).toBeCloseTo(0.1, 10);
    expect(s.rotationTime).toBe(DEFAULT_ROTATION_TIME);
    expect(s.echoIds).toEqual([null, null, null, null, null]);
  });

  it('clamps level and forte sliders into range', () => {
    freshState();
    useCalculatorStore.getState().setLevel(0);
    expect(useCalculatorStore.getState().level).toBe(1);
    useCalculatorStore.getState().setLevel(91);
    expect(useCalculatorStore.getState().level).toBe(90);
    useCalculatorStore.getState().setForteLevel('1001101', 11);
    expect(useCalculatorStore.getState().forteLevels['1001101']).toBe(10);
    useCalculatorStore.getState().setForteLevel('1001101', 0);
    expect(useCalculatorStore.getState().forteLevels['1001101']).toBe(1);
    expect(DEFAULT_FORTE_LEVEL).toBe(10);
  });

  it('clamps enemy and rotation-time inputs', () => {
    freshState();
    useCalculatorStore.getState().setEnemyLevel(121);
    expect(useCalculatorStore.getState().enemyLevel).toBe(120);
    useCalculatorStore.getState().setEnemyBaseRES(0.9);
    expect(useCalculatorStore.getState().enemyBaseRES).toBeCloseTo(0.8, 10);
    // Non-positive times are ignored — DPS divides by this value.
    useCalculatorStore.getState().setRotationTime(0);
    expect(useCalculatorStore.getState().rotationTime).toBe(DEFAULT_ROTATION_TIME);
    useCalculatorStore.getState().setRotationTime(-5);
    expect(useCalculatorStore.getState().rotationTime).toBe(DEFAULT_ROTATION_TIME);
    useCalculatorStore.getState().setRotationTime(12.5);
    expect(useCalculatorStore.getState().rotationTime).toBeCloseTo(12.5, 10);
  });

  it('ignores non-finite numeric input instead of corrupting state', () => {
    freshState();
    useCalculatorStore.getState().setLevel(Number.NaN);
    expect(useCalculatorStore.getState().level).toBe(DEFAULT_CHARACTER_LEVEL);
    useCalculatorStore.getState().setEnemyBaseRES(Number.NaN);
    expect(useCalculatorStore.getState().enemyBaseRES).toBeCloseTo(0.1, 10);
  });

  it('drops stale forte levels when the character changes', () => {
    freshState();
    useCalculatorStore.getState().setCharacterId('jiyan');
    useCalculatorStore.getState().setForteLevel('1001101', 8);
    useCalculatorStore.getState().setCharacterId('verina');
    const s = useCalculatorStore.getState();
    expect(s.characterId).toBe('verina');
    expect(s.forteLevels).toEqual({});
  });

  it('sets and clears echo slots; ignores out-of-range indexes', () => {
    freshState();
    useCalculatorStore.getState().setEchoSlot(0, 'echo-a');
    useCalculatorStore.getState().setEchoSlot(4, 'echo-b');
    expect(useCalculatorStore.getState().echoIds).toEqual(['echo-a', null, null, null, 'echo-b']);
    useCalculatorStore.getState().setEchoSlot(5, 'echo-c');
    useCalculatorStore.getState().setEchoSlot(-1, 'echo-c');
    const slots = useCalculatorStore.getState().echoIds as EchoSlots;
    expect(slots.filter(Boolean)).toHaveLength(2);
    useCalculatorStore.getState().clearEchoes();
    expect(useCalculatorStore.getState().echoIds).toEqual([null, null, null, null, null]);
  });

  it('prefills everything from a roster entry', () => {
    freshState();
    useCalculatorStore.getState().resetFromRoster(entry);
    const s = useCalculatorStore.getState();
    expect(s.characterId).toBe('jiyan');
    expect(s.level).toBe(80);
    expect(s.ascension).toBe(5);
    expect(s.resonanceChain).toBe(2);
    expect(s.forteLevels).toEqual({ '1001101': 8 });
    expect(s.weaponId).toBe('verdant-summit');
    expect(s.weaponLevel).toBe(70);
    expect(s.weaponRank).toBe(3);
    expect(s.rosterSourceId).toBe('jiyan');
  });

  it('resetAll restores defaults', () => {
    freshState();
    useCalculatorStore.getState().resetFromRoster(entry);
    useCalculatorStore.getState().resetAll();
    const s = useCalculatorStore.getState();
    expect(s.characterId).toBe('');
    expect(s.forteLevels).toEqual({});
    expect(s.rosterSourceId).toBe('');
  });

  it('adds, reorders, and removes blocks', () => {
    freshState();
    const store = useCalculatorStore.getState();
    const a = store.addBlock({ skillId: 's1', motionName: 'M1', forteLevel: 10, activeBuffIds: [] });
    const b = useCalculatorStore.getState().addBlock({ skillId: 's2', motionName: 'M2', forteLevel: 8, activeBuffIds: [] });
    expect(a.id).not.toBe(b.id);
    expect(useCalculatorStore.getState().blocks.map((x) => x.id)).toEqual([a.id, b.id]);

    useCalculatorStore.getState().moveBlock(a.id, 1);
    expect(useCalculatorStore.getState().blocks.map((x) => x.id)).toEqual([b.id, a.id]);
    // Out-of-range moves are no-ops.
    useCalculatorStore.getState().moveBlock(a.id, 1);
    expect(useCalculatorStore.getState().blocks.map((x) => x.id)).toEqual([b.id, a.id]);

    useCalculatorStore.getState().setBlockForte(b.id, 99);
    expect(useCalculatorStore.getState().blocks.find((x) => x.id === b.id)?.forteLevel).toBe(10);
    useCalculatorStore.getState().removeBlock(b.id);
    expect(useCalculatorStore.getState().blocks.map((x) => x.id)).toEqual([a.id]);
  });

  it('toggles block and global buffs, and detaches removed buffs everywhere', () => {
    freshState();
    const buff = useCalculatorStore.getState().addBuff({ label: 'B', source: 'test', mods: [] });
    const block = useCalculatorStore.getState().addBlock({ skillId: 's1', motionName: 'M1', forteLevel: 10, activeBuffIds: [] });

    useCalculatorStore.getState().toggleBlockBuff(block.id, buff.id);
    expect(useCalculatorStore.getState().blocks[0].activeBuffIds).toEqual([buff.id]);
    useCalculatorStore.getState().toggleBlockBuff(block.id, buff.id);
    expect(useCalculatorStore.getState().blocks[0].activeBuffIds).toEqual([]);

    useCalculatorStore.getState().toggleGlobalBuff(buff.id);
    expect(useCalculatorStore.getState().globalBuffIds).toEqual([buff.id]);

    // Re-attach, then remove the buff: no dangling references remain.
    useCalculatorStore.getState().toggleBlockBuff(block.id, buff.id);
    useCalculatorStore.getState().removeBuff(buff.id);
    const s = useCalculatorStore.getState();
    expect(s.buffs).toEqual([]);
    expect(s.globalBuffIds).toEqual([]);
    expect(s.blocks[0].activeBuffIds).toEqual([]);
  });

  it('sets Resonance Mode and resets it on character switch and resetAll', () => {
    freshState();
    useCalculatorStore.getState().setResonanceMode('tuneRupture');
    expect(useCalculatorStore.getState().resonanceMode).toBe('tuneRupture');
    useCalculatorStore.getState().setCharacterId('aemeath');
    expect(useCalculatorStore.getState().resonanceMode).toBeNull();
    useCalculatorStore.getState().setResonanceMode('fusionBurst');
    useCalculatorStore.getState().setCharacterId('aemeath');
    expect(useCalculatorStore.getState().resonanceMode).toBe('fusionBurst');
    useCalculatorStore.getState().resetAll();
    expect(useCalculatorStore.getState().resonanceMode).toBeNull();
  });

  it('clamps kit-state inputs per field and keeps booleans', () => {
    freshState();
    const row = useCalculatorStore.getState().addBlock({ skillId: 'x', motionName: 'y', forteLevel: 1, activeBuffIds: [] });
    useCalculatorStore.getState().setBlockKitState(row.id, {
      targetHavocBaneStacks: 12,
      blazesConsumed: 200,
      nightfallBlazes: -5,
      ringsConsumed: 150,
      voiceFlux: true,
      wovenMyriad: true,
    });
    const b = useCalculatorStore.getState().blocks[0];
    expect(b.targetHavocBaneStacks).toBe(9);
    expect(b.blazesConsumed).toBe(150);
    expect(b.nightfallBlazes).toBe(0);
    expect(b.ringsConsumed).toBe(99);
    expect(b.voiceFlux).toBe(true);
    expect(b.wovenMyriad).toBe(true);
    useCalculatorStore.getState().setBlockKitState(row.id, {
      tuneStrainStacks: 99,
      tuneResponseStacks: -4,
      tuneBreakMultiplier: 1.7334,
    });
    const t = useCalculatorStore.getState().blocks[0];
    expect(t.tuneStrainStacks).toBe(10);
    expect(t.tuneResponseStacks).toBe(0);
    expect(t.tuneBreakMultiplier).toBeCloseTo(1.7334, 10);
    useCalculatorStore.getState().setBlockKitState('missing', { blazesConsumed: 10 });
    expect(useCalculatorStore.getState().blocks).toHaveLength(1);
  });

  it('resetAll clears rotation state too', () => {
    freshState();
    useCalculatorStore.getState().addBlock({ skillId: 's1', motionName: 'M1', forteLevel: 10, activeBuffIds: [] });
    useCalculatorStore.getState().addBuff({ label: 'B', source: 'test', mods: [] });
    useCalculatorStore.getState().resetAll();
    const s = useCalculatorStore.getState();
    expect(s.blocks).toEqual([]);
    expect(s.buffs).toEqual([]);
    expect(s.globalBuffIds).toEqual([]);
    expect(s.crit).toBe('expected');
  });
});
