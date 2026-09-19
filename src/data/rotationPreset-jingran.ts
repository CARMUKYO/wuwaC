import type { RotationPreset } from './rotationPresets.ts';

/**
 * Jingran presets. Transcribed from Prydwen's Rotation & How to play section.
 * The guide's Yin/Yang basics map to the Drink Soul / Devil's Bane snapshot
 * motions (Yin Vessel and Yang Font states, per the basic-attack prose).
 */
export const JINGRAN_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'jingran-prydwen-standard',
    characterId: 'jingran',
    label: 'Standard Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/jingran',
    notes:
      'Transcribed from the Rotation & How to play section (verified live 2026-09-19). ' +
      'Yin basics are Drink Soul stages (Yin Vessel state); the guide-numbered Yang stages would be ' +
      "Devil's Bane stages (Yang Font state). " +
      'Forte heavies map to the base Soul Raid / Stardome Meander motions, never the per-1,000-Max-HP ' +
      'parameter rows; the enhanced multipliers live in skill prose, same as the Aemeath exemplar. ' +
      'Yinghuo-triggered Chimei Wangliang hits (once per Forte heavy, per the liberation prose) are not ' +
      'separate guide steps and are omitted. ' +
      'Omitted: the freely-timed Myriad Snare echo summon (echo skill). ' +
      'The page also details an S2+ Rotation (not transcribed).',
    steps: [
      // Guide: "Intro".
      { skillId: '1005906', motionName: 'Skill DMG', forteLevel: 10 },
      // Guide: "Ultimate".
      { skillId: '1005903', motionName: 'Burial of Thousand Souls DMG', forteLevel: 10 },
      // Guide: "Heavy: Stardome Meander".
      { skillId: '1005907', motionName: 'Heavy Attack - Stardome Meander DMG', forteLevel: 10 },
      // Guide: "Basic: Yin 2".
      { skillId: '1005901', motionName: 'Basic Attack - Drink Soul Stage 2 DMG', forteLevel: 10 },
      // Guide: "Basic: Yin 3".
      { skillId: '1005901', motionName: 'Basic Attack - Drink Soul Stage 3 DMG', forteLevel: 10 },
      // Guide: "Basic: Yin 4".
      { skillId: '1005901', motionName: 'Basic Attack - Drink Soul Stage 4 DMG', forteLevel: 10 },
      // Guide: "Heavy: Soul Raid".
      { skillId: '1005907', motionName: 'Heavy Attack - Soul Raid DMG', forteLevel: 10 },
      // Guide: "Skill: Scorching Yang".
      { skillId: '1005902', motionName: 'Scorching Yang DMG', forteLevel: 10 },
      // Guide: "Basic: Afterlife's Guide" (a skill motion in the snapshot).
      { skillId: '1005902', motionName: "Afterlife's Guide DMG", forteLevel: 10 },
      // Guide: "Heavy: Stardome Meander".
      { skillId: '1005907', motionName: 'Heavy Attack - Stardome Meander DMG', forteLevel: 10 },
      // Guide: "Skill: Encroaching Yin".
      { skillId: '1005902', motionName: 'Encroaching Yin DMG', forteLevel: 10 },
      // Guide: "Basic: Netherworld Traverse" (a skill motion in the snapshot).
      { skillId: '1005902', motionName: 'Netherworld Traverse DMG', forteLevel: 10 },
      // Guide: "Heavy: Soul Raid".
      { skillId: '1005907', motionName: 'Heavy Attack - Soul Raid DMG', forteLevel: 10 },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1005909', motionName: '', forteLevel: 10 },
    ],
  },
];
