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
          ? "border-slate-500 bg-slate-700/60"
          : isDone
          ? "border-slate-600 bg-slate-800/60"
          : "border-slate-700 bg-slate-800/30"
      }`}
    >
      <div className="flex w-40 flex-shrink-0 flex-col justify-center">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
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
            <div className="text-sm font-semibold text-slate-200">{stage.labelJa}</div>
            <div className="text-[10px] text-slate-500">{stage.label}</div>
          </div>
        </div>
        <div className="mt-1.5">
          <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">
            {stage.style}
          </span>
        </div>
      </div>

      <div className="aspect-square w-48 flex-shrink-0 overflow-hidden rounded-lg border border-slate-700">
        <StageImageArea status={status} label={stage.labelJa} onEnlarge={onEnlarge} />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <p className="text-xs leading-relaxed text-slate-500">{stage.description}</p>
        {status?.image?.text && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400">
            {status.image.text}
          </p>
        )}
      </div>
    </div>
  );
}
