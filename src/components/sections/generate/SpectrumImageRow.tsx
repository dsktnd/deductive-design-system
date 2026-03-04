import { ABSTRACTION_LEVELS } from "@/lib/gemini";
import type { GeneratedImage } from "@/lib/types";

function SpectrumImageRow({
  images,
  labelA,
  labelB,
  onEnlarge,
  onAddToFilter,
  addedIds,
}: {
  images: { ratio: number; image: GeneratedImage | null }[];
  labelA: string;
  labelB: string;
  onEnlarge: (src: string) => void;
  onAddToFilter: (img: GeneratedImage, ratio: number) => void;
  addedIds: Set<string>;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {images.map(({ ratio, image }, i) => (
        <div
          key={`${ratio}-${i}`}
          className="flex-shrink-0"
          style={{ width: `${Math.max(100 / images.length - 1, 14)}%`, minWidth: "160px" }}
        >
          {/* Ratio header */}
          <div className="mb-1.5 text-center">
            <span className="font-mono text-[10px] text-slate-500">
              {labelA} {100 - ratio}% / {labelB} {ratio}%
            </span>
          </div>

          {image ? (
            <div className="group overflow-hidden rounded-lg border border-slate-700 bg-slate-800/60">
              <button onClick={() => onEnlarge(image.image)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.image}
                  alt={image.text ?? "Generated architecture"}
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </button>
              <div className="p-2">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {ABSTRACTION_LEVELS.find((l) => l.level === image.abstractionLevel)?.label}
                  </span>
                  <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {image.style}
                  </span>
                </div>
                {image.prompt && (
                  <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-slate-500">
                    {image.prompt}
                  </p>
                )}
                <button
                  onClick={() => onAddToFilter(image, ratio)}
                  disabled={addedIds.has(image.id)}
                  className="mt-1.5 w-full rounded bg-slate-600 px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                >
                  {addedIds.has(image.id) ? "Added" : "Add to Filter"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/30">
              <span className="text-xs text-slate-500">Pending...</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default SpectrumImageRow;
