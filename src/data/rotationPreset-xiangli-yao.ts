import type { RotationPreset } from './rotationPresets.ts';

/**
 * Xiangli Yao presets. Transcribed from the Rotation section, Standard
 * Rotation (verified live 2026-09-19). Liberation-stance basics/skills use
 * the Cogitation Model rows (Pivot - Impale, Divergence); the enhanced
 * forte skills use the Law of Reigns / Revamp rows (forte skill prose).
 * The Echo window is omitted as user echo-dependent. The page also
 * details Advanced Tips & Tricks quickswap optimizations (not
 * transcribed).
 */
export const XIANGLI_YAO_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'xiangli-yao-prydwen-standard',
    characterId: 'xiangli-yao',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/xiangli-yao',
    notes:
      'Transcribed from the Rotation section, Standard Rotation (verified live 2026-09-19). ' +
      'Omitted: the Echo window after the last Law of Reigns (user echo-dependent). ' +
      'The page also details Advanced Tips & Tricks quickswap optimizations (not transcribed).',
    steps: [
      { skillId: '1002306', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1002302',
        motionName: 'Skill DMG',
        forteLevel: 10,
        note: 'Guide: instantly cancelled with Ultimate; the small hit is lost but Concerto and the set effect still apply (no cancel model; full motion scores).',
      },
      { skillId: '1002303', motionName: 'Cogitation Model DMG', forteLevel: 10 },
      { skillId: '1002303', motionName: 'Divergence DMG', forteLevel: 10 },
      { skillId: '1002307', motionName: 'Revamp DMG', forteLevel: 10 },
      { skillId: '1002307', motionName: 'Law of Reigns DMG', forteLevel: 10 },
      { skillId: '1002303', motionName: 'Pivot - Impale Stage 1 DMG', forteLevel: 10 },
      { skillId: '1002303', motionName: 'Pivot - Impale Stage 2 DMG', forteLevel: 10 },
      { skillId: '1002303', motionName: 'Pivot - Impale Stage 3 DMG', forteLevel: 10 },
      { skillId: '1002307', motionName: 'Law of Reigns DMG', forteLevel: 10 },
      { skillId: '1002303', motionName: 'Divergence DMG', forteLevel: 10 },
      { skillId: '1002307', motionName: 'Revamp DMG', forteLevel: 10 },
      { skillId: '1002307', motionName: 'Law of Reigns DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002309', motionName: '', forteLevel: 10 },
    ],
  },
];
