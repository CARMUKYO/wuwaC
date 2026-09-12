import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from './index.ts';
import {
  BUFF_PRESETS,
  resolvePresetMods,
  type BuffPreset,
} from './buffPresets.ts';

const snapshot = loadBundledSnapshot();
const byId = new Map<string, BuffPreset>(BUFF_PRESETS.map((p) => [p.id, p]));

function preset(id: string): BuffPreset {
  const found = byId.get(id);
  if (!found) throw new Error(`missing preset ${id}`);
  return found;
}

describe('buff presets', () => {
  it('uses unique preset ids', () => {
    expect(byId.size).toBe(BUFF_PRESETS.length);
  });

  it('resolves every sourceRef against the bundled snapshot', () => {
    const missing: string[] = [];
    for (const p of BUFF_PRESETS) {
      const ok =
        p.source === 'Echo'
          ? snapshot.echoDefs.some((d) => d.id === p.sourceRef)
          : p.source === 'Sonata'
            ? snapshot.sonataSets.some((s) => s.id === p.sourceRef)
            : snapshot.weapons.some((w) => w.id === p.sourceRef);
      if (!ok) missing.push(`${p.id} -> ${p.sourceRef}`);
    }
    expect(missing).toEqual([]);
  });

  it('never duplicates a sonata stat bonus that computeStats already applies', () => {
    const dupes: string[] = [];
    for (const p of BUFF_PRESETS) {
      if (p.source !== 'Sonata') continue;
      const set = snapshot.sonataSets.find((s) => s.id === p.sourceRef)!;
      const auto: string[] = [];
      for (const b of set.bonuses) {
        if (b.effect.kind === 'stat') auto.push(`${b.effect.stat}@${b.effect.value}`);
      }
      for (const mod of resolvePresetMods(p, {})) {
        if (auto.includes(`${mod.stat}@${mod.value}`)) dupes.push(p.id);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('keeps every mod value in a sane range', () => {
    for (const p of BUFF_PRESETS) {
      for (const mod of p.mods) {
        const values = mod.valuesByRank ?? [mod.value];
        for (const v of values) {
          expect(v).toBeGreaterThan(0);
          expect(v).toBeLessThanOrEqual(1.25);
        }
      }
    }
  });

  it('resolves weapon rank series (Autumntrace R1 vs R5)', () => {
    const atk = (rank: number): number =>
      resolvePresetMods(preset('weapon-autumntrace'), { weaponRank: rank })[0].value;
    expect(atk(1)).toBeCloseTo(0.2, 10);
    expect(atk(5)).toBeCloseTo(0.64, 10);
    expect(atk(5)).toBeCloseTo(5 * 0.128, 10);
  });

  it('resolves dmgBonus:character to the scored attribute (Verdant Summit)', () => {
    const mods = resolvePresetMods(preset('weapon-verdant-summit'), {
      weaponRank: 5,
      attribute: 'Spectro',
    });
    expect(mods).toContainEqual({ stat: 'dmgBonus:Spectro', value: 0.24 });
    expect(mods).toContainEqual({ stat: 'dmgBonus:heavy', value: 0.96 });
  });

  it('transcribes spot-checked echo and sonata values', () => {
    expect(resolvePresetMods(preset('echo-reminiscence-fleurdelys'), {})).toEqual([
      { stat: 'dmgBonus:Aero', value: 0.1 },
    ]);
    expect(resolvePresetMods(preset('echo-lorelei'), {})).toEqual([
      { stat: 'dmgBonus:Havoc', value: 0.12 },
      { stat: 'dmgBonus:basic', value: 0.12 },
    ]);
    expect(resolvePresetMods(preset('sonata-moonlit-clouds-5pc'), {})).toEqual([
      { stat: 'atkPct', value: 0.225 },
    ]);
    expect(resolvePresetMods(preset('sonata-lingering-tunes-5pc'), {})).toEqual([
      { stat: 'atkPct', value: 0.2 },
      { stat: 'dmgBonus:outro', value: 0.6 },
    ]);
  });
});
