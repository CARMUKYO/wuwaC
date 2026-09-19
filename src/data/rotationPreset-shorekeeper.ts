import type { RotationPreset } from './rotationPresets.ts';

/**
 * Shorekeeper presets. Transcribed from the Rotation section, Standard
 * Rotation (verified live 2026-09-19). Form-picked: the guide names Intro
 * Skill Discernment, so the Discernment row is used, not Enlightenment
 * (intro skill prose). The Liberation step is healing-only in the
 * snapshot, so it is omitted per the no-healing-rows rule; the Echo step
 * is omitted as user echo-dependent. The page also details an Opener
 * Rotation (not transcribed).
 */
export const SHOREKEEPER_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'shorekeeper-prydwen-standard',
    characterId: 'shorekeeper',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/the-shorekeeper',
    notes:
      'Transcribed from the Rotation section, Standard Rotation (verified live 2026-09-19). ' +
      'Omitted: the Liberation step (healing-only snapshot row) and the Echo step (user echo-dependent). ' +
      'The page also details an Opener Rotation (not transcribed).',
    steps: [
      // Guide: "Intro Skill: Discernment". Form-picked per the guide label.
      { skillId: '1002506', motionName: 'Discernment DMG', forteLevel: 10 },
      { skillId: '1002501', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1002501', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1002501', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1002501', motionName: 'Stage 4 DMG', forteLevel: 10 },
      { skillId: '1002507', motionName: 'Illation DMG', forteLevel: 10 },
      // Guide: "Skill: Chaos Theory". Healing row omitted per the no-healing-rows rule.
      { skillId: '1002502', motionName: 'Dim Star Butterfly DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1002509', motionName: '', forteLevel: 10 },
    ],
  },
];
