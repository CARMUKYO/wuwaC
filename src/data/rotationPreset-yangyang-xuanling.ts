import type { RotationPreset } from './rotationPresets.ts';

/**
 * Yangyang: Xuanling presets. Transcribed from the Rotation & Gameplay
 * section, Standard Rotation (verified live 2026-09-19). Stance switches
 * use the Resonance Skill Sword Stance Switch rows (skill prose); the
 * Feather heavies, Feather Fall, and Havoc in Bloom chain use the forte
 * rows. The Liberation step scores the Hush hit only. The opener Summon
 * Echo is omitted as user echo-dependent. The page also details Double
 * Feather quickswap variants (not transcribed).
 */
export const YANGYANG_XUANLING_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'yangyang-xuanling-prydwen-standard',
    characterId: 'yangyang-xuanling',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/yangyang-xuanling',
    notes:
      'Transcribed from the Rotation & Gameplay section, Standard Rotation (verified live 2026-09-19). ' +
      'Omitted: the opener Summon Echo (user echo-dependent). ' +
      'The page also details Double Feather quickswap variants (not transcribed).',
    steps: [
      { skillId: '1005406', motionName: 'Skybound Feather DMG', forteLevel: 10 },
      { skillId: '1005401', motionName: 'Basic Attack - Azure Sword Stance Stage 1 DMG', forteLevel: 10 },
      { skillId: '1005401', motionName: 'Basic Attack - Azure Sword Stance Stage 2 DMG', forteLevel: 10 },
      { skillId: '1005401', motionName: 'Basic Attack - Azure Sword Stance Stage 3 DMG', forteLevel: 10 },
      { skillId: '1005401', motionName: 'Basic Attack - Azure Sword Stance Stage 4 DMG', forteLevel: 10 },
      { skillId: '1005402', motionName: 'Sword Stance Switch: Feather DMG', forteLevel: 10 },
      { skillId: '1005407', motionName: 'Heavy Attack - Feather Sword Stance DMG', forteLevel: 10 },
      { skillId: '1005407', motionName: 'Mid-air Attack - Feather Sword Stance: Feather Fall DMG', forteLevel: 10 },
      { skillId: '1005407', motionName: 'Basic Attack - Havoc in Bloom Stage 1 DMG', forteLevel: 10 },
      { skillId: '1005407', motionName: 'Basic Attack - Havoc in Bloom Stage 2 DMG', forteLevel: 10 },
      {
        skillId: '1005407',
        motionName: 'Basic Attack - Havoc in Bloom Stage 3 DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      { skillId: '1005403', motionName: 'Hush of a Thousand Voices DMG', forteLevel: 10 },
      { skillId: '1005402', motionName: 'Sword Stance Switch: Azure DMG', forteLevel: 10 },
      { skillId: '1005407', motionName: 'Heavy Attack - Azure Sword Stance DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1005409', motionName: '', forteLevel: 10 },
    ],
  },
];
