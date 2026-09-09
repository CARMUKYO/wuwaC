interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Text shown next to the label (e.g. "90" or "10%"). Defaults to the value. */
  display?: string;
  onChange: (value: number) => void;
}

/**
 * Slider + synced number input. The slider is the primary control (spec:
 * level sliders 1-90, skill sliders 1-10); the number field covers
 * out-of-range typing and screen-reader users. Invalid text is ignored —
 * the last valid value stays, matching `RosterPage` behavior.
 */
export function SliderField({ id, label, value, min, max, step = 1, display, onChange }: SliderFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-300">
        <span className="flex items-baseline justify-between">
          <span>{label}</span>
          <span className="text-sm font-semibold text-slate-100" aria-hidden="true">
            {display ?? value}
          </span>
        </span>
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-slate-100"
        />
        <input
          aria-label={`${label} (exact value)`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            if (e.target.value.trim() === '') return;
            const num = Number(e.target.value);
            if (!Number.isFinite(num)) return;
            onChange(num);
          }}
          className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
        />
      </div>
    </div>
  );
}
