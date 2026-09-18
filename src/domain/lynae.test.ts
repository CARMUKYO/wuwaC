import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { computeDamage, standardMob } from './damage.ts';
import {
  LYNAE_S3_PREMIXED_FULL_STACKS,
  LYNAE_S3_PREMIXED_MAX_STACKS,
  LYNAE_S3_PREMIXED_PER_STACK,
  lynaeSkillMods,
} from './lynae.ts';
import { emptySheet } from './stats.ts';

const snapshot = loadBundledSnapshot();
const lynae = snapshot.characters.find((c) => c.id === 'lynae')!;
const skill = lynae.skills.find((s) => s.id === '1004502')!;
const forte = lynae.skills.find((s) => s.kind === 'forte')!;

describe('lynaeSkillMods', () => {
  it('pins the full-stack Premixed Hue bonus (25 x 55% = 1375%)', () => {
    expect(LYNAE_S3_PREMIXED_MAX_STACKS).toBe(25);
    expect(LYNAE_S3_PREMIXED_PER_STACK).toBeCloseTo(0.55, 10);
    expect(LYNAE_S3_PREMIXED_FULL_STACKS).toBeCloseTo(13.75, 10);
    expect(lynae.resonanceChain.find((r) => r.rank === 3)!.description).toContain('55%');
  });

  it('ignores other characters', () => {
    expect(lynaeSkillMods('mornye', 6, skill, 'Additive Color DMG')).toEqual({
      motionMultiplier: 1,
      dmgBonusExtra: 0,
    });
  });

  it('grants the S3 bonus to Additive Color only, at rank and above', () => {
    expect(lynaeSkillMods('lynae', 3, skill, 'Additive Color DMG')).toEqual({
      motionMultiplier: 1,
      dmgBonusExtra: 13.75,
    });
    expect(lynaeSkillMods('lynae', 6, skill, 'Additive Color DMG').dmgBonusExtra).toBe(13.75);
    expect(lynaeSkillMods('lynae', 2, skill, 'Additive Color DMG').dmgBonusExtra).toBe(0);
    // Sibling skill motion and the S3 x1.9 forte motions stay neutral here
    // (their multipliers live in catalog motion entries).
    expect(lynaeSkillMods('lynae', 3, skill, 'Lynae-Style Palettes DMG')).toEqual({
      motionMultiplier: 1,
      dmgBonusExtra: 0,
    });
    expect(lynaeSkillMods('lynae', 3, forte, 'Basic Attack - Visual Impact DMG').dmgBonusExtra).toBe(0);
  });
});

describe('lynae S3 Premixed Hue through computeDamage', () => {
  const common = {
    sheet: emptySheet(),
    baseAtk: { character: 100, weapon: 0 },
    baseHp: { character: 100 },
    baseDef: { character: 100 },
    attackerLevel: 90,
    enemy: standardMob(90),
    crit: 'nonCrit' as const,
    characterId: 'lynae',
  };

  it('resolves the full-stack bonus at exactly x14.75 on an empty sheet', () => {
    // Additive Color carries no S3 motion entry, isolating the +13.75
    // additive bucket: (1 + 13.75) / 1 = 14.75.
    const run = (resonanceChain: number): number =>
      computeDamage({ ...common, skill, motionName: 'Additive Color DMG', forteLevel: 10, resonanceChain }).damage;
    expect(run(3) / run(2)).toBeCloseTo(14.75, 10);
  });

  it('leaves the S3 x1.9 forte motions to the catalog entries (no double-application)', () => {
    // Visual Impact gains only its x1.9 catalog entry at S3 — the module
    // adds no bucket there.
    const run = (resonanceChain: number): number =>
      computeDamage({
        ...common,
        skill: forte,
        motionName: 'Basic Attack - Visual Impact DMG',
        forteLevel: 10,
        resonanceChain,
      }).damage;
    expect(run(3) / run(2)).toBeCloseTo(1.9, 10);
  });
});
