"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ResearchDomain,
  type DomainState,
  type ArchitecturalConcept,
} from "@/lib/types";

// --- Constants ---

const DOMAIN_LABELS: Record<string, string> = {
  environment: "環境",
  market: "マーケット",
  culture: "文化・歴史",
  economy: "経済",
  society: "社会",
  technology: "技術",
};

const FINDING_TYPE_COLORS: Record<string, string> = {
  fact: "#60a5fa",       // blue-400
  implication: "#fbbf24", // amber-400
  risk: "#f87171",       // red-400
  opportunity: "#34d399", // emerald-400
};

// Domain colors — 6 distinct hues for each research domain
const DOMAIN_COLORS: Record<string, string> = {
  environment: "#4ade80", // green-400
  market: "#f472b6",      // pink-400
  culture: "#c084fc",     // purple-400
  economy: "#facc15",     // yellow-400
  society: "#38bdf8",     // sky-400
  technology: "#fb923c",  // orange-400
};

// Concept A = cyan/teal, Concept B = rose/orange
const CONCEPT_COLORS = ["#22d3ee", "#fb923c"] as const; // cyan-400, orange-400
const CONCEPT_LABELS = ["A", "B"] as const;

// --- Types ---

type NodeType = "finding" | "concept";

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  r: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed?: boolean;
  // metadata
  domainKey?: ResearchDomain;
  findingStarred?: boolean;
  conceptIndex?: number; // 0=A, 1=B
  fullText?: string; // original finding text for similarity
}

interface GraphEdge {
  source: string;
  target: string;
  type: "cross-domain" | "concept-domain" | "similarity";
  weight: number; // 0-1, used for stroke width/opacity
  color?: string; // concept-colored edges
}

// --- Text similarity (character trigram Jaccard) ---

function trigrams(text: string): Set<string> {
  const s = new Set<string>();
  const clean = text.replace(/\s+/g, "");
  for (let i = 0; i <= clean.length - 3; i++) {
    s.add(clean.slice(i, i + 3));
  }
  return s;
}

function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  return intersection / (ta.size + tb.size - intersection); // Jaccard
}

// --- Build graph data from domain state ---

function buildGraph(
  _theme: string,
  domainState: Record<ResearchDomain, DomainState>,
  concepts: ArchitecturalConcept[]
): { nodes: GraphNode[]; edges: GraphEdge[]; domainConceptMap: Map<string, number[]> } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const domainKeys = Object.values(ResearchDomain);

  // 1. Pre-compute which concepts each domain belongs to
  const domainConceptMap = new Map<string, number[]>();
  for (let ci = 0; ci < concepts.length && ci < 2; ci++) {
    for (const rd of concepts[ci].relatedDomains) {
      // Match case-insensitively to handle API response variations
      const matched = domainKeys.find(
        (dk) => dk.toLowerCase() === rd.toLowerCase()
      );
      if (matched) {
        const existing = domainConceptMap.get(matched) ?? [];
        if (!existing.includes(ci)) existing.push(ci);
        domainConceptMap.set(matched, existing);
      }
    }
  }

  // 2. Concept anchor nodes — A on left, B on right
  const hasConcepts = concepts.length >= 2;
  for (let ci = 0; ci < concepts.length && ci < 2; ci++) {
    const concept = concepts[ci];
    const cId = `concept-${concept.id}`;
    const color = CONCEPT_COLORS[ci] ?? "#a78bfa";
    // Spread A/B apart horizontally
    const x = ci === 0 ? -180 : 180;

    nodes.push({
      id: cId,
      type: "concept",
      label: concept.title,
      r: 26,
      color,
      x,
      y: 0,
      vx: 0,
      vy: 0,
      conceptIndex: ci,
    });
  }

  // 3. Finding nodes — connect directly to concept(s) via parent domain
  let findingIdx = 0;
  for (const key of domainKeys) {
    const ds = domainState[key];
    const findings = ds.findings ?? [];
    // Try exact match first, then case-insensitive
    let cis = domainConceptMap.get(key) ?? [];
    if (cis.length === 0) {
      // Fallback: try case-insensitive matching
      for (const [mapKey, mapVal] of domainConceptMap.entries()) {
        if (mapKey.toLowerCase() === key.toLowerCase()) {
          cis = mapVal;
          break;
        }
      }
    }

    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];
      if (f.excluded) continue;

      const fId = `finding-${key}-${i}`;
      const starred = !!f.starred;
      const r = starred ? 10 : 7;

      // Color by research domain
      const nodeColor = DOMAIN_COLORS[key] ?? "#a1a1aa";

      // Initial position: scatter around the concept(s) they belong to
      let initX = 0;
      let initY = 0;
      if (hasConcepts && cis.length === 1) {
        const side = cis[0] === 0 ? -1 : 1;
        initX = side * (60 + Math.random() * 120);
        initY = (findingIdx % 8 - 4) * 25 + (Math.random() - 0.5) * 30;
      } else if (hasConcepts && cis.length === 2) {
        initX = (Math.random() - 0.5) * 100;
        initY = (findingIdx % 6 - 3) * 30 + (Math.random() - 0.5) * 30;
      } else {
        // No specific concept affiliation — spread evenly
        const angle = (findingIdx / Math.max(findings.length, 6)) * Math.PI * 2;
        const dist = 80 + Math.random() * 60;
        initX = Math.cos(angle) * dist;
        initY = Math.sin(angle) * dist;
      }

      nodes.push({
        id: fId,
        type: "finding",
        label: f.text.length > 24 ? f.text.slice(0, 24) + "…" : f.text,
        r,
        color: nodeColor,
        x: initX,
        y: initY,
        vx: 0,
        vy: 0,
        domainKey: key,
        findingStarred: starred,
        fullText: f.text,
      });

      // Edges: finding → concept(s) it belongs to
      if (hasConcepts && cis.length > 0) {
        for (const ci of cis) {
          const concept = concepts[ci];
          edges.push({
            source: `concept-${concept.id}`,
            target: fId,
            type: "concept-domain",
            weight: starred ? 0.7 : 0.4,
            color: CONCEPT_COLORS[ci],
          });
        }
      } else if (hasConcepts) {
        // No concept affiliation — connect to BOTH concepts with weak edges
        // so the finding stays in the visible area
        for (let ci = 0; ci < concepts.length && ci < 2; ci++) {
          const concept = concepts[ci];
          edges.push({
            source: `concept-${concept.id}`,
            target: fId,
            type: "concept-domain",
            weight: 0.15,
            color: "#52525b", // neutral gray for unaffiliated
          });
        }
      }

      findingIdx++;
    }
  }

  // 4. Similarity edges between findings (text trigram Jaccard)
  const findingNodes = nodes.filter((n) => n.type === "finding" && n.fullText);
  const SIM_THRESHOLD = 0.08; // minimum similarity to draw an edge
  const MAX_SIM_EDGES = 40;   // cap to keep graph readable

  // Compute all pairwise similarities, keep top ones
  const simPairs: { i: number; j: number; sim: number }[] = [];
  for (let i = 0; i < findingNodes.length; i++) {
    for (let j = i + 1; j < findingNodes.length; j++) {
      const sim = similarity(findingNodes[i].fullText!, findingNodes[j].fullText!);
      if (sim >= SIM_THRESHOLD) {
        simPairs.push({ i, j, sim });
      }
    }
  }
  // Sort by similarity descending, take top N
  simPairs.sort((a, b) => b.sim - a.sim);
  for (const pair of simPairs.slice(0, MAX_SIM_EDGES)) {
    edges.push({
      source: findingNodes[pair.i].id,
      target: findingNodes[pair.j].id,
      type: "similarity",
      weight: pair.sim,
    });
  }

  return { nodes, edges, domainConceptMap };
}

// --- Force simulation ---

function simulate(
  nodes: GraphNode[],
  edges: GraphEdge[],
  dragId: string | null
) {
  const alpha = 0.3;
  const repulsion = 3000;
  const springLength = 100;
  const springStrength = 0.005;
  const centerPull = 0.01;
  const damping = 0.85;

  // Center gravity
  for (const n of nodes) {
    if (n.fixed) continue;
    n.vx -= n.x * centerPull;
    n.vy -= n.y * centerPull;
  }

  // Node repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsion / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!a.fixed) { a.vx -= fx; a.vy -= fy; }
      if (!b.fixed) { b.vx += fx; b.vy += fy; }
    }
  }

  // Edge springs
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    if (!s || !t) continue;

    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    // Similarity edges: stronger similarity → shorter rest length, stronger pull
    const restLength = e.type === "similarity"
      ? springLength * (1 - e.weight * 0.6) // high sim → shorter
      : springLength;
    const strength = e.type === "similarity"
      ? springStrength * (1 + e.weight * 3)  // high sim → stronger spring
      : springStrength * (1 + e.weight);
    const displacement = dist - restLength;
    const force = displacement * strength;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (!s.fixed) { s.vx += fx; s.vy += fy; }
    if (!t.fixed) { t.vx -= fx; t.vy -= fy; }
  }

  // Apply velocities
  let totalMovement = 0;
  for (const n of nodes) {
    if (n.fixed || n.id === dragId) continue;
    n.vx *= damping;
    n.vy *= damping;
    n.x += n.vx * alpha;
    n.y += n.vy * alpha;
    totalMovement += Math.abs(n.vx) + Math.abs(n.vy);
  }

  return totalMovement;
}

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
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const domainConceptMapRef = useRef<Map<string, number[]>>(new Map());
  const frameRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const runningRef = useRef(false);

  const [renderTick, setRenderTick] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
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

  // Build graph when data changes
  useEffect(() => {
    const { nodes, edges, domainConceptMap } = buildGraph(theme, domainState, concepts);
    nodesRef.current = nodes;
    edgesRef.current = edges;
    domainConceptMapRef.current = domainConceptMap;
    runningRef.current = true;
    frameCountRef.current = 0;
  }, [theme, domainState, concepts]);

  // Animation loop
  useEffect(() => {
    const tick = () => {
      if (!runningRef.current) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const movement = simulate(nodesRef.current, edgesRef.current, dragId);
      frameCountRef.current++;

      // Throttle React renders to every 2 frames
      if (frameCountRef.current % 2 === 0) {
        setRenderTick((t) => t + 1);
      }

      // Auto-stop when converged
      if (movement < 0.5 && frameCountRef.current > 60) {
        runningRef.current = false;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [dragId]);

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
    []
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
    [dragId, transform.x, transform.y, transform.scale]
  );

  const handlePointerUp = useCallback(() => {
    if (dragId) {
      const node = nodesRef.current.find((n) => n.id === dragId);
      if (node) node.fixed = false;
      setDragId(null);
    }
    isPanningRef.current = false;
  }, [dragId]);

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
    [onOpenDomainDetail]
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
    [domainState]
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
      <div className="flex h-[500px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40">
        <p className="text-sm text-zinc-500">
          グラフに表示するFindingsがありません
        </p>
        <p className="text-xs text-zinc-600">
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
        className="h-[600px] w-full cursor-grab rounded-lg border border-zinc-800 bg-zinc-900"
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
                  {n.label.length > 16 ? n.label.slice(0, 16) + "…" : n.label}
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
          className="pointer-events-none fixed z-50 max-w-xs rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 shadow-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y,
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-[10px] text-zinc-500">
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
        <span className="border-l border-zinc-700 pl-3 flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#22d3ee]" />
          <span className="font-semibold text-[#22d3ee]">A</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#fb923c]" />
          <span className="font-semibold text-[#fb923c]">B</span>
        </span>
        {/* Finding type rings */}
        <span className="border-l border-zinc-700 pl-3 text-zinc-400">Ring:</span>
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
        <span className="border-l border-zinc-700 pl-3 flex items-center gap-1">
          <span className="inline-block h-px w-5 bg-zinc-400" />
          関連性（太=強）
        </span>
      </div>

      {/* Controls hint + stats */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
        <div className="rounded border border-zinc-800 bg-zinc-900/90 px-2.5 py-1.5 text-[10px] text-zinc-600">
          Scroll: zoom / Drag bg: pan / Drag: move / Click: detail
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-[10px] text-zinc-500">
          {findingCount} findings / {nodes.length} nodes / {edges.length} edges
        </div>
      </div>
    </div>
  );
}
