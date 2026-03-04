"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { GraphNode, GraphEdge } from "./buildResearchGraph";

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

  // Domain clustering — same-domain findings attract each other
  const clusterStrength = 0.002;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (
        a.type !== "finding" ||
        b.type !== "finding" ||
        !a.domainKey ||
        a.domainKey !== b.domainKey
      )
        continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 40) * clusterStrength; // rest distance 40px within cluster
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!a.fixed) { a.vx += fx; a.vy += fy; }
      if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
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

// --- Hook ---

export interface UseForceLayoutInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface UseForceLayoutResult {
  nodesRef: React.RefObject<GraphNode[]>;
  edgesRef: React.RefObject<GraphEdge[]>;
  renderTick: number;
  dragId: string | null;
  runningRef: React.RefObject<boolean>;
  frameCountRef: React.RefObject<number>;
  setDragId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useForceLayout({
  nodes,
  edges,
}: UseForceLayoutInput): UseForceLayoutResult {
  const nodesRef = useRef<GraphNode[]>(nodes);
  const edgesRef = useRef<GraphEdge[]>(edges);
  const frameRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const runningRef = useRef(false);

  const [renderTick, setRenderTick] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);

  // Update refs when input data changes
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    runningRef.current = true;
    frameCountRef.current = 0;
  }, [nodes, edges]);

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

  return {
    nodesRef,
    edgesRef,
    renderTick,
    dragId,
    runningRef,
    frameCountRef,
    setDragId,
  };
}
