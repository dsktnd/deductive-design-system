"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAppState, type AtmosphereState } from "@/lib/store";
import { ABSTRACTION_LEVELS, configToPromptElements } from "@/lib/gemini";
import type {
  GeneratedDesign,
  GeneratedImage,
  EvaluationScore,
  GenerateJob,
  ArchitectureConfig,
  ResearchCondition,
} from "@/lib/types";

const STYLES = [
  "Diagram",
  "Sketch",
  "Photorealistic",
] as const;

const SPECTRUM_STEP_OPTIONS = [2, 3, 5, 7] as const;

const ATMOSPHERE_PRESETS = [
  { key: "minimal", ja: "ミニマル", en: "Minimal", prompt: "clean, minimal, white space, restrained" },
  { key: "brutal", ja: "ブルータル", en: "Brutalist", prompt: "raw concrete, bold geometric, heavy mass" },
  { key: "organic", ja: "有機的", en: "Organic", prompt: "flowing forms, natural curves, biomorphic" },
  { key: "futuristic", ja: "未来的", en: "Futuristic", prompt: "sleek, parametric, advanced materials" },
  { key: "vernacular", ja: "ヴァナキュラー", en: "Vernacular", prompt: "local materials, traditional craft, contextual" },
  { key: "ethereal", ja: "幻想的", en: "Ethereal", prompt: "translucent, light-filled, dreamlike, atmospheric" },
  { key: "industrial", ja: "インダストリアル", en: "Industrial", prompt: "exposed structure, raw materials, utilitarian" },
  { key: "zen", ja: "禅", en: "Zen", prompt: "tranquil, empty space, natural materials, meditative" },
] as const;

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

// --- Config Diff ---

type ConfigDiffEntry = {
  labelJa: string;
  valueA: string;
  valueB: string;
};

type BlendKeywordResult = {
  ratio: number;
  keywords: { axis: string; labelJa: string; blended: string | null }[];
  summary: string[];
};

const CONFIG_AXES: {
  labelJa: string;
  getValue: (c: ArchitectureConfig) => string | null;
}[] = [
  { labelJa: "境界", getValue: (c) => c.boundary?.strategy ?? null },
  { labelJa: "空間構造", getValue: (c) => c.spatial?.topology ?? null },
  { labelJa: "大地", getValue: (c) => c.ground?.relation ?? null },
  { labelJa: "光", getValue: (c) => c.light?.source_strategy ?? null },
  { labelJa: "動線", getValue: (c) => c.movement?.path_topology?.type ?? null },
  { labelJa: "スケール", getValue: (c) => c.scale?.human_relation ?? null },
  { labelJa: "公私", getValue: (c) => c.social_gradient?.type ?? null },
  { labelJa: "構造", getValue: (c) => c.tectonic?.expression ?? null },
  { labelJa: "素材感", getValue: (c) => c.material?.weight_impression ?? null },
  { labelJa: "色彩", getValue: (c) => c.color?.presence ?? null },
  { labelJa: "断面", getValue: (c) => c.section?.dominant_profile ?? null },
  { labelJa: "外内関係", getValue: (c) => c.facade_interior_relationship?.type ?? null },
];

function computeConfigDiff(
  configA: ArchitectureConfig,
  configB: ArchitectureConfig
): ConfigDiffEntry[] {
  const diffs: ConfigDiffEntry[] = [];

  for (const axis of CONFIG_AXES) {
    const vA = axis.getValue(configA);
    const vB = axis.getValue(configB);
    if (vA != null && vB != null && vA !== vB) {
      diffs.push({ labelJa: axis.labelJa, valueA: vA, valueB: vB });
    }
  }

  // material.primary comparison
  const matA = configA.material?.primary ?? [];
  const matB = configB.material?.primary ?? [];
  const matAStr = [...matA].sort().join(", ");
  const matBStr = [...matB].sort().join(", ");
  if (matAStr && matBStr && matAStr !== matBStr) {
    diffs.push({ labelJa: "素材", valueA: matAStr, valueB: matBStr });
  }

  return diffs;
}

function ConfigDiffPanel({
  diffs,
  ratios,
  blendResults,
}: {
  diffs: ConfigDiffEntry[];
  ratios: number[];
  blendResults: BlendKeywordResult[];
}) {
  // Build a lookup: labelJa -> ratio -> blended keyword
  const blendLookup = useMemo(() => {
    const map = new Map<string, Map<number, string>>();
    for (const br of blendResults) {
      for (const kw of br.keywords) {
        if (!kw.blended) continue;
        if (!map.has(kw.labelJa)) map.set(kw.labelJa, new Map());
        map.get(kw.labelJa)!.set(br.ratio, kw.blended);
      }
    }
    return map;
  }, [blendResults]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Design Space の変化軸
      </div>
      <div className="space-y-2">
        {diffs.map((d) => {
          const axisBlend = blendLookup.get(d.labelJa);
          return (
            <div key={d.labelJa} className="flex items-center gap-2 text-[11px]">
              <span className="w-16 shrink-0 text-right text-zinc-500">
                {d.labelJa}
              </span>
              <span className="w-20 shrink-0 truncate text-right font-medium text-zinc-400">
                {d.valueA}
              </span>
              <div className="relative h-2 flex-1 rounded-full bg-zinc-800">
                {/* gradient track */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-zinc-600 to-zinc-400 opacity-40" />
                {/* spectrum step dots */}
                {ratios.map((ratio) => {
                  const blended = axisBlend?.get(ratio);
                  return (
                    <div
                      key={ratio}
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${ratio}%` }}
                    >
                      <div className={`h-3 w-3 rounded-full border shadow-sm ${
                        blended
                          ? "border-zinc-400 bg-zinc-200"
                          : "border-zinc-500 bg-zinc-300"
                      }`} />
                      <span className={`absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap text-[8px] ${
                        blended ? "font-medium text-zinc-300" : "font-mono text-zinc-500"
                      }`}>
                        {ratio === 0
                          ? d.valueA
                          : ratio === 100
                          ? d.valueB
                          : blended ?? `${100 - ratio}/${ratio}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <span className="w-20 shrink-0 truncate font-medium text-zinc-400">
                {d.valueB}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary keywords per ratio */}
      {blendResults.length > 0 && (
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            ブレンドキーワード（各ステップ）
          </div>
          <div className="space-y-2">
            {blendResults.map((br) => (
              <div key={br.ratio} className="flex items-start gap-2">
                <span className="mt-0.5 w-12 shrink-0 text-right font-mono text-[10px] text-zinc-500">
                  {100 - br.ratio}/{br.ratio}
                </span>
                <div className="flex flex-wrap gap-1">
                  {br.summary.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-zinc-200/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratios.length > 2 && blendResults.length === 0 && (
        <p className="mt-3 text-[10px] text-zinc-600">
          各ドットはスペクトラム上の生成ポイント。左端＝A、右端＝B、中間はブレンド比率。
        </p>
      )}
    </div>
  );
}

// --- Research Context Panel (Issue #4) ---

function ResearchContextPanel({
  conditions,
  researchTheme,
  selectedConcepts,
}: {
  conditions: ResearchCondition[];
  researchTheme: string;
  selectedConcepts: { title: string; description: string; relatedDomains: string[] }[];
}) {
  const [expanded, setExpanded] = useState(false);

  const activeConditions = conditions
    .filter((c) => c.weight > 0 && (c.notes || c.tags.length > 0))
    .sort((a, b) => b.weight - a.weight);

  if (activeConditions.length === 0 && !researchTheme) return null;

  const maxWeight = Math.max(...activeConditions.map((c) => c.weight), 0.01);
  const totalTags = activeConditions.reduce((sum, c) => sum + c.tags.length, 0);
  const hasConcepts = selectedConcepts.length >= 2;

  return (
    <div className="mt-5 rounded-lg border border-zinc-700/60 bg-zinc-900/60">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-800/40"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Research Context
          </span>
          {researchTheme && (
            <span className="truncate text-sm text-zinc-300">{researchTheme}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span>{activeConditions.length} domains</span>
            <span>{totalTags} tags</span>
            {hasConcepts && <span>2 concepts</span>}
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          {/* Condition weight bars */}
          <div className="space-y-2">
            {activeConditions.map((c) => {
              const pct = (c.weight / maxWeight) * 100;
              return (
                <div key={c.domain}>
                  <div className="mb-0.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-300">
                        {domainLabel(c.domain)}
                      </span>
                      {c.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500"
                        >
                          {tag}
                        </span>
                      ))}
                      {c.tags.length > 3 && (
                        <span className="text-[10px] text-zinc-600">+{c.tags.length - 3}</span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {Math.round(c.weight * 100)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-400 transition-all duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {c.notes && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-zinc-600">
                      {c.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Concept summary */}
          {hasConcepts && (
            <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3">
              {selectedConcepts.slice(0, 2).map((c, i) => (
                <div key={i} className="flex-1 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase text-zinc-500">
                    Concept {i === 0 ? "A" : "B"}
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-zinc-300">{c.title}</div>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500">{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Atmosphere Selector (Issue #1) ---

function AtmosphereSelector({
  selectedPresets,
  customAtmosphere,
  onTogglePreset,
  onCustomChange,
}: {
  selectedPresets: string[];
  customAtmosphere: string;
  onTogglePreset: (key: string) => void;
  onCustomChange: (value: string) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <label className="mb-1 block text-xs font-medium text-zinc-400">
        Atmosphere / 雰囲気
      </label>
      <p className="mb-2.5 text-[10px] text-zinc-500">
        生成画像のビジュアルムード・トーンを指定します。複数選択可。
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ATMOSPHERE_PRESETS.map((preset) => {
          const isSelected = selectedPresets.includes(preset.key);
          return (
            <button
              key={preset.key}
              onClick={() => onTogglePreset(preset.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-zinc-400 bg-zinc-200 text-zinc-900"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
              }`}
            >
              {preset.ja}
              <span className="ml-1 text-[10px] opacity-70">{preset.en}</span>
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={customAtmosphere}
        onChange={(e) => onCustomChange(e.target.value)}
        placeholder="Custom atmosphere keywords... (e.g. misty, warm golden hour, moody shadows)"
        className="mt-2.5 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
      />
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
    researchTheme,
    exportProcessLog,
    selectedConcepts,
    setSceneConstraint: setStoreSceneConstraint,
    atmosphere,
    setAtmosphere,
  } = useAppState();

  const selectedAtmospheres = atmosphere.presets;
  const customAtmosphere = atmosphere.custom;

  const handleToggleAtmospherePreset = useCallback(
    (key: string) => {
      const next = selectedAtmospheres.includes(key)
        ? selectedAtmospheres.filter((k) => k !== key)
        : [...selectedAtmospheres, key];
      setAtmosphere({ ...atmosphere, presets: next });
    },
    [selectedAtmospheres, atmosphere, setAtmosphere]
  );

  const handleCustomAtmosphereChange = useCallback(
    (value: string) => {
      setAtmosphere({ ...atmosphere, custom: value });
    },
    [atmosphere, setAtmosphere]
  );

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

  // Blend keywords per spectrum step
  const [blendResults, setBlendResults] = useState<BlendKeywordResult[]>([]);
  const [isBlendingKeywords, setIsBlendingKeywords] = useState(false);
  const blendAbortRef = useRef<AbortController | null>(null);

  const hasConcepts = selectedConcepts.length >= 2;

  const topTwo = useMemo(() => {
    if (hasConcepts) return null;
    const sorted = [...conditions]
      .filter((c) => c.weight > 0.2)
      .sort((a, b) => b.weight - a.weight);
    return sorted.length >= 2 ? [sorted[0], sorted[1]] : null;
  }, [conditions, hasConcepts]);

  const configDiffs = useMemo(() => {
    if (
      hasConcepts &&
      selectedConcepts[0]?.architectureConfig &&
      selectedConcepts[1]?.architectureConfig
    ) {
      return computeConfigDiff(
        selectedConcepts[0].architectureConfig,
        selectedConcepts[1].architectureConfig
      );
    }
    return [];
  }, [hasConcepts, selectedConcepts]);

  const canSpectrum = hasConcepts || topTwo != null;
  const labelA = hasConcepts ? selectedConcepts[0].title : topTwo ? domainLabel(topTwo[0].domain) : "";
  const labelB = hasConcepts ? selectedConcepts[1].title : topTwo ? domainLabel(topTwo[1].domain) : "";

  // Fetch blend keywords for each intermediate spectrum step
  const configA = hasConcepts ? selectedConcepts[0]?.architectureConfig : undefined;
  const configB = hasConcepts ? selectedConcepts[1]?.architectureConfig : undefined;
  const configAJson = configA ? JSON.stringify(configA) : "";
  const configBJson = configB ? JSON.stringify(configB) : "";

  useEffect(() => {
    if (!configA || !configB) {
      setBlendResults([]);
      return;
    }

    const ratios = generateSpectrumSteps(spectrumSteps);
    const intermediateRatios = ratios.filter((r) => r > 0 && r < 100);
    if (intermediateRatios.length === 0) {
      setBlendResults([]);
      return;
    }

    if (blendAbortRef.current) blendAbortRef.current.abort();
    const controller = new AbortController();
    blendAbortRef.current = controller;

    setIsBlendingKeywords(true);

    const blendTheme = selectedConcepts[0]?.title + " / " + selectedConcepts[1]?.title;

    fetch("/api/architecture/blend-keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configA, configB, ratios: intermediateRatios, theme: blendTheme }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!controller.signal.aborted && data) {
          setBlendResults(data.results ?? []);
          setIsBlendingKeywords(false);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setIsBlendingKeywords(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spectrumSteps, configAJson, configBJson]);

  const atmospherePromptText = useMemo(() => {
    const presetTexts: string[] = [];
    for (const key of selectedAtmospheres) {
      const found = ATMOSPHERE_PRESETS.find((p) => p.key === key);
      if (found) presetTexts.push(found.prompt);
    }
    if (customAtmosphere.trim()) presetTexts.push(customAtmosphere.trim());
    return presetTexts.join(", ");
  }, [selectedAtmospheres, customAtmosphere]);

  const buildPromptForRatio = useCallback(
    (ratio: number): string => {
      const parts: string[] = [];

      if (atmospherePromptText) {
        parts.push(`[ATMOSPHERE / VISUAL MOOD] ${atmospherePromptText}`);
      }

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

        // Inject per-axis interpolation instructions using config diff + blend keywords
        const cfgA = cA.architectureConfig;
        const cfgB = cB.architectureConfig;
        if (cfgA && cfgB && configDiffs.length > 0) {
          // Find blend keywords for this ratio
          const blendForRatio = blendResults.find((br) => br.ratio === ratio);
          const blendKeywordMap = new Map<string, string>();
          if (blendForRatio) {
            for (const kw of blendForRatio.keywords) {
              if (kw.blended) blendKeywordMap.set(kw.labelJa, kw.blended);
            }
          }

          const axisInstructions = configDiffs.map((d) => {
            const blendedKw = blendKeywordMap.get(d.labelJa);
            if (aPercent >= 90) return `${d.labelJa}: ${d.valueA}`;
            if (bPercent >= 90) return `${d.labelJa}: ${d.valueB}`;
            if (blendedKw) return `${d.labelJa}: ${blendedKw} (blending ${d.valueA} → ${d.valueB} at ${aPercent}/${bPercent})`;
            if (aPercent > 65) return `${d.labelJa}: primarily ${d.valueA}, with subtle ${d.valueB} influence`;
            if (bPercent > 65) return `${d.labelJa}: primarily ${d.valueB}, with subtle ${d.valueA} influence`;
            return `${d.labelJa}: between ${d.valueA} and ${d.valueB} (equal blend)`;
          });
          parts.push(`[ARCHITECTURAL CHARACTERISTICS — per-axis blending at ${aPercent}/${bPercent}]\n${axisInstructions.join("\n")}`);

          // Also include blend summary keywords if available
          if (blendForRatio && blendForRatio.summary.length > 0) {
            parts.push(`[BLEND CHARACTER KEYWORDS] ${blendForRatio.summary.join(", ")}`);
          }

          // Also include shared (non-diff) config elements as constants
          const sharedElements = cfgA ? configToPromptElements(cfgA).filter((e) => {
            const bElements = configToPromptElements(cfgB!);
            return bElements.includes(e);
          }) : [];
          if (sharedElements.length > 0) {
            parts.push(`[SHARED ARCHITECTURAL CONSTANTS] ${sharedElements.join(", ")}`);
          }
        } else if (cfgA || cfgB) {
          // Fallback: only one config available
          const elements = cfgA ? configToPromptElements(cfgA) : configToPromptElements(cfgB!);
          if (elements.length > 0) {
            parts.push(`[ARCHITECTURAL CHARACTERISTICS] ${elements.join(", ")}`);
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
    [sceneConstraint, topTwo, hasConcepts, selectedConcepts, configDiffs, blendResults, atmospherePromptText]
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

      {/* Research Context Panel (Issue #4) */}
      <ResearchContextPanel
        conditions={conditions}
        researchTheme={researchTheme}
        selectedConcepts={selectedConcepts}
      />

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

      {/* Atmosphere Selector (Issue #1) */}
      <AtmosphereSelector
        selectedPresets={selectedAtmospheres}
        customAtmosphere={customAtmosphere}
        onTogglePreset={handleToggleAtmospherePreset}
        onCustomChange={handleCustomAtmosphereChange}
      />

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

      {/* Config Diff Panel */}
      {configDiffs.length > 0 && canSpectrum && (
        <div className="mt-4">
          <ConfigDiffPanel
            diffs={configDiffs}
            ratios={generateSpectrumSteps(spectrumSteps)}
            blendResults={blendResults}
          />
          {isBlendingKeywords && (
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
              ブレンドキーワードを生成中...
            </div>
          )}
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
