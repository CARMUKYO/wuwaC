import { parseMovedTo } from '../site.ts';

/**
 * The build-time "moved" target (`VITE_MOVED_TO`, validated by vite.config.ts),
 * or null on the live site. A value that fails validation yields null rather
 * than a link to somewhere unintended; the build never ships one.
 */
export function movedTarget(): string | null {
  try {
    return parseMovedTo(import.meta.env.VITE_MOVED_TO);
  } catch {
    return null;
  }
}
