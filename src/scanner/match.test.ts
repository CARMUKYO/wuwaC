import { describe, expect, it } from 'vitest';
import { canonical, levenshtein, matchVocab, normalizedDistance } from './match.ts';

describe('canonical', () => {
  it('lowercases and turns punctuation runs into single spaces', () => {
    expect(canonical('Crit. DMG')).toBe('crit dmg');
    expect(canonical('  Reminiscence: Threnodian - Leviathan ')).toBe('reminiscence threnodian leviathan');
    expect(canonical('Thousand-Puppet Pavilion')).toBe('thousand puppet pavilion');
    expect(canonical('#¢ ')).toBe('');
  });
});

describe('levenshtein', () => {
  it('counts single-character edits (hand-checked)', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3); // k->s, e->i, +g
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('palilion', 'pavilion')).toBe(1);
  });

  it('normalizes by the longer length', () => {
    expect(normalizedDistance('palilion', 'pavilion')).toBe(1 / 8);
    expect(normalizedDistance('hp', 'atk')).toBe(1); // 3 edits / 3
    expect(normalizedDistance('', '')).toBe(0);
  });
});

describe('matchVocab', () => {
  const vocab = [
    { text: 'Crit. Rate', value: 'cr' },
    { text: 'Crit. DMG', value: 'cd' },
    { text: 'Energy Regen', value: 'er' },
    { text: 'Energy Regen.', value: 'er' }, // synonym spelling, same value
  ];

  it('returns exact on equal canonical forms', () => {
    expect(matchVocab('crit rate', vocab)).toEqual({ kind: 'exact', value: 'cr', text: 'Crit. Rate' });
  });

  it('accepts a close read with its distance', () => {
    // "crit rale" vs "crit rate": 1 edit / 9 chars.
    expect(matchVocab('Crit. Rale', vocab)).toEqual({ kind: 'fuzzy', value: 'cr', text: 'Crit. Rate', distance: 1 / 9 });
  });

  it('reports a read between two entries as ambiguous instead of picking one', () => {
    // "crit r" is 3/9 from "crit rate" and 3/8 from "crit dmg": a 0.042 gap < 0.1 margin.
    const m = matchVocab('Crit. R', vocab, { maxDistance: 0.4 });
    expect(m.kind).toBe('ambiguous');
  });

  it('does not let synonyms of one value look ambiguous', () => {
    expect(matchVocab('Energy Regem', vocab)).toMatchObject({ kind: 'fuzzy', value: 'er' });
  });

  it('rejects distant and empty reads', () => {
    expect(matchVocab('Healing', vocab)).toEqual({ kind: 'none' });
    expect(matchVocab('%%', vocab)).toEqual({ kind: 'none' });
  });
});
