"use client";

import { useState } from "react";
import { ResearchDomain, type DomainState } from "@/lib/types";
import { DOMAINS, FINDING_CONFIG } from "./constants";

function DomainCard({
  domain,
  state,
  onChange,
  onOpenDetail,
  onResearchDomain,
}: {
  domain: (typeof DOMAINS)[number];
  state: DomainState;
  onChange: (key: ResearchDomain, next: DomainState) => void;
  onOpenDetail: () => void;
  onResearchDomain: () => void;
}) {
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !state.tags.includes(trimmed)) {
      onChange(domain.key, { ...state, tags: [...state.tags, trimmed] });
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    onChange(domain.key, {
      ...state,
      tags: state.tags.filter((t) => t !== tag),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const findings = state.findings ?? [];
  const findingCounts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {});
  const starredCount = findings.filter((f) => f.starred).length;
  const excludedCount = findings.filter((f) => f.excluded).length;
  const activeCount = findings.filter((f) => !f.excluded).length;

  return (
    <div className={`rounded-lg border bg-slate-800/60 p-5 shadow-sm transition-all duration-200 hover:border-slate-600 hover:shadow-md ${state.isResearching ? "border-slate-500 animate-pulse" : "border-slate-700"}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-slate-100">{domain.ja}</h3>
          <span className="text-xs text-slate-500">{domain.en}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onResearchDomain}
            disabled={state.isResearching}
            className="rounded border border-slate-600 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            title="この領域を個別にリサーチ"
          >
            {state.isResearching ? (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-slate-500 border-t-slate-200" />
                調査中
              </span>
            ) : (
              "研究する"
            )}
          </button>
          <button
            onClick={onOpenDetail}
            className="rounded border border-slate-600 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
          >
            詳細
          </button>
        </div>
      </div>

      {/* Finding count + coverage indicators */}
      {findings.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {(["fact", "implication", "risk", "opportunity"] as const).map((type) => {
              const count = findingCounts[type];
              if (!count) return null;
              const config = FINDING_CONFIG[type];
              return (
                <span
                  key={type}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${config.color} ${config.bg}`}
                >
                  {config.labelJa} {count}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span>{activeCount} findings</span>
            {starredCount > 0 && (
              <span className="text-yellow-500/70">{starredCount} starred</span>
            )}
            {excludedCount > 0 && (
              <span className="text-slate-500">{excludedCount} excluded</span>
            )}
          </div>
        </div>
      )}

      {/* Notes preview (truncated) */}
      {state.notes && (
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-400">
          {state.notes}
        </p>
      )}

      <label className="mb-1 block text-xs font-medium text-slate-400">
        Weight
      </label>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          value={state.weight}
          onChange={(e) =>
            onChange(domain.key, {
              ...state,
              weight: parseInt(e.target.value, 10),
            })
          }
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-600 accent-blue-500"
        />
        <span className="w-9 text-right font-mono text-sm text-slate-300">
          {state.weight}
        </span>
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-400">
        Tags
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {state.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-slate-600 px-2 py-0.5 text-xs text-slate-300"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-0.5 text-slate-500 hover:text-slate-200"
              aria-label={`Remove tag ${tag}`}
            >
              x
            </button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddTag}
          placeholder="Add tag..."
          className="min-w-[80px] flex-1 border-b border-slate-600 bg-transparent px-1 py-0.5 text-xs text-slate-300 placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
        />
      </div>
    </div>
  );
}

export default DomainCard;
