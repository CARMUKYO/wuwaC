import { describe, expect, it } from 'vitest';
import { MAIN_STAT_RANGES, SUB_STAT_TIERS } from '../data/echoStats.ts';
import { loadBundledSnapshot } from '../data/index.ts';
import { ownedEchoSchema } from '../data/schema.ts';
import { SUBSTAT_POOL } from '../data/placeholders.ts';
import { buildSeedEchoes } from './seed.ts';

describe('buildSeedEchoes', () => {
  const defs = loadBundledSnapshot().echoDefs;

  it('builds the requested number of schema-valid rows', () => {
    const rows = buildSeedEchoes(defs, 50);
    expect(rows).toHaveLength(50);
    for (const row of rows) {
      expect(() => ownedEchoSchema.parse(row)).not.toThrow();
    }
  });

  it('uses unique ids and def-consistent cost/sonata', () => {
    const rows = buildSeedEchoes(defs, 50);
    const defById = new Map(defs.map((d) => [d.id, d]));
    expect(new Set(rows.map((r) => r.id)).size).toBe(50);
    for (const row of rows) {
      const def = defById.get(row.echoDefId)!;
      expect(def).toBeDefined();
      expect(row.cost).toBe(def.cost);
      expect(def.sonataIds).toContain(row.sonataId);
      expect(row.origin).toBe('seed');
    }
  });

  it('throws with no defs available', () => {
    expect(() => buildSeedEchoes([], 5)).toThrow(/no echo defs/);
  });

  it('pins every row to the requested sonata set', () => {
    const target = defs[0].sonataIds[0];
    const rows = buildSeedEchoes(defs, 30, Math.random, target);
    expect(rows).toHaveLength(30);
    const defById = new Map(defs.map((d) => [d.id, d]));
    for (const row of rows) {
      expect(row.sonataId).toBe(target);
      expect(defById.get(row.echoDefId)!.sonataIds).toContain(target);
    }
  });

  it('throws when no def belongs to the requested set', () => {
    expect(() => buildSeedEchoes(defs, 5, Math.random, 'no-such-set')).toThrow(/no echo defs.*no-such-set/);
  });

  it('seeds legal maxed values (hand-computed from docs/echostats.md)', () => {
    // rand () => 0: first def (Hooscamp, 1-cost), first % main, 3 subs at tier 1.
    const [row] = buildSeedEchoes(defs, 1, () => 0);
    expect(row.echoDefId).toBe('hooscamp');
    expect(row.sonataId).toBe('lingering-tunes');
    // 1-cost HP% main max is 22.8%; first three pool picks at tier 1 are
    // HP 320 / ATK 30 / ATK% 6.4%.
    expect(row.mainStat).toEqual({ stat: 'hpPct', value: 0.228 });
    expect(row.substats).toEqual([
      { stat: 'hp', value: 320 },
      { stat: 'atk', value: 30 },
      { stat: 'atkPct', value: 0.064 },
    ]);
    expect(row.secondMainStat).toBeUndefined();
  });

  it('keeps every seeded value inside the reference (mains at max, subs on-tier)', () => {
    const rows = buildSeedEchoes(defs, 200);
    expect(rows).toHaveLength(200);
    for (const row of rows) {
      expect(row.mainStat.value).toBe(MAIN_STAT_RANGES[row.cost][row.mainStat.stat]!.max);
      if (row.cost === 1) {
        expect(['hpPct', 'atkPct', 'defPct']).toContain(row.mainStat.stat);
      }
      // Undocumented flat-ATK secondary stays omitted, never guessed.
      expect(row.secondMainStat).toBeUndefined();
      const seen = new Set(row.substats.map((s) => s.stat));
      expect(seen.size).toBe(row.substats.length);
      for (const sub of row.substats) {
        expect(sub.stat).not.toBe(row.mainStat.stat);
        expect(SUB_STAT_TIERS[sub.stat]).toContain(sub.value);
      }
    }
  });

  it('covers the whole substat pool with tiers (seeder precondition)', () => {
    for (const stat of SUBSTAT_POOL) {
      expect(SUB_STAT_TIERS[stat], `${stat} has no tiers`).toBeDefined();
    }
  });
});
