import { useRef, useState } from 'react';
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

/**
 * Freeze the GIF on the frame it is showing: drawing an animated <img> to a
 * canvas captures its current frame. False when canvas is unavailable
 * (jsdom, locked-down browsers) so the caller can fall back to the still.
 */
function freezeFrame(img: HTMLImageElement, canvas: HTMLCanvasElement, px: number): boolean {
  try {
    const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const size = img.clientWidth || px;
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx || !img.complete || img.naturalWidth === 0) return false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return true;
  } catch {
    return false;
  }
}

/**
 * Hover (mouse) or tap (touch/pen) pauses the GIF on its current frame;
 * leaving or tapping again resumes. Decorative, so not focusable.
 */
/** `px` is the intrinsic size; `sizeClass` may make it responsive. */
function Sprite({ px, sizeClass }: { px: number; sizeClass?: string }) {
  const [failed, setFailed] = useState(false);
  /** null = playing; 'canvas' = frozen on the live frame; 'still' = fallback still image. */
  const [paused, setPaused] = useState<null | 'canvas' | 'still'>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  if (failed) return <Placeholder px={px} />;

  const pause = (): void => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    setPaused(img && canvas && freezeFrame(img, canvas, px) ? 'canvas' : 'still');
  };
  const resume = (): void => setPaused(null);

  return (
    <span
      data-paused={paused !== null}
      className={`relative inline-block ${sizeClass ?? ''}`}
      style={sizeClass === undefined ? { width: px, height: px } : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') pause();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') resume();
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== 'mouse') {
          if (paused === null) pause();
          else resume();
        }
      }}
    >
      <picture className="block h-full w-full">
        <source media="(prefers-reduced-motion: reduce)" srcSet={MASCOT_STILL_URL} />
        <img
          ref={imgRef}
          src={paused === 'still' ? MASCOT_STILL_URL : MASCOT_URL}
          alt=""
          width={px}
          height={px}
          draggable={false}
          onError={() => setFailed(true)}
          className={`block h-full w-full select-none ${paused === 'canvas' ? 'invisible' : ''}`}
        />
      </picture>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full ${paused === 'canvas' ? '' : 'hidden'}`}
      />
    </span>
  );
}

/**
 * Decorative mascot. The GIF supplies its own animation; hovering (or
 * tapping on touch screens) pauses her. `banner` is a square that shrinks
 * on phones, `logo` a 44px mark in the top bar.
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
    <div aria-hidden="true" className="flex shrink-0 items-center justify-center">
      <Sprite px={132} sizeClass="size-24 sm:size-[132px]" />
    </div>
  );
}
