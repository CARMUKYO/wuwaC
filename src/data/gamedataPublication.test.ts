import { describe, expect, it } from 'vitest';
import bundledJson from './generated/snapshot.json';
import {
  buildGamedataPublication,
  checksumJson,
  GAMEDATA_MANIFEST_PATH,
  gamedataManifestSchema,
} from './gamedataPublication.ts';
import { snapshotSchema, type Snapshot } from './schema.ts';

const bundled = snapshotSchema.parse(bundledJson);

/** Small valid snapshot (one record per table) with a controlled fetch time. */
function tiny(fetchedAt: string): Snapshot {
  return snapshotSchema.parse({
    ...bundled,
    fetchedAt,
    characters: bundled.characters.slice(0, 1),
    weapons: bundled.weapons.slice(0, 1),
    sonataSets: bundled.sonataSets.slice(0, 1),
    echoDefs: bundled.echoDefs.slice(0, 1),
  });
}

describe('checksumJson', () => {
  it('matches published FNV-1a 32-bit vectors', () => {
    expect(checksumJson('')).toBe('811c9dc5');
    expect(checksumJson('a')).toBe('e40c292c');
    expect(checksumJson('foobar')).toBe('bf9cf968');
  });
});

describe('buildGamedataPublication', () => {
  it('publishes the canonical JSON with a content-addressed path and matching manifest', () => {
    const snapshot = tiny('2026-10-01T00:00:00.000Z');
    const { manifest, payload } = buildGamedataPublication(snapshot);
    // Canonical JSON = what writeCachedSnapshot checksums for the cache row.
    expect(payload).toBe(JSON.stringify(snapshotSchema.parse(snapshot)));
    expect(manifest).toEqual({
      snapshotVersion: snapshot.snapshotVersion,
      fetchedAt: '2026-10-01T00:00:00.000Z',
      checksum: checksumJson(payload),
      path: `gamedata/snapshot-${checksumJson(payload)}.json`,
      bytes: new TextEncoder().encode(payload).byteLength,
    });
    expect(gamedataManifestSchema.parse(manifest)).toEqual(manifest);
  });

  it('is minified and deterministic: the same data gives the same name', () => {
    const a = buildGamedataPublication(tiny('2026-10-01T00:00:00.000Z'));
    const b = buildGamedataPublication(JSON.parse(JSON.stringify(tiny('2026-10-01T00:00:00.000Z'))));
    expect(a).toEqual(b);
    expect(a.payload).not.toMatch(/\n/);
    expect(buildGamedataPublication(tiny('2026-10-02T00:00:00.000Z')).manifest.path).not.toBe(a.manifest.path);
  });

  it('counts UTF-8 bytes, not UTF-16 code units', () => {
    // Same string length, but 'é' is 2 bytes in UTF-8.
    const snapshot = tiny('2026-10-01T00:00:00.000Z');
    const named = (name: string) =>
      buildGamedataPublication({ ...snapshot, characters: [{ ...snapshot.characters[0], name }] });
    const plain = named('Cafe');
    const accented = named('Café');
    expect(accented.payload.length).toBe(plain.payload.length);
    expect(accented.manifest.bytes).toBe(plain.manifest.bytes + 1);
  });

  it('round-trips the bundled snapshot (what the build publishes)', () => {
    const { manifest, payload } = buildGamedataPublication(bundledJson);
    expect(JSON.parse(payload)).toEqual(bundled);
    expect(manifest.fetchedAt).toBe(bundled.fetchedAt);
  });

  it('throws on invalid data so a broken snapshot fails the build', () => {
    expect(() => buildGamedataPublication({ bogus: true })).toThrow();
  });

  it('pins the manifest location and payload paths inside gamedata/', () => {
    expect(GAMEDATA_MANIFEST_PATH).toBe('gamedata/manifest.json');
    const { manifest } = buildGamedataPublication(tiny('2026-10-01T00:00:00.000Z'));
    for (const path of ['../snapshot-0000abcd.json', 'gamedata/x.json', 'https://evil.example/snapshot-0000abcd.json']) {
      expect(gamedataManifestSchema.safeParse({ ...manifest, path }).success).toBe(false);
    }
  });
});
