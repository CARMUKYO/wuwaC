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

  it('transcribes the team-buff audit converts (2026-09-19 re-read)', () => {
    // Ciaccona Solo Concert: flat 24% Aero bonus, no duration stated.
    const ciaccona = TEAM_BUFFS.find((e) => e.characterId === 'ciaccona' && e.kind === 'other')!;
    expect(ciaccona.skillId).toBe('1003401');
    expect(ciaccona.target).toBe('team');
    expect(ciaccona.windowSeconds).toBeUndefined();
    expect(ciaccona.mods).toEqual([{ stat: 'dmgBonus:Aero', value: 0.24 }]);
    // Qiuyuan Liberation: +2% Crit DMG per 1% Crit Rate over 50%, up to
    // 30% — cap needs 30/2 = 15 points over, i.e. 65% Crit Rate.
    const qiuyuanLib = TEAM_BUFFS.find((e) => e.label === 'Qiuyuan Liberation (team, capped)')!;
    expect(qiuyuanLib.skillId).toBe('1004103');
    expect(qiuyuanLib.windowSeconds).toBe(30);
    expect(qiuyuanLib.mods).toEqual([{ stat: 'critDmg', value: 0.3 }]);
    expect(qiuyuanLib.assumption).toMatch(/65%/);
    // Qiuyuan Bamboo's Shade: flat 30% Echo bonus, 30s.
    const bamboo = TEAM_BUFFS.find((e) => e.label === "Qiuyuan Bamboo's Shade (team)")!;
    expect(bamboo.skillId).toBe('1004107');
    expect(bamboo.windowSeconds).toBe(30);
    expect(bamboo.mods).toEqual([{ stat: 'dmgBonus:echo', value: 0.3 }]);
    // Buling Thunder Spell final stage: 25% Skill bonus; window = the
    // 24s Array duration. S6 replaces (50%, active resonator only).
    const buling = TEAM_BUFFS.find((e) => e.label === 'Buling Thunder Spell (team, final stage)')!;
    expect(buling.skillId).toBe('1004307');
    expect(buling.windowSeconds).toBe(24);
    expect(buling.mods).toEqual([{ stat: 'dmgBonus:skill', value: 0.25 }]);
    // Iuno Blessing: 4% per stack x 10 stacks = 40%, 10s window.
    const iuno = TEAM_BUFFS.find((e) => e.label === 'Iuno Blessing (team, full stacks)')!;
    expect(iuno.skillId).toBe('1003807');
    expect(iuno.windowSeconds).toBe(10);
    expect(iuno.mods).toEqual([{ stat: 'amplify', value: 0.4 }]);
    // Lynae Visual Impact: 40 raw Tune Break Boost points, 30s.
    const lynae = TEAM_BUFFS.find((e) => e.label === 'Lynae Visual Impact (team)')!;
    expect(lynae.skillId).toBe('1004507');
    expect(lynae.windowSeconds).toBe(30);
    expect(lynae.mods).toEqual([{ stat: 'tuneBreakBoost', value: 40 }]);
    // Mornye Interfered Marker: +0.25% per 1% Energy Regen over 100%,
    // up to 40% — cap needs 40/0.25 = 160 points over, i.e. 260% ER.
    // Window = the 8s Marker duration.
    const mornye = TEAM_BUFFS.find((e) => e.label === 'Mornye Interfered Marker (team, capped)')!;
    expect(mornye.skillId).toBe('1004407');
    expect(mornye.windowSeconds).toBe(8);
    expect(mornye.mods).toEqual([{ stat: 'amplify', value: 0.4 }]);
    expect(mornye.assumption).toMatch(/260%/);
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
