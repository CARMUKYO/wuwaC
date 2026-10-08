import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { computeDamage, standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';
import {
  HSIN_OUTRO_MV,
  HSIN_S6_FIXED_CRIT,
  hsinOutroSpec,
  hsinSkillMods,
} from './hsin.ts';

const snapshot = loadBundledSnapshot();
const hsin = snapshot.characters.find((c) => c.id === 'hsin')!;
const outro = hsin.skills.find((s) => s.kind === 'outro')!;
const basic = hsin.skills.find((s) => s.kind === 'basic')!;

describe('hsinSkillMods', () => {
  it('adds +40% skill-bucket bonus on skill-typed motions at S6 only', () => {
    expect(hsinSkillMods('hsin', 6, 'skill')).toEqual({ motionMultiplier: 1, dmgBonusExtra: 0.4 });
    expect(hsinSkillMods('hsin', 6, 'liberation')).toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
    expect(hsinSkillMods('hsin', 6, 'basic')).toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
    expect(hsinSkillMods('hsin', 5, 'skill')).toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
    expect(hsinSkillMods('hsin', 0, 'skill')).toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
    expect(hsin.resonanceChain.find((r) => r.rank === 6)!.description).toContain(
      'Targets take 40% more Resonance Skill DMG',
    );
  });

  it('stays neutral for other characters', () => {
    expect(hsinSkillMods('suoming', 6, 'skill')).toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
    expect(hsinSkillMods(undefined, 6, 'skill')).toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
  });
});

describe('hsinOutroSpec', () => {
  it('matches Hsin outro blocks with an empty motion name only', () => {
    expect(hsinOutroSpec('hsin', outro, '')).toEqual({ motionValue: HSIN_OUTRO_MV });
    expect(hsinOutroSpec('hsin', outro, 'Thousand Lanterns')).toBeNull();
    expect(hsinOutroSpec('hsin', basic, '')).toBeNull();
    expect(hsinOutroSpec('camellya', outro, '')).toBeNull();
    expect(hsinOutroSpec(undefined, outro, '')).toBeNull();
  });

  it('pins the prose motion value (100% of ATK, skill 1006109)', () => {
    expect(HSIN_OUTRO_MV).toBe(1);
    expect(outro.description ?? '').toContain('100% of Hsin');
  });

  it('pins the S6 fixed Flare crit hook (no status-pipeline consumer yet)', () => {
    expect(HSIN_S6_FIXED_CRIT).toEqual({ rate: 0.8, dmg: 2.3 });
    expect(hsin.resonanceChain.find((r) => r.rank === 6)!.description).toContain(
      'Crit. Rate fixed at 80% and Crit. DMG fixed at 230%',
    );
  });

  it('scores the outro attribute-only through computeDamage (hand-computed)', () => {
    const sheet = emptySheet();
    sheet['dmgBonus:Electro'] = 0.1;
    sheet['dmgBonus:coordinated'] = 0.4; // Not a coordinated attack: must NOT leak in.
    sheet['dmgBonus:outro'] = 0.5; // Unstated type: the outro bucket must NOT leak in.
    const ctx = {
      sheet,
      baseAtk: { character: 1000, weapon: 0 },
      baseHp: { character: 10000 },
      baseDef: { character: 1000 },
      attackerLevel: 90,
      skill: outro,
      motionName: '',
      enemy: standardMob(90),
      crit: 'nonCrit' as const,
      characterId: 'hsin',
    };
    const result = computeDamage({ ...ctx, forteLevel: 1 });
    // base = 1000 x 1.0 = 1000; bonuses = 1 + 0.1 = 1.1.
    expect(result.baseDamage).toBeCloseTo(1000, 6);
    expect(result.bonuses).toBeCloseTo(1.1, 10);
    expect(result.damage).toBeCloseTo(1000 * 0.9 * (1520 / 3032) * 1.1, 4);
    // Fixed MV: forte level changes nothing.
    expect(computeDamage({ ...ctx, forteLevel: 10 }).damage).toBe(result.damage);
  });
});
