import { describe, expect, it } from 'vitest';
import type { CharacterSkill } from '../data/schema.ts';
import { loadBundledSnapshot } from '../data/index.ts';
import { chisaSkillMods } from './chisa.ts';
import { computeDamage } from './damage.ts';
import { standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';

const snapshot = loadBundledSnapshot();
const chisa = snapshot.characters.find((c) => c.id === 'chisa')!;
const forte = chisa.skills.find((s) => s.kind === 'forte')!;
const liberation = chisa.skills.find((s) => s.kind === 'liberation')!;

// Snapshot Forte rows used below (Sight of Unraveling - Oblivion):
// 'Sawring - Eradication DMG': L1 1.296, L10 2.5767.
// 'Bonus DMG Multiplier per Ring of Chainsaw': L1 0.013, L10 0.0259.

/** Forte-shaped skill with an Eradication motion but no per-Ring row. */
const noRingRowSkill: CharacterSkill = {
  id: 'toy',
  kind: 'forte',
  label: 'toy',
  attribute: 'Havoc',
  scaling: 'ATK',
  motionValues: [
    { name: 'Sawring - Eradication DMG', values: [1.296], hits: 1, dmgType: 'liberation', scaling: 'ATK', isHealing: false },
  ],
};

describe('chisaSkillMods', () => {
  it('ignores other characters', () => {
    expect(chisaSkillMods('jiyan', 6, forte, 'Sawring - Blitz Stage 1 DMG', {}))
      .toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
  });

  it('stacks Woven Myriad and S3 ADDITIVELY on the Sawring trio (x3.4 max)', () => {
    // Provider DamageList tiers prove 1 + 1.2 + 1.2 (see module docs) —
    // the old x4.84 expectation was wrong and is replaced, not loosened.
    const blitz = 'Sawring - Blitz Stage 1 DMG';
    expect(chisaSkillMods('chisa', 0, forte, blitz, {}).motionMultiplier).toBe(1);
    expect(chisaSkillMods('chisa', 0, forte, blitz, { wovenMyriad: true }).motionMultiplier).toBeCloseTo(2.2, 10);
    expect(chisaSkillMods('chisa', 3, forte, blitz, {}).motionMultiplier).toBeCloseTo(2.2, 10);
    expect(chisaSkillMods('chisa', 3, forte, blitz, { wovenMyriad: true }).motionMultiplier).toBeCloseTo(3.4, 10);
    expect(chisaSkillMods('chisa', 3, forte, 'Chainsaw Mode - Dodge Counter DMG', { wovenMyriad: true }).motionMultiplier)
      .toBeCloseTo(3.4, 10);
    expect(chisaSkillMods('chisa', 6, forte, 'Eye of Unraveling DMG', { wovenMyriad: true }).motionMultiplier).toBe(1);
  });

  it('adds consumed Rings as absolute MV points, scaled once (snapshot rows)', () => {
    const eradication = 'Sawring - Eradication DMG';
    // L1, 10 rings, no state/S3: (1.296 + 0.013*10) / 1.296 = 1.10030864...
    expect(chisaSkillMods('chisa', 0, forte, eradication, { ringsConsumed: 10, forteLevel: 1 }).motionMultiplier)
      .toBeCloseTo(1.426 / 1.296, 10);
    // L1, 10 rings, Woven Myriad: 2.2 x (1.426/1.296) = 2.42067901...
    // (the ring component scales exactly once — no inner re-scaling).
    expect(chisaSkillMods('chisa', 0, forte, eradication, { ringsConsumed: 10, forteLevel: 1, wovenMyriad: true }).motionMultiplier)
      .toBeCloseTo((2.2 * 1.426) / 1.296, 10);
    // L1, 100 rings, Woven + S3: 3.4 x (2.596/1.296) = 6.81049382...
    expect(chisaSkillMods('chisa', 3, forte, eradication, { ringsConsumed: 100, forteLevel: 1, wovenMyriad: true }).motionMultiplier)
      .toBeCloseTo((3.4 * 2.596) / 1.296, 10);
    // Zero / omitted rings leave exactly the state/S3 factor.
    expect(chisaSkillMods('chisa', 0, forte, eradication, {}).motionMultiplier).toBe(1);
    expect(chisaSkillMods('chisa', 3, forte, eradication, { ringsConsumed: 0, wovenMyriad: true }).motionMultiplier)
      .toBeCloseTo(3.4, 10);
  });

  it('counts at most 100 Rings toward Eradication (kit text)', () => {
    const eradication = 'Sawring - Eradication DMG';
    const at100 = chisaSkillMods('chisa', 0, forte, eradication, { ringsConsumed: 100, forteLevel: 1 }).motionMultiplier;
    // (1.296 + 1.3) / 1.296 = 2.00308641...
    expect(at100).toBeCloseTo(2.596 / 1.296, 10);
    expect(chisaSkillMods('chisa', 0, forte, eradication, { ringsConsumed: 150, forteLevel: 1 }).motionMultiplier).toBe(at100);
    expect(chisaSkillMods('chisa', 0, forte, eradication, { ringsConsumed: 101, forteLevel: 1 }).motionMultiplier).toBe(at100);
  });

  it('skips the ring term when a row is missing instead of producing NaN', () => {
    const eradication = 'Sawring - Eradication DMG';
    // No per-Ring row: exactly the state factor (2.2), rings ignored.
    expect(chisaSkillMods('chisa', 0, noRingRowSkill, eradication, { ringsConsumed: 50, forteLevel: 1, wovenMyriad: true }).motionMultiplier)
      .toBeCloseTo(2.2, 10);
    // Regex-matching but otherwise unknown motion name: same fallback.
    expect(chisaSkillMods('chisa', 3, forte, 'Sawring - Eradication DMG (imaginary)', { ringsConsumed: 50, forteLevel: 1, wovenMyriad: true }).motionMultiplier)
      .toBeCloseTo(3.4, 10);
  });

  it('grants Liberation +100% DMG Bonus at S5', () => {
    expect(chisaSkillMods('chisa', 5, liberation, 'Skill DMG', {}).dmgBonusExtra).toBe(1);
    expect(chisaSkillMods('chisa', 4, liberation, 'Skill DMG', {}).dmgBonusExtra).toBe(0);
    expect(chisaSkillMods('chisa', 5, forte, 'Sawring - Blitz Stage 1 DMG', {}).dmgBonusExtra).toBe(0);
  });
});

describe('chisa through computeDamage', () => {
  const common = {
    sheet: emptySheet(),
    baseAtk: { character: 100, weapon: 0 },
    baseHp: { character: 100 },
    baseDef: { character: 100 },
    attackerLevel: 90,
    enemy: standardMob(90),
    crit: 'nonCrit' as const,
    characterId: 'chisa',
  };

  it('adds exactly +1.0 to the bonus bucket for S5 Liberation on an empty sheet', () => {
    const base = computeDamage({ ...common, skill: liberation, motionName: 'Skill DMG', forteLevel: 10, resonanceChain: 4 });
    const s5 = computeDamage({ ...common, skill: liberation, motionName: 'Skill DMG', forteLevel: 10, resonanceChain: 5 });
    expect(s5.damage / base.damage).toBeCloseTo(2, 10);
  });

  it('multiplies the Sawring trio in the Liberation state', () => {
    const base = computeDamage({ ...common, skill: forte, motionName: 'Sawring - Blitz Stage 1 DMG', forteLevel: 10 });
    const woven = computeDamage({ ...common, skill: forte, motionName: 'Sawring - Blitz Stage 1 DMG', forteLevel: 10, wovenMyriad: true });
    expect(woven.damage / base.damage).toBeCloseTo(2.2, 10);
  });

  it('scores Eradication rings as absolute MV end to end (L10 snapshot rows)', () => {
    const plain = computeDamage({ ...common, skill: forte, motionName: 'Sawring - Eradication DMG', forteLevel: 10 });
    // S0, no state, 100 rings: (2.5767 + 0.0259*100) / 2.5767 = 2.00516164...
    const ringed = computeDamage({ ...common, skill: forte, motionName: 'Sawring - Eradication DMG', forteLevel: 10, ringsConsumed: 100 });
    expect(ringed.damage / plain.damage).toBeCloseTo(5.1667 / 2.5767, 10);
    // S3 + Woven + 100 rings: 3.4 x (5.1667/2.5767) = 6.81754957...
    const stacked = computeDamage({
      ...common, skill: forte, motionName: 'Sawring - Eradication DMG', forteLevel: 10,
      ringsConsumed: 100, wovenMyriad: true, resonanceChain: 3,
    });
    expect(stacked.damage / plain.damage).toBeCloseTo((3.4 * 5.1667) / 2.5767, 10);
  });
});
