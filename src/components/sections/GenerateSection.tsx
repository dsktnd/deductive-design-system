"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useStore, type AtmosphereState } from "@/lib/store";
import { ABSTRACTION_LEVELS, configToPromptElements } from "@/lib/gemini";
import type {
  GeneratedDesign,
  GeneratedImage,
  EvaluationScore,
  GenerateJob,
  ArchitectureConfig,
  ResearchCondition,
} from "@/lib/types";

import { STYLES, SPECTRUM_STEP_OPTIONS, ATMOSPHERE_PRESETS, domainLabel, defaultScores, generateSpectrumSteps } from "./generate/constants";
import SpectrumBar from "./generate/SpectrumBar";
import SpectrumImageRow from "./generate/SpectrumImageRow";
import Lightbox from "./generate/Lightbox";
import GenerateJobHistory from "./generate/GenerateJobHistory";
import ConfigDiffPanel, { computeConfigDiff, type ConfigDiffEntry, type BlendKeywordResult } from "./generate/ConfigDiffPanel";
import ResearchContextPanel from "./generate/ResearchContextPanel";
import AtmosphereSelector from "./generate/AtmosphereSelector";

// --- Main Section ---

export default function GenerateSection() {
  const conditions = useStore((s) => s.conditions);
  const generatedDesigns = useStore((s) => s.generatedDesigns);
  const setGeneratedDesigns = useStore((s) => s.setGeneratedDesigns);
  const generateJobs = useStore((s) => s.generateJobs);
  const addGenerateJob = useStore((s) => s.addGenerateJob);
  const researchJobs = useStore((s) => s.researchJobs);
  const researchTheme = useStore((s) => s.researchTheme);
  const exportProcessLog = useStore((s) => s.exportProcessLog);
  const selectedConcepts = useStore((s) => s.selectedConcepts);
  const setStoreSceneConstraint = useStore((s) => s.setSceneConstraint);
  const atmosphere = useStore((s) => s.atmosphere);
  const setAtmosphere = useStore((s) => s.setAtmosphere);

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
