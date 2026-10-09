import { PIXEL_ICON_SIZE, bitmapPath, type ColourIndex } from './pixelIcons.ts';

/**
 * Mascot sprite URL. The sprite is user-supplied character art and must not
 * be committed (AGENTS.md: no bundled copyrighted art), so it is loaded at
 * runtime from here. `null` renders the generic pixel placeholder below.
 * TODO: point at the user's chosen sprite location.
 */
export const MASCOT_URL: string | null = null;

/** Generic 12x12 placeholder blob (1 outline, 2 body, 3 shade, 4 highlight). */
const PLACEHOLDER: readonly string[] = [
  '............',
  '...111111...',
  '..12222221..',
  '.1244222221.',
  '.1244222221.',
  '.1222222221.',
  '.1212222121.',
  '.1222222221.',
  '.1233333321.',
  '..13333331..',
  '...111111...',
  '............',
];

const PLACEHOLDER_FILL: Record<ColourIndex, string> = {
  '1': 'var(--color-icon-outline)',
  '2': 'var(--color-icon-head-2)',
  '3': 'var(--color-icon-head-4)',
  '4': 'var(--color-icon-head-3)',
};

function Sprite({ px, className }: { px: number; className: string }) {
  const classes = `sticker pixelated ${className}`;
  if (MASCOT_URL !== null) {
    return <img src={MASCOT_URL} alt="" width={px} height={px} className={classes} draggable={false} />;
  }
  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${PIXEL_ICON_SIZE} ${PIXEL_ICON_SIZE}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={classes}
    >
      {(['2', '3', '4', '1'] as const).map((index) => (
        <path key={index} d={bitmapPath(PLACEHOLDER, index)} style={{ fill: PLACEHOLDER_FILL[index] }} />
      ))}
    </svg>
  );
}

/**
 * Decorative mascot. `banner` hops inside a 140x176 box (room for the jump)
 * over a shrinking ground shadow; `logo` is a 44px 2-frame idle bob.
 * Animations are disabled under prefers-reduced-motion (see index.css).
 */
export function Mascot({ variant = 'banner' }: { variant?: 'banner' | 'logo' }) {
  if (variant === 'logo') {
    return (
      <span aria-hidden="true" className="inline-flex shrink-0">
        <Sprite px={44} className="bob" />
      </span>
    );
  }
  return (
    <div aria-hidden="true" className="flex h-[176px] w-[140px] shrink-0 flex-col items-center justify-end">
      <Sprite px={132} className="hop" />
      <div className="hop-shadow -mt-1.5 h-[10px] w-[84px] rounded-full bg-shadow-ellipse" />
    </div>
  );
}
