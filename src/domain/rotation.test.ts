import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { ownedEchoSchema, type OwnedEcho, type RosterEntry } from '../data/schema.ts';
import { buildEnemyProfile } from './enemy.ts';
import { calculateRotation, isBlockStale, scoreRotationBlocks, type ActionBlock, type RotationBuff, type RotationInput } from './rotation.ts';
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

  it('scores buff-only outros as zero-damage carriers', () => {
    const result = calculateRotation(
      baseInput([{ id: 'o', skillId: '1001109', motionName: '', forteLevel: 1, activeBuffIds: [] }]),
    );
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].damage).toBe(0);
    expect(result.blocks[0].share).toBe(0);
    expect(result.blocks[0].buffCarrier).toBe(true);
    expect(result.dpr).toBe(0);
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
});

describe('Cartethyia status rotation rules', () => {
  it('activates S4 all-attribute damage bonus after an explicit Aero Erosion event', () => {
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
    expect(after.blocks[1].damage / before.blocks[0].damage).toBeCloseTo(1.2, 10);
  });
});
