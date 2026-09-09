import { loadBundledSnapshot } from '../data/index.ts';
import { ownedEchoSchema, type EchoDefData, type OwnedEcho, type StatKey } from '../data/schema.ts';
import { SUBSTAT_POOL } from '../data/placeholders.ts';
import { db } from './db.ts';
import { useInventoryStore } from './inventory.ts';

/**
 * DEV-only inventory seeder (random echoes for optimizer testing).
 * Builds rows from real synced echo defs (cost/sonata/pools) with random
 * values — never shipped to production UI except behind `import.meta.env.DEV`.
 */

const FLAT_STATS: ReadonlySet<StatKey> = new Set(['hp', 'atk', 'def']);

function randomValue(stat: StatKey, rand: () => number): number {
  if (FLAT_STATS.has(stat)) return Math.round(50 + rand() * 950);
  return Math.round((0.05 + rand() * 0.3) * 10000) / 10000;
}

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

/** Pure row builder (testable without Dexie). Throws if a row fails validation. */
export function buildSeedEchoes(
  defs: readonly EchoDefData[],
  count: number,
  rand: () => number = Math.random,
): OwnedEcho[] {
  if (defs.length === 0) throw new Error('no echo defs available for seeding');
  const rows: OwnedEcho[] = [];
  for (let i = 0; i < count; i += 1) {
    const def = pick(defs, rand);
    const mainStat = pick(def.allowedMainStats, rand);
    const subCount = 3 + Math.floor(rand() * 3); // 3–5
    const pool = SUBSTAT_POOL.filter((s) => s !== mainStat);
    const substats: OwnedEcho['substats'] = [];
    for (let s = 0; s < subCount && pool.length > 0; s += 1) {
      const idx = Math.floor(rand() * pool.length);
      const [stat] = pool.splice(idx, 1);
      substats.push({ stat, value: randomValue(stat, rand) });
    }
    rows.push(
      ownedEchoSchema.parse({
        id: crypto.randomUUID(),
        label: def.name,
        echoDefId: def.id,
        sonataId: pick(def.sonataIds, rand),
        cost: def.cost,
        level: 25,
        rarity: 5,
        mainStat: { stat: mainStat, value: randomValue(mainStat, rand) },
        ...(def.cost > 1 ? { secondMainStat: { stat: 'atk', value: Math.round(40 + rand() * 110) } } : {}),
        substats,
        equippedTo: null,
        origin: 'seed',
      }),
    );
  }
  return rows;
}

/** Bulk-writes random echoes into the inventory store. DEV only. */
export async function seedInventory(count = 30): Promise<number> {
  const rows = buildSeedEchoes(loadBundledSnapshot().echoDefs, count);
  await db.ownedEchoes.bulkAdd(rows);
  useInventoryStore.setState((s) => ({ echoes: [...s.echoes, ...rows], loaded: true }));
  return rows.length;
}
