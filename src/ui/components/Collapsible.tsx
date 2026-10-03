import { useState, type ReactNode } from 'react';

/**
 * Animated disclosure: grid-rows ease the body open/closed (the global
 * reduced-motion rule makes it instant). Controlled when `open` is set,
 * otherwise self-managed from `defaultOpen`.
 */
export function Collapsible({
  title,
  eyebrow,
  open,
  defaultOpen = false,
  onToggle,
  children,
}: {
  title: ReactNode;
  eyebrow?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (next: boolean) => void;
  children: ReactNode;
}) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const toggle = (): void => {
    const next = !isOpen;
    if (open === undefined) setInner(next);
    onToggle?.(next);
  };
  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={toggle}
        className="flex w-full items-baseline gap-2 text-left"
      >
        <span
          aria-hidden="true"
          className={`inline-block text-[0.7em] text-seal transition-transform duration-150 ${
            isOpen ? 'rotate-90' : ''
          }`}
        >
          ▸
        </span>
        <span className="min-w-0">
          {eyebrow !== undefined && (
            <span className="block font-mono text-[10px] font-medium tracking-[0.22em] text-seal uppercase">
              {eyebrow}
            </span>
          )}
          <span className="block font-display text-xl leading-tight font-semibold tracking-wide text-ink">
            {title}
          </span>
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className={isOpen ? 'pt-2' : ''}>{isOpen ? children : null}</div>
        </div>
      </div>
    </div>
  );
}
