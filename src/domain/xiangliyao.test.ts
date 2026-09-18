import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { computeDamage, standardMob } from './damage.ts';
import { scoreRotationBlocks } from './rotation.ts';
import { emptySheet } from './stats.ts';
import {
  XIANGLIYAO_CHAIN_RULE_MV,
  XIANGLIYAO_S5_CHAIN_RULE_MULTIPLIER,
  xiangliyaoOutroChainRuleSpec,
} from './xiangliyao.ts';

const snapshot = loadBundledSnapshot();
const xiangliyao = snapshot.characters.find((c) => c.id === 'xiangli-yao')!;
const outro = xiangliyao.skills.find((s) => s.kind === 'outro')!;
const basic = xiangliyao.skills.find((s) => s.kind === 'basic')!;

describe('xiangliyaoOutroChainRuleSpec', () => {
  it('matches Xiangli Yao outro blocks with an empty motion name only', () => {
    expect(xiangliyaoOutroChainRuleSpec('xiangli-yao', outro, '')).toEqual({ motionValue: XIANGLIYAO_CHAIN_RULE_MV });
    expect(xiangliyaoOutroChainRuleSpec('xiangli-yao', outro, 'Chain Rule')).toBeNull();
    expect(xiangliyaoOutroChainRuleSpec('xiangli-yao', basic, '')).toBeNull();
    expect(xiangliyaoOutroChainRuleSpec('jiyan', outro, '')).toBeNull();
    expect(xiangliyaoOutroChainRuleSpec(undefined, outro, '')).toBeNull();
  });

  it('pins the prose motion value (237.63% of ATK, skill 1002309)', () => {
    expect(outro.id).toBe('1002309');
    expect(outro.motionValues).toHaveLength(0);
    expect(XIANGLIYAO_CHAIN_RULE_MV).toBeCloseTo(2.3763, 10);
    expect(outro.description ?? '').toContain('237.63%');
    expect(outro.description ?? '').toContain('up to 3 times');
  });

  it('folds the S5 +222% Chain Rule multiplier into the motion value', () => {
    expect(XIANGLIYAO_S5_CHAIN_RULE_MULTIPLIER).toBeCloseTo(3.22, 10);
    expect(xiangliyao.resonanceChain.find((r) => r.rank === 5)!.description).toContain('increased by 222%');
    expect(xiangliyaoOutroChainRuleSpec('xiangli-yao', outro, '', 4)).toEqual({ motionValue: XIANGLIYAO_CHAIN_RULE_MV });
    expect(xiangliyaoOutroChainRuleSpec('xiangli-yao', outro, '', 5)?.motionValue).toBeCloseTo(
      XIANGLIYAO_CHAIN_RULE_MV * 3.22,
      10,
    );
    expect(xiangliyaoOutroChainRuleSpec('xiangli-yao', outro, '', 6)?.motionValue).toBeCloseTo(
      XIANGLIYAO_CHAIN_RULE_MV * 3.22,
      10,
    );
  });

  it('scores Chain Rule attribute-only through computeDamage (hand-computed)', () => {
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
      characterId: 'xiangli-yao',
    };
    const result = computeDamage({ ...ctx, forteLevel: 1 });
    // base = 1000 x 2.3763 = 2376.3; bonuses = 1 + 0.1 = 1.1.
    expect(result.baseDamage).toBeCloseTo(2376.3, 6);
    expect(result.bonuses).toBeCloseTo(1.1, 10);
    expect(result.damage).toBeCloseTo(2376.3 * 0.9 * (1520 / 3032) * 1.1, 4);
    // Fixed MV: forte level changes nothing.
    expect(computeDamage({ ...ctx, forteLevel: 10 }).damage).toBe(result.damage);
  });

  it('scales Chain Rule by exactly ×3.22 at Xiangli Yao S5', () => {
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
      characterId: 'xiangli-yao',
    };
    const s4 = computeDamage({ ...common, resonanceChain: 4 });
    const s5 = computeDamage({ ...common, resonanceChain: 5 });
    expect(s4.damage).toBeGreaterThan(0);
    expect(s5.damage / s4.damage).toBeCloseTo(3.22, 10);
  });

  it('scores outro blocks as Chain Rule triggers, not buff carriers', () => {
    const result = scoreRotationBlocks(
      emptySheet(),
      {
        baseAtk: { character: 1000, weapon: 0 },
        baseHp: { character: 10000 },
        baseDef: { character: 1000 },
      },
      {
        skills: xiangliyao.skills,
        characterId: 'xiangli-yao',
        resonanceChain: 5,
        attackerLevel: 90,
        enemy: standardMob(90),
        blocks: [{ skillId: outro.id, motionName: '', forteLevel: 1, activeBuffIds: [] }],
        buffs: [],
        globalBuffIds: [],
        crit: 'nonCrit',
      },
    );
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].buffCarrier).toBe(false);
    expect(result.blocks[0].label).toMatch(/Chain Rule/);
    // base = 1000 x 2.3763 x 3.22 at S5, no buckets on an empty sheet.
    expect(result.blocks[0].damage).toBeCloseTo(1000 * 2.3763 * 3.22 * 0.9 * (1520 / 3032), 2);
  });
});
