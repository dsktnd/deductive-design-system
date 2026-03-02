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
            <span className="font-mono text-[10px] text-zinc-500">
              {labelA} {100 - ratio}% / {labelB} {ratio}%
            </span>
          </div>

          {image ? (
            <div className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
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
                  <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {ABSTRACTION_LEVELS.find((l) => l.level === image.abstractionLevel)?.label}
                  </span>
                  <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {image.style}
                  </span>
                </div>
                {image.prompt && (
                  <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">
                    {image.prompt}
                  </p>
                )}
                <button
                  onClick={() => onAddToFilter(image, ratio)}
                  disabled={addedIds.has(image.id)}
                  className="mt-1.5 w-full rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                >
                  {addedIds.has(image.id) ? "Added" : "Add to Filter"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30">
              <span className="text-xs text-zinc-600">Pending...</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default SpectrumImageRow;
