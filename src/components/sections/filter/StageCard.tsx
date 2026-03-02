"use client";

import type { StageStatus, StageType } from "./constants";
import StageImageArea from "./StageImageArea";

export default function StageCard({
  stage,
  index,
  status,
  isActive,
  onEnlarge,
}: {
  stage: StageType;
  index: number;
  status: StageStatus | undefined;
  isActive: boolean;
  onEnlarge: (src: string) => void;
}) {
  const isDone = status?.image != null;

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-colors ${
        isActive
          ? "border-zinc-500 bg-zinc-800/60"
          : isDone
          ? "border-zinc-700 bg-zinc-900/60"
          : "border-zinc-800 bg-zinc-900/30"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
            isDone
              ? "bg-zinc-300 text-zinc-900"
              : isActive
              ? "animate-pulse bg-zinc-500 text-zinc-100"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {index + 1}
        </span>
        <div>
          <div className="text-xs font-semibold text-zinc-200">{stage.labelJa}</div>
          <div className="text-[10px] text-zinc-500">{stage.label}</div>
        </div>
      </div>

      <div className="aspect-square">
        <StageImageArea status={status} label={stage.labelJa} onEnlarge={onEnlarge} />
      </div>

      <div className="border-t border-zinc-800 px-3 py-2">
        <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {stage.style}
        </span>
        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
          {stage.description}
        </p>
      </div>
    </div>
  );
}
