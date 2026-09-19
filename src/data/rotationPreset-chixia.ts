import type { RotationPreset } from './rotationPresets.ts';

/**
 * Chixia presets. Transcribed from Prydwen's Rotation > BURST COMBO (the
 * page's main combo; Warm Up is prose guidance with no fixed combo).
 */
export const CHIXIA_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'chixia-prydwen-burst-combo',
    characterId: 'chixia',
    label: 'BURST COMBO',
    sourceName: 'Prydwen',
    sourceUrl: 'https://www.prydwen.gg/wuthering-waves/characters/chixia',
    notes:
      'Transcribed from the Rotation > BURST COMBO section (verified live 2026-09-19). ' +
      'Omitted: the opening Echo step (echo-skill, user echo-dependent). ' +
      'The page also details WARM UP guidance (prose, no fixed combo; not transcribed).',
    steps: [
      { skillId: '1000206', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1000207',
        motionName: 'Thermobaric Bullets Damage',
        forteLevel: 10,
        note: 'Guide: Skill: Forte: Thermobaric Bullets (forte channel entered via held Skill).',
      },
      {
        skillId: '1000207',
        motionName: 'Boom Boom Damage',
        forteLevel: 10,
        note: 'Guide: Skill: Forte: BOOM BOOM (tap Basic Attack at the gauge indicator).',
      },
      { skillId: '1000203', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1000207',
        motionName: 'Thermobaric Bullets Damage',
        forteLevel: 10,
        note: 'Guide: Skill: Forte: Thermobaric Bullets (second full forte channel).',
      },
      {
        skillId: '1000207',
        motionName: 'Boom Boom Damage',
        forteLevel: 10,
        note: 'Guide: Skill: Forte: BOOM BOOM.',
      },
      // Guide: "Outro". Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1000209', motionName: '', forteLevel: 10 },
    ],
  },
];
