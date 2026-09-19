import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { computeDamage, standardMob } from './damage.ts';
import {
  aeroErosionMultiplier,
  cartethyiaConvictionCritDmg,
  cartethyiaMotionMultiplier,
  cartethyiaStatusTargetMultiplier,
  maxAeroErosionStacks,
} from './cartethyia.ts';
import { emptySheet } from './stats.ts';

/**
 * Sources: committed snapshot skill/chain text for Cartethyia (skills
 * 1003501–1003510, inherent 1003505, chain S1–S6) plus the Fandom wiki
 * pages opened 2026-09-18:
 * - S1: https://wutheringwaves.fandom.com/wiki/Crown_Destined_by_Fate
 * - S2: https://wutheringwaves.fandom.com/wiki/Blade_Broken_by_Tempest
 * - S6: https://wutheringwaves.fandom.com/wiki/Freedom_Found_in_Storm_s_Wake
 * - Inherent: https://wutheringwaves.fandom.com/wiki/Wind%27s_Indelible_Imprint
 * - Blade consume: https://wutheringwaves.fandom.com/wiki/A_Knight%27s_Heartfelt_Prayers
 * - Erosion table: https://wutheringwaves.fandom.com/wiki/Negative_Status
 * - Forte=Fleurdelys: https://wutheringwaves.fandom.com/wiki/Tempest
 */

const snapshot = loadBundledSnapshot();
const cartethyia = snapshot.characters.find((c) => c.id === 'cartethyia')!;
const basic = cartethyia.skills.find((s) => s.kind === 'basic')!;
const liberation = cartethyia.skills.find((s) => s.kind === 'liberation')!;
const intro = cartethyia.skills.find((s) => s.kind === 'intro')!;
const forte = cartethyia.skills.find((s) => s.kind === 'forte')!;

describe('maxAeroErosionStacks', () => {
  // Base cap 6 (wiki stack table runs 1–6); S2 adds 3 (snapshot + S2 page).
  it('returns 6 below S2 and 9 at S2+', () => {
    expect(maxAeroErosionStacks(0)).toBe(6);
    expect(maxAeroErosionStacks(1)).toBe(6);
    expect(maxAeroErosionStacks(2)).toBe(9);
    expect(maxAeroErosionStacks(6)).toBe(9);
  });
});

describe('aeroErosionMultiplier', () => {
  it('matches the published 1–6 table exactly', () => {
    const table = [0.36, 0.899, 1.799, 2.698, 3.597, 4.497];
    for (const [i, expected] of table.entries()) {
      expect(aeroErosionMultiplier(i + 1)).toBe(expected);
    }
  });

  it('continues the ~0.899 progression for S2 stacks 7–9 (extrapolated)', () => {
    // The wiki table shows `-` past 6 — these continue the published
    // 0.899/0.9 alternation (4.497 + 0.899/0.9/0.899), NOT a published table.
    expect(aeroErosionMultiplier(7)).toBe(5.396);
    expect(aeroErosionMultiplier(8)).toBe(6.296);
    expect(aeroErosionMultiplier(9)).toBe(7.195);
  });

  it('rejects out-of-range and non-integer stacks', () => {
    for (const bad of [0, 10, -1, 1.5, Number.NaN]) {
      expect(() => aeroErosionMultiplier(bad)).toThrow(/Aero Erosion stacks must be an integer from 1 to 9/);
    }
  });
});

describe('cartethyiaStatusTargetMultiplier', () => {
  // Inherent 1003505: 30% at 1–3 stacks, +10% per stack past 3, extra
  // stacks capped at 3 — so 7–9 (S2 range) hold at 1.6.
  it('ramps 1.3 then +0.1 per stack to a 1.6 cap', () => {
    expect(cartethyiaStatusTargetMultiplier(0)).toBe(1);
    expect(cartethyiaStatusTargetMultiplier(1)).toBe(1.3);
    expect(cartethyiaStatusTargetMultiplier(2)).toBe(1.3);
    expect(cartethyiaStatusTargetMultiplier(3)).toBe(1.3);
    expect(cartethyiaStatusTargetMultiplier(4)).toBeCloseTo(1.4, 10);
    expect(cartethyiaStatusTargetMultiplier(5)).toBeCloseTo(1.5, 10);
    expect(cartethyiaStatusTargetMultiplier(6)).toBeCloseTo(1.6, 10);
    expect(cartethyiaStatusTargetMultiplier(7)).toBeCloseTo(1.6, 10);
    expect(cartethyiaStatusTargetMultiplier(9)).toBeCloseTo(1.6, 10);
  });

  it('rejects out-of-range and non-integer stacks', () => {
    for (const bad of [-1, 10, 2.5, Number.NaN]) {
      expect(() => cartethyiaStatusTargetMultiplier(bad)).toThrow(/target Aero Erosion stacks must be an integer from 0 to 9/);
    }
  });
});

describe('cartethyiaConvictionCritDmg', () => {
  // S1: +25% Crit DMG per 30 Conviction on Fleurdelys (= forte kind),
  // up to 4 stacks at 120. 15s duration / Blade-removal are caller-side.
  it('adds one 0.25 stack per 30 Conviction on forte motions at S1+', () => {
    expect(cartethyiaConvictionCritDmg('cartethyia', 1, forte, 0)).toBe(0);
    expect(cartethyiaConvictionCritDmg('cartethyia', 1, forte, 29)).toBe(0);
    expect(cartethyiaConvictionCritDmg('cartethyia', 1, forte, 30)).toBe(0.25);
    expect(cartethyiaConvictionCritDmg('cartethyia', 6, forte, 59)).toBe(0.25);
    expect(cartethyiaConvictionCritDmg('cartethyia', 6, forte, 60)).toBe(0.5);
    expect(cartethyiaConvictionCritDmg('cartethyia', 6, forte, 90)).toBe(0.75);
    expect(cartethyiaConvictionCritDmg('cartethyia', 6, forte, 119)).toBe(0.75);
    expect(cartethyiaConvictionCritDmg('cartethyia', 6, forte, 120)).toBe(1);
  });

  it('stays neutral off Cartethyia, below S1, or off forte', () => {
    expect(cartethyiaConvictionCritDmg('jiyan', 6, forte, 120)).toBe(0);
    expect(cartethyiaConvictionCritDmg(undefined, 6, forte, 120)).toBe(0);
    expect(cartethyiaConvictionCritDmg('cartethyia', 0, forte, 120)).toBe(0);
    expect(cartethyiaConvictionCritDmg('cartethyia', 6, basic, 120)).toBe(0);
    expect(cartethyiaConvictionCritDmg('cartethyia', 6, liberation, 120)).toBe(0);
  });

  it('rejects out-of-range and non-integer Conviction', () => {
    for (const bad of [-1, 121, 30.5, Number.NaN]) {
      expect(() => cartethyiaConvictionCritDmg('cartethyia', 1, forte, bad)).toThrow(/Conviction must be an integer from 0 to 120/);
    }
  });
});

describe('cartethyiaMotionMultiplier', () => {
  const BLADE = 'Blade of Howling Squall DMG';

  it('stays neutral for other characters', () => {
    expect(cartethyiaMotionMultiplier('jiyan', 6, basic, 'Stage 1 DMG', 6)).toBe(1);
    expect(cartethyiaMotionMultiplier(undefined, 6, basic, 'Stage 1 DMG', 6)).toBe(1);
  });

  it('applies only the inherent amp at S0', () => {
    expect(cartethyiaMotionMultiplier('cartethyia', 0, basic, 'Stage 1 DMG', 0)).toBe(1);
    expect(cartethyiaMotionMultiplier('cartethyia', 0, basic, 'Stage 1 DMG', 2)).toBe(1.3);
    expect(cartethyiaMotionMultiplier('cartethyia', 0, basic, 'Stage 1 DMG', 5)).toBeCloseTo(1.5, 10);
  });

  it('grants S2 +50% to basic and intro, excluding Fleurdelys (forte) form', () => {
    // S2 names Cartethyia's Basic/Heavy/Dodge/Intro — forte motions are
    // Fleurdelys's (Tempest page), so they are excluded.
    expect(cartethyiaMotionMultiplier('cartethyia', 2, basic, 'Stage 1 DMG', 0)).toBe(1.5);
    expect(cartethyiaMotionMultiplier('cartethyia', 2, basic, 'Heavy Attack DMG', 0)).toBe(1.5);
    expect(cartethyiaMotionMultiplier('cartethyia', 6, intro, 'Sword to Mark Tide\'s Trace DMG', 0)).toBe(1.5);
    expect(cartethyiaMotionMultiplier('cartethyia', 1, basic, 'Stage 1 DMG', 0)).toBe(1);
    expect(cartethyiaMotionMultiplier('cartethyia', 2, forte, 'Heavy Attack DMG', 0)).toBe(1);
    expect(cartethyiaMotionMultiplier('cartethyia', 2, forte, 'Mid-air Attack 1 DMG', 0)).toBe(1);
  });

  it('grants S2 +200% to base-form mid-air attacks', () => {
    // Real basic-skill rows since the sync-name-filter fix (previously a
    // synthetic name pinned this branch). Fleurdelys mid-airs stay excluded
    // (above).
    expect(cartethyiaMotionMultiplier('cartethyia', 2, basic, 'Mid-air Attack', 0)).toBe(3);
    expect(cartethyiaMotionMultiplier('cartethyia', 2, basic, 'Mid-air Attack 1 Sword Shadow Recalled', 0)).toBe(3);
    expect(cartethyiaMotionMultiplier('cartethyia', 1, basic, 'Mid-air Attack', 0)).toBe(1);
  });

  it('doubles Blade of Howling Squall at S3 (case-insensitive)', () => {
    expect(cartethyiaMotionMultiplier('cartethyia', 3, liberation, BLADE, 0)).toBe(2);
    expect(cartethyiaMotionMultiplier('cartethyia', 3, liberation, 'BLADE OF HOWLING SQUALL DMG', 0)).toBe(2);
    expect(cartethyiaMotionMultiplier('cartethyia', 2, liberation, BLADE, 0)).toBe(1);
  });

  it('amplifies Blade by 20% per consumed stack, capped at five, pre-S6', () => {
    // 3 stacks: inherent 1.3 × consume 1.6 = 2.08.
    expect(cartethyiaMotionMultiplier('cartethyia', 0, liberation, BLADE, 3)).toBeCloseTo(2.08, 10);
    // 5 stacks: inherent 1.5 × consume 2.0 = 3.0 (S2 leaves Blade alone).
    expect(cartethyiaMotionMultiplier('cartethyia', 2, liberation, BLADE, 5)).toBeCloseTo(3.0, 10);
    // 6 stacks: inherent caps at 1.6, consume caps at 2.0 → 3.2.
    expect(cartethyiaMotionMultiplier('cartethyia', 2, liberation, BLADE, 6)).toBeCloseTo(3.2, 10);
    // S3 stacks multiplicatively: 4 stacks → 1.4 × 2 × 1.8 = 5.04.
    expect(cartethyiaMotionMultiplier('cartethyia', 3, liberation, BLADE, 4)).toBeCloseTo(5.04, 10);
  });

  it('drops the consume amp at S6 (stacks kept) and adds Fleurdelys +40%', () => {
    // 4 stacks at S6: inherent 1.4 × S3 2 × S6 1.4 = 3.92, no consume term.
    expect(cartethyiaMotionMultiplier('cartethyia', 6, liberation, BLADE, 4)).toBeCloseTo(3.92, 10);
    // S6 applies to forte motions (Fleurdelys's attacks) at any stacks.
    expect(cartethyiaMotionMultiplier('cartethyia', 6, forte, 'Basic Attack Stage 1 DMG', 0)).toBeCloseTo(1.4, 10);
    expect(cartethyiaMotionMultiplier('cartethyia', 6, forte, 'Basic Attack Stage 1 DMG', 4)).toBeCloseTo(1.4 * 1.4, 10);
    expect(cartethyiaMotionMultiplier('cartethyia', 5, forte, 'Basic Attack Stage 1 DMG', 0)).toBe(1);
    // Base-form non-Blade motions keep only the S2 bonus at S6 (1.5 = S5).
    expect(cartethyiaMotionMultiplier('cartethyia', 6, basic, 'Stage 1 DMG', 0)).toBe(1.5);
    expect(cartethyiaMotionMultiplier('cartethyia', 5, basic, 'Stage 1 DMG', 0)).toBe(1.5);
  });
});

describe('cartethyia through computeDamage', () => {
  const common = {
    baseAtk: { character: 100, weapon: 0 },
    baseHp: { character: 10000 },
    baseDef: { character: 100 },
    attackerLevel: 90,
    enemy: standardMob(90),
    characterId: 'cartethyia',
  };

  it('scales basic damage by exactly 1.3 at 2 target stacks (inherent amp)', () => {
    const sheet = emptySheet();
    const bare = computeDamage({ ...common, sheet, skill: basic, motionName: 'Stage 1 DMG', forteLevel: 10, resonanceChain: 0, targetStatusStacks: 0, crit: 'nonCrit' });
    const amped = computeDamage({ ...common, sheet, skill: basic, motionName: 'Stage 1 DMG', forteLevel: 10, resonanceChain: 0, targetStatusStacks: 2, crit: 'nonCrit' });
    expect(amped.damage / bare.damage).toBeCloseTo(1.3, 10);
  });

  it('scales basic damage by exactly 1.5 at S2', () => {
    const sheet = emptySheet();
    const s1 = computeDamage({ ...common, sheet, skill: basic, motionName: 'Stage 1 DMG', forteLevel: 10, resonanceChain: 1, crit: 'nonCrit' });
    const s2 = computeDamage({ ...common, sheet, skill: basic, motionName: 'Stage 1 DMG', forteLevel: 10, resonanceChain: 2, crit: 'nonCrit' });
    expect(s2.damage / s1.damage).toBeCloseTo(1.5, 10);
  });

  it('scales Blade by 3.0 at 5 stacks S0 (inherent 1.5 × consume 2.0)', () => {
    const sheet = emptySheet();
    const bare = computeDamage({ ...common, sheet, skill: liberation, motionName: 'Blade of Howling Squall DMG', forteLevel: 10, resonanceChain: 0, targetStatusStacks: 0, crit: 'nonCrit' });
    const fed = computeDamage({ ...common, sheet, skill: liberation, motionName: 'Blade of Howling Squall DMG', forteLevel: 10, resonanceChain: 0, targetStatusStacks: 5, crit: 'nonCrit' });
    expect(fed.damage / bare.damage).toBeCloseTo(3.0, 10);
  });

  it('routes Conviction Crit DMG through the crit term on forte motions', () => {
    const sheet = emptySheet();
    sheet.critDmg = 1.5;
    const run = (conviction: number, crit: 'crit' | 'nonCrit') =>
      computeDamage({ ...common, sheet, skill: forte, motionName: 'Basic Attack Stage 1 DMG', forteLevel: 10, resonanceChain: 1, conviction, crit });
    // +0.5 on a 1.5 base in crit mode: 2.0 / 1.5 = 4/3.
    expect(run(60, 'crit').damage / run(0, 'crit').damage).toBeCloseTo(4 / 3, 10);
    // Non-crits never see the term.
    expect(run(120, 'nonCrit').damage / run(0, 'nonCrit').damage).toBeCloseTo(1, 10);
  });
});
