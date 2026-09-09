import { useEffect, useMemo } from 'react';
import { findEchoDef, loadBundledSnapshot } from '../../data/index.ts';
import type { CritMode } from '../../domain/damage.ts';
import { buildEnemyProfile } from '../../domain/enemy.ts';
import { calculateRotation, type BlockResult } from '../../domain/rotation.ts';
import { useCalculatorStore } from '../../state/calculator.ts';
import { useInventoryStore } from '../../state/inventory.ts';
import { useRosterStore } from '../../state/roster.ts';
import { EnemyConfig } from '../components/EnemyConfig.tsx';
import { RotationOptimizer } from '../components/RotationOptimizer.tsx';
import { RotationTimeline } from '../components/RotationTimeline.tsx';
import { SliderField } from '../components/SliderField.tsx';

const selectClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100';
const labelClass = 'block text-xs font-medium text-slate-300';

/** Default weapon for a character: first of its type, else the first weapon. */
function defaultWeaponFor(snapshot: ReturnType<typeof loadBundledSnapshot>, characterId: string): string {
  const character = snapshot.characters.find((c) => c.id === characterId);
  if (!character) return '';
  return (
    snapshot.weapons.find((w) => w.weaponType === character.weaponType)?.id ?? snapshot.weapons[0].id
  );
}

export function CalculatorPage() {
  const snapshot = loadBundledSnapshot();
  const calc = useCalculatorStore();
  const rosterEntries = useRosterStore((s) => s.entries);
  const rosterLoaded = useRosterStore((s) => s.loaded);
  const loadRoster = useRosterStore((s) => s.load);
  const echoes = useInventoryStore((s) => s.echoes);
  const inventoryLoaded = useInventoryStore((s) => s.loaded);
  const loadInventory = useInventoryStore((s) => s.load);

  useEffect(() => {
    if (!rosterLoaded) void loadRoster();
  }, [rosterLoaded, loadRoster]);
  useEffect(() => {
    if (!inventoryLoaded) void loadInventory();
  }, [inventoryLoaded, loadInventory]);

  const character = snapshot.characters.find((c) => c.id === calc.characterId);
  const weapon = snapshot.weapons.find((w) => w.id === calc.weaponId);
  const scorable = character?.skills.filter((s) => s.motionValues.length > 0) ?? [];
  const buffOnly = character?.skills.filter((s) => s.motionValues.length === 0) ?? [];
  /** Pistols resonators use pistols: the list filters, mismatches warn and block scoring. */
  const usableWeapons = character
    ? snapshot.weapons.filter((w) => w.weaponType === character.weaponType)
    : snapshot.weapons;
  const weaponMismatch =
    character !== undefined && weapon !== undefined && weapon.weaponType !== character.weaponType;

  const characterName = (id: string): string =>
    snapshot.characters.find((c) => c.id === id)?.name ?? id;
  const echoById = new Map(echoes.map((e) => [e.id, e]));
  const picked = calc.echoIds.map((id) => (id === null ? null : (echoById.get(id) ?? null)));
  const costTotal = picked.reduce((sum, e) => sum + (e?.cost ?? 0), 0);
  const pickedIds = picked.filter((e) => e !== null).map((e) => e.id);
  const hasDuplicates = new Set(pickedIds).size !== pickedIds.length;

  const handleRosterPick = (pickedId: string): void => {
    if (pickedId === '') return;
    const entry = rosterEntries.find((e) => e.characterId === pickedId);
    if (entry) calc.resetFromRoster(entry);
  };

  const handleCharacterPick = (id: string): void => {
    calc.setCharacterId(id);
    if (id !== '' && calc.weaponId === '') {
      const weaponId = defaultWeaponFor(snapshot, id);
      if (weaponId !== '') calc.setWeaponId(weaponId);
    }
  };

  // Shared rotation context: the live scorer and the optimizer panel read
  // the same roster/enemy so recommendations always match the header DPR.
  const rosterEntry = useMemo(
    () =>
      character && weapon && !weaponMismatch
        ? {
            characterId: character.id,
            level: calc.level,
            ascension: calc.ascension,
            resonanceChain: calc.resonanceChain,
            forteLevels: calc.forteLevels,
            weaponId: weapon.id,
            weaponLevel: calc.weaponLevel,
            weaponRank: calc.weaponRank,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      character?.id, weapon?.id, calc.level, calc.ascension, calc.resonanceChain,
      calc.forteLevels, calc.weaponLevel, calc.weaponRank,
    ],
  );
  const enemyProfile = useMemo(
    () =>
      character
        ? buildEnemyProfile(calc.enemyKind, calc.enemyLevel, calc.enemyBaseRES, character.attribute)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [character?.id, calc.enemyKind, calc.enemyLevel, calc.enemyBaseRES],
  );

  // Rotation scoring: gated on character + weapon + 5 distinct echoes
  // (Phase 2 decision — no partial-loadout scores). Domain throws become
  // inline errors; they never crash the page.
  const pickedKey = pickedIds.join(',');
  const scoring = useMemo(() => {
    if (!character || !weapon || !enemyProfile) return null;
    if (weaponMismatch || !rosterEntry) {
      return {
        result: null,
        error: `${character.name} can't use ${weapon.name} — pick a ${character.weaponType}.` as string | null,
      };
    }
    const resolved = picked.map((e) => e);
    if (resolved.some((e) => e === null) || hasDuplicates) return null;
    const combo = resolved.filter((e) => e !== null);
    try {
      const result = calculateRotation({
        character,
        weapon,
        roster: rosterEntry,
        echoes: combo,
        sonataSets: snapshot.sonataSets,
        enemy: enemyProfile,
        blocks: calc.blocks,
        buffs: calc.buffs,
        globalBuffIds: calc.globalBuffIds,
        rotationTime: calc.rotationTime,
        crit: calc.crit,
      });
      return { result, error: null as string | null };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : String(err) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    character?.id, weapon?.id, rosterEntry, enemyProfile, pickedKey,
    calc.blocks, calc.buffs,
    calc.globalBuffIds, calc.rotationTime, calc.crit,
  ]);

  const resultsById = useMemo(
    () => new Map<string, BlockResult>((scoring?.result?.blocks ?? []).map((b) => [b.id, b])),
    [scoring],
  );
  const echoGateOpen = character !== undefined && weapon !== undefined &&
    (picked.some((e) => e === null) || hasDuplicates);

  return (
    <section>
      <h2 className="text-xl font-semibold">Damage Calculator</h2>
      <p className="mt-1 text-xs text-slate-500">
        Build a rotation from real kit motions — DPR sums every action, DPS divides by rotation time.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <label htmlFor="calc-roster" className={labelClass}>
            Prefill from roster
          </label>
          <select
            id="calc-roster"
            value={calc.rosterSourceId}
            onChange={(e) => handleRosterPick(e.target.value)}
            className={`${selectClass} mt-0.5`}
          >
            <option value="">Manual input</option>
            {rosterEntries.map((entry) => (
              <option key={entry.characterId} value={entry.characterId}>
                {characterName(entry.characterId)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="calc-character" className={labelClass}>
            Character
          </label>
          <select
            id="calc-character"
            value={calc.characterId}
            onChange={(e) => handleCharacterPick(e.target.value)}
            className={`${selectClass} mt-0.5`}
          >
            <option value="">Pick a character…</option>
            {snapshot.characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="calc-weapon" className={labelClass}>
            Weapon
          </label>
          <select
            id="calc-weapon"
            value={calc.weaponId}
            onChange={(e) => calc.setWeaponId(e.target.value)}
            className={`${selectClass} mt-0.5`}
          >
            <option value="">Pick a weapon…</option>
            {weaponMismatch && weapon && (
              <option value={weapon.id}>{`${weapon.name} (${weapon.weaponType}, wrong type)`}</option>
            )}
            {usableWeapons.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          {weaponMismatch && character && weapon && (
            <p role="alert" className="mt-1 text-xs text-amber-300">
              {character.name} needs a {character.weaponType} — {weapon.name} is a {weapon.weaponType}.
            </p>
          )}
        </div>
      </div>

      {character === undefined ? (
        <p className="mt-4 text-slate-400">
          Pick a character above — or prefill from your roster — to unlock level and skill inputs.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SliderField
              id="calc-level"
              label="Character level"
              value={calc.level}
              min={1}
              max={90}
              onChange={calc.setLevel}
            />
            <SliderField
              id="calc-weapon-level"
              label="Weapon level"
              value={calc.weaponLevel}
              min={1}
              max={90}
              onChange={calc.setWeaponLevel}
            />
            <SliderField
              id="calc-ascension"
              label="Ascension"
              value={calc.ascension}
              min={0}
              max={6}
              onChange={calc.setAscension}
            />
            <SliderField
              id="calc-chain"
              label="Resonance chain"
              value={calc.resonanceChain}
              min={0}
              max={6}
              onChange={calc.setResonanceChain}
            />
            <SliderField
              id="calc-weapon-rank"
              label="Weapon rank"
              value={calc.weaponRank}
              min={1}
              max={5}
              onChange={calc.setWeaponRank}
            />
            <SliderField
              id="calc-rotation-time"
              label="Rotation time"
              value={calc.rotationTime}
              min={1}
              max={120}
              step={0.5}
              display={`${calc.rotationTime}s`}
              onChange={calc.setRotationTime}
            />
          </div>

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">Skill levels (1-10)</legend>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {scorable.map((skill) => (
                <SliderField
                  key={skill.id}
                  id={`calc-forte-${skill.id}`}
                  label={skill.label}
                  value={calc.forteLevels[skill.id] ?? 10}
                  min={1}
                  max={10}
                  onChange={(v) => calc.setForteLevel(skill.id, v)}
                />
              ))}
            </div>
            {buffOnly.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Buff-only (no damage component — add below as buff carriers):{' '}
                {buffOnly.map((s) => s.label).join(', ')}
              </p>
            )}
          </fieldset>
        </>
      )}

      <div className="mt-4">
        <EnemyConfig
          kind={calc.enemyKind}
          level={calc.enemyLevel}
          baseRES={calc.enemyBaseRES}
          onKindChange={calc.setEnemyKind}
          onLevelChange={calc.setEnemyLevel}
          onRESChange={calc.setEnemyBaseRES}
        />
      </div>

      <section aria-label="Echo loadout" className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Echo Loadout</h3>
          <span
            className={`text-xs font-medium ${costTotal > 12 ? 'text-red-300' : costTotal === 12 ? 'text-green-300' : 'text-slate-400'}`}
          >
            {costTotal}/12 cost
          </span>
        </div>
        {echoes.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            No echoes in inventory yet — add some on the Inventory tab first.
          </p>
        ) : (
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {calc.echoIds.map((id, i) => (
              <div key={i}>
                <label htmlFor={`calc-echo-${i + 1}`} className={labelClass}>
                  {`Echo slot ${i + 1}`}
                </label>
                <select
                  id={`calc-echo-${i + 1}`}
                  value={id ?? ''}
                  onChange={(e) => calc.setEchoSlot(i, e.target.value === '' ? null : e.target.value)}
                  className={`${selectClass} mt-0.5`}
                >
                  <option value="">Empty</option>
                  {echoes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {`${e.label ?? findEchoDef(snapshot, e.echoDefId)?.name ?? e.echoDefId} (cost ${e.cost})`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
        {hasDuplicates && (
          <p role="alert" className="mt-2 text-xs text-red-300">
            The same Echo is picked twice — each Echo can only be equipped once.
          </p>
        )}
        {costTotal > 12 && (
          <p role="alert" className="mt-2 text-xs text-red-300">
            Over the 12-cost budget — swap in cheaper Echoes.
          </p>
        )}
      </section>

      {character !== undefined && weapon !== undefined && (
        <section aria-label="Rotation builder" className="mt-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-semibold">Rotation Builder</h3>
            <div className="w-40">
              <label htmlFor="calc-crit" className={labelClass}>
                Crit mode
              </label>
              <select
                id="calc-crit"
                value={calc.crit}
                onChange={(e) => calc.setCrit(e.target.value as CritMode)}
                className={`${selectClass} mt-0.5`}
              >
                <option value="expected">Expected</option>
                <option value="crit">Crit</option>
                <option value="nonCrit">No crit</option>
              </select>
            </div>
          </div>
          {scoring?.error && (
            <div role="alert" className="mt-2 rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
              {scoring.error}
            </div>
          )}
          {echoGateOpen && (
            <p className="mt-2 text-slate-400">
              Pick 5 distinct echoes above to score the rotation — blocks and buffs stay editable meanwhile.
            </p>
          )}
          <div className="mt-2">
            <RotationTimeline
              character={character}
              resonanceChain={calc.resonanceChain}
              forteLevels={calc.forteLevels}
              blocks={calc.blocks}
              buffs={calc.buffs}
              globalBuffIds={calc.globalBuffIds}
              results={resultsById}
              dpr={scoring?.result?.dpr ?? null}
              dps={scoring?.result?.dps ?? null}
              rotationTime={calc.rotationTime}
              onAddBlock={(skillId, motionName, forteLevel, options) =>
                calc.addBlock({ skillId, motionName, forteLevel, activeBuffIds: [], ...options })}
              onRemoveBlock={calc.removeBlock}
              onMoveBlock={calc.moveBlock}
              onSetBlockForte={calc.setBlockForte}
              onSetBlockStatusStacks={calc.setBlockStatusStacks}
              onSetBlockConviction={calc.setBlockConviction}
              onToggleBlockBuff={calc.toggleBlockBuff}
              onToggleGlobalBuff={calc.toggleGlobalBuff}
              onAddBuff={(buff) => calc.addBuff(buff)}
              onRemoveBuff={calc.removeBuff}
            />
            {(scoring?.result?.warnings.length ?? 0) > 0 && (
              <p className="mt-2 text-xs text-amber-300">
                {scoring?.result?.warnings.length} unmodeled effect{(scoring?.result?.warnings.length ?? 0) === 1 ? '' : 's'} —
                conditional/custom kit text that never touches the numbers.
              </p>
            )}
          </div>
          {rosterEntry && enemyProfile && (
            <div className="mt-4">
              <RotationOptimizer
                character={character}
                weapon={weapon}
                roster={rosterEntry}
                echoes={echoes}
                sonataSets={snapshot.sonataSets}
                enemy={enemyProfile}
                blocks={calc.blocks}
                buffs={calc.buffs}
                globalBuffIds={calc.globalBuffIds}
                crit={calc.crit}
                currentDpr={scoring?.result?.dpr ?? null}
                rotationTime={calc.rotationTime}
                onApply={(echoIds) => {
                  echoIds.slice(0, 5).forEach((id, i) => calc.setEchoSlot(i, id));
                }}
              />
            </div>
          )}
        </section>
      )}
    </section>
  );
}
