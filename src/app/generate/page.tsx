"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/store";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import type { ResearchCondition, GeneratedDesign, EvaluationScore } from "@/lib/types";

const STYLES = [
  "Modern",
  "Traditional",
  "Minimalist",
  "Organic",
  "Industrial",
  "Futuristic",
] as const;

const VARIATION_OPTIONS = [1, 2, 4] as const;

const DOMAIN_LABELS: Record<string, string> = {
  environment: "環境",
  regulation: "法規・制度",
  culture: "文化・歴史",
  economy: "経済",
  society: "社会",
  technology: "技術",
  precedent: "先行事例",
};

function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain;
}

function generatePlaceholderGradient(index: number): string {
  const gradients = [
    "from-zinc-700 to-slate-800",
    "from-slate-700 to-zinc-900",
    "from-zinc-600 to-slate-900",
    "from-slate-600 to-zinc-800",
  ];
  return gradients[index % gradients.length];
}

function defaultScores(): EvaluationScore {
  return { performance: 0, economy: 0, context: 0, experience: 0, social: 0, aesthetics: 0 };
}

// --- Condition Panel ---

function ConditionPanel({
  conditions,
  onWeightChange,
  basePrompt,
  onBasePromptChange,
}: {
  conditions: ResearchCondition[];
  onWeightChange: (index: number, weight: number) => void;
  basePrompt: string;
  onBasePromptChange: (v: string) => void;
}) {
  if (conditions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-sm text-zinc-600">
        No conditions set. Go to Research to define conditions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Base Prompt
        </label>
        <input
          type="text"
          value={basePrompt}
          onChange={(e) => onBasePromptChange(e.target.value)}
          placeholder="e.g. residential building in Tokyo, 3 stories"
          className="w-full rounded border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="space-y-3">
        {conditions.map((c, i) => (
          <div key={c.domain} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-medium text-zinc-300">
                {domainLabel(c.domain)}
              </span>
              <span className="font-mono text-xs text-zinc-500">
                {Math.round(c.weight * 100)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(c.weight * 100)}
              onChange={(e) => onWeightChange(i, parseInt(e.target.value, 10) / 100)}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-zinc-300"
            />
            {c.notes && (
              <p className="mt-1 truncate text-xs text-zinc-600">{c.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Spectrum View ---

function SpectrumView({
  conditionA,
  conditionB,
  spectrumValue,
  onSpectrumChange,
}: {
  conditionA: ResearchCondition;
  conditionB: ResearchCondition;
  spectrumValue: number;
  onSpectrumChange: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
        Design Space Spectrum
      </p>
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-shrink-0 truncate text-xs font-medium text-zinc-400">
          {domainLabel(conditionA.domain)}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={spectrumValue}
          onChange={(e) => onSpectrumChange(parseInt(e.target.value, 10))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-zinc-300"
        />
        <span className="min-w-0 flex-shrink-0 truncate text-xs font-medium text-zinc-400">
          {domainLabel(conditionB.domain)}
        </span>
      </div>
      <p className="mt-1 text-center font-mono text-[10px] text-zinc-600">
        {100 - spectrumValue}% / {spectrumValue}%
      </p>
    </div>
  );
}

// --- Image Card ---

interface LocalImage {
  image: string;
  text: string | null;
  prompt: string;
  timestamp: Date;
}

function ImageCard({
  item,
  onAddToFilter,
  onEnlarge,
  added,
}: {
  item: LocalImage;
  onAddToFilter: () => void;
  onEnlarge: () => void;
  added: boolean;
}) {
  return (
    <div className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
      <button onClick={onEnlarge} className="block w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={item.text ?? "Generated architecture"}
          className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
      </button>
      <div className="p-3">
        <p className="truncate text-xs text-zinc-400">{item.prompt}</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">
          {item.timestamp.toLocaleTimeString()}
        </p>
        <button
          onClick={onAddToFilter}
          disabled={added}
          className="mt-2 w-full rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          {added ? "Added" : "Add to Filter"}
        </button>
      </div>
    </div>
  );
}

function PlaceholderCard({
  index,
  prompt,
  onAddToFilter,
  onEnlarge,
  added,
}: {
  index: number;
  prompt: string;
  onAddToFilter: () => void;
  onEnlarge: () => void;
  added: boolean;
}) {
  const gradient = generatePlaceholderGradient(index);
  return (
    <div className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
      <button onClick={onEnlarge} className="block w-full">
        <div
          className={`flex aspect-square w-full items-center justify-center bg-gradient-to-br ${gradient}`}
        >
          <span className="px-4 text-center text-xs text-zinc-400">
            Placeholder #{index + 1}
          </span>
        </div>
      </button>
      <div className="p-3">
        <p className="truncate text-xs text-zinc-400">{prompt}</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">placeholder</p>
        <button
          onClick={onAddToFilter}
          disabled={added}
          className="mt-2 w-full rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          {added ? "Added" : "Add to Filter"}
        </button>
      </div>
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
        {src.startsWith("data:") || src.startsWith("http") ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt={alt} className="max-h-[85vh] rounded-lg object-contain" />
        ) : (
          <div className="flex h-96 w-96 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 to-slate-800">
            <span className="text-sm text-zinc-400">{alt}</span>
          </div>
        )}
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

// --- Main Page ---

export default function GeneratePage() {
  const router = useRouter();
  const { conditions, updateConditions, generatedDesigns, setGeneratedDesigns } = useAppState();
  const { generate, isLoading, error, images } = useImageGeneration();

  const [localConditions, setLocalConditions] = useState<ResearchCondition[]>(conditions);
  const [basePrompt, setBasePrompt] = useState("");
  const [style, setStyle] = useState<string>(STYLES[0]);
  const [variations, setVariations] = useState<number>(1);
  const [spectrumValue, setSpectrumValue] = useState(50);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Placeholder images for when API is not configured
  const [placeholders, setPlaceholders] = useState<
    { prompt: string; id: string }[]
  >([]);

  // Use conditions from store if local is empty (first render)
  const activeConditions = localConditions.length > 0 ? localConditions : conditions;

  const handleWeightChange = useCallback(
    (index: number, weight: number) => {
      setLocalConditions((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], weight };
        return next;
      });
    },
    []
  );

  // Top two conditions by weight for spectrum
  const topTwo = useMemo(() => {
    const sorted = [...activeConditions]
      .filter((c) => c.weight > 0.2)
      .sort((a, b) => b.weight - a.weight);
    return sorted.length >= 2 ? [sorted[0], sorted[1]] : null;
  }, [activeConditions]);

  // Build prompt with spectrum interpolation
  const buildPrompt = useCallback((): string => {
    const parts: string[] = [];
    if (basePrompt.trim()) {
      parts.push(basePrompt.trim());
    }
    if (topTwo) {
      const aWeight = (100 - spectrumValue) / 100;
      const bWeight = spectrumValue / 100;
      parts.push(
        `Emphasize ${domainLabel(topTwo[0].domain)} (${Math.round(aWeight * 100)}%) and ${domainLabel(topTwo[1].domain)} (${Math.round(bWeight * 100)}%)`
      );
    }
    return parts.join(". ") || "Generate an architectural design";
  }, [basePrompt, topTwo, spectrumValue]);

  const handleGenerate = async () => {
    const prompt = buildPrompt();
    const apiConditions = activeConditions.map((c) => ({
      domain: c.domain,
      weight: c.weight,
      notes: c.notes,
    }));

    for (let i = 0; i < variations; i++) {
      try {
        await generate(prompt, apiConditions, style);
      } catch {
        // useImageGeneration handles errors internally; also add a placeholder
        const id = `placeholder-${Date.now()}-${i}`;
        setPlaceholders((prev) => [...prev, { prompt, id }]);
      }
    }
  };

  // Combined list: real images + placeholders
  const allImages: LocalImage[] = images.map((img, i) => ({
    image: img.image,
    text: img.text,
    prompt: buildPrompt(),
    timestamp: new Date(),
  }));

  const handleAddToFilter = (index: number, isPlaceholder: boolean) => {
    const stableId = isPlaceholder
      ? placeholders[index]?.id ?? `ph-${index}`
      : `gen-${index}`;

    if (addedIds.has(stableId)) return;

    const design: GeneratedDesign = {
      id: `${stableId}-${Date.now()}`,
      imageUrl: isPlaceholder ? "" : images[index]?.image ?? "",
      prompt: isPlaceholder ? placeholders[index]?.prompt ?? "" : buildPrompt(),
      conditions: [...activeConditions],
      scores: defaultScores(),
      createdAt: new Date(),
    };

    setGeneratedDesigns([...generatedDesigns, design]);
    setAddedIds((prev) => new Set(prev).add(stableId));
  };

  const handleProceed = () => {
    // Sync adjusted weights back to store
    if (localConditions.length > 0) {
      updateConditions(localConditions);
    }
    router.push("/filter");
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100">
        Generate / 生成
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Explore continuous design variations from research conditions.
      </p>

      {/* Generation Controls */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="rounded-lg bg-zinc-200 px-5 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
        >
          {isLoading ? "Generating..." : "Generate"}
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

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Variations</label>
          <div className="flex gap-1">
            {VARIATION_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setVariations(n)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  variations === n
                    ? "bg-zinc-300 text-zinc-900"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Spectrum View */}
      {topTwo && (
        <div className="mt-4">
          <SpectrumView
            conditionA={topTwo[0]}
            conditionB={topTwo[1]}
            spectrumValue={spectrumValue}
            onSpectrumChange={setSpectrumValue}
          />
        </div>
      )}

      {/* Main layout: sidebar + gallery */}
      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[260px_1fr]">
        {/* Condition sidebar */}
        <aside>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Conditions
          </h3>
          <ConditionPanel
            conditions={activeConditions}
            onWeightChange={handleWeightChange}
            basePrompt={basePrompt}
            onBasePromptChange={setBasePrompt}
          />
        </aside>

        {/* Image gallery */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Generated Designs
          </h3>

          {allImages.length === 0 && placeholders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 px-6 py-16 text-center text-sm text-zinc-600">
              {activeConditions.length === 0
                ? "Set conditions in Research first, then generate designs here."
                : "Click Generate to create architectural design variations."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allImages.map((item, i) => (
                <ImageCard
                  key={`img-${i}`}
                  item={item}
                  onAddToFilter={() => handleAddToFilter(i, false)}
                  onEnlarge={() => setLightboxSrc(item.image)}
                  added={addedIds.has(`gen-${i}`)}
                />
              ))}
              {placeholders.map((ph, i) => (
                <PlaceholderCard
                  key={ph.id}
                  index={i}
                  prompt={ph.prompt}
                  onAddToFilter={() => handleAddToFilter(i, true)}
                  onEnlarge={() => setLightboxSrc(null)}
                  added={addedIds.has(ph.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Proceed button */}
      {generatedDesigns.length > 0 && (
        <div className="mt-8 flex items-center justify-between border-t border-zinc-800 pt-6">
          <p className="text-sm text-zinc-500">
            {generatedDesigns.length} design{generatedDesigns.length !== 1 ? "s" : ""} added
            to filter
          </p>
          <button
            onClick={handleProceed}
            className="rounded-lg bg-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white"
          >
            Proceed to Filter
          </button>
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        src={lightboxSrc}
        alt="Generated design"
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
