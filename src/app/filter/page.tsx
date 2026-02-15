"use client";

import { useState, useMemo } from "react";
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

function RadarChart({ scores, size = 120 }: { scores: EvaluationScore; size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 16;
  const axes = EVAL_AXES.map((a) => a.key);

  const points = axes.map((key, i) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    const value = scores[key] / 100;
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  });

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => {
        const gridPoints = axes.map((_, i) => {
          const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
          return `${center + radius * level * Math.cos(angle)},${center + radius * level * Math.sin(angle)}`;
        });
        return (
          <polygon
            key={level}
            points={gridPoints.join(" ")}
            fill="none"
            stroke="rgb(63 63 70)"
            strokeWidth="0.5"
          />
        );
      })}
      {axes.map((_, i) => {
        const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos(angle)}
            y2={center + radius * Math.sin(angle)}
            stroke="rgb(63 63 70)"
            strokeWidth="0.5"
          />
        );
      })}
      <polygon
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(161, 161, 170, 0.15)"
        stroke="rgb(161 161 170)"
        strokeWidth="1.5"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="rgb(212 212 216)" />
      ))}
      {axes.map((key, i) => {
        const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
        const labelR = radius + 10;
        const x = center + labelR * Math.cos(angle);
        const y = center + labelR * Math.sin(angle);
        return (
          <text
            key={key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgb(113 113 122)"
            fontSize="7"
          >
            {key.charAt(0).toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

function DesignCard({
  design,
  onSelect,
  selected,
}: {
  design: GeneratedDesign;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  return (
    <div
      className={`rounded border p-3 transition-colors cursor-pointer ${
        selected
          ? "border-zinc-400 bg-zinc-800/60"
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
      }`}
      onClick={() => onSelect(design.id)}
    >
      <div className="mb-2 aspect-square w-full overflow-hidden rounded bg-zinc-800">
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
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-xs leading-relaxed text-zinc-400 line-clamp-2">
          {design.prompt}
        </p>
        <RadarChart scores={design.scores} size={80} />
      </div>
    </div>
  );
}

export default function FilterPage() {
  const { generatedDesigns, setFilteredDesigns } = useAppState();
  const [thresholds, setThresholds] = useState<EvaluationScore>({
    performance: 0,
    economy: 0,
    context: 0,
    experience: 0,
    social: 0,
    aesthetics: 0,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredDesigns = useMemo(() => {
    return generatedDesigns.filter((design) =>
      EVAL_AXES.every(
        (axis) => design.scores[axis.key] >= thresholds[axis.key]
      )
    );
  }, [generatedDesigns, thresholds]);

  const handleThresholdChange = (key: keyof EvaluationScore, value: number) => {
    setThresholds((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSendToDistill = () => {
    const selected = filteredDesigns.filter((d) => selectedIds.has(d.id));
    setFilteredDesigns(selected.length > 0 ? selected : filteredDesigns);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100">
        Filter / フィルタリング
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        Progressively narrow the design space using research-based criteria.
      </p>

      {generatedDesigns.length === 0 ? (
        <div className="mt-8 rounded border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-zinc-600">
          No generated designs yet. Generate designs first, then return here to
          filter.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-[280px_1fr] gap-6">
          <div className="space-y-4">
            <div className="rounded border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Threshold Filters
              </h3>
              <div className="space-y-3">
                {EVAL_AXES.map((axis) => (
                  <div key={axis.key}>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs text-zinc-400">
                        {axis.labelEn}{" "}
                        <span className="text-zinc-600">{axis.labelJa}</span>
                      </label>
                      <span className="text-xs tabular-nums text-zinc-500">
                        {thresholds[axis.key]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={thresholds[axis.key]}
                      onChange={(e) =>
                        handleThresholdChange(
                          axis.key,
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full accent-zinc-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Showing {filteredDesigns.length} / {generatedDesigns.length}
                </span>
                <span className="text-xs text-zinc-600">
                  {selectedIds.size} selected
                </span>
              </div>
              <button
                onClick={handleSendToDistill}
                className="mt-3 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
              >
                Send to Distill
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {filteredDesigns.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                onSelect={handleSelect}
                selected={selectedIds.has(design.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
