import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { computeDamage } from './damage.ts';
import { standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';
import { xuanlingSkillMods } from './xuanling.ts';

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
});
