import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot, getCharacter, getWeapon, getSonataSet, getEchoDef } from './index.ts';

describe('snapshot lookups', () => {
  const snapshot = loadBundledSnapshot();

  it('resolves known ids across all four tables', () => {
    expect(getCharacter(snapshot, 'jiyan').name).toBe('Jiyan');
    expect(getWeapon(snapshot, 'verdant-summit').name).toBe('Verdant Summit');
    expect(getSonataSet(snapshot, 'sierra-gale').name).toBe('Sierra Gale');
    expect(getEchoDef(snapshot, 'hooscamp').name).toBe('Hooscamp');
  });

  it('throws on unknown ids', () => {
    expect(() => getCharacter(snapshot, 'nope')).toThrow(/unknown character/);
    expect(() => getWeapon(snapshot, 'nope')).toThrow(/unknown weapon/);
    expect(() => getSonataSet(snapshot, 'nope')).toThrow(/unknown sonata set/);
    expect(() => getEchoDef(snapshot, 'nope')).toThrow(/unknown echo/);
  });
});
