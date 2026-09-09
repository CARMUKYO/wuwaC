import { describe, expect, it } from 'vitest';
import { filterByName } from './filter.ts';

const items = [{ name: 'Jiyan' }, { name: 'Jinhsi' }, { name: 'Verina' }];

describe('filterByName', () => {
  it('matches case-insensitive substrings', () => {
    expect(filterByName(items, (i) => i.name, 'ji').map((i) => i.name)).toEqual(['Jiyan', 'Jinhsi']);
    expect(filterByName(items, (i) => i.name, 'VER')).toEqual([{ name: 'Verina' }]);
  });

  it('returns everything on empty/blank queries', () => {
    expect(filterByName(items, (i) => i.name, '')).toHaveLength(3);
    expect(filterByName(items, (i) => i.name, '   ')).toHaveLength(3);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterByName(items, (i) => i.name, 'zzz')).toEqual([]);
  });
});
