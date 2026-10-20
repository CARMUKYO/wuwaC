import { footerRect, labelColumnRect, panelRect, replaceWords, valueColumnRect, type Rect } from './layout.ts';
import type { OcrWord } from './parse.ts';

/**
 * Scanner layer: the 4-pass OCR plan for one frame (why each pass exists
 * is documented in layout.ts). The engine is injected, so this is pure
 * orchestration — the browser binds it to tesseract.js (engine.ts), the
 * Phase 0 spike binds the same function in node, and tests use a fake.
 */

/** sparse = PSM 11; block = PSM 6; digits = PSM 6 with a `0-9.%` whitelist. */
export type PassMode = 'sparse' | 'block' | 'digits';

/** Recognize `rect` of the current frame; bboxes in frame pixels. */
export type OcrFn = (rect: Rect, mode: PassMode) => Promise<OcrWord[]>;

export async function readPanelWords(ocr: OcrFn, frameWidth: number, frameHeight: number): Promise<OcrWord[]> {
  const panel = panelRect(frameWidth, frameHeight);
  const pass1 = await ocr(panel, 'sparse');
  let words = pass1;
  const values = valueColumnRect(pass1, panel);
  if (values !== null) words = replaceWords(words, await ocr(values, 'digits'), values);
  const footer = footerRect(pass1, panel);
  const labels = values === null ? null : labelColumnRect(values, footer, panel);
  if (labels !== null) words = replaceWords(words, await ocr(labels, 'block'), labels);
  return replaceWords(words, await ocr(footer, 'block'), footer);
}
