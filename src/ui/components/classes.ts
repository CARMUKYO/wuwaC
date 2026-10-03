/* Shared terminal class strings. Kept separate from ui.tsx so that file
 * only exports components (react-refresh rule). */

export const labelClass = 'block font-mono text-[11px] font-medium tracking-[0.08em] text-fog uppercase';

export const inputClass =
  'w-full rounded-md border border-line-strong bg-canvas px-2.5 py-1.5 text-sm text-ink transition-terminal placeholder:text-dim hover:border-dim focus:border-seal';

export const selectClass = inputClass;

export const btnBase =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-terminal disabled:cursor-not-allowed disabled:opacity-40';

export const btnPrimary = `${btnBase} bg-seal text-seal-ink hover:bg-seal-bright`;

export const btnOutline = `${btnBase} border border-line-strong text-ink hover:border-dim hover:bg-panel-2 font-medium`;

export const btnGhost = `${btnBase} text-fog hover:bg-panel-2 hover:text-ink font-medium`;

export const btnDangerGhost = `${btnBase} text-ember hover:bg-ember-wash font-medium`;

export const btnSm = 'min-h-8 px-2 py-1 text-xs';
