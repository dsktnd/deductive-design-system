"use client";

import { useState } from "react";
import type { DomainEvaluation } from "@/lib/types";
import { DETAIL_STAGE_LABELS, DOMAIN_LABELS, scoreColor, scoreTextColor } from "./constants";
import type { ImprovementData } from "./constants";

function DomainCard({
  evaluation,
  previousScore,
  onRequestImprove,
  improvementData,
  isLoadingImprovement,
  onRegenerateImage,
  regeneratingImages,
}: {
  evaluation: DomainEvaluation;
  previousScore: number | null;
  onRequestImprove: (evaluation: DomainEvaluation) => void;
  improvementData: ImprovementData | null;
  isLoadingImprovement: boolean;
  onRegenerateImage: (stageKey: string, hint: string) => void;
  regeneratingImages: Set<string>;
}) {
  const labels = DOMAIN_LABELS[evaluation.domain] ?? {
    en: evaluation.domain,
    ja: evaluation.domainJa || "",
  };
  const [showImprovement, setShowImprovement] = useState(false);

  const scoreDelta = previousScore != null ? evaluation.score - previousScore : null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      {/* Header with domain name and score */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-200">
            {labels.ja}
          </span>
          <span className="text-xs text-zinc-500">{labels.en}</span>
        </div>
        <div className="flex items-center gap-2">
          {scoreDelta != null && scoreDelta !== 0 && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                scoreDelta > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {scoreDelta > 0 ? "+" : ""}{scoreDelta}
            </span>
          )}
          <span
            className={`text-xl font-bold tabular-nums ${scoreTextColor(evaluation.score)}`}
          >
            {evaluation.score}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-3 h-2 rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreColor(evaluation.score)}`}
          style={{ width: `${evaluation.score}%` }}
        />
      </div>

      {/* Comment */}
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        {evaluation.comment}
      </p>

      {/* Strengths */}
      {evaluation.strengths?.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">
            Strengths
          </div>
          <ul className="space-y-0.5">
            {evaluation.strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-emerald-400/80"
              >
                <span className="mt-0.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500/50" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {evaluation.improvements?.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500/70">
            Improvements
          </div>
          <ul className="space-y-0.5">
            {evaluation.improvements.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-amber-400/80"
              >
                <span className="mt-0.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500/50" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improve button for low scores */}
      {evaluation.score < 60 && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <button
            onClick={() => {
              if (!improvementData && !isLoadingImprovement) {
                onRequestImprove(evaluation);
              }
              setShowImprovement(!showImprovement);
            }}
            disabled={isLoadingImprovement}
            className="flex w-full items-center justify-between rounded-md border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-left text-xs font-medium text-amber-400 transition-colors hover:bg-amber-900/30 disabled:opacity-50"
          >
            <span>{isLoadingImprovement ? "分析中..." : "改善する"}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${showImprovement ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Improvement suggestions panel */}
          {showImprovement && improvementData && (
            <div className="mt-3 space-y-3">
              {/* Suggestions */}
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  AI Improvement Suggestions
                </div>
                <ul className="space-y-1.5">
                  {improvementData.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="rounded border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs leading-relaxed text-zinc-300"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Regeneration hints */}
              {improvementData.revisedPromptHints.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Suggested Regeneration
                  </div>
                  <div className="space-y-2">
                    {improvementData.revisedPromptHints.map((ph, i) => {
                      const stageLabel = DETAIL_STAGE_LABELS[ph.targetImage];
                      const isRegenerating = regeneratingImages.has(ph.targetImage);
                      return (
                        <div
                          key={i}
                          className="rounded border border-zinc-800 bg-zinc-900/80 px-3 py-2"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-zinc-400">
                              {stageLabel?.labelJa ?? ph.targetImage}{" "}
                              <span className="text-zinc-600">{stageLabel?.label}</span>
                            </span>
                            <button
                              onClick={() => onRegenerateImage(ph.targetImage, ph.hint)}
                              disabled={isRegenerating}
                              className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition-colors hover:border-zinc-400 hover:text-white disabled:opacity-50"
                            >
                              {isRegenerating ? "再生成中..." : "再生成"}
                            </button>
                          </div>
                          <p className="text-xs leading-relaxed text-zinc-500">
                            {ph.hint}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading state */}
          {showImprovement && isLoadingImprovement && (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
              改善提案を生成中...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DomainCard;
