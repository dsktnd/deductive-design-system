"use client";

import { useState } from "react";
import { useAppState } from "@/lib/store";
import type { GeneratedDesign, GeneratedImage } from "@/lib/types";

// Ordered from abstract → concrete. Each stage can reference all prior stages.
const DETAIL_STAGES = [
  {
    key: "diagram",
    label: "Diagram",
    labelJa: "ダイアグラム",
    style: "Diagram",
    abstractionLevel: 2,
    description: "Design concept expressed as an abstract diagram — relationships, flows, spatial organization.",
  },
  {
    key: "concept",
    label: "Concept Image",
    labelJa: "コンセプトイメージ",
    style: "Sketch",
    abstractionLevel: 2,
    description: "Evocative concept image capturing atmosphere, color, light, and material identity.",
  },
  {
    key: "material",
    label: "Material Board",
    labelJa: "マテリアルボード",
    style: "Sketch",
    abstractionLevel: 1,
    description: "Material palette — textures, colors, samples that embody the concept.",
  },
  {
    key: "exterior",
    label: "Exterior",
    labelJa: "外観イメージ",
    style: "Photorealistic",
    abstractionLevel: 4,
    description: "Photorealistic exterior view — building form, facade, materials, landscape context.",
  },
  {
    key: "interior",
    label: "Interior",
    labelJa: "内観イメージ",
    style: "Photorealistic",
    abstractionLevel: 3,
    description: "Photorealistic interior view — spatial quality, light, materials, human scale.",
  },
] as const;

type StageStatus = {
  image: GeneratedImage | null;
  loading: boolean;
  error: string | null;
};

function dataUrlToRef(dataUrl: string, label: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { base64: match[2], mimeType: match[1], label };
}

function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Detail" className="max-h-[85vh] rounded-lg object-contain" />
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

export default function FilterSection() {
  const {
    generatedDesigns,
    setGeneratedDesigns,
    selectedConcepts,
    conditions,
    researchTheme,
    refinedConcept,
    setRefinedConcept,
    sceneConstraint,
  } = useAppState();

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

      const useReferences = i >= 3;
      const referenceImages = useReferences
        ? generatedRefs
            .map((ref) => dataUrlToRef(ref.dataUrl, ref.label))
            .filter((r): r is NonNullable<typeof r> => r != null)
        : [];

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

    setIsGeneratingDetails(false);
    setCurrentStageIndex(-1);
  };

  const handleRemoveDesign = (id: string) => {
    setGeneratedDesigns(generatedDesigns.filter((d) => d.id !== id));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100">Filter / コンセプト精緻化</h2>
      <p className="mt-1 text-sm text-zinc-500">
        選択された画像の方向性を分析し、精緻化コンセプトから抽象→具体の連鎖的なディテール画像を生成します。
      </p>

      {/* Section 1: Selected Images */}
      <section className="mt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Selected Images / 選択された画像
        </h3>

        {generatedDesigns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-600">
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
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Concept Refinement / コンセプト精緻化
          </h3>

          {!refinedConcept ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-center">
              <p className="mb-4 text-sm text-zinc-400">
                {conceptA && conceptB
                  ? `「${conceptA.title}」と「${conceptB.title}」のスペクトラムから選ばれた画像の傾向を分析し、精緻化コンセプトを生成します。`
                  : "コンセプトが2つ必要です。Research ページでコンセプトを生成してください。"}
              </p>
              <button
                onClick={handleRefine}
                disabled={isRefining || !conceptA || !conceptB}
                className="rounded-lg bg-zinc-200 px-6 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                {isRefining ? "精緻化中..." : "コンセプトを精緻化"}
              </button>
              {refineError && <p className="mt-3 text-xs text-red-400">{refineError}</p>}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-5">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 focus:border-zinc-400 focus:outline-none"
                  />
                  <textarea
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    rows={4}
                    className="w-full resize-y rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:border-zinc-400 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="rounded bg-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded border border-zinc-700 px-4 py-1.5 text-xs text-zinc-400 hover:border-zinc-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Refined Concept
                      </div>
                      <h4 className="text-base font-semibold text-zinc-100">{refinedConcept.title}</h4>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditingTitle(refinedConcept.title);
                          setEditingDescription(refinedConcept.description);
                          setIsEditing(true);
                        }}
                        className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setRefinedConcept(null)}
                        className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:border-red-700 hover:text-red-400"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
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
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Detail Generation / ディテール画像生成
          </h3>

          <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">
                  抽象→具体の順に連鎖生成。各段階の画像が次の段階の参照になります。
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-600">
                  Diagram → Concept → Material → Exterior → Interior
                </p>
              </div>
              <button
                onClick={handleGenerateDetails}
                disabled={isGeneratingDetails}
                className="flex-shrink-0 rounded-lg bg-zinc-200 px-5 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
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
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
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
                            ? "bg-zinc-500" : "bg-zinc-800"
                        }`} />
                        <span className="text-[10px] text-zinc-600">
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

function SelectedImageCard({
  design,
  conceptALabel,
  conceptBLabel,
  onRemove,
  onEnlarge,
}: {
  design: GeneratedDesign;
  conceptALabel?: string;
  conceptBLabel?: string;
  onRemove: (id: string) => void;
  onEnlarge: (src: string) => void;
}) {
  const ratio = design.spectrumRatio;

  return (
    <div className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50">
      <button onClick={() => onEnlarge(design.imageUrl)} className="block w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={design.imageUrl}
          alt={design.prompt}
          className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
      </button>
      <div className="p-2">
        {ratio != null && (
          <div className="mb-1.5">
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span className="truncate max-w-[45%]">{conceptALabel ?? "A"}</span>
              <span className="truncate max-w-[45%] text-right">{conceptBLabel ?? "B"}</span>
            </div>
            <div className="relative mt-1 h-1.5 rounded-full bg-zinc-700">
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-zinc-300 bg-zinc-200"
                style={{ left: `${ratio}%` }}
              />
            </div>
            <div className="mt-0.5 text-center font-mono text-[10px] text-zinc-500">
              {100 - ratio}/{ratio}
            </div>
          </div>
        )}
        <button
          onClick={() => onRemove(design.id)}
          className="w-full rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// --- Stage cards ---

type StageType = (typeof DETAIL_STAGES)[number];

function StageImageArea({
  status,
  label,
  onEnlarge,
}: {
  status: StageStatus | undefined;
  label: string;
  onEnlarge: (src: string) => void;
}) {
  if (status?.loading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900/50">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          <span className="mt-2 block text-xs text-zinc-500">生成中...</span>
        </div>
      </div>
    );
  }
  if (status?.image) {
    return (
      <button onClick={() => onEnlarge(status.image!.image)} className="block h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={status.image.image}
          alt={label}
          className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
        />
      </button>
    );
  }
  if (status?.error) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900/50 p-3">
        <span className="text-xs text-red-400 text-center">{status.error}</span>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center bg-zinc-900/30">
      <span className="text-xs text-zinc-700">Waiting...</span>
    </div>
  );
}

function StageCard({
  stage,
  index,
  status,
  isActive,
  onEnlarge,
}: {
  stage: StageType;
  index: number;
  status: StageStatus | undefined;
  isActive: boolean;
  onEnlarge: (src: string) => void;
}) {
  const isDone = status?.image != null;

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-colors ${
        isActive
          ? "border-zinc-500 bg-zinc-800/60"
          : isDone
          ? "border-zinc-700 bg-zinc-900/60"
          : "border-zinc-800 bg-zinc-900/30"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
            isDone
              ? "bg-zinc-300 text-zinc-900"
              : isActive
              ? "animate-pulse bg-zinc-500 text-zinc-100"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {index + 1}
        </span>
        <div>
          <div className="text-xs font-semibold text-zinc-200">{stage.labelJa}</div>
          <div className="text-[10px] text-zinc-500">{stage.label}</div>
        </div>
      </div>

      <div className="aspect-square">
        <StageImageArea status={status} label={stage.labelJa} onEnlarge={onEnlarge} />
      </div>

      <div className="border-t border-zinc-800 px-3 py-2">
        <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {stage.style}
        </span>
        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
          {stage.description}
        </p>
      </div>
    </div>
  );
}

function StageCardWide({
  stage,
  index,
  status,
  isActive,
  onEnlarge,
}: {
  stage: StageType;
  index: number;
  status: StageStatus | undefined;
  isActive: boolean;
  onEnlarge: (src: string) => void;
}) {
  const isDone = status?.image != null;

  return (
    <div
      className={`flex gap-4 rounded-lg border p-4 transition-colors ${
        isActive
          ? "border-zinc-500 bg-zinc-800/60"
          : isDone
          ? "border-zinc-700 bg-zinc-900/60"
          : "border-zinc-800 bg-zinc-900/30"
      }`}
    >
      <div className="flex w-40 flex-shrink-0 flex-col justify-center">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              isDone
                ? "bg-zinc-300 text-zinc-900"
                : isActive
                ? "animate-pulse bg-zinc-500 text-zinc-100"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {index + 1}
          </span>
          <div>
            <div className="text-sm font-semibold text-zinc-200">{stage.labelJa}</div>
            <div className="text-[10px] text-zinc-500">{stage.label}</div>
          </div>
        </div>
        <div className="mt-1.5">
          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {stage.style}
          </span>
        </div>
      </div>

      <div className="aspect-square w-48 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-800">
        <StageImageArea status={status} label={stage.labelJa} onEnlarge={onEnlarge} />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <p className="text-xs leading-relaxed text-zinc-500">{stage.description}</p>
        {status?.image?.text && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-400">
            {status.image.text}
          </p>
        )}
      </div>
    </div>
  );
}
