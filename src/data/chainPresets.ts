import type { MotionBonusKind, SkillKind, StatKey } from './schema.ts';

/**
 * Curated Resonance Chain transcription catalog.
 *
 * Every chain rank in the snapshot ships as `custom` ("Unstructured kit
 * effect") by design — sync never structures kit prose (fabrication
 * guardrail). This catalog is the hand-transcribed counterpart, mirroring
 * the BUFF_PRESETS playbook: every entry cites its snapshot character +
 * rank, values come only from the rank description, stacking/timed effects
 * transcribe at FULL stacks with a full-uptime scoring assumption, and a
 * test asserts every entry still resolves.
 *
 * Scopes:
 * - `sheet`: flat mods auto-applied by `computeStats` at ranks ≤ roster.
 * - `motion`: per-motion multipliers / skill-scoped crit consumed by
 *   `characterSkillMods`. Matching is case-insensitive substring on the
 *   snapshot motion name plus an optional skill-kind filter — never
 *   regex-in-data. A test fails any entry matching zero motions.
 * - `team`: manual team-buff entries (surfaced with rank gating); the
 *   wielder-including part ALSO ships as a `sheet` entry per the
 *   wearer-total convention (buffPresets.ts).
 * - `note`: deliberately untranscribed (no sheet/scoring bucket) with a
 *   dated reason. `appliedElsewhere` cites the per-character module that
 *   scores the rank instead (no warning emitted); plain notes warn with
 *   their reason so excluded mechanics stay visible.
 *
 * Partial ranks: a rank with a transcribed part carries no note for its
 * untranscribed riders. Damage-relevant exclusions (extra hits, DEF
 * riders, unscored motion targets) ride in the entry's `assumption`;
 * pure utility riders (energy, cooldown, interrupt, ammo, shields,
 * healing intake, crowd control) stay undisclosed.
 *
 * Coverage grows behind CHAIN_COVERAGE: the accounted test requires every
 * rank 1-6 of every listed character to carry ≥1 entry. Add characters
 * wave by wave; never list a character with unaccounted ranks.
 */

export interface ChainPresetMod {
  stat: StatKey;
  value: number;
}

interface ChainPresetBase {
  characterId: string;
  rank: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface ChainSheetPreset extends ChainPresetBase {
  scope: 'sheet';
  mods: ChainPresetMod[];
  /** Full-uptime/stack assumption. Always set when the transcription simplifies. */
  assumption?: string;
}

export interface ChainMotionPreset extends ChainPresetBase {
  scope: 'motion';
  skillKind?: SkillKind;
  /** Case-insensitive substring matched against the snapshot motion name. */
  motionNameIncludes?: string;
  /**
   * Provider per-hit damage type (Jingran S6 / Roccia S5 "Heavy Attack
   * DMG" wordings). Matches the motion's scored bucket, not its name.
   */
  dmgType?: MotionBonusKind;
  /** Multiplicative motion-value multiplier (1.95 = "+95% damage"). */
  motionMultiplier?: number;
  /** Skill-scoped crit extras (guaranteed crits store 1, clamped at the seam). */
  critRateExtra?: number;
  critDmgExtra?: number;
  /** Motion-scoped DEF ignore (Lupa S6, Changli S6...). Adds to sheet defIgnore. */
  defIgnoreExtra?: number;
  assumption?: string;
}

export interface ChainTeamPreset extends ChainPresetBase {
  scope: 'team';
  label: string;
  mods: ChainPresetMod[];
  assumption?: string;
  /** Quoted buff length in seconds (resolveTeamBuffs defaults the start to t=0). */
  windowSeconds?: number;
}

export interface ChainNotePreset extends ChainPresetBase {
  scope: 'note';
  reason: string;
  /**
   * Per-character module function that scores this rank (e.g.
   * 'zaniMotionMultiplier'). Set only when the mechanics ARE modeled —
   * `computeStats` stays silent; otherwise the reason warns.
   */
  appliedElsewhere?: string;
}

export type ChainPreset = ChainSheetPreset | ChainMotionPreset | ChainTeamPreset | ChainNotePreset;

/**
 * Characters whose chains are fully accounted (every rank 1-6 has ≥1
 * entry). Complete roster since Wave 4 — all 348 ranks accounted.
 */
export const CHAIN_COVERAGE: string[] = [
  'yangyang', 'chixia', 'verina', 'rover-spectro', 'sanhua', 'taoqi',
  'baizhi', 'encore', 'danjin', 'aalto', 'jiyan', 'mortefi', 'camellya',
  'calcharo', 'yinlin', 'lingyang', 'yuanwu', 'rover-havoc', 'jianxin',
  'jinhsi', 'xiangli-yao', 'changli', 'zhezhi', 'lumi', 'youhu',
  'shorekeeper', 'roccia', 'carlotta', 'brant', 'phoebe', 'rover-aero',
  'cantarella', 'ciaccona', 'zani', 'lupa', 'phrolova', 'cartethyia',
  'augusta', 'iuno', 'buling', 'galbrena', 'chisa', 'qiuyuan', 'lynae',
  'mornye', 'luuk-herssen', 'aemeath', 'sigrika', 'denia', 'rebecca',
  'lucilla', 'lucy', 'hiyuki', 'rover-electro', 'yangyang-xuanling',
  'suisui', 'qingxiao', 'jingran',
];

export const CHAIN_PRESETS: ChainPreset[] = [
  // --- Yangyang (Aero) ------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'yangyang',
    rank: 1,
    mods: [{ stat: 'dmgBonus:Aero', value: 0.15 }],
    assumption: 'Full uptime on the 8s window after Intro Skill Cerulean Song.',
  },
  {
    scope: 'note',
    characterId: 'yangyang',
    rank: 2,
    reason: 'Resonance Energy restore has no sheet bucket (2026-09-17).',
  },
  {
    scope: 'sheet',
    characterId: 'yangyang',
    rank: 3,
    mods: [{ stat: 'dmgBonus:skill', value: 0.4 }],
    assumption: 'Skill DMG +40% at full uptime; the Wind Field pull/range rider is crowd control with no bucket.',
  },
  {
    scope: 'motion',
    characterId: 'yangyang',
    rank: 4,
    skillKind: 'forte',
    motionNameIncludes: 'feather release',
    motionMultiplier: 1.95,
  },
  {
    scope: 'motion',
    characterId: 'yangyang',
    rank: 5,
    skillKind: 'liberation',
    motionMultiplier: 1.85,
  },
  {
    scope: 'sheet',
    characterId: 'yangyang',
    rank: 6,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: 'Full uptime on the 20s team ATK window after Feather Release (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'yangyang',
    rank: 6,
    label: 'Yangyang S6 (team ATK)',
    windowSeconds: 20,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Feather Release; teammates part.',
  },

  // --- Chixia (Fusion) ------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'chixia',
    rank: 1,
    motionNameIncludes: 'boom boom',
    critRateExtra: 1,
  },
  {
    scope: 'note',
    characterId: 'chixia',
    rank: 2,
    reason: 'Resonance Energy restore on kill has no sheet bucket (2026-09-17).',
  },
  {
    scope: 'motion',
    characterId: 'chixia',
    rank: 3,
    skillKind: 'liberation',
    motionMultiplier: 1.4,
    assumption: 'Target below 50% HP (gate-met; no enemy-HP input exists).',
  },
  {
    scope: 'note',
    characterId: 'chixia',
    rank: 4,
    reason: 'Thermobaric ammo grant + skill cooldown reset: ammo/cooldown economy, no bucket (2026-09-17).',
  },
  {
    scope: 'sheet',
    characterId: 'chixia',
    rank: 5,
    mods: [{ stat: 'atkPct', value: 0.3 }],
    assumption: 'Inherent Skill Numbingly Spicy! at max stacks.',
  },
  {
    scope: 'sheet',
    characterId: 'chixia',
    rank: 6,
    mods: [{ stat: 'dmgBonus:basic', value: 0.25 }],
    assumption: 'Full uptime on the 15s window after Boom Boom (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'chixia',
    rank: 6,
    label: 'Chixia S6 (team Basic DMG)',
    windowSeconds: 15,
    mods: [{ stat: 'dmgBonus:basic', value: 0.25 }],
    assumption: '15s window after Boom Boom; teammates part.',
  },

  // --- Jiyan (Aero) ---------------------------------------------------------
  {
    scope: 'note',
    characterId: 'jiyan',
    rank: 1,
    reason: 'Extra Windqueller charge + Resolve cost reduction: rotation/energy economy, no bucket (2026-09-17).',
  },
  {
    scope: 'sheet',
    characterId: 'jiyan',
    rank: 2,
    mods: [{ stat: 'atkPct', value: 0.28 }],
    assumption: 'Full uptime on the 15s post-Intro window (triggered 1/15s).',
  },
  {
    scope: 'sheet',
    characterId: 'jiyan',
    rank: 3,
    mods: [
      { stat: 'critRate', value: 0.16 },
      { stat: 'critDmg', value: 0.32 },
    ],
    assumption: 'Full uptime on the 8s window after casting skill/Liberation/Intro.',
  },
  {
    scope: 'sheet',
    characterId: 'jiyan',
    rank: 4,
    mods: [{ stat: 'dmgBonus:heavy', value: 0.25 }],
    assumption: 'Full uptime on the 30s window after Liberation (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'jiyan',
    rank: 4,
    label: 'Jiyan S4 (team Heavy DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'dmgBonus:heavy', value: 0.25 }],
    assumption: '30s window after Liberation; teammates part.',
  },
  {
    scope: 'sheet',
    characterId: 'jiyan',
    rank: 5,
    mods: [{ stat: 'atkPct', value: 0.45 }],
    assumption: 'On-hit ATK stacks (3% x 15) maxed after Intro Skill Tactical Strike.',
  },
  {
    scope: 'note',
    characterId: 'jiyan',
    rank: 5,
    reason: 'Outro Discipline +120% multiplier scored in jiyanOutroLanceSpec at S5+.',
    appliedElsewhere: 'jiyanOutroLanceSpec',
  },
  {
    scope: 'motion',
    characterId: 'jiyan',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'emerald storm: finale',
    motionMultiplier: 3.4,
    assumption: '2 Momentum stacks consumed (max; +120% multiplier each).',
  },

  // --- Zani (Spectro) -------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'zani',
    rank: 1,
    mods: [{ stat: 'dmgBonus:Spectro', value: 0.5 }],
    assumption: 'Full uptime on the 14s window after Targeted Action / Forcible Riposte.',
  },
  {
    scope: 'note',
    characterId: 'zani',
    rank: 1,
    reason: 'Nightfall uninterruptible rider: no bucket (2026-09-17).',
  },
  {
    scope: 'sheet',
    characterId: 'zani',
    rank: 2,
    mods: [{ stat: 'critRate', value: 0.2 }],
  },
  {
    scope: 'note',
    characterId: 'zani',
    rank: 2,
    reason: 'Targeted Action / Forcible Riposte +80% multiplier scored in zaniMotionMultiplier.',
    appliedElsewhere: 'zaniMotionMultiplier',
  },
  {
    scope: 'note',
    characterId: 'zani',
    rank: 3,
    reason: 'Last Stand per-Blaze scaling scored in zaniMotionMultiplier.',
    appliedElsewhere: 'zaniMotionMultiplier',
  },
  {
    scope: 'sheet',
    characterId: 'zani',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: 'Full uptime on the 30s team window after Intro (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'zani',
    rank: 4,
    label: 'Zani S4 (team ATK)',
    windowSeconds: 30,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '30s window after Intro; teammates part.',
  },
  {
    scope: 'note',
    characterId: 'zani',
    rank: 5,
    reason: 'Rekindle +120% multiplier scored in zaniMotionMultiplier.',
    appliedElsewhere: 'zaniMotionMultiplier',
  },
  {
    scope: 'note',
    characterId: 'zani',
    rank: 6,
    reason: 'Heavy Slash multipliers scored in zaniMotionMultiplier; Blaze-restore and survive clauses have no bucket.',
    appliedElsewhere: 'zaniMotionMultiplier',
  },

  // --- Wave 2: multiplier batch ---------------------------------------------
  // --- Augusta --------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'augusta',
    rank: 3,
    skillKind: 'basic',
    motionNameIncludes: 'thunderoar: backstep',
    motionMultiplier: 1.25,
  },
  {
    scope: 'motion',
    characterId: 'augusta',
    rank: 3,
    skillKind: 'basic',
    motionNameIncludes: 'thunderoar: spinslash',
    motionMultiplier: 1.25,
  },
  {
    scope: 'motion',
    characterId: 'augusta',
    rank: 3,
    skillKind: 'basic',
    motionNameIncludes: 'thunderoar: uppercut',
    motionMultiplier: 1.25,
  },
  {
    scope: 'motion',
    characterId: 'augusta',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'undying sunlight: plunge',
    motionMultiplier: 1.25,
  },
  {
    scope: 'motion',
    characterId: 'augusta',
    rank: 3,
    skillKind: 'liberation',
    motionNameIncludes: 'sunborne',
    motionMultiplier: 1.25,
  },
  {
    scope: 'motion',
    characterId: 'augusta',
    rank: 3,
    skillKind: 'liberation',
    motionNameIncludes: 'everbright protector',
    motionMultiplier: 1.25,
  },

  // --- Brant ----------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'brant',
    rank: 1,
    motionMultiplier: 1.6,
    assumption: '3 stacks of +20% DMG after Intro/flips (full stacks, additive, 5s window); stagnation rider excluded (crowd control).',
  },
  {
    scope: 'motion',
    characterId: 'brant',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'returned from ashes',
    motionMultiplier: 1.42,
  },
  {
    scope: 'motion',
    characterId: 'brant',
    rank: 6,
    skillKind: 'basic',
    motionNameIncludes: 'mid-air attack',
    motionMultiplier: 1.3,
    assumption: 'Secondary 30% blast unmodeled (extra hit, no mechanic).',
  },

  // --- Calcharo -------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'calcharo',
    rank: 5,
    skillKind: 'intro',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'calcharo',
    rank: 5,
    skillKind: 'liberation',
    motionNameIncludes: 'necessary means',
    motionMultiplier: 1.5,
  },

  // --- Camellya -------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'camellya',
    rank: 2,
    skillKind: 'forte',
    motionNameIncludes: 'ephemeral',
    motionMultiplier: 2.2,
  },
  {
    scope: 'motion',
    characterId: 'camellya',
    rank: 3,
    skillKind: 'liberation',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'camellya',
    rank: 5,
    skillKind: 'intro',
    motionMultiplier: 4.03,
    assumption: 'Outro Twining +68% scored in camellyaOutroTwiningSpec (base 329.24% only; primed +459.02% needs pre-outro Ephemeral state).',
  },

  // --- Cantarella -----------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'cantarella',
    rank: 1,
    skillKind: 'skill',
    motionNameIncludes: 'graceful step',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'cantarella',
    rank: 1,
    skillKind: 'skill',
    motionNameIncludes: 'flickering reverie',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'cantarella',
    rank: 1,
    skillKind: 'forte',
    motionNameIncludes: 'perception drain',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'cantarella',
    rank: 2,
    skillKind: 'skill',
    motionNameIncludes: 'jolt',
    motionMultiplier: 3.45,
  },
  {
    scope: 'motion',
    characterId: 'cantarella',
    rank: 3,
    skillKind: 'liberation',
    motionNameIncludes: 'flowing suffocation',
    motionMultiplier: 4.7,
  },
  {
    scope: 'motion',
    characterId: 'cantarella',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'phantom sting',
    motionMultiplier: 1.8,
  },

  // --- Carlotta -------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'carlotta',
    rank: 2,
    skillKind: 'liberation',
    motionNameIncludes: 'fatal finale',
    motionMultiplier: 2.26,
  },
  {
    scope: 'motion',
    characterId: 'carlotta',
    rank: 3,
    skillKind: 'skill',
    motionMultiplier: 1.93,
    assumption: 'Outro Kaleidoscope Sparks extra strike unmodeled (extra hit, no mechanic).',
  },
  {
    scope: 'motion',
    characterId: 'carlotta',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'imminent oblivion',
    motionMultiplier: 1.47,
  },
  {
    scope: 'motion',
    characterId: 'carlotta',
    rank: 6,
    skillKind: 'liberation',
    motionNameIncludes: 'death knell',
    motionMultiplier: 2.866,
  },

  // --- Danjin ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'danjin',
    rank: 2,
    motionMultiplier: 1.2,
    assumption: 'Trigger (hitting with Incinerating Will) assumed met at full uptime.',
  },

  // --- Denia ----------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'denia',
    rank: 2,
    skillKind: 'skill',
    motionNameIncludes: 'banish - breakdown form',
    motionMultiplier: 1.4,
  },
  {
    scope: 'motion',
    characterId: 'denia',
    rank: 3,
    skillKind: 'liberation',
    motionNameIncludes: 'final act - breakdown form',
    motionMultiplier: 1.8,
  },
  {
    scope: 'motion',
    characterId: 'denia',
    rank: 3,
    skillKind: 'basic',
    motionNameIncludes: 'basic attack - stagecraft form stage 4',
    motionMultiplier: 13,
    assumption: 'Max Dark Cores consumed; considered-Liberation rider unmodeled (no bucket override).',
  },
  {
    scope: 'motion',
    characterId: 'denia',
    rank: 3,
    skillKind: 'skill',
    motionNameIncludes: 'phantom bubble - stagecraft form',
    motionMultiplier: 13,
    assumption: 'Max Dark Cores consumed; considered-Liberation rider unmodeled (no bucket override).',
  },
  {
    scope: 'motion',
    characterId: 'denia',
    rank: 5,
    skillKind: 'liberation',
    motionNameIncludes: 'final act - stagecraft form',
    motionMultiplier: 2,
  },

  // --- Encore ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'encore',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'cloudy frenzy',
    motionMultiplier: 1.4,
  },
  {
    scope: 'motion',
    characterId: 'encore',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'cosmos rupture',
    motionMultiplier: 1.4,
  },

  // --- Galbrena -------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 3,
    skillKind: 'liberation',
    motionMultiplier: 2.3,
  },
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 5,
    skillKind: 'skill',
    motionNameIncludes: 'encroach',
    motionMultiplier: 2.5,
  },
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 5,
    skillKind: 'skill',
    motionNameIncludes: 'ascent of malice',
    motionMultiplier: 2.5,
  },
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'ravage',
    motionMultiplier: 2.5,
  },
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'seraphic execution',
    motionMultiplier: 1.6,
    assumption: 'While Eternal Hypostasis lasts; Purgatory Scourge unmodeled (no snapshot motion).',
  },
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'flamewing verdict',
    motionMultiplier: 1.6,
    assumption: 'While Eternal Hypostasis lasts.',
  },
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'hellsent barrage',
    motionMultiplier: 1.6,
    assumption: 'While Eternal Hypostasis lasts.',
  },
  {
    scope: 'note',
    characterId: 'galbrena',
    rank: 6,
    reason: 'Afterflame Fusion amp (+35% at max) in galbrenaSkillMods; x1.6 trio above.',
    appliedElsewhere: 'galbrenaSkillMods',
  },

  // --- Hiyuki ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'basic attack - foreclaimed self',
    motionMultiplier: 2.2,
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'heavy attack - foreclaimed self',
    motionMultiplier: 2.2,
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'mid-air attack - foreclaimed self',
    motionMultiplier: 2.2,
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'plunging attack - foreclaimed self',
    motionMultiplier: 2.2,
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'dodge counter - foreclaimed self',
    motionMultiplier: 2.2,
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 2,
    skillKind: 'forte',
    motionNameIncludes: 'basic attack - iai',
    motionMultiplier: 2.25,
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 3,
    skillKind: 'basic',
    motionNameIncludes: 'frost splinter: present self',
    motionMultiplier: 2.6,
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 3,
    skillKind: 'basic',
    motionNameIncludes: 'bitterfrost: foreclaimed self',
    motionMultiplier: 2.6,
    assumption: 'Glacio Bite +488% unmodeled (no Bite pipeline).',
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 5,
    skillKind: 'skill',
    motionMultiplier: 1.8,
  },

  // --- Iuno -----------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'iuno',
    rank: 3,
    motionNameIncludes: 'moonbow - basic attack',
    motionMultiplier: 1.65,
    assumption: 'While in Lunar Cycle; motion-scoped Amplify scores as a per-motion multiplier. Unscoped: also matches the forte Sentience-enhanced casts of the same attacks.',
  },
  {
    scope: 'motion',
    characterId: 'iuno',
    rank: 3,
    motionNameIncludes: 'arc beyond the edge',
    motionMultiplier: 1.65,
    assumption: 'While in Lunar Cycle; motion-scoped Amplify scores as a per-motion multiplier. Unscoped: also matches the forte Sentience-enhanced cast of the same attack.',
  },
  {
    scope: 'motion',
    characterId: 'iuno',
    rank: 3,
    motionNameIncludes: 'moonbow - dodge counter',
    motionMultiplier: 1.65,
    assumption: 'While in Lunar Cycle; motion-scoped Amplify scores as a per-motion multiplier. Unscoped: also matches the forte Sentience-enhanced cast of the same attack.',
  },
  {
    scope: 'motion',
    characterId: 'iuno',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'absolute fullness',
    motionMultiplier: 17,
  },

  // --- Jinhsi ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'jinhsi',
    rank: 1,
    skillKind: 'forte',
    motionNameIncludes: 'illuminous epiphany',
    motionMultiplier: 1.8,
    assumption: '4 Herald of Revival stacks consumed (max, additive).',
  },
  {
    scope: 'motion',
    characterId: 'jinhsi',
    rank: 5,
    skillKind: 'liberation',
    motionMultiplier: 2.2,
  },
  {
    scope: 'motion',
    characterId: 'jinhsi',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'illuminous epiphany',
    motionMultiplier: 1.45,
    assumption: 'Incandescence-consumption scaling unmodeled (no kit input).',
  },

  // --- Jingran --------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'jingran',
    rank: 1,
    skillKind: 'skill',
    motionMultiplier: 1.8,
  },
  {
    scope: 'motion',
    characterId: 'jingran',
    rank: 2,
    skillKind: 'forte',
    motionNameIncludes: 'soul raid',
    motionMultiplier: 1.46,
    assumption: 'Fire-of-Life +46% covered: the same 1.46 factor matches the per-HP bonus motion by substring; the per-HP stack count itself is unscored (no HP input).',
  },
  {
    scope: 'motion',
    characterId: 'jingran',
    rank: 2,
    skillKind: 'forte',
    motionNameIncludes: 'stardome meander',
    motionMultiplier: 1.46,
    assumption: 'Fire-of-Life +46% covered: the same 1.46 factor matches the per-HP bonus motion by substring; the per-HP stack count itself is unscored (no HP input).',
  },
  {
    scope: 'motion',
    characterId: 'jingran',
    rank: 2,
    skillKind: 'forte',
    motionNameIncludes: 'soul raid',
    motionMultiplier: 2.8,
    assumption: "Netherworld's Boon 180% amp at full uptime (first cast unbuffed in reality).",
  },
  {
    scope: 'motion',
    characterId: 'jingran',
    rank: 2,
    skillKind: 'forte',
    motionNameIncludes: 'stardome meander',
    motionMultiplier: 2.8,
    assumption: "Netherworld's Boon 180% amp at full uptime (first cast unbuffed in reality).",
  },
  {
    scope: 'motion',
    characterId: 'jingran',
    rank: 6,
    dmgType: 'heavy',
    motionMultiplier: 1.4,
  },
  {
    scope: 'motion',
    characterId: 'jingran',
    rank: 6,
    skillKind: 'liberation',
    motionNameIncludes: 'chimei wangliang',
    motionMultiplier: 1.8,
    assumption: 'Parade of Thousand Souls summons unmodeled (extra hits, no mechanic).',
  },

  // --- Lucilla --------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'lucilla',
    rank: 3,
    skillKind: 'liberation',
    motionNameIncludes: 'letting it go',
    motionMultiplier: 2,
  },
  {
    scope: 'motion',
    characterId: 'lucilla',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'oblivion',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'lucilla',
    rank: 6,
    skillKind: 'liberation',
    motionNameIncludes: 'letting it go',
    motionMultiplier: 7,
    assumption: '3 Remembrance stacks consumed (max, +200% each).',
  },

  // --- Lucy -----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'lucy',
    rank: 2,
    reason: 'SQL-gated Multithreading increase (270% to 560%) needs a kit-state module; 450% extra hit has no mechanic (2026-09-17).',
  },
  {
    scope: 'motion',
    characterId: 'lucy',
    rank: 3,
    skillKind: 'liberation',
    motionNameIncludes: 'override',
    motionMultiplier: 1.5,
    critDmgExtra: 1,
  },
  {
    scope: 'motion',
    characterId: 'lucy',
    rank: 3,
    skillKind: 'liberation',
    motionNameIncludes: 'cripple movement',
    motionMultiplier: 1.65,
  },
  {
    scope: 'motion',
    characterId: 'lucy',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'data crash',
    motionMultiplier: 1.65,
  },
  {
    scope: 'motion',
    characterId: 'lucy',
    rank: 6,
    dmgType: 'heavy',
    motionMultiplier: 1.4,
    assumption: 'Target Hack-Shifting/Interfered (gate-met).',
  },
  {
    scope: 'motion',
    characterId: 'lucy',
    rank: 6,
    skillKind: 'liberation',
    motionNameIncludes: 'cripple movement',
    motionMultiplier: 1.6,
    assumption: 'Target Hack-Shifting/Interfered (gate-met); one of two Hack-typed motions (with Data Crash).',
  },
  {
    scope: 'motion',
    characterId: 'lucy',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'data crash',
    motionMultiplier: 1.6,
    assumption: 'Target Hack-Shifting/Interfered (gate-met); one of two Hack-typed motions (with Cripple Movement).',
  },

  // --- Lumi -----------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'lumi',
    rank: 3,
    skillKind: 'liberation',
    motionMultiplier: 1.3,
  },
  {
    scope: 'motion',
    characterId: 'lumi',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'laser',
    motionMultiplier: 2,
    assumption: 'Spark fully recovered.',
  },

  // --- Lupa -----------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'lupa',
    rank: 3,
    skillKind: 'intro',
    motionNameIncludes: 'nowhere to run',
    motionMultiplier: 2,
    assumption: 'Pack Hunt/Glory riders unmodeled (team/mechanic).',
  },
  {
    scope: 'motion',
    characterId: 'lupa',
    rank: 4,
    skillKind: 'forte',
    motionNameIncludes: 'dance with the wolf: climax',
    motionMultiplier: 2.25,
  },
  {
    scope: 'motion',
    characterId: 'lupa',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'dance with the wolf: climax',
    defIgnoreExtra: 0.3,
    assumption: 'Rotation riders unmodeled (Wolflame, Climax replacement, Pack Hunt persistence).',
  },
  {
    scope: 'motion',
    characterId: 'lupa',
    rank: 6,
    skillKind: 'liberation',
    defIgnoreExtra: 0.3,
  },
  {
    scope: 'motion',
    characterId: 'lupa',
    rank: 6,
    skillKind: 'intro',
    motionNameIncludes: 'nowhere to run',
    defIgnoreExtra: 0.3,
  },

  // --- Luuk Herssen ---------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'luuk-herssen',
    rank: 2,
    skillKind: 'liberation',
    motionMultiplier: 1.6,
    assumption: 'Tune Break Boost amp rider unmodeled (Tune pipeline).',
  },
  {
    scope: 'motion',
    characterId: 'luuk-herssen',
    rank: 3,
    skillKind: 'skill',
    motionNameIncludes: 'aureole of execution',
    motionMultiplier: 2.36,
    assumption: 'In the Aureate Judge state.',
  },
  {
    scope: 'motion',
    characterId: 'luuk-herssen',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'gavel of earthshaker',
    motionMultiplier: 2.36,
    assumption: 'After casting Aureole of Execution: Glare.',
  },
  {
    scope: 'motion',
    characterId: 'luuk-herssen',
    rank: 3,
    skillKind: 'skill',
    motionNameIncludes: 'ichor deposit',
    motionMultiplier: 2.36,
    assumption: 'After casting Aureole of Execution: Glare.',
  },
  {
    scope: 'sheet',
    characterId: 'luuk-herssen',
    rank: 4,
    mods: [{ stat: 'amplify', value: 0.2 }],
    assumption: 'After a team Tune Break (20s window, unstackable; wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'luuk-herssen',
    rank: 4,
    label: 'Luuk Herssen S4 (team DMG)',
    mods: [{ stat: 'amplify', value: 0.2 }],
    assumption: 'After a team Tune Break; teammates part.',
  },
  {
    scope: 'motion',
    characterId: 'luuk-herssen',
    rank: 5,
    skillKind: 'skill',
    motionNameIncludes: 'golden reflux',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'luuk-herssen',
    rank: 6,
    skillKind: 'skill',
    motionNameIncludes: 'aureole of execution',
    motionMultiplier: 1.3,
    assumption: 'Nearby teammates dealt Tune Break DMG (trigger met), 25s window; Endnotes liberation +40% DMG Bonus/stack (max +120%) unmodeled (no skill-scoped additive bucket).',
  },
  {
    scope: 'motion',
    characterId: 'luuk-herssen',
    rank: 6,
    skillKind: 'skill',
    motionNameIncludes: 'ichor deposit',
    motionMultiplier: 1.3,
    assumption: 'Nearby teammates dealt Tune Break DMG (trigger met), 25s window.',
  },
  {
    scope: 'motion',
    characterId: 'luuk-herssen',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'gavel of earthshaker',
    motionMultiplier: 1.3,
    assumption: 'Nearby teammates dealt Tune Break DMG (trigger met), 25s window.',
  },

  // --- Mornye ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'mornye',
    rank: 5,
    skillKind: 'liberation',
    motionMultiplier: 1.4,
  },
  {
    scope: 'motion',
    characterId: 'mornye',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'particle jet',
    motionMultiplier: 2.6,
  },
  {
    scope: 'motion',
    characterId: 'mornye',
    rank: 6,
    skillKind: 'liberation',
    motionMultiplier: 5,
  },

  // --- Phrolova -------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'phrolova',
    rank: 1,
    skillKind: 'forte',
    motionNameIncludes: 'movement of fate and finality',
    motionMultiplier: 1.8,
  },
  {
    scope: 'motion',
    characterId: 'phrolova',
    rank: 1,
    skillKind: 'forte',
    motionNameIncludes: 'murmurs in a haunting dream',
    motionMultiplier: 1.8,
  },
  {
    scope: 'motion',
    characterId: 'phrolova',
    rank: 2,
    skillKind: 'basic',
    motionNameIncludes: 'scarlet coda',
    motionMultiplier: 2.5,
    assumption: 'Base +75% and Aftersound +75% stack additively; Aftersound active (granted on cast). Per-Aftersound bonus motion unmodified (unmodeled scaling).',
  },
  {
    scope: 'motion',
    characterId: 'phrolova',
    rank: 6,
    skillKind: 'liberation',
    motionNameIncludes: 'enhanced attack - hecate',
    motionMultiplier: 1.24,
    assumption: 'Apparition extra hit and off-field Hecate/Phrolova +40% unmodeled.',
  },

  // --- Phoebe ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'phoebe',
    rank: 1,
    reason: 'Mode-dependent Liberation buff magnitude (480%/255%/90%) needs a kit-state module (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'phoebe',
    rank: 3,
    reason: 'Mode-split Starflash values (91% Absolution / 249% Confession) need a mode input (2026-09-17).',
  },

  // --- Qiuyuan --------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'qiuyuan',
    rank: 3,
    skillKind: 'liberation',
    motionMultiplier: 6,
    assumption: 'Straw Cape / Sheath Fallen extra hits unmodeled (extra hits, no mechanic).',
  },
  {
    scope: 'motion',
    characterId: 'qiuyuan',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'to teach',
    motionMultiplier: 7,
    assumption: 'Unconditional reading (no trigger stated; Straw Cape riders separate).',
  },
  {
    scope: 'motion',
    characterId: 'qiuyuan',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'to save',
    motionMultiplier: 7,
    assumption: 'Unconditional reading (no trigger stated; Straw Cape riders separate).',
  },
  {
    scope: 'motion',
    characterId: 'qiuyuan',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'to sacrifice',
    motionMultiplier: 7,
    assumption: 'Unconditional reading (no trigger stated; Straw Cape riders separate).',
  },

  // --- Rebecca --------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'rebecca',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'basic attack - huntress',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'rebecca',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'heavy attack - huntress',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'rebecca',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'tactical dodge - huntress',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'rebecca',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'dodge counter - huntress',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'rebecca',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'basic attack - guts',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'rebecca',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'tactical dodge - guts',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'rebecca',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'dodge counter - guts',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'rebecca',
    rank: 3,
    skillKind: 'liberation',
    motionMultiplier: 1.6,
  },

  // --- Roccia ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'roccia',
    rank: 4,
    skillKind: 'forte',
    motionMultiplier: 1.6,
    assumption: '12s window after casting Resonance Skill Acrobatic Trick. Forte skill is the whole Real Fantasy Stage 1-3 cycle.',
  },
  {
    scope: 'motion',
    characterId: 'roccia',
    rank: 5,
    skillKind: 'liberation',
    motionMultiplier: 1.2,
  },
  {
    scope: 'motion',
    characterId: 'roccia',
    rank: 5,
    dmgType: 'heavy',
    motionMultiplier: 1.8,
  },

  // --- Rover: Aero ----------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'rover-aero',
    rank: 5,
    skillKind: 'liberation',
    motionMultiplier: 1.2,
  },
  {
    scope: 'motion',
    characterId: 'rover-aero',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'unbound flow',
    motionMultiplier: 1.3,
  },

  // --- Rover: Electro ---------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'rover-electro',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'overshock',
    motionMultiplier: 1.2,
  },
  {
    scope: 'motion',
    characterId: 'rover-electro',
    rank: 4,
    skillKind: 'liberation',
    motionMultiplier: 1.2,
  },
  {
    scope: 'motion',
    characterId: 'rover-electro',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'thrum of all sounds',
    motionMultiplier: 1.2,
  },
  {
    scope: 'motion',
    characterId: 'rover-electro',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'thunder bane',
    motionMultiplier: 1.2,
  },

  // --- Sanhua ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'sanhua',
    rank: 3,
    motionMultiplier: 1.35,
    assumption: 'Target below 70% HP (gate-met; no enemy-HP input exists).',
  },
  {
    scope: 'motion',
    characterId: 'sanhua',
    rank: 4,
    skillKind: 'forte',
    motionNameIncludes: 'detonate',
    motionMultiplier: 2.2,
    assumption: 'Next Detonate within 5s after Liberation.',
  },

  // --- Shorekeeper ----------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'shorekeeper',
    rank: 6,
    skillKind: 'intro',
    motionNameIncludes: 'discernment',
    motionMultiplier: 1.42,
  },

  // --- Sigrika --------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'basic attack - elucidated',
    motionMultiplier: 1.7,
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'dodge counter - decipher',
    motionMultiplier: 1.7,
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 1,
    skillKind: 'skill',
    motionNameIncludes: 'big boomy boom!',
    motionMultiplier: 1.7,
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 1,
    skillKind: 'skill',
    motionNameIncludes: 'soliskin to the aid',
    motionMultiplier: 1.7,
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 2,
    skillKind: 'forte',
    motionNameIncludes: 'learn my true name',
    motionMultiplier: 2.2,
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 5,
    skillKind: 'liberation',
    motionMultiplier: 1.3,
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 6,
    motionMultiplier: 1.3,
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'runic outburst',
    motionMultiplier: 1.6,
    defIgnoreExtra: 0.3,
    assumption: '4 Innate Gift stacks: +60% amp and 30% DEF ignore (max).',
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'runic chain whip',
    motionMultiplier: 1.6,
    defIgnoreExtra: 0.3,
    assumption: '4 Innate Gift stacks: +60% amp and 30% DEF ignore (max).',
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'runic soliskin',
    motionMultiplier: 1.6,
    defIgnoreExtra: 0.3,
    assumption: '4 Innate Gift stacks: +60% amp and 30% DEF ignore (max).',
  },
  {
    scope: 'motion',
    characterId: 'sigrika',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'learn my true name',
    motionMultiplier: 1.6,
    defIgnoreExtra: 0.3,
    assumption: '4 Innate Gift stacks: +60% amp and 30% DEF ignore (max).',
  },

  // --- Suisui ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'suisui',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'basic attack - drizzle stance',
    motionMultiplier: 2,
    assumption: 'Heavy Attack - Drizzle Stance unmodeled (no snapshot motion).',
  },

  // --- Verina ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'verina',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'heavy attack: starflower blooms',
    motionMultiplier: 1.2,
    assumption: 'Triggered Coordinated Attack + heal unmodeled (extra hit, equals Photosynthesis Mark).',
  },
  {
    scope: 'motion',
    characterId: 'verina',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'mid-air attack: starflower blooms',
    motionMultiplier: 1.2,
  },

  // --- Xiangli Yao ----------------------------------------------------------
  {
    scope: 'note',
    characterId: 'xiangli-yao',
    rank: 1,
    reason: 'Convolution Matrices are extra hits with no mechanic (2026-09-17).',
  },
  {
    scope: 'motion',
    characterId: 'xiangli-yao',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'decipher',
    motionMultiplier: 1.63,
    assumption: 'Within 24s after Liberation.',
  },
  {
    scope: 'motion',
    characterId: 'xiangli-yao',
    rank: 3,
    skillKind: 'skill',
    motionMultiplier: 1.63,
    assumption: 'Within 24s after Liberation (Deduction is the skill itself).',
  },
  {
    scope: 'motion',
    characterId: 'xiangli-yao',
    rank: 3,
    skillKind: 'liberation',
    motionNameIncludes: 'divergence',
    motionMultiplier: 1.63,
    assumption: 'Within 24s after Liberation.',
  },
  {
    scope: 'motion',
    characterId: 'xiangli-yao',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'law of reigns',
    motionMultiplier: 1.63,
    assumption: 'Within 24s after Liberation.',
  },
  {
    scope: 'motion',
    characterId: 'xiangli-yao',
    rank: 5,
    skillKind: 'liberation',
    motionMultiplier: 2,
    assumption: 'Outro Chain Rule +222% scored in xiangliyaoOutroChainRuleSpec (base 237.63%, one block per trigger, up to 3; incoming-basic trigger timing is user-arranged).',
  },
  {
    scope: 'motion',
    characterId: 'xiangli-yao',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'law of reigns',
    motionMultiplier: 1.76,
  },

  // --- Yinlin ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'yinlin',
    rank: 1,
    skillKind: 'skill',
    motionNameIncludes: 'magnetic roar',
    motionMultiplier: 1.7,
  },
  {
    scope: 'motion',
    characterId: 'yinlin',
    rank: 1,
    skillKind: 'skill',
    motionNameIncludes: 'lightning execution',
    motionMultiplier: 1.7,
  },
  {
    scope: 'motion',
    characterId: 'yinlin',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'judgment strike',
    motionMultiplier: 1.55,
  },
  {
    scope: 'motion',
    characterId: 'yinlin',
    rank: 5,
    skillKind: 'liberation',
    motionMultiplier: 2,
    assumption: "Target has Sinner's/Punishment Mark (gate-met).",
  },

  // --- Lynae ----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'lynae',
    rank: 1,
    reason: 'Polychrome Leap has no snapshot motion (2026-09-17).',
  },
  {
    scope: 'motion',
    characterId: 'lynae',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'visual impact',
    motionMultiplier: 1.9,
    assumption: 'Premixed Hue scored in lynaeSkillMods at 25 stacks (+1375% Spectro bonus to Additive Color only; stacks are removed when Additive Color ends).',
  },
  {
    scope: 'motion',
    characterId: 'lynae',
    rank: 3,
    skillKind: 'forte',
    motionNameIncludes: 'iridescent splash',
    motionMultiplier: 1.9,
  },
  {
    scope: 'motion',
    characterId: 'lynae',
    rank: 5,
    skillKind: 'liberation',
    motionNameIncludes: 'prismatic overblast',
    motionMultiplier: 1.7,
  },
  {
    scope: 'motion',
    characterId: 'lynae',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'visual impact',
    motionMultiplier: 1.9,
    assumption: '3 Color of Soul stacks consumed (max, +30% each).',
  },
  {
    scope: 'motion',
    characterId: 'lynae',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'iridescent splash',
    motionMultiplier: 1.9,
    assumption: '3 Color of Soul stacks consumed (max, +30% each).',
  },

  // --- Qingxiao -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'qingxiao',
    rank: 1,
    mods: [{ stat: 'critRate', value: 0.16 }],
    assumption: 'Juque Perdition extra-hit riders unmodeled (400% Aero hit, considered Basic, once per second; +4% per removed Exorcising Seal unmodeled).',
  },
  {
    scope: 'motion',
    characterId: 'qingxiao',
    rank: 2,
    skillKind: 'basic',
    motionNameIncludes: 'heavy attack - stringblade',
    motionMultiplier: 1.4,
  },
  {
    scope: 'motion',
    characterId: 'qingxiao',
    rank: 3,
    skillKind: 'liberation',
    critDmgExtra: 1,
    assumption: 'World in Chorus Heaven’s Reckoning scaling unmodeled (needs a Mindlock-stack input); Gathered Mind extra Tune Strain stack unmodeled.',
  },
  {
    scope: 'motion',
    characterId: 'qingxiao',
    rank: 5,
    skillKind: 'skill',
    motionNameIncludes: 'severing note: judgement',
    motionMultiplier: 2,
  },
  {
    scope: 'motion',
    characterId: 'qingxiao',
    rank: 6,
    skillKind: 'basic',
    motionNameIncludes: 'heavy attack - stringblade',
    motionMultiplier: 1.4,
  },
  {
    scope: 'motion',
    characterId: 'qingxiao',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: "heaven's reckoning",
    motionMultiplier: 1.4,
    assumption: 'Juque Perdition + Mindlock-scaled Juque riders unmodeled (extra-hit mechanic); +20% Tune Strain response unmodeled (no relative-boost mechanic).',
  },
  {
    scope: 'motion',
    characterId: 'qingxiao',
    rank: 6,
    skillKind: 'liberation',
    motionMultiplier: 1.4,
  },

  // --- Wave 3: sheet batch --------------------------------------------------
  // --- Aalto ----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'aalto',
    rank: 2,
    mods: [{ stat: 'atkPct', value: 0.15 }],
    assumption: 'Target taunted by Mist Avatar (gate-met).',
  },
  {
    scope: 'motion',
    characterId: 'aalto',
    rank: 4,
    skillKind: 'skill',
    motionNameIncludes: 'mist bullet',
    motionMultiplier: 1.3,
  },
  {
    scope: 'motion',
    characterId: 'aalto',
    rank: 4,
    skillKind: 'forte',
    motionNameIncludes: 'mist bullet',
    motionMultiplier: 1.3,
  },
  {
    scope: 'sheet',
    characterId: 'aalto',
    rank: 5,
    mods: [{ stat: 'dmgBonus:Aero', value: 0.25 }],
    assumption: '6s window in Mistcloak Dash state.',
  },
  {
    scope: 'sheet',
    characterId: 'aalto',
    rank: 6,
    mods: [{ stat: 'critRate', value: 0.08 }],
    assumption: 'During Liberation Flower in the Mist; base Gate buff unmodeled (+10% ATK per the Fandom Aalto/Combat table — transient bullet gate, no bullet-scoped base-buff input).',
  },
  {
    scope: 'motion',
    characterId: 'aalto',
    rank: 6,
    skillKind: 'basic',
    motionNameIncludes: 'aimed shot',
    motionMultiplier: 1.5,
    assumption: 'Passing through the Gate of Quandary (gate-met).',
  },

  // --- Augusta --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'augusta',
    rank: 1,
    mods: [{ stat: 'critDmg', value: 0.3 }],
    assumption: '2 Crown of Wills stacks (max).',
  },
  {
    scope: 'sheet',
    characterId: 'augusta',
    rank: 2,
    mods: [{ stat: 'critRate', value: 0.4 }],
    assumption: '2 Crown of Wills stacks (max); over-100% overflow unmodeled (needs computed-rate logic: +2% CDMG per 1% crit over 100%, cap +100%).',
  },
  {
    scope: 'sheet',
    characterId: 'augusta',
    rank: 6,
    mods: [
      { stat: 'critDmg', value: 0.3 },
      { stat: 'critRate', value: 0.4 },
    ],
    assumption: 'Crown stacks 3-4 (cap raised to 4); over-150% overflow unmodeled (additive S6 tier per wutheringlab S6 gloss: +2% CDMG per 1% crit over 150%, cap +50%) and Thunder Rage extra hits unmodeled.',
  },

  // --- Baizhi ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'baizhi',
    rank: 2,
    mods: [
      { stat: 'dmgBonus:Glacio', value: 0.15 },
      { stat: 'healingBonus', value: 0.15 },
    ],
    assumption: '4 Concentration (gate-met), 12s window.',
  },
  {
    scope: 'sheet',
    characterId: 'baizhi',
    rank: 3,
    mods: [{ stat: 'hpPct', value: 0.12 }],
    assumption: '10s window after Intro.',
  },

  // --- Brant ----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'brant',
    rank: 2,
    mods: [{ stat: 'critRate', value: 0.3 }],
    assumption: 'After Mid-air Attack / Returned from Ashes (no window stated); outro blast unmodeled (extra hit).',
  },
  {
    scope: 'sheet',
    characterId: 'brant',
    rank: 5,
    mods: [{ stat: 'dmgBonus:basic', value: 0.15 }],
    assumption: '10s window after dealing Basic Attack DMG.',
  },

  // --- Buling ---------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'buling',
    rank: 1,
    skillKind: 'forte',
    motionNameIncludes: 'flashing thunder spell - harmony',
    critRateExtra: 0.2,
  },
  {
    scope: 'sheet',
    characterId: 'buling',
    rank: 4,
    mods: [{ stat: 'healingBonus', value: 0.2 }],
  },

  // --- Calcharo -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'calcharo',
    rank: 2,
    mods: [{ stat: 'dmgBonus:skill', value: 0.3 }],
    assumption: '15s window after Intro.',
  },
  {
    scope: 'sheet',
    characterId: 'calcharo',
    rank: 3,
    mods: [{ stat: 'dmgBonus:Electro', value: 0.25 }],
    assumption: 'During Deathblade Gear state.',
  },

  // --- Camellya -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'camellya',
    rank: 1,
    mods: [{ stat: 'critDmg', value: 0.28 }],
    assumption: '18s window after Intro (triggered 1/25s).',
  },
  {
    scope: 'sheet',
    characterId: 'camellya',
    rank: 3,
    mods: [{ stat: 'atkPct', value: 0.58 }],
    assumption: 'While in Budding Mode.',
  },

  // --- Cantarella -----------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'cantarella',
    rank: 4,
    mods: [{ stat: 'healingBonus', value: 0.25 }],
    assumption: 'While in Mirage.',
  },
  {
    scope: 'sheet',
    characterId: 'cantarella',
    rank: 6,
    mods: [{ stat: 'defIgnore', value: 0.3 }],
    assumption: '10s window after Liberation. Hazy Dream Jolt-suppression rider unmodeled (no trigger system).',
  },

  // --- Carlotta -------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'carlotta',
    rank: 1,
    critRateExtra: 0.125,
    assumption: 'Target inflicted with Deconstruction (gate-met).',
  },

  // --- Cartethyia -----------------------------------------------------------
  {
    scope: 'note',
    characterId: 'cartethyia',
    rank: 1,
    reason: 'Conviction Crit DMG in cartethyiaConvictionCritDmg; Zeal stack-spread unmodeled.',
    appliedElsewhere: 'cartethyiaConvictionCritDmg',
  },
  {
    scope: 'sheet',
    characterId: 'cartethyia',
    rank: 4,
    mods: [
      { stat: 'dmgBonus:Glacio', value: 0.2 },
      { stat: 'dmgBonus:Fusion', value: 0.2 },
      { stat: 'dmgBonus:Electro', value: 0.2 },
      { stat: 'dmgBonus:Aero', value: 0.2 },
      { stat: 'dmgBonus:Spectro', value: 0.2 },
      { stat: 'dmgBonus:Havoc', value: 0.2 },
    ],
    assumption: 'Full uptime on the 20s window after a team status inflict (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'cartethyia',
    rank: 4,
    label: 'Cartethyia S4 (team all-attribute DMG)',
    windowSeconds: 20,
    mods: [
      { stat: 'dmgBonus:Glacio', value: 0.2 },
      { stat: 'dmgBonus:Fusion', value: 0.2 },
      { stat: 'dmgBonus:Electro', value: 0.2 },
      { stat: 'dmgBonus:Aero', value: 0.2 },
      { stat: 'dmgBonus:Spectro', value: 0.2 },
      { stat: 'dmgBonus:Havoc', value: 0.2 },
    ],
    assumption: 'After any team Resonator inflicts a Negative Status, 20s window; teammates part.',
  },

  // --- Changli --------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'changli',
    rank: 1,
    motionMultiplier: 1.1,
    assumption: 'After using Tripartite Flames / Flaming Sacrifice (trigger assumed met; no window stated).',
  },
  {
    scope: 'sheet',
    characterId: 'changli',
    rank: 2,
    mods: [{ stat: 'critRate', value: 0.25 }],
    assumption: '8s Enflamement window.',
  },
  {
    scope: 'motion',
    characterId: 'changli',
    rank: 3,
    skillKind: 'liberation',
    motionMultiplier: 1.8,
  },
  {
    scope: 'motion',
    characterId: 'changli',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'flaming sacrifice',
    motionMultiplier: 2.25,
    assumption: 'Multiplier +50% and DMG dealt +50% are distinct factors (cf. S1 damage-stage wording) — multiplicative.',
  },
  {
    scope: 'motion',
    characterId: 'changli',
    rank: 6,
    skillKind: 'skill',
    defIgnoreExtra: 0.4,
  },
  {
    scope: 'motion',
    characterId: 'changli',
    rank: 6,
    skillKind: 'forte',
    motionNameIncludes: 'flaming sacrifice',
    defIgnoreExtra: 0.4,
  },
  {
    scope: 'motion',
    characterId: 'changli',
    rank: 6,
    skillKind: 'liberation',
    defIgnoreExtra: 0.4,
  },

  // --- Chisa ----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'chisa',
    rank: 1,
    mods: [{ stat: 'atkPct', value: 0.3 }],
    assumption: '15s window after inflicting Unseen Snare; fixed 61803 Havoc DMG unmodeled (bonus-ignoring fixed damage).',
  },
  {
    scope: 'sheet',
    characterId: 'chisa',
    rank: 2,
    mods: [{ stat: 'resistancePenetration', value: -0.1 }],
    assumption: '10% Havoc RES shred scored sheet-wide (penetration is element-agnostic).',
  },
  {
    scope: 'note',
    characterId: 'chisa',
    rank: 2,
    reason: "Teammates' 50% All-Attribute Bonus (Thread of Bane holders) needs per-recipient attributes (2026-09-18).",
  },
  {
    scope: 'note',
    characterId: 'chisa',
    rank: 5,
    reason: 'Liberation +100% DMG Bonus in chisaSkillMods.',
    appliedElsewhere: 'chisaSkillMods',
  },
  {
    scope: 'note',
    characterId: 'chisa',
    rank: 6,
    reason: 'Finality amps are manual rotation buffs (+0.30 status / +0.40 attacker); survive clause has no bucket (2026-09-17).',
  },

  // --- Ciaccona -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'ciaccona',
    rank: 1,
    mods: [{ stat: 'atkPct', value: 0.35 }],
    assumption: '10s window after Basic Attack.',
  },
  {
    scope: 'motion',
    characterId: 'ciaccona',
    rank: 4,
    skillKind: 'forte',
    motionNameIncludes: 'quadruple downbeat',
    defIgnoreExtra: 0.45,
  },
  {
    scope: 'motion',
    characterId: 'ciaccona',
    rank: 4,
    dmgType: 'liberation',
    defIgnoreExtra: 0.45,
  },
  {
    scope: 'sheet',
    characterId: 'ciaccona',
    rank: 5,
    mods: [{ stat: 'dmgBonus:liberation', value: 0.4 }],
  },
  {
    scope: 'note',
    characterId: 'ciaccona',
    rank: 6,
    reason: 'Ensemble Sylph extra hit has no mechanic (2026-09-17).',
  },

  // --- Danjin ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'danjin',
    rank: 1,
    mods: [{ stat: 'atkPct', value: 0.3 }],
    assumption: '6 stacks (max, 6s window); stacks lost when damaged.',
  },
  {
    scope: 'sheet',
    characterId: 'danjin',
    rank: 3,
    mods: [{ stat: 'dmgBonus:liberation', value: 0.3 }],
  },
  {
    scope: 'sheet',
    characterId: 'danjin',
    rank: 4,
    mods: [{ stat: 'critRate', value: 0.15 }],
    assumption: 'More than 60 Ruby Blossom (gate-met).',
  },
  {
    scope: 'sheet',
    characterId: 'danjin',
    rank: 5,
    mods: [{ stat: 'dmgBonus:Havoc', value: 0.3 }],
    assumption: 'HP below 60% (gate-met; base +15% unconditional).',
  },

  // --- Denia ----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'denia',
    rank: 1,
    mods: [{ stat: 'critDmg', value: 0.3 }],
  },
  {
    scope: 'sheet',
    characterId: 'denia',
    rank: 2,
    mods: [{ stat: 'resistancePenetration', value: -0.1 }],
    assumption: '10 Degenerate Voidmatter stacks (max); Fusion RES shred scored sheet-wide (penetration is element-agnostic).',
  },
  {
    scope: 'sheet',
    characterId: 'denia',
    rank: 6,
    mods: [
      { stat: 'atkPct', value: 0.6 },
      { stat: 'dmgBonus:Fusion', value: 0.6 },
    ],
    assumption: 'Full uptime while in Entropy Shift states; Fusion Burst / Tune Strain riders unmodeled (Tune pipeline).',
  },

  // --- Encore ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'encore',
    rank: 1,
    mods: [{ stat: 'dmgBonus:Fusion', value: 0.12 }],
    assumption: '4 stacks (max), 6s window.',
  },
  {
    scope: 'sheet',
    characterId: 'encore',
    rank: 5,
    mods: [{ stat: 'dmgBonus:skill', value: 0.35 }],
  },
  {
    scope: 'sheet',
    characterId: 'encore',
    rank: 6,
    mods: [{ stat: 'atkPct', value: 0.25 }],
    assumption: '5 Lost Lamb stacks (max), 10s window during Liberation.',
  },

  // --- Galbrena -------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 1,
    skillKind: 'forte',
    motionNameIncludes: 'seraphic execution',
    critDmgExtra: 0.8,
    assumption: 'Afterflame maxed (80% cap); Purgatory Scourge unmodeled (no snapshot motion).',
  },
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 1,
    skillKind: 'forte',
    motionNameIncludes: 'flamewing verdict',
    critDmgExtra: 0.8,
    assumption: 'Afterflame maxed (80% cap).',
  },
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 1,
    skillKind: 'forte',
    motionNameIncludes: 'hellsent barrage',
    critDmgExtra: 0.8,
    assumption: 'Afterflame maxed (80% cap).',
  },
  {
    scope: 'motion',
    characterId: 'galbrena',
    rank: 1,
    skillKind: 'forte',
    motionNameIncludes: 'ravage',
    critDmgExtra: 0.8,
    assumption: 'Afterflame maxed (80% cap).',
  },
  {
    scope: 'note',
    characterId: 'galbrena',
    rank: 2,
    reason: 'Burning Drive buff magnitude unmodeled (unmodeled 20% ATK / 4s manual base; S2 raises it to 90%).',
  },

  // --- Iuno -----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'iuno',
    rank: 1,
    mods: [{ stat: 'atkPct', value: 0.4 }],
    assumption: 'While in Lunar Cycle.',
  },
  {
    scope: 'sheet',
    characterId: 'iuno',
    rank: 5,
    mods: [{ stat: 'dmgBonus:liberation', value: 0.2 }],
  },

  // --- Jianxin --------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'jianxin',
    rank: 6,
    reason: 'Special Chi Counter extra hit has no mechanic (2026-09-17).',
  },

  // --- Jinhsi ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'jinhsi',
    rank: 3,
    mods: [{ stat: 'atkPct', value: 0.5 }],
    assumption: "2 Immortal's Descendancy stacks (max), 20s window.",
  },

  // --- Jingran --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'jingran',
    rank: 3,
    mods: [{ stat: 'atk', value: 2500 }],
    assumption: 'Yin-Yang Everflow active (15s after Liberation); Max HP >= 50k for full +2500; replaces the unmodeled base Yang Changes, Yin Unites (+36 ATK per 1k HP, cap +1800).',
  },

  // --- Lingyang -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'lingyang',
    rank: 3,
    mods: [
      { stat: 'dmgBonus:basic', value: 0.2 },
      { stat: 'dmgBonus:skill', value: 0.1 },
    ],
    assumption: 'During Liberation Lion’s Vigor.',
  },
  {
    scope: 'note',
    characterId: 'lingyang',
    rank: 5,
    reason: 'Strive bonus hit has no mechanic (2026-09-17).',
  },
  {
    scope: 'sheet',
    characterId: 'lingyang',
    rank: 6,
    mods: [{ stat: 'dmgBonus:basic', value: 1 }],
    assumption: 'Next Basic Attack within 3s after Mountain Roamer in Striding Lion (assumed active).',
  },

  // --- Lynae ----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'lynae',
    rank: 2,
    mods: [{ stat: 'amplify', value: 0.25 }],
  },
  {
    scope: 'team',
    characterId: 'lynae',
    rank: 2,
    label: 'Lynae S2 (team all-DMG amp)',
    windowSeconds: 14,
    mods: [{ stat: 'amplify', value: 0.25 }],
    assumption: 'Outro additionally grants the incoming Resonator 25% All DMG Amp for 14s; teammates part.',
  },
  {
    scope: 'sheet',
    characterId: 'lynae',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
  },

  // --- Lucilla --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'lucilla',
    rank: 1,
    mods: [{ stat: 'critRate', value: 0.2 }],
    assumption: '10s window after Spotlight.',
  },
  {
    scope: 'sheet',
    characterId: 'lucilla',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.3 }],
    assumption: '3 Oblivion stacks (max), 6s window.',
  },

  // --- Lumi -----------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'lumi',
    rank: 2,
    skillKind: 'forte',
    motionNameIncludes: 'energized pounce',
    defIgnoreExtra: 0.2,
  },
  {
    scope: 'motion',
    characterId: 'lumi',
    rank: 2,
    skillKind: 'forte',
    motionNameIncludes: 'energized rebound',
    defIgnoreExtra: 0.2,
  },
  {
    scope: 'sheet',
    characterId: 'lumi',
    rank: 4,
    mods: [{ stat: 'dmgBonus:basic', value: 0.3 }],
  },

  // --- Lupa -----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'lupa',
    rank: 1,
    mods: [{ stat: 'critRate', value: 0.2 }],
    assumption: '10s window after Liberation.',
  },
  {
    scope: 'sheet',
    characterId: 'lupa',
    rank: 5,
    mods: [{ stat: 'dmgBonus:liberation', value: 0.15 }],
    assumption: '10s window after Intro.',
  },

  // --- Luuk Herssen ---------------------------------------------------------
  {
    scope: 'note',
    characterId: 'luuk-herssen',
    rank: 1,
    reason: 'Mid-air Attack DMG Bonus has no bucket (2026-09-17).',
  },
  {
    scope: 'sheet',
    characterId: 'luuk-herssen',
    rank: 5,
    mods: [
      { stat: 'dmgBonus:intro', value: 0.8 },
      { stat: 'dmgBonus:outro', value: 0.8 },
    ],
  },

  // --- Mortefi --------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'mortefi',
    rank: 3,
    skillKind: 'liberation',
    motionNameIncludes: 'marcato',
    critDmgExtra: 0.3,
    assumption: 'During Liberation Burning Rhapsody.',
  },

  // --- Phrolova -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'phrolova',
    rank: 3,
    mods: [{ stat: 'dmgBonus:echo', value: 0.8 }],
  },
  {
    scope: 'sheet',
    characterId: 'phrolova',
    rank: 6,
    mods: [{ stat: 'dmgBonus:Havoc', value: 0.6 }],
    assumption: 'Active Resonator during Maestro state.',
  },

  // --- Phoebe ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'phoebe',
    rank: 2,
    mods: [{ stat: 'negativeStatusAmplify', value: 1.2 }],
    assumption: 'Confession state (Silent Prayer); covers Phoebe herself — teammates use the S2 team entry. Outro Absolution amp unmodeled (outro has no scored motions).',
  },
  {
    scope: 'sheet',
    characterId: 'phoebe',
    rank: 4,
    mods: [{ stat: 'resistancePenetration', value: -0.1 }],
    assumption: '30s window on hit; Spectro RES shred scored sheet-wide (penetration is element-agnostic).',
  },
  {
    scope: 'sheet',
    characterId: 'phoebe',
    rank: 5,
    mods: [{ stat: 'dmgBonus:Spectro', value: 0.12 }],
    assumption: '15s window after Intro.',
  },
  {
    scope: 'sheet',
    characterId: 'phoebe',
    rank: 6,
    mods: [{ stat: 'atkPct', value: 0.1 }],
    assumption: '20s window after summoning Ring of Mirrors; extra Starflash unmodeled (extra hit).',
  },

  // --- Qiuyuan --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'qiuyuan',
    rank: 1,
    mods: [{ stat: 'critRate', value: 0.2 }],
  },
  {
    scope: 'sheet',
    characterId: 'qiuyuan',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
  },
  {
    scope: 'sheet',
    characterId: 'qiuyuan',
    rank: 5,
    mods: [{ stat: 'defIgnore', value: 0.15 }],
  },
  {
    scope: 'sheet',
    characterId: 'qiuyuan',
    rank: 6,
    mods: [{ stat: 'critDmg', value: 1 }],
    assumption: '6s window after Straw Cape (ends early on switch); 600% exit-Inksplash extra hit unmodeled (extra hit, no mechanic).',
  },

  // --- Rebecca --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'rebecca',
    rank: 5,
    mods: [{ stat: 'dmgBonus:basic', value: 0.2 }],
    assumption: '8s window after inflicting Hack - Shifting.',
  },
  {
    scope: 'note',
    characterId: 'rebecca',
    rank: 6,
    reason: 'Bucket-wide basic scaling needs a bucket-scale mechanic; 900% extra hit has no mechanic (2026-09-17).',
  },

  // --- Roccia ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'roccia',
    rank: 3,
    mods: [
      { stat: 'critRate', value: 0.1 },
      { stat: 'critDmg', value: 0.3 },
    ],
    assumption: '15s window after Intro.',
  },

  // --- Rover: Aero ----------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'rover-aero',
    rank: 3,
    mods: [{ stat: 'dmgBonus:Aero', value: 0.15 }],
  },
  {
    scope: 'sheet',
    characterId: 'rover-aero',
    rank: 4,
    mods: [{ stat: 'dmgBonus:skill', value: 0.15 }],
    assumption: '5s window after Cloudburst Dance.',
  },

  // --- Rover: Havoc ---------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'rover-havoc',
    rank: 1,
    mods: [{ stat: 'dmgBonus:skill', value: 0.3 }],
  },
  {
    scope: 'sheet',
    characterId: 'rover-havoc',
    rank: 4,
    mods: [{ stat: 'resistancePenetration', value: -0.1 }],
    assumption: '20s window on hit; Havoc RES shred scored sheet-wide (penetration is element-agnostic).',
  },
  {
    scope: 'sheet',
    characterId: 'rover-havoc',
    rank: 6,
    mods: [{ stat: 'critRate', value: 0.25 }],
    assumption: 'While in Dark Surge state.',
  },

  // --- Rover: Spectro -------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'rover-spectro',
    rank: 1,
    mods: [{ stat: 'critRate', value: 0.15 }],
    assumption: '7s window after Resonating Slashes / Spin.',
  },
  {
    scope: 'sheet',
    characterId: 'rover-spectro',
    rank: 2,
    mods: [{ stat: 'dmgBonus:Spectro', value: 0.2 }],
  },
  {
    scope: 'sheet',
    characterId: 'rover-spectro',
    rank: 3,
    mods: [{ stat: 'energyRegen', value: 0.2 }],
  },
  {
    scope: 'sheet',
    characterId: 'rover-spectro',
    rank: 5,
    mods: [{ stat: 'dmgBonus:liberation', value: 0.4 }],
  },
  {
    scope: 'sheet',
    characterId: 'rover-spectro',
    rank: 6,
    mods: [{ stat: 'resistancePenetration', value: -0.1 }],
    assumption: '20s window on hit; Spectro RES shred scored sheet-wide (penetration is element-agnostic).',
  },

  // --- Sanhua ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'sanhua',
    rank: 1,
    mods: [{ stat: 'critRate', value: 0.15 }],
    assumption: '10s window after Basic Attack V.',
  },
  {
    scope: 'motion',
    characterId: 'sanhua',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'glacier burst',
    critDmgExtra: 1,
    assumption: 'Ice Creations auto-explode even undetonated (rotation enabler).',
  },
  {
    scope: 'motion',
    characterId: 'sanhua',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'ice prism burst',
    critDmgExtra: 1,
  },
  {
    scope: 'motion',
    characterId: 'sanhua',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'ice thorn burst',
    critDmgExtra: 1,
  },

  // --- Shorekeeper ----------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'shorekeeper',
    rank: 4,
    mods: [{ stat: 'healingBonus', value: 0.7 }],
    assumption: 'When casting Chaos Theory (no window stated).',
  },
  {
    scope: 'sheet',
    characterId: 'shorekeeper',
    rank: 6,
    mods: [{ stat: 'critDmg', value: 5 }],
    assumption: 'After casting Intro (no window stated).',
  },

  // --- Suisui ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'suisui',
    rank: 1,
    reason: 'ATK increase unquantified (no value stated) (2026-09-17).',
  },
  {
    scope: 'motion',
    characterId: 'suisui',
    rank: 6,
    skillKind: 'intro',
    critDmgExtra: 5,
  },
  {
    scope: 'motion',
    characterId: 'suisui',
    rank: 6,
    skillKind: 'skill',
    motionNameIncludes: 'awakening spring',
    critDmgExtra: 5,
  },

  // --- Taoqi ----------------------------------------------------------------
  {
    scope: 'motion',
    characterId: 'taoqi',
    rank: 2,
    skillKind: 'liberation',
    critRateExtra: 0.2,
    critDmgExtra: 0.2,
  },
  {
    scope: 'sheet',
    characterId: 'taoqi',
    rank: 4,
    mods: [{ stat: 'defPct', value: 0.5 }],
    assumption: '5s window after Strategic Parry (triggered 1/15s).',
  },
  {
    scope: 'motion',
    characterId: 'taoqi',
    rank: 5,
    skillKind: 'forte',
    motionMultiplier: 1.5,
  },
  {
    scope: 'motion',
    characterId: 'taoqi',
    rank: 6,
    dmgType: 'basic',
    motionMultiplier: 1.4,
    assumption: 'While the Rocksteady Shield holds.',
  },
  {
    scope: 'motion',
    characterId: 'taoqi',
    rank: 6,
    dmgType: 'heavy',
    motionMultiplier: 1.4,
    assumption: 'While the Rocksteady Shield holds.',
  },

  // --- Xiangli Yao ----------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'xiangli-yao',
    rank: 2,
    mods: [{ stat: 'critDmg', value: 0.3 }],
    assumption: '8s window after skill / Liberation.',
  },

  // --- Yuanwu ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'yuanwu',
    rank: 3,
    reason: 'DEF-scaling flat bonus has no per-block input (2026-09-17).',
  },
  {
    scope: 'sheet',
    characterId: 'yuanwu',
    rank: 5,
    mods: [{ stat: 'dmgBonus:liberation', value: 0.5 }],
    assumption: 'While Thunder Wedge is on the field.',
  },
  {
    scope: 'sheet',
    characterId: 'yuanwu',
    rank: 6,
    mods: [{ stat: 'defPct', value: 0.32 }],
    assumption: '3s window near Thunder Wedge (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'yuanwu',
    rank: 6,
    label: 'Yuanwu S6 (team DEF)',
    windowSeconds: 3,
    mods: [{ stat: 'defPct', value: 0.32 }],
    assumption: '3s window near Thunder Wedge; teammates part.',
  },

  // --- Youhu ----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'youhu',
    rank: 2,
    reason: 'S2 doubles Antithesis +70% / Triplet +175% (Perfect Rhyme carries Triplet); no Auspice-combo input for the base or doubled bonus (2026-09-18).',
  },
  {
    scope: 'sheet',
    characterId: 'youhu',
    rank: 3,
    mods: [{ stat: 'atkPct', value: 0.2 }],
  },
  {
    scope: 'sheet',
    characterId: 'youhu',
    rank: 5,
    mods: [{ stat: 'critRate', value: 0.15 }],
    assumption: '14s window after Intro.',
  },
  {
    scope: 'sheet',
    characterId: 'youhu',
    rank: 6,
    mods: [{ stat: 'critDmg', value: 0.6 }],
    assumption: '4 Sky Blue stacks (max), 7s window.',
  },

  // --- Zhezhi ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'zhezhi',
    rank: 1,
    mods: [{ stat: 'critRate', value: 0.1 }],
    assumption: '27s window after Creation’s Zenith.',
  },
  {
    scope: 'sheet',
    characterId: 'zhezhi',
    rank: 3,
    mods: [{ stat: 'atkPct', value: 0.45 }],
    assumption: '3 stacks (max), 27s window.',
  },

  // --- Wave 3 catch-up ------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'rover-electro',
    rank: 5,
    mods: [{ stat: 'critDmg', value: 0.2 }],
    assumption: 'While in Apex Resonance.',
  },
  {
    scope: 'motion',
    characterId: 'roccia',
    rank: 6,
    skillKind: 'forte',
    defIgnoreExtra: 0.6,
    assumption: '12s window after Liberation; Reality Recreation extra form unmodeled (extra hit equal to Real Fantasy Stage 3, considered Heavy).',
  },
  {
    scope: 'sheet',
    characterId: 'lucy',
    rank: 1,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '14s window after Intro.',
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 6,
    skillKind: 'liberation',
    motionNameIncludes: 'inward vision',
    critDmgExtra: 5,
  },
  {
    scope: 'motion',
    characterId: 'hiyuki',
    rank: 6,
    skillKind: 'liberation',
    motionNameIncludes: 'blade liberation',
    critDmgExtra: 5,
  },
  {
    scope: 'sheet',
    characterId: 'hiyuki',
    rank: 6,
    mods: [{ stat: 'critDmg', value: 0.4 }],
    assumption: '2 Snow Rust stacks (gate-met); Glacio Bite riders unmodeled (no Bite pipeline).',
  },
  {
    scope: 'motion',
    characterId: 'aemeath',
    rank: 1,
    skillKind: 'basic',
    motionNameIncludes: 'heavy attack - aemeath',
    critDmgExtra: 3,
    assumption: 'In Instant Response (state assumed active).',
  },
  {
    scope: 'motion',
    characterId: 'aemeath',
    rank: 1,
    skillKind: 'skill',
    motionNameIncludes: 'heavy attack - mech',
    critDmgExtra: 3,
    assumption: 'In Instant Response (state assumed active).',
  },
  {
    scope: 'note',
    characterId: 'aemeath',
    rank: 6,
    reason: 'Liberation +40% bucket in aemeathSkillMods; S6 fixed crit consumed by Starburst responses only (Seraphic Duet per-instance hits unmodeled); trail stack/cap riders unmodeled.',
    appliedElsewhere: 'aemeathSkillMods',
  },

  // --- Wave 4: team batch ---------------------------------------------------
  // --- Verina ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'verina',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Spectro', value: 0.15 }],
    assumption: '24s window after Blooms / Liberation / Outro (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'verina',
    rank: 4,
    label: 'Verina S4 (team Spectro DMG)',
    windowSeconds: 24,
    mods: [{ stat: 'dmgBonus:Spectro', value: 0.15 }],
    assumption: '24s window after Blooms / Liberation / Outro; teammates part.',
  },
  {
    scope: 'sheet',
    characterId: 'verina',
    rank: 5,
    mods: [{ stat: 'healingBonus', value: 0.2 }],
    assumption: 'Healing a team member below 50% HP (gate-met).',
  },

  // --- Rover: Spectro -------------------------------------------------------
  {
    scope: 'note',
    characterId: 'rover-spectro',
    rank: 4,
    reason: 'Liberation team heal-over-time has no scoring (2026-09-17).',
  },

  // --- Sanhua ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'sanhua',
    rank: 6,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '2 stacks (max), 20s window after detonation (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'sanhua',
    rank: 6,
    label: 'Sanhua S6 (team ATK)',
    windowSeconds: 20,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '2 stacks (max), 20s window after detonation; teammates part.',
  },

  // --- Baizhi ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'baizhi',
    rank: 5,
    reason: 'Team revive has no scoring (2026-09-17).',
  },
  {
    scope: 'sheet',
    characterId: 'baizhi',
    rank: 6,
    mods: [{ stat: 'dmgBonus:Glacio', value: 0.12 }],
    assumption: "20s window after Euphonia pickup; 'nearby' read as including the wielder (wearer-total: wielder part).",
  },
  {
    scope: 'team',
    characterId: 'baizhi',
    rank: 6,
    label: 'Baizhi S6 (team Glacio DMG)',
    windowSeconds: 20,
    mods: [{ stat: 'dmgBonus:Glacio', value: 0.12 }],
    assumption: '20s window after Euphonia pickup; teammates part.',
  },

  // --- Encore ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'encore',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Fusion', value: 0.2 }],
    assumption: '30s window after Cosmos Rupture (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'encore',
    rank: 4,
    label: 'Encore S4 (team Fusion DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'dmgBonus:Fusion', value: 0.2 }],
    assumption: '30s window after Cosmos Rupture; teammates part.',
  },

  // --- Danjin ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'danjin',
    rank: 6,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Chaoscleave (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'danjin',
    rank: 6,
    label: 'Danjin S6 (team ATK)',
    windowSeconds: 20,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Chaoscleave; teammates part.',
  },

  // --- Mortefi --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'mortefi',
    rank: 6,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Liberation (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'mortefi',
    rank: 6,
    label: 'Mortefi S6 (team ATK)',
    windowSeconds: 20,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Liberation; teammates part.',
  },

  // --- Camellya -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'camellya',
    rank: 4,
    mods: [{ stat: 'dmgBonus:basic', value: 0.25 }],
    assumption: '30s window after Everblooming (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'camellya',
    rank: 4,
    label: 'Camellya S4 (team Basic DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'dmgBonus:basic', value: 0.25 }],
    assumption: '30s window after Everblooming; teammates part.',
  },

  // --- Calcharo -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'calcharo',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Electro', value: 0.2 }],
    assumption: '30s window after Outro (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'calcharo',
    rank: 4,
    label: 'Calcharo S4 (team Electro DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'dmgBonus:Electro', value: 0.2 }],
    assumption: '30s window after Outro; teammates part.',
  },

  // --- Yinlin ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'yinlin',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '12s window after Judgment Strike hits (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'yinlin',
    rank: 4,
    label: 'Yinlin S4 (team ATK)',
    windowSeconds: 12,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '12s window after Judgment Strike hits; teammates part.',
  },

  // --- Lingyang -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'lingyang',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Glacio', value: 0.2 }],
    assumption: '30s window after Outro (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'lingyang',
    rank: 4,
    label: 'Lingyang S4 (team Glacio DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'dmgBonus:Glacio', value: 0.2 }],
    assumption: '30s window after Outro; teammates part.',
  },

  // --- Jinhsi ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'jinhsi',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Spectro', value: 0.2 }],
    assumption: '20s window after Liberation / Epiphany (wielder part only).',
  },
  {
    scope: 'note',
    characterId: 'jinhsi',
    rank: 4,
    reason: "Teammates' Attribute Bonus needs per-recipient attributes (2026-09-17).",
  },

  // --- Xiangli Yao ----------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'xiangli-yao',
    rank: 4,
    mods: [{ stat: 'dmgBonus:liberation', value: 0.25 }],
    assumption: '30s window after Liberation (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'xiangli-yao',
    rank: 4,
    label: 'Xiangli Yao S4 (team Liberation DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'dmgBonus:liberation', value: 0.25 }],
    assumption: '30s window after Liberation; teammates part.',
  },

  // --- Changli --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'changli',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '30s window after Intro (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'changli',
    rank: 4,
    label: 'Changli S4 (team ATK)',
    windowSeconds: 30,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '30s window after Intro; teammates part.',
  },

  // --- Zhezhi ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'zhezhi',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '30s window after Liberation (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'zhezhi',
    rank: 4,
    label: 'Zhezhi S4 (team ATK)',
    windowSeconds: 30,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '30s window after Liberation; teammates part.',
  },

  // --- Lumi -----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'lumi',
    rank: 6,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Liberation (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'lumi',
    rank: 6,
    label: 'Lumi S6 (team ATK)',
    windowSeconds: 20,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Liberation; teammates part.',
  },

  // --- Shorekeeper ----------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'shorekeeper',
    rank: 2,
    mods: [{ stat: 'atkPct', value: 0.4 }],
    assumption: "While Outer Stellarealm is active; 'nearby' read as including the wielder (wearer-total: wielder part).",
  },
  {
    scope: 'team',
    characterId: 'shorekeeper',
    rank: 2,
    label: 'Shorekeeper S2 (team ATK)',
    mods: [{ stat: 'atkPct', value: 0.4 }],
    assumption: 'While Outer Stellarealm is active; teammates part.',
  },

  // --- Roccia ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'roccia',
    rank: 2,
    mods: [{ stat: 'dmgBonus:Havoc', value: 0.4 }],
    assumption: '3 stacks + max-stack bonus (full stacks), 30s window (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'roccia',
    rank: 2,
    label: 'Roccia S2 (team Havoc DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'dmgBonus:Havoc', value: 0.4 }],
    assumption: '3 stacks + max-stack bonus (full stacks), 30s window; teammates part.',
  },

  // --- Carlotta -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'carlotta',
    rank: 4,
    mods: [{ stat: 'dmgBonus:skill', value: 0.25 }],
    assumption: '30s window after Heavy Attacks (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'carlotta',
    rank: 4,
    label: 'Carlotta S4 (team Skill DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'dmgBonus:skill', value: 0.25 }],
    assumption: '30s window after Heavy Attacks; teammates part.',
  },

  // --- Brant ----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'brant',
    rank: 4,
    reason: 'Shield increase and ER-scaling team heal have no scoring (2026-09-17).',
  },

  // --- Ciaccona -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'ciaccona',
    rank: 2,
    mods: [{ stat: 'dmgBonus:Aero', value: 0.4 }],
    assumption: "During Liberation Singer's Triple Cadenza (wearer-total: wielder part).",
  },
  {
    scope: 'team',
    characterId: 'ciaccona',
    rank: 2,
    label: 'Ciaccona S2 (team Aero DMG)',
    mods: [{ stat: 'dmgBonus:Aero', value: 0.4 }],
    assumption: "During Liberation Singer's Triple Cadenza; teammates part.",
  },

  // --- Lupa -----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'lupa',
    rank: 2,
    mods: [{ stat: 'dmgBonus:Fusion', value: 0.4 }],
    assumption: '2 stacks (max), 30s window after Liberation / heavies (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'lupa',
    rank: 2,
    label: 'Lupa S2 (team Fusion DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'dmgBonus:Fusion', value: 0.4 }],
    assumption: '2 stacks (max), 30s window after Liberation / heavies; teammates part.',
  },

  // --- Phrolova -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'phrolova',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Havoc', value: 0.2 }],
    assumption: '30s window after Echo Skill (wielder part only).',
  },
  {
    scope: 'note',
    characterId: 'phrolova',
    rank: 4,
    reason: "Teammates' Attribute Bonus needs per-recipient attributes (2026-09-17).",
  },
  {
    scope: 'note',
    characterId: 'phrolova',
    rank: 5,
    reason: 'Maestro stagnation field and damage reduction have no scoring (2026-09-17).',
  },

  // --- Augusta --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'augusta',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '30s window after Intro (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'augusta',
    rank: 4,
    label: 'Augusta S4 (team ATK)',
    windowSeconds: 30,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '30s window after Intro; teammates part.',
  },

  // --- Iuno -----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'iuno',
    rank: 2,
    mods: [{ stat: 'amplify', value: 0.4 }],
    assumption: '10 Blessing of the Wan Light stacks (gate-met; wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'iuno',
    rank: 2,
    label: 'Iuno S2 (team all-DMG amp)',
    mods: [{ stat: 'amplify', value: 0.4 }],
    assumption: '10 Blessing of the Wan Light stacks (gate-met); teammates part.',
  },
  {
    scope: 'note',
    characterId: 'iuno',
    rank: 4,
    reason: 'Team shields have no scoring (2026-09-17).',
  },

  // --- Buling ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'buling',
    rank: 3,
    reason: 'Team emergency heal has no scoring (2026-09-17).',
  },
  {
    scope: 'sheet',
    characterId: 'buling',
    rank: 6,
    mods: [{ stat: 'dmgBonus:skill', value: 0.5 }],
    assumption: "In Thunder Spell state; 'active Resonator' read as the wielder when on-field (calculator scores on-field).",
  },
  {
    scope: 'team',
    characterId: 'buling',
    rank: 6,
    label: 'Buling S6 (active Resonator Skill DMG)',
    mods: [{ stat: 'dmgBonus:skill', value: 0.5 }],
    assumption: 'In Thunder Spell state; active-resonator part.',
  },

  // --- Galbrena -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'galbrena',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Fusion', value: 0.2 }],
    assumption: '20s window after Echo Skill (wielder part only).',
  },
  {
    scope: 'note',
    characterId: 'galbrena',
    rank: 4,
    reason: "Teammates' All-Attribute Bonus needs per-recipient attributes (2026-09-17).",
  },

  // --- Chisa ----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'chisa',
    rank: 4,
    reason: 'Unseen Snare Bane-pacing mechanic has no scoring (2026-09-17).',
  },

  // --- Phoebe ---------------------------------------------------------------
  {
    scope: 'team',
    characterId: 'phoebe',
    rank: 2,
    label: 'Phoebe S2 (Silent Prayer Frazzle amp)',
    windowSeconds: 30,
    mods: [{ stat: 'negativeStatusAmplify', value: 1.2 }],
    assumption: 'Confession state; stacks with the base Phoebe Outro team buff (total 220%). Teammates part.',
  },

  // --- Qiuyuan --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'qiuyuan',
    rank: 2,
    mods: [{ stat: 'dmgBonus:echo', value: 0.3 }],
    assumption: "While Bamboo's Shade lasts; 'nearby' read as including the wielder (wearer-total: wielder part).",
  },
  {
    scope: 'team',
    characterId: 'qiuyuan',
    rank: 2,
    label: 'Qiuyuan S2 (team Echo amp)',
    mods: [{ stat: 'dmgBonus:echo', value: 0.3 }],
    assumption: "While Bamboo's Shade lasts; teammates part.",
  },

  // --- Mornye ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'mornye',
    rank: 2,
    mods: [{ stat: 'critDmg', value: 0.32 }],
    assumption: 'Target has Interfered Marker (gate-met); 260% Energy Regen scaling maxed (0.2% per 1% over 100%; wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'mornye',
    rank: 2,
    label: 'Mornye S2 (team Crit DMG)',
    mods: [{ stat: 'critDmg', value: 0.32 }],
    assumption: 'Target has Interfered Marker (gate-met); 260% Energy Regen scaling maxed; teammates part.',
  },

  // --- Aemeath --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'aemeath',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Fusion', value: 0.2 }],
    assumption: '30s window after Intro / Sync Strike / Seraphic Duet (wielder part only).',
  },
  {
    scope: 'note',
    characterId: 'aemeath',
    rank: 4,
    reason: "Teammates' All-Attribute Bonus needs per-recipient attributes (2026-09-17).",
  },
  {
    scope: 'note',
    characterId: 'aemeath',
    rank: 5,
    reason: 'Fatal-damage survive, Digital Ghost shields, and revive have no scoring (2026-09-17).',
  },

  // --- Sigrika --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'sigrika',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Echo Skill (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'sigrika',
    rank: 4,
    label: 'Sigrika S4 (team ATK)',
    windowSeconds: 20,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Echo Skill; teammates part.',
  },

  // --- Rebecca --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'rebecca',
    rank: 2,
    mods: [{ stat: 'dmgBonus:Electro', value: 0.2 }],
    assumption: '30s window after Intro / Liberation (wielder part only).',
  },
  {
    scope: 'note',
    characterId: 'rebecca',
    rank: 2,
    reason: "Teammates' All-Attribute Bonus needs per-recipient attributes (2026-09-17).",
  },
  {
    scope: 'sheet',
    characterId: 'rebecca',
    rank: 2,
    mods: [{ stat: 'amplify', value: 0.15 }],
    assumption: 'After inflicting Hack - Shifting, 30s window (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'rebecca',
    rank: 2,
    label: 'Rebecca S2 (team all-DMG amp)',
    windowSeconds: 30,
    mods: [{ stat: 'amplify', value: 0.15 }],
    assumption: 'After inflicting Hack - Shifting, 30s window; teammates part.',
  },

  // --- Lucilla --------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'lucilla',
    rank: 2,
    reason: 'Mode-exclusive team buffs (Chafe amp / Echo bonus) need a Resonance Mode input (2026-09-17).',
  },

  // --- Lucy -----------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'lucy',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Spectro', value: 0.2 }],
    assumption: '20s window after inflicting Hack - Shifting (wielder part only).',
  },
  {
    scope: 'note',
    characterId: 'lucy',
    rank: 4,
    reason: "Teammates' All-Attribute Bonus needs per-recipient attributes (2026-09-17).",
  },

  // --- Hiyuki ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'hiyuki',
    rank: 4,
    mods: [{ stat: 'amplify', value: 0.2 }],
    assumption: "30s window after skill; 'nearby' read as including the wielder (wearer-total: wielder part).",
  },
  {
    scope: 'team',
    characterId: 'hiyuki',
    rank: 4,
    label: 'Hiyuki S4 (team DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'amplify', value: 0.2 }],
    assumption: '30s window after skill; teammates part.',
  },

  // --- Yangyang: Xuanling ---------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'yangyang-xuanling',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Intro / Sword Stances (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'yangyang-xuanling',
    rank: 4,
    label: 'Xuanling S4 (team ATK)',
    windowSeconds: 20,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '20s window after Intro / Sword Stances; teammates part.',
  },

  // --- Suisui ---------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'suisui',
    rank: 2,
    mods: [{ stat: 'critDmg', value: 0.5 }],
    assumption: "In Ceaseless Landscape after a status action, 30s window; 'nearby' read as including the wielder (wearer-total: wielder part).",
  },
  {
    scope: 'team',
    characterId: 'suisui',
    rank: 2,
    label: 'Suisui S2 (team Crit DMG)',
    windowSeconds: 30,
    mods: [{ stat: 'critDmg', value: 0.5 }],
    assumption: 'In Ceaseless Landscape after a status action, 30s window; teammates part.',
  },

  // --- Qingxiao -------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'qingxiao',
    rank: 4,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '8s window after inflicting Tune Strain - Shifting (wearer-total: wielder part).',
  },
  {
    scope: 'team',
    characterId: 'qingxiao',
    rank: 4,
    label: 'Qingxiao S4 (team ATK)',
    windowSeconds: 8,
    mods: [{ stat: 'atkPct', value: 0.2 }],
    assumption: '8s window after inflicting Tune Strain - Shifting; teammates part.',
  },

  // --- Jingran --------------------------------------------------------------
  {
    scope: 'sheet',
    characterId: 'jingran',
    rank: 4,
    mods: [{ stat: 'dmgBonus:Fusion', value: 0.2 }],
    assumption: '30s window after gaining a Shield (wielder part only).',
  },
  {
    scope: 'note',
    characterId: 'jingran',
    rank: 4,
    reason: "Teammates' All-Attribute Bonus needs per-recipient attributes (2026-09-17).",
  },

  // --- Wave 4: notes sweep --------------------------------------------------
  // --- Verina ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'verina',
    rank: 1,
    reason: 'Outro continuous healing has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'verina',
    rank: 2,
    reason: 'Photosynthesis / Concerto Energy riders have no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'verina',
    rank: 3,
    reason: 'Photosynthesis Mark healing increase has no scoring (2026-09-17).',
  },

  // --- Sanhua ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'sanhua',
    rank: 2,
    reason: 'STA cost reduction and interrupt resistance have no scoring (2026-09-17).',
  },

  // --- Taoqi ----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'taoqi',
    rank: 1,
    reason: 'Shield increase has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'taoqi',
    rank: 3,
    reason: 'Shield duration extension has no scoring (2026-09-17).',
  },

  // --- Baizhi ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'baizhi',
    rank: 1,
    reason: 'Resonance Energy restore has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'baizhi',
    rank: 4,
    reason: 'Extra Remnant Entities casts and HP-scaling extra hit have no mechanic (2026-09-17).',
  },

  // --- Encore ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'encore',
    rank: 2,
    reason: 'Resonance Energy restore has no scoring (2026-09-17).',
  },

  // --- Aalto ----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'aalto',
    rank: 1,
    reason: 'Skill cooldown reduction has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'aalto',
    rank: 3,
    reason: 'Mist bonus bullets are extra hits with no mechanic (2026-09-17).',
  },

  // --- Mortefi --------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'mortefi',
    rank: 1,
    reason: 'Skill-triggered extra Marcato hits need extra-hit specs (base Marcato is registry-classified as coordinated) (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'mortefi',
    rank: 2,
    reason: 'Resonance Energy restore has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'mortefi',
    rank: 4,
    reason: 'Liberation duration extension has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'mortefi',
    rank: 5,
    reason: 'Skill-triggered extra Marcato hits need extra-hit specs (2026-09-17).',
  },

  // --- Calcharo -------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'calcharo',
    rank: 1,
    reason: 'Resonance Energy restore has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'calcharo',
    rank: 6,
    reason: 'Phantom coordinated hits need a coordinated-hit spec like the Jiyan lance (2026-09-17).',
  },

  // --- Yinlin ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'yinlin',
    rank: 2,
    reason: 'Judgement Point / Resonance Energy riders have no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'yinlin',
    rank: 6,
    reason: 'Furious Thunder extra hits need an extra-hit spec (2026-09-17).',
  },

  // --- Lingyang -------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'lingyang',
    rank: 1,
    reason: 'Anti-interruption has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'lingyang',
    rank: 2,
    reason: 'Resonance Energy restore has no scoring (2026-09-17).',
  },

  // --- Yuanwu ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'yuanwu',
    rank: 1,
    reason: 'Attack speed increases have no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'yuanwu',
    rank: 2,
    reason: 'Resonance Energy restore has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'yuanwu',
    rank: 4,
    reason: 'On-field shield has no scoring (2026-09-17).',
  },

  // --- Rover: Havoc ---------------------------------------------------------
  {
    scope: 'note',
    characterId: 'rover-havoc',
    rank: 2,
    reason: 'Skill cooldown reset has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'rover-havoc',
    rank: 3,
    reason: 'Lost-HP-scaling heal has no scoring (2026-09-17).',
  },
  {
    scope: 'motion',
    characterId: 'rover-havoc',
    rank: 5,
    skillKind: 'forte',
    motionNameIncludes: 'umbra: basic attack stage 5',
    motionMultiplier: 1.5,
    assumption: 'In Dark Surge state.',
  },

  // --- Jianxin --------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'jianxin',
    rank: 1,
    reason: 'Chi gain increase has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'jianxin',
    rank: 2,
    reason: 'Extra skill charge has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'jianxin',
    rank: 3,
    reason: 'Parry-stance availability mechanic has no scoring (2026-09-17).',
  },
  {
    scope: 'motion',
    characterId: 'jianxin',
    rank: 4,
    skillKind: 'liberation',
    motionMultiplier: 1.8,
    assumption: '14s window after Primordial Chi Spiral.',
  },
  {
    scope: 'note',
    characterId: 'jianxin',
    rank: 5,
    reason: 'Liberation range increase has no scoring (2026-09-17).',
  },

  // --- Jinhsi ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'jinhsi',
    rank: 2,
    reason: 'Out-of-combat Incandescence restore has no scoring (2026-09-17).',
  },

  // --- Zhezhi ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'zhezhi',
    rank: 2,
    reason: 'Inklit Spirit summon cap increase has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'zhezhi',
    rank: 5,
    reason: 'Extra Inklit Spirit coordinated hit needs a coordinated-hit spec (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'zhezhi',
    rank: 6,
    reason: 'Extra Ivory Herald hit needs an extra-hit spec (2026-09-17).',
  },

  // --- Lumi -----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'lumi',
    rank: 1,
    reason: 'STA restore has no scoring (2026-09-17).',
  },

  // --- Youhu ----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'youhu',
    rank: 1,
    reason: 'RNG damage/interrupt immunity has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'youhu',
    rank: 4,
    reason: 'RNG cooldown skip has no scoring (2026-09-17).',
  },

  // --- Shorekeeper ----------------------------------------------------------
  {
    scope: 'note',
    characterId: 'shorekeeper',
    rank: 1,
    reason: 'Stellarealm range/duration/persistence riders have no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'shorekeeper',
    rank: 3,
    reason: 'Concerto Energy restore has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'shorekeeper',
    rank: 5,
    reason: 'Pull-range increases have no scoring (2026-09-17).',
  },

  // --- Roccia ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'roccia',
    rank: 1,
    reason: 'Imagination / Concerto Energy riders and interrupt immunity have no scoring (2026-09-17).',
  },

  // --- Rover: Aero ----------------------------------------------------------
  {
    scope: 'note',
    characterId: 'rover-aero',
    rank: 1,
    reason: 'Interrupt resistance has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'rover-aero',
    rank: 2,
    reason: 'On-field heal-over-time and emergency heal have no scoring (2026-09-17).',
  },

  // --- Cantarella -----------------------------------------------------------
  {
    scope: 'note',
    characterId: 'cantarella',
    rank: 5,
    reason: 'Dreamweaver summon cap increase has no scoring (2026-09-17).',
  },

  // --- Ciaccona -------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'ciaccona',
    rank: 3,
    reason: 'Musical Essence / skill charge riders have no scoring (2026-09-17).',
  },

  // --- Cartethyia -----------------------------------------------------------
  {
    scope: 'note',
    characterId: 'cartethyia',
    rank: 5,
    reason: 'Fatal-blow survive, shield, and Liberation HP-cost reduction have no scoring (2026-09-17).',
  },

  // --- Augusta --------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'augusta',
    rank: 5,
    reason: 'Shield increase has no scoring (2026-09-17).',
  },

  // --- Buling ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'buling',
    rank: 2,
    reason: 'Resonance Energy restore has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'buling',
    rank: 5,
    reason: 'Bonus Electro Flare infliction has no scoring (2026-09-17).',
  },

  // --- Mornye ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'mornye',
    rank: 1,
    reason: 'Marker application/duration mechanics have no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'mornye',
    rank: 3,
    reason: 'Concerto Energy / Relative Momentum restore has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'mornye',
    rank: 4,
    reason: 'Field healing increase has no scoring (2026-09-17).',
  },

  // --- Sigrika --------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'sigrika',
    rank: 3,
    reason: 'Innate Gift stack cap/persistence mechanic has no scoring (2026-09-17).',
  },

  // --- Denia ----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'denia',
    rank: 2,
    reason: 'Fusion-Burst branch (50% team Fusion, 15s) and Tune-Strain branch (+20 team Tune Break Boost, 15s, 300s ICD) need mode-gated application: sheet auto-applies unconditionally and team entries require a sheet twin (2026-09-18).',
  },
  {
    scope: 'note',
    characterId: 'denia',
    rank: 4,
    reason: 'Erosion Field tick-rate change has no scoring (2026-09-17).',
  },

  // --- Rebecca --------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'rebecca',
    rank: 4,
    reason: 'S4 +60% to A Girl Gets What She Wants! needs the unmodeled base (Huntress +30% Crit DMG / Guts 15% DEF ignore, mode-gated 12s window); resulting values unpublished in inspected sources (2026-09-18).',
  },

  // --- Lucy -----------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'lucy',
    rank: 5,
    reason: 'Optical Illusion stack cap and trigger shield have no scoring (2026-09-17).',
  },

  // --- Rover: Electro -------------------------------------------------------
  {
    scope: 'note',
    characterId: 'rover-electro',
    rank: 1,
    reason: 'Interrupt resistance has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'rover-electro',
    rank: 2,
    reason: 'Bonus Electro Flare infliction has no scoring (2026-09-17).',
  },

  // --- Yangyang: Xuanling ---------------------------------------------------
  {
    scope: 'note',
    characterId: 'yangyang-xuanling',
    rank: 5,
    reason: 'Fatal-blow survive, heal, and immunity have no scoring (2026-09-17).',
  },

  // --- Suisui ---------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'suisui',
    rank: 3,
    reason: 'Kingfisher rotation/resource mechanic has no scoring (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'suisui',
    rank: 4,
    reason: 'Healing increases have no scoring (2026-09-17).',
  },

  // --- Jingran --------------------------------------------------------------
  {
    scope: 'note',
    characterId: 'jingran',
    rank: 5,
    reason: 'Fatal-blow survive and shield have no scoring (2026-09-17).',
  },

  // --- Skipped census ranks: no transcribable motion target -----------------
  {
    scope: 'note',
    characterId: 'camellya',
    rank: 6,
    reason: 'Sweet Dream has no snapshot motion; Perennial is an extra-hit rotation mechanic (2026-09-17).',
  },
  {
    scope: 'note',
    characterId: 'denia',
    rank: 6,
    reason: 'Fusion Burst +200% and Tune-Strain riders need the Tune pipeline (2026-09-17).',
  },

  // --- Yangyang: Xuanling (module-covered) ------------------------------------
  {
    scope: 'note',
    characterId: 'yangyang-xuanling',
    rank: 1,
    reason: 'Shadow of Xuanling summon scores as its own liberation block (snapshot motion data); trigger timing is rotation-layer.',
  },
  {
    scope: 'note',
    characterId: 'yangyang-xuanling',
    rank: 2,
    reason: 'Heavy / Feather Fall / Havoc-in-Bloom x2 in xuanlingSkillMods.',
    appliedElsewhere: 'xuanlingSkillMods',
  },
  {
    scope: 'note',
    characterId: 'yangyang-xuanling',
    rank: 3,
    reason: 'Liberation +175% Amplify in xuanlingSkillMods.',
    appliedElsewhere: 'xuanlingSkillMods',
  },
  {
    scope: 'note',
    characterId: 'yangyang-xuanling',
    rank: 6,
    reason: 'Voice Flux Heavy x1.4 in xuanlingSkillMods; Still-as-Withered-Wood summon unmodeled (off-field trigger, charges, per-hit crit).',
    appliedElsewhere: 'xuanlingSkillMods',
  },

  // --- Module-covered multiplier ranks (Wave 2 exclusions) ------------------
  {
    scope: 'note',
    characterId: 'cartethyia',
    rank: 2,
    reason: 'Attack multipliers in cartethyiaMotionMultiplier; +3 stack limit via maxStatusStacks; cooldown rider has no bucket.',
    appliedElsewhere: 'cartethyiaMotionMultiplier',
  },
  {
    scope: 'note',
    characterId: 'cartethyia',
    rank: 3,
    reason: 'Blade of Howling Squall +100% in cartethyiaMotionMultiplier; stack infliction via rotation inputs.',
    appliedElsewhere: 'cartethyiaMotionMultiplier',
  },
  {
    scope: 'note',
    characterId: 'cartethyia',
    rank: 6,
    reason: 'Fleurdelys +40% in cartethyiaMotionMultiplier; stack raise/keep and trigger-on-max via rotation inputs.',
    appliedElsewhere: 'cartethyiaMotionMultiplier',
  },
  {
    scope: 'note',
    characterId: 'chisa',
    rank: 3,
    reason: 'Sawring trio +120% (stackable) and ring-bonus scaling in chisaSkillMods; Vibration rider has no bucket.',
    appliedElsewhere: 'chisaSkillMods',
  },
  {
    scope: 'note',
    characterId: 'aemeath',
    rank: 2,
    reason: 'Overture/Encore x2 in aemeathSkillMods; Tune Rupture / Fusion Burst riders unmodeled (Phase 5 Tune pipeline).',
    appliedElsewhere: 'aemeathSkillMods',
  },
  {
    scope: 'note',
    characterId: 'aemeath',
    rank: 3,
    reason: 'Finale x2 / Overdrive x1.4 in aemeathSkillMods; Between the Stars Crit/amp riders are manual buffs.',
    appliedElsewhere: 'aemeathSkillMods',
  },
];
