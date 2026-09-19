import type { RotationPreset } from './rotationPresets.ts';

/**
 * Zhezhi presets. Transcribed from the Rotation section, Standard
 * Rotation (verified live 2026-09-19). Form-picked: the grounded "Skill"
 * after Basic 123 is Press DMG — press on the ground summons the
 * Phantasmic Imprints on the ground (skill prose). The Liberation step
 * scores one Inklit Spirit; further spirits are not listed steps. The
 * Echo timing is omitted as user echo-dependent. The page also details
 * Possible Optimizations & No Ultimate Rotation (not transcribed).
 */
export const ZHEZHI_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'zhezhi-prydwen-standard',
    characterId: 'zhezhi',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/zhezhi',
    notes:
      'Transcribed from the Rotation section, Standard Rotation (verified live 2026-09-19). ' +
      'The Liberation step scores one Inklit Spirit; further spirits are not listed steps. ' +
      'Omitted: the Echo timing (user echo-dependent). ' +
      'The page also details Possible Optimizations & No Ultimate Rotation (not transcribed).',
    steps: [
      { skillId: '1002206', motionName: 'DMG', forteLevel: 10 },
      { skillId: '1002201', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1002201', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1002201', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1002202', motionName: 'Press DMG', forteLevel: 10 },
      { skillId: '1002207', motionName: 'HA - Conjuration DMG', forteLevel: 10 },
      {
        skillId: '1002207',
        motionName: 'Stroke of Genius DMG',
        forteLevel: 10,
        note: 'Guide: Jump Cancel (no cancel model; full motion scores).',
      },
      {
        skillId: '1002207',
        motionName: 'Stroke of Genius DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1002203', motionName: 'Inklit Spirit DMG', forteLevel: 10 },
      {
        skillId: '1002207',
        motionName: "Creation's Zenith DMG",
        forteLevel: 10,
        note: 'Guide: Dash cancel into Echo, Swap, Outro on Moonlit Clouds, or Swap and Outro on Empyrean Anthem (no cancel model; full motion scores).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002209', motionName: '', forteLevel: 10 },
    ],
  },
];
