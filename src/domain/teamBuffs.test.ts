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
