import { useEffect, useState } from 'react';
import { loadBundledSnapshot } from '../../data/index.ts';
import type { RosterEntry } from '../../data/schema.ts';
import { useRosterStore } from '../../state/roster.ts';
import { GameIcon } from '../components/GameIcon.tsx';
import { SliderField } from '../components/SliderField.tsx';
import { btnDangerGhost, btnPrimary, inputClass, labelClass } from '../components/classes.ts';
import { Collapsible } from '../components/Collapsible.tsx';
import { Skeleton, ToastStack } from '../components/feedback.tsx';
import { useToasts } from '../toasts.ts';
import { MotifEmptyState } from '../components/motif.tsx';
import { AttributeDot, PageHeader } from '../components/ui.tsx';

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

export function RosterPage() {
  const entries = useRosterStore((s) => s.entries);
  const loaded = useRosterStore((s) => s.loaded);
  const load = useRosterStore((s) => s.load);
  const upsert = useRosterStore((s) => s.upsert);
  const remove = useRosterStore((s) => s.remove);
  const snapshot = loadBundledSnapshot();
  const [addingId, setAddingId] = useState('');
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

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
      <PageHeader
        eyebrow="02 // Resonators"
        title="Character Roster"
        description="Who you've built — levels, weapons, and forte investment the Calculator can prefill."
        actions={
          <>
            <select
              id="roster-character"
              aria-label="Character"
              value={addingId}
              onChange={(e) => setAddingId(e.target.value)}
              className={`${inputClass} w-auto min-w-48`}
            >
              <option value="">Pick a character…</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={addingId === ''}
              onClick={() => {
                if (addingId === '') return;
                const id = addingId;
                void upsert(defaultsFor(id)).then(() => {
                  setAddingId('');
                  pushToast(`${characterName(id)} joined the roster.`);
                });
              }}
              className={btnPrimary}
            >
              Add character
            </button>
          </>
        }
      />

      <div className="mt-4">
        {!loaded ? (
          <Skeleton lines={3} />
        ) : entries.length === 0 ? (
          <MotifEmptyState seed="roster-empty">No characters tracked yet — add one above.</MotifEmptyState>
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
                <li key={entry.characterId} className="animate-tt-fade relative rounded-lg border border-line bg-panel p-4">
                  <span aria-hidden="true" className="seal-stamp absolute -top-2.5 right-4 px-2 py-0.5 text-xs">
                    S{entry.resonanceChain}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex min-w-0 flex-1 basis-48 items-center gap-2.5">
                      <GameIcon name={name} iconUrl={character?.iconUrl} />
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-2xl leading-none font-semibold tracking-wide text-ink">{name}</h3>
                        {character && (
                          <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
                            <AttributeDot attribute={character.attribute} />
                            {character.attribute} · {character.weaponType}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void remove(entry.characterId).then(() => pushToast(`${name} left the roster.`))}
                      className={`${btnDangerGhost} ml-auto shrink-0 px-2 py-1 text-xs`}
                    >
                      Remove {name}
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
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
                      <label className={labelClass}>
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
                        <p role="alert" className="mt-1 text-xs text-amber">
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
                    <div className="mt-4">
                      <Collapsible title="Forte levels" defaultOpen>
                        <p className="mb-2 font-mono text-[11px] tracking-[0.08em] text-dim uppercase">
                          Unset shows 10 — touch to store
                        </p>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
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
                      </Collapsible>
                    </div>
                  )}
                  {character && character.forteNodes.length > 0 && (
                    <div className="mt-4">
                      <Collapsible title="Forte nodes unlocked" defaultOpen>
                        <p className="mb-2 font-mono text-[11px] tracking-[0.08em] text-dim uppercase">
                          Untouched = all active
                        </p>
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {character.forteNodes.map((node) => {
                          const unlocked = entry.forteUnlockedIds === undefined
                            ? true
                            : entry.forteUnlockedIds.includes(node.id);
                          return (
                            <label key={node.id} className="flex items-center gap-2 text-xs text-fog">
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
                      </Collapsible>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
