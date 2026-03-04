import { ATMOSPHERE_PRESETS } from "./constants";

function AtmosphereSelector({
  selectedPresets,
  customAtmosphere,
  onTogglePreset,
  onCustomChange,
}: {
  selectedPresets: string[];
  customAtmosphere: string;
  onTogglePreset: (key: string) => void;
  onCustomChange: (value: string) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3">
      <label className="mb-1 block text-xs font-medium text-slate-400">
        Atmosphere / 雰囲気
      </label>
      <p className="mb-2.5 text-[10px] text-slate-500">
        生成画像のビジュアルムード・トーンを指定します。複数選択可。
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ATMOSPHERE_PRESETS.map((preset) => {
          const isSelected = selectedPresets.includes(preset.key);
          return (
            <button
              key={preset.key}
              onClick={() => onTogglePreset(preset.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-blue-500/40 gradient-accent-subtle text-blue-300"
                  : "border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
              }`}
            >
              {preset.ja}
              <span className="ml-1 text-[10px] opacity-70">{preset.en}</span>
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={customAtmosphere}
        onChange={(e) => onCustomChange(e.target.value)}
        placeholder="Custom atmosphere keywords... (e.g. misty, warm golden hour, moody shadows)"
        className="mt-2.5 w-full rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
      />
    </div>
  );
}

export default AtmosphereSelector;
