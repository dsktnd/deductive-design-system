"use client";

import { useState } from "react";
import { useAppState } from "@/lib/store";
import type { EvaluationScore, GeneratedDesign } from "@/lib/types";

const EVAL_AXES: { key: keyof EvaluationScore; labelEn: string; labelJa: string }[] = [
  { key: "performance", labelEn: "Performance", labelJa: "性能" },
  { key: "economy", labelEn: "Economy", labelJa: "経済" },
  { key: "context", labelEn: "Context", labelJa: "文脈" },
  { key: "experience", labelEn: "Experience", labelJa: "体験" },
  { key: "social", labelEn: "Social", labelJa: "社会" },
  { key: "aesthetics", labelEn: "Aesthetics", labelJa: "美学" },
];

function ScoreBar({
  label,
  labelJa,
  value,
}: {
  label: string;
  labelJa: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-right text-[10px] text-zinc-500">
        {label} <span className="text-zinc-700">{labelJa}</span>
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-400"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-6 text-right text-[10px] tabular-nums text-zinc-500">
        {value}
      </span>
    </div>
  );
}

function ComparisonCard({
  design,
  notes,
  onNotesChange,
  selected,
  onSelect,
}: {
  design: GeneratedDesign;
  notes: string;
  onNotesChange: (notes: string) => void;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`flex flex-col rounded border transition-colors ${
        selected
          ? "border-zinc-400 bg-zinc-800/60"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="aspect-square w-full overflow-hidden rounded-t bg-zinc-800">
        {design.imageUrl ? (
          <img
            src={design.imageUrl}
            alt={design.prompt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="mb-3 text-xs leading-relaxed text-zinc-400 line-clamp-2">
          {design.prompt}
        </p>

        <div className="mb-3 space-y-1.5">
          {EVAL_AXES.map((axis) => (
            <ScoreBar
              key={axis.key}
              label={axis.labelEn}
              labelJa={axis.labelJa}
              value={design.scores[axis.key]}
            />
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Notes..."
          className="mb-3 w-full resize-none rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:border-zinc-600 focus:outline-none"
          rows={2}
        />

        <button
          onClick={onSelect}
          className={`mt-auto rounded px-3 py-1.5 text-xs transition-colors ${
            selected
              ? "bg-zinc-200 text-zinc-900"
              : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600"
          }`}
        >
          {selected ? "Selected" : "Select"}
        </button>
      </div>
    </div>
  );
}

export default function DistillPage() {
  const { filteredDesigns } = useAppState();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleNotesChange = (id: string, value: string) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100">
        Distill / 蒸留
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        Final convergence -- apply human judgment to the refined candidate set.
      </p>

      {filteredDesigns.length === 0 ? (
        <div className="mt-8 rounded border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-600">
          No candidates yet. Filter generated designs first, then send them here
          for final distillation.
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {filteredDesigns.length} candidate{filteredDesigns.length !== 1 ? "s" : ""} for final evaluation
            </p>
            {selectedId && (
              <p className="text-xs text-zinc-400">
                Final selection: {selectedId}
              </p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDesigns.map((design) => (
              <ComparisonCard
                key={design.id}
                design={design}
                notes={notes[design.id] || ""}
                onNotesChange={(value) => handleNotesChange(design.id, value)}
                selected={selectedId === design.id}
                onSelect={() =>
                  setSelectedId((prev) =>
                    prev === design.id ? null : design.id
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
