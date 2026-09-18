import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from './index.ts';
import { MAIN_STAT_POOLS, SUBSTAT_POOL } from './placeholders.ts';

/**
 * Cost-tier pool transcription checks. Source: docs/echostats.md §1–§2 —
 * failures mean the pools drifted from the guide (or the snapshot was
 * re-synced with per-echo Handbook pools instead of cost tiers).
 */
describe('echo cost-tier pools', () => {
  it('gives 1-cost echoes the small pool (flats + HP%/ATK%/DEF%, no Crit/ER/elemental)', () => {
    expect(MAIN_STAT_POOLS[1].primary).toEqual(['hp', 'atk', 'def', 'hpPct', 'atkPct', 'defPct']);
    expect(MAIN_STAT_POOLS[1].secondary).toBeNull();
  });

  it('gives 3-cost echoes % stats + Energy Regen + all six elementals', () => {
    expect(MAIN_STAT_POOLS[3].primary).toEqual([
      'hpPct',
      'atkPct',
      'defPct',
      'energyRegen',
      'dmgBonus:Glacio',
      'dmgBonus:Fusion',
      'dmgBonus:Electro',
      'dmgBonus:Aero',
      'dmgBonus:Spectro',
      'dmgBonus:Havoc',
    ]);
    expect(MAIN_STAT_POOLS[3].secondary).toBe('atk');
  });

  it('gives 4-cost echoes % stats + Crit/Healing, without ER or elementals', () => {
    expect(MAIN_STAT_POOLS[4].primary).toEqual([
      'hpPct',
      'atkPct',
      'defPct',
      'critRate',
      'critDmg',
      'healingBonus',
    ]);
    expect(MAIN_STAT_POOLS[4].secondary).toBe('atk');
  });

  it('covers the shared substat pool incl. basic/heavy/skill/liberation DMG', () => {
    expect(SUBSTAT_POOL).toEqual([
      'hp',
      'hpPct',
      'atk',
      'atkPct',
      'def',
      'defPct',
      'critRate',
      'critDmg',
      'energyRegen',
      'dmgBonus:basic',
      'dmgBonus:heavy',
      'dmgBonus:skill',
      'dmgBonus:liberation',
    ]);
  });

  it('matches every snapshot echo def pool to its cost tier', () => {
    const snapshot = loadBundledSnapshot();
    expect(snapshot.echoDefs.length).toBeGreaterThan(0);
    for (const def of snapshot.echoDefs) {
      expect(def.allowedMainStats, `${def.name} (${def.cost}-cost) pool`).toEqual(
        MAIN_STAT_POOLS[def.cost].primary,
      );
    }
  });
});
