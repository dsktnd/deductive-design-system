"use client";

import { useState, useMemo, useCallback } from "react";
import { useAppState } from "@/lib/store";
import { ABSTRACTION_LEVELS } from "@/lib/gemini";
import type {
  GeneratedDesign,
  GeneratedImage,
  EvaluationScore,
  GenerateJob,
} from "@/lib/types";

const STYLES = [
  "Diagram",
  "Sketch",
  "Photorealistic",
] as const;

const SPECTRUM_STEP_OPTIONS = [2, 3, 5, 7] as const;

const DOMAIN_LABELS: Record<string, string> = {
  environment: "環境",
  market: "マーケット",
  culture: "文化・歴史",
  economy: "経済",
  society: "社会",
  technology: "技術",
};

function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain;
}

function defaultScores(): EvaluationScore {
  return { performance: 0, economy: 0, context: 0, experience: 0, social: 0, aesthetics: 0 };
}

function generateSpectrumSteps(steps: number): number[] {
  if (steps <= 1) return [50];
  return Array.from({ length: steps }, (_, i) => Math.round((i / (steps - 1)) * 100));
}

// --- Spectrum Bar ---

function SpectrumBar({
  labelA,
  labelB,
  steps,
  currentStep,
  generating,
  images,
}: {
  labelA: string;
  labelB: string;
  steps: number;
  currentStep: number;
  generating: boolean;
  images: { ratio: number; image: GeneratedImage | null }[];
}) {
  const ratios = generateSpectrumSteps(steps);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-4">
      {/* Axis labels */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">{labelA}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Design Space Spectrum
        </span>
        <span className="text-sm font-medium text-zinc-300">{labelB}</span>
      </div>

      {/* Spectrum gradient bar */}
      <div className="relative h-2 rounded-full bg-gradient-to-r from-zinc-600 to-zinc-400">
        {ratios.map((ratio, i) => {
          const hasImage = images[i]?.image != null;
          const isCurrent = generating && i === currentStep;
          return (
            <div
              key={ratio}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${
                isCurrent
                  ? "h-5 w-5 animate-pulse border-white bg-zinc-200"
                  : hasImage
                  ? "h-4 w-4 border-zinc-200 bg-zinc-300"
                  : "h-3 w-3 border-zinc-500 bg-zinc-700"
              }`}
              style={{ left: `${ratio}%` }}
            />
          );
        })}
      </div>

      {/* Ratio labels */}
      <div className="relative mt-1.5 h-4">
        {ratios.map((ratio) => (
          <span
            key={ratio}
            className="absolute -translate-x-1/2 font-mono text-[10px] text-zinc-500"
            style={{ left: `${ratio}%` }}
          >
            {100 - ratio}/{ratio}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Spectrum Image Row ---

function SpectrumImageRow({
  images,
  labelA,
  labelB,
  onEnlarge,
  onAddToFilter,
  addedIds,
}: {
  images: { ratio: number; image: GeneratedImage | null }[];
  labelA: string;
  labelB: string;
  onEnlarge: (src: string) => void;
  onAddToFilter: (img: GeneratedImage, ratio: number) => void;
  addedIds: Set<string>;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {images.map(({ ratio, image }, i) => (
        <div
          key={`${ratio}-${i}`}
          className="flex-shrink-0"
          style={{ width: `${Math.max(100 / images.length - 1, 14)}%`, minWidth: "160px" }}
        >
          {/* Ratio header */}
          <div className="mb-1.5 text-center">
            <span className="font-mono text-[10px] text-zinc-500">
              {labelA} {100 - ratio}% / {labelB} {ratio}%
            </span>
          </div>

          {image ? (
            <div className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
              <button onClick={() => onEnlarge(image.image)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.image}
                  alt={image.text ?? "Generated architecture"}
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
                />
              </button>
              <div className="p-2">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {ABSTRACTION_LEVELS.find((l) => l.level === image.abstractionLevel)?.label}
                  </span>
                  <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {image.style}
                  </span>
                </div>
                {image.prompt && (
                  <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">
                    {image.prompt}
                  </p>
                )}
                <button
                  onClick={() => onAddToFilter(image, ratio)}
                  disabled={addedIds.has(image.id)}
                  className="mt-1.5 w-full rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                >
                  {addedIds.has(image.id) ? "Added" : "Add to Filter"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30">
              <span className="text-xs text-zinc-600">Pending...</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Lightbox ---

function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string | null;
  alt: string;
  onClose: () => void;
}) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-h-[85vh] rounded-lg object-contain" />
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          x
        </button>
      </div>
    </div>
  );
}

// --- Generate Job History ---

function GenerateJobHistory({ jobs }: { jobs: GenerateJob[] }) {
  if (jobs.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Generation History
      </h4>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {[...jobs].reverse().map((job) => {
          const levelInfo = ABSTRACTION_LEVELS.find((l) => l.level === job.abstractionLevel);
          return (
            <div
              key={job.id}
              className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {levelInfo && (
                  <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {levelInfo.label}
                  </span>
                )}
                <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  {job.style}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {job.images.length} image{job.images.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-zinc-400">{job.basePrompt}</div>
              <div className="mt-0.5 text-[10px] text-zinc-600">
                {new Date(job.timestamp).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Section ---

export default function GenerateSection() {
  const {
    conditions,
    generatedDesigns,
    setGeneratedDesigns,
    generateJobs,
    addGenerateJob,
    researchJobs,
    exportProcessLog,
    selectedConcepts,
    setSceneConstraint: setStoreSceneConstraint,
  } = useAppState();

  const [sceneConstraint, setSceneConstraint] = useState("");
  const [style, setStyle] = useState<string>(STYLES[0]);
  const [abstractionLevel, setAbstractionLevel] = useState<number>(1);
  const [spectrumSteps, setSpectrumSteps] = useState<number>(3);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenStep, setCurrentGenStep] = useState(-1);
  const [genError, setGenError] = useState<string | null>(null);

  // Current spectrum images — replaced on each generation
  const [spectrumImages, setSpectrumImages] = useState<
    { ratio: number; image: GeneratedImage | null }[]
  >([]);

  const hasConcepts = selectedConcepts.length >= 2;

  const topTwo = useMemo(() => {
    if (hasConcepts) return null;
    const sorted = [...conditions]
      .filter((c) => c.weight > 0.2)
      .sort((a, b) => b.weight - a.weight);
    return sorted.length >= 2 ? [sorted[0], sorted[1]] : null;
  }, [conditions, hasConcepts]);

  const canSpectrum = hasConcepts || topTwo != null;
  const labelA = hasConcepts ? selectedConcepts[0].title : topTwo ? domainLabel(topTwo[0].domain) : "";
  const labelB = hasConcepts ? selectedConcepts[1].title : topTwo ? domainLabel(topTwo[1].domain) : "";

  const buildPromptForRatio = useCallback(
    (ratio: number): string => {
      const parts: string[] = [];

      if (sceneConstraint.trim()) {
        parts.push(`[SCENE CONSTRAINT — keep exactly the same across all variations] ${sceneConstraint.trim()}`);
      }

      const aPercent = 100 - ratio;
      const bPercent = ratio;

      if (hasConcepts) {
        const cA = selectedConcepts[0];
        const cB = selectedConcepts[1];

        parts.push(`[VARIABLE — this changes per image] Concept blend ratio: "${cA.title}" ${aPercent}% / "${cB.title}" ${bPercent}%.`);

        if (aPercent > 80) {
          parts.push(`Primary direction: ${cA.description}`);
          if (bPercent > 0) parts.push(`Secondary direction (subtle influence): ${cB.description}`);
        } else if (bPercent > 80) {
          parts.push(`Primary direction: ${cB.description}`);
          if (aPercent > 0) parts.push(`Secondary direction (subtle influence): ${cA.description}`);
        } else {
          parts.push(`Direction A: ${cA.description}`);
          parts.push(`Direction B: ${cB.description}`);
          if (aPercent > bPercent) {
            parts.push(`"${cA.title}" takes slight priority.`);
          } else if (bPercent > aPercent) {
            parts.push(`"${cB.title}" takes slight priority.`);
          }
        }
      } else if (topTwo) {
        const lA = domainLabel(topTwo[0].domain);
        const lB = domainLabel(topTwo[1].domain);

        parts.push(`[VARIABLE — this changes per image] Domain blend ratio: ${lA} ${aPercent}% / ${lB} ${bPercent}%.`);

        if (aPercent > 80) {
          parts.push(`Strongly emphasize ${lA}. ${lB} is secondary.`);
        } else if (bPercent > 80) {
          parts.push(`Strongly emphasize ${lB}. ${lA} is secondary.`);
        } else if (aPercent > bPercent) {
          parts.push(`${lA} takes slight priority over ${lB}.`);
        } else if (bPercent > aPercent) {
          parts.push(`${lB} takes slight priority over ${lA}.`);
        }

        if (topTwo[0].notes) {
          parts.push(`${lA} context: ${topTwo[0].notes}`);
        }
        if (topTwo[1].notes) {
          parts.push(`${lB} context: ${topTwo[1].notes}`);
        }
      }
      return parts.join(". ") || "Generate an architectural design";
    },
    [sceneConstraint, topTwo, hasConcepts, selectedConcepts]
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenError(null);
    setAddedIds(new Set());

    if (!canSpectrum) {
      const prompt = buildPromptForRatio(50);
      setSpectrumImages([{ ratio: 50, image: null }]);
      setCurrentGenStep(0);

      try {
        const apiConditions = conditions.map((c) => ({
          domain: c.domain,
          weight: c.weight,
          notes: c.notes,
          tags: c.tags,
        }));
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, style, abstractionLevel, conditions: apiConditions }),
        });
        const data = await res.json();
        if (res.ok && data.image) {
          const img: GeneratedImage = {
            id: `gen-${Date.now()}`,
            image: data.image,
            text: data.text,
            prompt,
            abstractionLevel,
            style,
            timestamp: new Date().toISOString(),
          };
          setSpectrumImages([{ ratio: 50, image: img }]);

          addGenerateJob({
            id: `genjob-${Date.now()}`,
            researchJobId: researchJobs[researchJobs.length - 1]?.id ?? "",
            basePrompt: prompt,
            style,
            abstractionLevel,
            conditions: [...conditions],
            images: [img],
            timestamp: new Date().toISOString(),
          });
        } else {
          setGenError(data.error || "Generation failed");
        }
      } catch {
        setGenError("Network error");
      }
      setIsGenerating(false);
      setCurrentGenStep(-1);
      return;
    }

    const ratios = generateSpectrumSteps(spectrumSteps);
    setSpectrumImages(ratios.map((r) => ({ ratio: r, image: null })));

    const jobImages: GeneratedImage[] = [];

    for (let i = 0; i < ratios.length; i++) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 8000));
      }
      setCurrentGenStep(i);
      const ratio = ratios[i];
      const prompt = buildPromptForRatio(ratio);

      try {
        const apiConditions = conditions.map((c) => ({
          domain: c.domain,
          weight: c.weight,
          notes: c.notes,
          tags: c.tags,
        }));
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, style, abstractionLevel, conditions: apiConditions }),
        });

        const data = await res.json();
        if (res.ok && data.image) {
          const img: GeneratedImage = {
            id: `gen-${Date.now()}-s${ratio}`,
            image: data.image,
            text: data.text,
            prompt,
            abstractionLevel,
            style,
            timestamp: new Date().toISOString(),
          };
          jobImages.push(img);
          setSpectrumImages((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, image: img } : item))
          );
        } else {
          setGenError(data.error || `Step ${i + 1} failed`);
        }
      } catch {
        setGenError(`Network error at step ${i + 1}`);
      }
    }

    if (jobImages.length > 0) {
      addGenerateJob({
        id: `genjob-${Date.now()}`,
        researchJobId: researchJobs[researchJobs.length - 1]?.id ?? "",
        basePrompt: sceneConstraint.trim(),
        style,
        abstractionLevel,
        conditions: [...conditions],
        images: jobImages,
        timestamp: new Date().toISOString(),
      });
    }

    setIsGenerating(false);
    setCurrentGenStep(-1);
  };

  const handleAddToFilter = (image: GeneratedImage, ratio: number) => {
    if (addedIds.has(image.id)) return;

    const design: GeneratedDesign = {
      id: `${image.id}-${Date.now()}`,
      imageUrl: image.image,
      prompt: image.prompt,
      conditions: [...conditions],
      scores: defaultScores(),
      createdAt: new Date(),
      spectrumRatio: ratio,
    };

    setGeneratedDesigns([...generatedDesigns, design]);
    setAddedIds((prev) => new Set(prev).add(image.id));
    if (sceneConstraint.trim()) {
      setStoreSceneConstraint(sceneConstraint.trim());
    }
  };

  const handleSaveLog = async () => {
    setIsSavingLog(true);
    try {
      const log = exportProcessLog();
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
    } catch {
      // ignore
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleProceed = () => {
    handleSaveLog();
    document.getElementById("filter")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100">
        Generate / 生成
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        条件の重み付けを連続的に変化させ、設計空間のグラデーションを探索します。
      </p>

      {/* Scene Constraint */}
      <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Scene Constraint / シーン拘束
        </label>
        <p className="mb-2 text-[10px] text-zinc-500">
          全スペクトラム画像で共通する視点・構図・雰囲気・環境を指定します。コンセプトの比率だけが変化します。
        </p>
        <textarea
          value={sceneConstraint}
          onChange={(e) => setSceneConstraint(e.target.value)}
          rows={2}
          placeholder="e.g. 夕暮れ時の鳥瞰図、周囲に緑豊かな住宅街、暖色の自然光、コンクリートと木のマテリアル..."
          className="w-full resize-y rounded border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none"
        />
      </div>

      {/* Abstraction Level */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-4">
        <div className="mb-3 flex items-baseline justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Abstraction Level
          </label>
          <span className="text-xs text-zinc-400">
            {ABSTRACTION_LEVELS.find((l) => l.level === abstractionLevel)?.ja}
          </span>
        </div>
        <div className="flex gap-1">
          {ABSTRACTION_LEVELS.map((l) => (
            <button
              key={l.level}
              onClick={() => setAbstractionLevel(l.level)}
              className={`flex-1 rounded-lg px-2 py-2.5 text-center transition-colors ${
                abstractionLevel === l.level
                  ? "bg-zinc-200 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <div className="text-xs font-semibold">{l.label}</div>
              <div className="mt-0.5 text-[10px] opacity-70">{l.ja}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {ABSTRACTION_LEVELS.find((l) => l.level === abstractionLevel)?.description}
        </p>
      </div>

      {/* Generation Controls */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-lg bg-zinc-200 px-5 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            {isGenerating
              ? `Generating ${currentGenStep + 1}/${canSpectrum ? spectrumSteps : 1}...`
              : "Generate Spectrum"}
          </button>

          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {canSpectrum && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Spectrum Steps</label>
              <div className="flex gap-1">
                {SPECTRUM_STEP_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setSpectrumSteps(n)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      spectrumSteps === n
                        ? "bg-zinc-300 text-zinc-900"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSaveLog}
            disabled={isSavingLog}
            className="ml-auto rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-50"
          >
            {isSavingLog ? "Saving..." : "Save Log"}
          </button>
        </div>

        {genError && (
          <p className="mt-2 text-xs text-red-400">{genError}</p>
        )}

        {!canSpectrum && (
          <p className="mt-2 text-xs text-zinc-600">
            Spectrum requires concepts or 2+ conditions with weight above 20%. Currently generating single image.
          </p>
        )}
      </div>

      {/* Concept Display */}
      {hasConcepts && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {selectedConcepts.slice(0, 2).map((c, i) => (
            <div key={c.id} className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Concept {i === 0 ? "A" : "B"}
              </div>
              <h4 className="text-sm font-semibold text-zinc-100">{c.title}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{c.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Spectrum Bar */}
      {canSpectrum && (
        <div className="mt-4">
          <SpectrumBar
            labelA={labelA}
            labelB={labelB}
            steps={spectrumSteps}
            currentStep={currentGenStep}
            generating={isGenerating}
            images={spectrumImages}
          />
        </div>
      )}

      {/* Spectrum Image Row */}
      {spectrumImages.length > 0 && (
        <div className="mt-4">
          <SpectrumImageRow
            images={spectrumImages}
            labelA={labelA}
            labelB={labelB}
            onEnlarge={(src) => setLightboxSrc(src)}
            onAddToFilter={(img, ratio) => handleAddToFilter(img, ratio)}
            addedIds={addedIds}
          />
        </div>
      )}

      {/* Empty state */}
      {spectrumImages.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-800 px-6 py-16 text-center text-sm text-zinc-600">
          {conditions.length === 0
            ? "Set conditions in Research first, then generate designs here."
            : "Click Generate Spectrum to explore the continuous design space."}
        </div>
      )}

      {/* Proceed + History */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <div>
          {generatedDesigns.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
              <p className="text-sm text-zinc-500">
                {generatedDesigns.length} design{generatedDesigns.length !== 1 ? "s" : ""} added to filter
              </p>
              <button
                onClick={handleProceed}
                className="rounded-lg bg-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white"
              >
                Proceed to Filter
              </button>
            </div>
          )}
        </div>
        <aside>
          <GenerateJobHistory jobs={generateJobs} />
        </aside>
      </div>

      {/* Lightbox */}
      <Lightbox
        src={lightboxSrc}
        alt="Generated design"
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
