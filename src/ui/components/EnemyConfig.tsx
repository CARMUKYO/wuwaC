import { MAX_ENEMY_LEVEL, MAX_ENEMY_RES } from '../../domain/enemy.ts';
import { SliderField } from './SliderField.tsx';

interface EnemyConfigProps {
  kind: 'mob' | 'boss';
  level: number;
  baseRES: number;
  onKindChange: (kind: 'mob' | 'boss') => void;
  onLevelChange: (level: number) => void;
  onRESChange: (res: number) => void;
}

const selectClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100';

/**
 * Enemy inputs: kind preset + level slider + base-resistance slider.
 * Percent UI, decimal state (0.10 = 10%). Sliders clamp; the store clamps
 * again so typed values can never escape range.
 */
export function EnemyConfig({ kind, level, baseRES, onKindChange, onLevelChange, onRESChange }: EnemyConfigProps) {
  return (
    <section aria-label="Enemy config" className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <h3 className="text-sm font-semibold">Enemy Config</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        <div>
          <label htmlFor="calc-enemy-kind" className="block text-xs font-medium text-slate-300">
            Enemy kind
          </label>
          <select
            id="calc-enemy-kind"
            value={kind}
            onChange={(e) => onKindChange(e.target.value as 'mob' | 'boss')}
            className={`${selectClass} mt-1`}
          >
            <option value="mob">Mob (10% base)</option>
            <option value="boss">Boss (40% in element)</option>
          </select>
        </div>
        <SliderField
          id="calc-enemy-level"
          label="Enemy level"
          value={level}
          min={1}
          max={MAX_ENEMY_LEVEL}
          onChange={onLevelChange}
        />
        <SliderField
          id="calc-enemy-res"
          label="Base resistance"
          value={Math.round(baseRES * 100)}
          min={0}
          max={Math.round(MAX_ENEMY_RES * 100)}
          display={`${Math.round(baseRES * 100)}%`}
          onChange={(pct) => onRESChange(pct / 100)}
        />
      </div>
    </section>
  );
}
