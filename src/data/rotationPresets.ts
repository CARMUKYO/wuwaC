import type { RotationBlockSpec } from './schema.ts';
import { AEMEATH_ROTATION_PRESETS } from './rotationPreset-aemeath.ts';
// -- auditor-1 zone: aalto..hiyuki (imports for rotationPreset-<id>.ts go here) --
import { AALTO_ROTATION_PRESETS } from './rotationPreset-aalto.ts';
import { AUGUSTA_ROTATION_PRESETS } from './rotationPreset-augusta.ts';
import { BAIZHI_ROTATION_PRESETS } from './rotationPreset-baizhi.ts';
import { BRANT_ROTATION_PRESETS } from './rotationPreset-brant.ts';
import { BULING_ROTATION_PRESETS } from './rotationPreset-buling.ts';
import { CALCHARO_ROTATION_PRESETS } from './rotationPreset-calcharo.ts';
import { CAMELLYA_ROTATION_PRESETS } from './rotationPreset-camellya.ts';
import { CANTARELLA_ROTATION_PRESETS } from './rotationPreset-cantarella.ts';
import { CARLOTTA_ROTATION_PRESETS } from './rotationPreset-carlotta.ts';
import { CARTETHYIA_ROTATION_PRESETS } from './rotationPreset-cartethyia.ts';
import { CHANGLI_ROTATION_PRESETS } from './rotationPreset-changli.ts';
import { CHISA_ROTATION_PRESETS } from './rotationPreset-chisa.ts';
import { CHIXIA_ROTATION_PRESETS } from './rotationPreset-chixia.ts';
import { CIACCONA_ROTATION_PRESETS } from './rotationPreset-ciaccona.ts';
import { DANJIN_ROTATION_PRESETS } from './rotationPreset-danjin.ts';
import { DENIA_ROTATION_PRESETS } from './rotationPreset-denia.ts';
import { ENCORE_ROTATION_PRESETS } from './rotationPreset-encore.ts';
import { GALBRENA_ROTATION_PRESETS } from './rotationPreset-galbrena.ts';
import { HIYUKI_ROTATION_PRESETS } from './rotationPreset-hiyuki.ts';
import { HSIN_ROTATION_PRESETS } from './rotationPreset-hsin.ts';
import { JIANXIN_ROTATION_PRESETS } from './rotationPreset-jianxin.ts';
// -- auditor-2 zone: iuno..rebecca (imports for rotationPreset-<id>.ts go here) --
import { IUNO_ROTATION_PRESETS } from './rotationPreset-iuno.ts';
import { JINGRAN_ROTATION_PRESETS } from './rotationPreset-jingran.ts';
import { JINHSI_ROTATION_PRESETS } from './rotationPreset-jinhsi.ts';
import { JIYAN_ROTATION_PRESETS } from './rotationPreset-jiyan.ts';
import { LINGYANG_ROTATION_PRESETS } from './rotationPreset-lingyang.ts';
import { LUCILLA_ROTATION_PRESETS } from './rotationPreset-lucilla.ts';
import { LUCY_ROTATION_PRESETS } from './rotationPreset-lucy.ts';
import { LUMI_ROTATION_PRESETS } from './rotationPreset-lumi.ts';
import { LUPA_ROTATION_PRESETS } from './rotationPreset-lupa.ts';
import { LUUK_HERSSEN_ROTATION_PRESETS } from './rotationPreset-luuk-herssen.ts';
import { LYNAE_ROTATION_PRESETS } from './rotationPreset-lynae.ts';
import { MORNYE_ROTATION_PRESETS } from './rotationPreset-mornye.ts';
import { MORTEFI_ROTATION_PRESETS } from './rotationPreset-mortefi.ts';
import { PHOEBE_ROTATION_PRESETS } from './rotationPreset-phoebe.ts';
import { PHROLOVA_ROTATION_PRESETS } from './rotationPreset-phrolova.ts';
import { QINGXIAO_ROTATION_PRESETS } from './rotationPreset-qingxiao.ts';
import { QIUYUAN_ROTATION_PRESETS } from './rotationPreset-qiuyuan.ts';
import { REBECCA_ROTATION_PRESETS } from './rotationPreset-rebecca.ts';
// -- auditor-3 zone: roccia..zhezhi (imports for rotationPreset-<id>.ts go here) --
import { ROCCIA_ROTATION_PRESETS } from './rotationPreset-roccia.ts';
import { ROVER_AERO_ROTATION_PRESETS } from './rotationPreset-rover-aero.ts';
import { ROVER_ELECTRO_ROTATION_PRESETS } from './rotationPreset-rover-electro.ts';
import { ROVER_HAVOC_ROTATION_PRESETS } from './rotationPreset-rover-havoc.ts';
import { ROVER_SPECTRO_ROTATION_PRESETS } from './rotationPreset-rover-spectro.ts';
import { SANHUA_ROTATION_PRESETS } from './rotationPreset-sanhua.ts';
import { SHOREKEEPER_ROTATION_PRESETS } from './rotationPreset-shorekeeper.ts';
import { SIGRIKA_ROTATION_PRESETS } from './rotationPreset-sigrika.ts';
import { SUISUI_ROTATION_PRESETS } from './rotationPreset-suisui.ts';
import { TAOQI_ROTATION_PRESETS } from './rotationPreset-taoqi.ts';
import { VERINA_ROTATION_PRESETS } from './rotationPreset-verina.ts';
import { XIANGLI_YAO_ROTATION_PRESETS } from './rotationPreset-xiangli-yao.ts';
import { YANGYANG_ROTATION_PRESETS } from './rotationPreset-yangyang.ts';
import { YANGYANG_XUANLING_ROTATION_PRESETS } from './rotationPreset-yangyang-xuanling.ts';
import { YINLIN_ROTATION_PRESETS } from './rotationPreset-yinlin.ts';
import { YOUHU_ROTATION_PRESETS } from './rotationPreset-youhu.ts';
import { YUANWU_ROTATION_PRESETS } from './rotationPreset-yuanwu.ts';
import { ZANI_ROTATION_PRESETS } from './rotationPreset-zani.ts';
import { ZHEZHI_ROTATION_PRESETS } from './rotationPreset-zhezhi.ts';

/**
 * Transcribed rotation presets (community-guide rotations as calculator
 * inputs). Each preset is one guide's rotation for one character, mapped
 * step-by-step onto snapshot skill/motion ids. Steps the calculator cannot
 * score (teammate actions, echo skills, swap cancels) are omitted and
 * listed in `notes` — never approximated as phantom blocks.
 *
 * Per-character files (`rotationPreset-<id>.ts`) hold the data so parallel
 * transcribers never share a file; this module only aggregates. Auditors:
 * add your import + spread entry inside your zone only, re-reading this
 * file immediately before editing.
 */
export interface RotationPresetStep {
  /** Snapshot skill id. */
  skillId: string;
  /**
   * Exact snapshot motion name. Empty only for motion-less (buff-carrier)
   * skills, mirroring the calculator's own add-block path.
   */
  motionName: string;
  /** Pinned forte level (1-10). Presets pin 10; the user can lower per block. */
  forteLevel: number;
  /**
   * Source annotation (cancels, conditions, form picks). Displayed with the
   * preset for provenance; never affects scoring.
   */
  note?: string;
}

export interface RotationPreset {
  /** Stable id, e.g. 'aemeath-prydwen-easy'. */
  id: string;
  characterId: string;
  /** Guide's own rotation name, e.g. 'Easy Rotation'. */
  label: string;
  /** Guide source, e.g. 'Prydwen'. */
  sourceName: string;
  /** Exact page URL the rotation was transcribed from (opened, not snippet). */
  sourceUrl: string;
  /** Omissions (teammate/echo steps), assumptions, other rotations on the page. */
  notes?: string;
  steps: RotationPresetStep[];
}

export const ROTATION_PRESETS: RotationPreset[] = [
  ...AEMEATH_ROTATION_PRESETS,
  // -- auditor-1 zone entries (a spread line per character file) --
  ...AALTO_ROTATION_PRESETS,
  ...AUGUSTA_ROTATION_PRESETS,
  ...BAIZHI_ROTATION_PRESETS,
  ...BRANT_ROTATION_PRESETS,
  ...BULING_ROTATION_PRESETS,
  ...CALCHARO_ROTATION_PRESETS,
  ...CAMELLYA_ROTATION_PRESETS,
  ...CANTARELLA_ROTATION_PRESETS,
  ...CARLOTTA_ROTATION_PRESETS,
  ...CARTETHYIA_ROTATION_PRESETS,
  ...CHANGLI_ROTATION_PRESETS,
  ...CHISA_ROTATION_PRESETS,
  ...CHIXIA_ROTATION_PRESETS,
  ...CIACCONA_ROTATION_PRESETS,
  ...DANJIN_ROTATION_PRESETS,
  ...DENIA_ROTATION_PRESETS,
  ...ENCORE_ROTATION_PRESETS,
  ...GALBRENA_ROTATION_PRESETS,
  ...HIYUKI_ROTATION_PRESETS,
  ...HSIN_ROTATION_PRESETS,
  ...JIANXIN_ROTATION_PRESETS,
  // -- auditor-2 zone entries --
  ...IUNO_ROTATION_PRESETS,
  ...JINGRAN_ROTATION_PRESETS,
  ...JINHSI_ROTATION_PRESETS,
  ...JIYAN_ROTATION_PRESETS,
  ...LINGYANG_ROTATION_PRESETS,
  ...LUCILLA_ROTATION_PRESETS,
  ...LUCY_ROTATION_PRESETS,
  ...LUMI_ROTATION_PRESETS,
  ...LUPA_ROTATION_PRESETS,
  ...LUUK_HERSSEN_ROTATION_PRESETS,
  ...LYNAE_ROTATION_PRESETS,
  ...MORNYE_ROTATION_PRESETS,
  ...MORTEFI_ROTATION_PRESETS,
  ...PHOEBE_ROTATION_PRESETS,
  ...PHROLOVA_ROTATION_PRESETS,
  ...QINGXIAO_ROTATION_PRESETS,
  ...QIUYUAN_ROTATION_PRESETS,
  ...REBECCA_ROTATION_PRESETS,
  // -- auditor-3 zone entries --
  ...ROCCIA_ROTATION_PRESETS,
  ...ROVER_AERO_ROTATION_PRESETS,
  ...ROVER_ELECTRO_ROTATION_PRESETS,
  ...ROVER_HAVOC_ROTATION_PRESETS,
  ...ROVER_SPECTRO_ROTATION_PRESETS,
  ...SANHUA_ROTATION_PRESETS,
  ...SHOREKEEPER_ROTATION_PRESETS,
  ...SIGRIKA_ROTATION_PRESETS,
  ...SUISUI_ROTATION_PRESETS,
  ...TAOQI_ROTATION_PRESETS,
  ...VERINA_ROTATION_PRESETS,
  ...XIANGLI_YAO_ROTATION_PRESETS,
  ...YANGYANG_ROTATION_PRESETS,
  ...YANGYANG_XUANLING_ROTATION_PRESETS,
  ...YINLIN_ROTATION_PRESETS,
  ...YOUHU_ROTATION_PRESETS,
  ...YUANWU_ROTATION_PRESETS,
  ...ZANI_ROTATION_PRESETS,
  ...ZHEZHI_ROTATION_PRESETS,
];

/** Presets for one character, in aggregate order. */
export function presetsForCharacter(characterId: string): RotationPreset[] {
  return ROTATION_PRESETS.filter((p) => p.characterId === characterId);
}

/**
 * Preset steps as calculator block specs (no buffs attached; the user
 * toggles those). Callers must stale-check each spec against the current
 * snapshot before adding (see `isBlockStale`) — snapshot drift must skip
 * loudly, never score a phantom.
 */
export function presetToBlocks(preset: RotationPreset): RotationBlockSpec[] {
  return preset.steps.map((step) => ({
    skillId: step.skillId,
    motionName: step.motionName,
    forteLevel: step.forteLevel,
    activeBuffIds: [],
  }));
}
