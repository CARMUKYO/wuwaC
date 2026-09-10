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

const toySkill: CharacterSkill = {
  id: 'toy',
  kind: 'forte',
  label: 'toy',
  attribute: 'Havoc',
  scaling: 'ATK',
  motionValues: [
    { name: 'Bonus DMG Multiplier per Ring of Chainsaw', values: [0.013], hits: 1, dmgType: 'forte', scaling: 'ATK', isHealing: false },
  ],
};

describe('chisaSkillMods', () => {
  it('ignores other characters', () => {
    expect(chisaSkillMods('jiyan', 6, forte, 'Sawring - Blitz Stage 1 DMG', {}))
      .toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
  });

  it('stacks Woven Myriad and S3 on the Sawring trio', () => {
    const blitz = 'Sawring - Blitz Stage 1 DMG';
    expect(chisaSkillMods('chisa', 0, forte, blitz, {}).motionMultiplier).toBe(1);
    expect(chisaSkillMods('chisa', 0, forte, blitz, { wovenMyriad: true }).motionMultiplier).toBeCloseTo(2.2, 10);
    expect(chisaSkillMods('chisa', 3, forte, blitz, {}).motionMultiplier).toBeCloseTo(2.2, 10);
    expect(chisaSkillMods('chisa', 3, forte, blitz, { wovenMyriad: true }).motionMultiplier).toBeCloseTo(4.84, 10);
    expect(chisaSkillMods('chisa', 3, forte, 'Chainsaw Mode - Dodge Counter DMG', { wovenMyriad: true }).motionMultiplier)
      .toBeCloseTo(4.84, 10);
    expect(chisaSkillMods('chisa', 6, forte, 'Eye of Unraveling DMG', { wovenMyriad: true }).motionMultiplier).toBe(1);
  });

  it('scales Eradication with consumed Rings (pinned composition assumption)', () => {
    // forteLevel 1 → per-Ring 0.013; 10 rings, no state/S3: 1 + 0.13.
    expect(chisaSkillMods('chisa', 0, toySkill, 'Sawring - Eradication DMG', { ringsConsumed: 10, forteLevel: 1 }).motionMultiplier)
      .toBeCloseTo(1.13, 10);
    // With Woven Myriad the ring bonus scales the same way (assumption — see module docs).
    expect(chisaSkillMods('chisa', 0, toySkill, 'Sawring - Eradication DMG', { ringsConsumed: 10, forteLevel: 1, wovenMyriad: true }).motionMultiplier)
      .toBeCloseTo(2.2 * (1 + 0.013 * 10 * 2.2), 10);
    expect(chisaSkillMods('chisa', 0, toySkill, 'Sawring - Eradication DMG', {}).motionMultiplier).toBe(1);
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
});
