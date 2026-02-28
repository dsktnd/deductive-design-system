"use client";

import { useState, useMemo } from "react";
import { useAppState } from "@/lib/store";
import { ResearchDomain } from "@/lib/types";
import type { DomainEvaluation, EvaluationResult, GeneratedImage } from "@/lib/types";

const DETAIL_STAGE_LABELS: Record<string, { label: string; labelJa: string }> = {
  diagram: { label: "Diagram", labelJa: "ダイアグラム" },
  concept: { label: "Concept Image", labelJa: "コンセプトイメージ" },
  material: { label: "Material Board", labelJa: "マテリアルボード" },
  exterior: { label: "Exterior", labelJa: "外観イメージ" },
  interior: { label: "Interior", labelJa: "内観イメージ" },
};

const DETAIL_STAGE_META: Record<string, { style: string; abstractionLevel: number; description: string }> = {
  diagram: { style: "Diagram", abstractionLevel: 2, description: "Design concept expressed as an abstract diagram" },
  concept: { style: "Sketch", abstractionLevel: 2, description: "Evocative concept image capturing atmosphere" },
  material: { style: "Sketch", abstractionLevel: 1, description: "Material palette — textures, colors, samples" },
  exterior: { style: "Photorealistic", abstractionLevel: 4, description: "Photorealistic exterior view" },
  interior: { style: "Photorealistic", abstractionLevel: 3, description: "Photorealistic interior view" },
};

const STAGE_ORDER = ["diagram", "concept", "material", "exterior", "interior"];

const DOMAIN_LABELS: Record<string, { en: string; ja: string }> = {
  [ResearchDomain.Environment]: { en: "Environment", ja: "環境" },
  [ResearchDomain.Market]: { en: "Market", ja: "市場" },
  [ResearchDomain.Culture]: { en: "Culture", ja: "文化" },
  [ResearchDomain.Economy]: { en: "Economy", ja: "経済" },
  [ResearchDomain.Society]: { en: "Society", ja: "社会" },
  [ResearchDomain.Technology]: { en: "Technology", ja: "技術" },
};

function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-zinc-400";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-400";
}

function scoreTextColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-zinc-300";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

// --- Types for improvement suggestions ---

interface PromptHint {
  targetImage: string;
  hint: string;
}

interface ImprovementData {
  suggestions: string[];
  revisedPromptHints: PromptHint[];
}

// --- DomainCard with improvement panel ---

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

// --- Overall Score Display ---

function OverallScoreDisplay({
  score,
  comment,
  previousScore,
}: {
  score: number;
  comment: string;
  previousScore: number | null;
}) {
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreDelta = previousScore != null ? score - previousScore : null;

  return (
    <div className="flex items-center gap-6 rounded-lg border border-zinc-700 bg-zinc-900/60 p-5">
      {/* Circular score gauge */}
      <div className="relative flex-shrink-0">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="rgb(39 39 42)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={
              score >= 80
                ? "rgb(16 185 129)"
                : score >= 60
                ? "rgb(161 161 170)"
                : score >= 40
                ? "rgb(245 158 11)"
                : "rgb(248 113 113)"
            }
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-3xl font-bold tabular-nums ${scoreTextColor(score)}`}
          >
            {score}
          </span>
          {scoreDelta != null && scoreDelta !== 0 ? (
            <span
              className={`text-xs font-semibold tabular-nums ${
                scoreDelta > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {scoreDelta > 0 ? "+" : ""}{scoreDelta}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500">/ 100</span>
          )}
        </div>
      </div>

      {/* Overall comment */}
      <div className="flex-1">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Overall Evaluation / 総合評価
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">{comment}</p>
      </div>
    </div>
  );
}

// --- Evaluation History with deltas ---

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

// --- Main Component ---

export default function DistillSection() {
  const {
    detailImages,
    setDetailImages,
    refinedConcept,
    conditions,
    researchTheme,
    evaluationResults,
    addEvaluationResult,
    sceneConstraint,
  } = useAppState();

  const [currentResult, setCurrentResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Improvement state: keyed by domain
  const [improvementDataMap, setImprovementDataMap] = useState<Record<string, ImprovementData>>({});
  const [loadingImprovements, setLoadingImprovements] = useState<Set<string>>(new Set());
  const [regeneratingImages, setRegeneratingImages] = useState<Set<string>>(new Set());

  const hasImages = STAGE_ORDER.some((key) => detailImages[key]);
  const imageCount = STAGE_ORDER.filter((key) => detailImages[key]).length;

  // Show most recent result by default if none selected
  const displayResult = currentResult ??
    (evaluationResults.length > 0
      ? evaluationResults[evaluationResults.length - 1]
      : null);

  // Find the previous evaluation for delta display
  const previousResult = useMemo(() => {
    if (!displayResult || evaluationResults.length < 2) return null;
    const idx = evaluationResults.findIndex((r) => r.id === displayResult.id);
    if (idx <= 0) return null;
    return evaluationResults[idx - 1];
  }, [displayResult, evaluationResults]);

  // Build a map of previous scores per domain
  const previousScoreMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (previousResult) {
      for (const e of previousResult.evaluations) {
        map[e.domain] = e.score;
      }
    }
    return map;
  }, [previousResult]);

  const handleEvaluate = async () => {
    if (!refinedConcept || !hasImages) return;

    setIsEvaluating(true);
    setEvalError(null);

    const detailImageData = STAGE_ORDER.filter((key) => detailImages[key]).map(
      (key) => ({
        key,
        text: detailImages[key].text,
        prompt: detailImages[key].prompt,
      })
    );

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchTheme,
          refinedConcept,
          conditions: conditions.map((c) => ({
            domain: c.domain,
            weight: c.weight,
            notes: c.notes,
            tags: c.tags,
          })),
          detailImages: detailImageData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.evaluations) {
        const result: EvaluationResult = {
          id: `eval-${Date.now()}`,
          evaluations: data.evaluations,
          overallScore: data.overallScore,
          overallComment: data.overallComment,
          timestamp: new Date().toISOString(),
        };
        addEvaluationResult(result);
        setCurrentResult(result);
        // Clear improvement data for fresh evaluation
        setImprovementDataMap({});
      } else {
        setEvalError(data.error || "Evaluation failed");
      }
    } catch {
      setEvalError("Network error");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRequestImprove = async (evaluation: DomainEvaluation) => {
    if (loadingImprovements.has(evaluation.domain)) return;

    setLoadingImprovements((prev) => new Set(prev).add(evaluation.domain));

    try {
      const res = await fetch("/api/evaluate/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: evaluation.domain,
          domainJa: evaluation.domainJa,
          score: evaluation.score,
          comment: evaluation.comment,
          improvements: evaluation.improvements,
          concept: refinedConcept,
          conditions: conditions.map((c) => ({
            domain: c.domain,
            weight: c.weight,
            notes: c.notes,
            tags: c.tags,
          })),
          detailImageKeys: STAGE_ORDER.filter((key) => detailImages[key]),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setImprovementDataMap((prev) => ({
          ...prev,
          [evaluation.domain]: {
            suggestions: data.suggestions || [],
            revisedPromptHints: data.revisedPromptHints || [],
          },
        }));
      }
    } catch {
      // silently fail
    } finally {
      setLoadingImprovements((prev) => {
        const next = new Set(prev);
        next.delete(evaluation.domain);
        return next;
      });
    }
  };

  const handleRegenerateImage = async (stageKey: string, hint: string) => {
    if (!refinedConcept || regeneratingImages.has(stageKey)) return;

    setRegeneratingImages((prev) => new Set(prev).add(stageKey));

    const meta = DETAIL_STAGE_META[stageKey];
    if (!meta) return;

    const promptParts: string[] = [];
    promptParts.push(`Refined Concept: "${refinedConcept.title}"`);
    promptParts.push(refinedConcept.description);
    if (sceneConstraint) {
      promptParts.push(`[SCENE CONSTRAINT] ${sceneConstraint}`);
    }
    promptParts.push(`[THIS IMAGE] ${meta.description}`);
    promptParts.push(`[IMPROVEMENT DIRECTION] ${hint}`);
    const prompt = promptParts.join("\n");

    const apiConditions = conditions.map((c) => ({
      domain: c.domain,
      weight: c.weight,
      notes: c.notes,
      tags: c.tags,
    }));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style: meta.style,
          abstractionLevel: meta.abstractionLevel,
          conditions: apiConditions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.image) {
        const newImage: GeneratedImage = {
          id: `detail-${stageKey}-${Date.now()}`,
          image: data.image,
          text: data.text,
          prompt,
          abstractionLevel: meta.abstractionLevel,
          style: meta.style,
          timestamp: new Date().toISOString(),
        };

        setDetailImages({
          ...detailImages,
          [stageKey]: newImage,
        });
      }
    } catch {
      // silently fail
    } finally {
      setRegeneratingImages((prev) => {
        const next = new Set(prev);
        next.delete(stageKey);
        return next;
      });
    }
  };

  const hasLowScores = displayResult?.evaluations.some((e) => e.score < 60) ?? false;

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100">
        Distill / 蒸留
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        リサーチ条件に照らして最終案を自動評価し、改善を繰り返します。
      </p>

      {!hasImages ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-600">
          Filterでディテール画像を生成してください。生成された画像がここに表示されます。
        </div>
      ) : (
        <>
          {/* Detail Image Thumbnails with per-image regeneration */}
          <section className="mt-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Detail Images / ディテール画像
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {STAGE_ORDER.map((key) => {
                const img = detailImages[key];
                const labels = DETAIL_STAGE_LABELS[key];
                const isRegenerating = regeneratingImages.has(key);
                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50"
                  >
                    <div className="relative aspect-square bg-zinc-900">
                      {img ? (
                        <>
                          <button
                            onClick={() => setLightboxSrc(img.image)}
                            className="block h-full w-full"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.image}
                              alt={labels.labelJa}
                              className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                            />
                          </button>
                          {isRegenerating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                              <div className="text-center">
                                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
                                <span className="mt-1 block text-[10px] text-zinc-400">再生成中</span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-[10px] text-zinc-700">-</span>
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1.5 text-center">
                      <div className="text-[10px] font-semibold text-zinc-300">
                        {labels.labelJa}
                      </div>
                      <div className="text-[9px] text-zinc-600">
                        {labels.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Refined Concept Display */}
          {refinedConcept && (
            <section className="mt-6">
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Refined Concept
                </div>
                <h4 className="text-sm font-semibold text-zinc-100">
                  {refinedConcept.title}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {refinedConcept.description}
                </p>
              </div>
            </section>
          )}

          {/* Evaluate / Re-evaluate Button */}
          <section className="mt-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleEvaluate}
                disabled={
                  isEvaluating || !refinedConcept || conditions.length === 0
                }
                className="rounded-lg bg-zinc-200 px-6 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                {isEvaluating
                  ? "評価中..."
                  : evaluationResults.length > 0
                  ? "再評価"
                  : "評価を実行"}
              </button>
              <span className="text-xs text-zinc-500">
                {imageCount} images / {conditions.length} conditions
              </span>
              {hasLowScores && !isEvaluating && (
                <span className="text-xs text-amber-500">
                  スコア60未満の領域があります
                </span>
              )}
            </div>
            {evalError && (
              <p className="mt-3 text-xs text-red-400">{evalError}</p>
            )}
            {!refinedConcept && (
              <p className="mt-2 text-xs text-zinc-600">
                Filterで精緻化コンセプトを生成してください。
              </p>
            )}
            {conditions.length === 0 && (
              <p className="mt-2 text-xs text-zinc-600">
                Researchでリサーチ条件を設定してください。
              </p>
            )}
          </section>

          {/* Loading State */}
          {isEvaluating && (
            <section className="mt-6">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
                <p className="mt-3 text-sm text-zinc-400">
                  6つのドメインに対して評価を実行中...
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  AIがリサーチ条件との整合性を分析しています
                </p>
              </div>
            </section>
          )}

          {/* Evaluation Results */}
          {displayResult && !isEvaluating && (
            <section className="mt-6">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Evaluation Results / 評価結果
              </h3>

              {/* Overall Score */}
              <OverallScoreDisplay
                score={displayResult.overallScore}
                comment={displayResult.overallComment}
                previousScore={previousResult?.overallScore ?? null}
              />

              {/* Per-domain cards */}
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {displayResult.evaluations.map((evaluation) => (
                  <DomainCard
                    key={evaluation.domain}
                    evaluation={evaluation}
                    previousScore={previousScoreMap[evaluation.domain] ?? null}
                    onRequestImprove={handleRequestImprove}
                    improvementData={improvementDataMap[evaluation.domain] ?? null}
                    isLoadingImprovement={loadingImprovements.has(evaluation.domain)}
                    onRegenerateImage={handleRegenerateImage}
                    regeneratingImages={regeneratingImages}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Evaluation History */}
          {evaluationResults.length > 1 && (
            <section className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Evaluation History / 評価履歴
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {[...evaluationResults].reverse().map((result, revIdx) => {
                  const chronIdx = evaluationResults.length - 1 - revIdx;
                  const prev = chronIdx > 0 ? evaluationResults[chronIdx - 1] : null;
                  return (
                    <EvaluationHistoryItem
                      key={result.id}
                      result={result}
                      previousResult={prev}
                      isActive={displayResult?.id === result.id}
                      index={chronIdx}
                      onClick={() => setCurrentResult(result)}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxSrc}
              alt="Detail"
              className="max-h-[85vh] rounded-lg object-contain"
            />
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              x
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
