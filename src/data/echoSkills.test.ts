import { describe, expect, it } from 'vitest';
import { parseEchoSkillHits } from './echoSkills.ts';
import { loadBundledSnapshot } from './index.ts';

const snapshot = loadBundledSnapshot();

function hitsOf(echoDefId: string) {
  const def = snapshot.echoDefs.find((d) => d.id === echoDefId)!;
  return parseEchoSkillHits(def.skillDescription ?? '');
}

describe('parseEchoSkillHits', () => {
  it('parses the standard dealing-N%-Element shape (Lorelei)', () => {
    expect(hitsOf('lorelei')).toEqual([
      { label: 'Hit 1', motionValue: 4.05, flatDamage: 0, attribute: 'Havoc', scaling: 'ATK' },
    ]);
  });

  it('splits shared-element pairs and dedups identical twins (Lampylumen, Mourning Aix)', () => {
    // "inflicting 200.16% and 200.16% Glacio DMG ... 266.88% Glacio DMG":
    // the twin first strikes collapse to one option.
    expect(hitsOf('lampylumen-myriad')).toEqual([
      { label: 'Hit 1', motionValue: 2.0016, flatDamage: 0, attribute: 'Glacio', scaling: 'ATK' },
      { label: 'Hit 2', motionValue: 2.6688, flatDamage: 0, attribute: 'Glacio', scaling: 'ATK' },
    ]);
    // Non-identical pairs survive as two options.
    expect(hitsOf('mourning-aix').map((h) => h.motionValue)).toEqual([1.5744, 2.3616]);
  });

  it('parses hybrid flat damage on 1-cost echoes (Hooscamp)', () => {
    expect(hitsOf('hooscamp')).toEqual([
      { label: 'Hit 1', motionValue: 0.48, flatDamage: 96, attribute: 'Aero', scaling: 'ATK' },
    ]);
  });

  it('follows equal-to/based-on scaling tails (Fallacy HP, Bell-Borne DEF, Nightmare Hecate ATK)', () => {
    const fallacy = hitsOf('fallacy-of-no-return');
    expect(fallacy[0]).toMatchObject({ motionValue: 0.1586, attribute: 'Spectro', scaling: 'HP' });
    expect(fallacy.every((h) => h.scaling === 'HP')).toBe(true);
    expect(hitsOf('bell-borne-geochelone')).toEqual([
      { label: 'Hit 1', motionValue: 1.4592, flatDamage: 0, attribute: 'Glacio', scaling: 'DEF' },
    ]);
    expect(hitsOf('nightmare-hecate')).toEqual([
      { label: 'Hit 1', motionValue: 1.5239, flatDamage: 0, attribute: 'Havoc', scaling: 'ATK' },
    ]);
  });

  it('never mistakes DMG Bonus buff text for damage', () => {
    // Hecate's description ends in main-slot buff prose ("Coordinated
    // Attack DMG increased by 40.00%") — only the 45.59% hit parses.
    expect(hitsOf('hecate')).toEqual([
      { label: 'Hit 1', motionValue: 0.4559, flatDamage: 0, attribute: 'Havoc', scaling: 'ATK' },
    ]);
    // Sentry's twin 405% occurrences (normal + empowered dive) dedup.
    expect(hitsOf('sentry-construct')).toHaveLength(1);
  });

  it('pins the zero-hit set: Physical-only echoes and non-damage skills', () => {
    const zero = snapshot.echoDefs
      .filter((d) => parseEchoSkillHits(d.skillDescription ?? '').length === 0)
      .map((d) => d.id)
      .sort();
    // Physical damage has no RES term anywhere in the formula tree; the
    // rest are heals, shields, rests, or utility — genuinely unscorable.
    // A re-sync that changes this list must be reviewed by a human: new
    // zero-hit ids mean new parser gaps OR new non-damage skills.
    expect(zero).toEqual([
      'baby-viridblaze-saurian',
      'calcified-junrock',
      'cruisewing',
      'cuddle-wuddle',
      'diamondclaw',
      'diggy-duggy',
      'dwarf-cassowary',
      'excarat',
      'fission-junrock',
      'galescourge-stalker',
      'hoartoise',
      'kernel-puppet-joy',
      'la-guardia',
      'nightmare-baby-viridblaze-saurian',
      'nightmare-dwarf-cassowary',
      'nimbus-wraith',
      'sabyr-boar',
      'spacetrek-explorer',
      'spearback',
      'stonewall-bracer',
      'traffic-illuminator',
      'vanguard-junrock',
    ]);
  });
});
