"use client";

import type { StageStatus, StageType } from "./constants";
import StageImageArea from "./StageImageArea";

export default function StageCardWide({
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
      className={`flex gap-4 rounded-lg border p-4 transition-colors ${
        isActive
          ? "border-zinc-500 bg-zinc-800/60"
          : isDone
          ? "border-zinc-700 bg-zinc-900/60"
          : "border-zinc-800 bg-zinc-900/30"
      }`}
    >
      <div className="flex w-40 flex-shrink-0 flex-col justify-center">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
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
            <div className="text-sm font-semibold text-zinc-200">{stage.labelJa}</div>
            <div className="text-[10px] text-zinc-500">{stage.label}</div>
          </div>
        </div>
        <div className="mt-1.5">
          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {stage.style}
          </span>
        </div>
      </div>

      <div className="aspect-square w-48 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-800">
        <StageImageArea status={status} label={stage.labelJa} onEnlarge={onEnlarge} />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <p className="text-xs leading-relaxed text-zinc-500">{stage.description}</p>
        {status?.image?.text && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-400">
            {status.image.text}
          </p>
        )}
      </div>
    </div>
  );
}
