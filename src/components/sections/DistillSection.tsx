"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import type { DomainEvaluation, EvaluationResult, GeneratedImage } from "@/lib/types";
import { DETAIL_STAGE_LABELS, STAGE_ORDER, scoreColor } from "./distill/constants";
import type { ImprovementData } from "./distill/constants";
import DomainCard from "./distill/DomainCard";
import OverallScoreDisplay from "./distill/OverallScoreDisplay";
import EvaluationHistoryItem from "./distill/EvaluationHistoryItem";

const DETAIL_STAGE_META: Record<string, { style: string; abstractionLevel: number; description: string }> = {
  diagram: { style: "Diagram", abstractionLevel: 2, description: "Design concept expressed as an abstract diagram" },
  concept: { style: "Sketch", abstractionLevel: 2, description: "Evocative concept image capturing atmosphere" },
  material: { style: "Sketch", abstractionLevel: 1, description: "Material palette — textures, colors, samples" },
  exterior: { style: "Photorealistic", abstractionLevel: 4, description: "Photorealistic exterior view" },
  interior: { style: "Photorealistic", abstractionLevel: 3, description: "Photorealistic interior view" },
};

// --- Main Component ---

export default function DistillSection() {
  const detailImages = useStore((s) => s.detailImages);
  const setDetailImages = useStore((s) => s.setDetailImages);
  const refinedConcept = useStore((s) => s.refinedConcept);
  const conditions = useStore((s) => s.conditions);
  const researchTheme = useStore((s) => s.researchTheme);
  const evaluationResults = useStore((s) => s.evaluationResults);
  const addEvaluationResult = useStore((s) => s.addEvaluationResult);
  const sceneConstraint = useStore((s) => s.sceneConstraint);

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
      <h2 className="font-[family-name:var(--font-dm-serif)] text-xl text-slate-100">
        Distill / 蒸留
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        リサーチ条件に照らして最終案を自動評価し、改善を繰り返します。
      </p>

      {!hasImages ? (
        <div className="mt-8 rounded-lg border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
          Filterでディテール画像を生成してください。生成された画像がここに表示されます。
        </div>
      ) : (
        <>
          {/* Detail Image Thumbnails with per-image regeneration */}
          <section className="mt-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                    className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50"
                  >
                    <div className="relative aspect-square bg-slate-800">
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
                                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-slate-300" />
                                <span className="mt-1 block text-[10px] text-slate-400">再生成中</span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-[10px] text-slate-600">-</span>
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1.5 text-center">
                      <div className="text-[10px] font-semibold text-slate-300">
                        {labels.labelJa}
                      </div>
                      <div className="text-[9px] text-slate-500">
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
              <div className="rounded-lg border border-slate-600 bg-slate-800/60 p-4">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Refined Concept
                </div>
                <h4 className="text-sm font-semibold text-slate-100">
                  {refinedConcept.title}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
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
                className="rounded-lg gradient-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-105 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-500"
              >
                {isEvaluating
                  ? "評価中..."
                  : evaluationResults.length > 0
                  ? "再評価"
                  : "評価を実行"}
              </button>
              <span className="text-xs text-slate-500">
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
              <p className="mt-2 text-xs text-slate-500">
                Filterで精緻化コンセプトを生成してください。
              </p>
            )}
            {conditions.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Researchでリサーチ条件を設定してください。
              </p>
            )}
          </section>

          {/* Loading State */}
          {isEvaluating && (
            <section className="mt-6">
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-500 border-t-slate-300" />
                <p className="mt-3 text-sm text-slate-400">
                  6つのドメインに対して評価を実行中...
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  AIがリサーチ条件との整合性を分析しています
                </p>
              </div>
            </section>
          )}

          {/* Evaluation Results */}
          {displayResult && !isEvaluating && (
            <section className="mt-6">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm text-slate-300 hover:bg-slate-600"
            >
              x
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
