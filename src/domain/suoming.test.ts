import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { computeDamage, standardMob } from './damage.ts';
import { emptySheet } from './stats.ts';
import { suomingSkillMods } from './suoming.ts';

const snapshot = loadBundledSnapshot();
const suoming = snapshot.characters.find((c) => c.id === 'suoming')!;
const basic = suoming.skills.find((s) => s.kind === 'basic')!;
const intro = suoming.skills.find((s) => s.kind === 'intro')!;
const skill = suoming.skills.find((s) => s.kind === 'skill')!;

const UNFURLED_BASICS = basic.motionValues
  .map((m) => m.name)
  .filter((name) => name.startsWith('Basic Attack - Unfurled Canopy'));

describe('suomingSkillMods', () => {
  it('doubles the six Unfurled basic rows under Seal Master (snapshot names)', () => {
    // Four Unfurled stages + two Whirling Thunder stages — the full Seal
    // Master target set, read from the snapshot rather than hardcoded.
    expect(UNFURLED_BASICS).toHaveLength(6);
    for (const name of UNFURLED_BASICS) {
      expect(suomingSkillMods('suoming', name, { sealMaster: true })).toEqual({
        motionMultiplier: 2,
        dmgBonusExtra: 0,
      });
      expect(suomingSkillMods('suoming', name, {})).toEqual({ motionMultiplier: 1, dmgBonusExtra: 0 });
      expect(suomingSkillMods('suoming', name, { sealMaster: false })).toEqual({
        motionMultiplier: 1,
        dmgBonusExtra: 0,
      });
    }
  });

  it('excludes the Unfurled rows Seal Master does not name', () => {
    const inputs = { sealMaster: true };
    // Dodge Counter - Unfurled Canopy is not a Basic Attack row.
    expect(
      suomingSkillMods('suoming', 'Dodge Counter - Unfurled Canopy DMG', inputs).motionMultiplier,
    ).toBe(1);
    // Unfurled intro rows are Intro Skill rows, not Basic Attack rows.
    for (const motion of intro.motionValues) {
      expect(suomingSkillMods('suoming', motion.name, inputs).motionMultiplier).toBe(1);
    }
    // Crimson Gleam / Unforsaken Mind are Resonance Skill rows.
    for (const motion of skill.motionValues) {
      expect(suomingSkillMods('suoming', motion.name, inputs).motionMultiplier).toBe(1);
    }
    // Awakened-state basics are not Unfurled rows.
    expect(suomingSkillMods('suoming', 'Basic Attack Stage 1 DMG', inputs).motionMultiplier).toBe(1);
  });

  it('stays neutral for other characters', () => {
    expect(suomingSkillMods('hsin', UNFURLED_BASICS[0], { sealMaster: true })).toEqual({
      motionMultiplier: 1,
      dmgBonusExtra: 0,
    });
    expect(suomingSkillMods(undefined, UNFURLED_BASICS[0], { sealMaster: true })).toEqual({
      motionMultiplier: 1,
      dmgBonusExtra: 0,
    });
  });

  it('scales an Unfurled block by exactly x2 through computeDamage (hand-computed)', () => {
    const common = {
      sheet: emptySheet(),
      baseAtk: { character: 1000, weapon: 0 },
      baseHp: { character: 10000 },
      baseDef: { character: 1000 },
      attackerLevel: 90,
      skill: basic,
      motionName: 'Basic Attack - Unfurled Canopy Stage 1 DMG',
      forteLevel: 10,
      enemy: standardMob(90),
      crit: 'nonCrit' as const,
      characterId: 'suoming',
    };
    const off = computeDamage(common);
    const on = computeDamage({ ...common, sealMaster: true });
    expect(off.damage).toBeGreaterThan(0);
    expect(on.damage / off.damage).toBeCloseTo(2, 10);
    // Seal Master doubles the motion value, nothing else: the nonCrit
    // expected value is linear in the multiplier.
    expect(on.baseDamage / off.baseDamage).toBeCloseTo(2, 10);
  });
});
