import { buildSchema, type Build } from '../data/schema.ts';

/**
 * State layer: shareable build links. Format: `#b=<base64url(JSON({v, build}))>`.
 * Client-side only (no backend, per guardrails) — validated on decode with
 * the canonical build schema, so corrupt links fail loudly, never silently.
 */

/** Increment when the link envelope changes; old versions reject on decode. */
export const BUILD_LINK_VERSION = 1;

/** Encode a build as a URL hash fragment (caller prefixes with the page URL). */
export function encodeBuildLink(build: Build): string {
  const payload = JSON.stringify({ v: BUILD_LINK_VERSION, build });
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `#b=${base64}`;
}

/** Decode and validate a hash fragment back into a build. Throws when corrupt. */
export function decodeBuildLink(hash: string): Build {
  if (!hash.startsWith('#b=')) {
    throw new Error('not a build link (missing #b= prefix)');
  }
  const base64 = hash.slice(3).replace(/-/g, '+').replace(/_/g, '/');
  let json: string;
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    json = new TextDecoder().decode(bytes);
  } catch {
    throw new Error('build link is not valid base64');
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(json);
  } catch {
    throw new Error('build link is not valid JSON');
  }
  if (
    typeof envelope !== 'object' ||
    envelope === null ||
    (envelope as { v?: unknown }).v !== BUILD_LINK_VERSION
  ) {
    throw new Error(`unsupported build link version (expected ${BUILD_LINK_VERSION})`);
  }
  return buildSchema.parse((envelope as { build?: unknown }).build);
}
