import type { Attribute } from './schema.ts';

/**
 * Data layer: Echo-skill damage parsing.
 *
 * The snapshot carries echo skills as prose (`skillDescription`, max-rank
 * values) plus raw rank arrays — no structured motion values. This module
 * extracts scorable damage occurrences from the prose so the rotation UI
 * can offer "add Echo skill" buttons prefilled with real numbers. It is
 * string parsing, not game math: the block stores the extracted values
 * explicitly and the user can edit them, so a mis-parse is visible and
 * correctable, never silent.
 *
 * Parsed shapes (verified against all 193 echo defs, 2026-09-16):
 * - `dealing 405.00% Havoc DMG` (standard; optional `+flat`: 1-cost
 *   hybrids like `48.00%+96 Aero DMG`).
 * - `200.16% and 200.16% Glacio DMG` (shared-element pairs — each value
 *   is its own hit; 4 echoes).
 * - `Havoc DMG equal to 152.39% of her ATK` / `Glacio DMG based on
 *   145.92% of the current character's DEF` — scaling follows the `of`
 *   tail (HP / DEF keywords, else ATK).
 * - `12.00% Glacio DMG Bonus` never matches (main-slot buff text, not
 *   damage) via the Bonus lookahead.
 *
 * Deliberate gaps (see the sweep test's pinned zero-hit set):
 * - Physical-DMG echoes (11): no Physical RES term exists anywhere in
 *   the formula tree, so nothing scorable can be built.
 * - Non-damage skills (heals, shields, utility): correctly zero hits.
 * - Multi-stage / per-second / repeated skills parse once per distinct
 *   damage shape — the user adds one block per hit/stage/second (blocks
 *   compose freely; counts are not modeled).
 */

export interface EchoSkillHit {
  /** `Hit 1..N` in document order (deduped — see below). */
  label: string;
  /** Ratio-of-scaling-stat part (`405.00%` -> 4.05). */
  motionValue: number;
  /** Flat part of `N%+M` hybrids (0 when absent). */
  flatDamage: number;
  attribute: Attribute;
  scaling: 'ATK' | 'HP' | 'DEF';
}

const ELEMENTS = ['Glacio', 'Fusion', 'Electro', 'Aero', 'Spectro', 'Havoc'] as const;

const STANDARD = new RegExp(
  `(\\d+(?:\\.\\d+)?)%\\s*(?:\\+\\s*(\\d+(?:\\.\\d+)?))?\\s*(${ELEMENTS.join('|')})\\s+DMG(?!\\s+Bonus)`,
  'g',
);
const PAIR = new RegExp(
  `(\\d+(?:\\.\\d+)?)%\\s+and\\s+(\\d+(?:\\.\\d+)?)%\\s*(${ELEMENTS.join('|')})\\s+DMG`,
  'g',
);
const EQUAL_TO = new RegExp(
  `(${ELEMENTS.join('|')})\\s+DMG\\s+(?:equal\\s+to|based\\s+on)\\s+(\\d+(?:\\.\\d+)?)%\\s+of\\s+([^,.;]{0,50})`,
  'g',
);

interface RawHit {
  start: number;
  end: number;
  motionValue: number;
  flatDamage: number;
  attribute: Attribute;
  scaling: 'ATK' | 'HP' | 'DEF';
}

function scalingOf(tail: string): 'ATK' | 'HP' | 'DEF' {
  if (/hp/i.test(tail)) return 'HP';
  if (/def/i.test(tail)) return 'DEF';
  return 'ATK';
}

/** Percent text -> ratio, trimmed of binary float noise (6 decimals). */
function ratioOf(text: string): number {
  return Math.round((Number(text) / 100) * 1e6) / 1e6;
}

/** Extract scorable damage occurrences from an echo `skillDescription`. */
export function parseEchoSkillHits(skillDescription: string): EchoSkillHit[] {
  const raw: RawHit[] = [];
  for (const match of skillDescription.matchAll(PAIR)) {
    const attribute = match[3] as Attribute;
    const at = match.index ?? 0;
    // Each twin gets its own value's span so non-identical pairs
    // (157.44% and 236.16%) survive each other; identical twins fall
    // through to the duplicate collapse below.
    const firstAt = at + match[0].indexOf(match[1]);
    const secondAt = at + match[0].indexOf(match[2], firstAt - at + match[1].length);
    raw.push({
      start: firstAt,
      end: firstAt + match[1].length,
      motionValue: ratioOf(match[1]),
      flatDamage: 0,
      attribute,
      scaling: 'ATK',
    });
    raw.push({
      start: secondAt,
      end: secondAt + match[2].length,
      motionValue: ratioOf(match[2]),
      flatDamage: 0,
      attribute,
      scaling: 'ATK',
    });
  }
  for (const match of skillDescription.matchAll(STANDARD)) {
    const at = match.index ?? 0;
    raw.push({
      start: at,
      end: at + match[0].length,
      motionValue: ratioOf(match[1]),
      flatDamage: match[2] === undefined ? 0 : Number(match[2]),
      attribute: match[3] as Attribute,
      scaling: 'ATK',
    });
  }
  for (const match of skillDescription.matchAll(EQUAL_TO)) {
    const at = match.index ?? 0;
    raw.push({
      start: at,
      end: at + match[0].length,
      motionValue: ratioOf(match[2]),
      flatDamage: 0,
      attribute: match[1] as Attribute,
      scaling: scalingOf(match[3]),
    });
  }
  // Document order; a shared-element pair already covers its span, so any
  // later match starting inside a kept span is the same text re-matched.
  raw.sort((a, b) => a.start - b.start || a.end - b.end);
  const kept: RawHit[] = [];
  for (const hit of raw) {
    const overlap = kept.some((k) => hit.start < k.end && k.start < hit.end);
    // Identical twins (pair halves, repeated prose) collapse to one
    // option — repetition composes via multiple blocks.
    const duplicate = kept.some(
      (k) =>
        k.motionValue === hit.motionValue &&
        k.flatDamage === hit.flatDamage &&
        k.attribute === hit.attribute &&
        k.scaling === hit.scaling,
    );
    if (!overlap && !duplicate) kept.push(hit);
  }
  return kept.map((hit, i) => ({
    label: `Hit ${i + 1}`,
    motionValue: hit.motionValue,
    flatDamage: hit.flatDamage,
    attribute: hit.attribute,
    scaling: hit.scaling,
  }));
}
