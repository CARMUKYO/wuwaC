import { describe, expect, it } from 'vitest';
import { comparableJson, diffSnapshots, hasDataChanges, MAX_LISTED_IDS, renderSummary } from './gamedata-summary.ts';

const stamp = (fetchedAt: string) => ({ provider: 'encore.moe', fetchedAt, apiId: 1 });

// Hand-built fixtures: one character renamed, one weapon added, one weapon
// removed, a sonata set whose only difference is its fetch stamp, echoes
// unchanged.
const before = {
  snapshotVersion: 4,
  fetchedAt: '2026-10-03T00:00:00.000Z',
  characters: [
    { id: 'jiyan', name: 'Jiyan', source: stamp('2026-10-03T00:00:00.000Z') },
    { id: 'verina', name: 'Verina', source: stamp('2026-10-03T00:00:00.000Z') },
  ],
  weapons: [
    { id: 'old-blade', name: 'Old Blade', source: stamp('2026-10-03T00:00:00.000Z') },
    { id: 'verdant-summit', name: 'Verdant Summit', source: stamp('2026-10-03T00:00:00.000Z') },
  ],
  sonataSets: [{ id: 'sierra-gale', name: 'Sierra Gale', source: stamp('2026-10-03T00:00:00.000Z') }],
  echoDefs: [{ id: 'hooscamp', cost: 1 }],
};

const after = {
  snapshotVersion: 4,
  fetchedAt: '2026-10-10T00:00:00.000Z',
  characters: [
    { id: 'jiyan', name: 'Jiyan', source: stamp('2026-10-10T00:00:00.000Z') },
    { id: 'verina', name: 'Verina (renamed)', source: stamp('2026-10-10T00:00:00.000Z') },
  ],
  weapons: [
    { id: 'verdant-summit', name: 'Verdant Summit', source: stamp('2026-10-10T00:00:00.000Z') },
    { id: 'new-blade', name: 'New Blade', source: stamp('2026-10-10T00:00:00.000Z') },
  ],
  sonataSets: [{ source: stamp('2026-10-10T00:00:00.000Z'), name: 'Sierra Gale', id: 'sierra-gale' }],
  echoDefs: [{ id: 'hooscamp', cost: 1 }],
};

describe('diffSnapshots', () => {
  it('reports counts and added/removed/changed ids per category, ignoring fetch stamps and key order', () => {
    expect(diffSnapshots(before, after)).toEqual({
      snapshotVersion: { before: 4, after: 4 },
      fetchedAt: { before: '2026-10-03T00:00:00.000Z', after: '2026-10-10T00:00:00.000Z' },
      categories: [
        { category: 'characters', before: 2, after: 2, added: [], removed: [], changed: ['verina'] },
        { category: 'weapons', before: 2, after: 2, added: ['new-blade'], removed: ['old-blade'], changed: [] },
        { category: 'sonataSets', before: 1, after: 1, added: [], removed: [], changed: [] },
        { category: 'echoDefs', before: 1, after: 1, added: [], removed: [], changed: [] },
      ],
    });
  });

  it('treats a missing or malformed side as empty (first sync, partial file)', () => {
    const change = diffSnapshots({}, { characters: [{ id: 'a' }, { name: 'no id' }, 7], weapons: 'nope' });
    expect(change.categories[0]).toEqual({
      category: 'characters', before: 0, after: 1, added: ['a'], removed: [], changed: [],
    });
    expect(change.categories[1]).toEqual({
      category: 'weapons', before: 0, after: 0, added: [], removed: [], changed: [],
    });
  });
});

describe('hasDataChanges (does the sync propose a PR?)', () => {
  it('a timestamp-only resync is not a change', () => {
    const restamped = JSON.parse(JSON.stringify(before).replaceAll('2026-10-03T00:00:00.000Z', '2026-10-10T00:00:00.000Z'));
    expect(restamped).not.toEqual(before);
    expect(hasDataChanges(before, restamped)).toBe(false);
  });

  it('any record change, addition, removal or version bump is a change', () => {
    expect(hasDataChanges(before, after)).toBe(true);
    expect(hasDataChanges(before, { ...before, echoDefs: [] })).toBe(true);
    expect(hasDataChanges(before, { ...before, snapshotVersion: 5 })).toBe(true);
  });
});

describe('comparableJson', () => {
  it('drops fetchedAt at any depth and sorts keys', () => {
    expect(comparableJson({ b: 1, a: { fetchedAt: 'x', z: [{ fetchedAt: 'y', q: 2 }] } })).toBe(
      '{"a":{"z":[{"q":2}]},"b":1}',
    );
  });
});

describe('renderSummary', () => {
  it('renders the table and lists only non-empty buckets', () => {
    expect(renderSummary(diffSnapshots(before, after))).toBe(
      [
        '## Game-data change summary',
        '',
        '- Snapshot version: 4 → 4',
        '- Fetched: 2026-10-03T00:00:00.000Z → 2026-10-10T00:00:00.000Z',
        '',
        '| Category | Before | After | Added | Removed | Changed |',
        '|---|---|---|---|---|---|',
        '| characters | 2 | 2 | 0 | 0 | 1 |',
        '| weapons | 2 | 2 | 1 | 1 | 0 |',
        '| sonataSets | 1 | 1 | 0 | 0 | 0 |',
        '| echoDefs | 1 | 1 | 0 | 0 | 0 |',
        '',
        '### characters',
        '',
        '- **Changed:** `verina`',
        '',
        '### weapons',
        '',
        '- **Added:** `new-blade`',
        '- **Removed:** `old-blade`',
        '',
      ].join('\n'),
    );
  });

  it('says so when only timestamps moved', () => {
    const restamped = { ...before, fetchedAt: '2026-10-10T00:00:00.000Z' };
    expect(renderSummary(diffSnapshots(before, restamped))).toContain('No record changes (only fetch timestamps moved).');
  });

  it(`caps long id lists at ${MAX_LISTED_IDS}`, () => {
    const many = { characters: Array.from({ length: MAX_LISTED_IDS + 5 }, (_, i) => ({ id: `c${String(i).padStart(2, '0')}` })) };
    const text = renderSummary(diffSnapshots({}, many));
    expect(text).toContain('`c39`, … and 5 more');
    expect(text).not.toContain('`c40`');
  });
});
