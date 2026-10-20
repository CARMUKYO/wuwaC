import { describe, expect, it } from 'vitest';
import type { OwnedEcho, StatKey } from '../data/schema.ts';
import { maxSameCostInCombo, pruneDominated, relevantStatsForObjective } from './prune.ts';

function mkEcho(
  id: string,
  cost: 1 | 3 | 4,
  stats: Partial<Record<StatKey, number>>,
  sonataId = 'sierra-gale',
): OwnedEcho {
  const entries = Object.entries(stats);
  return {
    id,
    label: id,
    echoDefId: `${id}-def`,
    sonataId,
    cost,
    level: 25,
    rarity: 5,
    mainStat: { stat: 'atk', value: 0 },
    substats: entries.map(([stat, value]) => ({ stat: stat as StatKey, value: value as number })),
    equippedTo: null,
    origin: 'manual',
  };
}

/** Zero-stat 1-costs: tie with each other (never pruned) and make the pool's cheapest cost 1. */
const fillers = (n: number): OwnedEcho[] =>
  Array.from({ length: n }, (_, i) => mkEcho(`filler${i}`, 1, {}));

const budget12 = { costBudget: 12, topN: 1 } as const;
const budget10 = { costBudget: 10, topN: 1 } as const;

function withDef(echo: OwnedEcho, echoDefId: string): OwnedEcho {
  return { ...echo, echoDefId };
}

describe('maxSameCostInCombo', () => {
  it('derives the per-cost cap from the budget (costs 1/3/4)', () => {
    // m·cost + (5 − m)·1 ≤ budget, largest m ≤ 5.
    // Budget 12: 4-cost 2 (8+3=11; 3 would be 12+2=14), 3-cost 3 (9+2=11), 1-cost 5.
    // Budget 10: 4-cost 1 (4+4=8; 2 would be 8+3=11), 3-cost 2 (6+3=9; 3 would be 11), 1-cost 5.
    const costs = [1, 3, 4];
    expect([4, 3, 1].map((c) => maxSameCostInCombo(c, 12, costs))).toEqual([2, 3, 5]);
    expect([4, 3, 1].map((c) => maxSameCostInCombo(c, 10, costs))).toEqual([1, 2, 5]);
  });

  it('is 0 when no legal combo can hold that cost', () => {
    // Without 1-costs, five 3-costs need 15 > 12.
    expect(maxSameCostInCombo(3, 12, [3, 4])).toBe(0);
    expect(maxSameCostInCombo(3, 12, [])).toBe(0);
  });
});

describe('pruneDominated', () => {
  it('drops a strictly-dominated echo when one dominator suffices (4-cost, budget 10, top-1)', () => {
    const strong = mkEcho('strong', 4, { atk: 100, critRate: 0.05 });
    const weak = mkEcho('weak', 4, { atk: 50 });
    const result = pruneDominated([strong, weak, ...fillers(4)], ['atk', 'critRate'], budget10);
    expect(result.pruned).toEqual(['weak']);
    expect(result.kept.map((e) => e.id)).not.toContain('weak');
  });

  it('keeps an echo whose single dominator can share its combo (two 4-costs fit budget 12)', () => {
    const strong = mkEcho('strong', 4, { atk: 100 });
    const weak = mkEcho('weak', 4, { atk: 50 });
    expect(pruneDominated([strong, weak, ...fillers(3)], ['atk'], budget12).pruned).toEqual([]);
  });

  it('needs k dominators: three for a 3-cost at budget 12', () => {
    const weak = mkEcho('weak', 3, { atk: 10 });
    const doms = [mkEcho('d1', 3, { atk: 40 }), mkEcho('d2', 3, { atk: 30 }), mkEcho('d3', 3, { atk: 20 })];
    // Two dominators: weak survives (d1, d2 can both sit beside it in 3-3-3-1-1).
    expect(pruneDominated([weak, doms[0], doms[1], ...fillers(2)], ['atk'], budget12).pruned).toEqual([]);
    // Three: d2 has 1 dominator, d3 has 2, so only weak (3) goes.
    expect(pruneDominated([weak, ...doms, ...fillers(2)], ['atk'], budget12).pruned).toEqual(['weak']);
  });

  it('needs topN − 1 extra dominators for a top-N search', () => {
    const weak = mkEcho('weak', 4, { atk: 10 });
    const d1 = mkEcho('d1', 4, { atk: 30 });
    const d2 = mkEcho('d2', 4, { atk: 20 });
    const pool = [weak, d1, d2, ...fillers(4)];
    // Budget 10, top-2: k = 1, required 2. d2 has one dominator (kept), weak has two.
    expect(pruneDominated(pool, ['atk'], { costBudget: 10, topN: 2 }).pruned).toEqual(['weak']);
    // Top-3: required 3 — nothing goes.
    expect(pruneDominated(pool, ['atk'], { costBudget: 10, topN: 3 }).pruned).toEqual([]);
  });

  it('ignores stats outside the relevant set', () => {
    const strong = mkEcho('strong', 4, { atk: 100 });
    const bulky = mkEcho('bulky', 4, { atk: 50, hp: 9999 });
    const result = pruneDominated([strong, bulky, ...fillers(4)], ['atk'], budget10);
    expect(result.pruned).toEqual(['bulky']);
  });

  it('never compares across cost tiers', () => {
    const big = mkEcho('big', 4, { atk: 500 });
    const small = mkEcho('small', 1, { atk: 50 });
    const result = pruneDominated([big, small], ['atk'], budget10);
    expect(result.kept.map((e) => e.id).sort()).toEqual(['big', 'small']);
    expect(result.pruned).toEqual([]);
  });

  it('never compares across sonata sets (set bonuses are composition-dependent)', () => {
    const strong = mkEcho('strong', 4, { atk: 100 }, 'void-thunder');
    const weak = mkEcho('weak', 4, { atk: 50 }, 'sierra-gale');
    const result = pruneDominated([strong, weak, ...fillers(4)], ['atk'], budget10);
    expect(result.pruned).toEqual([]);
  });

  it('keeps ties (no strict improvement anywhere)', () => {
    const a = mkEcho('a', 4, { atk: 100 });
    const b = mkEcho('b', 4, { atk: 100 });
    const result = pruneDominated([a, b, ...fillers(4)], ['atk'], budget10);
    expect(result.pruned).toEqual([]);
  });

  it('counts dominators sharing a foreign def once (one echo of that def blocks them all)', () => {
    // Budget 12, 3-cost: required 3. x1/x2 share def X, y has def Y.
    const weak = withDef(mkEcho('weak', 3, { atk: 10 }), 'Z');
    const x1 = withDef(mkEcho('x1', 3, { atk: 40 }), 'X');
    const x2 = withDef(mkEcho('x2', 3, { atk: 30 }), 'X');
    const y = withDef(mkEcho('y', 3, { atk: 20 }), 'Y');
    // Counted for weak: X once + Y = 2 < 3. (x2 and y have fewer dominators still.)
    expect(pruneDominated([weak, x1, x2, y, ...fillers(2)], ['atk'], budget12).pruned).toEqual([]);
    // Same pool but weak has def X: x1, x2 count individually (same def) + Y = 3.
    const weakX = withDef(weak, 'X');
    expect(pruneDominated([weakX, x1, x2, y, ...fillers(2)], ['atk'], budget12).pruned).toEqual(['weak']);
  });

  it("ignores a foreign-def dominator whose def also appears at another cost in the set", () => {
    // Budget 10, 4-cost: required 1. strong's def S also exists as a 1-cost
    // in the same set, which could sit beside weak and block the swap's set count.
    const weak = withDef(mkEcho('weak', 4, { atk: 10 }), 'W');
    const strong = withDef(mkEcho('strong', 4, { atk: 50 }), 'S');
    const sOne = withDef(mkEcho('s-one', 1, {}), 'S');
    expect(pruneDominated([weak, strong, sOne, ...fillers(3)], ['atk'], budget10).pruned).toEqual([]);
    // In another set the 1-cost S doesn't affect this set's count: prune is fine.
    const sOneElsewhere = { ...sOne, sonataId: 'void-thunder' };
    expect(
      pruneDominated([weak, strong, sOneElsewhere, ...fillers(3)], ['atk'], budget10).pruned,
    ).toEqual(['weak']);
  });

  it('never drops a main-slot carrier for a dominator of another def', () => {
    const carrier = withDef(mkEcho('carrier', 4, { atk: 10 }), 'kerasaur');
    const strong = withDef(mkEcho('strong', 4, { atk: 50 }), 'plain');
    const isMainCarrier = (def: string): boolean => def === 'kerasaur';
    const pool = [carrier, strong, ...fillers(4)];
    expect(pruneDominated(pool, ['atk'], { ...budget10, isMainCarrier }).pruned).toEqual([]);
    // A same-def dominator keeps the carrier bonus available, so it counts.
    const strongCarrier = withDef(strong, 'kerasaur');
    expect(
      pruneDominated([carrier, strongCarrier, ...fillers(4)], ['atk'], { ...budget10, isMainCarrier }).pruned,
    ).toEqual(['carrier']);
  });

  it('decides chains in dominance order, whatever the input order', () => {
    // Budget 10, 4-cost, top-1: required 1. a > b > c on ATK, defs X/Y/Y.
    const a = withDef(mkEcho('a', 4, { atk: 300 }), 'X');
    const b = withDef(mkEcho('b', 4, { atk: 200 }), 'Y');
    const c = withDef(mkEcho('c', 4, { atk: 100 }), 'Y');
    // Plain: a is decided first and counts for both b and c.
    const plain = pruneDominated([c, b, a, ...fillers(4)], ['atk'], budget10);
    expect(plain.pruned).toEqual(['c', 'b']);
    // Y carries a main-slot bonus: b keeps it (a's def differs), and c is
    // covered by b, a kept same-def dominator.
    const isMainCarrier = (def: string): boolean => def === 'Y';
    const carrier = pruneDominated([c, b, a, ...fillers(4)], ['atk'], { ...budget10, isMainCarrier });
    expect(carrier.pruned).toEqual(['c']);
    expect(carrier.kept.map((e) => e.id)).toEqual(expect.arrayContaining(['a', 'b']));
  });
});

describe('relevantStatsForObjective', () => {
  it('returns the single stat for max-stat plus extras', () => {
    expect(relevantStatsForObjective({ kind: 'max-stat', stat: 'atk' }, 'Aero', 'skill', ['hp'])).toEqual(
      expect.arrayContaining(['atk', 'hp']),
    );
  });

  it('covers the damage inputs for expected-damage', () => {
    const keys = relevantStatsForObjective(
      { kind: 'expected-damage', skillId: 's', motionName: 'm', forteLevel: 1, crit: 'expected' },
      'Aero',
      'skill',
      [],
    );
    expect(keys).toEqual(
      expect.arrayContaining(['atk', 'atkPct', 'critRate', 'critDmg', 'dmgBonus:Aero', 'dmgBonus:skill']),
    );
    expect(keys).not.toContain('dmgBonus:Electro');
  });

  it('includes every action bucket for unverified forte mapping', () => {
    const keys = relevantStatsForObjective(
      { kind: 'expected-damage', skillId: 's', motionName: 'm', forteLevel: 1, crit: 'expected' },
      'Aero',
      'forte',
      [],
    );
    for (const bucket of ['dmgBonus:basic', 'dmgBonus:heavy', 'dmgBonus:skill', 'dmgBonus:liberation', 'dmgBonus:intro']) {
      expect(keys).toContain(bucket);
    }
  });

  it('covers every bucket plus buff-modded stats for rotation-dpr', () => {
    const keys = relevantStatsForObjective(
      {
        kind: 'rotation-dpr',
        blocks: [{ skillId: 's', motionName: 'm', forteLevel: 1, activeBuffIds: [] }],
        buffs: [{ id: 'b', label: 'B', source: 't', mods: [{ stat: 'energyRegen', value: 0.1 }] }],
        globalBuffIds: [],
        crit: 'expected',
      },
      'Aero',
      'basic',
      [],
    );
    for (const bucket of ['dmgBonus:Aero', 'dmgBonus:basic', 'dmgBonus:heavy', 'dmgBonus:skill', 'dmgBonus:liberation', 'dmgBonus:intro', 'dmgBonus:outro', 'dmgBonus:echo']) {
      expect(keys).toContain(bucket);
    }
    expect(keys).toEqual(expect.arrayContaining(['atk', 'critRate', 'amplify', 'energyRegen']));
    expect(keys).not.toContain('dmgBonus:Electro');
  });

  it('uses HP/DEF stat families for HP/DEF-scaling skills (Cartethyia/Taoqi)', () => {
    const spec = { kind: 'expected-damage', skillId: 's', motionName: 'm', forteLevel: 1, crit: 'expected' } as const;
    const hpKeys = relevantStatsForObjective(spec, 'Aero', 'basic', [], 'HP');
    expect(hpKeys).toEqual(expect.arrayContaining(['hp', 'hpPct']));
    expect(hpKeys).not.toContain('atk');
    expect(hpKeys).not.toContain('atkPct');
    const defKeys = relevantStatsForObjective(spec, 'Havoc', 'skill', [], 'DEF');
    expect(defKeys).toEqual(expect.arrayContaining(['def', 'defPct']));
    expect(defKeys).not.toContain('atk');
  });

  it('follows the motion bucket, not the parent skill kind (Luuk liberation -> basic)', () => {
    const spec = { kind: 'expected-damage', skillId: 's', motionName: 'm', forteLevel: 1, crit: 'expected' } as const;
    const keys = relevantStatsForObjective(spec, 'Spectro', 'basic', [], 'ATK');
    expect(keys).toContain('dmgBonus:basic');
    expect(keys).not.toContain('dmgBonus:liberation');
  });
});
