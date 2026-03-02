import {
  ResearchDomain,
  type DomainState,
  type ArchitecturalConcept,
} from "@/lib/types";

// --- Constants ---

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

// --- Types ---

export type NodeType = "finding" | "concept";

export interface GraphNode {
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

export interface GraphEdge {
  source: string;
  target: string;
  type: "cross-domain" | "concept-domain" | "similarity";
  weight: number; // 0-1, used for stroke width/opacity
  color?: string; // concept-colored edges
}

export interface BuildGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  domainConceptMap: Map<string, number[]>;
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

export function buildResearchGraph(
  _theme: string,
  domainState: Record<ResearchDomain, DomainState>,
  concepts: ArchitecturalConcept[]
): BuildGraphResult {
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
        label: f.text.length > 24 ? f.text.slice(0, 24) + "\u2026" : f.text,
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
