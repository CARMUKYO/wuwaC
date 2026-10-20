/**
 * Where this app lives, in one place. Pure (no imports, no `import.meta`) so
 * `vite.config.ts` can use it at build time as well as the UI at runtime.
 */

/** The canonical deploy. index.html's canonical / og:url / og:image come from here. */
export const CANONICAL_URL = 'https://wuwa-opt.github.io/wuwaC/';

/**
 * The original deploy. Browser storage is per origin, so existing users'
 * data is still here; that site is built in "moved" mode (see `parseMovedTo`)
 * and the new site points people back at it to export.
 */
export const LEGACY_SITE_URL = 'https://carmukyo.github.io/wuwaC/';

/**
 * Validate the `VITE_MOVED_TO` build variable. Unset or blank means "this is
 * the live site" (`null`). Anything else must be an exact `https:` URL that
 * ends in `/`, with no credentials, query or fragment, written the way the
 * URL parser would write it back, so it can never be derived from the page
 * and a typo fails the build instead of shipping a banner that links nowhere.
 */
export function parseMovedTo(raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === '') return null;
  const fail = (why: string): never => {
    throw new Error(`VITE_MOVED_TO must be an https URL ending in "/" (${why}); got ${JSON.stringify(raw)}`);
  };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail('not a URL');
  }
  if (url.protocol !== 'https:') return fail('not https');
  if (url.username !== '' || url.password !== '') return fail('has credentials');
  if (url.search !== '' || url.hash !== '') return fail('has a query or fragment');
  if (!raw.endsWith('/')) return fail('no trailing slash');
  if (url.href !== raw) return fail('not in canonical form');
  return raw;
}

/**
 * "Open on the new site" for a pending `#b=` share link: the configured
 * target plus the same fragment. The fragment is client-side only, so the
 * link's contents never reach a server; the target is never taken from the
 * page.
 */
export function movedShareUrl(movedTo: string, shareHash: string | null): string | null {
  return shareHash !== null && shareHash.startsWith('#b=') ? `${movedTo}${shareHash}` : null;
}
