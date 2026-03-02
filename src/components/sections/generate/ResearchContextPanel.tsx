"use client";

import { useState } from "react";
import type { ResearchCondition } from "@/lib/types";
import { domainLabel } from "./constants";

function ResearchContextPanel({
  conditions,
  researchTheme,
  selectedConcepts,
}: {
  conditions: ResearchCondition[];
  researchTheme: string;
  selectedConcepts: { title: string; description: string; relatedDomains: string[] }[];
}) {
  const [expanded, setExpanded] = useState(false);

  const activeConditions = conditions
    .filter((c) => c.weight > 0 && (c.notes || c.tags.length > 0))
    .sort((a, b) => b.weight - a.weight);

  if (activeConditions.length === 0 && !researchTheme) return null;

  const maxWeight = Math.max(...activeConditions.map((c) => c.weight), 0.01);
  const totalTags = activeConditions.reduce((sum, c) => sum + c.tags.length, 0);
  const hasConcepts = selectedConcepts.length >= 2;

  return (
    <div className="mt-5 rounded-lg border border-zinc-700/60 bg-zinc-900/60">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-800/40"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Research Context
          </span>
          {researchTheme && (
            <span className="truncate text-sm text-zinc-300">{researchTheme}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span>{activeConditions.length} domains</span>
            <span>{totalTags} tags</span>
            {hasConcepts && <span>2 concepts</span>}
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3">
          {/* Condition weight bars */}
          <div className="space-y-2">
            {activeConditions.map((c) => {
              const pct = (c.weight / maxWeight) * 100;
              return (
                <div key={c.domain}>
                  <div className="mb-0.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-300">
                        {domainLabel(c.domain)}
                      </span>
                      {c.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500"
                        >
                          {tag}
                        </span>
                      ))}
                      {c.tags.length > 3 && (
                        <span className="text-[10px] text-zinc-600">+{c.tags.length - 3}</span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {Math.round(c.weight * 100)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-400 transition-all duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {c.notes && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed text-zinc-600">
                      {c.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Concept summary */}
          {hasConcepts && (
            <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3">
              {selectedConcepts.slice(0, 2).map((c, i) => (
                <div key={i} className="flex-1 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase text-zinc-500">
                    Concept {i === 0 ? "A" : "B"}
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-zinc-300">{c.title}</div>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500">{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResearchContextPanel;
