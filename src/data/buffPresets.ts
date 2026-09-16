import type { Attribute, StatKey } from './schema.ts';

/**
 * Curated preset buff library for the calculator Buffs section.
 *
 * Every entry is transcribed from a synced snapshot string (echo
 * `skillDescription`, Sonata bonus note, or weapon `passive.description`
 * + rank series), never from memory. Provenance: `sourceRef` is the
 * snapshot record id; values below were verified against the 2026-09-12
 * snapshot. A test asserts every `sourceRef` still resolves.
 *
 * Conventions:
 * - Weapon mods carry `valuesByRank` (R1..R5); the UI resolves the entry
 *   at the equipped weapon's rank. Echo/Sonata mods carry a flat `value`.
 * - Stacking/triggered effects are transcribed at FULL stacks with a
 *   full-uptime scoring assumption, always stated in `assumption`.
 * - `dmgBonus:character` resolves at add-time to the calculator
 *   character's own attribute bucket (covers "Attribute"/"All-Attribute
 *   DMG Bonus" wordings, which are equivalent to the matching bucket for
 *   the scored character).
 * - "X DMG Amplification" wordings map to the additive `dmgBonus:*`
 *   bucket (reference doc §6 has no per-type amplify term); only "All
 *   DMG Amplify" would map to `amplify`.
 * - Deliberately excluded (no matching sheet bucket or mechanic):
 *   coordinated-attack bonuses (e.g. Hecate +40%), flat Resonance /
 *   Concerto Energy restore, healing intake, shields, ATK SPD, DEF-ignore
 *   and RES-shred riders (noted per entry where dropped), and the
 *   multi-mechanic stack engines of a few 5-stars (see Thousandfold
 *   Deliverance note). Add those as custom buffs if needed.
 * - Split application: `isAutoApplied` presets (wielder weapons, met
 *   Sonata thresholds, main-slot Echoes) are applied by `computeStats`
 *   and hidden from the manual picker; team/incoming presets stay manual.
 */

export type BuffPresetSource = 'Echo' | 'Sonata' | 'Weapon';
/** Who the buff applies to: the scored character, the whole team, or the incoming resonator. */
export type BuffPresetTarget = 'wielder' | 'team' | 'incoming';

export interface BuffPresetMod {
  stat: StatKey | 'dmgBonus:character';
  /** Flat value (echo/sonata) or fallback when no rank applies. */
  value: number;
  /** Weapon rank series R1..R5; the UI picks by equipped weapon rank. */
  valuesByRank?: [number, number, number, number, number];
}

export interface BuffPreset {
  id: string;
  label: string;
  source: BuffPresetSource;
  /** Snapshot record id (echoDefId, sonataSetId, or weaponId). */
  sourceRef: string;
  target: BuffPresetTarget;
  /** Sonata presets: the piece threshold this transcription belongs to. */
  sonataPieceCount?: 2 | 3 | 5;
  /**
   * Character ids this preset is gated to (e.g. Sigillum is Aemeath-only).
   * `computeStats` auto-applies the preset only for these characters.
   */
  requiresCharacterIds?: string[];
  mods: BuffPresetMod[];
  /** Full-uptime/stack assumption or excluded-rider note. Always set when the transcription simplifies. */
  assumption?: string;
}

/**
 * Whether `computeStats` applies this preset automatically (wielder weapon
 * passives, met-threshold Sonata effects that include the wearer, and
 * main-slot Echo bonuses). Auto-applied presets are hidden from the manual
 * picker so they cannot double-apply; team/incoming presets stay manual.
 */
export function isAutoApplied(preset: BuffPreset): boolean {
  if (preset.source === 'Sonata') {
    return preset.target !== 'incoming' && preset.sonataPieceCount !== undefined;
  }
  return preset.target === 'wielder';
}

export interface PresetResolution {
  weaponRank?: number;
  attribute?: Attribute;
}

/** Resolve rank series and the character-attribute placeholder to flat mods. */
export function resolvePresetMods(
  preset: BuffPreset,
  resolution: PresetResolution = {},
): { stat: StatKey; value: number }[] {
  const rank = resolution.weaponRank ?? 5;
  const index = Math.min(5, Math.max(1, Math.round(rank))) - 1;
  return preset.mods.map((mod) => {
    const stat: StatKey =
      mod.stat === 'dmgBonus:character'
        ? (`dmgBonus:${resolution.attribute ?? 'Havoc'}` as StatKey)
        : mod.stat;
    return {
      stat,
      value: mod.valuesByRank ? mod.valuesByRank[index] : mod.value,
    };
  });
}

function rank(values: [number, number, number, number, number]): Pick<BuffPresetMod, 'value' | 'valuesByRank'> {
  return { value: values[4], valuesByRank: values };
}

export const BUFF_PRESETS: BuffPreset[] = [
  // ---- Echo main-slot bonuses (snapshot skillDescription) ----
  { id: 'echo-abyssal-patricius', label: 'Abyssal Patricius (main slot)', source: 'Echo', sourceRef: 'abyssal-patricius', target: 'wielder', mods: [{ stat: 'dmgBonus:Glacio', value: 0.12 }] },
  { id: 'echo-vitreum-dancer', label: 'Vitreum Dancer (main slot)', source: 'Echo', sourceRef: 'vitreum-dancer', target: 'wielder', mods: [{ stat: 'dmgBonus:Electro', value: 0.12 }] },
  { id: 'echo-lorelei', label: 'Lorelei (main slot)', source: 'Echo', sourceRef: 'lorelei', target: 'wielder', mods: [{ stat: 'dmgBonus:Havoc', value: 0.12 }, { stat: 'dmgBonus:basic', value: 0.12 }] },
  { id: 'echo-sentry-construct', label: 'Sentry Construct (main slot)', source: 'Echo', sourceRef: 'sentry-construct', target: 'wielder', mods: [{ stat: 'dmgBonus:Glacio', value: 0.12 }, { stat: 'dmgBonus:skill', value: 0.12 }] },
  { id: 'echo-dragon-of-dirge', label: 'Dragon of Dirge (main slot)', source: 'Echo', sourceRef: 'dragon-of-dirge', target: 'wielder', mods: [{ stat: 'dmgBonus:Fusion', value: 0.12 }, { stat: 'dmgBonus:basic', value: 0.12 }] },
  // Hecate intentionally absent: +40% Coordinated Attack DMG has no sheet bucket.
  { id: 'echo-nightmare-feilian-beringal', label: 'Nightmare: Feilian Beringal (main slot)', source: 'Echo', sourceRef: 'nightmare-feilian-beringal', target: 'wielder', mods: [{ stat: 'dmgBonus:Aero', value: 0.12 }, { stat: 'dmgBonus:heavy', value: 0.12 }] },
  { id: 'echo-nightmare-impermanence-heron', label: 'Nightmare: Impermanence Heron (main slot)', source: 'Echo', sourceRef: 'nightmare-impermanence-heron', target: 'wielder', mods: [{ stat: 'dmgBonus:Havoc', value: 0.12 }, { stat: 'dmgBonus:heavy', value: 0.12 }] },
  { id: 'echo-nightmare-thundering-mephis', label: 'Nightmare: Thundering Mephis (main slot)', source: 'Echo', sourceRef: 'nightmare-thundering-mephis', target: 'wielder', mods: [{ stat: 'dmgBonus:Electro', value: 0.12 }, { stat: 'dmgBonus:liberation', value: 0.12 }] },
  { id: 'echo-nightmare-tempest-mephis', label: 'Nightmare: Tempest Mephis (main slot)', source: 'Echo', sourceRef: 'nightmare-tempest-mephis', target: 'wielder', mods: [{ stat: 'dmgBonus:Electro', value: 0.12 }, { stat: 'dmgBonus:skill', value: 0.12 }] },
  { id: 'echo-nightmare-crownless', label: 'Nightmare: Crownless (main slot)', source: 'Echo', sourceRef: 'nightmare-crownless', target: 'wielder', mods: [{ stat: 'dmgBonus:Havoc', value: 0.12 }, { stat: 'dmgBonus:basic', value: 0.12 }] },
  { id: 'echo-nightmare-inferno-rider', label: 'Nightmare: Inferno Rider (main slot)', source: 'Echo', sourceRef: 'nightmare-inferno-rider', target: 'wielder', mods: [{ stat: 'dmgBonus:Fusion', value: 0.12 }, { stat: 'dmgBonus:skill', value: 0.12 }] },
  { id: 'echo-nightmare-mourning-aix', label: 'Nightmare: Mourning Aix (main slot)', source: 'Echo', sourceRef: 'nightmare-mourning-aix', target: 'wielder', mods: [{ stat: 'dmgBonus:Spectro', value: 0.12 }] },
  { id: 'echo-capitaneus', label: 'Capitaneus (main slot)', source: 'Echo', sourceRef: 'capitaneus', target: 'wielder', mods: [{ stat: 'dmgBonus:Spectro', value: 0.12 }, { stat: 'dmgBonus:heavy', value: 0.12 }] },
  { id: 'echo-nightmare-lampylumen-myriad', label: 'Nightmare: Lampylumen Myriad (main slot)', source: 'Echo', sourceRef: 'nightmare-lampylumen-myriad', target: 'wielder', mods: [{ stat: 'dmgBonus:Glacio', value: 0.12 }], assumption: 'Excludes +30% Coordinated Attack DMG (no matching bucket).' },
  { id: 'echo-reminiscence-fleurdelys', label: 'Reminiscence: Fleurdelys (main slot)', source: 'Echo', sourceRef: 'reminiscence-fleurdelys', target: 'wielder', mods: [{ stat: 'dmgBonus:Aero', value: 0.10 }], assumption: 'Excludes conditional +10% Aero DMG (Aero Rover / Cartethyia only).' },
  { id: 'echo-kerasaur', label: 'Kerasaur (main slot)', source: 'Echo', sourceRef: 'kerasaur', target: 'wielder', mods: [{ stat: 'dmgBonus:Aero', value: 0.12 }, { stat: 'dmgBonus:liberation', value: 0.12 }] },
  { id: 'echo-nightmare-kelpie', label: 'Nightmare: Kelpie (main slot)', source: 'Echo', sourceRef: 'nightmare-kelpie', target: 'wielder', mods: [{ stat: 'dmgBonus:Glacio', value: 0.12 }, { stat: 'dmgBonus:Aero', value: 0.12 }], assumption: 'Excludes the Outro-summon rider.' },
  { id: 'echo-lioness-of-glory', label: 'Lioness of Glory (main slot)', source: 'Echo', sourceRef: 'lioness-of-glory', target: 'wielder', mods: [{ stat: 'dmgBonus:Fusion', value: 0.12 }, { stat: 'dmgBonus:liberation', value: 0.12 }] },
  { id: 'echo-nightmare-hecate', label: 'Nightmare: Hecate (main slot)', source: 'Echo', sourceRef: 'nightmare-hecate', target: 'wielder', mods: [{ stat: 'dmgBonus:Havoc', value: 0.12 }, { stat: 'dmgBonus:echo', value: 0.20 }] },
  { id: 'echo-reminiscence-fenrico', label: 'Reminiscence: Fenrico (main slot)', source: 'Echo', sourceRef: 'reminiscence-fenrico', target: 'wielder', mods: [{ stat: 'dmgBonus:Aero', value: 0.12 }, { stat: 'dmgBonus:heavy', value: 0.12 }] },
  { id: 'echo-corrosaurus', label: 'Corrosaurus (main slot)', source: 'Echo', sourceRef: 'corrosaurus', target: 'wielder', mods: [{ stat: 'dmgBonus:Fusion', value: 0.12 }, { stat: 'dmgBonus:echo', value: 0.20 }] },
  { id: 'echo-the-false-sovereign', label: 'The False Sovereign (main slot)', source: 'Echo', sourceRef: 'the-false-sovereign', target: 'wielder', mods: [{ stat: 'dmgBonus:Electro', value: 0.12 }, { stat: 'dmgBonus:heavy', value: 0.12 }], assumption: 'Excludes the Intro-summon rider.' },
  { id: 'echo-lady-of-the-sea', label: 'Lady of the Sea (main slot)', source: 'Echo', sourceRef: 'lady-of-the-sea', target: 'wielder', mods: [{ stat: 'dmgBonus:Aero', value: 0.12 }, { stat: 'dmgBonus:liberation', value: 0.12 }] },
  { id: 'echo-reminiscence-leviathan', label: 'Reminiscence: Leviathan (main slot)', source: 'Echo', sourceRef: 'reminiscence-threnodian-leviathan', target: 'wielder', mods: [{ stat: 'dmgBonus:Havoc', value: 0.12 }, { stat: 'dmgBonus:liberation', value: 0.12 }] },
  { id: 'echo-twin-nova-nebulous-cannon', label: 'Twin Nova: Nebulous Cannon (main slot)', source: 'Echo', sourceRef: 'twin-nova-nebulous-cannon', target: 'wielder', mods: [{ stat: 'dmgBonus:Spectro', value: 0.12 }, { stat: 'dmgBonus:basic', value: 0.12 }] },
  { id: 'echo-twin-nova-collapsar-blade', label: 'Twin Nova: Collapsar Blade (main slot)', source: 'Echo', sourceRef: 'twin-nova-collapsar-blade', target: 'wielder', mods: [{ stat: 'dmgBonus:Electro', value: 0.12 }, { stat: 'dmgBonus:basic', value: 0.12 }] },
  { id: 'echo-reactor-husk', label: 'Reactor Husk (main slot)', source: 'Echo', sourceRef: 'reactor-husk', target: 'wielder', mods: [{ stat: 'energyRegen', value: 0.10 }] },
  { id: 'echo-sigillum', label: 'Sigillum (main slot, Aemeath)', source: 'Echo', sourceRef: 'sigillum', target: 'wielder', requiresCharacterIds: ['aemeath'], mods: [{ stat: 'dmgBonus:liberation', value: 0.25 }], assumption: 'Aemeath only.' },
  { id: 'echo-nameless-explorer', label: 'Nameless Explorer (main slot)', source: 'Echo', sourceRef: 'nameless-explorer', target: 'wielder', mods: [{ stat: 'dmgBonus:Aero', value: 0.12 }, { stat: 'dmgBonus:echo', value: 0.20 }] },
  { id: 'echo-reminiscence-voidborne', label: 'Reminiscence: Voidborne Construct (main slot)', source: 'Echo', sourceRef: 'reminiscence-threnodian-voidborne-construct', target: 'wielder', mods: [{ stat: 'dmgBonus:Glacio', value: 0.12 }, { stat: 'dmgBonus:liberation', value: 0.12 }] },
  { id: 'echo-adam-smasher', label: 'Reminiscence: Adam Smasher (main slot, Lucy/Rebecca)', source: 'Echo', sourceRef: 'reminiscence-nightmare-adam-smasher', target: 'wielder', requiresCharacterIds: ['lucy', 'rebecca'], mods: [{ stat: 'critRate', value: 0.15 }], assumption: 'Lucy / Rebecca only.' },
  { id: 'echo-forbidden-bastion', label: 'Forbidden Bastion (main slot)', source: 'Echo', sourceRef: 'forbidden-bastion', target: 'wielder', mods: [{ stat: 'healingBonus', value: 0.10 }] },
  { id: 'echo-myriad-snare', label: 'Myriad Snare (main slot)', source: 'Echo', sourceRef: 'myriad-snare-rustfire-chassis', target: 'wielder', mods: [{ stat: 'dmgBonus:Fusion', value: 0.12 }, { stat: 'dmgBonus:heavy', value: 0.12 }] },
  { id: 'echo-thousand-puppet-pavilion', label: 'Thousand-Puppet Pavilion (main slot)', source: 'Echo', sourceRef: 'thousand-puppet-pavilion', target: 'wielder', mods: [{ stat: 'dmgBonus:Havoc', value: 0.12 }, { stat: 'dmgBonus:heavy', value: 0.12 }] },
  { id: 'echo-calamity-effigy', label: 'Calamity Effigy (main slot)', source: 'Echo', sourceRef: 'calamity-effigy', target: 'wielder', mods: [{ stat: 'dmgBonus:Aero', value: 0.10 }], assumption: 'Excludes conditional +10% Aero DMG (Tune Strain - Shifting).' },
  { id: 'echo-denia-outro', label: 'Reminiscence: Denia (Outro follow-up)', source: 'Echo', sourceRef: 'reminiscence-denia', target: 'incoming', mods: [{ stat: 'dmgBonus:Fusion', value: 0.12 }], assumption: 'Incoming resonator only, 15s after the wielder casts Outro Skill.' },

  // ---- Sonata set bonuses with concrete numbers (custom notes) ----
  // 2pc `stat` bonuses are already applied by computeStats — never duplicated here.
  { id: 'sonata-freezing-frost-5pc', label: 'Freezing Frost 5pc', source: 'Sonata', sourceRef: 'freezing-frost', sonataPieceCount: 5, target: 'wielder', mods: [{ stat: 'dmgBonus:Glacio', value: 0.30 }], assumption: 'Full stacks (3 x 10%), full uptime after Basic/Heavy.' },
  { id: 'sonata-molten-rift-5pc', label: 'Molten Rift 5pc', source: 'Sonata', sourceRef: 'molten-rift', sonataPieceCount: 5, target: 'wielder', mods: [{ stat: 'dmgBonus:Fusion', value: 0.30 }], assumption: 'After Resonance Skill, full uptime assumed.' },
  { id: 'sonata-void-thunder-5pc', label: 'Void Thunder 5pc', source: 'Sonata', sourceRef: 'void-thunder', sonataPieceCount: 5, target: 'wielder', mods: [{ stat: 'dmgBonus:Electro', value: 0.30 }], assumption: 'Full stacks (2 x 15%), full uptime.' },
  { id: 'sonata-sierra-gale-5pc', label: 'Sierra Gale 5pc', source: 'Sonata', sourceRef: 'sierra-gale', sonataPieceCount: 5, target: 'wielder', mods: [{ stat: 'dmgBonus:Aero', value: 0.30 }], assumption: 'After Intro Skill, full uptime assumed.' },
  { id: 'sonata-celestial-light-5pc', label: 'Celestial Light 5pc', source: 'Sonata', sourceRef: 'celestial-light', sonataPieceCount: 5, target: 'wielder', mods: [{ stat: 'dmgBonus:Spectro', value: 0.30 }], assumption: 'After Intro Skill, full uptime assumed.' },
  { id: 'sonata-havoc-eclipse-5pc', label: 'Havoc Eclipse 5pc', source: 'Sonata', sourceRef: 'havoc-eclipse', sonataPieceCount: 5, target: 'wielder', mods: [{ stat: 'dmgBonus:Havoc', value: 0.30 }], assumption: 'Full stacks (4 x 7.5%), full uptime.' },
  { id: 'sonata-rejuvenating-glow-5pc', label: 'Rejuvenating Glow 5pc (team)', source: 'Sonata', sourceRef: 'rejuvenating-glow', sonataPieceCount: 5, target: 'team', mods: [{ stat: 'atkPct', value: 0.15 }], assumption: 'Party-wide for 30s after healing; scored full uptime.' },
  { id: 'sonata-moonlit-clouds-5pc', label: 'Moonlit Clouds 5pc (incoming)', source: 'Sonata', sourceRef: 'moonlit-clouds', sonataPieceCount: 5, target: 'incoming', mods: [{ stat: 'atkPct', value: 0.225 }], assumption: 'Next resonator for 15s after the wielder casts Outro Skill.' },
  { id: 'sonata-lingering-tunes-5pc', label: 'Lingering Tunes 5pc', source: 'Sonata', sourceRef: 'lingering-tunes', sonataPieceCount: 5, target: 'wielder', mods: [{ stat: 'atkPct', value: 0.20 }, { stat: 'dmgBonus:outro', value: 0.60 }], assumption: 'On-field ramp complete (4 x 5% ATK); Outro Skill DMG +60%.' },

  // ---- Weapon passives (rank series R1..R5, full stacks / full uptime) ----
  { id: 'weapon-autumntrace', label: 'Autumntrace', source: 'Weapon', sourceRef: 'autumntrace', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.20, 0.31, 0.42, 0.53, 0.64]) }], assumption: 'Full stacks (5) after Basic/Heavy hits.' },
  { id: 'weapon-lumingloss', label: 'Lumingloss', source: 'Weapon', sourceRef: 'lumingloss', target: 'wielder', mods: [{ stat: 'dmgBonus:basic', ...rank([0.20, 0.31, 0.42, 0.53, 0.64]) }, { stat: 'dmgBonus:heavy', ...rank([0.20, 0.31, 0.42, 0.53, 0.64]) }], assumption: 'After Resonance Skill.' },
  { id: 'weapon-thunderbolt', label: 'Thunderbolt', source: 'Weapon', sourceRef: 'thunderbolt', target: 'wielder', mods: [{ stat: 'dmgBonus:skill', ...rank([0.21, 0.33, 0.45, 0.57, 0.69]) }], assumption: 'Full stacks (3) after Basic/Heavy hits.' },
  { id: 'weapon-stonard', label: 'Stonard', source: 'Weapon', sourceRef: 'stonard', target: 'wielder', mods: [{ stat: 'dmgBonus:liberation', ...rank([0.18, 0.27, 0.36, 0.45, 0.54]) }], assumption: 'After Resonance Skill (15s).' },
  { id: 'weapon-augment', label: 'Augment', source: 'Weapon', sourceRef: 'augment', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.15, 0.2325, 0.315, 0.3975, 0.48]) }], assumption: 'After Resonance Liberation (15s).' },
  { id: 'weapon-broadblade-of-night', label: 'Broadblade of Night', source: 'Weapon', sourceRef: 'broadblade-of-night', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }], assumption: 'After Intro Skill (10s).' },
  { id: 'weapon-sword-of-night', label: 'Sword of Night', source: 'Weapon', sourceRef: 'sword-of-night', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }], assumption: 'After Intro Skill (10s).' },
  { id: 'weapon-pistols-of-night', label: 'Pistols of Night', source: 'Weapon', sourceRef: 'pistols-of-night', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }], assumption: 'After Intro Skill (10s).' },
  { id: 'weapon-gauntlets-of-night', label: 'Gauntlets of Night', source: 'Weapon', sourceRef: 'gauntlets-of-night', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }], assumption: 'After Intro Skill (10s).' },
  { id: 'weapon-rectifier-of-night', label: 'Rectifier of Night', source: 'Weapon', sourceRef: 'rectifier-of-night', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }], assumption: 'After Intro Skill (10s).' },
  { id: 'weapon-tyro-broadblade', label: 'Tyro Broadblade', source: 'Weapon', sourceRef: 'tyro-broadblade', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.05, 0.0625, 0.075, 0.0875, 0.10]) }] },
  { id: 'weapon-tyro-sword', label: 'Tyro Sword', source: 'Weapon', sourceRef: 'tyro-sword', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.05, 0.0625, 0.075, 0.0875, 0.10]) }] },
  { id: 'weapon-tyro-pistols', label: 'Tyro Pistols', source: 'Weapon', sourceRef: 'tyro-pistols', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.05, 0.0625, 0.075, 0.0875, 0.10]) }] },
  { id: 'weapon-tyro-gauntlets', label: 'Tyro Gauntlets', source: 'Weapon', sourceRef: 'tyro-gauntlets', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.05, 0.0625, 0.075, 0.0875, 0.10]) }] },
  { id: 'weapon-tyro-rectifier', label: 'Tyro Rectifier', source: 'Weapon', sourceRef: 'tyro-rectifier', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.05, 0.0625, 0.075, 0.0875, 0.10]) }] },
  { id: 'weapon-training-broadblade', label: 'Training Broadblade', source: 'Weapon', sourceRef: 'training-broadblade', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.04, 0.05, 0.06, 0.07, 0.08]) }] },
  { id: 'weapon-training-sword', label: 'Training Sword', source: 'Weapon', sourceRef: 'training-sword', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.04, 0.05, 0.06, 0.07, 0.08]) }] },
  { id: 'weapon-training-pistols', label: 'Training Pistols', source: 'Weapon', sourceRef: 'training-pistols', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.04, 0.05, 0.06, 0.07, 0.08]) }] },
  { id: 'weapon-training-gauntlets', label: 'Training Gauntlets', source: 'Weapon', sourceRef: 'training-gauntlets', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.04, 0.05, 0.06, 0.07, 0.08]) }] },
  { id: 'weapon-training-rectifier', label: 'Training Rectifier', source: 'Weapon', sourceRef: 'training-rectifier', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.04, 0.05, 0.06, 0.07, 0.08]) }] },
  { id: 'weapon-broadblade-41', label: 'Broadblade#41', source: 'Weapon', sourceRef: 'broadblade-41', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }], assumption: 'HP above 80%; excludes the low-HP self-heal.' },
  { id: 'weapon-sword-18', label: 'Sword#18', source: 'Weapon', sourceRef: 'sword-18', target: 'wielder', mods: [{ stat: 'dmgBonus:heavy', ...rank([0.18, 0.225, 0.27, 0.315, 0.36]) }], assumption: 'Low-HP trigger assumed active; excludes the self-heal.' },
  { id: 'weapon-gauntlets-21d', label: 'Gauntlets#21D', source: 'Weapon', sourceRef: 'gauntlets-21d', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }], assumption: 'After dash/dodge; excludes Dodge-Counter DMG and the heal.' },
  { id: 'weapon-rectifier-25', label: 'Rectifier#25', source: 'Weapon', sourceRef: 'rectifier-25', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }], assumption: 'High-HP branch (HP above 60%, 10s).' },
  { id: 'weapon-dauntless-evernight', label: 'Dauntless Evernight', source: 'Weapon', sourceRef: 'dauntless-evernight', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }, { stat: 'defPct', ...rank([0.15, 0.1875, 0.225, 0.2625, 0.30]) }], assumption: 'After Intro Skill (15s).' },
  { id: 'weapon-commando-of-conviction', label: 'Commando of Conviction', source: 'Weapon', sourceRef: 'commando-of-conviction', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.15, 0.1875, 0.225, 0.2625, 0.30]) }], assumption: 'After Intro Skill (15s).' },
  { id: 'weapon-undying-flame', label: 'Undying Flame', source: 'Weapon', sourceRef: 'undying-flame', target: 'wielder', mods: [{ stat: 'dmgBonus:skill', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }], assumption: 'After Intro Skill (15s).' },
  { id: 'weapon-amity-accord', label: 'Amity Accord', source: 'Weapon', sourceRef: 'amity-accord', target: 'wielder', mods: [{ stat: 'dmgBonus:liberation', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }], assumption: 'After Intro Skill (15s).' },
  { id: 'weapon-jinzhou-keeper', label: 'Jinzhou Keeper', source: 'Weapon', sourceRef: 'jinzhou-keeper', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }, { stat: 'hpPct', ...rank([0.10, 0.125, 0.15, 0.175, 0.20]) }], assumption: 'After Intro Skill (15s).' },
  { id: 'weapon-guardian-broadblade', label: 'Guardian Broadblade', source: 'Weapon', sourceRef: 'guardian-broadblade', target: 'wielder', mods: [{ stat: 'dmgBonus:basic', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:heavy', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }] },
  { id: 'weapon-guardian-sword', label: 'Guardian Sword', source: 'Weapon', sourceRef: 'guardian-sword', target: 'wielder', mods: [{ stat: 'dmgBonus:skill', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }] },
  { id: 'weapon-guardian-pistols', label: 'Guardian Pistols', source: 'Weapon', sourceRef: 'guardian-pistols', target: 'wielder', mods: [{ stat: 'dmgBonus:skill', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }] },
  { id: 'weapon-guardian-gauntlets', label: 'Guardian Gauntlets', source: 'Weapon', sourceRef: 'guardian-gauntlets', target: 'wielder', mods: [{ stat: 'dmgBonus:liberation', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }] },
  { id: 'weapon-guardian-rectifier', label: 'Guardian Rectifier', source: 'Weapon', sourceRef: 'guardian-rectifier', target: 'wielder', mods: [{ stat: 'dmgBonus:basic', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:heavy', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }] },
  { id: 'weapon-helios-cleaver', label: 'Helios Cleaver', source: 'Weapon', sourceRef: 'helios-cleaver', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }], assumption: 'Full stacks (4) after Resonance Skill.' },
  { id: 'weapon-lunar-cutter', label: 'Lunar Cutter', source: 'Weapon', sourceRef: 'lunar-cutter', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }], assumption: 'Full Oath stacks (6) on entry.' },
  { id: 'weapon-novaburst', label: 'Novaburst', source: 'Weapon', sourceRef: 'novaburst', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }], assumption: 'Full stacks (3) after dash/dodge.' },
  { id: 'weapon-hollow-mirage', label: 'Hollow Mirage', source: 'Weapon', sourceRef: 'hollow-mirage', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.09, 0.105, 0.12, 0.135, 0.15]) }, { stat: 'defPct', ...rank([0.09, 0.105, 0.12, 0.135, 0.15]) }], assumption: 'Full Iron Armor (3) after Liberation; assumes no hits taken.' },
  { id: 'weapon-comet-flare', label: 'Comet Flare', source: 'Weapon', sourceRef: 'comet-flare', target: 'wielder', mods: [{ stat: 'healingBonus', ...rank([0.09, 0.1125, 0.135, 0.1575, 0.18]) }], assumption: 'Full stacks (3) after Basic/Heavy hits.' },
  { id: 'weapon-lustrous-razor', label: 'Lustrous Razor', source: 'Weapon', sourceRef: 'lustrous-razor', target: 'wielder', mods: [{ stat: 'energyRegen', ...rank([0.128, 0.16, 0.192, 0.224, 0.256]) }, { stat: 'dmgBonus:liberation', ...rank([0.21, 0.2625, 0.315, 0.3675, 0.42]) }], assumption: 'Full stacks (3) after Resonance Skill.' },
  { id: 'weapon-emerald-of-genesis', label: 'Emerald of Genesis', source: 'Weapon', sourceRef: 'emerald-of-genesis', target: 'wielder', mods: [{ stat: 'energyRegen', ...rank([0.128, 0.16, 0.192, 0.224, 0.256]) }, { stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }], assumption: 'Full stacks (2) after Resonance Skill.' },
  { id: 'weapon-static-mist', label: 'Static Mist', source: 'Weapon', sourceRef: 'static-mist', target: 'wielder', mods: [{ stat: 'energyRegen', ...rank([0.128, 0.16, 0.192, 0.224, 0.256]) }] },
  { id: 'weapon-static-mist-outro', label: 'Static Mist (Outro, incoming)', source: 'Weapon', sourceRef: 'static-mist', target: 'incoming', mods: [{ stat: 'atkPct', ...rank([0.10, 0.125, 0.15, 0.175, 0.20]) }], assumption: 'Incoming resonator for 14s after the wielder casts Outro Skill.' },
  { id: 'weapon-abyss-surges', label: 'Abyss Surges', source: 'Weapon', sourceRef: 'abyss-surges', target: 'wielder', mods: [{ stat: 'energyRegen', ...rank([0.128, 0.16, 0.192, 0.224, 0.256]) }, { stat: 'dmgBonus:basic', ...rank([0.10, 0.125, 0.15, 0.175, 0.20]) }, { stat: 'dmgBonus:skill', ...rank([0.10, 0.125, 0.15, 0.175, 0.20]) }], assumption: 'Both trigger branches active.' },
  { id: 'weapon-cosmic-ripples', label: 'Cosmic Ripples', source: 'Weapon', sourceRef: 'cosmic-ripples', target: 'wielder', mods: [{ stat: 'energyRegen', ...rank([0.128, 0.16, 0.192, 0.224, 0.256]) }, { stat: 'dmgBonus:basic', ...rank([0.16, 0.20, 0.24, 0.28, 0.32]) }], assumption: 'Full stacks (5) on Basic Attack DMG.' },
  { id: 'weapon-verdant-summit', label: 'Verdant Summit', source: 'Weapon', sourceRef: 'verdant-summit', target: 'wielder', mods: [{ stat: 'dmgBonus:character', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:heavy', ...rank([0.48, 0.60, 0.72, 0.84, 0.96]) }], assumption: 'Full stacks (2) after Intro/Liberation.' },
  { id: 'weapon-stringmaster', label: 'Stringmaster', source: 'Weapon', sourceRef: 'stringmaster', target: 'wielder', mods: [{ stat: 'dmgBonus:character', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'atkPct', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'Full stacks (2) on Resonance Skill DMG; excludes the off-field bonus.' },
  { id: 'weapon-ages-of-harvest', label: 'Ages of Harvest', source: 'Weapon', sourceRef: 'ages-of-harvest', target: 'wielder', mods: [{ stat: 'dmgBonus:character', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:skill', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'Marking active after Intro/Skill.' },
  { id: 'weapon-blazing-brilliance', label: 'Blazing Brilliance', source: 'Weapon', sourceRef: 'blazing-brilliance', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:skill', ...rank([0.56, 0.70, 0.84, 0.98, 1.12]) }], assumption: 'Full Searing Feather (14 stacks).' },
  { id: 'weapon-rime-draped-sprouts', label: 'Rime-Draped Sprouts', source: 'Weapon', sourceRef: 'rime-draped-sprouts', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:basic', ...rank([0.36, 0.45, 0.54, 0.63, 0.72]) }], assumption: 'Full stacks (3); excludes the Outro-consumption burst.' },
  { id: 'weapon-verity-s-handle', label: "Verity's Handle", source: 'Weapon', sourceRef: 'verity-s-handle', target: 'wielder', mods: [{ stat: 'dmgBonus:character', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:liberation', ...rank([0.48, 0.60, 0.72, 0.84, 0.96]) }], assumption: 'After Resonance Liberation.' },
  { id: 'weapon-stellar-symphony-team', label: 'Stellar Symphony (team heal)', source: 'Weapon', sourceRef: 'stellar-symphony', target: 'team', mods: [{ stat: 'atkPct', ...rank([0.14, 0.175, 0.21, 0.245, 0.28]) }], assumption: 'Party-wide for 30s after a healing Resonance Skill; excludes HP and Concerto parts.' },
  { id: 'weapon-waning-redshift', label: 'Waning Redshift', source: 'Weapon', sourceRef: 'waning-redshift', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.10, 0.125, 0.15, 0.175, 0.20]) }], assumption: 'After Resonance Skill (16s); excludes the Resonance Energy restore.' },
  { id: 'weapon-endless-collapse', label: 'Endless Collapse', source: 'Weapon', sourceRef: 'endless-collapse', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.10, 0.125, 0.15, 0.175, 0.20]) }], assumption: 'After Resonance Skill (16s); excludes the Resonance Energy restore.' },
  { id: 'weapon-relativistic-jet', label: 'Relativistic Jet', source: 'Weapon', sourceRef: 'relativistic-jet', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.10, 0.125, 0.15, 0.175, 0.20]) }], assumption: 'After Resonance Skill (16s); excludes the Resonance Energy restore.' },
  { id: 'weapon-celestial-spiral', label: 'Celestial Spiral', source: 'Weapon', sourceRef: 'celestial-spiral', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.10, 0.125, 0.15, 0.175, 0.20]) }], assumption: 'After Resonance Skill (16s); excludes the Resonance Energy restore.' },
  { id: 'weapon-fusion-accretion', label: 'Fusion Accretion', source: 'Weapon', sourceRef: 'fusion-accretion', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.10, 0.125, 0.15, 0.175, 0.20]) }], assumption: 'After Resonance Skill (16s); excludes the Resonance Energy restore.' },
  { id: 'weapon-somnoire-anchor', label: 'Somnoire Anchor', source: 'Weapon', sourceRef: 'somnoire-anchor', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }, { stat: 'critRate', ...rank([0.06, 0.075, 0.09, 0.105, 0.12]) }], assumption: 'Full Hiss (10 stacks).' },
  { id: 'weapon-red-spring', label: 'Red Spring', source: 'Weapon', sourceRef: 'red-spring', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:basic', ...rank([0.30, 0.375, 0.45, 0.525, 0.60]) }], assumption: 'Full stacks (3); excludes the Concerto-consumption rider.' },
  { id: 'weapon-call-of-the-abyss', label: 'Call of the Abyss', source: 'Weapon', sourceRef: 'call-of-the-abyss', target: 'wielder', mods: [{ stat: 'healingBonus', ...rank([0.16, 0.20, 0.24, 0.28, 0.32]) }], assumption: 'After Resonance Liberation (15s).' },
  { id: 'weapon-meditations-on-mercy', label: 'Meditations on Mercy', source: 'Weapon', sourceRef: 'meditations-on-mercy', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.16, 0.20, 0.24, 0.28, 0.32]) }], assumption: 'Vs Negative-Status enemies, full stacks (4).' },
  { id: 'weapon-fables-of-wisdom', label: 'Fables of Wisdom', source: 'Weapon', sourceRef: 'fables-of-wisdom', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.16, 0.20, 0.24, 0.28, 0.32]) }], assumption: 'Vs Negative-Status enemies, full stacks (4).' },
  { id: 'weapon-romance-in-farewell', label: 'Romance in Farewell', source: 'Weapon', sourceRef: 'romance-in-farewell', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.16, 0.20, 0.24, 0.28, 0.32]) }], assumption: 'Vs Negative-Status enemies, full stacks (4).' },
  { id: 'weapon-legend-of-drunken-hero', label: 'Legend of Drunken Hero', source: 'Weapon', sourceRef: 'legend-of-drunken-hero', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.16, 0.20, 0.24, 0.28, 0.32]) }], assumption: 'Vs Negative-Status enemies, full stacks (4).' },
  { id: 'weapon-waltz-in-masquerade', label: 'Waltz in Masquerade', source: 'Weapon', sourceRef: 'waltz-in-masquerade', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.16, 0.20, 0.24, 0.28, 0.32]) }], assumption: 'Vs Negative-Status enemies, full stacks (4).' },
  { id: 'weapon-tragicomedy', label: 'Tragicomedy', source: 'Weapon', sourceRef: 'tragicomedy', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:heavy', ...rank([0.48, 0.60, 0.72, 0.84, 0.96]) }], assumption: 'After Basic Attack / Intro Skill.' },
  { id: 'weapon-the-last-dance', label: 'The Last Dance', source: 'Weapon', sourceRef: 'the-last-dance', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:skill', ...rank([0.48, 0.60, 0.72, 0.84, 0.96]) }], assumption: 'After Intro Skill / Liberation.' },
  { id: 'weapon-unflickering-valor', label: 'Unflickering Valor', source: 'Weapon', sourceRef: 'unflickering-valor', target: 'wielder', mods: [{ stat: 'critRate', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }, { stat: 'dmgBonus:basic', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'Liberation cast; Basic branch active.' },
  { id: 'weapon-luminous-hymn', label: 'Luminous Hymn', source: 'Weapon', sourceRef: 'luminous-hymn', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:basic', ...rank([0.42, 0.525, 0.63, 0.735, 0.84]) }, { stat: 'dmgBonus:heavy', ...rank([0.42, 0.525, 0.63, 0.735, 0.84]) }], assumption: 'Vs Spectro Frazzle, full stacks (3); excludes the Frazzle amp.' },
  { id: 'weapon-ocean-s-gift', label: "Ocean's Gift", source: 'Weapon', sourceRef: 'ocean-s-gift', target: 'wielder', mods: [{ stat: 'dmgBonus:Spectro', ...rank([0.24, 0.28, 0.32, 0.36, 0.40]) }], assumption: 'Vs Spectro Frazzle, full stacks (4).' },
  { id: 'weapon-whispers-of-sirens', label: 'Whispers of Sirens', source: 'Weapon', sourceRef: 'whispers-of-sirens', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:basic', ...rank([0.40, 0.50, 0.60, 0.70, 0.80]) }], assumption: 'Gentle Dream at 1 stack; excludes the stack-2 Havoc RES ignore.' },
  { id: 'weapon-bloodpact-s-pledge', label: "Bloodpact's Pledge", source: 'Weapon', sourceRef: 'bloodpact-s-pledge', target: 'wielder', mods: [{ stat: 'dmgBonus:skill', ...rank([0.10, 0.14, 0.18, 0.22, 0.26]) }], assumption: 'After providing healing (6s).' },
  { id: 'weapon-bloodpact-s-pledge-team', label: "Bloodpact's Pledge (Aero Rover team)", source: 'Weapon', sourceRef: 'bloodpact-s-pledge', target: 'team', mods: [{ stat: 'dmgBonus:Aero', ...rank([0.10, 0.14, 0.18, 0.22, 0.26]) }], assumption: 'Aero Rover Unbound Flow only; "Amplified" scored in the additive bucket.' },
  { id: 'weapon-blazing-justice', label: 'Blazing Justice', source: 'Weapon', sourceRef: 'blazing-justice', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'defIgnore', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }, { stat: 'negativeStatusAmplify', ...rank([0.50, 0.625, 0.75, 0.875, 1.00]) }], assumption: 'Basic Attack branch; Spectro Frazzle targets.' },
  { id: 'weapon-woodland-aria', label: 'Woodland Aria', source: 'Weapon', sourceRef: 'woodland-aria', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:Aero', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'Aero Erosion inflicted; excludes the Aero RES shred.' },
  { id: 'weapon-defier-s-thorn', label: "Defier's Thorn", source: 'Weapon', sourceRef: 'defier-s-thorn', target: 'wielder', mods: [{ stat: 'hpPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'defIgnore', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }], assumption: 'Trigger window active; excludes the Erosion-gated team amp.' },
  { id: 'weapon-wildfire-mark', label: 'Wildfire Mark', source: 'Weapon', sourceRef: 'wildfire-mark', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:liberation', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'After Intro Skill / Liberation.' },
  { id: 'weapon-wildfire-mark-team', label: 'Wildfire Mark (team Fusion)', source: 'Weapon', sourceRef: 'wildfire-mark', target: 'team', mods: [{ stat: 'dmgBonus:Fusion', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'After a Heavy-attack extension; party-wide 30s.' },
  { id: 'weapon-lethean-elegy', label: 'Lethean Elegy', source: 'Weapon', sourceRef: 'lethean-elegy', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:skill', ...rank([0.32, 0.40, 0.48, 0.56, 0.64]) }, { stat: 'dmgBonus:echo', ...rank([0.32, 0.40, 0.48, 0.56, 0.64]) }, { stat: 'defIgnore', ...rank([0.08, 0.10, 0.12, 0.14, 0.16]) }], assumption: 'Within 12s after Echo Skill DMG; "Echo Amplification" in the additive bucket.' },
  { id: 'weapon-moongazer-s-sigil', label: "Moongazer's Sigil", source: 'Weapon', sourceRef: 'moongazer-s-sigil', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:liberation', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }], assumption: 'After Intro / Liberation; excludes the shield-gated DEF ignore.' },
  { id: 'weapon-thunderflare-dominion', label: 'Thunderflare Dominion', source: 'Weapon', sourceRef: 'thunderflare-dominion', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:heavy', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }], assumption: 'After Intro / Skill; excludes the shield-gated DEF ignore.' },
  { id: 'weapon-aureate-zenith', label: 'Aureate Zenith', source: 'Weapon', sourceRef: 'aureate-zenith', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.072, 0.111, 0.151, 0.19, 0.23]) }, { stat: 'dmgBonus:heavy', ...rank([0.108, 0.167, 0.226, 0.286, 0.345]) }], assumption: 'After Resonance Liberation (15s).' },
  { id: 'weapon-feather-edge', label: 'Feather Edge', source: 'Weapon', sourceRef: 'feather-edge', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.072, 0.111, 0.151, 0.19, 0.23]) }, { stat: 'dmgBonus:liberation', ...rank([0.108, 0.167, 0.226, 0.286, 0.345]) }], assumption: 'After Resonance Liberation (15s).' },
  { id: 'weapon-solar-flame', label: 'Solar Flame', source: 'Weapon', sourceRef: 'solar-flame', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.088, 0.136, 0.188, 0.236, 0.288]) }, { stat: 'dmgBonus:heavy', ...rank([0.088, 0.136, 0.188, 0.236, 0.288]) }], assumption: 'Full stacks (4) on Basic/Heavy DMG.' },
  { id: 'weapon-aether-strike', label: 'Aether Strike', source: 'Weapon', sourceRef: 'aether-strike', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.072, 0.111, 0.151, 0.19, 0.23]) }, { stat: 'dmgBonus:liberation', ...rank([0.108, 0.167, 0.226, 0.286, 0.345]) }], assumption: 'After Resonance Liberation (15s).' },
  { id: 'weapon-radiant-dawn', label: 'Radiant Dawn', source: 'Weapon', sourceRef: 'radiant-dawn', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.09, 0.139, 0.189, 0.238, 0.288]) }, { stat: 'dmgBonus:basic', ...rank([0.09, 0.139, 0.189, 0.238, 0.288]) }], assumption: 'After Resonance Skill (10s).' },
  { id: 'weapon-lux-umbra', label: 'Lux & Umbra', source: 'Weapon', sourceRef: 'lux-umbra', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:heavy', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }, { stat: 'dmgBonus:echo', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'Both Echo/Heavy branches active; "Amplification" in the additive bucket; excludes DEF ignore.' },
  { id: 'weapon-emerald-sentence', label: 'Emerald Sentence', source: 'Weapon', sourceRef: 'emerald-sentence', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:heavy', ...rank([0.60, 0.75, 0.90, 1.05, 1.20]) }], assumption: 'Full Bamboo Cleaver (2 stacks); excludes the team Echo-Skill branch (separate preset).' },
  { id: 'weapon-emerald-sentence-team', label: 'Emerald Sentence (team Echo Skill)', source: 'Weapon', sourceRef: 'emerald-sentence', target: 'team', mods: [{ stat: 'dmgBonus:echo', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }], assumption: 'After the wielder casts Intro Skill; party-wide 30s.' },
  { id: 'weapon-kumokiri', label: 'Kumokiri', source: 'Weapon', sourceRef: 'kumokiri', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:liberation', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'Full stacks (3) after Intro / Negative Status.' },
  { id: 'weapon-kumokiri-team', label: 'Kumokiri (team Attribute)', source: 'Weapon', sourceRef: 'kumokiri', target: 'team', mods: [{ stat: 'dmgBonus:character', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'At max stacks, when the team inflicts Negative Statuses (15s).' },
  { id: 'weapon-spectrum-blaster', label: 'Spectrum Blaster', source: 'Weapon', sourceRef: 'spectrum-blaster', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:basic', ...rank([0.36, 0.45, 0.54, 0.63, 0.72]) }], assumption: 'After Intro / Basic DMG.' },
  { id: 'weapon-spectrum-blaster-team', label: 'Spectrum Blaster (team all-DMG)', source: 'Weapon', sourceRef: 'spectrum-blaster', target: 'team', mods: [{ stat: 'amplify', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'Full stacks (3) after Tune Rupture/Strain during Basics; party-wide "all DMG" as attacker amplify.' },
  { id: 'weapon-starfield-calibrator', label: 'Starfield Calibrator', source: 'Weapon', sourceRef: 'starfield-calibrator', target: 'wielder', mods: [{ stat: 'defPct', ...rank([0.16, 0.20, 0.24, 0.28, 0.32]) }], assumption: 'Excludes the Concerto restore and heal-triggered team Crit DMG (separate preset).' },
  { id: 'weapon-starfield-calibrator-team', label: 'Starfield Calibrator (team Crit DMG)', source: 'Weapon', sourceRef: 'starfield-calibrator', target: 'team', mods: [{ stat: 'critDmg', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }], assumption: 'When the wielder heals; nearby resonators, 4s window scored full uptime.' },
  { id: 'weapon-radiance-cleaver', label: 'Radiance Cleaver', source: 'Weapon', sourceRef: 'radiance-cleaver', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:liberation', ...rank([0.24, 0.27, 0.30, 0.33, 0.36]) }], assumption: 'Vs Tune Strain - Interfered targets.' },
  { id: 'weapon-laser-shearer', label: 'Laser Shearer', source: 'Weapon', sourceRef: 'laser-shearer', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:skill', ...rank([0.24, 0.27, 0.30, 0.33, 0.36]) }], assumption: 'Vs Tune Strain - Interfered targets.' },
  { id: 'weapon-phasic-homogenizer', label: 'Phasic Homogenizer', source: 'Weapon', sourceRef: 'phasic-homogenizer', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:character', ...rank([0.20, 0.225, 0.25, 0.275, 0.30]) }], assumption: 'After a team Tune Break skill (14s).' },
  { id: 'weapon-pulsation-bracer', label: 'Pulsation Bracer', source: 'Weapon', sourceRef: 'pulsation-bracer', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:basic', ...rank([0.24, 0.268, 0.30, 0.328, 0.36]) }], assumption: 'Vs Interfered targets, full stacks (4).' },
  { id: 'weapon-boson-astrolabe', label: 'Boson Astrolabe', source: 'Weapon', sourceRef: 'boson-astrolabe', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.135, 0.15, 0.165, 0.18]) }, { stat: 'dmgBonus:basic', ...rank([0.12, 0.135, 0.15, 0.165, 0.18]) }], assumption: 'ATK base plus Tune-Break branch (14s).' },
  { id: 'weapon-everbright-polestar', label: 'Everbright Polestar', source: 'Weapon', sourceRef: 'everbright-polestar', target: 'wielder', mods: [{ stat: 'dmgBonus:character', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }], assumption: 'Excludes the Rupture/Burst DEF-ignore and Fusion RES riders.' },
  { id: 'weapon-daybreaker-s-spine', label: "Daybreaker's Spine", source: 'Weapon', sourceRef: 'daybreaker-s-spine', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:Spectro', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }, { stat: 'dmgBonus:basic', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }], assumption: 'After Basic DMG and Tune Strain - Shifting; "Basic Amplification" in the additive bucket; excludes DEF ignore.' },
  { id: 'weapon-solsworn-ciphers', label: 'Solsworn Ciphers', source: 'Weapon', sourceRef: 'solsworn-ciphers', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:echo', ...rank([0.32, 0.40, 0.48, 0.56, 0.64]) }], assumption: 'After Intro / Echo Skill; "Echo Amplification" in the additive bucket; excludes DEF ignore.' },
  { id: 'weapon-forged-dwarf-star', label: 'Forged Dwarf Star', source: 'Weapon', sourceRef: 'forged-dwarf-star', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:liberation', ...rank([0.36, 0.45, 0.54, 0.63, 0.72]) }], assumption: 'After Fusion Burst / Tune Strain - Shifting (5s).' },
  { id: 'weapon-forged-dwarf-star-team', label: 'Forged Dwarf Star (team ATK)', source: 'Weapon', sourceRef: 'forged-dwarf-star', target: 'team', mods: [{ stat: 'atkPct', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'After team Fusion Burst / Strain during the window (15s).' },
  { id: 'weapon-frostburn', label: 'Frostburn', source: 'Weapon', sourceRef: 'frostburn', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:Glacio', ...rank([0.28, 0.35, 0.42, 0.49, 0.56]) }], assumption: 'After applying Glacio Chafe; "Glacio Amplified" in the additive bucket; excludes Chafe-DMG amp and DEF ignore.' },
  { id: 'weapon-spectral-trigger', label: 'Spectral Trigger', source: 'Weapon', sourceRef: 'spectral-trigger', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:Spectro', ...rank([0.40, 0.50, 0.60, 0.70, 0.80]) }, { stat: 'dmgBonus:heavy', ...rank([0.30, 0.375, 0.45, 0.525, 0.60]) }], assumption: 'After Skill (2 stacks) plus Hack - Shifting; "Heavy Amplification" in the additive bucket; excludes DEF ignore.' },
  { id: 'weapon-skull-thrasher', label: 'Skull Thrasher', source: 'Weapon', sourceRef: 'skull-thrasher', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:basic', ...rank([0.36, 0.45, 0.54, 0.63, 0.72]) }], assumption: 'Intro branch plus Hack - Shifting branch, both full uptime.' },
  { id: 'weapon-skull-thrasher-team', label: 'Skull Thrasher (team ATK)', source: 'Weapon', sourceRef: 'skull-thrasher', target: 'team', mods: [{ stat: 'atkPct', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'Hack - Shifting inflicted; party-wide 30s.' },
  { id: 'weapon-freeze-frame', label: 'Freeze Frame', source: 'Weapon', sourceRef: 'freeze-frame', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:Glacio', ...rank([0.30, 0.375, 0.45, 0.525, 0.60]) }], assumption: 'After inflicting Glacio Chafe.' },
  { id: 'weapon-freeze-frame-team', label: 'Freeze Frame (team ATK)', source: 'Weapon', sourceRef: 'freeze-frame', target: 'team', mods: [{ stat: 'atkPct', ...rank([0.24, 0.30, 0.36, 0.42, 0.48]) }], assumption: 'Party-wide 30s after Glacio Chafe.' },
  { id: 'weapon-azure-oath', label: 'Azure Oath', source: 'Weapon', sourceRef: 'azure-oath', target: 'wielder', mods: [{ stat: 'dmgBonus:character', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:heavy', ...rank([0.36, 0.45, 0.54, 0.63, 0.72]) }], assumption: 'After Havoc Bane; "Heavy Amplification" in the additive bucket; excludes DEF ignore.' },
  { id: 'weapon-firstlight-s-herald-team', label: "Firstlight's Herald (team ATK)", source: 'Weapon', sourceRef: 'firstlight-s-herald', target: 'team', mods: [{ stat: 'atkPct', ...rank([0.20, 0.25, 0.30, 0.35, 0.40]) }], assumption: 'Snow Taint + Ripples setup required; excludes HP and Concerto parts.' },
  { id: 'weapon-thousandfold-deliverance', label: 'Thousandfold Deliverance', source: 'Weapon', sourceRef: 'thousandfold-deliverance', target: 'wielder', mods: [{ stat: 'dmgBonus:character', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }], assumption: 'Base effect only; excludes the Nature Order / Cradle of Life stack engines.' },
  { id: 'weapon-glint-of-clouds', label: 'Glint of Clouds', source: 'Weapon', sourceRef: 'glint-of-clouds', target: 'wielder', mods: [{ stat: 'atkPct', ...rank([0.12, 0.15, 0.18, 0.21, 0.24]) }, { stat: 'dmgBonus:Aero', ...rank([0.56, 0.70, 0.84, 0.98, 1.12]) }], assumption: 'Full stacks (5) of Tune Strain - Shifting; excludes DEF ignore.' },
];
