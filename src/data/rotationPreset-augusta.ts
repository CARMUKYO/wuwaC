import type { RotationPreset } from './rotationPresets.ts';

/**
 * Augusta presets. Transcribed from Prydwen's Rotation & How to play > 3
 * Forte Rotation (the page's majority-teams rotation, including her best
 * team with Iuno and Shorekeeper).
 */
export const AUGUSTA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'augusta-prydwen-3-forte-rotation',
    characterId: 'augusta',
    label: '3 Forte Rotation',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/augusta',
    notes:
      'Transcribed from the Rotation & How to play > 3 Forte Rotation section (verified live 2026-09-19). ' +
      'Omitted: the "Hold Ultimate: Sublime is the Sun" stance-entry line (no snapshot motion; stance damage scores via Sunborne x9 + Everbright Protector). ' +
      'Bare "Heavy" lines map to Heavy Attack: Steelclash per page prose (regular Heavies rebuild Prowess and are quickly cancelled). ' +
      'The page also details a Fastest Rotation, a 4 Forte Single Intro Rotation, a Tune Break opener variant, and Double Intro quickswap notes (not transcribed).',
    steps: [
      { skillId: '1003906', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1003901', motionName: 'Heavy Attack - Thunderoar: Backstep DMG', forteLevel: 10 },
      {
        skillId: '1003901',
        motionName: 'Heavy Attack - Thunderoar: Spinslash DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Spinslash (Normal Attack follow-up to Backstep).',
      },
      { skillId: '1003902', motionName: 'Skill DMG', forteLevel: 10 },
      { skillId: '1003901', motionName: 'Heavy Attack - Thunderoar: Backstep DMG', forteLevel: 10 },
      {
        skillId: '1003901',
        motionName: 'Heavy Attack - Thunderoar: Spinslash DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Spinslash (Normal Attack follow-up to Backstep).',
      },
      {
        skillId: '1003901',
        motionName: 'Heavy Attack: Steelclash DMG',
        forteLevel: 10,
        note: 'Guide: Heavy, cancel animation endlag via Ultimate (no cancel model; full motion scores).',
      },
      {
        skillId: '1003903',
        motionName: 'Resonance Liberation - Sword of Eternal Oath DMG',
        forteLevel: 10,
      },
      {
        skillId: '1003901',
        motionName: 'Heavy Attack: Steelclash DMG',
        forteLevel: 10,
        note: 'Guide: Heavy, cancel animation endlag via Skill (no cancel model; full motion scores).',
      },
      {
        skillId: '1003907',
        motionName: 'Resonance Skill - Undying Sunlight: Strike DMG',
        forteLevel: 10,
      },
      {
        skillId: '1003907',
        motionName: 'Resonance Skill - Undying Sunlight: Leap DMG',
        forteLevel: 10,
      },
      {
        skillId: '1003907',
        motionName: 'Resonance Skill - Undying Sunlight: Plunge DMG',
        forteLevel: 10,
        note: 'Guide: cancel animation endlag via Hold Ultimate (no cancel model; full motion scores).',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Sunborne DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Sunborne (9x), hit 1 of 9.',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Sunborne DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Sunborne (9x), hit 2 of 9.',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Sunborne DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Sunborne (9x), hit 3 of 9.',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Sunborne DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Sunborne (9x), hit 4 of 9.',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Sunborne DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Sunborne (9x), hit 5 of 9.',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Sunborne DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Sunborne (9x), hit 6 of 9.',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Sunborne DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Sunborne (9x), hit 7 of 9.',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Sunborne DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Sunborne (9x), hit 8 of 9.',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Sunborne DMG',
        forteLevel: 10,
        note: 'Guide: Basic: Sunborne (9x), hit 9 of 9.',
      },
      {
        skillId: '1003903',
        motionName: 'Sublime is the Sun - Everbright Protector DMG',
        forteLevel: 10,
      },
      {
        skillId: '1003901',
        motionName: 'Heavy Attack - Thunderoar: Uppercut DMG',
        forteLevel: 10,
        note: 'Guide: Jump: Uppercut (swap on final hit to keep Outro buffs).',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1003909', motionName: '', forteLevel: 10 },
    ],
  },
];
