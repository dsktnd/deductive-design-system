import type { GeneratedImage } from "@/lib/types";
import { generateSpectrumSteps } from "./constants";

function SpectrumBar({
  labelA,
  labelB,
  steps,
  currentStep,
  generating,
  images,
}: {
  labelA: string;
  labelB: string;
  steps: number;
  currentStep: number;
  generating: boolean;
  images: { ratio: number; image: GeneratedImage | null }[];
}) {
  const ratios = generateSpectrumSteps(steps);

  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-4">
      {/* Axis labels */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{labelA}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Design Space Spectrum
        </span>
        <span className="text-sm font-medium text-slate-300">{labelB}</span>
      </div>

      {/* Spectrum gradient bar */}
      <div className="relative h-2 rounded-full bg-gradient-to-r from-slate-500 to-slate-400">
        {ratios.map((ratio, i) => {
          const hasImage = images[i]?.image != null;
          const isCurrent = generating && i === currentStep;
          return (
            <div
              key={ratio}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${
                isCurrent
                  ? "h-5 w-5 animate-pulse border-white bg-slate-200"
                  : hasImage
                  ? "h-4 w-4 border-slate-200 bg-slate-300"
                  : "h-3 w-3 border-slate-500 bg-slate-600"
              }`}
              style={{ left: `${ratio}%` }}
            />
          );
        })}
      </div>

      {/* Ratio labels */}
      <div className="relative mt-1.5 h-4">
        {ratios.map((ratio) => (
          <span
            key={ratio}
            className="absolute -translate-x-1/2 font-mono text-[10px] text-slate-500"
            style={{ left: `${ratio}%` }}
          >
            {100 - ratio}/{ratio}
          </span>
        ))}
      </div>
    </div>
  );
}

export default SpectrumBar;
