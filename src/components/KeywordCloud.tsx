"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { ResearchDomain, type DomainState, type ResearchKeyword } from "@/lib/types";
import { DOMAIN_COLORS, DOMAIN_LABELS, DOMAINS } from "./sections/research/constants";

/** A keyword merged across domains */
interface MergedKeyword {
  text: string;
  /** All domains this keyword appeared in, ordered by relevance desc */
  domains: ResearchDomain[];
  /** Per-domain keyword entries for tooltip */
  entries: { keyword: ResearchKeyword; domain: ResearchDomain }[];
  /** Max relevance across domains */
  relevance: number;
  /** Primary color (from highest-relevance domain) */
  color: string;
  /** All domain colors for multi-dot display */
  domainColors: string[];
}

interface KeywordNode extends MergedKeyword {
  x: number;
  y: number;
  fontSize: number;
  hw: number;
  hh: number;
}

interface KeywordCloudProps {
  domainState: Record<ResearchDomain, DomainState>;
  positions: Map<string, [number, number]> | null;
  selectedKeywords: Set<string>;
  onToggleKeyword: (text: string) => void;
}

/** Map relevance (0-100) to font size (9-16px) */
function calcFontSize(relevance: number): number {
  return 9 + (relevance / 100) * 7;
}

/** Estimate text width in SVG units (rough heuristic for mixed CJK/Latin) */
function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) > 0x2e80 ? fontSize : fontSize * 0.55;
  }
  return width;
}

/** Simple iterative overlap removal: push overlapping labels apart */
function resolveOverlaps(nodes: KeywordNode[], iterations: number = 20): void {
  const PAD_X = 4;
  const PAD_Y = 2;

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = (a.hw + b.hw + PAD_X) - Math.abs(dx);
        const overlapY = (a.hh + b.hh + PAD_Y) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          moved = true;
          if (overlapX < overlapY) {
            const push = overlapX * 0.5;
            const sign = dx >= 0 ? 1 : -1;
            a.x -= sign * push;
            b.x += sign * push;
          } else {
            const push = overlapY * 0.5;
            const sign = dy >= 0 ? 1 : -1;
            a.y -= sign * push;
            b.y += sign * push;
          }
        }
      }
    }
    if (!moved) break;
  }
}

const SVG_W = 800;
const SVG_H = 600;
const HALF_W = SVG_W / 2;
const HALF_H = SVG_H / 2;
const MARGIN = 40;

export default function KeywordCloud({
  domainState,
  positions,
  selectedKeywords,
  onToggleKeyword,
}: KeywordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    merged: MergedKeyword;
    allFindings: { domain: ResearchDomain; text: string }[];
  } | null>(null);

  // Pan & zoom state
  const [viewBox, setViewBox] = useState({ x: -HALF_W, y: -HALF_H, w: SVG_W, h: SVG_H });
  const panRef = useRef<{ startX: number; startY: number; startVB: typeof viewBox } | null>(null);

  // Merge keywords across domains: deduplicate by text
  const mergedKeywords = useMemo(() => {
    const map = new Map<string, MergedKeyword>();

    for (const key of Object.values(ResearchDomain)) {
      const keywords = domainState[key].keywords ?? [];
      for (const kw of keywords) {
        const existing = map.get(kw.text);
        if (existing) {
          existing.entries.push({ keyword: kw, domain: key });
          if (!existing.domains.includes(key)) {
            existing.domains.push(key);
            existing.domainColors.push(DOMAIN_COLORS[key] ?? "#a1a1aa");
          }
          if (kw.relevance > existing.relevance) {
            existing.relevance = kw.relevance;
            existing.color = DOMAIN_COLORS[key] ?? "#a1a1aa";
            // Re-sort domains so highest relevance is first
            existing.domains.sort((a, b) => {
              const relA = existing.entries
                .filter((e) => e.domain === a)
                .reduce((max, e) => Math.max(max, e.keyword.relevance), 0);
              const relB = existing.entries
                .filter((e) => e.domain === b)
                .reduce((max, e) => Math.max(max, e.keyword.relevance), 0);
              return relB - relA;
            });
            existing.domainColors = existing.domains.map(
              (d) => DOMAIN_COLORS[d] ?? "#a1a1aa"
            );
          }
        } else {
          map.set(kw.text, {
            text: kw.text,
            domains: [key],
            entries: [{ keyword: kw, domain: key }],
            relevance: kw.relevance,
            color: DOMAIN_COLORS[key] ?? "#a1a1aa",
            domainColors: [DOMAIN_COLORS[key] ?? "#a1a1aa"],
          });
        }
      }
    }

    return map;
  }, [domainState]);

  // Compute positioned nodes from embedding positions
  const nodes = useMemo(() => {
    if (!positions || positions.size === 0) return [];

    const result: KeywordNode[] = [];

    for (const [text, merged] of mergedKeywords) {
      const pos = positions.get(text);
      if (!pos) continue;

      const fs = calcFontSize(merged.relevance);
      const tw = estimateTextWidth(text, fs);

      // Center pull: keywords in more domains are pulled toward the origin
      const domainCount = merged.domains.length;
      const centerPull = ((domainCount - 1) / 5) * 0.7;
      const adjustedX = pos[0] * (1 - centerPull);
      const adjustedY = pos[1] * (1 - centerPull);

      result.push({
        ...merged,
        x: adjustedX * (HALF_W - MARGIN),
        y: adjustedY * (HALF_H - MARGIN),
        fontSize: fs,
        hw: tw / 2,
        hh: fs * 0.6,
      });
    }

    resolveOverlaps(result);
    return result;
  }, [positions, mergedKeywords]);

  const totalKeywords = mergedKeywords.size;

  // Mouse handlers for pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const target = e.target as SVGElement;
      if (target.closest("[data-node-id]")) return;

      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startVB: { ...viewBox },
      };
    },
    [viewBox]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (panRef.current) {
        const dx = e.clientX - panRef.current.startX;
        const dy = e.clientY - panRef.current.startY;
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = panRef.current.startVB.w / rect.width;
        const scaleY = panRef.current.startVB.h / rect.height;
        setViewBox({
          ...panRef.current.startVB,
          x: panRef.current.startVB.x - dx * scaleX,
          y: panRef.current.startVB.y - dy * scaleY,
        });
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    panRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
      const my = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;

      const newW = viewBox.w * factor;
      const newH = viewBox.h * factor;
      setViewBox({
        x: mx - (mx - viewBox.x) * factor,
        y: my - (my - viewBox.y) * factor,
        w: newW,
        h: newH,
      });
    },
    [viewBox]
  );

  const handleNodeClick = useCallback(
    (text: string) => {
      onToggleKeyword(text);
    },
    [onToggleKeyword]
  );

  const handleNodeHover = useCallback(
    (node: KeywordNode | null, e?: React.MouseEvent) => {
      setHoveredNode(node?.text ?? null);
      if (!node || !e) {
        setTooltip(null);
        return;
      }

      // Collect all findings across all domains for this keyword
      const allFindings: { domain: ResearchDomain; text: string }[] = [];
      for (const entry of node.entries) {
        const ds = domainState[entry.domain];
        for (const idx of entry.keyword.findingIndices ?? []) {
          const text = ds.findings?.[idx]?.text;
          if (text) allFindings.push({ domain: entry.domain, text });
        }
      }

      setTooltip({
        x: e.clientX,
        y: e.clientY,
        merged: node,
        allFindings,
      });
    },
    [domainState]
  );

  // Suppress tooltip when scrolling
  useEffect(() => {
    const handleScroll = () => setTooltip(null);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (totalKeywords === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60">
        <p className="text-sm text-slate-500">
          リサーチを実行すると、キーワードクラウドが表示されます。
        </p>
      </div>
    );
  }

  // Show loading state while waiting for embeddings
  if (!positions || positions.size === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
          キーワードの意味マップを生成中...
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        {DOMAINS.map((d) => {
          const hasKeywords = (domainState[d.key].keywords ?? []).length > 0;
          if (!hasKeywords) return null;
          return (
            <div key={d.key} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DOMAIN_COLORS[d.key] }}
              />
              {d.ja}
            </div>
          );
        })}
      </div>

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="h-[600px] w-full rounded-lg border border-slate-700 bg-slate-800/60"
        style={{ cursor: panRef.current ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Keyword nodes */}
        {nodes.map((node) => {
          const isSelected = selectedKeywords.has(node.text);
          const isHovered = hoveredNode === node.text;

          return (
            <g
              key={node.text}
              data-node-id={node.text}
              transform={`translate(${node.x}, ${node.y})`}
              style={{ cursor: "pointer" }}
              onClick={() => handleNodeClick(node.text)}
              onMouseEnter={(e) => handleNodeHover(node, e)}
              onMouseLeave={() => handleNodeHover(null)}
            >
              {/* Selection glow background */}
              {isSelected && (
                <rect
                  x={-node.hw}
                  y={-node.hh}
                  width={node.hw * 2}
                  height={node.hh * 2}
                  rx={3}
                  fill={node.color}
                  fillOpacity={0.15}
                  filter="url(#glow)"
                />
              )}

              {/* Text */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={node.fontSize}
                fontWeight={isSelected ? 700 : 500}
                fill={isSelected ? "#ffffff" : node.color}
                opacity={isSelected ? 1 : isHovered ? 0.95 : 0.75}
                style={{
                  transition: "opacity 0.15s",
                  textShadow: isSelected
                    ? `0 0 8px ${node.color}, 0 0 16px ${node.color}40`
                    : "none",
                }}
              >
                {node.text}
              </text>

              {/* Domain indicator dots (show all domains this keyword belongs to) */}
              {node.domainColors.map((c, i) => (
                <circle
                  key={i}
                  cx={node.hw + 4 + i * 5}
                  cy={-node.hh * 0.5}
                  r={2}
                  fill={c}
                  opacity={0.9}
                />
              ))}

              {/* Selection indicator */}
              {isSelected && (
                <circle
                  cx={-(node.hw + 4)}
                  cy={-node.hh * 0.5}
                  r={2.5}
                  fill="#22d3ee"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 shadow-xl"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
          }}
        >
          {/* Domain badges */}
          <div className="flex flex-wrap items-center gap-2">
            {tooltip.merged.domains.map((d) => {
              const entry = tooltip.merged.entries.find((e) => e.domain === d);
              return (
                <span key={d} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: DOMAIN_COLORS[d] }}
                  />
                  <span className="text-xs text-slate-400">
                    {DOMAIN_LABELS[d]}
                    {entry && <span className="text-slate-500"> ({entry.keyword.relevance})</span>}
                  </span>
                </span>
              );
            })}
          </div>
          {tooltip.allFindings.length > 0 && (
            <div className="mt-1.5 space-y-1 border-t border-slate-700 pt-1.5">
              {tooltip.allFindings.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span
                    className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DOMAIN_COLORS[f.domain] }}
                  />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {f.text}
                  </p>
                </div>
              ))}
              {tooltip.allFindings.length > 4 && (
                <p className="text-xs text-slate-500">
                  +{tooltip.allFindings.length - 4} more...
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
