import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import type { Team } from '../data/schema.ts';
import { resolveTeamBuffs } from './teamBuffs.ts';

const snapshot = loadBundledSnapshot();
const characterNameOf = (id: string): string | null =>
  snapshot.characters.find((c) => c.id === id)?.name ?? null;

function team(characterIds: [string, string, string], extra?: Partial<Team>): Team {
  return { id: 'team-1', name: 'Test', characterIds, ...extra };
}

describe('resolveTeamBuffs', () => {
  it('resolves Lynae Outro + Liberation with the transcribed stat keys', () => {
    const { buffs, warnings } = resolveTeamBuffs(team(['lynae', 'verina', 'sanhua']), characterNameOf);
    expect(warnings).toEqual([]);
    // Lynae Outro: 15% All DMG amp (multiplicative) + 25% Liberation
    // "Amplification" in the additive bucket (no per-type amplify term).
    expect(buffs).toContainEqual({
      label: 'Lynae Outro (incoming) · 14s',
      source: 'Team',
      mods: [
        { stat: 'amplify', value: 0.15 },
        { stat: 'dmgBonus:liberation', value: 0.25 },
      ],
    });
    // Lynae Liberation: 24% team DMG as attacker amplify.
    expect(buffs).toContainEqual({
      label: 'Lynae Liberation (team) · 30s',
      source: 'Team',
      mods: [{ stat: 'amplify', value: 0.24 }],
    });
    expect(buffs).toContainEqual({
      label: 'Verina Outro (team) · 30s',
      source: 'Team',
      mods: [{ stat: 'amplify', value: 0.15 }],
    });
    expect(buffs).toContainEqual({
      label: 'Sanhua Outro (incoming) · 14s',
      source: 'Team',
      mods: [{ stat: 'dmgBonus:basic', value: 0.38 }],
    });
  });

  it('warns for members with no transcribable buffs and for unknown ids', () => {
    const { buffs, warnings } = resolveTeamBuffs(team(['chixia', 'no-such-char', 'lynae']), characterNameOf);
    expect(buffs).toHaveLength(2); // Lynae's two entries only
    expect(warnings).toEqual([
      'no transcribable team buffs for Chixia',
      'unknown team member "no-such-char" — no team buffs resolved',
    ]);
  });

  it('gates chain team buffs by teammate chain rank', () => {
    const gated = resolveTeamBuffs(team(['chixia', 'yangyang', 'lynae']), characterNameOf, {
      chixia: 5,
      yangyang: 6,
    });
    expect(gated.buffs).toContainEqual({
      label: 'Yangyang S6 (team ATK)',
      source: 'Team',
      mods: [{ stat: 'atkPct', value: 0.2 }],
    });
    expect(gated.buffs.some((b) => b.label.includes('Chixia'))).toBe(false);
    expect(gated.warnings).toContain('no transcribable team buffs for Chixia');
    expect(gated.warnings.some((w) => w.includes('Yangyang'))).toBe(false);
    const met = resolveTeamBuffs(team(['chixia', 'verina', 'sanhua']), characterNameOf, { chixia: 6 });
    expect(met.buffs).toContainEqual({
      label: 'Chixia S6 (team Basic DMG)',
      source: 'Team',
      mods: [{ stat: 'dmgBonus:basic', value: 0.25 }],
    });
    expect(met.warnings.some((w) => w.includes('Chixia'))).toBe(false);
  });

  it('resolves the Luuk Herssen S4 team amplify at rank and stays silent below', () => {
    const met = resolveTeamBuffs(team(['luuk-herssen', 'verina', 'sanhua']), characterNameOf, {
      'luuk-herssen': 4,
    });
    expect(met.buffs).toContainEqual({
      label: 'Luuk Herssen S4 (team DMG)',
      source: 'Team',
      mods: [{ stat: 'amplify', value: 0.2 }],
    });
    const gated = resolveTeamBuffs(team(['luuk-herssen', 'verina', 'sanhua']), characterNameOf, {
      'luuk-herssen': 3,
    });
    expect(gated.buffs.some((b) => b.label.includes('Luuk Herssen'))).toBe(false);
  });

  it('resolves Wave-4 stacked team pairs with rank gating (Roccia S2, Sanhua S6)', () => {
    const met = resolveTeamBuffs(team(['roccia', 'sanhua', 'verina']), characterNameOf, {
      roccia: 2,
      sanhua: 6,
    });
    expect(met.buffs).toContainEqual({
      label: 'Roccia S2 (team Havoc DMG)',
      source: 'Team',
      mods: [{ stat: 'dmgBonus:Havoc', value: 0.4 }],
    });
    expect(met.buffs).toContainEqual({
      label: 'Sanhua S6 (team ATK)',
      source: 'Team',
      mods: [{ stat: 'atkPct', value: 0.2 }],
    });
    const gated = resolveTeamBuffs(team(['roccia', 'sanhua', 'verina']), characterNameOf, {
      roccia: 1,
      sanhua: 5,
    });
    // Table outro entries still resolve — only the chain-gated parts drop.
    expect(gated.buffs.some((b) => b.label.includes('Roccia S2') || b.label.includes('Sanhua S6'))).toBe(false);
    expect(gated.buffs.some((b) => b.label.includes('Roccia Outro'))).toBe(true);
  });

  it('merges manual outroBuffs overrides and reports custom effects as warnings', () => {
    const { buffs, warnings } = resolveTeamBuffs(
      team(['chixia', 'verina', 'sanhua'], {
        outroBuffs: [
          {
            fromCharacterId: 'chixia',
            effect: { kind: 'stat', stat: 'atkPct', value: 0.1 },
            windowSeconds: 20,
          },
          {
            fromCharacterId: 'verina',
            effect: { kind: 'conditional', condition: 'after healing', stat: 'atkPct', value: 0.15 },
          },
          {
            fromCharacterId: 'sanhua',
            effect: { kind: 'custom', note: 'unstructured aria' },
          },
        ],
      }),
      characterNameOf,
    );
    expect(buffs).toContainEqual({
      label: 'Chixia (custom team buff) · 20s',
      source: 'Team',
      mods: [{ stat: 'atkPct', value: 0.1 }],
    });
    expect(buffs).toContainEqual({
      label: 'Verina (custom team buff) (when after healing)',
      source: 'Team',
      mods: [{ stat: 'atkPct', value: 0.15 }],
    });
    expect(warnings).toContain('custom team effect from Sanhua not scored: unstructured aria');
  });
});
