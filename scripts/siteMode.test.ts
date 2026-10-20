import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Plugin } from 'vite';
import config from '../vite.config.ts';
import { CANONICAL_URL } from '../src/site.ts';

/**
 * index.html carries a placeholder, not a hand-copied URL; the `wuwa-site-mode`
 * plugin in vite.config.ts substitutes the one constant in src/site.ts.
 * (`npm run build` output was also checked by hand: see the origin-move report.)
 */
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function sitePlugin(): Plugin {
  const plugins = (config.plugins ?? []) as unknown as Plugin[];
  const found = plugins.find((p) => p.name === 'wuwa-site-mode');
  if (found === undefined) throw new Error('wuwa-site-mode plugin missing');
  return found;
}

describe('canonical URL in index.html', () => {
  it('has no hard-coded deploy URL, only the placeholder', () => {
    expect(html).not.toMatch(/github\.io/);
    const placeholders = html.match(/%SITE_URL%/g) ?? [];
    expect(placeholders.length).toBeGreaterThanOrEqual(3); // canonical, og:url, og:image
  });

  it('is rendered from CANONICAL_URL for canonical, og:url and og:image', () => {
    const hook = sitePlugin().transformIndexHtml;
    const handler = typeof hook === 'function' ? hook : hook !== undefined && 'handler' in hook ? hook.handler : undefined;
    const out = (handler as unknown as (h: string) => string)(html);
    expect(out).toContain(`<link rel="canonical" href="${CANONICAL_URL}" />`);
    expect(out).toContain(`<meta property="og:url" content="${CANONICAL_URL}" />`);
    expect(out).toContain(`content="${CANONICAL_URL}aemeath-ames-still.png"`);
    expect(out).not.toContain('%SITE_URL%');
  });
});

describe('VITE_MOVED_TO validation in the build', () => {
  it('rejects a malformed value while the config resolves and accepts a valid or empty one', () => {
    const hook = sitePlugin().config;
    const run = (value: string): unknown => {
      const previous = process.env.VITE_MOVED_TO;
      process.env.VITE_MOVED_TO = value;
      try {
        return (hook as unknown as (c: object, e: { mode: string }) => unknown)({}, { mode: 'production' });
      } finally {
        if (previous === undefined) delete process.env.VITE_MOVED_TO;
        else process.env.VITE_MOVED_TO = previous;
      }
    };
    expect(() => run('https://wuwa-opt.github.io/wuwaC/')).not.toThrow();
    expect(() => run('')).not.toThrow();
    expect(() => run('https://wuwa-opt.github.io/wuwaC')).toThrow(/VITE_MOVED_TO/);
  });
});
