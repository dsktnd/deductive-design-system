"use client";

import { useMemo, useState, useCallback } from "react";
import { ResearchDomain, type DomainState } from "@/lib/types";
import { similarity } from "@/lib/graph/buildResearchGraph";
import { DOMAINS, DOMAIN_LABELS } from "./constants";

// --- Types ---

interface CorrelationMatrixProps {
  domainState: Record<ResearchDomain, DomainState>;
}

interface CellDetail {
  row: number;
  col: number;
  score: number;
  relatedScore: number;
  tagScore: number;
  textScore: number;
  commonTags: string[];
  mutualRelated: boolean;
  topFindings: { a: string; b: string; sim: number }[];
}

// --- Helpers ---

const DOMAIN_KEYS = Object.values(ResearchDomain);

function hasData(domainState: Record<ResearchDomain, DomainState>): boolean {
  return DOMAIN_KEYS.some(
    (k) =>
      domainState[k].notes ||
      domainState[k].tags.length > 0 ||
      (domainState[k].findings && domainState[k].findings!.length > 0)
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate from zinc-800 (#27272a) → emerald-900/40 → emerald-500 (#10b981) */
function scoreToColor(score: number): string {
  const s = Math.max(0, Math.min(1, score));
  if (s < 0.3) {
    const t = s / 0.3;
    const r = Math.round(lerp(0x27, 0x06, t));
    const g = Math.round(lerp(0x27, 0x4d, t));
    const b = Math.round(lerp(0x2a, 0x40, t));
    const a = Math.round(lerp(255, 102, t)); // 1.0 → 0.4
    return `rgba(${r},${g},${b},${a / 255})`;
  }
  const t = (s - 0.3) / 0.7;
  const r = Math.round(lerp(0x06, 0x10, t));
  const g = Math.round(lerp(0x4d, 0xb9, t));
  const b = Math.round(lerp(0x40, 0x81, t));
  return `rgb(${r},${g},${b})`;
}

// --- Compute correlation matrix ---

function computeMatrix(
  domainState: Record<ResearchDomain, DomainState>
): { scores: number[][]; details: CellDetail[][] } {
  const n = DOMAIN_KEYS.length;
  const scores: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const details: CellDetail[][] = Array.from({ length: n }, () =>
    Array(n).fill(null)
  );

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = domainState[DOMAIN_KEYS[i]];
      const b = domainState[DOMAIN_KEYS[j]];

      // 1. related_domains score (40%)
      const aRelatesB = a.relatedDomains?.includes(DOMAIN_KEYS[j]) ? 0.5 : 0;
      const bRelatesA = b.relatedDomains?.includes(DOMAIN_KEYS[i]) ? 0.5 : 0;
      const relatedScore = aRelatesB + bRelatesA; // 0, 0.5, or 1.0
      const mutualRelated = aRelatesB > 0 && bRelatesA > 0;

      // 2. Tag overlap - Jaccard (30%)
      const aTags = new Set(a.tags);
      const bTags = new Set(b.tags);
      const union = new Set([...aTags, ...bTags]);
      const commonTags: string[] = [];
      for (const t of aTags) {
        if (bTags.has(t)) commonTags.push(t);
      }
      const tagScore = union.size > 0 ? commonTags.length / union.size : 0;

      // 3. Findings text similarity (30%) — starred findings get 1.5x weight
      const aFindings = (a.findings ?? []).filter((f) => !f.excluded);
      const bFindings = (b.findings ?? []).filter((f) => !f.excluded);
      let textScore = 0;
      const findingPairs: { a: string; b: string; sim: number }[] = [];
      if (aFindings.length > 0 && bFindings.length > 0) {
        let weightedSum = 0;
        let weightSum = 0;
        for (const fa of aFindings) {
          for (const fb of bFindings) {
            const sim = similarity(fa.text, fb.text);
            const w = (fa.starred ? 1.5 : 1) * (fb.starred ? 1.5 : 1);
            weightedSum += sim * w;
            weightSum += w;
            findingPairs.push({ a: fa.text, b: fb.text, sim });
          }
        }
        textScore = weightSum > 0 ? weightedSum / weightSum : 0;
      }
      findingPairs.sort((a, b) => b.sim - a.sim);

      const score = relatedScore * 0.4 + tagScore * 0.3 + textScore * 0.3;

      scores[i][j] = score;
      scores[j][i] = score;

      const detail: CellDetail = {
        row: i,
        col: j,
        score,
        relatedScore,
        tagScore,
        textScore,
        commonTags,
        mutualRelated,
        topFindings: findingPairs.slice(0, 3),
      };
      details[i][j] = detail;
      details[j][i] = { ...detail, row: j, col: i };
    }
  }

  return { scores, details };
}

// --- Component ---

export default function CorrelationMatrix({ domainState }: CorrelationMatrixProps) {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  const { scores, details } = useMemo(
    () => computeMatrix(domainState),
    [domainState]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (row === col) return;
      setSelected((prev) =>
        prev?.row === row && prev?.col === col ? null : { row, col }
      );
    },
    []
  );

  if (!hasData(domainState)) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
        <span className="text-sm text-zinc-500">
          リサーチを実行すると相関マトリクスが表示されます
        </span>
      </div>
    );
  }

  const n = DOMAIN_KEYS.length;
  const cellSize = 56;
  const labelWidth = 72;
  const labelHeight = 72;
  const totalWidth = labelWidth + n * cellSize;
  const totalHeight = labelHeight + n * cellSize;

  const selectedDetail =
    selected && selected.row !== selected.col
      ? details[selected.row][selected.col]
      : null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:gap-6">
        {/* Matrix SVG */}
        <svg
          width={totalWidth}
          height={totalHeight}
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="shrink-0"
        >
          {/* Column labels (top) */}
          {DOMAIN_KEYS.map((key, col) => (
            <text
              key={`col-${col}`}
              x={labelWidth + col * cellSize + cellSize / 2}
              y={labelHeight - 8}
              textAnchor="middle"
              className="fill-zinc-400 text-[10px]"
            >
              {DOMAIN_LABELS[key] ?? key}
            </text>
          ))}

          {/* Row labels (left) */}
          {DOMAIN_KEYS.map((key, row) => (
            <text
              key={`row-${row}`}
              x={labelWidth - 8}
              y={labelHeight + row * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              className="fill-zinc-400 text-[10px]"
            >
              {DOMAIN_LABELS[key] ?? key}
            </text>
          ))}

          {/* Grid cells — lower triangle + diagonal only */}
          {DOMAIN_KEYS.map((_, row) =>
            DOMAIN_KEYS.map((__, col) => {
              if (col > row) return null; // skip upper triangle
              const x = labelWidth + col * cellSize;
              const y = labelHeight + row * cellSize;
              const isDiag = row === col;
              const isHoveredCell =
                hovered?.row === row && hovered?.col === col;
              const isSelected =
                selected?.row === row && selected?.col === col;

              return (
                <g
                  key={`${row}-${col}`}
                  onMouseEnter={() => setHovered({ row, col })}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleCellClick(row, col)}
                  style={{ cursor: isDiag ? "default" : "pointer" }}
                >
                  {/* Cell background */}
                  <rect
                    x={x + 2}
                    y={y + 2}
                    width={cellSize - 4}
                    height={cellSize - 4}
                    rx={4}
                    fill={isDiag ? "#3f3f46" : scoreToColor(scores[row][col])}
                    stroke={
                      isSelected
                        ? "#10b981"
                        : isHoveredCell && !isDiag
                        ? "#ffffff"
                        : "transparent"
                    }
                    strokeWidth={isSelected || isHoveredCell ? 2 : 0}
                  />

                  {/* Diagonal: show weight */}
                  {isDiag && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 4}
                      textAnchor="middle"
                      className="fill-zinc-400 text-[11px] font-medium"
                    >
                      {domainState[DOMAIN_KEYS[row]].weight}
                    </text>
                  )}

                  {/* Hovered non-diagonal: show score */}
                  {isHoveredCell && !isDiag && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 4}
                      textAnchor="middle"
                      className="fill-white text-[11px] font-semibold"
                    >
                      {scores[row][col].toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })
          )}
        </svg>

        {/* Detail tooltip panel */}
        {selectedDetail && (
          <div className="min-w-[240px] max-w-[320px] rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-zinc-200">
                {DOMAIN_LABELS[DOMAIN_KEYS[selectedDetail.row]]} ×{" "}
                {DOMAIN_LABELS[DOMAIN_KEYS[selectedDetail.col]]}
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-emerald-400">
                {selectedDetail.score.toFixed(3)}
              </span>
            </div>

            {/* Score breakdown */}
            <div className="space-y-1.5 text-zinc-400">
              <div className="flex justify-between">
                <span>Related Domains (40%)</span>
                <span className="font-mono text-zinc-300">
                  {selectedDetail.relatedScore.toFixed(2)}
                  {selectedDetail.mutualRelated && (
                    <span className="ml-1 text-emerald-400">↔</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>タグ重複 Jaccard (30%)</span>
                <span className="font-mono text-zinc-300">
                  {selectedDetail.tagScore.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>テキスト類似度 (30%)</span>
                <span className="font-mono text-zinc-300">
                  {selectedDetail.textScore.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Common tags */}
            {selectedDetail.commonTags.length > 0 && (
              <div className="mt-3">
                <span className="text-zinc-500">共通タグ:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedDetail.commonTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-zinc-700 px-1.5 py-0.5 text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top similar findings */}
            {selectedDetail.topFindings.length > 0 &&
              selectedDetail.topFindings[0].sim > 0 && (
                <div className="mt-3">
                  <span className="text-zinc-500">類似 Findings (上位3件):</span>
                  <div className="mt-1 space-y-2">
                    {selectedDetail.topFindings.map((pair, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-zinc-700 bg-zinc-900/60 p-2"
                      >
                        <div className="flex justify-between text-zinc-500">
                          <span>sim</span>
                          <span className="font-mono text-zinc-400">
                            {pair.sim.toFixed(3)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-zinc-300">
                          {pair.a}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-zinc-400">
                          {pair.b}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <button
              onClick={() => setSelected(null)}
              className="mt-3 text-zinc-500 hover:text-zinc-300"
            >
              閉じる
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3 text-[10px] text-zinc-500">
        <span>低</span>
        <div
          className="h-3 w-24 rounded"
          style={{
            background:
              "linear-gradient(to right, #27272a, #064d40, #10b981)",
          }}
        />
        <span>高</span>
        <span className="ml-4">対角線 = ドメイン比重</span>
      </div>
    </div>
  );
}
