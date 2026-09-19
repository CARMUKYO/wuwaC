import type { RotationPreset } from './rotationPresets.ts';

/**
 * Aemeath presets. Exemplar for transcribers: every step quotes the guide's
 * wording (see step notes), maps onto an exact snapshot motion, and calls
 * out the judgment calls (form-picked intro, cancel annotations).
 */
export const AEMEATH_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'aemeath-prydwen-easy',
    characterId: 'aemeath',
    label: 'Easy Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/aemeath',
    notes:
      'Transcribed from the Rotation & Gameplay section (verified live 2026-09-19). ' +
      'Omitted: the Echo Timing summon (user echo-dependent). ' +
      'The page also details an Opener and a Standard Rotation (not transcribed).',
    steps: [
      // Guide: "Intro". Form-picked: the rotation continues in Aemeath form,
      // so this is Songs Across the Universe, not the Mech-form Debut of
      // Meteoric Radiance (intro skill prose).
      { skillId: '1004606', motionName: 'Songs Across the Universe DMG', forteLevel: 10 },
      { skillId: '1004601', motionName: 'Basic Attack - Aemeath Stage 3 DMG', forteLevel: 10 },
      { skillId: '1004601', motionName: 'Basic Attack - Aemeath Stage 4 DMG', forteLevel: 10 },
      { skillId: '1004603', motionName: 'Heavenfall Edict: Overdrive DMG', forteLevel: 10 },
      { skillId: '1004602', motionName: 'Basic Attack - Mech Stage 2 DMG', forteLevel: 10 },
      { skillId: '1004602', motionName: 'Basic Attack - Mech Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1004602',
        motionName: 'Basic Attack - Mech Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation on first slash via Skill (no cancel model; full motion scores).',
      },
      { skillId: '1004607', motionName: 'Seraphic Duet: Encore DMG', forteLevel: 10 },
      { skillId: '1004601', motionName: 'Basic Attack - Aemeath Stage 2 DMG', forteLevel: 10 },
      { skillId: '1004601', motionName: 'Basic Attack - Aemeath Stage 3 DMG', forteLevel: 10 },
      { skillId: '1004601', motionName: 'Basic Attack - Aemeath Stage 4 DMG', forteLevel: 10 },
      { skillId: '1004607', motionName: 'Seraphic Duet: Overture DMG', forteLevel: 10 },
      {
        skillId: '1004602',
        motionName: 'Heavy Attack - Mech Charged II DMG',
        forteLevel: 10,
        note: 'Guide: cancel endlag via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1004603', motionName: 'Heavenfall Edict: Finale DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1004609', motionName: '', forteLevel: 10 },
    ],
  },
];
