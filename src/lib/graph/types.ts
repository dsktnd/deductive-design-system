import type { ResearchDomain } from "@/lib/types";

export type NodeType = "finding" | "concept" | "keyword";

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
  fullText?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "cross-domain" | "concept-domain" | "similarity";
  weight: number; // 0-1
  color?: string;
}
