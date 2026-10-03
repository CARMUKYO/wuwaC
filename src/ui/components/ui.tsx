import type { ReactNode } from 'react';
import type { Attribute } from '../../data/schema.ts';

/* Shared terminal primitives. One source of truth for panel chrome so
 * pages stay consistent without restyling each other. Accessible names
 * live at the call site — this file only styles. Class strings live in
 * ./classes.ts (components only here, per the react-refresh rule). */

type AlertTone = 'danger' | 'warning' | 'success' | 'info';

const ALERT_STYLES: Record<AlertTone, string> = {
  danger: 'border-ember/40 bg-ember-wash text-ember-ink',
  warning: 'border-amber/40 bg-amber-wash text-amber',
  success: 'border-tide/40 bg-tide-wash text-tide',
  info: 'border-line-strong bg-panel-2 text-fog',
};

export function Alert({
  tone,
  role = 'alert',
  className = '',
  children,
}: {
  tone: AlertTone;
  role?: 'alert' | 'status';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role={role} className={`rounded-md border px-3 py-2 text-sm ${ALERT_STYLES[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-medium tracking-[0.22em] text-seal uppercase">{eyebrow}</p>
          <h2 className="mt-1 font-display text-4xl leading-none font-semibold tracking-wide text-ink">{title}</h2>
          {description !== undefined && <p className="mt-1.5 max-w-2xl text-sm text-fog">{description}</p>}
        </div>
        {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="rule mt-3" aria-hidden="true" />
    </div>
  );
}

export function Panel({
  label,
  title,
  eyebrow,
  actions,
  className = '',
  children,
}: {
  label?: string;
  title?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const labelledBy = label ?? (typeof title === 'string' ? title : undefined);
  return (
    <section aria-label={labelledBy} className={`rounded-lg border border-line bg-panel p-4 ${className}`}>
      {(title !== undefined || eyebrow !== undefined || actions !== undefined) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            {eyebrow !== undefined && (
              <p className="font-mono text-[10px] font-medium tracking-[0.22em] text-seal uppercase">{eyebrow}</p>
            )}
            {title !== undefined && (
              <h3 className="font-display text-xl leading-tight font-semibold tracking-wide text-ink">{title}</h3>
            )}
          </div>
          {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const ATTRIBUTE_DOT: Record<Attribute, string> = {
  Glacio: 'bg-glacio',
  Fusion: 'bg-fusion',
  Electro: 'bg-electro',
  Aero: 'bg-aero',
  Spectro: 'bg-spectro',
  Havoc: 'bg-havoc',
};

export function AttributeDot({ attribute, className = '' }: { attribute: Attribute; className?: string }) {
  return (
    <span
      aria-hidden="true"
      title={attribute}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${ATTRIBUTE_DOT[attribute]} ${className}`}
    />
  );
}

/** Cost pips: 4 slots, `cost` filled seal. Purely visual (cost stays in text). */
export function CostPips({ cost }: { cost: number }) {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4].map((slot) => (
        <span
          key={slot}
          className={`h-1.5 w-1.5 rounded-[2px] ${slot <= cost ? 'bg-seal' : 'bg-panel-3'}`}
        />
      ))}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-panel px-4 py-8 text-center">
      <p className="text-sm text-fog">{children}</p>
    </div>
  );
}
