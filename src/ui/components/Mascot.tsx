import { useState } from 'react';
import { PIXEL_ICON_SIZE, bitmapPath, type ColourIndex } from './pixelIcons.ts';

/**
 * Mascot art: an animated GIF served from `public/` (resolved against the
 * Vite base so it also works under the GitHub Pages sub-path), with a still
 * frame for people who prefer reduced motion — CSS cannot pause a GIF, so
 * the swap happens in a <picture>. The art is user-supplied (AGENTS.md: no
 * bundled copyrighted character art), so if it is missing or fails to load
 * the generic pixel placeholder below renders instead.
 */
export const MASCOT_URL = `${import.meta.env.BASE_URL}aemeath-ames.gif`;
export const MASCOT_STILL_URL = `${import.meta.env.BASE_URL}aemeath-ames-still.png`;

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

function Placeholder({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${PIXEL_ICON_SIZE} ${PIXEL_ICON_SIZE}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {(['2', '3', '4', '1'] as const).map((index) => (
        <path key={index} d={bitmapPath(PLACEHOLDER, index)} style={{ fill: PLACEHOLDER_FILL[index] }} />
      ))}
    </svg>
  );
}

function Sprite({ px }: { px: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Placeholder px={px} />;
  return (
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={MASCOT_STILL_URL} />
      <img
        src={MASCOT_URL}
        alt=""
        width={px}
        height={px}
        draggable={false}
        onError={() => setFailed(true)}
        className="block"
      />
    </picture>
  );
}

/**
 * Decorative mascot. The GIF supplies its own animation, so nothing here
 * moves it: `banner` is a 140px square, `logo` a 44px mark in the top bar.
 */
export function Mascot({ variant = 'banner' }: { variant?: 'banner' | 'logo' }) {
  if (variant === 'logo') {
    return (
      <span aria-hidden="true" className="inline-flex shrink-0">
        <Sprite px={44} />
      </span>
    );
  }
  return (
    <div aria-hidden="true" className="flex h-[140px] w-[140px] shrink-0 items-center justify-center">
      <Sprite px={132} />
    </div>
  );
}
