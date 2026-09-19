import type { RotationPreset } from './rotationPresets.ts';

/**
 * Rebecca presets. Transcribed from Prydwen's Rotation & Gameplay >
 * Loop Rotation section (the steady-state cycle).
 */
export const REBECCA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'rebecca-prydwen-loop-rotation',
    characterId: 'rebecca',
    label: 'Loop Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/rebecca',
    notes:
      'Transcribed from the Rotation & Gameplay > Loop Rotation section (verified live 2026-09-19). ' +
      'Intro and Skill map to the Huntress-mode rows per the skill prose (both switch to Guts mode). ' +
      '"Ultimate" maps to the base Mk. 31 HMG row; the two enhancements need separate presses per the ' +
      'liberation prose, are not guide steps, and are omitted. ' +
      'Note: the snapshot carries two identically-named "Heavy Attack - Guts DMG" rows (heavy/basic); ' +
      'the resolver takes the first. ' +
      'Omitted: the bare "Jump" line (movement, no snapshot motion); the Echo timing line (echo skill). ' +
      'The page also details an Opener Rotation (not transcribed).',
    steps: [
      {
        skillId: '1004806',
        motionName: "Yo, It's Big Boomin' Time! DMG",
        forteLevel: 10,
        note: 'Guide: "Intro: Huntress". Huntress-mode row per the intro prose; cancel animation endlag via Jump (no cancel model; full motion scores).',
      },
      {
        skillId: '1004801',
        motionName: 'Mid-air Attack - Huntress DMG',
        forteLevel: 10,
        note: 'Guide: "Basic: Plunging Attack" (pre-switch Huntress form). Cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      {
        skillId: '1004802',
        motionName: "Resonance Skill - It's Big Boomin' Time! DMG",
        forteLevel: 10,
        note: 'Guide: "Skill (Switch to Guts form)". Huntress-mode row per the skill prose; cancel animation endlag via Dash (no cancel model; full motion scores).',
      },
      // Guide: "Dash: Tactical Dodge" (post-switch Guts form).
      { skillId: '1004801', motionName: 'Tactical Dodge - Guts DMG', forteLevel: 10 },
      // Guide: "Basic: Guts 2".
      { skillId: '1004801', motionName: 'Basic Attack - Guts Stage 2 DMG', forteLevel: 10 },
      // Guide: "Heavy (Forte): Guts" (a forte-skill row).
      { skillId: '1004807', motionName: 'Bang-bang-bang!: Guts DMG', forteLevel: 10 },
      {
        skillId: '1004801',
        motionName: 'Heavy Attack - Guts DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Echo/Ultimate (no cancel model; full motion scores).',
      },
      // Guide: "Ultimate" (base HMG row; enhancements omitted, see preset notes).
      { skillId: '1004803', motionName: 'Mk. 31 HMG DMG', forteLevel: 10 },
      {
        skillId: '1004803',
        motionName: 'BOOM! Fireworks! DMG',
        forteLevel: 10,
        note: 'Guide: "Boom! Fireworks (Cast automatically) (Swap)". Automatic per the liberation prose; the swap is a teammate action, omitted.',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1004809', motionName: '', forteLevel: 10 },
    ],
  },
];
