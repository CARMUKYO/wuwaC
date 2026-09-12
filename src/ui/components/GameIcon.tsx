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
}

const SIZES = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
} as const;

export function GameIcon({ name, iconUrl, size = 'md' }: GameIconProps) {
  const [failed, setFailed] = useState(false);
  if (iconUrl === undefined || iconUrl === '' || failed) {
    return <InitialsBadge name={name} />;
  }
  return (
    <img
      src={iconUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={`${SIZES[size]} shrink-0 rounded-md bg-slate-800 object-cover`}
    />
  );
}
