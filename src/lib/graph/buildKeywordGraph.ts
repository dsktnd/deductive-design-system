import { ResearchDomain, type DomainState, type ResearchKeyword } from "@/lib/types";
import { DOMAIN_COLORS } from "@/components/sections/research/constants";
import { similarity } from "./textSimilarity";
import type { GraphNode, GraphEdge } from "./types";

export interface KeywordGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildKeywordGraph(
  domainState: Record<ResearchDomain, DomainState>
): KeywordGraphResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const domainKeys = Object.values(ResearchDomain);

  // Collect all keywords across domains
  for (const key of domainKeys) {
    const ds = domainState[key];
    const keywords = ds.keywords ?? [];

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      const nodeId = `kw-${key}-${i}`;

      // radius: scale relevance (0-100) to a reasonable node size (8-28)
      const r = 8 + (kw.relevance / 100) * 20;

      // Scatter initial positions by domain angle
      const domainIdx = domainKeys.indexOf(key);
      const angle = (domainIdx / domainKeys.length) * Math.PI * 2;
      const dist = 80 + Math.random() * 120;

      nodes.push({
        id: nodeId,
        type: "finding", // reuse type for force layout compatibility
        label: kw.text,
        r,
        color: DOMAIN_COLORS[key] ?? "#a1a1aa",
        x: Math.cos(angle) * dist + (Math.random() - 0.5) * 60,
        y: Math.sin(angle) * dist + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
        domainKey: key,
        fullText: kw.text,
      });
    }
  }

  // Similarity edges between keywords (trigram Jaccard)
  const SIM_THRESHOLD = 0.05;
  const MAX_SIM_EDGES = 60;

  const simPairs: { i: number; j: number; sim: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const sim = similarity(nodes[i].fullText!, nodes[j].fullText!);
      if (sim >= SIM_THRESHOLD) {
        simPairs.push({ i, j, sim });
      }
    }
  }

  simPairs.sort((a, b) => b.sim - a.sim);
  for (const pair of simPairs.slice(0, MAX_SIM_EDGES)) {
    edges.push({
      source: nodes[pair.i].id,
      target: nodes[pair.j].id,
      type: "similarity",
      weight: pair.sim,
    });
  }

  return { nodes, edges };
}
