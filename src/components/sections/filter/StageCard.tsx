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
          ? "border-slate-500 bg-slate-700/60"
          : isDone
          ? "border-slate-600 bg-slate-800/60"
          : "border-slate-700 bg-slate-800/30"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-slate-700 px-3 py-2">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
            isDone
              ? "bg-slate-300 text-slate-800"
              : isActive
              ? "animate-pulse bg-slate-500 text-slate-100"
              : "bg-slate-700 text-slate-500"
          }`}
        >
          {index + 1}
        </span>
        <div>
          <div className="text-xs font-semibold text-slate-200">{stage.labelJa}</div>
          <div className="text-[10px] text-slate-500">{stage.label}</div>
        </div>
      </div>

      <div className="aspect-square">
        <StageImageArea status={status} label={stage.labelJa} onEnlarge={onEnlarge} />
      </div>

      <div className="border-t border-slate-700 px-3 py-2">
        <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">
          {stage.style}
        </span>
        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
          {stage.description}
        </p>
      </div>
    </div>
  );
}
