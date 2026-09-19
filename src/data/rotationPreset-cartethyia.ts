import type { RotationPreset } from './rotationPresets.ts';

/**
 * Cartethyia presets. Transcribed from Prydwen's Rotation & How to play >
 * Standard Rotation (the page's recommended no-quickswap rotation; the Low
 * Aero Erosion variant is team-conditional).
 */
export const CARTETHYIA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'cartethyia-prydwen-standard-rotation',
    characterId: 'cartethyia',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/cartethyia',
    notes:
      'Transcribed from the Rotation & How to play > Standard Rotation section (verified live 2026-09-19). ' +
      'Omitted: the Ultimate transform line (no snapshot row; liberation damage scores via Blade of Howling Squall); ' +
      'Echo timing is prose-only (not a listed step). ' +
      'The plunge maps to the 3-recalled-shadows row: Intro summons Discord, Basic 4 summons Divinity, Skill summons Virtue (skill prose). ' +
      'The page also details a Low Aero Erosion Rotation and opener notes (not transcribed).',
    steps: [
      {
        skillId: '1003506',
        motionName: "Sword to Mark Tide's Trace DMG",
        forteLevel: 10,
        note: 'Guide: Intro - Cartethyia. Form-picked: Cartethyia intro per intro prose (Fleurdelys intro is Sword to Call for Freedom).',
      },
      { skillId: '1003501', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1003501', motionName: 'Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1003501',
        motionName: 'Stage 4 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      { skillId: '1003502', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1003501',
        motionName: 'Mid-air Attack 3 Sword Shadows Recalled',
        forteLevel: 10,
        note: 'Guide: cancel when she hits the ground via Ultimate (no cancel model; full motion scores).',
      },
      {
        skillId: '1003507',
        motionName: "Sword to Answer Waves' Call DMG",
        forteLevel: 10,
        note: 'Guide: Skill - Fleurdelys 1 (forte prose).',
      },
      {
        skillId: '1003507',
        motionName: 'Mid-air Attack 3 DMG',
        forteLevel: 10,
        note: 'Guide: Heavy - Mid-Air Attack 3 - Fleurdelys (held Normal Attack Stage 3, forte prose).',
      },
      { skillId: '1003507', motionName: 'Basic Attack Stage 3 DMG', forteLevel: 10 },
      { skillId: '1003507', motionName: 'Basic Attack Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1003507',
        motionName: 'Basic Attack Stage 5 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      {
        skillId: '1003507',
        motionName: 'May Tempest Break the Tides DMG',
        forteLevel: 10,
        note: 'Guide: Skill: Fleurdelys 2 (second Skill press, forte prose).',
      },
      { skillId: '1003507', motionName: 'Basic Attack Stage 3 DMG', forteLevel: 10 },
      { skillId: '1003507', motionName: 'Basic Attack Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1003507',
        motionName: 'Basic Attack Stage 5 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1003503', motionName: 'Blade of Howling Squall DMG', forteLevel: 10 },
      {
        skillId: '1003501',
        motionName: 'Heavy Attack DMG',
        forteLevel: 10,
        note: 'Guide: (OPTIONAL) Heavy: Cartethyia (Swap).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003509', motionName: '', forteLevel: 10 },
    ],
  },
];
