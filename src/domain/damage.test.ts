import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import type { CharacterSkill, RosterEntry } from '../data/schema.ts';
import { computeStats, emptySheet } from './stats.ts';
import {
  computeBaseAbilityDamage,
  computeBaseDamage,
  computeCritMultiplier,
  computeDamage,
  computeNegativeStatusBaseDamage,
  computeNegativeStatusDamage,
  computeDefMultiplier,
  computeDmgAmplifyTotal,
  computeDmgBonusPercent,
  computeDmgReductionTotal,
  computeElemReductionTotal,
  computeResMultiplier,
  computeSpecialDmgPercent,
  elementalBoss,
  resolveMotion,
  standardMob,
} from './damage.ts';

const snapshot = loadBundledSnapshot();
const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
const verdant = snapshot.weapons.find((w) => w.id === 'verdant-summit')!;
const liberation = jiyan.skills.find((s) => s.kind === 'liberation')!;

describe('base damage', () => {
  it('multiplies stat by motion, then adds flats', () => {
    expect(computeBaseAbilityDamage(1000, 2.5)).toBe(2500);
    expect(computeBaseDamage(2500, 100, 50)).toBe(2650);
  });
});

describe('computeResMultiplier', () => {
  it('follows the three branches (hand-computed)', () => {
    expect(computeResMultiplier(-0.2)).toBeCloseTo(1.1, 10); // 1 - (-0.2)/2
    expect(computeResMultiplier(0)).toBe(1);
    expect(computeResMultiplier(0.1)).toBeCloseTo(0.9, 10);
    expect(computeResMultiplier(0.4)).toBeCloseTo(0.6, 10);
    expect(computeResMultiplier(0.8)).toBeCloseTo(0.2, 10); // 1/(1+4)
    expect(computeResMultiplier(1)).toBeCloseTo(1 / 6, 10);
  });
});

describe('computeDefMultiplier', () => {
  it('matches the doc ratio at equal levels', () => {
    // attacker 90 vs enemy 90, no ignore/reduction: 1520 / (1520 + 1512).
    expect(
      computeDefMultiplier({ attackerLevel: 90, enemyLevel: 90, defIgnore: 0, defReduction: 0 }),
    ).toBeCloseTo(1520 / 3032, 10);
  });

  it('applies flat reduction before the ratio', () => {
    // Reduction wipes enemy DEF: 1520 / 1520 = 1.
    expect(
      computeDefMultiplier({ attackerLevel: 90, enemyLevel: 90, defIgnore: 0, defReduction: 2000 }),
    ).toBe(1);
  });

  it('caps at 200% with extreme DEF ignore', () => {
    expect(
      computeDefMultiplier({ attackerLevel: 90, enemyLevel: 90, defIgnore: 1, defReduction: 0 }),
    ).toBe(1);
    expect(
      computeDefMultiplier({ attackerLevel: 90, enemyLevel: 90, defIgnore: 2, defReduction: 0 }),
    ).toBe(2);
  });

  it('honors an explicit enemy DEF override', () => {
    expect(
      computeDefMultiplier({ attackerLevel: 90, enemyLevel: 90, enemyDefOverride: 0, defIgnore: 0, defReduction: 0 }),
    ).toBe(1);
  });
});

describe('reduction totals', () => {
  it('subtracts base + additional from 1', () => {
    expect(computeDmgReductionTotal(0.1, 0.05)).toBeCloseTo(0.85, 10);
    expect(computeElemReductionTotal(0, 0)).toBe(1);
  });
});

describe('computeDmgBonusPercent', () => {
  it('sums the attribute and action-type buckets', () => {
    const sheet = emptySheet();
    sheet['dmgBonus:Aero'] = 0.1;
    sheet['dmgBonus:skill'] = 0.2;
    expect(computeDmgBonusPercent(sheet, 'Aero', 'skill')).toBeCloseTo(1.3, 10);
    expect(computeDmgBonusPercent(sheet, 'Aero', 'liberation')).toBeCloseTo(1.1, 10);
  });

  it('sums attribute only for forte (no documented bucket — see TODO)', () => {
    const sheet = emptySheet();
    sheet['dmgBonus:Aero'] = 0.1;
    sheet['dmgBonus:skill'] = 0.2;
    expect(computeDmgBonusPercent(sheet, 'Aero', 'forte')).toBeCloseTo(1.1, 10);
  });
});

describe('amplify / special', () => {
  it('keeps amplify multiplicative and signed', () => {
    expect(computeDmgAmplifyTotal(0.1, -0.05)).toBeCloseTo(1.05, 10);
    expect(computeDmgAmplifyTotal(0, 0)).toBe(1);
  });

  it('models the (currently unused) special multiplier', () => {
    expect(computeSpecialDmgPercent(0, 0)).toBe(1);
    expect(computeSpecialDmgPercent(0.1, 0.2)).toBeCloseTo(1.3, 10);
  });
});

describe('computeCritMultiplier', () => {
  it('resolves single hits and the clamped expected value', () => {
    expect(computeCritMultiplier(0.7, 2, 'crit')).toBe(2);
    expect(computeCritMultiplier(0.7, 2, 'nonCrit')).toBe(1);
    // 0.7 x 2 + 0.3 x 1 = 1.7
    expect(computeCritMultiplier(0.7, 2, 'expected')).toBeCloseTo(1.7, 10);
    // Overcapped rate is wasted: clamps to 1.
    expect(computeCritMultiplier(1.5, 2, 'expected')).toBe(2);
    expect(computeCritMultiplier(-0.2, 2, 'expected')).toBe(1);
  });
});

describe('enemy profiles', () => {
  it('builds the documented stock enemies', () => {
    const mob = standardMob(90);
    expect(mob.baseResistance.Aero).toBe(0.1);
    expect(mob.baseResistance.Havoc).toBe(0.1);
    const boss = elementalBoss(90, 'Electro');
    expect(boss.baseResistance.Electro).toBe(0.4);
    expect(boss.baseResistance.Aero).toBe(0.1);
  });
});

const toySkill: CharacterSkill = {
  id: 'toy',
  kind: 'skill',
  label: 'Toy (Resonance Skill)',
  attribute: 'Fusion',
  scaling: 'ATK',
  motionValues: [{ name: 'Hit', values: [0.5, 0.6], hits: 1, dmgType: 'skill', scaling: 'ATK', isHealing: false }],
};

const toyBases = {
  baseAtk: { character: 1000, weapon: 0 },
  baseHp: { character: 10000 },
  baseDef: { character: 1000 },
};

describe('resolveMotion', () => {
  it('maps forteLevel to index forteLevel - 1, clamped (assumption under test)', () => {
    expect(resolveMotion(toySkill, 'Hit', 1).ratio).toBe(0.5);
    expect(resolveMotion(toySkill, 'Hit', 2).ratio).toBe(0.6);
    expect(resolveMotion(toySkill, 'Hit', 99).ratio).toBe(0.6);
    expect(resolveMotion(toySkill, 'Hit', 0).ratio).toBe(0.5);
  });

  it('pins the real liberation array against data drift', () => {
    // Forte 10 -> index 9. If the mapping is ever corrected, update here too.
    // dmgType uses toMatchObject: a re-sync may refine the bucket (DamageList
    // evidence says Jiyan's Liberation hits are Heavy Attack) without changing
    // the motion values pinned here.
    expect(resolveMotion(liberation, 'Lance of Qingloong Stage 1 DMG', 10)).toMatchObject({
      name: 'Lance of Qingloong Stage 1 DMG',
      ratio: 5.2416,
      flat: 0,
      hits: 8,
      isHealing: false,
    });
  });

  it('throws on unknown components', () => {
    expect(() => resolveMotion(toySkill, 'Missing', 1)).toThrow();
  });
});

describe('computeDamage (Jiyan worked example)', () => {
  // Jiyan L90/asc6, Verdant Summit L90/rank1, S0, no echoes, forte 10,
  // Liberation stage 1 vs a level-90 mob, expected-crit mode.
  // Hand-derived intermediates (see plan notes for the arithmetic):
  //   ATK          = (437.5 + 587.5) x 1.12 = 1148
  //   baseAbility  = 1148 x 5.2416 = 6017.3568
  //   resistances  = 0.9 x (1520/3032)
  //   bonuses      = 1 x 1 x 1 x (0.13 x 1.986 + 0.87) = 1.12818
  const roster: RosterEntry = {
    characterId: 'jiyan',
    level: 90,
    ascension: 6,
    resonanceChain: 0,
    forteLevels: { [liberation.id]: 10 },
    weaponId: 'verdant-summit',
    weaponLevel: 90,
    weaponRank: 1,
  };
  const { sheet, baseAtk, baseHp, baseDef, warnings } = computeStats({
    character: jiyan,
    weapon: verdant,
    roster,
    echoes: [],
    sonataSets: [],
  });

  it('aggregates the expected sheet (crit 13% / 198.6%, atkPct 12%)', () => {
    expect(baseAtk).toEqual({ character: 437.5, weapon: 587.5 });
    expect(baseHp).toEqual({ character: 10487.5 });
    expect(baseDef).toEqual({ character: 1185.5534 });
    expect(sheet.critRate).toBeCloseTo(0.13, 9);
    expect(sheet.critDmg).toBeCloseTo(1.986, 9);
    expect(sheet.atkPct).toBeCloseTo(0.12, 9);
    // Bases stay out of the sheet (bonuses only) — v2 aligns HP/DEF with ATK.
    expect(sheet.hp).toBe(0);
    expect(sheet.def).toBe(0);
    expect(warnings).toHaveLength(1); // unstructured weapon passive
  });

  it('composes the full formula tree', () => {
    const result = computeDamage({
      sheet,
      baseAtk,
      baseHp,
      baseDef,
      attackerLevel: 90,
      skill: liberation,
      motionName: 'Lance of Qingloong Stage 1 DMG',
      forteLevel: 10,
      enemy: standardMob(90),
      crit: 'expected',
    });
    expect(result.baseDamage).toBeCloseTo(6017.3568, 6);
    expect(result.resistances).toBeCloseTo(0.9 * (1520 / 3032), 8);
    expect(result.bonuses).toBeCloseTo(1.12818, 9);
    expect(result.damage).toBeCloseTo(6017.3568 * 0.9 * (1520 / 3032) * 1.12818, 6);
  });

  it('scales HP skills off total Max HP (wiki HP page formula)', () => {
    // HP = baseCharHP x (1 + hpPct) + flatHP = 10000 x 1.5 + 1000 = 16000.
    // baseAbility = 16000 x 0.5 = 8000; nonCrit bonuses = 1.
    const hpSheet = emptySheet();
    hpSheet.hpPct = 0.5;
    hpSheet.hp = 1000;
    const hpSkill: CharacterSkill = {
      ...toySkill,
      scaling: 'HP',
      motionValues: [{ name: 'Hit', values: [0.5], hits: 1, dmgType: 'skill', scaling: 'HP', isHealing: false }],
    };
    const result = computeDamage({
      sheet: hpSheet,
      ...toyBases,
      attackerLevel: 90,
      skill: hpSkill,
      motionName: 'Hit',
      forteLevel: 1,
      enemy: standardMob(90),
      crit: 'nonCrit',
    });
    expect(result.baseDamage).toBeCloseTo(8000, 6);
    expect(result.bonuses).toBe(1);
    expect(result.damage).toBeCloseTo(8000 * 0.9 * (1520 / 3032), 6);
  });

  it('scales DEF skills off total DEF (parallel formula, no weapon base)', () => {
    // DEF = 1000 x (1 + 0.25) + 200 = 1450; baseAbility = 1450 x 0.6 = 870.
    const defSheet = emptySheet();
    defSheet.defPct = 0.25;
    defSheet.def = 200;
    const defSkill: CharacterSkill = {
      ...toySkill,
      scaling: 'DEF',
      motionValues: [{ name: 'Hit', values: [0.6], hits: 1, dmgType: 'skill', scaling: 'DEF', isHealing: false }],
    };
    const result = computeDamage({
      sheet: defSheet,
      ...toyBases,
      attackerLevel: 90,
      skill: defSkill,
      motionName: 'Hit',
      forteLevel: 1,
      enemy: standardMob(90),
      crit: 'nonCrit',
    });
    expect(result.baseDamage).toBeCloseTo(870, 6);
    expect(result.damage).toBeCloseTo(870 * 0.9 * (1520 / 3032), 6);
  });

  it('scores the motion bonus bucket, not the parent skill kind', () => {
    // Skill-kind bucket holds +50% but the motion is typed Basic Attack (+20%):
    // DmgBonusPercent must be 1.2, proving DamageList.Type wins over SkillType
    // (Luuk Herssen's Liberation scores as Basic Attack DMG Bonus).
    const bucketSheet = emptySheet();
    bucketSheet['dmgBonus:basic'] = 0.2;
    bucketSheet['dmgBonus:skill'] = 0.5;
    const basicMotionSkill: CharacterSkill = {
      ...toySkill,
      motionValues: [{ name: 'Hit', values: [1], hits: 1, dmgType: 'basic', scaling: 'ATK', isHealing: false }],
    };
    const result = computeDamage({
      sheet: bucketSheet,
      ...toyBases,
      attackerLevel: 90,
      skill: basicMotionSkill,
      motionName: 'Hit',
      forteLevel: 1,
      enemy: standardMob(90),
      crit: 'nonCrit',
    });
    expect(result.baseDamage).toBeCloseTo(1000, 6);
    expect(result.bonuses).toBeCloseTo(1.2, 10);
  });

  it('scores healing motions as zero damage', () => {
    const healSkill: CharacterSkill = {
      ...toySkill,
      motionValues: [{ name: 'Healing', values: [2], hits: 1, dmgType: 'skill', scaling: 'ATK', isHealing: true }],
    };
    const result = computeDamage({
      sheet: emptySheet(),
      ...toyBases,
      attackerLevel: 90,
      skill: healSkill,
      motionName: 'Healing',
      forteLevel: 1,
      enemy: standardMob(90),
      crit: 'expected',
    });
    expect(result.damage).toBe(0);
    expect(result.baseDamage).toBe(0);
  });

  it('scales each motion off its own stat (Taoqi Power Shift: DEF hits under ATK-first skill)', () => {
    // Skill-level scaling says ATK (first DamageList entry) but the motion is
    // DEF-typed: DEF = 1000 x 1.25 + 200 = 1450, baseAbility = 1450 x 0.6.
    const defSheet = emptySheet();
    defSheet.defPct = 0.25;
    defSheet.def = 200;
    defSheet.atkPct = 9;
    const mixedSkill: CharacterSkill = {
      ...toySkill,
      scaling: 'ATK',
      motionValues: [{ name: 'Hit', values: [0.6], hits: 1, dmgType: 'basic', scaling: 'DEF', isHealing: false }],
    };
    const result = computeDamage({
      sheet: defSheet,
      ...toyBases,
      attackerLevel: 90,
      skill: mixedSkill,
      motionName: 'Hit',
      forteLevel: 1,
      enemy: standardMob(90),
      crit: 'nonCrit',
    });
    // ATK would give (1000+0) x 10 x 0.6 = 6000 base; DEF gives 870.
    expect(result.baseDamage).toBeCloseTo(870, 6);
  });

  it('scores Cartethyia HP-scaling skills instead of throwing (reported bug)', () => {
    const cartethyia = snapshot.characters.find((c) => c.id === 'cartethyia')!;
    const hpSkill = cartethyia.skills.find((s) => s.scaling === 'HP' && s.motionValues.length > 0)!;
    const damageSkill = cartethyia.skills.find((s) =>
      s.motionValues.some((m) => !/healing/i.test(m.name)),
    )!;
    const motion = damageSkill.motionValues.find((m) => !/healing/i.test(m.name))!;
    const { sheet: cartSheet, baseAtk: cartAtk, baseHp: cartHp, baseDef: cartDef } = computeStats({
      character: cartethyia,
      weapon: verdant,
      roster: { ...roster, characterId: 'cartethyia' },
      echoes: [],
      sonataSets: [],
    });
    const result = computeDamage({
      sheet: cartSheet,
      baseAtk: cartAtk,
      baseHp: cartHp,
      baseDef: cartDef,
      attackerLevel: 90,
      skill: damageSkill,
      motionName: motion.name,
      forteLevel: 10,
      enemy: standardMob(90),
      crit: 'expected',
    });
    expect(hpSkill.scaling).toBe('HP');
    expect(result.damage).toBeGreaterThan(0);
  });
});

describe('Cartethyia sequence and Negative Status damage', () => {
  const cartethyia = snapshot.characters.find((c) => c.id === 'cartethyia')!;

  it('uses the Negative Status formula instead of ordinary Aero/Crit bonuses', () => {
    const sheet = emptySheet();
    sheet['dmgBonus:Aero'] = 0.8;
    sheet.critRate = 1;
    sheet.critDmg = 3;
    sheet.negativeStatusAmplify = 0.2;
    const result = computeNegativeStatusDamage({
      sheet,
      status: 'aeroErosion',
      stacks: 1,
      attackerLevel: 90,
      enemy: standardMob(90),
      characterId: 'cartethyia',
      targetStatusStacks: 0,
    });
    const expectedBase = 3674 * 1.25078 * 0.36;
    const expectedResistances = 0.9 * (1520 / 3032);
    expect(computeNegativeStatusBaseDamage(90, 1)).toBeCloseTo(expectedBase, 8);
    expect(result.baseDamage).toBeCloseTo(expectedBase, 8);
    expect(result.bonuses).toBeCloseTo(1.2, 8);
    expect(result.damage).toBeCloseTo(expectedBase * expectedResistances * 1.2, 8);
  });

  it('allows the S2-expanded Aero Erosion cap and rejects it at S0', () => {
    const args = {
      sheet: emptySheet(),
      status: 'aeroErosion' as const,
      stacks: 9,
      attackerLevel: 90,
      enemy: standardMob(90),
      characterId: 'cartethyia',
    };
    expect(() => computeNegativeStatusDamage(args)).toThrow(/at most 6/);
    expect(computeNegativeStatusDamage({ ...args, resonanceChain: 2 }).damage).toBeGreaterThan(0);
  });

  it('applies Cartethyia S2/S3 motion multipliers from the sequence nodes', () => {
    const sheet = emptySheet();
    const basic = cartethyia.skills.find((s) => s.kind === 'basic')!;
    const liberation = cartethyia.skills.find((s) => s.kind === 'liberation')!;
    const common = {
      sheet,
      baseAtk: { character: 100, weapon: 0 },
      baseHp: { character: 10000 },
      baseDef: { character: 100 },
      attackerLevel: 90,
      enemy: standardMob(90),
      crit: 'nonCrit' as const,
      characterId: 'cartethyia',
    };
    const basicMotion = basic.motionValues.find((m) => m.name === 'Stage 1 DMG')!;
    const base = computeDamage({ ...common, skill: basic, motionName: basicMotion.name, forteLevel: 10 });
    const s2 = computeDamage({ ...common, skill: basic, motionName: basicMotion.name, forteLevel: 10, resonanceChain: 2 });
    expect(s2.damage / base.damage).toBeCloseTo(1.5, 10);

    const liberationMotion = liberation.motionValues[0];
    const liberationBase = computeDamage({ ...common, skill: liberation, motionName: liberationMotion.name, forteLevel: 10 });
    const s3 = computeDamage({ ...common, skill: liberation, motionName: liberationMotion.name, forteLevel: 10, resonanceChain: 3 });
    expect(s3.damage / liberationBase.damage).toBeCloseTo(2, 10);
  });

  it('models S1 Conviction Crit DMG and Blade erosion consumption amplification', () => {
    const sheet = emptySheet();
    sheet.critRate = 1;
    sheet.critDmg = 1.5;
    const forte = cartethyia.skills.find((s) => s.kind === 'forte')!;
    const liberation = cartethyia.skills.find((s) => s.kind === 'liberation')!;
    const common = {
      sheet,
      baseAtk: { character: 100, weapon: 0 },
      baseHp: { character: 10000 },
      baseDef: { character: 100 },
      attackerLevel: 90,
      enemy: standardMob(90),
      crit: 'crit' as const,
      characterId: 'cartethyia',
    };
    const forteMotion = forte.motionValues[0];
    const noConviction = computeDamage({ ...common, skill: forte, motionName: forteMotion.name, forteLevel: 10, resonanceChain: 1, conviction: 0 });
    const fullConviction = computeDamage({ ...common, skill: forte, motionName: forteMotion.name, forteLevel: 10, resonanceChain: 1, conviction: 120 });
    expect(fullConviction.damage / noConviction.damage).toBeCloseTo(2.5 / 1.5, 10);

    const blade = liberation.motionValues[0];
    const bladeBase = computeDamage({ ...common, skill: liberation, motionName: blade.name, forteLevel: 10, targetStatusStacks: 5 });
    const bladeS6 = computeDamage({ ...common, skill: liberation, motionName: blade.name, forteLevel: 10, resonanceChain: 6, targetStatusStacks: 5 });
    // S0-S5: 30% inherent status-target bonus × 100% per five-stack Blade
    // consume; S6 keeps the stacks and replaces that consume with its 40%
    // Fleurdelys bonus.
    expect(bladeBase.damage).toBeGreaterThan(0);
    expect(bladeS6.damage / bladeBase.damage).toBeCloseTo(1.4, 10);
  });
});
