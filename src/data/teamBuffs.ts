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
 * Fully excluded characters live in `TEAM_BUFF_EXCLUSIONS` (id →
 * dated reason, re-read 2026-09-17) so the gap is explicit, not silent;
 * the coverage test asserts the map matches the uncovered roster exactly.
 * Partial exclusions (characters WITH entries, one rider untranscribed):
 * Denia's Fusion-Burst branch (Fusion Burst is unmodeled anywhere in the
 * codebase — no bucket) and Suisui's status-cap rider on `1005703`
 * (same skill as the transcribed Landscape entry; no cap bucket).
 * Stack-cap raises (Rover: Aero, Chisa, Luuk/Qingxiao Tune +1) stay out:
 * caps are a validation-only clamp with no `StatKey` and no team input
 * path — a follow-up feature, not an audit fix. RES-shred riders
 * (Phoebe, Suisui) transcribe as negative `resistancePenetration` per
 * the shred-sign convention (schema.ts); Youhu's coordinated-attack amp
 * transcribes to `dmgBonus:coordinated` (Decision 3). Flat team ATK with
 * an ally-stat requirement transcribes at cap with the requirement
 * disclosed (Shorekeeper Stellarealm, Roccia Liberation).
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
  { characterId: 'roccia', kind: 'other', label: 'Roccia Liberation (team, capped)', skillId: '1002703', windowSeconds: 30, target: 'team', mods: [{ stat: 'atk', value: 200 }], assumption: 'At cap (Roccia Crit Rate ≥70%): +1 ATK per 0.1% over 50%, up to 200.' },
];

/**
 * Fully excluded characters (no transcribable team buff anywhere in the
 * kit): id → one-line reason quoting the deciding wording. Re-read
 * 2026-09-17 against the coordinated/shred/DEF-ignore/amplify buckets;
 * the coverage test fails if this map drifts from the uncovered roster
 * in either direction, so converts must delete their row here.
 */
export const TEAM_BUFF_EXCLUSIONS: Record<string, string> = {
  yangyang: 'Outro restores Resonance Energy (4/s for 5s) — no energy model. (1000109)',
  chixia: 'Damage-only outro (530% Fusion). (1000209)',
  'rover-spectro': 'Stasis zone (crowd control), no sheet buff. (1000609)',
  encore: 'DoT-field off-field damage; Mayhem is self damage-reduction. (1000709/1000707)',
  jiyan: 'Coordinated lance deals its own damage (313.40% ATK), not an amp. (1001109)',
  camellya: 'Damage-only outro (329.24% + Ephemeral conditional). (1001309)',
  calcharo: 'Phantom off-field damage. (1001409)',
  lingyang: 'Damage-only outro (587.94% Glacio). (1001809)',
  yuanwu: 'Outro is stagger utility; Liberation shares interrupt-resist only. (1001609/1001603/1001607)',
  'rover-havoc': 'DoT-field off-field damage. (1001709)',
  jinhsi: 'Eras in Unity feeds her own Incandescence; outro accelerates own gain. (1002007/1002009)',
  'xiangli-yao': 'Triggered-laser off-field damage. (1002309)',
  carlotta: 'Damage-only outro (794.2% Glacio). (1002809)',
  galbrena: 'Damage-only outro. (1004009)',
  chisa: 'Outro raises status caps (+3); no cap bucket. (1004209)',
  'luuk-herssen': 'Damage-only outro; Golden Rule feeds own resources; Tune cap unmodeled. (1004709/1004707/1004710)',
  sigrika: 'Damage-only outro + Stagnate utility (no bucket). (1005109)',
  'rover-aero': 'Outro raises the Aero Erosion cap (+3); no cap bucket. Kit heals have no scoring. (1003209)',
  qingxiao: 'Damage-only outro; Mindlock amp is self-only; Tune cap unmodeled. (1005809/1005807/1005810)',
  jingran: 'Damage-only outro; kit is self-state/self-Qi. (1005909)',
};
