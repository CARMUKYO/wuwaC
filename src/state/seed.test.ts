import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { ownedEchoSchema } from '../data/schema.ts';
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
});
