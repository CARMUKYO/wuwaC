import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from './index.ts';
import { TEAM_BUFFS, TEAM_BUFF_EXCLUSIONS } from './teamBuffs.ts';

const snapshot = loadBundledSnapshot();

describe('team buffs table', () => {
  it('references known characters and skills', () => {
    const bad: string[] = [];
    for (const entry of TEAM_BUFFS) {
      const character = snapshot.characters.find((c) => c.id === entry.characterId);
      if (!character) {
        bad.push(`${entry.label}: unknown character ${entry.characterId}`);
        continue;
      }
      if (!character.skills.some((s) => s.id === entry.skillId)) {
        bad.push(`${entry.label}: unknown skill ${entry.skillId}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('documents every character either with an entry or an explicit exclusion', () => {
    const excluded = new Set(Object.keys(TEAM_BUFF_EXCLUSIONS));
    const covered = new Set(TEAM_BUFFS.map((e) => e.characterId));
    const unaccounted = snapshot.characters
      .map((c) => c.id)
      .filter((id) => !covered.has(id) && !excluded.has(id));
    expect(unaccounted).toEqual([]);
    // The exclusion map stays honest in both directions: every name is a
    // real character, and no excluded character has a table entry (a
    // convert must delete its row).
    for (const id of excluded) {
      expect(snapshot.characters.some((c) => c.id === id)).toBe(true);
      expect(covered.has(id)).toBe(false);
    }
    // Every reason cites its deciding skill id(s).
    for (const [id, reason] of Object.entries(TEAM_BUFF_EXCLUSIONS)) {
      expect(reason, `${id} reason cites no skill`).toMatch(/\(\d{7}[^)]*\)/);
    }
  });

  it('transcribes RES-shred riders as negative penetration (Phoebe, Suisui)', () => {
    const phoebe = TEAM_BUFFS.find((e) => e.characterId === 'phoebe')!;
    expect(phoebe.mods).toContainEqual({ stat: 'negativeStatusAmplify', value: 1.0 });
    expect(phoebe.mods).toContainEqual({ stat: 'resistancePenetration', value: -0.1 });
    const suisui = TEAM_BUFFS.find((e) => e.characterId === 'suisui' && e.kind === 'other')!;
    expect(suisui.mods).toContainEqual({ stat: 'defIgnore', value: 0.06 });
    expect(suisui.mods).toContainEqual({ stat: 'resistancePenetration', value: -0.12 });
  });

  it('transcribes Youhu Outro to the coordinated bucket', () => {
    const youhu = TEAM_BUFFS.find((e) => e.characterId === 'youhu')!;
    expect(youhu.skillId).toBe('1002409');
    expect(youhu.target).toBe('incoming');
    expect(youhu.mods).toEqual([{ stat: 'dmgBonus:coordinated', value: 1.0 }]);
  });

  it('transcribes Roccia Liberation as capped flat team ATK (audit convert)', () => {
    const roccia = TEAM_BUFFS.find((e) => e.characterId === 'roccia' && e.kind === 'other')!;
    expect(roccia.skillId).toBe('1002703');
    expect(roccia.target).toBe('team');
    expect(roccia.windowSeconds).toBe(30);
    // +1 ATK per 0.1% Crit Rate over 50%, up to 200 (needs 70% crit).
    expect(roccia.mods).toEqual([{ stat: 'atk', value: 200 }]);
    expect(roccia.assumption).toMatch(/70%/);
  });
});
