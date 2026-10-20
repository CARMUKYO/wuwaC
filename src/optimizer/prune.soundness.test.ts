import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import type { OwnedEcho, RosterEntry, StatKey } from '../data/schema.ts';
import { standardMob } from '../domain/damage.ts';
import type { ObjectiveSpec } from '../domain/objectives.ts';
import { searchExhaustive, type OptimizeRequest, type SearchData, type SonataLock } from './search.ts';

/**
 * Pruning must never change the top-N result versus `prune: false`.
 * Regression cases for the old one-dominator rule, then a seeded property test.
 */

const snapshot = loadBundledSnapshot();
const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
const verdant = snapshot.weapons.find((w) => w.id === 'verdant-summit')!;
const liberation = jiyan.skills.find((s) => s.kind === 'liberation')!;
const SET_IDS = ['sierra-gale', 'rejuvenating-glow', 'void-thunder'] as const;
const allSets = snapshot.sonataSets.filter((s) => (SET_IDS as readonly string[]).includes(s.id));

const roster: RosterEntry = {
  characterId: 'jiyan',
  level: 90,
  ascension: 6,
  resonanceChain: 0,
  forteLevels: { [liberation.id]: 10 },
  weaponId: 'verdant-summit',
  weaponLevel: 90,
  weaponRank: 1,
};

function mk(
  id: string,
  def: string,
  cost: 1 | 3 | 4,
  main: [StatKey, number],
  subs: [StatKey, number][] = [],
  sonataId = 'sierra-gale',
): OwnedEcho {
  return {
    id,
    label: id,
    echoDefId: def,
    sonataId,
    cost,
    level: 25,
    rarity: 5,
    mainStat: { stat: main[0], value: main[1] },
    substats: subs.map(([stat, value]) => ({ stat, value })),
    equippedTo: null,
    origin: 'manual',
  };
}

function dataFor(echoes: OwnedEcho[], sonataSets = allSets): SearchData {
  return { character: jiyan, weapon: verdant, roster, echoes, sonataSets, enemy: standardMob(90) };
}

const maxFlatAtk: ObjectiveSpec = { kind: 'max-stat', stat: 'atk' };
const maxAero: ObjectiveSpec = { kind: 'max-stat', stat: 'dmgBonus:Aero' };

const scores = (data: SearchData, request: OptimizeRequest, prune: boolean): number[] =>
  searchExhaustive(data, { ...request, prune }).builds.map((b) => b.score);

describe('dominance pruning soundness (regressions)', () => {
  it('keeps a same-cost echo its dominator can sit beside (two 3-costs in 4-3-3-1-1)', () => {
    // f 4c ATK150, a 3c ATK100, b 3c ATK50, 1-costs u10/w30/v30; no set bonuses.
    // All six cost 13, so every 5-subset (drop one) fits budget 12:
    // drop u -> 360, drop w/v -> 340, drop b -> 320, drop a -> 270, drop f -> 220.
    // The old rule pruned b (a dominates it) and found no legal combo at all.
    const echoes = [
      mk('f', 'F', 4, ['atk', 150]),
      mk('b', 'B', 3, ['atk', 50]),
      mk('a', 'A', 3, ['atk', 100]),
      mk('u', 'U', 1, ['atk', 10]),
      mk('w', 'W', 1, ['atk', 30]),
      mk('v', 'V', 1, ['atk', 30]),
    ];
    const request: OptimizeRequest = { costBudget: 12, sonataLock: { mode: 'none' }, objective: maxFlatAtk, topN: 3 };
    const result = searchExhaustive(dataFor(echoes, []), request);
    expect(result.prunedEchoes).toEqual([]);
    expect(result.builds[0].echoIds).toEqual(['a', 'b', 'f', 'v', 'w']);
    expect(result.builds.map((b) => b.score)).toEqual([360, 340, 340]);
    expect(scores(dataFor(echoes, []), request, false)).toEqual([360, 340, 340]);
  });

  it('keeps the only distinct-def piece a 5pc lock needs (duplicate def dominator)', () => {
    // 5pc needs five distinct defs X, Y, Z, W, V; y is the only Y. x2 is a
    // second X copy that beats y on ATK, so the old rule pruned y and the
    // lock became unsatisfiable. Legal 5pc combos: {x1,y,z,w,v} 4+3+3+1+1=12,
    // ATK 150+50+100+30+30 = 360; {x2,y,z,w,v} 3+3+3+1+1=11, ATK 310.
    // (Sierra Gale's 2pc/5pc carry no flat ATK.)
    const echoes = [
      mk('x1', 'X', 4, ['atk', 150]),
      mk('y', 'Y', 3, ['atk', 50]),
      mk('x2', 'X', 3, ['atk', 100]),
      mk('z', 'Z', 3, ['atk', 100]),
      mk('w', 'W', 1, ['atk', 30]),
      mk('v', 'V', 1, ['atk', 30]),
    ];
    const request: OptimizeRequest = {
      costBudget: 12,
      sonataLock: { mode: 'five', setId: 'sierra-gale' },
      objective: maxFlatAtk,
      topN: 3,
    };
    const result = searchExhaustive(dataFor(echoes), request);
    expect(result.prunedEchoes).not.toContain('y');
    expect(result.builds.map((b) => b.echoIds)).toEqual([
      ['v', 'w', 'x1', 'y', 'z'],
      ['v', 'w', 'x2', 'y', 'z'],
    ]);
    expect(result.builds.map((b) => b.score)).toEqual([360, 310]);
    // Same at top-1: y still needs 3 counted dominators (3-cost, budget 12).
    expect(searchExhaustive(dataFor(echoes), { ...request, topN: 1 }).builds[0].score).toBe(360);
  });

  it('keeps a main-slot carrier dominated only by a stronger non-carrier', () => {
    // Objective: Aero DMG Bonus; no set bonuses. Budget 10 fits one 4-cost
    // (4+3+1+1+1). k carries Kerasaur's main-slot +12% Aero (+12% Liberation);
    // s has more Aero (0.31 vs 0.30), so the old rule pruned k.
    // Combo with k: Aero 0.30 + 0.12 = 0.42 on top of the base sheet;
    // with s: 0.31. k's combo wins by 0.42 − 0.31 = 0.11.
    const echoes = [
      mk('k', 'kerasaur', 4, ['dmgBonus:Aero', 0.3]),
      mk('s', 'plain-4', 4, ['dmgBonus:Aero', 0.31]),
      mk('a', 'A', 3, ['atk', 100]),
      mk('u', 'U', 1, ['atk', 10]),
      mk('w', 'W', 1, ['atk', 10]),
      mk('v', 'V', 1, ['atk', 10]),
    ];
    const request: OptimizeRequest = { costBudget: 10, sonataLock: { mode: 'none' }, objective: maxAero, topN: 1 };
    const unpruned = searchExhaustive(dataFor(echoes, []), { ...request, topN: 2, prune: false });
    expect(unpruned.builds[0].mainEchoId).toBe('k');
    expect(unpruned.builds[0].score - unpruned.builds[1].score).toBeCloseTo(0.11, 10);
    const pruned = searchExhaustive(dataFor(echoes, []), request);
    expect(pruned.prunedEchoes).toEqual([]);
    expect(pruned.builds[0].mainEchoId).toBe('k');
    expect(pruned.builds[0].score).toBe(unpruned.builds[0].score);
  });

  it('still prunes where it is sound', () => {
    // Budget 10, top-1, 4-cost: one dominator suffices. weak loses to strong.
    const echoes = [
      mk('strong', 'S', 4, ['atk', 150]),
      mk('weak', 'W4', 4, ['atk', 100]),
      mk('a', 'A', 3, ['atk', 100]),
      mk('u', 'U', 1, ['atk', 10]),
      mk('w', 'W', 1, ['atk', 30]),
      mk('v', 'V', 1, ['atk', 30]),
    ];
    const request: OptimizeRequest = { costBudget: 10, sonataLock: { mode: 'none' }, objective: maxFlatAtk, topN: 1 };
    const result = searchExhaustive(dataFor(echoes, []), request);
    expect(result.prunedEchoes).toEqual(['weak']);
    // strong + a + u + w + v = 150 + 100 + 10 + 30 + 30 = 320.
    expect(result.builds.map((b) => b.score)).toEqual([320]);
  });
});

/** mulberry32: small deterministic PRNG. */
function prng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

describe('dominance pruning soundness (seeded property)', () => {
  it('pruned top-N scores equal unpruned top-N scores', () => {
    const rand = prng(0x5eed);
    const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
    const int = (lo: number, hi: number): number => lo + Math.floor(rand() * (hi - lo + 1));

    const expectedDamage: ObjectiveSpec = {
      kind: 'expected-damage',
      skillId: liberation.id,
      motionName: 'Lance of Qingloong Stage 1 DMG',
      forteLevel: 10,
      crit: 'expected',
    };
    // Coarse values make dominance (and ties) common.
    const damageStats: StatKey[] = ['atk', 'atkPct', 'critRate', 'critDmg', 'dmgBonus:Aero', 'dmgBonus:liberation'];
    const statValue = (stat: StatKey): number =>
      stat === 'atk' ? int(0, 4) * 20 : int(0, 3) * 0.05;

    let trials = 0;
    const prunedByBudget = { 10: 0, 12: 0 };
    let prunedWithResults = 0;
    for (const costBudget of [10, 12] as const) {
      for (const lockMode of ['none', 'five', 'twoPlusTwo'] as const) {
        for (let rep = 0; rep < 14; rep += 1) {
          const sets = SET_IDS.slice(0, int(2, 3));
          const objective = rep % 2 === 0 ? maxFlatAtk : expectedDamage;
          const topN = pick([1, 1, 1, 2, 3, 5]);
          const size = int(10, 14);
          const echoes: OwnedEcho[] = [];
          for (let i = 0; i < size; i += 1) {
            const cost = pick([4, 4, 3, 3, 1, 1, 1] as const);
            // Small def pools per cost force duplicate defs; occasionally a
            // def crosses costs, and 'kerasaur' is a real main-slot carrier.
            let def = `${cost}c-${int(0, 2)}`;
            if (rand() < 0.1) def = `${pick([1, 3, 4])}c-${int(0, 2)}`;
            if (cost === 4 && rand() < 0.25) def = 'kerasaur';
            const stats = objective.kind === 'max-stat' ? (['atk'] as StatKey[]) : damageStats;
            const main: [StatKey, number] = [pick(stats), 0];
            main[1] = statValue(main[0]);
            const subs: [StatKey, number][] = Array.from({ length: int(0, 2) }, () => {
              const stat = pick(stats);
              return [stat, statValue(stat)];
            });
            // Bias toward the first set so locks are often satisfiable.
            const sonataId = rand() < 0.6 ? sets[0] : pick(sets);
            echoes.push(mk(`e${i}`, def, cost, main, subs, sonataId));
          }
          const sonataLock: SonataLock =
            lockMode === 'none'
              ? { mode: 'none' }
              : lockMode === 'five'
                ? { mode: 'five', setId: sets[0] }
                : { mode: 'twoPlusTwo', setIdA: sets[0], setIdB: sets[1] };
          const request: OptimizeRequest = { costBudget, sonataLock, objective, topN };
          const data = dataFor(echoes);
          const pruned = searchExhaustive(data, { ...request, prune: true });
          const unpruned = searchExhaustive(data, { ...request, prune: false });
          const context = JSON.stringify({ costBudget, lockMode, rep, topN, pruned: pruned.prunedEchoes });
          expect(pruned.builds.map((b) => b.score), context).toEqual(unpruned.builds.map((b) => b.score));
          trials += 1;
          prunedByBudget[costBudget] += pruned.prunedEchoes.length;
          if (pruned.prunedEchoes.length > 0 && unpruned.builds.length > 0) prunedWithResults += 1;
        }
      }
    }
    expect(trials).toBe(84);
    // The property is only meaningful if pruning actually fires, at both
    // budgets, on searches that have results to compare.
    expect(prunedByBudget[10]).toBeGreaterThan(0);
    expect(prunedByBudget[12]).toBeGreaterThan(0);
    expect(prunedWithResults).toBeGreaterThanOrEqual(10);
  });
});
