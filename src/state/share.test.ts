import { describe, expect, it } from 'vitest';
import type { Build } from '../data/schema.ts';
import { BUILD_LINK_VERSION, decodeBuildLink, encodeBuildLink } from './share.ts';

const build: Build = {
  id: 'b1',
  name: 'Jiyan ★ Liberation ✓',
  characterId: 'jiyan',
  weaponId: 'verdant-summit',
  echoIds: ['a', 'b', 'c', 'd', 'e'],
  objectiveId: 'Expected damage',
  objective: {
    kind: 'expected-damage',
    skillId: '1001103',
    motionName: 'Lance of Qingloong Stage 1 DMG',
    forteLevel: 10,
    crit: 'expected',
  },
  score: 1234.5,
  updatedAt: new Date().toISOString(),
};

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('build share links', () => {
  it('round-trips a build through encode/decode, unicode included', () => {
    const hash = encodeBuildLink(build);
    expect(hash.startsWith('#b=')).toBe(true);
    expect(decodeBuildLink(hash)).toEqual(build);
  });

  it('rejects missing prefixes, garbage, wrong versions, and invalid builds', () => {
    expect(() => decodeBuildLink('b=abc')).toThrow();
    expect(() => decodeBuildLink('#b=!!!not-base64!!!')).toThrow();
    expect(() =>
      decodeBuildLink(`#b=${toBase64Url(JSON.stringify({ v: 999, build }))}`),
    ).toThrow(/version/);
    expect(() =>
      decodeBuildLink(`#b=${toBase64Url(JSON.stringify({ v: BUILD_LINK_VERSION }))}`),
    ).toThrow();
    expect(() =>
      decodeBuildLink(
        `#b=${toBase64Url(JSON.stringify({ v: BUILD_LINK_VERSION, build: { ...build, echoIds: ['a'] } }))}`,
      ),
    ).toThrow();
  });
});
