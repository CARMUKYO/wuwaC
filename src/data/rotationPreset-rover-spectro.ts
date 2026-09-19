import type { RotationPreset } from './rotationPresets.ts';

/**
 * Rover: Spectro presets. Transcribed from the Rotation section, BURST
 * COMBO (verified live 2026-09-19). Rover variants live on split Prydwen
 * pages; this preset is from the Rover (Spectro) page. The snapshot
 * carries duplicate Liberation/Forte skills; the Frazzle-applying
 * variants (1000613/1000617) are used per the guide's kit text (Ultimate
 * applies 6 Spectro Frazzle; Resonating Spin applies 2 plus Shimmer). The
 * mid-rotation Swap and the Echo timing are omitted. No other rotation is
 * detailed on the page.
 */
export const ROVER_SPECTRO_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'rover-spectro-prydwen-burst-combo',
    characterId: 'rover-spectro',
    label: 'BURST COMBO',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/rover-spectro',
    notes:
      'Transcribed from the Rotation section, BURST COMBO (verified live 2026-09-19). ' +
      'Uses the Frazzle-applying Liberation/Forte skill variants per the guide kit text. ' +
      'Omitted: the Swap while waiting for Skill CD (teammate field time) and the Echo timing step (user echo-dependent). ' +
      'No other rotation is detailed on the page.',
    steps: [
      { skillId: '1000601', motionName: 'Heavy Attack DMG', forteLevel: 10 },
      { skillId: '1000601', motionName: 'Heavy Attack - Resonance DMG', forteLevel: 10 },
      { skillId: '1000601', motionName: 'Heavy Attack - Aftertune DMG', forteLevel: 10 },
      { skillId: '1000617', motionName: 'Resonating Spin DMG', forteLevel: 10 },
      { skillId: '1000617', motionName: 'Resonating Whirl DMG', forteLevel: 10 },
      { skillId: '1000606', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000613', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1000601', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000601', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1000617', motionName: 'Resonating Spin DMG', forteLevel: 10 },
      { skillId: '1000617', motionName: 'Resonating Whirl DMG', forteLevel: 10 },
      { skillId: '1000617', motionName: 'Resonating Echoes Stage 1 DMG', forteLevel: 10 },
      { skillId: '1000617', motionName: 'Resonating Echoes Stage 2 DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1000609', motionName: '', forteLevel: 10 },
    ],
  },
];
