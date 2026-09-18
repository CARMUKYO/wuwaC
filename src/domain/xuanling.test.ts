import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { computeDamage } from './damage.ts';
import { standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';
import { xuanlingBaneTargetAmplify, xuanlingSkillMods } from './xuanling.ts';

const snapshot = loadBundledSnapshot();
const xuanling = snapshot.characters.find((c) => c.id === 'yangyang-xuanling')!;
const liberation = xuanling.skills.find((s) => s.kind === 'liberation')!;

describe('xuanlingSkillMods', () => {
  it('ignores other characters', () => {
    expect(xuanlingSkillMods('jiyan', 6, 'basic', 'Heavy Attack - Azure Sword Stance DMG', 'heavy'))
      .toEqual({ motionMultiplier: 1, amplifyExtra: 0 });
  });

  it('doubles the S2 motion set at S2+', () => {
    const s2Motions: [string, 'basic' | 'heavy'][] = [
      ['Heavy Attack - Azure Sword Stance DMG', 'heavy'],
      ['Heavy Attack - Feather Sword Stance DMG', 'heavy'],
      ['Mid-air Attack - Feather Sword Stance: Feather Fall DMG', 'heavy'],
      ['Basic Attack - Havoc in Bloom Stage 1 DMG', 'heavy'],
      ['Dodge Counter - Havoc in Bloom Stage 3 DMG', 'heavy'],
    ];
    for (const [name, dmgType] of s2Motions) {
      expect(xuanlingSkillMods('yangyang-xuanling', 2, 'basic', name, dmgType).motionMultiplier).toBe(2);
      expect(xuanlingSkillMods('yangyang-xuanling', 1, 'basic', name, dmgType).motionMultiplier).toBe(1);
    }
    expect(
      xuanlingSkillMods('yangyang-xuanling', 2, 'liberation', 'Hush of a Thousand Voices DMG', 'heavy').motionMultiplier,
    ).toBe(1);
  });

  it('routes S3 Liberation through the Amplify term, not the MV', () => {
    const s3 = xuanlingSkillMods('yangyang-xuanling', 3, 'liberation', 'Hush of a Thousand Voices DMG', 'heavy');
    expect(s3).toEqual({ motionMultiplier: 1, amplifyExtra: 1.75 });
    expect(xuanlingSkillMods('yangyang-xuanling', 3, 'basic', 'Heavy Attack - Azure Sword Stance DMG', 'heavy').amplifyExtra).toBe(0);
    expect(xuanlingSkillMods('yangyang-xuanling', 2, 'liberation', 'Hush of a Thousand Voices DMG', 'heavy').amplifyExtra).toBe(0);
  });

  it('applies S6 Voice Flux to Heavy motions only', () => {
    const on = { voiceFlux: true };
    expect(xuanlingSkillMods('yangyang-xuanling', 6, 'basic', 'Heavy Attack - Azure Sword Stance DMG', 'heavy', on).motionMultiplier)
      .toBeCloseTo(2 * 1.4, 10);
    expect(xuanlingSkillMods('yangyang-xuanling', 6, 'basic', 'Heavy Attack - Azure Sword Stance DMG', 'heavy').motionMultiplier).toBe(2);
    expect(xuanlingSkillMods('yangyang-xuanling', 6, 'basic', 'Basic Attack - Azure Sword Stance Stage 1 DMG', 'basic', on).motionMultiplier).toBe(1);
    expect(xuanlingSkillMods('yangyang-xuanling', 5, 'basic', 'Heavy Attack - Azure Sword Stance DMG', 'heavy', on).motionMultiplier).toBe(2);
  });
});

describe('xuanling through computeDamage', () => {
  const common = {
    sheet: emptySheet(),
    baseAtk: { character: 100, weapon: 0 },
    baseHp: { character: 100 },
    baseDef: { character: 100 },
    attackerLevel: 90,
    enemy: standardMob(90),
    crit: 'nonCrit' as const,
    characterId: 'yangyang-xuanling',
  };

  it('amplifies Liberation by exactly ×2.75 at S3 on an empty sheet', () => {
    // Empty sheet: every other bonus term is 1, isolating the Amplify term.
    const base = computeDamage({ ...common, skill: liberation, motionName: 'Hush of a Thousand Voices DMG', forteLevel: 10, resonanceChain: 2 });
    const s3 = computeDamage({ ...common, skill: liberation, motionName: 'Hush of a Thousand Voices DMG', forteLevel: 10, resonanceChain: 3 });
    expect(s3.damage / base.damage).toBeCloseTo(2.75, 10);
  });

  it('amplifies all her damage by target Bane through the Amplify term (S0)', () => {
    // enemyDefOverride 0 pins the DEF term at 1 so Bane's DEF shred cannot
    // leak into the ratio; empty sheet + nonCrit isolate the Amplify term.
    const flatEnemy = { ...standardMob(90), enemyDefOverride: 0 };
    const scored = (stacks: number) =>
      computeDamage({ ...common, enemy: flatEnemy, skill: liberation, motionName: 'Hush of a Thousand Voices DMG', forteLevel: 10, resonanceChain: 0, targetHavocBaneStacks: stacks });
    // Unbroken Vow needs no chain: 3 stacks -> x1.3, 6 stacks -> x1.36.
    expect(scored(3).damage / scored(0).damage).toBeCloseTo(1.3, 10);
    expect(scored(6).damage / scored(0).damage).toBeCloseTo(1.36, 10);
  });

  it('stacks target-Bane Amplify additively with S3 Liberation Amplify', () => {
    const flatEnemy = { ...standardMob(90), enemyDefOverride: 0 };
    const scored = (stacks: number) =>
      computeDamage({ ...common, enemy: flatEnemy, skill: liberation, motionName: 'Hush of a Thousand Voices DMG', forteLevel: 10, resonanceChain: 3, targetHavocBaneStacks: stacks });
    // (1 + 1.75 + 0.36) / (1 + 1.75) = 3.11 / 2.75.
    expect(scored(6).damage / scored(0).damage).toBeCloseTo(3.11 / 2.75, 10);
  });

  it('does not leak target-Bane Amplify to other characters', () => {
    const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
    const basic = jiyan.skills.find((s) => s.kind === 'basic')!;
    const flatEnemy = { ...standardMob(90), enemyDefOverride: 0 };
    const scored = (stacks: number) =>
      computeDamage({ ...common, characterId: 'jiyan', enemy: flatEnemy, skill: basic, motionName: 'Stage 1 DMG', forteLevel: 1, resonanceChain: 0, targetHavocBaneStacks: stacks });
    expect(scored(3).damage / scored(0).damage).toBe(1);
  });
});

describe('xuanlingBaneTargetAmplify', () => {
  // Unbroken Vow (snapshot inherent skill 1005404): 1-3 Bane stacks grant
  // +10% DMG Amplify per stack (cap 30%); 4-6 grant +12% per stack (cap
  // 36%). Cross-checked against two live transcriptions:
  // https://game8.co/games/Wuthering-Waves/archives/605297 (per-stack table)
  // https://www.lootbar.com/blog/en/wuthering-waves-yangyang-xuanling-kit.html (verbatim kit quote)
  it('grants 10% per stack at 1-3 Bane, nothing at 0', () => {
    expect(xuanlingBaneTargetAmplify(0)).toBe(0);
    expect(xuanlingBaneTargetAmplify(1)).toBeCloseTo(0.1, 10);
    expect(xuanlingBaneTargetAmplify(2)).toBeCloseTo(0.2, 10);
    expect(xuanlingBaneTargetAmplify(3)).toBeCloseTo(0.3, 10);
  });

  it('caps the 12%-per-stack branch at 36% for 4-6 Bane', () => {
    // 4 x 12% = 48% already exceeds the quoted 36% cap, so 4-6 all read 0.36.
    expect(xuanlingBaneTargetAmplify(4)).toBeCloseTo(0.36, 10);
    expect(xuanlingBaneTargetAmplify(5)).toBeCloseTo(0.36, 10);
    expect(xuanlingBaneTargetAmplify(6)).toBeCloseTo(0.36, 10);
  });

  it('rejects stacks outside the reachable 0-6 range', () => {
    for (const bad of [-1, 7, 9, 1.5, Number.NaN]) {
      expect(() => xuanlingBaneTargetAmplify(bad)).toThrow(/integer from 0 to 6/);
    }
  });
});
