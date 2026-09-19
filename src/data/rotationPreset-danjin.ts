import type { RotationPreset } from './rotationPresets.ts';

/**
 * Danjin presets. Transcribed from Prydwen's Rotation > HYBRID COMBO (the
 * page's easy no-strings-attached combo; Damage Dealer and Fast Hybrid
 * are longer/complex variants).
 */
export const DANJIN_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'danjin-prydwen-hybrid-combo',
    characterId: 'danjin',
    label: 'HYBRID COMBO',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/danjin',
    notes:
      'Transcribed from the Rotation > HYBRID COMBO section (verified live 2026-09-19). ' +
      'Omitted: the Echo step (echo-skill, user echo-dependent). ' +
      'The single Ultimate line maps to both liberation rows: skill prose states one cast performs consecutive attacks plus 1 Scarlet Burst. ' +
      'Partial Power maps to the base Chaoscleave/Scatterbloom rows (Full Energy rows are the full-power variants); healing rows are never mapped. ' +
      'The page also details MAINTENANCE upkeep, a DAMAGE DEALER COMBO, and a FAST HYBRID COMBO (not transcribed).',
    steps: [
      { skillId: '1000806', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000802', motionName: 'Crimson Erosion Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000802', motionName: 'Crimson Erosion Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000803', motionName: 'Consecutive Attack DMG', forteLevel: 10 },
      {
        skillId: '1000803',
        motionName: 'Scarlet Burst Damage',
        forteLevel: 10,
        note: 'Guide: same Ultimate cast (skill prose: consecutive attacks plus 1 Scarlet Burst).',
      },
      { skillId: '1000802', motionName: 'Carmine Gleam Damage', forteLevel: 10 },
      { skillId: '1000801', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000801', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1000802', motionName: 'Sanguine Pulse Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000802', motionName: 'Sanguine Pulse Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000802', motionName: 'Sanguine Pulse Stage 3 DMG', forteLevel: 10 },
      {
        skillId: '1000807',
        motionName: 'Chaoscleave Damage',
        forteLevel: 10,
        note: 'Guide: Heavy Attack: Chaoscleave (Partial Power) — base row, not the Full Energy row.',
      },
      {
        skillId: '1000807',
        motionName: 'Scatterbloom Damage',
        forteLevel: 10,
        note: 'Guide: Heavy Attack: Scatterbloom (Partial Power) — base row, not the Full Energy row.',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1000809', motionName: '', forteLevel: 10 },
    ],
  },
];
