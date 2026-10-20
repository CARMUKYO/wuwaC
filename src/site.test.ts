import { describe, expect, it } from 'vitest';
import { CANONICAL_URL, LEGACY_SITE_URL, movedShareUrl, parseMovedTo } from './site.ts';

describe('parseMovedTo (build-time VITE_MOVED_TO validation)', () => {
  it('treats unset and blank as the live site', () => {
    expect(parseMovedTo(undefined)).toBeNull();
    expect(parseMovedTo('')).toBeNull();
    expect(parseMovedTo('   ')).toBeNull();
  });

  it('accepts an exact https URL ending in a slash, unchanged', () => {
    expect(parseMovedTo('https://wuwa-opt.github.io/wuwaC/')).toBe('https://wuwa-opt.github.io/wuwaC/');
    expect(parseMovedTo('https://example.com/')).toBe('https://example.com/');
  });

  it.each([
    ['http://wuwa-opt.github.io/wuwaC/', 'https'],
    ['javascript:alert(1)//', 'https'],
    ['https://wuwa-opt.github.io/wuwaC', 'trailing slash'],
    ['https://wuwa-opt.github.io', 'trailing slash'],
    ['https://wuwa-opt.github.io/wuwaC/?x=1', 'query'],
    ['https://wuwa-opt.github.io/wuwaC/#b=1', 'fragment'],
    ['https://user:pw@wuwa-opt.github.io/wuwaC/', 'credentials'],
    ['https://WUWA-opt.github.io/wuwaC/', 'canonical form'],
    ['not a url', 'not a URL'],
    ['/wuwaC/', 'not a URL'],
  ])('rejects %s', (raw, why) => {
    expect(() => parseMovedTo(raw)).toThrow(new RegExp(`VITE_MOVED_TO.*${why}`));
  });
});

describe('movedShareUrl', () => {
  const target = 'https://wuwa-opt.github.io/wuwaC/';

  it('appends the same fragment to the configured target only', () => {
    expect(movedShareUrl(target, '#b=2.AbC-_9')).toBe('https://wuwa-opt.github.io/wuwaC/#b=2.AbC-_9');
  });

  it('offers nothing without a pending share link', () => {
    expect(movedShareUrl(target, null)).toBeNull();
    expect(movedShareUrl(target, '#builds')).toBeNull();
  });
});

describe('site constants', () => {
  it('keep the project-site shape the Vite base path expects', () => {
    for (const url of [CANONICAL_URL, LEGACY_SITE_URL]) {
      expect(new URL(url).pathname).toBe('/wuwaC/');
      expect(url.startsWith('https://')).toBe(true);
    }
    expect(new URL(CANONICAL_URL).origin).not.toBe(new URL(LEGACY_SITE_URL).origin);
  });
});
