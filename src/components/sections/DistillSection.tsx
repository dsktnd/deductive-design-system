"use client";

import { useState } from "react";
import { useAppState } from "@/lib/store";
import { ResearchDomain } from "@/lib/types";
import type { DomainEvaluation } from "@/lib/types";

const DETAIL_STAGE_LABELS: Record<string, { label: string; labelJa: string }> = {
  diagram: { label: "Diagram", labelJa: "ダイアグラム" },
  concept: { label: "Concept Image", labelJa: "コンセプトイメージ" },
  material: { label: "Material Board", labelJa: "マテリアルボード" },
  exterior: { label: "Exterior", labelJa: "外観イメージ" },
  interior: { label: "Interior", labelJa: "内観イメージ" },
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

function ScoreBar({
  evaluation,
}: {
  evaluation: DomainEvaluation;
}) {
  const labels = DOMAIN_LABELS[evaluation.domain] ?? { en: evaluation.domain, ja: "" };
  const scoreColor =
    evaluation.score >= 80
      ? "bg-emerald-500"
      : evaluation.score >= 60
      ? "bg-zinc-400"
      : evaluation.score >= 40
      ? "bg-amber-500"
      : "bg-red-400";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-200">{labels.ja}</span>
          <span className="text-xs text-zinc-500">{labels.en}</span>
        </div>
        <span className="text-lg font-bold tabular-nums text-zinc-200">
          {evaluation.score}
        </span>
      </div>
      <div className="mb-3 h-2 rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreColor}`}
          style={{ width: `${evaluation.score}%` }}
        />
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">
        {evaluation.comment}
      </p>
    </div>
  );
}

export default function DistillSection() {
  const { detailImages, refinedConcept, conditions, researchTheme } = useAppState();
  const [evaluations, setEvaluations] = useState<DomainEvaluation[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const hasImages = STAGE_ORDER.some((key) => detailImages[key]);
  const imageCount = STAGE_ORDER.filter((key) => detailImages[key]).length;

  const handleEvaluate = async () => {
    if (!refinedConcept || !hasImages) return;

    setIsEvaluating(true);
    setEvalError(null);

    const detailImageData = STAGE_ORDER
      .filter((key) => detailImages[key])
      .map((key) => ({
        key,
        text: detailImages[key].text,
        prompt: detailImages[key].prompt,
      }));

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
        setEvaluations(data.evaluations);
      } else {
        setEvalError(data.error || "Evaluation failed");
      }
    } catch {
      setEvalError("Network error");
    } finally {
      setIsEvaluating(false);
    }
  };

  const avgScore =
    evaluations.length > 0
      ? Math.round(evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length)
      : null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100">
        Distill / 蒸留
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        リサーチ条件に照らして最終案を自動評価します。
      </p>

      {!hasImages ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-600">
          Filterでディテール画像を生成してください。生成された画像がここに表示されます。
        </div>
      ) : (
        <>
          {/* Detail Image Thumbnails */}
          <section className="mt-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Detail Images / ディテール画像
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {STAGE_ORDER.map((key) => {
                const img = detailImages[key];
                const labels = DETAIL_STAGE_LABELS[key];
                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50"
                  >
                    <div className="aspect-square bg-zinc-900">
                      {img ? (
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
                      <div className="text-[9px] text-zinc-600">{labels.label}</div>
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

          {/* Evaluate Button */}
          <section className="mt-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleEvaluate}
                disabled={isEvaluating || !refinedConcept || conditions.length === 0}
                className="rounded-lg bg-zinc-200 px-6 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                {isEvaluating ? "評価中..." : "評価を実行"}
              </button>
              <span className="text-xs text-zinc-500">
                {imageCount} images / {conditions.length} conditions
              </span>
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

          {/* Evaluation Results */}
          {evaluations.length > 0 && (
            <section className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Evaluation Results / 評価結果
                </h3>
                {avgScore != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Average</span>
                    <span className="text-lg font-bold tabular-nums text-zinc-200">
                      {avgScore}
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {evaluations.map((evaluation) => (
                  <ScoreBar key={evaluation.domain} evaluation={evaluation} />
                ))}
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
