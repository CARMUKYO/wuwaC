import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { objectiveSpecSchema, ownedEchoSchema, rotationBlockSpecSchema, rotationBuffSpecSchema, type OwnedEcho, type RosterEntry } from '../data/schema.ts';
import type { ResonanceMode } from './characterMods.ts';
import { buildEnemyProfile } from './enemy.ts';
import { blockStartTimes, buffAppliesAt, calculateRotation, isBlockStale, scoreRotationBlocks, type ActionBlock, type RotationBuff, type RotationInput } from './rotation.ts';
import { scoreSheet } from './objectives.ts';
import { resolveTeamBuffs } from './teamBuffs.ts';
import { emptySheet } from './stats.ts';

const snapshot = loadBundledSnapshot();
const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
const verdant = snapshot.weapons.find((w) => w.id === 'verdant-summit')!;
const cartethyia = snapshot.characters.find((c) => c.id === 'cartethyia')!;

const roster: RosterEntry = {
  characterId: 'jiyan',
  level: 90,
  ascension: 6,
  resonanceChain: 0,
  forteLevels: {},
  weaponId: 'verdant-summit',
  weaponLevel: 90,
  weaponRank: 1,
};

function echo(id: string): OwnedEcho {
  return ownedEchoSchema.parse({
    id,
    echoDefId: 'hooscamp',
    sonataId: 'sierra-gale',
    cost: 1,
    level: 25,
    rarity: 5,
    mainStat: { stat: 'atkPct', value: 0.3 },
    substats: [],
    equippedTo: null,
    origin: 'test',
  });
}

function block(id: string, motionName: string, extra?: Partial<ActionBlock>): ActionBlock {
  return { id, skillId: '1001101', motionName, forteLevel: 10, activeBuffIds: [], ...extra };
}

function baseInput(blocks: ActionBlock[], buffs: RotationBuff[] = [], globalBuffIds: string[] = []): RotationInput {
  return {
    character: jiyan,
    weapon: verdant,
    roster,
    echoes: [echo('a'), echo('b'), echo('c'), echo('d'), echo('e')],
    sonataSets: snapshot.sonataSets,
    enemy: buildEnemyProfile('mob', 90, 0.1, 'Aero'),
    blocks,
    buffs,
    globalBuffIds,
    rotationTime: 10,
    crit: 'expected',
  };
}

describe('calculateRotation', () => {
  it('scores an empty rotation as zero', () => {
    const result = calculateRotation(baseInput([]));
    expect(result.dpr).toBe(0);
    expect(result.dps).toBe(0);
    expect(result.blocks).toEqual([]);
  });

  it('sums blocks into DPR and divides by time into DPS (hand-computed)', () => {
    const result = calculateRotation(baseInput([block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG')]));
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0].damage).toBeGreaterThan(0);
    // Hand-computed relationships: DPR is the plain sum, DPS the quotient.
    expect(result.dpr).toBe(result.blocks[0].damage + result.blocks[1].damage);
    expect(result.dps).toBe(result.dpr / 10);
    expect(result.blocks[0].share + result.blocks[1].share).toBeCloseTo(100, 10);
  });

  it('scales damage by exactly (1 + amplify) for an amplify buff (hand-computed)', () => {
    const plain = calculateRotation(baseInput([block('1', 'Stage 1 DMG')]));
    const buff: RotationBuff = { id: 'amp', label: 'AMP', source: 'test', mods: [{ stat: 'amplify', value: 0.2 }] };
    const buffed = calculateRotation(baseInput([block('1', 'Stage 1 DMG', { activeBuffIds: ['amp'] })], [buff]));
    // DmgAmplifyTotal = 1 + attacker + target: 1.2 vs 1.0 — every other
    // term is identical, so the ratio is exactly 1.2.
    expect(buffed.dpr / plain.dpr).toBeCloseTo(1.2, 10);
  });

  it('isolates per-block buffs and applies global buffs to every block', () => {
    const buff: RotationBuff = { id: 'amp', label: 'AMP', source: 'test', mods: [{ stat: 'amplify', value: 0.2 }] };
    const plain = calculateRotation(baseInput([block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG')]));
    const partial = calculateRotation(
      baseInput([block('1', 'Stage 1 DMG', { activeBuffIds: ['amp'] }), block('2', 'Stage 2 DMG')], [buff]),
    );
    expect(partial.blocks[0].damage / plain.blocks[0].damage).toBeCloseTo(1.2, 10);
    expect(partial.blocks[1].damage).toBe(plain.blocks[1].damage);

    const global = calculateRotation(baseInput([block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG')], [buff], ['amp']));
    expect(global.blocks[0].damage / plain.blocks[0].damage).toBeCloseTo(1.2, 10);
    expect(global.blocks[1].damage / plain.blocks[1].damage).toBeCloseTo(1.2, 10);
  });

  it('scales DPR by the resolved Lynae team buffs; untimed windows match global (hand-computed)', () => {
    // Lynae Outro (15% all-DMG amp) + Liberation (24% team DMG) both land
    // on sheet.amplify for Jiyan's Basic blocks (the 25% Liberation-bucket
    // mod does not apply to Basic hits), so DmgAmplifyTotal goes 1.0 -> 1.39.
    const lynae = resolveTeamBuffs(
      { id: 't', name: 'T', characterIds: ['lynae', 'verina', 'sanhua'] },
      (id) => snapshot.characters.find((c) => c.id === id)?.name ?? null,
    );
    expect(lynae.warnings).toEqual([]);
    const teamBuffs: RotationBuff[] = lynae.buffs
      .filter((b) => b.label.startsWith('Lynae'))
      .map((b, i) => ({ ...b, id: `lynae-${i}` }));
    expect(teamBuffs).toHaveLength(2);

    const plain = calculateRotation(baseInput([block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG')]));
    const buffed = calculateRotation(
      baseInput(
        [block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG')],
        teamBuffs,
        teamBuffs.map((b) => b.id),
      ),
    );
    expect(buffed.dpr / plain.dpr).toBeCloseTo(1.39, 10);

    // Without block durations every block starts at t=0, so the t=0
    // windows cover the whole rotation: untoggled scores exactly as global.
    const toggledOff = calculateRotation(
      baseInput([block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG')], teamBuffs, []),
    );
    expect(toggledOff.dpr).toBe(buffed.dpr);
  });

  it('scores buff-only outros as zero-damage carriers', () => {
    // Yinlin's outro is genuinely motion-less (Jiyan's scores its
    // coordinated lance instead — see the lance test below).
    const yinlin = snapshot.characters.find((c) => c.id === 'yinlin')!;
    const outro = yinlin.skills.find((s) => s.kind === 'outro')!;
    expect(outro.motionValues).toHaveLength(0);
    const input = {
      ...baseInput([{ id: 'o', skillId: outro.id, motionName: '', forteLevel: 1, activeBuffIds: [] }]),
      character: yinlin,
    };
    const result = calculateRotation({ ...input, roster: { ...input.roster, characterId: 'yinlin' } });
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].damage).toBe(0);
    expect(result.blocks[0].share).toBe(0);
    expect(result.blocks[0].buffCarrier).toBe(true);
    expect(result.dpr).toBe(0);
  });

  it('scores Jiyan outro blocks as coordinated lances, not buff carriers', () => {
    const outro = jiyan.skills.find((s) => s.kind === 'outro')!;
    const result = calculateRotation(
      baseInput([{ id: 'lance', skillId: outro.id, motionName: '', forteLevel: 1, activeBuffIds: [] }]),
    );
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].buffCarrier).toBe(false);
    expect(result.blocks[0].label).toMatch(/coordinated lance/);
    expect(result.blocks[0].damage).toBeGreaterThan(0);
    expect(result.dpr).toBe(result.blocks[0].damage);
  });

  it('scores echo-skill blocks from their carried values', () => {
    const echoBlock: ActionBlock = {
      id: 'echo', skillId: '', motionName: 'Lorelei', forteLevel: 1, activeBuffIds: [],
      damageKind: 'echoSkill', echoName: 'Lorelei', echoMotionValue: 4.05,
      echoAttribute: 'Havoc', echoCooldown: 25,
    };
    const result = calculateRotation(baseInput([echoBlock]));
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].buffCarrier).toBe(false);
    expect(result.blocks[0].label).toBe('Lorelei (Echo Skill, 25s CD)');
    expect(result.blocks[0].damage).toBeGreaterThan(0);
    expect(result.dpr).toBe(result.blocks[0].damage);
  });

  it('applies block buffs to echo-skill blocks like any other block (hand-computed)', () => {
    const buff: RotationBuff = { id: 'amp', label: 'AMP', source: 'test', mods: [{ stat: 'amplify', value: 0.2 }] };
    const mk = (activeBuffIds: string[]): ActionBlock => ({
      id: 'e', skillId: '', motionName: 'Lorelei', forteLevel: 1, activeBuffIds,
      damageKind: 'echoSkill', echoName: 'Lorelei', echoMotionValue: 4.05, echoAttribute: 'Havoc',
    });
    const plain = calculateRotation(baseInput([mk([])]));
    const buffed = calculateRotation(baseInput([mk(['amp'])], [buff]));
    // DmgAmplifyTotal 1.2 vs 1.0 — every other term identical, ratio exactly 1.2.
    expect(buffed.dpr / plain.dpr).toBeCloseTo(1.2, 10);
  });

  it('throws descriptively on echo blocks without carried values', () => {
    expect(() => calculateRotation(
      baseInput([{ id: 'e', skillId: '', motionName: 'X', forteLevel: 1, activeBuffIds: [], damageKind: 'echoSkill' }]),
    )).toThrow(/echoMotionValue/);
  });

  it('warns on unknown buff ids instead of dropping the block', () => {
    const result = calculateRotation(baseInput([block('1', 'Stage 1 DMG', { activeBuffIds: ['ghost'] })]));
    expect(result.blocks[0].damage).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('ghost'))).toBe(true);
  });

  it('rejects bad inputs descriptively', () => {    expect(() => calculateRotation(baseInput([block('1', 'Nope')]))).toThrow(/motion component/);
    expect(() => calculateRotation(baseInput([{ ...block('1', 'Stage 1 DMG'), skillId: 'nope' }]))).toThrow(/unknown skill/);
    expect(() => calculateRotation(baseInput([block('1', 'Stage 1 DMG', { forteLevel: 0 })]))).toThrow(/forte level/);
    expect(() => calculateRotation({ ...baseInput([]), echoes: [echo('a')] })).toThrow(/exactly 5 echoes/);
    expect(() => calculateRotation({ ...baseInput([]), rotationTime: 0 })).toThrow(/rotation time/);
  });
});

describe('isBlockStale', () => {
  it('flags unknown skills and motions, keeps carriers and matches', () => {
    expect(isBlockStale(jiyan, block('1', 'Stage 1 DMG'))).toBe(false);
    expect(isBlockStale(jiyan, { ...block('1', 'Stage 1 DMG'), skillId: 'nope' })).toBe(true);
    expect(isBlockStale(jiyan, block('1', 'Nope'))).toBe(true);
    expect(isBlockStale(jiyan, { id: 'o', skillId: '1001109', motionName: '', forteLevel: 1, activeBuffIds: [] })).toBe(false);
  });

  it('never flags self-contained echo-skill blocks', () => {
    expect(isBlockStale(jiyan, {
      id: 'e', skillId: '', motionName: 'Lorelei', forteLevel: 1, activeBuffIds: [],
      damageKind: 'echoSkill', echoName: 'Lorelei', echoMotionValue: 4.05, echoAttribute: 'Havoc',
    })).toBe(false);
  });

  it('never flags character-independent tune-break blocks', () => {
    expect(isBlockStale(jiyan, {
      id: 't', skillId: '', motionName: 'Tune Break DMG', forteLevel: 1, activeBuffIds: [],
      damageKind: 'tuneBreak', tuneBreakMultiplier: 10,
    })).toBe(false);
  });
});

describe('Cartethyia status rotation rules', () => {
  it('leaves S4 to the sheet/team layers instead of inflict-gating it here', () => {
    // S4's wielder part auto-applies via computeStats (full uptime) and the
    // teammates part resolves via resolveTeamBuffs — the scorer must not add
    // its own inflict-gated bonus on top (that would double-count Aero).
    const basic = cartethyia.skills.find((s) => s.kind === 'basic')!;
    const motion = basic.motionValues.find((m) => m.name === 'Stage 1 DMG')!;
    const base = emptySheet();
    base.critDmg = 1.5;
    const input = {
      skills: cartethyia.skills,
      characterId: 'cartethyia',
      resonanceChain: 4,
      attackerLevel: 90,
      enemy: buildEnemyProfile('mob', 90, 0.1, 'Aero'),
      buffs: [],
      globalBuffIds: [],
      crit: 'nonCrit' as const,
    };
    const basicBlock = {
      skillId: basic.id,
      motionName: motion.name,
      forteLevel: 10,
      activeBuffIds: [],
    };
    const before = scoreRotationBlocks(base, {
      baseAtk: { character: 100, weapon: 0 },
      baseHp: { character: 10000 },
      baseDef: { character: 100 },
    }, { ...input, blocks: [basicBlock] });
    const after = scoreRotationBlocks(base, {
      baseAtk: { character: 100, weapon: 0 },
      baseHp: { character: 10000 },
      baseDef: { character: 100 },
    }, {
      ...input,
      blocks: [
        { skillId: '', motionName: 'Aero Erosion DMG', forteLevel: 1, activeBuffIds: [], damageKind: 'negativeStatus', statusType: 'aeroErosion', statusStacks: 1 },
        basicBlock,
      ],
    });
    expect(after.blocks[1].damage / before.blocks[0].damage).toBe(1);
  });
});

describe('generalized status blocks', () => {
  const zani = snapshot.characters.find((c) => c.id === 'zani')!;
  const input = {
    skills: zani.skills,
    characterId: 'zani',
    resonanceChain: 0,
    attackerLevel: 90,
    enemy: buildEnemyProfile('mob', 90, 0.1, 'Spectro'),
    buffs: [],
    globalBuffIds: [],
    crit: 'expected' as const,
  };
  const bases = {
    baseAtk: { character: 100, weapon: 0 },
    baseHp: { character: 100 },
    baseDef: { character: 100 },
  };

  it('scores Frazzle detonation blocks with status labels', () => {
    const { dpr, blocks } = scoreRotationBlocks(emptySheet(), bases, {
      ...input,
      blocks: [{ skillId: '', motionName: 'Spectro Frazzle DMG', forteLevel: 1, activeBuffIds: [], damageKind: 'negativeStatus', statusType: 'spectroFrazzle', statusStacks: 10 }],
    });
    expect(blocks[0].label).toBe('Spectro Frazzle DMG');
    expect(blocks[0].damage).toBeGreaterThan(0);
    expect(dpr).toBe(blocks[0].damage);
  });

  it('rejects Havoc Bane detonation blocks and missing status types', () => {
    expect(() => scoreRotationBlocks(emptySheet(), bases, {
      ...input,
      blocks: [{ skillId: '', motionName: 'Havoc Bane DMG', forteLevel: 1, activeBuffIds: [], damageKind: 'negativeStatus', statusType: 'havocBane', statusStacks: 3 }],
    })).toThrow(/no damage/);
    expect(() => scoreRotationBlocks(emptySheet(), bases, {
      ...input,
      blocks: [{ skillId: '', motionName: 'Status DMG', forteLevel: 1, activeBuffIds: [], damageKind: 'negativeStatus' }],
    })).toThrow(/needs a statusType/);
  });

  it('requires a Resonance Mode for dual-mode kits and rejects unknown modes', () => {
    const aemeath = snapshot.characters.find((c) => c.id === 'aemeath')!;
    const liberation = aemeath.skills.find((s) => s.kind === 'liberation')!;
    const scored = (resonanceMode?: ResonanceMode) =>
      scoreRotationBlocks(emptySheet(), bases, {
        skills: aemeath.skills,
        characterId: 'aemeath',
        resonanceChain: 0,
        attackerLevel: 90,
        enemy: buildEnemyProfile('mob', 90, 0.1, 'Fusion'),
        blocks: [{ skillId: liberation.id, motionName: 'Heavenfall Edict: Finale DMG', forteLevel: 10, activeBuffIds: [] }],
        buffs: [],
        globalBuffIds: [],
        crit: 'nonCrit',
        ...(resonanceMode === undefined ? {} : { resonanceMode }),
      });
    expect(() => scored()).toThrow(/Resonance Modes/);
    expect(() => scored('nope' as unknown as ResonanceMode)).toThrow(/Resonance Modes/);
    const rupture = scored('tuneRupture');
    const burst = scored('fusionBurst');
    expect(rupture.blocks[0].damage).toBeGreaterThan(0);
    expect(rupture.blocks[0].damage).toBe(burst.blocks[0].damage);
  });

  it('scores Tune Rupture and Tune Break blocks end to end', () => {
    const aemeath = snapshot.characters.find((c) => c.id === 'aemeath')!;
    const forte = aemeath.skills.find((s) => s.kind === 'forte')!;
    const input = {
      skills: aemeath.skills,
      characterId: 'aemeath',
      attribute: 'Fusion' as const,
      resonanceChain: 0,
      attackerLevel: 90,
      enemy: buildEnemyProfile('mob', 90, 0.1, 'Fusion'),
      buffs: [],
      globalBuffIds: [],
      crit: 'nonCrit' as const,
      resonanceMode: 'tuneRupture' as const,
    };
    const rupture = scoreRotationBlocks(emptySheet(), bases, {
      ...input,
      blocks: [{ skillId: forte.id, motionName: 'Tune Rupture Response - Starburst DMG', forteLevel: 1, activeBuffIds: [], damageKind: 'tuneRupture', tuneResponseStacks: 10 }],
    });
    expect(rupture.blocks[0].label).toContain('Tune Rupture');
    expect(rupture.blocks[0].damage).toBeGreaterThan(0);
    // Burst mode rejects rupture blocks.
    expect(() => scoreRotationBlocks(emptySheet(), bases, {
      ...input,
      resonanceMode: 'fusionBurst' as const,
      blocks: [{ skillId: forte.id, motionName: 'Tune Rupture Response - Starburst DMG', forteLevel: 1, activeBuffIds: [], damageKind: 'tuneRupture' }],
    })).toThrow(/tuneRupture/);
    // Break blocks need an explicit coefficient and score the provisional shape.
    const broke = scoreRotationBlocks(emptySheet(), bases, {
      ...input,
      blocks: [{ skillId: '', motionName: 'Tune Break DMG', forteLevel: 1, activeBuffIds: [], damageKind: 'tuneBreak', tuneBreakMultiplier: 1 }],
    });
    expect(broke.blocks[0].label).toBe('Tune Break DMG');
    expect(broke.blocks[0].damage).toBeCloseTo(10000 * 0.9 * (1520 / 3032), 6);
    expect(() => scoreRotationBlocks(emptySheet(), bases, {
      ...input,
      blocks: [{ skillId: '', motionName: 'Tune Break DMG', forteLevel: 1, activeBuffIds: [], damageKind: 'tuneBreak' }],
    })).toThrow(/tuneBreakMultiplier/);
  });

  it('routes target Bane stacks into ability-block DEF terms', () => {
    const liberation = zani.skills.find((s) => s.kind === 'liberation')!;
    const clean = scoreRotationBlocks(emptySheet(), bases, {
      ...input,
      blocks: [{ skillId: liberation.id, motionName: 'Rekindle DMG', forteLevel: 10, activeBuffIds: [] }],
    });
    const baned = scoreRotationBlocks(emptySheet(), bases, {
      ...input,
      blocks: [{ skillId: liberation.id, motionName: 'Rekindle DMG', forteLevel: 10, activeBuffIds: [], targetHavocBaneStacks: 3 }],
    });
    expect(baned.blocks[0].damage / clean.blocks[0].damage).toBeCloseTo((1520 / 2941.28) / (1520 / 3032), 8);
  });
});

describe('rotation timing schema fields', () => {
  it('accepts old specs without timing fields and rejects negative timing', () => {
    const oldBlock = { skillId: '1001101', motionName: 'Stage 1 DMG', forteLevel: 10, activeBuffIds: [] };
    expect(rotationBlockSpecSchema.parse(oldBlock)).toEqual(oldBlock);
    const oldBuff = { id: 'b', label: 'B', source: 'test', mods: [] };
    expect(rotationBuffSpecSchema.parse(oldBuff)).toEqual(oldBuff);

    expect(rotationBlockSpecSchema.safeParse({ ...oldBlock, durationSeconds: -1 }).success).toBe(false);
    expect(rotationBuffSpecSchema.safeParse({ ...oldBuff, windowStartSeconds: -1 }).success).toBe(false);
    expect(rotationBuffSpecSchema.safeParse({ ...oldBuff, windowDurationSeconds: -1 }).success).toBe(false);
    expect(rotationBuffSpecSchema.parse({ ...oldBuff, windowStartSeconds: 0, windowDurationSeconds: 30 }))
      .toMatchObject({ windowStartSeconds: 0, windowDurationSeconds: 30 });
  });
});

describe('blockStartTimes', () => {
  it('derives starts as cumulative durations (hand-computed)', () => {
    const starts = blockStartTimes([
      block('1', 'Stage 1 DMG', { durationSeconds: 2 }),
      block('2', 'Stage 2 DMG', { durationSeconds: 3 }),
      block('3', 'Stage 1 DMG', { durationSeconds: 1.5 }),
    ]);
    expect(starts).toEqual([0, 2, 5]);
  });

  it('treats missing durations as zero contribution (hand-computed)', () => {
    const starts = blockStartTimes([
      block('1', 'Stage 1 DMG'),
      block('2', 'Stage 2 DMG', { durationSeconds: 4 }),
      block('3', 'Stage 1 DMG'),
    ]);
    expect(starts).toEqual([0, 0, 4]);
  });

  it('maps an empty block list to no starts', () => {
    expect(blockStartTimes([])).toEqual([]);
  });
});

describe('buffAppliesAt', () => {
  const windowed = (windowStartSeconds?: number, windowDurationSeconds?: number): RotationBuff => ({
    id: 'w', label: 'W', source: 'test', mods: [],
    ...(windowStartSeconds === undefined ? {} : { windowStartSeconds }),
    ...(windowDurationSeconds === undefined ? {} : { windowDurationSeconds }),
  });

  it('is start-inclusive and end-exclusive (hand-computed)', () => {
    const buff = windowed(2, 4); // [2, 6)
    expect(buffAppliesAt(buff, 1.999)).toBe(false);
    expect(buffAppliesAt(buff, 2)).toBe(true);
    expect(buffAppliesAt(buff, 5.999)).toBe(true);
    expect(buffAppliesAt(buff, 6)).toBe(false);
  });

  it('never applies zero-duration windows (hand-computed)', () => {
    const buff = windowed(2, 0); // [2, 2): degenerate
    expect(buffAppliesAt(buff, 2)).toBe(false);
    expect(buffAppliesAt(buff, 0)).toBe(false);
  });

  it('never auto-applies buffs without a window duration (hand-computed)', () => {
    expect(buffAppliesAt(windowed(), 0)).toBe(false);
    // Start alone is not a window — without a duration nothing resolves.
    expect(buffAppliesAt(windowed(0), 0)).toBe(false);
  });

  it('defaults a duration-only window to start 0 (hand-computed)', () => {
    const buff = windowed(undefined, 5); // [0, 5)
    expect(buffAppliesAt(buff, 0)).toBe(true);
    expect(buffAppliesAt(buff, 5)).toBe(false);
  });
});

describe('windowed buff scoring', () => {
  const ampWindow = (windowStartSeconds: number, windowDurationSeconds: number): RotationBuff => ({
    id: 'wamp', label: 'WAMP', source: 'test',
    mods: [{ stat: 'amplify', value: 0.2 }],
    windowStartSeconds, windowDurationSeconds,
  });

  it('applies a windowed buff only to in-window blocks (hand-computed)', () => {
    // Starts [0, 2, 4]; window [1, 3) covers the middle block only.
    const mk = () => [
      block('1', 'Stage 1 DMG', { durationSeconds: 2 }),
      block('2', 'Stage 2 DMG', { durationSeconds: 2 }),
      block('3', 'Stage 1 DMG', { durationSeconds: 2 }),
    ];
    const plain = calculateRotation(baseInput(mk()));
    expect(plain.blocks.map((b) => b.startSeconds)).toEqual([0, 2, 4]);
    const subset = calculateRotation(baseInput(mk(), [ampWindow(1, 2)]));
    expect(subset.blocks[0].damage).toBe(plain.blocks[0].damage);
    expect(subset.blocks[1].damage / plain.blocks[1].damage).toBeCloseTo(1.2, 10);
    expect(subset.blocks[2].damage).toBe(plain.blocks[2].damage);
    expect(subset.warnings).toEqual(plain.warnings);
  });

  it('excludes blocks starting exactly at window end, includes window start (hand-computed)', () => {
    // Starts [0, 2].
    const mk = () => [
      block('1', 'Stage 1 DMG', { durationSeconds: 2 }),
      block('2', 'Stage 2 DMG', { durationSeconds: 2 }),
    ];
    const plain = calculateRotation(baseInput(mk()));
    // Window [0, 2): block 1 (start 0) in, block 2 (start 2 = end) out.
    const endOut = calculateRotation(baseInput(mk(), [ampWindow(0, 2)]));
    expect(endOut.blocks[0].damage / plain.blocks[0].damage).toBeCloseTo(1.2, 10);
    expect(endOut.blocks[1].damage).toBe(plain.blocks[1].damage);
    // Window [2, 5): block 1 out, block 2 (start 2) in.
    const startIn = calculateRotation(baseInput(mk(), [ampWindow(2, 3)]));
    expect(startIn.blocks[0].damage).toBe(plain.blocks[0].damage);
    expect(startIn.blocks[1].damage / plain.blocks[1].damage).toBeCloseTo(1.2, 10);
  });

  it('applies zero-duration windows nowhere (hand-computed)', () => {
    const mk = () => [
      block('1', 'Stage 1 DMG', { durationSeconds: 2 }),
      block('2', 'Stage 2 DMG', { durationSeconds: 2 }),
    ];
    const plain = calculateRotation(baseInput(mk()));
    // Window [2, 2): degenerate — even the block starting at t=2 is out.
    const zeroed = calculateRotation(baseInput(mk(), [ampWindow(2, 0)]));
    expect(zeroed.dpr).toBe(plain.dpr);
    expect(zeroed.blocks.map((b) => b.damage)).toEqual(plain.blocks.map((b) => b.damage));
  });

  it('stacks untimed blocks at t=0 so a t=0 window covers them (hand-computed)', () => {
    const plain = calculateRotation(baseInput([block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG')]));
    expect(plain.blocks.map((b) => b.startSeconds)).toEqual([0, 0]);
    const covered = calculateRotation(
      baseInput([block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG')], [ampWindow(0, 5)]),
    );
    expect(covered.blocks[0].damage / plain.blocks[0].damage).toBeCloseTo(1.2, 10);
    expect(covered.blocks[1].damage / plain.blocks[1].damage).toBeCloseTo(1.2, 10);
  });

  it('applies window-plus-manual buffs once, not twice (hand-computed)', () => {
    // Double application would scale by 1.2^2 = 1.44; union scales by 1.2.
    const mk = () => [
      block('1', 'Stage 1 DMG', { durationSeconds: 2 }),
      block('2', 'Stage 2 DMG', { durationSeconds: 2 }),
    ];
    const plain = calculateRotation(baseInput(mk()));
    const buff = ampWindow(0, 100);
    const global = calculateRotation(baseInput(mk(), [buff], ['wamp']));
    expect(global.dpr / plain.dpr).toBeCloseTo(1.2, 10);
    const toggled = calculateRotation(baseInput(
      [block('1', 'Stage 1 DMG', { durationSeconds: 2, activeBuffIds: ['wamp'] }), block('2', 'Stage 2 DMG', { durationSeconds: 2 })],
      [buff],
    ));
    expect(toggled.blocks[0].damage / plain.blocks[0].damage).toBeCloseTo(1.2, 10);
    expect(toggled.blocks[1].damage / plain.blocks[1].damage).toBeCloseTo(1.2, 10);
  });

  it('still scores blocks starting at or past rotation time, with a warning (hand-computed)', () => {
    // Starts [0, 6, 12] against a 10s rotation: block 3 overflows.
    const mk = () => [
      block('1', 'Stage 1 DMG', { durationSeconds: 6 }),
      block('2', 'Stage 2 DMG', { durationSeconds: 6 }),
      block('3', 'Stage 1 DMG', { durationSeconds: 6 }),
    ];
    const tight = calculateRotation({ ...baseInput(mk()), rotationTime: 10 });
    const roomy = calculateRotation({ ...baseInput(mk()), rotationTime: 100 });
    // Same damage either way — rotationTime only changes the DPS denominator.
    expect(tight.blocks.map((b) => b.damage)).toEqual(roomy.blocks.map((b) => b.damage));
    expect(tight.blocks[2].damage).toBeGreaterThan(0);
    expect(tight.dpr).toBe(tight.blocks[0].damage + tight.blocks[1].damage + tight.blocks[2].damage);
    expect(tight.warnings.some((w) => w.includes('"3"') && w.includes('scored anyway'))).toBe(true);
    expect(roomy.warnings.some((w) => w.includes('scored anyway'))).toBe(false);

    // Exactly at rotationTime counts as at-or-past.
    const edge = calculateRotation({
      ...baseInput([block('1', 'Stage 1 DMG', { durationSeconds: 5 }), block('2', 'Stage 2 DMG', { durationSeconds: 5 })]),
      rotationTime: 5,
    });
    expect(edge.warnings.some((w) => w.includes('"2"'))).toBe(true);
  });
});

describe('untimed backward compatibility', () => {
  it('scores a realistic multi-buff rotation identically with and without timing fields', () => {
    // Realistic shape: one global aura, one per-block toggle, one inactive
    // buff present but neither global nor toggled, across mixed blocks.
    const buffs: RotationBuff[] = [
      { id: 'aura', label: 'AURA', source: 'test', mods: [{ stat: 'amplify', value: 0.15 }] },
      { id: 'burst', label: 'BURST', source: 'test', mods: [{ stat: 'dmgBonus:Aero', value: 0.3 }] },
      { id: 'idle', label: 'IDLE', source: 'test', mods: [{ stat: 'amplify', value: 0.5 }] },
    ];
    const echoBlock: ActionBlock = {
      id: 'echo', skillId: '', motionName: 'Lorelei', forteLevel: 1, activeBuffIds: [],
      damageKind: 'echoSkill', echoName: 'Lorelei', echoMotionValue: 4.05, echoAttribute: 'Havoc',
    };
    const untimed = [block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG', { activeBuffIds: ['burst'] }), echoBlock];
    const timed = [
      block('1', 'Stage 1 DMG', { durationSeconds: 2 }),
      block('2', 'Stage 2 DMG', { durationSeconds: 3, activeBuffIds: ['burst'] }),
      { ...echoBlock, durationSeconds: 1 },
    ];
    const before = calculateRotation(baseInput(untimed, buffs, ['aura']));
    const after = calculateRotation(baseInput(timed, buffs, ['aura']));
    // Identical math — timing fields without windows change only startSeconds.
    expect(after.dpr).toBe(before.dpr);
    expect(after.dps).toBe(before.dps);
    expect(after.blocks.map((b) => b.damage)).toEqual(before.blocks.map((b) => b.damage));
    expect(after.blocks.map((b) => b.share)).toEqual(before.blocks.map((b) => b.share));
    expect(after.warnings).toEqual(before.warnings);
    expect(before.blocks.map((b) => b.startSeconds)).toEqual([0, 0, 0]);
    expect(after.blocks.map((b) => b.startSeconds)).toEqual([0, 2, 5]);
    // The inactive untimed buff never auto-applies (it would scale DPR by 1.5).
    const noIdle = calculateRotation(baseInput(untimed, buffs.slice(0, 2), ['aura']));
    expect(noIdle.dpr).toBe(before.dpr);
  });

  it('loads a Phase-0-era serialized objective (no timing keys) and scores it identically', () => {
    // Literal pre-change JSON — old saves contain none of the timing keys.
    const oldJson = `{
      "kind": "rotation-dpr",
      "blocks": [
        {"skillId": "1001101", "motionName": "Stage 1 DMG", "forteLevel": 10, "activeBuffIds": []},
        {"skillId": "1001101", "motionName": "Stage 2 DMG", "forteLevel": 10, "activeBuffIds": []}
      ],
      "buffs": [{"id": "oldamp", "label": "OLDAMP", "source": "test", "mods": [{"stat": "amplify", "value": 0.2}]}],
      "globalBuffIds": ["oldamp"],
      "crit": "expected"
    }`;
    // Guard the fixture itself against accidentally gaining new-shape keys.
    expect(oldJson).not.toContain('durationSeconds');
    expect(oldJson).not.toContain('windowStartSeconds');
    expect(oldJson).not.toContain('windowDurationSeconds');

    const parsed = objectiveSpecSchema.parse(JSON.parse(oldJson) as unknown);
    if (parsed.kind !== 'rotation-dpr') throw new Error('expected a rotation-dpr objective');
    // Parse preserves the old shape — timing stays absent, nothing injected.
    expect('durationSeconds' in parsed.blocks[0]).toBe(false);
    expect('windowDurationSeconds' in parsed.buffs[0]).toBe(false);
    expect(blockStartTimes(parsed.blocks)).toEqual([0, 0]);

    const sheet = emptySheet();
    sheet.critDmg = 1.5;
    const bases = {
      baseAtk: { character: 1000, weapon: 500 },
      baseHp: { character: 10000 },
      baseDef: { character: 1000 },
    };
    const ctx = {
      skills: jiyan.skills,
      attackerLevel: 90,
      enemy: buildEnemyProfile('mob', 90, 0.1, 'Aero'),
      ...bases,
    };
    const scored = scoreSheet(parsed, sheet, ctx);
    // Global amplify 0.2 scales DPR by exactly 1.2 (hand-computed).
    const unbuffed = scoreSheet({ ...parsed, buffs: [], globalBuffIds: [] }, sheet, ctx);
    expect(scored / unbuffed).toBeCloseTo(1.2, 10);
    // Identical content built with current helpers scores bit-identically.
    const rebuilt = scoreRotationBlocks(sheet, bases, {
      skills: jiyan.skills,
      attackerLevel: 90,
      enemy: buildEnemyProfile('mob', 90, 0.1, 'Aero'),
      blocks: [block('1', 'Stage 1 DMG'), block('2', 'Stage 2 DMG')],
      buffs: [{ id: 'oldamp', label: 'OLDAMP', source: 'test', mods: [{ stat: 'amplify', value: 0.2 }] }],
      globalBuffIds: ['oldamp'],
      crit: 'expected',
    });
    expect(rebuilt.dpr).toBe(scored);
  });
});
