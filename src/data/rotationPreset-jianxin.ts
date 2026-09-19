import type { RotationPreset } from './rotationPresets.ts';

/**
 * Jianxin presets. Transcribed from Game8's Jianxin Recommended Combos >
 * Optimal Rotation Combo (the Prydwen Jianxin page carries only prose
 * priority bullets, verified live 2026-09-19 — no step-by-step rotation).
 */
export const JIANXIN_ROTATION_PRESETS: RotationPreset[] = [
  {
    id: 'jianxin-game8-optimal-rotation-combo',
    characterId: 'jianxin',
    label: 'Optimal Rotation Combo',
    sourceName: 'Game8',
    sourceUrl: 'https://game8.co/games/Wuthering-Waves/archives/454213',
    notes:
      'Transcribed from the Jianxin Recommended Combos > Optimal Rotation Combo section (verified live 2026-09-19). ' +
      'Omitted: the Echo step (echo-skill, user echo-dependent); Pushing Punch and Yielding Pull (forte prose: cast only when Zhoutian Progress is interrupted, while the guide holds until the natural end); ' +
      'Chi Counter (needs an enemy attack during Parry Stance; the guide hold-release is Chi Parry). ' +
      'The Prydwen Jianxin page (https://www.prydwen.gg/wuthering-waves/characters/jianxin) has no step-by-step rotation, only priority bullets.',
    steps: [
      { skillId: '1001906', motionName: 'Skill DMG', forteLevel: 10 },
      {
        skillId: '1001903',
        motionName: 'Resonance Liberation Continuous Damage',
        forteLevel: 10,
        note: 'Guide: Res. Lib (one block for the wind-field ticks; same cast as the explosion).',
      },
      { skillId: '1001903', motionName: 'Resonance Liberation Explosion Damage', forteLevel: 10 },
      {
        skillId: '1001902',
        motionName: 'Chi Parry Damage',
        forteLevel: 10,
        note: 'Guide: Res. Skill (Hold). Hold-release casts Chi Parry (skill prose); Chi Counter needs an enemy attack.',
      },
      { skillId: '1001901', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1001901', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1001901', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1001901', motionName: 'Stage 4 DMG', forteLevel: 10 },
      { skillId: '1001901', motionName: 'Stage 1 DMG', forteLevel: 10 },
      { skillId: '1001901', motionName: 'Stage 2 DMG', forteLevel: 10 },
      { skillId: '1001901', motionName: 'Stage 3 DMG', forteLevel: 10 },
      { skillId: '1001901', motionName: 'Stage 4 DMG', forteLevel: 10 },
      {
        skillId: '1001907',
        motionName: 'Zhoutian Progress Continuous Damage',
        forteLevel: 10,
        note: 'Guide: hold Heavy Attack until the animation ends (one block; Chi-Strike ticks not enumerated).',
      },
      { skillId: '1001907', motionName: 'Minor Zhoutian Shock Damage', forteLevel: 10 },
      { skillId: '1001907', motionName: 'Major Zhoutian: Inner Shock Damage', forteLevel: 10 },
      { skillId: '1001907', motionName: 'Major Zhoutian: Outer Shock Damage', forteLevel: 10 },
      // Guide: "Outro" (switch to the DPS). Motion-less outro skill: buff-carrier block (0 damage).
      { skillId: '1001909', motionName: '', forteLevel: 10 },
    ],
  },
];
