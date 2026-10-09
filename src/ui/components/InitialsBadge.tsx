// Text/initials placeholder. Character art is never bundled into the repo
// (Agents.md guardrails); official/CDN image URLs may replace this at
// runtime in a later phase.
interface InitialsBadgeProps {
  name: string;
}

export function InitialsBadge({ name }: InitialsBadgeProps) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-line-strong bg-panel-2 font-display text-base font-semibold text-accent-text"
    >
      {initials}
    </span>
  );
}
