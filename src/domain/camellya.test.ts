import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { CAMELLYA_S5_TWINING_MULTIPLIER, CAMELLYA_TWINING_MV, camellyaOutroTwiningSpec } from './camellya.ts';
import { computeDamage, standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';

const snapshot = loadBundledSnapshot();
const camellya = snapshot.characters.find((c) => c.id === 'camellya')!;
const outro = camellya.skills.find((s) => s.kind === 'outro')!;
const basic = camellya.skills.find((s) => s.kind === 'basic')!;

describe('camellyaOutroTwiningSpec', () => {
  it('matches Camellya outro blocks with an empty motion name only', () => {
    expect(camellyaOutroTwiningSpec('camellya', outro, '')).toEqual({ motionValue: CAMELLYA_TWINING_MV });
    expect(camellyaOutroTwiningSpec('camellya', outro, 'Twining')).toBeNull();
    expect(camellyaOutroTwiningSpec('camellya', basic, '')).toBeNull();
    expect(camellyaOutroTwiningSpec('jiyan', outro, '')).toBeNull();
    expect(camellyaOutroTwiningSpec(undefined, outro, '')).toBeNull();
  });

  it('pins the prose motion value (329.24% of ATK, skill 1001309)', () => {
    expect(CAMELLYA_TWINING_MV).toBeCloseTo(3.2924, 10);
    expect(outro.description ?? '').toContain('329.24%');
    // The primed bonus is real but rotation-order-gated (stays unmodeled).
    expect(outro.description ?? '').toContain('459.02%');
  });

  it('folds the S5 +68% Twining multiplier into the motion value', () => {
    expect(CAMELLYA_S5_TWINING_MULTIPLIER).toBeCloseTo(1.68, 10);
    expect(camellya.resonanceChain.find((r) => r.rank === 5)!.description).toContain('increased by 68%');
    expect(camellyaOutroTwiningSpec('camellya', outro, '', 4)).toEqual({ motionValue: CAMELLYA_TWINING_MV });
    expect(camellyaOutroTwiningSpec('camellya', outro, '', 5)?.motionValue).toBeCloseTo(
      CAMELLYA_TWINING_MV * 1.68,
      10,
    );
    expect(camellyaOutroTwiningSpec('camellya', outro, '', 6)?.motionValue).toBeCloseTo(
      CAMELLYA_TWINING_MV * 1.68,
      10,
    );
  });

  it('scores Twining attribute-only through computeDamage (hand-computed)', () => {
    const sheet = emptySheet();
    sheet['dmgBonus:Havoc'] = 0.1;
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
      characterId: 'camellya',
    };
    const result = computeDamage({ ...ctx, forteLevel: 1 });
    // base = 1000 x 3.2924 = 3292.4; bonuses = 1 + 0.1 = 1.1.
    expect(result.baseDamage).toBeCloseTo(3292.4, 6);
    expect(result.bonuses).toBeCloseTo(1.1, 10);
    expect(result.damage).toBeCloseTo(3292.4 * 0.9 * (1520 / 3032) * 1.1, 4);
    // Fixed MV: forte level changes nothing.
    expect(computeDamage({ ...ctx, forteLevel: 10 }).damage).toBe(result.damage);
  });

  it('scales Twining by exactly ×1.68 at Camellya S5', () => {
    const common = {
      sheet: emptySheet(),
      baseAtk: { character: 1000, weapon: 0 },
      baseHp: { character: 10000 },
      baseDef: { character: 1000 },
      attackerLevel: 90,
      skill: outro,
      motionName: '',
      forteLevel: 1,
      enemy: standardMob(90),
      crit: 'nonCrit' as const,
      characterId: 'camellya',
    };
    const s4 = computeDamage({ ...common, resonanceChain: 4 });
    const s5 = computeDamage({ ...common, resonanceChain: 5 });
    expect(s4.damage).toBeGreaterThan(0);
    expect(s5.damage / s4.damage).toBeCloseTo(1.68, 10);
  });
});
