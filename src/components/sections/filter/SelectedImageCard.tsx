"use client";

import type { GeneratedDesign } from "@/lib/types";

export default function SelectedImageCard({
  design,
  conceptALabel,
  conceptBLabel,
  onRemove,
  onEnlarge,
}: {
  design: GeneratedDesign;
  conceptALabel?: string;
  conceptBLabel?: string;
  onRemove: (id: string) => void;
  onEnlarge: (src: string) => void;
}) {
  const ratio = design.spectrumRatio;

  return (
    <div className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50">
      <button onClick={() => onEnlarge(design.imageUrl)} className="block w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.imageUrl}
          alt={design.prompt}
          className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
      </button>
      <div className="p-2">
        {ratio != null && (
          <div className="mb-1.5">
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span className="truncate max-w-[45%]">{conceptALabel ?? "A"}</span>
              <span className="truncate max-w-[45%] text-right">{conceptBLabel ?? "B"}</span>
            </div>
            <div className="relative mt-1 h-1.5 rounded-full bg-zinc-700">
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-zinc-300 bg-zinc-200"
                style={{ left: `${ratio}%` }}
              />
            </div>
            <div className="mt-0.5 text-center font-mono text-[10px] text-zinc-500">
              {100 - ratio}/{ratio}
            </div>
          </div>
        )}
        <button
          onClick={() => onRemove(design.id)}
          className="w-full rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
