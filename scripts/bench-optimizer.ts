/**
 * Manual optimizer benchmark (NOT a unit test — wall-clock timing is flaky
 * by nature). Generates deterministic synthetic inventories and times
 * `searchExhaustive` to decide whether branch-and-bound is warranted.
 *
 * Run: npx tsx scripts/bench-optimizer.ts
 */
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { snapshotSchema } from '../src/data/schema.ts';
import type { OwnedEcho, StatKey } from '../src/data/schema.ts';
import { standardMob } from '../src/domain/damage.ts';
import { searchExhaustive, type SearchData } from '../src/optimizer/search.ts';

/** Deterministic PRNG (mulberry32) so runs are comparable. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUB_STATS: StatKey[] = ['atkPct', 'critRate', 'critDmg', 'energyRegen', 'hpPct', 'defPct'];
const MAINS: StatKey[] = ['atkPct', 'critRate', 'critDmg', 'dmgBonus:Aero', 'energyRegen', 'hpPct'];

function makeInventory(n: number): OwnedEcho[] {
  const rand = rng(42);
  const costs: (1 | 3 | 4)[] = [4, 3, 3, 1, 1];
  const echoes: OwnedEcho[] = [];
  for (let i = 0; i < n; i += 1) {
    const subCount = 2 + Math.floor(rand() * 3);
    const used = new Set<StatKey>();
    const substats: OwnedEcho['substats'] = [];
    for (let s = 0; s < subCount; s += 1) {
      const stat = SUB_STATS[Math.floor(rand() * SUB_STATS.length)];
      if (used.has(stat)) continue;
      used.add(stat);
      substats.push({ stat, value: 0.02 + rand() * 0.15 });
    }
    echoes.push({
      id: `bench-${i}`,
      label: `Bench ${i}`,
      echoDefId: `bench-def-${i}`,
      sonataId: i % 2 === 0 ? 'sierra-gale' : 'rejuvenating-glow',
      cost: costs[i % costs.length],
      level: 25,
      rarity: 5,
      mainStat: { stat: MAINS[Math.floor(rand() * MAINS.length)], value: 0.1 + rand() * 0.3 },
      substats,
      equippedTo: null,
      origin: 'bench',
    });
  }
  return echoes;
}

function main(): void {
  const raw = JSON.parse(readFileSync('src/data/generated/snapshot.json', 'utf8')) as unknown;
  const t0 = performance.now();
  const snapshot = snapshotSchema.parse(raw);
  const parseMs = performance.now() - t0;

  const character = snapshot.characters.find((c) => c.id === 'jiyan')!;
  const weapon = snapshot.weapons.find((w) => w.id === 'verdant-summit')!;
  const liberation = character.skills.find((s) => s.kind === 'liberation')!;
  const roster = {
    characterId: 'jiyan',
    level: 90,
    ascension: 6,
    resonanceChain: 0,
    forteLevels: { [liberation.id]: 10 },
    weaponId: 'verdant-summit',
    weaponLevel: 90,
    weaponRank: 1,
  } as const;

  console.log(`snapshot parse+validate: ${parseMs.toFixed(0)}ms`);
  console.log('n\tcombos\tpruned\tevaluated\tms\tcombos/sec');
  for (const n of [12, 20, 30, 50]) {
    const data: SearchData = {
      character,
      weapon,
      roster: { ...roster },
      echoes: makeInventory(n),
      sonataSets: snapshot.sonataSets,
      enemy: standardMob(90),
    };
    const start = performance.now();
    const result = searchExhaustive(data, {
      costBudget: 12,
      sonataLock: { mode: 'none' },
      objective: {
        kind: 'expected-damage',
        skillId: liberation.id,
        motionName: liberation.motionValues[0].name,
        forteLevel: 10,
        crit: 'expected',
      },
      topN: 5,
    });
    const ms = performance.now() - start;
    console.log(
      `${n}\t${result.evaluated}\t${result.prunedEchoes.length}\t${result.evaluated}\t${ms.toFixed(0)}\t${(result.evaluated / (ms / 1000)).toFixed(0)}`,
    );
  }
}

main();
