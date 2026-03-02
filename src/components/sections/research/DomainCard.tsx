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
    <div className={`rounded-lg border bg-zinc-900/60 p-5 ${state.isResearching ? "border-zinc-600 animate-pulse" : "border-zinc-800"}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-zinc-100">{domain.ja}</h3>
          <span className="text-xs text-zinc-500">{domain.en}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onResearchDomain}
            disabled={state.isResearching}
            className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            title="この領域を個別にリサーチ"
          >
            {state.isResearching ? (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-zinc-500 border-t-zinc-200" />
                調査中
              </span>
            ) : (
              "研究する"
            )}
          </button>
          <button
            onClick={onOpenDetail}
            className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
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
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span>{activeCount} findings</span>
            {starredCount > 0 && (
              <span className="text-yellow-500/70">{starredCount} starred</span>
            )}
            {excludedCount > 0 && (
              <span className="text-zinc-600">{excludedCount} excluded</span>
            )}
          </div>
        </div>
      )}

      {/* Notes preview (truncated) */}
      {state.notes && (
        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">
          {state.notes}
        </p>
      )}

      <label className="mb-1 block text-xs font-medium text-zinc-400">
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
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-zinc-300"
        />
        <span className="w-9 text-right font-mono text-sm text-zinc-300">
          {state.weight}
        </span>
      </div>

      <label className="mb-1 block text-xs font-medium text-zinc-400">
        Tags
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {state.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-0.5 text-zinc-500 hover:text-zinc-200"
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
          className="min-w-[80px] flex-1 border-b border-zinc-700 bg-transparent px-1 py-0.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

export default DomainCard;
