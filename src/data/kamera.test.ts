import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from './index.ts';
import {
  exportKameraEchoes,
  KAMERA_ORIGIN,
  mapKameraEchoes,
  parseKameraEchoFile,
  toFlatcase,
} from './kamera.ts';

const snapshot = loadBundledSnapshot();

/** README-shaped 4-cost row: primary main + flat-ATK secondary + 4 substats. */
const MEMPHIS_ROW = {
  tempestmephis: {
    level: 25,
    tuneLv: 4,
    sonata: 'voidthunder',
    rarity: 5,
    stats: {
      main: { 'cr%': 22.0, atk: 150 },
      sub: { atk: 40, def: 50, hp: 470, 'basicAttack%': 8.6 },
    },
  },
};

/** 1-cost row: single flat main, no secondary, no substats yet. */
const HOOSCAMP_ROW = {
  Hooscamp: {
    level: 0,
    tuneLv: 0,
    sonata: 'Sierra Gale',
    rarity: 5,
    stats: { main: { atk: 60 }, sub: {} },
  },
};

const HOOSCAMP_DATA = HOOSCAMP_ROW['Hooscamp'];
const MEMPHIS_DATA = MEMPHIS_ROW['tempestmephis'];

describe('kamera echo files', () => {
  it('parses file text, rejecting non-JSON and non-array tops', () => {
    expect(parseKameraEchoFile(JSON.stringify([MEMPHIS_ROW]))).toEqual([MEMPHIS_ROW]);
    expect(() => parseKameraEchoFile('not json')).toThrow(/not a JSON file/);
    expect(() => parseKameraEchoFile(JSON.stringify({ echoes: [] }))).toThrow(/top level must be an array/);
  });

  it('maps a realistic README-shaped file (4-cost + 1-cost)', () => {
    const { drafts, issues } = mapKameraEchoes([MEMPHIS_ROW, HOOSCAMP_ROW], snapshot);
    expect(issues).toEqual([]);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toEqual({
      echoDefId: 'tempest-mephis',
      sonataId: 'void-thunder',
      cost: 4,
      level: 25,
      rarity: 5,
      mainStat: { stat: 'critRate', value: 0.22 },
      secondMainStat: { stat: 'atk', value: 150 },
      substats: [
        { stat: 'atk', value: 40 },
        { stat: 'def', value: 50 },
        { stat: 'hp', value: 470 },
        { stat: 'dmgBonus:basic', value: 0.086 },
      ],
      equippedTo: null,
    });
    // 1-cost: the lone `atk` entry is the main stat, not a secondary.
    expect(drafts[1]).toEqual({
      echoDefId: 'hooscamp',
      sonataId: 'sierra-gale',
      cost: 1,
      level: 0,
      rarity: 5,
      mainStat: { stat: 'atk', value: 60 },
      substats: [],
      equippedTo: null,
    });
  });

  it('matches exact slugs, skips _comment keys, and tolerates multi-key objects', () => {
    const { drafts, issues } = mapKameraEchoes(
      [{ _comment: 'scanner note', hooscamp: HOOSCAMP_DATA }],
      snapshot,
    );
    expect(issues).toEqual([]);
    expect(drafts).toEqual([
      expect.objectContaining({ echoDefId: 'hooscamp', mainStat: { stat: 'atk', value: 60 } }),
    ]);
  });

  it('reads bare ratio-only codes as percents and numeric strings as numbers', () => {
    const row = {
      hoochief: {
        level: 25,
        tuneLv: 2,
        sonata: 'sierragale',
        rarity: 5,
        stats: {
          main: { electro: '30', atk: '100' },
          sub: { cr: 10.5, 'hp%': 9.4 },
        },
      },
    };
    const { drafts, issues } = mapKameraEchoes([row], snapshot);
    expect(issues).toEqual([]);
    expect(drafts[0].mainStat).toEqual({ stat: 'dmgBonus:Electro', value: 0.3 });
    expect(drafts[0].secondMainStat).toEqual({ stat: 'atk', value: 100 });
    expect(drafts[0].substats).toEqual([
      { stat: 'critRate', value: 0.105 },
      { stat: 'hpPct', value: 0.094 },
    ]);
  });

  it('skips numeric-id rows with crosswalk guidance, importing the rest', () => {
    const { drafts, issues } = mapKameraEchoes(
      [{ '340000070': MEMPHIS_DATA }, HOOSCAMP_ROW],
      snapshot,
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].echoDefId).toBe('hooscamp');
    expect(issues).toEqual([
      {
        row: 1,
        key: '340000070',
        message:
          'echo "340000070" is a numeric game id, which has no snapshot crosswalk — ' +
          'rename the key to the echo name to import this row',
      },
    ]);
  });

  it('reports every unmatchable row without dropping the matchable ones', () => {
    const rows = [
      'not-an-object',
      {},
      { NoSuchEcho: HOOSCAMP_DATA },
      // Unknown sonata.
      { hooscamp: { ...HOOSCAMP_DATA, sonata: 'nosuchset' } },
      // Legal sonata, illegal for this echo (Hooscamp rolls Lingering/Sierra).
      { hooscamp: { ...HOOSCAMP_DATA, sonata: 'voidthunder' } },
      // Illegal main stat for a 1-cost (Crit Rate is 4-cost-only).
      {
        hooscamp: {
          ...HOOSCAMP_DATA,
          stats: { main: { 'cr%': 22 }, sub: {} },
        },
      },
      // Two primary mains on a 4-cost.
      {
        tempestmephis: {
          ...MEMPHIS_DATA,
          stats: { main: { 'cr%': 22, 'cd%': 44 }, sub: {} },
        },
      },
      // Unknown substat code.
      {
        hooscamp: {
          ...HOOSCAMP_DATA,
          stats: { main: { atk: 60 }, sub: { nosuchstat: 5 } },
        },
      },
      // Duplicate substats after mapping (`cr` and `cr%` are both Crit Rate).
      {
        hooscamp: {
          ...HOOSCAMP_DATA,
          stats: { main: { atk: 60 }, sub: { cr: 5, 'cr%': 6 } },
        },
      },
      // Six substats.
      {
        hooscamp: {
          ...HOOSCAMP_DATA,
          stats: {
            main: { atk: 60 },
            sub: { hp: 1, atk: 2, def: 3, 'hp%': 4, 'atk%': 5, 'def%': 6 },
          },
        },
      },
      { 'not an echo row': null },
    ];
    const { drafts, issues } = mapKameraEchoes(rows, snapshot);
    expect(drafts).toEqual([]);
    expect(issues).toHaveLength(rows.length);
    expect(issues[0].message).toMatch(/not an object/);
    expect(issues[1].message).toMatch(/no echo entries/);
    expect(issues[2].message).toMatch(/unknown echo "NoSuchEcho"/);
    expect(issues[3].message).toMatch(/unknown sonata "nosuchset"/);
    expect(issues[4].message).toMatch(/Hooscamp cannot roll Void Thunder/);
    expect(issues[5].message).toMatch(/Hooscamp cannot roll critRate as a main stat/);
    expect(issues[6].message).toMatch(/2 main-stat entries/);
    expect(issues[7].message).toMatch(/unknown stat code "nosuchstat"/);
    expect(issues[8].message).toMatch(/duplicate substats/);
    expect(issues[9].message).toMatch(/6 substats, at most 5/);
    expect(issues[10]).toMatchObject({ row: 11, key: 'not an echo row' });
  });

  it('rejects out-of-range level and rarity per row', () => {
    const base = HOOSCAMP_DATA;
    const { issues } = mapKameraEchoes(
      [{ hooscamp: { ...base, level: 26 } }, { hooscamp: { ...base, rarity: 9 } }],
      snapshot,
    );
    expect(issues.map((i) => i.message)).toEqual([
      'echo "hooscamp" has no level 0–25 — skipped',
      'echo "hooscamp" has no rarity 1–5 — skipped',
    ]);
  });

  it('exports the Kamera shape and round-trips through the importer', () => {
    const { drafts } = mapKameraEchoes([MEMPHIS_ROW, HOOSCAMP_ROW], snapshot);
    const rows = drafts.map((d, i) => ({ ...d, id: `echo-${i}`, origin: KAMERA_ORIGIN }));
    const exported = exportKameraEchoes(rows, snapshot);
    expect(exported).toEqual([
      {
        tempestmephis: {
          level: 25,
          tuneLv: 4,
          sonata: 'voidthunder',
          rarity: 5,
          stats: {
            main: { 'cr%': 22, atk: 150 },
            sub: { atk: 40, def: 50, hp: 470, 'basicAttack%': 8.6 },
          },
        },
      },
      {
        hooscamp: {
          level: 0,
          tuneLv: 0,
          sonata: 'sierragale',
          rarity: 5,
          stats: { main: { atk: 60 }, sub: {} },
        },
      },
    ]);
    // Round-trip: our own export re-imports to identical drafts.
    const again = mapKameraEchoes(exported, snapshot);
    expect(again.issues).toEqual([]);
    expect(again.drafts).toEqual(drafts);
  });

  it('fails export loudly on unrepresentable rows', () => {
    const { drafts } = mapKameraEchoes([MEMPHIS_ROW], snapshot);
    const exotic = {
      ...drafts[0],
      id: 'echo-x',
      origin: KAMERA_ORIGIN,
      substats: [{ stat: 'dmgBonus:echo' as const, value: 0.2 }],
    };
    expect(() => exportKameraEchoes([exotic], snapshot)).toThrow(/dmgBonus:echo has no Kamera stat code/);
    const orphan = { ...drafts[0], id: 'echo-y', origin: KAMERA_ORIGIN, echoDefId: 'gone', label: undefined };
    expect(() => exportKameraEchoes([orphan], snapshot)).toThrow(/unknown def and no label/);
  });

  it('flatcases names the way the scanner does', () => {
    expect(toFlatcase('Tempest Mephis')).toBe('tempestmephis');
    expect(toFlatcase('Havoc Eclipse')).toBe('havoceclipse');
    expect(toFlatcase('Nightmare: Thundering Mephis')).toBe('nightmarethunderingmephis');
  });
});
