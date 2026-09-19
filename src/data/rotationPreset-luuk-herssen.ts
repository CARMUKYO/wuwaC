import type { RotationPreset } from './rotationPresets.ts';

/**
 * Luuk Herssen presets. Transcribed from Prydwen's Rotations & Gameplay >
 * Standard Rotation section (the page's single step rotation).
 */
export const LUUK_HERSSEN_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'luuk-herssen-prydwen-standard',
    characterId: 'luuk-herssen',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/luuk-herssen',
    notes:
      'Transcribed from the Rotations & Gameplay > Standard Rotation section (verified live 2026-09-19). ' +
      'Resection stages copy the snapshot "Resction" spelling verbatim. ' +
      'The bare post-Ultimate "Skill" line maps to Golden Reflux: each Aureole form needs a fresh ' +
      'Stage 4 / Mid-air Stage 3 trigger per the skill prose, and none occurs after Glare. ' +
      'Omitted: the two movement-only Dash steps (no snapshot motion); the optional pre-rotation Echo cast ' +
      '(echo skill); the optional pre-Intro quickswap extras (not enumerated steps).',
    steps: [
      // Guide: "Intro".
      { skillId: '1004706', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Jump: Mid-air Attack: Resection 2".
      { skillId: '1004701', motionName: 'Mid-air Attack Stage 2 Scythe: Resction DMG', forteLevel: 10 },
      // Guide: "Jump: Mid-air Attack: Resection 3".
      { skillId: '1004701', motionName: 'Mid-air Attack Stage 3 Scythe: Resction DMG', forteLevel: 10 },
      // Guide: "Skill: Ring".
      { skillId: '1004702', motionName: 'Aureole of Execution: Ring DMG', forteLevel: 10 },
      {
        skillId: '1004702',
        motionName: 'Basic Attack - Golden Impale DMG',
        forteLevel: 10,
        note: 'Guide: instantly interrupt via Dash (no cancel model; full motion scores).',
      },
      // Guide: "Basic: Mid-air Attack 1".
      { skillId: '1004701', motionName: 'Mid-air Attack Stage 1 DMG', forteLevel: 10 },
      // Guide: "Jump: Mid-air Attack: Resection 2".
      { skillId: '1004701', motionName: 'Mid-air Attack Stage 2 Scythe: Resction DMG', forteLevel: 10 },
      // Guide: "Jump: Mid-air Attack: Resection 3".
      { skillId: '1004701', motionName: 'Mid-air Attack Stage 3 Scythe: Resction DMG', forteLevel: 10 },
      // Guide: "Skill: Breach".
      { skillId: '1004702', motionName: 'Aureole of Execution: Breach DMG', forteLevel: 10 },
      {
        skillId: '1004702',
        motionName: 'Basic Attack - Golden Impale DMG',
        forteLevel: 10,
        note: 'Guide: instantly interrupt via Dash (no cancel model; full motion scores).',
      },
      // Guide: "Basic: Mid-air Attack 1".
      { skillId: '1004701', motionName: 'Mid-air Attack Stage 1 DMG', forteLevel: 10 },
      // Guide: "Jump: Mid-air Attack: Resection 2".
      { skillId: '1004701', motionName: 'Mid-air Attack Stage 2 Scythe: Resction DMG', forteLevel: 10 },
      // Guide: "Jump: Mid-air Attack: Resection 3".
      { skillId: '1004701', motionName: 'Mid-air Attack Stage 3 Scythe: Resction DMG', forteLevel: 10 },
      // Guide: "Skill: Glare".
      { skillId: '1004702', motionName: 'Aureole of Execution: Glare DMG', forteLevel: 10 },
      {
        skillId: '1004707',
        motionName: 'Gavel of Earthshaker DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      // Guide: "Ultimate".
      { skillId: '1004703', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1004702',
        motionName: 'Golden Reflux DMG',
        forteLevel: 10,
        note: 'Guide: "Skill (Swap)". Base skill (see preset notes); the swap itself is a teammate action, omitted.',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1004709', motionName: '', forteLevel: 10 },
    ],
  },
];
