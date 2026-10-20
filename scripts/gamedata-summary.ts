/**
 * Change summary for a game-data sync PR (`.github/workflows/sync-gamedata.yml`).
 *
 * Compares two snapshot files and prints Markdown: snapshot version and
 * fetch time, then per category the record counts and the added, removed
 * and changed ids. `fetchedAt` stamps (top level and each record's
 * `source.fetchedAt`) are ignored when deciding "changed" — every sync
 * restamps them, so they would mark every record. Pure functions plus a
 * thin CLI; no network, no repo writes.
 *
 * Run: npx tsx scripts/gamedata-summary.ts <before.json> <after.json>
 *      npx tsx scripts/gamedata-summary.ts --changed <before.json> <after.json>
 *        (prints `true`/`false`: does the data differ beyond fetch stamps?)
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const CATEGORIES = ['characters', 'weapons', 'sonataSets', 'echoDefs'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface CategoryChange {
  category: Category;
  before: number;
  after: number;
  added: string[];
  removed: string[];
  changed: string[];
}

export interface SnapshotChange {
  snapshotVersion: { before: unknown; after: unknown };
  fetchedAt: { before: unknown; after: unknown };
  categories: CategoryChange[];
}

/** Ids listed per bucket before the rest is summarised as "… and N more". */
export const MAX_LISTED_IDS = 40;

function field(snapshot: unknown, key: string): unknown {
  return typeof snapshot === 'object' && snapshot !== null ? (snapshot as Record<string, unknown>)[key] : undefined;
}

/** Records of a category by id (non-objects and id-less entries are skipped). */
function recordsById(snapshot: unknown, category: Category): Map<string, unknown> {
  const list = field(snapshot, category);
  const byId = new Map<string, unknown>();
  if (!Array.isArray(list)) return byId;
  for (const record of list) {
    const id = field(record, 'id');
    if (typeof id === 'string') byId.set(id, record);
  }
  return byId;
}

/** Key-sorted JSON without any `fetchedAt` stamps: equal iff the data is equal. */
export function comparableJson(value: unknown): string {
  return JSON.stringify(value, (key, inner: unknown) => {
    if (key === 'fetchedAt') return undefined;
    if (typeof inner !== 'object' || inner === null || Array.isArray(inner)) return inner;
    return Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  });
}

/**
 * True when the data differs beyond `fetchedAt` stamps — the sync workflow's
 * "is there anything to propose" decision. Every sync restamps `fetchedAt`
 * (top level and per record), so a raw diff would open a PR every week and
 * make every client re-download identical data.
 */
export function hasDataChanges(before: unknown, after: unknown): boolean {
  return comparableJson(before) !== comparableJson(after);
}

export function diffSnapshots(before: unknown, after: unknown): SnapshotChange {
  return {
    snapshotVersion: { before: field(before, 'snapshotVersion'), after: field(after, 'snapshotVersion') },
    fetchedAt: { before: field(before, 'fetchedAt'), after: field(after, 'fetchedAt') },
    categories: CATEGORIES.map((category) => {
      const old = recordsById(before, category);
      const next = recordsById(after, category);
      const added = [...next.keys()].filter((id) => !old.has(id)).sort();
      const removed = [...old.keys()].filter((id) => !next.has(id)).sort();
      const changed = [...next.keys()]
        .filter((id) => old.has(id) && comparableJson(old.get(id)) !== comparableJson(next.get(id)))
        .sort();
      return { category, before: old.size, after: next.size, added, removed, changed };
    }),
  };
}

function idList(ids: string[]): string {
  const shown = ids.slice(0, MAX_LISTED_IDS).map((id) => `\`${id}\``);
  const rest = ids.length - shown.length;
  return rest > 0 ? `${shown.join(', ')}, … and ${rest} more` : shown.join(', ');
}

export function renderSummary(change: SnapshotChange): string {
  const lines = [
    '## Game-data change summary',
    '',
    `- Snapshot version: ${String(change.snapshotVersion.before)} → ${String(change.snapshotVersion.after)}`,
    `- Fetched: ${String(change.fetchedAt.before)} → ${String(change.fetchedAt.after)}`,
    '',
    '| Category | Before | After | Added | Removed | Changed |',
    '|---|---|---|---|---|---|',
    ...change.categories.map(
      (c) => `| ${c.category} | ${c.before} | ${c.after} | ${c.added.length} | ${c.removed.length} | ${c.changed.length} |`,
    ),
  ];
  for (const c of change.categories) {
    const buckets: [string, string[]][] = [
      ['Added', c.added],
      ['Removed', c.removed],
      ['Changed', c.changed],
    ];
    const present = buckets.filter(([, ids]) => ids.length > 0);
    if (present.length === 0) continue;
    lines.push('', `### ${c.category}`, '');
    for (const [label, ids] of present) lines.push(`- **${label}:** ${idList(ids)}`);
  }
  if (change.categories.every((c) => c.added.length + c.removed.length + c.changed.length === 0)) {
    lines.push('', 'No record changes (only fetch timestamps moved).');
  }
  return `${lines.join('\n')}\n`;
}

function main(argv: string[]): void {
  const changedOnly = argv[0] === '--changed';
  const [beforePath, afterPath] = changedOnly ? argv.slice(1) : argv;
  if (beforePath === undefined || afterPath === undefined) {
    console.error('usage: tsx scripts/gamedata-summary.ts [--changed] <before.json> <after.json>');
    process.exitCode = 2;
    return;
  }
  const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8')) as unknown;
  const before = read(beforePath);
  const after = read(afterPath);
  process.stdout.write(changedOnly ? `${hasDataChanges(before, after)}\n` : renderSummary(diffSnapshots(before, after)));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
