import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from './index.ts';
import { TEAM_BUFFS } from './teamBuffs.ts';

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
    const excluded = new Set([
      // No sheet-buff team effect in the snapshot wording (see module doc).
      'yangyang', 'chixia', 'rover-spectro', 'encore', 'jiyan', 'camellya',
      'calcharo', 'lingyang', 'yuanwu', 'rover-havoc', 'jinhsi', 'xiangli-yao',
      'carlotta', 'galbrena', 'chisa', 'luuk-herssen', 'sigrika',
      'rover-aero', 'qingxiao', 'jingran',
    ]);
    const covered = new Set(TEAM_BUFFS.map((e) => e.characterId));
    const unaccounted = snapshot.characters
      .map((c) => c.id)
      .filter((id) => !covered.has(id) && !excluded.has(id));
    expect(unaccounted).toEqual([]);
    // The exclusion list itself stays honest: every name must be a real character.
    for (const id of excluded) {
      expect(snapshot.characters.some((c) => c.id === id)).toBe(true);
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
});
