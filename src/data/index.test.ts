import bundledJson from './generated/snapshot.json';
import { describe, expect, it } from 'vitest';
import {
  loadBundledSnapshot,
  getCharacter,
  getWeapon,
  getSonataSet,
  getEchoDef,
  snapshotFromBundledSource,
} from './index.ts';
import { snapshotSchema } from './schema.ts';

// `loadBundledSnapshot()` trusts the bundled file at runtime (no zod pass on
// the page-load path). This is the gate that makes that safe.
describe('bundled snapshot validation gate', () => {
  const raw: unknown = bundledJson;

  it('the bundled file is already the schema parse output (defaults/transforms applied)', () => {
    expect(snapshotSchema.parse(raw)).toStrictEqual(raw);
  });

  it('the runtime loader serves exactly the validated data', () => {
    expect(loadBundledSnapshot()).toStrictEqual(snapshotSchema.parse(raw));
  });

  it('parses once per session', () => {
    expect(loadBundledSnapshot()).toBe(loadBundledSnapshot());
  });

  it('accepts the raw import as a string (Vite) or an already-parsed object (tsx/Node)', () => {
    const parsed = { snapshotVersion: 4, characters: [] };
    expect(snapshotFromBundledSource(parsed)).toBe(parsed);
    expect(snapshotFromBundledSource('{"snapshotVersion":4,"characters":[]}')).toEqual(parsed);
  });
});

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
