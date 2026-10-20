import { describe, expect, it } from 'vitest';
import type { Rect } from './layout.ts';
import type { OcrWord } from './parse.ts';
import { readPanelWords, type PassMode } from './pipeline.ts';

function w(text: string, x0: number, y0: number, x1: number, y1: number): OcrWord {
  return { text, bbox: { x0, y0, x1, y1 } };
}

/** Pass-1 read with the two classic sparse-mode slips: a truncated value and no footer. */
const SPARSE: OcrWord[] = [
  w('Kerasaur', 1330, 130, 1460, 155),
  w('+25', 1336, 202, 1384, 225),
  w('COST', 1338, 254, 1408, 274),
  w('3', 1425, 254, 1440, 274),
  w('Fusion', 1355, 463, 1440, 485),
  w('DMG', 1448, 463, 1510, 485),
  w('Bonus', 1518, 463, 1600, 485),
  w('30.0%', 1760, 463, 1848, 485),
  w('ATK', 1355, 508, 1410, 530),
  w('100', 1795, 508, 1848, 530),
  w('Crit.', 1355, 553, 1420, 575),
  w('Rate', 1428, 553, 1490, 575),
  w('3%', 1800, 553, 1848, 575),
];

describe('readPanelWords', () => {
  it('runs sparse -> digits -> block(labels) -> block(footer) and lets later passes win', async () => {
    const calls: { mode: PassMode; rect: Rect }[] = [];
    const ocr = (rect: Rect, mode: PassMode): Promise<OcrWord[]> => {
      calls.push({ mode, rect });
      if (mode === 'sparse') return Promise.resolve(SPARSE);
      if (mode === 'digits') return Promise.resolve([w('30.0%', 1760, 463, 1848, 485), w('100', 1795, 508, 1848, 530), w('6.3%', 1775, 553, 1848, 575)]);
      // Footer pass (the second block pass) finds the equipped line.
      if (calls.filter((c) => c.mode === 'block').length === 2) {
        return Promise.resolve([w('Equipped', 1360, 880, 1480, 902), w('by', 1488, 880, 1520, 902), w('Denia', 1528, 880, 1600, 902)]);
      }
      return Promise.resolve([]);
    };
    const words = await readPanelWords(ocr, 1920, 1080);
    expect(calls.map((c) => c.mode)).toEqual(['sparse', 'digits', 'block', 'block']);
    // The panel band for 1920×1080 (see layout.test.ts).
    expect(calls[0].rect).toEqual({ left: 1267, top: 86, width: 653, height: 864 });
    const texts = words.map((x) => x.text);
    expect(texts).toContain('6.3%');
    expect(texts).not.toContain('3%');
    expect(texts).toContain('Denia');
    // The label pass returned nothing, so the labels it covered are dropped —
    // a later pass owns its rectangle entirely (no stale mixing).
    expect(texts).not.toContain('Fusion');
    expect(texts).toContain('Kerasaur');
  });

  it('skips the column passes when sparse mode found no stat rows', async () => {
    const modes: PassMode[] = [];
    await readPanelWords(
      (_rect, mode) => {
        modes.push(mode);
        return Promise.resolve(mode === 'sparse' ? SPARSE.slice(0, 4) : []);
      },
      1920,
      1080,
    );
    expect(modes).toEqual(['sparse', 'block']);
  });
});
