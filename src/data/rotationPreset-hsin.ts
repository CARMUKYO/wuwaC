import type { RotationPreset } from './rotationPresets.ts';

/**
 * Hsin presets. Transcribed from Prydwen's Rotation & How to Play section,
 * which gives one rotation per Resonance Mode (Electro Flare + Unison).
 */
export const HSIN_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'hsin-prydwen-electro-flare',
    characterId: 'hsin',
    label: 'Electro Flare Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/hsin',
    notes:
      'Transcribed from the Rotation & How to Play > Electro Flare Rotation section (verified live 2026-10-03). ' +
      'The opener Intro maps to the Electro Flare intro row (Answering Form); "Basic 4" follows per the intro prose. ' +
      'Formshift casts are omitted (enabler with no scorable motion row — blocks assume its Edict/Dominion state); ' +
      'its Edict Soaring Pillar triggers are user-added blocks, one per trigger. ' +
      'The Heartlock collapse block is automatic on the Illumining Stage 2 hit per the basic-attack prose. ' +
      'Realm Protector / Stilling All Horizons assume Resolution of Wishes / Law of Heaven are available (else use the Wanderer / Beholding rows). ' +
      '"Skill (Swap)" maps to the Answering skill row (Pillars returns Hsin to Answering Form); the swap itself is a teammate action, omitted. ' +
      'The Outro block scores 100% ATK via the outro spec (Nightglow team buffs are manual). ' +
      'Omitted: the Echo timing line (echo skill).',
    steps: [
      {
        skillId: '1006106',
        motionName: 'Intro Skill - Answering Form DMG in Resonance Mode - Electro Flare',
        forteLevel: 10,
        note: 'Guide: "Intro" (Answering Form, Electro Flare mode).',
      },
      // Guide: "Basic 4" (post-Intro Stage 4 in Flare mode, per the intro prose).
      { skillId: '1006101', motionName: 'Basic Attack - Answering Form Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1006107',
        motionName: 'Heavy Attack - Answering Form: Realm Protector DMG',
        forteLevel: 10,
        note: 'Guide: "Heavy: Realm Protector" (assumes Resolution of Wishes; else the Wanderer row).',
      },
      // Guide: "Ultimate: Formshift" omitted (enabler, no scorable row — blocks assume its state).
      // Guide: "Skill: Illumining".
      { skillId: '1006102', motionName: 'Resonance Skill - Illumining Form DMG', forteLevel: 10 },
      // Guide: "Basic: Illumining 1" (generates the Modular Heartlock).
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form Stage 1 DMG', forteLevel: 10 },
      {
        skillId: '1006101',
        motionName: 'Basic Attack - Illumining Form Stage 2 DMG',
        forteLevel: 10,
        note: 'Guide: "Basic: Illumining 2 (Cancel animation endlag via Skill)" (no cancel model; full motion scores).',
      },
      // Automatic Heartlock collapse on the Stage 2 hit, per the basic-attack prose.
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form: Modular Heartlock DMG', forteLevel: 10 },
      // Guide: "Skill: Pillars" (enters Mechanism Dominion).
      { skillId: '1006107', motionName: 'Resonance Skill - Illumining Form: Pillars Aligned DMG', forteLevel: 10 },
      // Guide: "Basic: Pillars 1-4".
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form: Pillars Aligned Stage 1 DMG', forteLevel: 10 },
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form: Pillars Aligned Stage 2 DMG', forteLevel: 10 },
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form: Pillars Aligned Stage 3 DMG', forteLevel: 10 },
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form: Pillars Aligned Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1006107',
        motionName: 'Heavy Attack - Illumining Form: Stilling All Horizons DMG',
        forteLevel: 10,
        note: 'Guide: "Heavy: Stilling All Horizons" (assumes Law of Heaven; else the Beholding row).',
      },
      // Guide: "Ultimate: Pillars Across Heaven" (returns Hsin to Answering Form).
      { skillId: '1006103', motionName: 'Pillars Across Heaven DMG', forteLevel: 10 },
      {
        skillId: '1006102',
        motionName: 'Resonance Skill - Answering Form DMG',
        forteLevel: 10,
        note: 'Guide: "Skill (Swap)". The swap is a teammate action, omitted.',
      },
      // Guide: "Outro". Scores 100% ATK via the outro spec (Nightglow team buffs are manual).
      { skillId: '1006109', motionName: '', forteLevel: 10 },
    ],
  },
  {
    id: 'hsin-prydwen-unison',
    characterId: 'hsin',
    label: 'Unison Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/hsin',
    notes:
      'Transcribed from the Rotation & How to Play > Unison Rotation section (verified live 2026-10-03). ' +
      'The first "Intro: Manifold Unison" maps to the Answering Manifold row (Unison Response swap-in); "Basic 3" follows per the intro prose. ' +
      'The second "Intro: Manifold Unison" maps to the Illumining Manifold row, which sends Hsin straight into Mechanism Dominion per the forte prose. ' +
      'The Formshift cast is omitted (enabler with no scorable motion row — blocks assume its state). ' +
      'Realm Protector / Stilling All Horizons assume Resolution of Wishes / Law of Heaven are available. ' +
      'Omitted: the Unison-secondary interlude ("Build up a second Outro", teammate actions) and the Echo timing line. ' +
      'The Outro blocks score 100% ATK each via the outro spec (Nightglow team buffs are manual).',
    steps: [
      {
        skillId: '1006106',
        motionName: 'Intro Skill - Answering Form: Manifold Unison DMG',
        forteLevel: 10,
        note: 'Guide: "Intro: Manifold Unison" (first; Answering Form via Unison Response).',
      },
      // Guide: "Basic 3" (post-Manifold Stage 3, per the intro prose).
      { skillId: '1006101', motionName: 'Basic Attack - Answering Form Stage 3 DMG', forteLevel: 10 },
      // Guide: "Basic 4".
      { skillId: '1006101', motionName: 'Basic Attack - Answering Form Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1006107',
        motionName: 'Heavy Attack - Answering Form: Realm Protector DMG',
        forteLevel: 10,
        note: 'Guide: "Heavy: Realm Protector" (assumes Resolution of Wishes; else the Wanderer row).',
      },
      // Guide: "Ultimate: Formshift" omitted (enabler, no scorable row — blocks assume its state).
      // Guide: "Outro (Unison)". Scores 100% ATK via the outro spec.
      { skillId: '1006109', motionName: '', forteLevel: 10 },
      // Guide interlude ("Build up a second Outro from your Unison Secondary") omitted: teammate actions.
      {
        skillId: '1006106',
        motionName: 'Intro Skill - Illumining Form: Manifold Unison DMG',
        forteLevel: 10,
        note: 'Guide: second "Intro: Manifold Unison" (Illumining Form — straight into Mechanism Dominion, skipping Illumining attacks).',
      },
      // Guide: "Basic: Pillars 1-4".
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form: Pillars Aligned Stage 1 DMG', forteLevel: 10 },
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form: Pillars Aligned Stage 2 DMG', forteLevel: 10 },
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form: Pillars Aligned Stage 3 DMG', forteLevel: 10 },
      { skillId: '1006101', motionName: 'Basic Attack - Illumining Form: Pillars Aligned Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1006107',
        motionName: 'Heavy Attack - Illumining Form: Stilling All Horizons DMG',
        forteLevel: 10,
        note: 'Guide: "Heavy: Stilling All Horizons" (assumes Law of Heaven; else the Beholding row).',
      },
      // Guide: "Ultimate: Pillars Across Heaven" (returns Hsin to Answering Form).
      { skillId: '1006103', motionName: 'Pillars Across Heaven DMG', forteLevel: 10 },
      {
        skillId: '1006102',
        motionName: 'Resonance Skill - Answering Form DMG',
        forteLevel: 10,
        note: 'Guide: "Skill (Swap)". The swap is a teammate action, omitted.',
      },
      // Guide: "Outro". Scores 100% ATK via the outro spec.
      { skillId: '1006109', motionName: '', forteLevel: 10 },
    ],
  },
];
