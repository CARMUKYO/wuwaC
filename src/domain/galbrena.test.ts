import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { galbrenaSkillMods } from './galbrena.ts';
import { computeDamage, standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';

const snapshot = loadBundledSnapshot();
const galbrena = snapshot.characters.find((c) => c.id === 'galbrena')!;
const forte = galbrena.skills.find((s) => s.kind === 'forte')!;

describe('galbrenaSkillMods', () => {
  it('ignores other characters', () => {
    expect(galbrenaSkillMods('lupa', 6, 'Resonance Skill - Ravage DMG'))
      .toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
  });

  it('grants the S6 Fusion amp to the full Demon quintet at max Afterflame', () => {
    // 40 Afterflame x 0.875% = 35%.
    for (const motion of [
      'Basic Attack - Seraphic Execution Stage 1 DMG',
      'Heavy Attack - Flamewing Verdict Stage 3 DMG',
      'Mid-air Attack - Hellsent Barrage Sustained Fire DMG',
      'Resonance Skill - Ravage DMG',
      // Bare provider name the old sync filter dropped; kept since the
      // name-filter fix, so this branch is live, not dormant.
      'Dodge Counter - Purgatory Scourge',
    ]) {
      expect(galbrenaSkillMods('galbrena', 6, motion).dmgBonusExtra).toBe(0.35);
      expect(galbrenaSkillMods('galbrena', 6, motion).motionMultiplier).toBe(1);
    }
  });

  it('stays neutral below S6 and off the quintet', () => {
    expect(galbrenaSkillMods('galbrena', 5, 'Resonance Skill - Ravage DMG').dmgBonusExtra).toBe(0);
    for (const motion of [
      'Resonance Skill - Encroach DMG',
      'Resonance Skill - Ascent of Malice DMG',
      'Resonance Liberation - Hellfire Absolution DMG',
      'Hellstride DMG',
      'Outro Skill DMG',
    ]) {
      expect(galbrenaSkillMods('galbrena', 6, motion)).toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
    }
  });
});

describe('galbrena S6 amp through computeDamage', () => {
  const common = {
    sheet: emptySheet(),
    baseAtk: { character: 100, weapon: 0 },
    baseHp: { character: 100 },
    baseDef: { character: 100 },
    attackerLevel: 90,
    enemy: standardMob(90),
    crit: 'nonCrit' as const,
    characterId: 'galbrena',
  };

  it('resolves the S6 amp at exactly x1.35 on an empty sheet (Ravage isolates it)', () => {
    // Ravage carries no S6 motion entry (S5 x2.5 applies both sides and
    // cancels), isolating the +0.35 Fusion bucket.
    const base = computeDamage({ ...common, skill: forte, motionName: 'Resonance Skill - Ravage DMG', forteLevel: 10, resonanceChain: 5 });
    const s6 = computeDamage({ ...common, skill: forte, motionName: 'Resonance Skill - Ravage DMG', forteLevel: 10, resonanceChain: 6 });
    expect(s6.damage / base.damage).toBeCloseTo(1.35, 10);
  });

  it('stacks the S6 amp with the S6 motion entry at exactly x2.16 (double-application pin)', () => {
    // Seraphic carries both the x1.6 motion entry and the +0.35 module
    // bucket at S6: 1.6 x 1.35 = 2.16. Guards module/entry overlap.
    const base = computeDamage({ ...common, skill: forte, motionName: 'Basic Attack - Seraphic Execution Stage 3 DMG', forteLevel: 10, resonanceChain: 5 });
    const s6 = computeDamage({ ...common, skill: forte, motionName: 'Basic Attack - Seraphic Execution Stage 3 DMG', forteLevel: 10, resonanceChain: 6 });
    expect(s6.damage / base.damage).toBeCloseTo(2.16, 10);
  });

  it('stacks the same x2.16 on Purgatory Scourge (quartet, not trio)', () => {
    // Purgatory carries the x1.6 motion entry plus the +0.35 module bucket
    // like its three siblings: 1.6 x 1.35 = 2.16. The motion only exists
    // since the sync-name-filter fix.
    const base = computeDamage({ ...common, skill: forte, motionName: 'Dodge Counter - Purgatory Scourge', forteLevel: 10, resonanceChain: 5 });
    const s6 = computeDamage({ ...common, skill: forte, motionName: 'Dodge Counter - Purgatory Scourge', forteLevel: 10, resonanceChain: 6 });
    expect(s6.damage / base.damage).toBeCloseTo(2.16, 10);
  });
});

describe('galbrena S1 through computeDamage', () => {
  it('grants Afterflame crit DMG to Purgatory Scourge at max stacks', () => {
    // S1: +80% Crit DMG at max Afterflame. Expected mode with critRate 0.5
    // and critDmg 2.0: base crit term 1 + 0.5 x (2.0 - 1) = 1.5, S1 crit
    // term 1 + 0.5 x (2.8 - 1) = 1.9; everything else cancels (S2 note,
    // S3 liberation-scoped, S4 sheet-scope, S5 name-scoped elsewhere).
    const sheet = emptySheet();
    sheet.critRate = 0.5;
    sheet.critDmg = 2.0;
    const run = (resonanceChain: number): number =>
      computeDamage({
        sheet,
        baseAtk: { character: 100, weapon: 0 },
        baseHp: { character: 100 },
        baseDef: { character: 100 },
        attackerLevel: 90,
        skill: forte,
        motionName: 'Dodge Counter - Purgatory Scourge',
        forteLevel: 10,
        enemy: standardMob(90),
        crit: 'expected',
        characterId: 'galbrena',
        resonanceChain,
      }).damage;
    expect(run(1) / run(0)).toBeCloseTo(1.9 / 1.5, 10);
  });
});
