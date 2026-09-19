import type { RotationPreset } from './rotationPresets.ts';

/**
 * Sanhua presets. Transcribed from the Rotation section, HEAVY ATTACK
 * CONCERTO ROTATION — the variant the page says sees far more play
 * (verified live 2026-09-19). Each Detonate step maps to the Detonate
 * damage row; the construct Ice Burst rows are detonation effects, not
 * separately listed rotation steps. The page also details an S5+ HEAVY
 * ATK CONCERTO ROTATION and a BASIC ATTACK CONCERTO ROTATION (not
 * transcribed).
 */
export const SANHUA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'sanhua-prydwen-heavy-attack-concerto',
    characterId: 'sanhua',
    label: 'HEAVY ATTACK CONCERTO ROTATION',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/sanhua',
    notes:
      'Transcribed from the Rotation section, HEAVY ATTACK CONCERTO ROTATION (verified live 2026-09-19). ' +
      'Detonate steps score the Detonate row only; construct Ice Burst rows are detonation effects, not listed steps. ' +
      'The page also details an S5+ HEAVY ATK CONCERTO ROTATION and a BASIC ATTACK CONCERTO ROTATION (not transcribed).',
    steps: [
      { skillId: '1000506', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000503', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000502', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000507', motionName: 'Detonate Damage', forteLevel: 10 },
      { skillId: '1000507', motionName: 'Detonate Damage', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1000509', motionName: '', forteLevel: 10 },
    ],
  },
];
