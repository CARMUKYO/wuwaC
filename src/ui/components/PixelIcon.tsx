import { PIXEL_ICONS, PIXEL_ICON_SIZE, bitmapPath, type ColourIndex, type PixelIconName } from './pixelIcons.ts';

/* Fill order matters: shade/base/highlight first, outline path drawn last. */
const DRAW_ORDER: readonly ColourIndex[] = ['2', '3', '4', '1'];

function fillFor(name: PixelIconName, index: ColourIndex): string {
  return index === '1' ? 'var(--color-icon-outline)' : `var(--color-icon-${name}-${index})`;
}

/**
 * Renders a 12x12 bitmap as an inline SVG, one <path> per colour index.
 * Decorative by default (aria-hidden); size should be a whole multiple of 12.
 */
export function PixelIcon({
  name,
  size = PIXEL_ICON_SIZE * 2,
  className = '',
}: {
  name: PixelIconName;
  size?: number;
  className?: string;
}) {
  const rows = PIXEL_ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${PIXEL_ICON_SIZE} ${PIXEL_ICON_SIZE}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {DRAW_ORDER.map((index) => {
        const d = bitmapPath(rows, index);
        return d === '' ? null : <path key={index} d={d} style={{ fill: fillFor(name, index) }} />;
      })}
    </svg>
  );
}
