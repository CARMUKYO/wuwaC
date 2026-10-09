import { describe, expect, it } from 'vitest';
import { sonataTint } from './sonataTint.ts';

describe('sonataTint', () => {
  it('uses the named token for the five designed sets', () => {
    expect(sonataTint('molten-rift')).toBe('var(--color-set-molten-rift)');
    expect(sonataTint('sierra-gale')).toBe('var(--color-set-sierra-gale)');
  });

  it('hashes other sets onto a stable fallback tint', () => {
    const tint = sonataTint('lingering-tunes');
    expect(tint).toMatch(/^var\(--color-set-tint-[1-8]\)$/);
    expect(sonataTint('lingering-tunes')).toBe(tint);
  });

  it('spreads different sets over more than one fallback tint', () => {
    const ids = ['havoc-eclipse', 'moonlit-clouds', 'midnight-veil', 'crown-of-valor', 'law-of-harmony', 'chromatic-foam'];
    expect(new Set(ids.map(sonataTint)).size).toBeGreaterThan(1);
  });
});
