"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { GeneratedImage } from "@/lib/types";
import { DETAIL_STAGES, dataUrlToRef } from "./filter/constants";
import type { StageStatus } from "./filter/constants";
import Lightbox from "./filter/Lightbox";
import SelectedImageCard from "./filter/SelectedImageCard";
import StageCard from "./filter/StageCard";
import StageCardWide from "./filter/StageCardWide";

export default function FilterSection() {
  const generatedDesigns = useStore((s) => s.generatedDesigns);
  const setGeneratedDesigns = useStore((s) => s.setGeneratedDesigns);
  const selectedConcepts = useStore((s) => s.selectedConcepts);
  const conditions = useStore((s) => s.conditions);
  const researchTheme = useStore((s) => s.researchTheme);
  const refinedConcept = useStore((s) => s.refinedConcept);
  const setRefinedConcept = useStore((s) => s.setRefinedConcept);
  const sceneConstraint = useStore((s) => s.sceneConstraint);
  const setDetailImages = useStore((s) => s.setDetailImages);

  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [stageStatus, setStageStatus] = useState<Record<string, StageStatus>>({});
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const conceptA = selectedConcepts[0] ?? null;
  const conceptB = selectedConcepts[1] ?? null;

  const handleRefine = async () => {
    if (!conceptA || !conceptB) return;

    const selectedRatios = generatedDesigns
      .map((d) => d.spectrumRatio)
      .filter((r): r is number => r != null);

    if (selectedRatios.length === 0) {
      setRefineError("No spectrum position data. Re-add images from Generate page.");
      return;
    }

    setIsRefining(true);
    setRefineError(null);

    try {
      const res = await fetch("/api/concepts/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: researchTheme,
          conceptA: { title: conceptA.title, description: conceptA.description },
          conceptB: { title: conceptB.title, description: conceptB.description },
          selectedRatios,
          conditions: conditions.map((c) => ({
            domain: c.domain,
            weight: c.weight,
            notes: c.notes,
            tags: c.tags,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.refinedTitle) {
        const concept = { title: data.refinedTitle, description: data.refinedDescription };
        setRefinedConcept(concept);
        setEditingTitle(concept.title);
        setEditingDescription(concept.description);
      } else {
        setRefineError(data.error || "Refinement failed");
      }
    } catch {
      setRefineError("Network error");
    } finally {
      setIsRefining(false);
    }
  };

  const handleSaveEdit = () => {
    setRefinedConcept({ title: editingTitle, description: editingDescription });
    setIsEditing(false);
  };

  const handleGenerateDetails = async () => {
    if (!refinedConcept) return;

    setIsGeneratingDetails(true);
    setCurrentStageIndex(0);

    const initial: Record<string, StageStatus> = {};
    for (const stage of DETAIL_STAGES) {
      initial[stage.key] = { image: null, loading: false, error: null };
    }
    setStageStatus(initial);

    const apiConditions = conditions.map((c) => ({
      domain: c.domain,
      weight: c.weight,
      notes: c.notes,
      tags: c.tags,
    }));

    // Build reference images from selected designs (original selections)
    const originRefs = generatedDesigns
      .map((d) => dataUrlToRef(d.imageUrl, "Selected Design"))
      .filter((r): r is NonNullable<typeof r> => r != null);

    const generatedRefs: { key: string; dataUrl: string; label: string }[] = [];

    for (let i = 0; i < DETAIL_STAGES.length; i++) {
      const stage = DETAIL_STAGES[i];
      setCurrentStageIndex(i);

      setStageStatus((prev) => ({
        ...prev,
        [stage.key]: { image: null, loading: true, error: null },
      }));

      const promptParts: string[] = [];
      promptParts.push(`Refined Concept: "${refinedConcept.title}"`);
      promptParts.push(refinedConcept.description);
      if (sceneConstraint) {
        promptParts.push(`[SCENE CONSTRAINT] ${sceneConstraint}`);
      }
      promptParts.push(`[THIS IMAGE] ${stage.description}`);
      const prompt = promptParts.join("\n");

      // Always include original selected designs as references;
      // for later stages, also include previously generated detail images
      const stageRefs = i >= 3
        ? generatedRefs
            .map((ref) => dataUrlToRef(ref.dataUrl, ref.label))
            .filter((r): r is NonNullable<typeof r> => r != null)
        : [];
      const referenceImages = [...originRefs, ...stageRefs];

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            style: stage.style,
            abstractionLevel: stage.abstractionLevel,
            conditions: apiConditions,
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          }),
        });

        const data = await res.json();
        if (res.ok && data.image) {
          const img: GeneratedImage = {
            id: `detail-${stage.key}-${Date.now()}`,
            image: data.image,
            text: data.text,
            prompt,
            abstractionLevel: stage.abstractionLevel,
            style: stage.style,
            timestamp: new Date().toISOString(),
          };

          setStageStatus((prev) => ({
            ...prev,
            [stage.key]: { image: img, loading: false, error: null },
          }));

          generatedRefs.push({
            key: stage.key,
            dataUrl: data.image,
            label: `${stage.labelJa} (${stage.label})`,
          });
        } else {
          setStageStatus((prev) => ({
            ...prev,
            [stage.key]: { image: null, loading: false, error: data.error || "Generation failed" },
          }));
        }
      } catch {
        setStageStatus((prev) => ({
          ...prev,
          [stage.key]: { image: null, loading: false, error: "Network error" },
        }));
      }

      if (i < DETAIL_STAGES.length - 1) {
        await new Promise((r) => setTimeout(r, 8000));
      }
    }

    // Save completed images to store for Distill
    // Use generatedRefs which accumulated during the loop
    const detailResult: Record<string, GeneratedImage> = {};
    for (const ref of generatedRefs) {
      const stage = DETAIL_STAGES.find((s) => s.key === ref.key);
      if (!stage) continue;
      const status = stageStatus[ref.key] ?? null;
      // stageStatus may be stale due to async; build from generatedRefs data
      detailResult[ref.key] = {
        id: `detail-${ref.key}-${Date.now()}`,
        image: ref.dataUrl,
        text: null,
        prompt: "",
        abstractionLevel: stage.abstractionLevel,
        style: stage.style,
        timestamp: new Date().toISOString(),
      };
    }
    if (Object.keys(detailResult).length > 0) {
      setDetailImages(detailResult);
    }

    setIsGeneratingDetails(false);
    setCurrentStageIndex(-1);
  };

  const handleRemoveDesign = (id: string) => {
    setGeneratedDesigns(generatedDesigns.filter((d) => d.id !== id));
  };

  return (
    <div>
      <h2 className="font-[family-name:var(--font-dm-serif)] text-xl text-slate-100">Filter / コンセプト精緻化</h2>
      <p className="mt-1 text-sm text-slate-500">
        選択された画像の方向性を分析し、精緻化コンセプトから抽象→具体の連鎖的なディテール画像を生成します。
      </p>

      {/* Section 1: Selected Images */}
      <section className="mt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Selected Images / 選択された画像
        </h3>

        {generatedDesigns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-500">
            No images selected yet. Go to Generate and add images to filter.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {generatedDesigns.map((design) => (
              <SelectedImageCard
                key={design.id}
                design={design}
                conceptALabel={conceptA?.title}
                conceptBLabel={conceptB?.title}
                onRemove={handleRemoveDesign}
                onEnlarge={setLightboxSrc}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Concept Refinement */}
      {generatedDesigns.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Concept Refinement / コンセプト精緻化
          </h3>

          {!refinedConcept ? (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6 text-center">
              <p className="mb-4 text-sm text-slate-400">
                {conceptA && conceptB
                  ? `「${conceptA.title}」と「${conceptB.title}」のスペクトラムから選ばれた画像の傾向を分析し、精緻化コンセプトを生成します。`
                  : "コンセプトが2つ必要です。Research ページでコンセプトを生成してください。"}
              </p>
              <button
                onClick={handleRefine}
                disabled={isRefining || !conceptA || !conceptB}
                className="rounded-lg gradient-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-105 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-500"
              >
                {isRefining ? "精緻化中..." : "コンセプトを精緻化"}
              </button>
              {refineError && <p className="mt-3 text-xs text-red-400">{refineError}</p>}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-600 bg-slate-800/60 p-5">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full rounded border border-slate-500 bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                  />
                  <textarea
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    rows={4}
                    className="w-full resize-y rounded border border-slate-500 bg-slate-700 px-3 py-2 text-sm text-slate-300 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="rounded gradient-accent px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:scale-105"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded border border-slate-600 px-4 py-1.5 text-xs text-slate-400 hover:border-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Refined Concept
                      </div>
                      <h4 className="text-base font-semibold text-slate-100">{refinedConcept.title}</h4>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditingTitle(refinedConcept.title);
                          setEditingDescription(refinedConcept.description);
                          setIsEditing(true);
                        }}
                        className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setRefinedConcept(null)}
                        className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-400 hover:border-red-700 hover:text-red-400"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {refinedConcept.description}
                  </p>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* Section 3: Cascading Detail Generation */}
      {refinedConcept && (
        <section className="mt-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Detail Generation / ディテール画像生成
          </h3>

          <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  抽象→具体の順に連鎖生成。各段階の画像が次の段階の参照になります。
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Diagram → Concept → Material → Exterior → Interior
                </p>
              </div>
              <button
                onClick={handleGenerateDetails}
                disabled={isGeneratingDetails}
                className="flex-shrink-0 rounded-lg gradient-accent px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-105 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-500"
              >
                {isGeneratingDetails
                  ? `生成中 ${currentStageIndex + 1}/${DETAIL_STAGES.length}...`
                  : "ディテールを生成"}
              </button>
            </div>
          </div>

          {/* Row 1: Abstract stages (1-3) */}
          <div className="grid grid-cols-3 gap-4">
            {DETAIL_STAGES.slice(0, 3).map((stage, i) => (
              <StageCard
                key={stage.key}
                stage={stage}
                index={i}
                status={stageStatus[stage.key]}
                isActive={isGeneratingDetails && currentStageIndex === i}
                onEnlarge={setLightboxSrc}
              />
            ))}
          </div>

          {/* Connection lines */}
          <div className="relative flex justify-center py-2">
            <svg width="100%" height="40" className="overflow-visible">
              <line x1="16.67%" y1="0" x2="16.67%" y2="20" stroke="rgb(82 82 91)" strokeWidth="1" />
              <line x1="16.67%" y1="20" x2="50%" y2="20" stroke="rgb(82 82 91)" strokeWidth="1" />
              <line x1="50%" y1="0" x2="50%" y2="20" stroke="rgb(82 82 91)" strokeWidth="1" />
              <line x1="83.33%" y1="0" x2="83.33%" y2="20" stroke="rgb(82 82 91)" strokeWidth="1" />
              <line x1="83.33%" y1="20" x2="50%" y2="20" stroke="rgb(82 82 91)" strokeWidth="1" />
              <line x1="50%" y1="20" x2="50%" y2="40" stroke="rgb(82 82 91)" strokeWidth="1" />
            </svg>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-500">
              3 images as reference
            </span>
          </div>

          {/* Row 2: Concrete stages (4-5) */}
          <div className="space-y-3">
            {DETAIL_STAGES.slice(3).map((stage, i) => {
              const globalIndex = i + 3;
              return (
                <div key={stage.key}>
                  {i > 0 && (
                    <div className="flex justify-center py-1">
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-px ${
                          stageStatus[stage.key]?.image || (isGeneratingDetails && currentStageIndex === globalIndex)
                            ? "bg-slate-500" : "bg-slate-700"
                        }`} />
                        <span className="text-[10px] text-slate-500">
                          {globalIndex} images as reference
                        </span>
                      </div>
                    </div>
                  )}
                  <StageCardWide
                    stage={stage}
                    index={globalIndex}
                    status={stageStatus[stage.key]}
                    isActive={isGeneratingDetails && currentStageIndex === globalIndex}
                    onEnlarge={setLightboxSrc}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
