import { useEffect, useState } from 'react';
import { loadBundledSnapshot } from '../../data/index.ts';
import type { RosterEntry } from '../../data/schema.ts';
import { useRosterStore } from '../../state/roster.ts';
import { GameIcon } from '../components/GameIcon.tsx';
import { SliderField } from '../components/SliderField.tsx';

function defaultsFor(characterId: string): RosterEntry {
  const snapshot = loadBundledSnapshot();
  const character = snapshot.characters.find((c) => c.id === characterId)!;
  const weapon =
    snapshot.weapons.find((w) => w.weaponType === character.weaponType) ?? snapshot.weapons[0];
  return {
    characterId,
    level: 90,
    ascension: 6,
    resonanceChain: 0,
    forteLevels: {},
    weaponId: weapon.id,
    weaponLevel: 90,
    weaponRank: 1,
  };
}

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100';

export function RosterPage() {
  const entries = useRosterStore((s) => s.entries);
  const loaded = useRosterStore((s) => s.loaded);
  const load = useRosterStore((s) => s.load);
  const upsert = useRosterStore((s) => s.upsert);
  const remove = useRosterStore((s) => s.remove);
  const snapshot = loadBundledSnapshot();
  const [addingId, setAddingId] = useState('');

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const characterName = (id: string): string =>
    snapshot.characters.find((c) => c.id === id)?.name ?? id;
  const available = snapshot.characters.filter((c) => !entries.some((e) => e.characterId === c.id));

  const commit = (entry: RosterEntry, patch: Partial<RosterEntry>): void => {
    void upsert({ ...entry, ...patch }).catch(() => {
      // Out-of-range exact-value input is ignored; the last valid row
      // stays in the store and the control snaps back to it.
    });
  };

  return (
    <section>
      <h2 className="text-xl font-semibold">Character Roster</h2>

      <div className="mt-4 flex items-end gap-2">
        <div>
          <label htmlFor="roster-character" className="block text-xs font-medium text-slate-300">
            Character
          </label>
          <select
            id="roster-character"
            value={addingId}
            onChange={(e) => setAddingId(e.target.value)}
            className={inputClass}
          >
            <option value="">Pick a character…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={addingId === ''}
          onClick={() => {
            if (addingId !== '') void upsert(defaultsFor(addingId)).then(() => setAddingId(''));
          }}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-white disabled:opacity-40"
        >
          Add character
        </button>
      </div>

      <div className="mt-4">
        {!loaded ? (
          <p className="text-slate-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-400">No characters tracked yet — add one above.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => {
              const character = snapshot.characters.find((c) => c.id === entry.characterId);
              const scorable = character?.skills.filter((s) => s.motionValues.length > 0) ?? [];
              const name = characterName(entry.characterId);
              const usableWeapons = character
                ? snapshot.weapons.filter((w) => w.weaponType === character.weaponType)
                : snapshot.weapons;
              const storedWeapon = snapshot.weapons.find((w) => w.id === entry.weaponId);
              const mismatchedWeapon =
                character && storedWeapon && storedWeapon.weaponType !== character.weaponType
                  ? storedWeapon
                  : undefined;
              return (
                <li key={entry.characterId} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GameIcon name={name} iconUrl={character?.iconUrl} />
                      <h3 className="text-sm font-semibold">{name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => void remove(entry.characterId)}
                      className="rounded-md px-2 py-1 text-sm text-red-300 hover:bg-slate-800"
                    >
                      Remove {name}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                    <SliderField
                      id={`roster-level-${entry.characterId}`}
                      label={`Level for ${name}`}
                      value={entry.level}
                      min={1}
                      max={90}
                      onChange={(v) => commit(entry, { level: v })}
                    />
                    <SliderField
                      id={`roster-ascension-${entry.characterId}`}
                      label={`Ascension for ${name}`}
                      value={entry.ascension}
                      min={0}
                      max={6}
                      onChange={(v) => commit(entry, { ascension: v })}
                    />
                    <SliderField
                      id={`roster-chain-${entry.characterId}`}
                      label={`Chain rank for ${name}`}
                      value={entry.resonanceChain}
                      min={0}
                      max={6}
                      onChange={(v) => commit(entry, { resonanceChain: v })}
                    />
                    <div>
                      <label className="block text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <GameIcon name={storedWeapon?.name ?? 'Weapon'} iconUrl={storedWeapon?.iconUrl} size="sm" />
                          Weapon
                        </span>
                        <select
                          aria-label={`Weapon for ${name}`}
                          value={entry.weaponId}
                          onChange={(e) => commit(entry, { weaponId: e.target.value })}
                          className={`${inputClass} mt-0.5`}
                        >
                          {mismatchedWeapon && (
                            <option value={mismatchedWeapon.id}>
                              {`${mismatchedWeapon.name} (${mismatchedWeapon.weaponType}, wrong type)`}
                            </option>
                          )}
                          {usableWeapons.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </label>
                      {mismatchedWeapon && character && (
                        <p role="alert" className="mt-1 text-xs text-amber-300">
                          {name} needs a {character.weaponType} — pick one to fix this entry.
                        </p>
                      )}
                    </div>
                    <SliderField
                      id={`roster-weapon-level-${entry.characterId}`}
                      label={`Weapon level for ${name}`}
                      value={entry.weaponLevel}
                      min={1}
                      max={90}
                      onChange={(v) => commit(entry, { weaponLevel: v })}
                    />
                    <SliderField
                      id={`roster-weapon-rank-${entry.characterId}`}
                      label={`Weapon rank for ${name}`}
                      value={entry.weaponRank}
                      min={1}
                      max={5}
                      onChange={(v) => commit(entry, { weaponRank: v })}
                    />
                    <SliderField
                      id={`roster-weapon-ascension-${entry.characterId}`}
                      label={`Weapon ascension for ${name}`}
                      value={entry.weaponAscension ?? 0}
                      min={0}
                      max={6}
                      onChange={(v) => commit(entry, { weaponAscension: v })}
                    />
                  </div>
                  {scorable.length > 0 && (
                    <fieldset className="mt-2">
                      <legend className="text-xs text-slate-300">Forte levels (unset shows 10 — touch to store)</legend>
                      <div className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-3">
                        {scorable.map((skill) => (
                          <SliderField
                            key={skill.id}
                            id={`roster-forte-${entry.characterId}-${skill.id}`}
                            label={`${skill.label} forte level`}
                            value={entry.forteLevels[skill.id] ?? 10}
                            min={1}
                            max={10}
                            onChange={(v) =>
                              commit(entry, { forteLevels: { ...entry.forteLevels, [skill.id]: v } })
                            }
                          />
                        ))}
                      </div>
                    </fieldset>
                  )}
                  {character && character.forteNodes.length > 0 && (
                    <fieldset className="mt-2">
                      <legend className="text-xs text-slate-300">Forte nodes unlocked (untouched = all active)</legend>
                      <div className="mt-1 grid grid-cols-2 gap-1 md:grid-cols-3">
                        {character.forteNodes.map((node) => {
                          const unlocked = entry.forteUnlockedIds === undefined
                            ? true
                            : entry.forteUnlockedIds.includes(node.id);
                          return (
                            <label key={node.id} className="flex items-center gap-2 text-xs text-slate-300">
                              <input
                                type="checkbox"
                                aria-label={`${node.title} unlocked for ${name}`}
                                checked={unlocked}
                                onChange={() => {
                                  const current = entry.forteUnlockedIds === undefined
                                    ? character.forteNodes.map((n) => n.id)
                                    : entry.forteUnlockedIds;
                                  commit(entry, {
                                    forteUnlockedIds: unlocked
                                      ? current.filter((id) => id !== node.id)
                                      : [...current, node.id],
                                  });
                                }}
                              />
                              <span>{node.title}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
