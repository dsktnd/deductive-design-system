"use client";

import { useState } from "react";
import { ResearchDomain, type ResearchFinding, type DomainState } from "@/lib/types";
import { DOMAINS, DOMAIN_LABELS, FINDING_CONFIG } from "./constants";

function DomainDetailModal({
  domain,
  state,
  onChange,
  onClose,
  onDeepDive,
  isDeepDiving,
}: {
  domain: (typeof DOMAINS)[number];
  state: DomainState;
  onChange: (key: ResearchDomain, next: DomainState) => void;
  onClose: () => void;
  onDeepDive: (question: string) => void;
  isDeepDiving: boolean;
}) {
  const [tagInput, setTagInput] = useState("");
  const [deepDiveInput, setDeepDiveInput] = useState("");
  const [showDeepDive, setShowDeepDive] = useState(false);

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

  const toggleFindingStar = (findingIndex: number) => {
    if (!state.findings) return;
    const updated = state.findings.map((f, i) =>
      i === findingIndex ? { ...f, starred: !f.starred } : f
    );
    onChange(domain.key, { ...state, findings: updated });
  };

  const toggleFindingExclude = (findingIndex: number) => {
    if (!state.findings) return;
    const updated = state.findings.map((f, i) =>
      i === findingIndex ? { ...f, excluded: !f.excluded } : f
    );
    onChange(domain.key, { ...state, findings: updated });
  };

  const findings = state.findings ?? [];
  const starredFindings = findings.filter((f) => f.starred && !f.excluded);
  const activeFindings = findings.filter((f) => !f.excluded);
  const excludedCount = findings.filter((f) => f.excluded).length;

  // Sort: starred first, then by original order within each group
  const sortedFindings = [...findings].sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return 0;
  });

  const grouped = sortedFindings.reduce<Record<string, { finding: ResearchFinding; originalIndex: number }[]>>((acc, f) => {
    if (!acc[f.type]) acc[f.type] = [];
    const originalIndex = findings.indexOf(f);
    acc[f.type].push({ finding: f, originalIndex });
    return acc;
  }, {});

  const handleDeepDiveSubmit = () => {
    const q = deepDiveInput.trim();
    if (!q) return;
    onDeepDive(q);
    setDeepDiveInput("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h3 className="font-[family-name:var(--font-dm-serif)] text-xl text-slate-100">{domain.ja}</h3>
            <span className="text-sm text-slate-500">{domain.en}</span>
          </div>
          <div className="flex items-center gap-2">
            {findings.length > 0 && (
              <span className="text-[10px] text-slate-500">
                {activeFindings.length} findings{starredFindings.length > 0 && `, ${starredFindings.length} starred`}{excludedCount > 0 && `, ${excludedCount} excluded`}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Key Insights (starred findings pinned to top) */}
        {starredFindings.length > 0 && (
          <div className="mb-5 rounded-lg border border-yellow-700/40 bg-yellow-900/10 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-yellow-400/80">
              Key Insights / 重要な知見
            </h4>
            <ul className="space-y-1.5">
              {starredFindings.map((f, i) => {
                const config = FINDING_CONFIG[f.type];
                return (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${config?.color.replace("text-", "bg-") ?? "bg-slate-400"}`} />
                    <span className="flex-1">{f.text}</span>
                    <span className={`flex-shrink-0 rounded px-1 py-0.5 text-[9px] ${config?.color ?? "text-slate-400"} ${config?.bg ?? "bg-slate-700"}`}>
                      {config?.labelJa ?? f.type}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Findings by category with star/exclude toggles */}
        {findings.length > 0 && (
          <div className="mb-5 space-y-3">
            {(["fact", "implication", "risk", "opportunity"] as const).map((type) => {
              const items = grouped[type];
              if (!items || items.length === 0) return null;
              const config = FINDING_CONFIG[type];
              return (
                <div key={type} className={`rounded-lg border border-slate-700 ${config.bg} p-4`}>
                  <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                    {config.labelJa} ({config.label})
                  </h4>
                  <ul className="space-y-1.5">
                    {items.map(({ finding: f, originalIndex }) => (
                      <li
                        key={originalIndex}
                        className={`group flex items-start gap-2 text-sm ${
                          f.excluded
                            ? "text-slate-500 line-through opacity-50"
                            : f.starred
                            ? "text-slate-100"
                            : "text-slate-300"
                        }`}
                      >
                        <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${config.color.replace("text-", "bg-")}`} />
                        <span className="flex-1">{f.text}</span>
                        <div className="flex flex-shrink-0 items-center gap-1 opacity-40 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => toggleFindingStar(originalIndex)}
                            className={`rounded p-0.5 transition-colors ${
                              f.starred ? "text-yellow-400" : "text-slate-500 hover:text-yellow-400"
                            }`}
                            aria-label={f.starred ? "Unstar" : "Star"}
                            title={f.starred ? "重要マークを外す" : "重要マークを付ける"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={f.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          </button>
                          <button
                            onClick={() => toggleFindingExclude(originalIndex)}
                            className={`rounded p-0.5 transition-colors ${
                              f.excluded ? "text-red-400" : "text-slate-500 hover:text-red-400"
                            }`}
                            aria-label={f.excluded ? "Include" : "Exclude"}
                            title={f.excluded ? "除外を解除" : "この知見を除外"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Deep Dive Section */}
        <div className="mb-5">
          <button
            onClick={() => setShowDeepDive(!showDeepDive)}
            className="flex items-center gap-2 rounded border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            {showDeepDive ? "深掘りを閉じる" : "深掘りリサーチ"}
          </button>
          {showDeepDive && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-700/40 p-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                深掘りの質問
              </label>
              <p className="mb-2 text-[11px] text-slate-500">
                この領域について更に詳しく調べたい観点を入力してください。既存の知見を踏まえて追加リサーチします。
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={deepDiveInput}
                  onChange={(e) => setDeepDiveInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleDeepDiveSubmit();
                    }
                  }}
                  placeholder="e.g. 地域の建築規制について詳しく..."
                  className="flex-1 rounded border border-slate-600 bg-slate-700/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                  disabled={isDeepDiving}
                />
                <button
                  onClick={handleDeepDiveSubmit}
                  disabled={isDeepDiving || !deepDiveInput.trim()}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                >
                  {isDeepDiving ? "調査中..." : "深掘り"}
                </button>
              </div>
              {isDeepDiving && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
                  深掘りリサーチ中...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
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

        {/* Notes */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Notes（自由記述）
          </label>
          <textarea
            value={state.notes}
            onChange={(e) =>
              onChange(domain.key, { ...state, notes: e.target.value })
            }
            rows={6}
            placeholder={`Research notes for ${domain.en}...`}
            className="w-full resize-y rounded border border-slate-600 bg-slate-700/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
          />
        </div>

        {/* Related Domains */}
        {state.relatedDomains && state.relatedDomains.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              関連ドメイン
            </label>
            <div className="flex flex-wrap gap-1.5">
              {state.relatedDomains.map((rd) => (
                <span
                  key={rd}
                  className="rounded-full border border-slate-500 bg-slate-700 px-2.5 py-0.5 text-xs text-slate-300"
                >
                  {DOMAIN_LABELS[rd] ?? rd}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DomainDetailModal;
