import type { EvaluationResult } from "@/lib/types";
import { DOMAIN_LABELS, scoreColor, scoreTextColor } from "./constants";

function EvaluationHistoryItem({
  result,
  previousResult,
  isActive,
  index,
  onClick,
}: {
  result: EvaluationResult;
  previousResult: EvaluationResult | null;
  isActive: boolean;
  index: number;
  onClick: () => void;
}) {
  const date = new Date(result.timestamp);
  const timeStr = date.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const delta = previousResult
    ? result.overallScore - previousResult.overallScore
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
        isActive
          ? "border-zinc-600 bg-zinc-800/80"
          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-500">
            {index + 1}
          </span>
          <span className="text-xs text-zinc-500">{timeStr}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {delta != null && delta !== 0 && (
            <span
              className={`text-[10px] font-semibold tabular-nums ${
                delta > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {delta > 0 ? "+" : ""}{delta}
            </span>
          )}
          <span
            className={`text-sm font-bold tabular-nums ${scoreTextColor(result.overallScore)}`}
          >
            {result.overallScore}
          </span>
        </div>
      </div>
      <div className="mt-1 flex gap-1">
        {result.evaluations.map((e) => (
          <div
            key={e.domain}
            className={`h-1.5 flex-1 rounded-full ${scoreColor(e.score)}`}
            title={`${DOMAIN_LABELS[e.domain]?.ja ?? e.domain}: ${e.score}`}
          />
        ))}
      </div>
    </button>
  );
}

export default EvaluationHistoryItem;
