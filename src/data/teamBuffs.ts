import type { StatKey } from './schema.ts';

/**
 * Curated team-buff table (Team v2 data layer).
 *
 * One entry per transcribable Outro skill (all 58 characters checked
 * against the 2026-09-12 snapshot) plus the handful of non-Outro team
 * buffs with concrete numbers (Lynae's Liberation, Shorekeeper's
 * Stellarealm caps, Lupa's Pack Hunt base, Rover: Electro's Overshock,
 * Suisui's Bane-gated DEF ignore). Values are transcribed from snapshot
 * skill descriptions, never from memory; `skillId` is the provenance.
 * A test asserts every character/skill id still resolves.
 *
 * Mapping rules (same as buff presets): "X DMG Amplified" for an element
 * or action type scores in the additive `dmgBonus:*` bucket (reference
 * doc §6 has a single global amplify term); unqualified "DMG Amplified"
 * / "All DMG Amplification" maps to `amplify`.
 *
 * Intentionally absent (recorded here so the gap is explicit, not
 * silent): energy-restore outros (Yangyang), heal-only outros, damage-only
 * outros (Chixia, Camellya, Carlotta, Galbrena, Luuk Herssen, Qingxiao,
 * Jingran), zone/coordinated/off-field outoros without a sheet buff
 * (Rover: Spectro, Encore, Lingyang, Yuanwu, Rover: Havoc, Jinhsi,
 * Xiangli Yao, Calcharo, Jiyan, Rover: Aero, Chisa, Sigrika),
 * Denia's Fusion-Burst branch (no bucket), Roccia's Liberation (flat
 * points scaling off her own Crit Rate — needs her stats, not
 * transcribable), and Suisui's status-cap rider. RES-shred riders
 * (Phoebe, Suisui) transcribe as negative `resistancePenetration` per
 * the shred-sign convention (schema.ts); Youhu's coordinated-attack amp
 * transcribes to `dmgBonus:coordinated` (Decision 3).
 */

export type TeamBuffTarget = 'incoming' | 'team';

export interface TeamBuffEntry {
  characterId: string;
  /** 'outro' for Outro-skill effects, 'other' for the rest (Liberation etc.). */
  kind: 'outro' | 'other';
  label: string;
  /** Snapshot skill id carrying the source wording (provenance). */
  skillId: string;
  windowSeconds?: number;
  target: TeamBuffTarget;
  mods: { stat: StatKey; value: number }[];
  assumption?: string;
}

export const TEAM_BUFFS: TeamBuffEntry[] = [
  { characterId: 'verina', kind: 'outro', label: 'Verina Outro (team)', skillId: '1000309', windowSeconds: 30, target: 'team', mods: [{ stat: 'amplify', value: 0.15 }] },
  { characterId: 'sanhua', kind: 'outro', label: 'Sanhua Outro (incoming)', skillId: '1000509', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:basic', value: 0.38 }] },
  { characterId: 'taoqi', kind: 'outro', label: 'Taoqi Outro (incoming)', skillId: '1000909', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:skill', value: 0.38 }] },
  { characterId: 'baizhi', kind: 'outro', label: 'Baizhi Outro (incoming)', skillId: '1000409', windowSeconds: 6, target: 'incoming', mods: [{ stat: 'amplify', value: 0.15 }], assumption: 'On the healed resonator.' },
  { characterId: 'danjin', kind: 'outro', label: 'Danjin Outro (incoming)', skillId: '1000809', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:Havoc', value: 0.23 }] },
  { characterId: 'aalto', kind: 'outro', label: 'Aalto Outro (incoming)', skillId: '1001009', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:Aero', value: 0.23 }] },
  { characterId: 'mortefi', kind: 'outro', label: 'Mortefi Outro (incoming)', skillId: '1001209', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:heavy', value: 0.38 }] },
  { characterId: 'yinlin', kind: 'outro', label: 'Yinlin Outro (incoming)', skillId: '1001509', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:Electro', value: 0.20 }, { stat: 'dmgBonus:liberation', value: 0.25 }] },
  { characterId: 'jianxin', kind: 'outro', label: 'Jianxin Outro (incoming)', skillId: '1001909', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:liberation', value: 0.38 }] },
  { characterId: 'changli', kind: 'outro', label: 'Changli Outro (incoming)', skillId: '1002109', windowSeconds: 10, target: 'incoming', mods: [{ stat: 'dmgBonus:Fusion', value: 0.20 }, { stat: 'dmgBonus:liberation', value: 0.25 }] },
  { characterId: 'zhezhi', kind: 'outro', label: 'Zhezhi Outro (incoming)', skillId: '1002209', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:Glacio', value: 0.20 }, { stat: 'dmgBonus:skill', value: 0.25 }] },
  { characterId: 'lumi', kind: 'outro', label: 'Lumi Outro (incoming)', skillId: '1002609', windowSeconds: 10, target: 'incoming', mods: [{ stat: 'dmgBonus:skill', value: 0.38 }] },
  { characterId: 'shorekeeper', kind: 'outro', label: 'Shorekeeper Outro (team)', skillId: '1002509', windowSeconds: 30, target: 'team', mods: [{ stat: 'amplify', value: 0.15 }], assumption: 'Butterfly circle active; excludes the dodge-recovery utility.' },
  { characterId: 'roccia', kind: 'outro', label: 'Roccia Outro (incoming)', skillId: '1002709', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:Havoc', value: 0.20 }, { stat: 'dmgBonus:basic', value: 0.25 }] },
  { characterId: 'brant', kind: 'outro', label: 'Brant Outro (incoming)', skillId: '1002909', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:Fusion', value: 0.20 }, { stat: 'dmgBonus:skill', value: 0.25 }] },
  { characterId: 'phoebe', kind: 'outro', label: 'Phoebe Outro (Confession team)', skillId: '1003009', windowSeconds: 30, target: 'team', mods: [{ stat: 'negativeStatusAmplify', value: 1.00 }, { stat: 'resistancePenetration', value: -0.10 }], assumption: 'Confession state; Spectro Frazzle DMG only; 10% Spectro shred scored sheet-wide (penetration is element-agnostic).' },
  { characterId: 'cantarella', kind: 'outro', label: 'Cantarella Outro (incoming)', skillId: '1003109', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:Havoc', value: 0.20 }, { stat: 'dmgBonus:skill', value: 0.25 }] },
  { characterId: 'ciaccona', kind: 'outro', label: 'Ciaccona Outro (team)', skillId: '1003409', windowSeconds: 30, target: 'team', mods: [{ stat: 'negativeStatusAmplify', value: 1.00 }], assumption: 'Aero Erosion DMG only.' },
  { characterId: 'zani', kind: 'outro', label: 'Zani Outro (team, marked)', skillId: '1003309', windowSeconds: 20, target: 'team', mods: [{ stat: 'dmgBonus:Spectro', value: 0.20 }], assumption: 'Vs the Heliacal Ember-marked target.' },
  { characterId: 'lupa', kind: 'outro', label: 'Lupa Outro (incoming)', skillId: '1003609', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:Fusion', value: 0.20 }, { stat: 'dmgBonus:basic', value: 0.25 }] },
  { characterId: 'phrolova', kind: 'outro', label: 'Phrolova Outro (incoming)', skillId: '1003709', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:Havoc', value: 0.20 }, { stat: 'dmgBonus:heavy', value: 0.25 }], assumption: 'Excludes the Maestro-state Hecate rider.' },
  { characterId: 'cartethyia', kind: 'outro', label: 'Cartethyia Outro (team)', skillId: '1003509', windowSeconds: 20, target: 'team', mods: [{ stat: 'dmgBonus:Aero', value: 0.175 }], assumption: 'Active resonator (not Cartethyia/Fleurdelys) vs Negative-Status targets.' },
  { characterId: 'augusta', kind: 'outro', label: 'Augusta Outro (incoming)', skillId: '1003909', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'amplify', value: 0.15 }], assumption: 'All-Attribute amp; excludes Majesty/Crown of Wills.' },
  { characterId: 'iuno', kind: 'outro', label: 'Iuno Outro (incoming)', skillId: '1003809', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:heavy', value: 0.50 }] },
  { characterId: 'buling', kind: 'outro', label: 'Buling Outro (team)', skillId: '1004309', windowSeconds: 30, target: 'team', mods: [{ stat: 'amplify', value: 0.15 }] },
  { characterId: 'youhu', kind: 'outro', label: 'Youhu Outro (incoming)', skillId: '1002409', windowSeconds: 28, target: 'incoming', mods: [{ stat: 'dmgBonus:coordinated', value: 1.00 }] },
  { characterId: 'qiuyuan', kind: 'outro', label: 'Qiuyuan Outro (incoming)', skillId: '1004109', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:echo', value: 0.50 }] },
  { characterId: 'lynae', kind: 'outro', label: 'Lynae Outro (incoming)', skillId: '1004509', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'amplify', value: 0.15 }, { stat: 'dmgBonus:liberation', value: 0.25 }], assumption: '"Liberation Amplification" in the additive bucket (no per-type amplify term).' },
  { characterId: 'lynae', kind: 'other', label: 'Lynae Liberation (team)', skillId: '1004503', windowSeconds: 30, target: 'team', mods: [{ stat: 'amplify', value: 0.24 }] },
  { characterId: 'mornye', kind: 'outro', label: 'Mornye Outro (team)', skillId: '1004409', windowSeconds: 30, target: 'team', mods: [{ stat: 'amplify', value: 0.25 }] },
  { characterId: 'aemeath', kind: 'outro', label: 'Aemeath Outro (team)', skillId: '1004609', windowSeconds: 20, target: 'team', mods: [{ stat: 'amplify', value: 0.10 }], assumption: 'Base 10%; Rupture/Burst inflicters gain 20% instead (add a custom buff).' },
  { characterId: 'denia', kind: 'outro', label: 'Denia Outro (incoming, Strain mode)', skillId: '1005309', windowSeconds: 16, target: 'incoming', mods: [{ stat: 'amplify', value: 0.15 }], assumption: 'Tune Strain mode; 40% after the incoming resonator inflicts Strain - Shifting (add a custom buff). Excludes the Fusion-Burst branch.' },
  { characterId: 'rebecca', kind: 'outro', label: 'Rebecca Outro (incoming)', skillId: '1004809', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'amplify', value: 0.15 }], assumption: 'Edgerunner Bonds; excludes Overlimit stacks and the turret.' },
  { characterId: 'lucilla', kind: 'outro', label: 'Lucilla Outro (incoming, Echo mode)', skillId: '1005009', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:echo', value: 0.50 }], assumption: 'Resonance Mode - Echo; see the Chafe-mode team entry for the other mode.' },
  { characterId: 'lucilla', kind: 'outro', label: 'Lucilla Outro (team, Chafe mode)', skillId: '1005009', windowSeconds: 30, target: 'team', mods: [{ stat: 'negativeStatusAmplify', value: 0.60 }], assumption: 'Resonance Mode - Glacio Chafe; Chafe DMG only.' },
  { characterId: 'lucy', kind: 'outro', label: 'Lucy Outro (incoming)', skillId: '1004909', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'dmgBonus:basic', value: 0.25 }], assumption: 'Excludes Countermeasure Program (separate team entry).' },
  { characterId: 'lucy', kind: 'outro', label: 'Lucy Outro (team Countermeasure)', skillId: '1004909', windowSeconds: 25, target: 'team', mods: [{ stat: 'amplify', value: 0.20 }], assumption: 'When a teammate (not Lucy) inflicts Hack - Shifting; excludes the DMG-reduction rider.' },
  { characterId: 'hiyuki', kind: 'outro', label: 'Hiyuki Outro (team)', skillId: '1005209', windowSeconds: 20, target: 'team', mods: [{ stat: 'dmgBonus:Glacio', value: 0.20 }], assumption: 'Other teammates vs Glacio Chafe-affected targets.' },
  { characterId: 'rover-electro', kind: 'outro', label: 'Rover: Electro Outro (incoming)', skillId: '1005509', windowSeconds: 14, target: 'incoming', mods: [{ stat: 'amplify', value: 0.25 }], assumption: 'After the incoming resonator inflicts a Negative Status (consumes Electro Core).' },
  { characterId: 'yangyang-xuanling', kind: 'outro', label: 'Yangyang: Xuanling Outro (team)', skillId: '1005409', windowSeconds: 20, target: 'team', mods: [{ stat: 'dmgBonus:Havoc', value: 0.20 }], assumption: 'Tonal Switch holders after inflicting Havoc Bane.' },
  { characterId: 'suisui', kind: 'outro', label: 'Suisui Outro (team)', skillId: '1005709', windowSeconds: 30, target: 'team', mods: [{ stat: 'amplify', value: 0.25 }], assumption: 'Excludes the Energy-Regen-scaling rider.' },
  // ---- Non-Outro team buffs with concrete numbers ----
  { characterId: 'shorekeeper', kind: 'other', label: 'Shorekeeper Stellarealm (team, capped)', skillId: '1002503', target: 'team', mods: [{ stat: 'critRate', value: 0.125 }, { stat: 'critDmg', value: 0.25 }], assumption: 'Supernal Stellarealm at cap (needs ~250% Energy Regen).' },
  { characterId: 'lupa', kind: 'other', label: 'Lupa Pack Hunt base (team)', skillId: '1003603', windowSeconds: 35, target: 'team', mods: [{ stat: 'atkPct', value: 0.06 }], assumption: 'Base Pack Hunt; excludes the Intro enhancement and boss-gated Fusion bonus.' },
  { characterId: 'rover-electro', kind: 'other', label: 'Rover: Electro Overshock (team)', skillId: '1005507', windowSeconds: 20, target: 'team', mods: [{ stat: 'atkPct', value: 0.10 }], assumption: 'Overshock cast via the button.' },
  { characterId: 'suisui', kind: 'other', label: 'Suisui Landscape (team, Bane)', skillId: '1005703', windowSeconds: 30, target: 'team', mods: [{ stat: 'defIgnore', value: 0.06 }, { stat: 'resistancePenetration', value: -0.12 }], assumption: 'After consuming Havoc Bane; Havoc DEF-ignore + RES shred scored sheet-wide (penetration is element-agnostic).' },
];
