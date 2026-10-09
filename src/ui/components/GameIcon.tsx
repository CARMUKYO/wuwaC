import { useState } from 'react';
import { InitialsBadge } from './InitialsBadge.tsx';

/**
 * Remote game artwork with a graceful offline fallback. Art is never
 * bundled (Agents.md guardrails) — `iconUrl` points at the provider CDN
 * and the initials badge covers absent or unreachable URLs.
 */
interface GameIconProps {
  name: string;
  iconUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  /** CSS color (token reference) painted behind the art, e.g. a Sonata tint. */
  tint?: string;
}

const SIZES = {
  sm: 'h-6 w-6',
  md: 'h-9 w-9',
  lg: 'h-16 w-16',
} as const;

export function GameIcon({ name, iconUrl, size = 'md', tint }: GameIconProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (iconUrl === undefined || iconUrl === '' || failed) {
    return <InitialsBadge name={name} tint={tint} />;
  }
  return (
    <img
      src={iconUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      style={tint === undefined ? undefined : { backgroundColor: tint }}
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={`${SIZES[size]} shrink-0 border-2 border-line bg-panel-2 object-cover transition-opacity duration-200 ${
        loaded ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
}
