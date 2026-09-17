import { CHAIN_PRESETS, type ChainTeamPreset } from '../data/chainPresets.ts';
import { TEAM_BUFFS } from '../data/teamBuffs.ts';
import type { Team } from '../data/schema.ts';
import type { RotationBuff } from './rotation.ts';

/**
 * Domain layer: resolve a team's transcribed buffs into calculator buffs
 * (reference doc §5, v2 scope). Pure function, no React.
 *
 * Table entries (Outro + other team buffs) merge with the team's manual
 * `outroBuffs` overrides: `stat`/`conditional` effects become buff mods
 * (the condition rides in the label), `custom` effects become warnings —
 * never guessed numbers. Buff windows have no timestamp model behind
 * them (rotation blocks carry no durations), so every buff scores
 * full-rotation like any other global buff; the window stays visible in
 * the label so users can judge the assumption.
 */

export interface ResolvedTeamBuffs {
  buffs: Omit<RotationBuff, 'id'>[];
  warnings: string[];
}

/**
 * `characterNameOf` resolves display names and reports unknown ids as
 * `null` (mirrors `teamSonataCoverage`'s `sonataNameOf` pattern).
 * `chainRanks` gates chain team buffs by teammate Resonance Chain rank
 * (members without an entry count as S0 — their table buffs still
 * resolve, their chain buffs do not).
 */
export function resolveTeamBuffs(
  team: Team,
  characterNameOf: (characterId: string) => string | null,
  chainRanks: Record<string, number> = {},
): ResolvedTeamBuffs {
  const buffs: Omit<RotationBuff, 'id'>[] = [];
  const warnings: string[] = [];

  for (const characterId of team.characterIds) {
    const name = characterNameOf(characterId);
    if (name === null) {
      warnings.push(`unknown team member ${JSON.stringify(characterId)} — no team buffs resolved`);
      continue;
    }
    const entries = TEAM_BUFFS.filter((e) => e.characterId === characterId);
    const rank = chainRanks[characterId] ?? 0;
    const chainEntries = CHAIN_PRESETS.filter(
      (e): e is ChainTeamPreset =>
        e.scope === 'team' && e.characterId === characterId && e.rank <= rank,
    );
    if (entries.length === 0 && chainEntries.length === 0) {
      warnings.push(`no transcribable team buffs for ${name}`);
    }
    for (const entry of entries) {
      buffs.push({
        label: entry.windowSeconds !== undefined ? `${entry.label} · ${entry.windowSeconds}s` : entry.label,
        source: 'Team',
        mods: entry.mods.map((m) => ({ ...m })),
      });
    }
    for (const entry of chainEntries) {
      buffs.push({
        label: entry.label,
        source: 'Team',
        mods: entry.mods.map((m) => ({ ...m })),
      });
    }
  }

  for (const override of team.outroBuffs ?? []) {
    const name = characterNameOf(override.fromCharacterId) ?? override.fromCharacterId;
    const window = override.windowSeconds !== undefined ? ` · ${override.windowSeconds}s` : '';
    if (override.effect.kind === 'custom') {
      warnings.push(`custom team effect from ${name} not scored: ${override.effect.note}`);
      continue;
    }
    const condition = override.effect.kind === 'conditional' ? ` (when ${override.effect.condition})` : '';
    buffs.push({
      label: `${name} (custom team buff)${condition}${window}`,
      source: 'Team',
      mods: [{ stat: override.effect.stat, value: override.effect.value }],
    });
  }

  return { buffs, warnings };
}
