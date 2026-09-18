import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { AEMEATH_S6_FIXED_CRIT, aemeathSkillMods } from './aemeath.ts';
import { computeDamage } from './damage.ts';
import { standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';

const snapshot = loadBundledSnapshot();
const aemeath = snapshot.characters.find((c) => c.id === 'aemeath')!;
const liberation = aemeath.skills.find((s) => s.kind === 'liberation')!;
const forte = aemeath.skills.find((s) => s.kind === 'forte')!;
const basic = aemeath.skills.find((s) => s.kind === 'basic')!;

describe('aemeathSkillMods', () => {
  it('ignores other characters', () => {
    expect(aemeathSkillMods('jiyan', 6, liberation, 'Heavenfall Edict: Finale DMG', 'liberation'))
      .toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
  });

  it('doubles Seraphic Duet Overture/Encore at S2 without touching the per-instance motion', () => {
    expect(aemeathSkillMods('aemeath', 2, forte, 'Seraphic Duet: Encore DMG', 'forte').motionMultiplier).toBe(2);
    expect(aemeathSkillMods('aemeath', 2, forte, 'Seraphic Duet: Overture DMG', 'forte').motionMultiplier).toBe(2);
    expect(aemeathSkillMods('aemeath', 1, forte, 'Seraphic Duet: Encore DMG', 'forte').motionMultiplier).toBe(1);
    expect(aemeathSkillMods('aemeath', 1, forte, 'Seraphic Duet: Overture DMG', 'forte').motionMultiplier).toBe(1);
    expect(aemeathSkillMods('aemeath', 2, forte, 'Seraphic Duet Bonus DMG (Per Instance) DMG', 'forte').motionMultiplier).toBe(1);
  });

  it('scales Finale ×2 and Overdrive ×1.4 at S3', () => {
    expect(aemeathSkillMods('aemeath', 3, liberation, 'Heavenfall Edict: Finale DMG', 'liberation').motionMultiplier).toBe(2);
    expect(aemeathSkillMods('aemeath', 3, liberation, 'Heavenfall Edict: Overdrive DMG', 'liberation').motionMultiplier)
      .toBeCloseTo(1.4, 10);
    expect(aemeathSkillMods('aemeath', 2, liberation, 'Heavenfall Edict: Finale DMG', 'liberation').motionMultiplier).toBe(1);
  });

  it('adds the S6 Liberation bucket to liberation-kind and liberation-considered motions', () => {
    expect(aemeathSkillMods('aemeath', 6, liberation, 'Heavenfall Edict: Finale DMG', 'liberation').dmgBonusExtra).toBe(0.4);
    expect(aemeathSkillMods('aemeath', 6, basic, 'Heavy Attack - Aemeath Charged I DMG', 'liberation').dmgBonusExtra).toBe(0.4);
    // Forte-kind but "considered Resonance Liberation DMG" (provider
    // Liberation typing) — the S6 bucket applies.
    expect(aemeathSkillMods('aemeath', 6, forte, 'Seraphic Duet: Overture DMG', 'liberation').dmgBonusExtra).toBe(0.4);
    expect(aemeathSkillMods('aemeath', 6, basic, 'Basic Attack - Aemeath Stage 1 DMG', 'basic').dmgBonusExtra).toBe(0);
    expect(aemeathSkillMods('aemeath', 5, liberation, 'Heavenfall Edict: Finale DMG', 'liberation').dmgBonusExtra).toBe(0);
  });

  it('applies the S6 bucket to Starburst-as-plain-block via provider typing (flagged boundary)', () => {
    // Starburst is "considered Tune Rupture DMG" in kit text, but its
    // provider typing is Liberation — the degenerate plain-block path
    // inherits provider typing wholesale (see module docs; the intended
    // Tune-pipeline path never consults this module).
    expect(aemeathSkillMods('aemeath', 6, forte, 'Tune Rupture Response - Starburst DMG', 'liberation').dmgBonusExtra).toBe(0.4);
  });

  it('pins the S6 fixed-crit values for the Phase 5 Tune/Status pipeline', () => {
    expect(AEMEATH_S6_FIXED_CRIT).toEqual({ rate: 0.8, dmg: 2.75 });
  });
});

describe('aemeath through computeDamage', () => {
  const common = {
    sheet: emptySheet(),
    baseAtk: { character: 100, weapon: 0 },
    baseHp: { character: 100 },
    baseDef: { character: 100 },
    attackerLevel: 90,
    enemy: standardMob(90),
    crit: 'nonCrit' as const,
    characterId: 'aemeath',
  };

  it('resolves S2 Overture at ×2 end to end', () => {
    const base = computeDamage({ ...common, skill: forte, motionName: 'Seraphic Duet: Overture DMG', forteLevel: 10, resonanceChain: 1 });
    const s2 = computeDamage({ ...common, skill: forte, motionName: 'Seraphic Duet: Overture DMG', forteLevel: 10, resonanceChain: 2 });
    expect(s2.damage / base.damage).toBeCloseTo(2, 10);
  });

  it('resolves the S6 Liberation bucket at exactly ×1.4 on an empty sheet', () => {
    const base = computeDamage({ ...common, skill: liberation, motionName: 'Heavenfall Edict: Finale DMG', forteLevel: 10, resonanceChain: 5 });
    const s6 = computeDamage({ ...common, skill: liberation, motionName: 'Heavenfall Edict: Finale DMG', forteLevel: 10, resonanceChain: 6 });
    // S5→S6 changes nothing else on this motion, isolating the +0.40 bucket.
    expect(s6.damage / base.damage).toBeCloseTo(1.4, 10);
  });

  it('resolves S3 Overdrive at exactly ×1.4 end to end', () => {
    const base = computeDamage({ ...common, skill: liberation, motionName: 'Heavenfall Edict: Overdrive DMG', forteLevel: 10, resonanceChain: 2 });
    const s3 = computeDamage({ ...common, skill: liberation, motionName: 'Heavenfall Edict: Overdrive DMG', forteLevel: 10, resonanceChain: 3 });
    // S2→S3 changes only the Overdrive MV (the Between-Stars replacement
    // and infliction riders are manual/unmodeled).
    expect(s3.damage / base.damage).toBeCloseTo(1.4, 10);
  });

  it('stacks S3 Finale ×2 with the S6 bucket at exactly ×2.8 end to end', () => {
    const base = computeDamage({ ...common, skill: liberation, motionName: 'Heavenfall Edict: Finale DMG', forteLevel: 10, resonanceChain: 2 });
    const stacked = computeDamage({ ...common, skill: liberation, motionName: 'Heavenfall Edict: Finale DMG', forteLevel: 10, resonanceChain: 6 });
    // S2→S6 on this motion: S3 doubles the MV, S6 adds +0.40 to the empty
    // Liberation bucket (S4 is sheet-side, S5 is revive — both inert here).
    expect(stacked.damage / base.damage).toBeCloseTo(2.8, 10);
  });
});
