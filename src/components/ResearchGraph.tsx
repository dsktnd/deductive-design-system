"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  ResearchDomain,
  type DomainState,
  type ArchitecturalConcept,
} from "@/lib/types";
import { buildResearchGraph } from "@/lib/graph/buildResearchGraph";
import { useForceLayout } from "@/lib/graph/useForceLayout";

// --- Constants ---

const DOMAIN_COLORS: Record<string, string> = {
  environment: "#4ade80",
  market: "#f472b6",
  culture: "#c084fc",
  economy: "#facc15",
  society: "#38bdf8",
  technology: "#fb923c",
};

/** Compute convex hull of 2D points (Graham scan) */
function convexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 3) return points;
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: { x: number; y: number }[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: { x: number; y: number }[] = [];
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Expand hull outward by padding */
function expandHull(hull: { x: number; y: number }[], pad: number): { x: number; y: number }[] {
  if (hull.length < 2) return hull;
  // Compute centroid
  let cx = 0, cy = 0;
  for (const p of hull) { cx += p.x; cy += p.y; }
  cx /= hull.length;
  cy /= hull.length;
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: p.x + (dx / dist) * pad, y: p.y + (dy / dist) * pad };
  });
}

const FINDING_TYPE_COLORS: Record<string, string> = {
  fact: "#60a5fa",       // blue-400
  implication: "#fbbf24", // amber-400
  risk: "#f87171",       // red-400
  opportunity: "#34d399", // emerald-400
};

const CONCEPT_LABELS = ["A", "B"] as const;

// --- Component ---

interface ResearchGraphProps {
  theme: string;
  domainState: Record<ResearchDomain, DomainState>;
  concepts: ArchitecturalConcept[];
  onOpenDomainDetail: (domain: ResearchDomain) => void;
}

export default function ResearchGraph({
  theme,
  domainState,
  concepts,
  onOpenDomainDetail,
}: ResearchGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Pan & zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const findingCount = useMemo(() => {
    let count = 0;
    for (const ds of Object.values(domainState)) {
      if (ds.findings) {
        count += ds.findings.filter((f) => !f.excluded).length;
      }
    }
    return count;
  }, [domainState]);

  // Build graph data
  const graphData = useMemo(
    () => buildResearchGraph(theme, domainState, concepts),
    [theme, domainState, concepts]
  );

  // Force layout
  const {
    nodesRef,
    edgesRef,
    renderTick,
    dragId,
    runningRef,
    frameCountRef,
    setDragId,
  } = useForceLayout({ nodes: graphData.nodes, edges: graphData.edges });

  // Hover connections
  const connectedSet = useMemo(() => {
    if (!hoveredNode) return null;
    const set = new Set<string>();
    set.add(hoveredNode);
    for (const e of edgesRef.current) {
      if (e.source === hoveredNode) set.add(e.target);
      if (e.target === hoveredNode) set.add(e.source);
    }
    return set;
  }, [hoveredNode, renderTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag handlers
  const handlePointerDown = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (node) {
        node.fixed = true;
        setDragId(nodeId);
        runningRef.current = true;
        frameCountRef.current = 0;
        (e.target as Element).setPointerCapture(e.pointerId);
      }
    },
    [nodesRef, setDragId, runningRef, frameCountRef]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragId) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const node = nodesRef.current.find((n) => n.id === dragId);
        if (node) {
          node.x = (e.clientX - rect.left - cx - transform.x) / transform.scale;
          node.y = (e.clientY - rect.top - cy - transform.y) / transform.scale;
          runningRef.current = true;
          frameCountRef.current = 0;
        }
      } else if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setTransform((prev) => ({
          ...prev,
          x: panStartRef.current.tx + dx,
          y: panStartRef.current.ty + dy,
        }));
      }
    },
    [dragId, transform.x, transform.y, transform.scale, nodesRef, runningRef, frameCountRef]
  );

  const handlePointerUp = useCallback(() => {
    if (dragId) {
      const node = nodesRef.current.find((n) => n.id === dragId);
      if (node) node.fixed = false;
      setDragId(null);
    }
    isPanningRef.current = false;
  }, [dragId, nodesRef, setDragId]);

  // Pan (background drag)
  const handleBgPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target === svgRef.current || (e.target as Element).classList.contains("graph-bg")) {
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          tx: transform.x,
          ty: transform.y,
        };
      }
    },
    [transform.x, transform.y]
  );

  // Zoom (wheel)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.2, Math.min(3, prev.scale * factor)),
    }));
  }, []);

  // Click handler — clicking a finding opens the detail modal for its parent domain
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (node?.type === "finding" && node.domainKey) {
        onOpenDomainDetail(node.domainKey);
      }
    },
    [onOpenDomainDetail, nodesRef]
  );

  // Hover
  const handleNodeEnter = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      setHoveredNode(nodeId);
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (node) {
        const fullLabel = node.type === "finding"
          ? (domainState[node.domainKey!]?.findings ?? []).find(
              (_, i) => `finding-${node.domainKey}-${i}` === nodeId
            )?.text ?? node.label
          : node.label;

        setTooltip({
          x: e.clientX,
          y: e.clientY - 12,
          text: fullLabel,
        });
      }
    },
    [domainState, nodesRef]
  );

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null);
    setTooltip(null);
  }, []);

  // Render
  const nodes = nodesRef.current;
  const edges = edgesRef.current;
  void renderTick; // consume for reactivity

  if (findingCount === 0) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-800/40">
        <p className="text-sm text-slate-500">
          グラフに表示するFindingsがありません
        </p>
        <p className="text-xs text-slate-500">
          各ドメインカードの「研究する」でFindingsを取得してください
        </p>
      </div>
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        className="h-[600px] w-full cursor-grab rounded-lg border border-slate-700 bg-slate-800"
        style={{ touchAction: "none" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerDown={handleBgPointerDown}
        onWheel={handleWheel}
      >
        <rect
          className="graph-bg"
          width="100%"
          height="100%"
          fill="transparent"
        />
        <g
          transform={`translate(${svgRef.current ? svgRef.current.clientWidth / 2 + transform.x : 400 + transform.x}, ${svgRef.current ? svgRef.current.clientHeight / 2 + transform.y : 300 + transform.y}) scale(${transform.scale})`}
        >
          {/* Domain cluster hulls */}
          {Object.entries(DOMAIN_COLORS).map(([domain, color]) => {
            const domainNodes = nodes.filter(
              (n) => n.type === "finding" && n.domainKey === domain
            );
            if (domainNodes.length < 3) return null;
            const hull = expandHull(
              convexHull(domainNodes.map((n) => ({ x: n.x, y: n.y }))),
              20
            );
            if (hull.length < 3) return null;
            const d =
              "M" +
              hull.map((p) => `${p.x},${p.y}`).join("L") +
              "Z";
            return (
              <path
                key={`hull-${domain}`}
                d={d}
                fill={color}
                fillOpacity={0.04}
                stroke={color}
                strokeOpacity={0.15}
                strokeWidth={1}
                strokeDasharray="4,3"
              />
            );
          })}

          {/* Edges */}
          {edges.map((e, i) => {
            const s = nodeMap.get(e.source);
            const t = nodeMap.get(e.target);
            if (!s || !t) return null;

            const isConnected =
              connectedSet && (connectedSet.has(e.source) && connectedSet.has(e.target));
            const dimmed = connectedSet && !isConnected;

            const isConceptEdge = e.type === "concept-domain";
            const isSimilarity = e.type === "similarity";
            const hasColor = !!e.color;
            const strokeColor = dimmed
              ? "#3f3f46"
              : isSimilarity
              ? (isConnected ? "#e4e4e7" : "#a1a1aa")
              : isConceptEdge && hasColor
              ? e.color!
              : isConnected
              ? "#a1a1aa"
              : "#52525b";
            const strokeWidth = isSimilarity
              ? 0.5 + e.weight * 4   // 0.5-4.5 based on similarity
              : isConceptEdge
              ? 2.5
              : 1;
            const opacity = dimmed
              ? 0.1
              : isSimilarity
              ? 0.15 + e.weight * 0.6 // 0.15-0.75 based on similarity
              : isConceptEdge
              ? 0.5
              : 0.6;

            return (
              <line
                key={`edge-${i}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeOpacity={opacity}
                strokeDasharray={
                  e.type === "similarity" && e.weight < 0.15
                    ? "4,3"
                    : undefined
                }
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const isHovered = hoveredNode === n.id;
            const dimmed = connectedSet && !connectedSet.has(n.id);

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                style={{
                  cursor: "grab",
                  opacity: dimmed ? 0.15 : 1,
                  transition: "opacity 0.15s",
                }}
                onPointerDown={(e) => handlePointerDown(n.id, e)}
                onPointerEnter={(e) => handleNodeEnter(n.id, e)}
                onPointerLeave={handleNodeLeave}
                onClick={() => handleNodeClick(n.id)}
              >
                {/* Finding type indicator ring (fact/risk/etc) */}
                {n.type === "finding" && n.domainKey && (() => {
                  const fIdx = parseInt(n.id.split("-").pop() ?? "0");
                  const fType = (domainState[n.domainKey]?.findings ?? [])[fIdx]?.type;
                  const ringColor = FINDING_TYPE_COLORS[fType] ?? "#52525b";
                  return (
                    <circle
                      r={n.r + 3}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth={1.5}
                      strokeOpacity={0.5}
                    />
                  );
                })()}
                <circle
                  r={n.r}
                  fill={n.color}
                  fillOpacity={n.type === "finding" ? 0.8 : 0.9}
                  stroke={isHovered ? "#ffffff" : "none"}
                  strokeWidth={isHovered ? 2 : 0}
                />
                {/* A/B letter inside concept nodes */}
                {n.type === "concept" && n.conceptIndex != null && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#18181b"
                    fontSize={14}
                    fontWeight={700}
                    pointerEvents="none"
                    style={{ userSelect: "none" }}
                  >
                    {CONCEPT_LABELS[n.conceptIndex] ?? ""}
                  </text>
                )}
                {/* Label */}
                <text
                  y={n.r + 12}
                  textAnchor="middle"
                  fill={n.type === "concept" ? n.color : "#a1a1aa"}
                  fontSize={n.type === "concept" ? 10 : 8}
                  fontWeight={n.type === "concept" ? 600 : 400}
                  pointerEvents="none"
                  style={{ userSelect: "none" }}
                >
                  {n.label.length > 16 ? n.label.slice(0, 16) + "\u2026" : n.label}
                </text>
                {/* Star indicator */}
                {n.findingStarred && (
                  <text
                    y={-n.r - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#facc15"
                    pointerEvents="none"
                  >
                    ★
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-200 shadow-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y,
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded border border-slate-700 bg-slate-800/90 px-3 py-2 text-[10px] text-slate-500">
        {/* Domain colors */}
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
          環境
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f472b6]" />
          マーケット
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#c084fc]" />
          文化
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#facc15]" />
          経済
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#38bdf8]" />
          社会
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#fb923c]" />
          技術
        </span>
        {/* Concept anchors */}
        <span className="border-l border-slate-600 pl-3 flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#22d3ee]" />
          <span className="font-semibold text-[#22d3ee]">A</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#fb923c]" />
          <span className="font-semibold text-[#fb923c]">B</span>
        </span>
        {/* Finding type rings */}
        <span className="border-l border-slate-600 pl-3 text-slate-400">Ring:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border-[1.5px] border-[#60a5fa] bg-transparent" />
          事実
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border-[1.5px] border-[#fbbf24] bg-transparent" />
          示唆
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border-[1.5px] border-[#f87171] bg-transparent" />
          リスク
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border-[1.5px] border-[#34d399] bg-transparent" />
          機会
        </span>
        <span className="flex items-center gap-1">
          <span className="text-yellow-400">★</span> 重要
        </span>
        <span className="border-l border-slate-600 pl-3 flex items-center gap-1">
          <span className="inline-block h-px w-5 bg-slate-400" />
          関連性（太=強）
        </span>
      </div>

      {/* Controls hint + stats */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
        <div className="rounded border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-[10px] text-slate-500">
          Scroll: zoom / Drag bg: pan / Drag: move / Click: detail
        </div>
        <div className="rounded border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-[10px] text-slate-500">
          {findingCount} findings / {nodes.length} nodes / {edges.length} edges
        </div>
      </div>
    </div>
  );
}
