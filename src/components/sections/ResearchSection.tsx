"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ResearchDomain, type ResearchCondition, type ResearchFinding, type ResearchJob, type ArchitecturalConcept, type ArchitectureConfig } from "@/lib/types";
import { useAppState } from "@/lib/store";

const DOMAINS: { key: ResearchDomain; ja: string; en: string }[] = [
  { key: ResearchDomain.Environment, ja: "環境", en: "Environment" },
  { key: ResearchDomain.Market, ja: "マーケット", en: "Market" },
  { key: ResearchDomain.Culture, ja: "文化・歴史", en: "Culture / History" },
  { key: ResearchDomain.Economy, ja: "経済", en: "Economy" },
  { key: ResearchDomain.Society, ja: "社会", en: "Society" },
  { key: ResearchDomain.Technology, ja: "技術", en: "Technology" },
];

const DOMAIN_LABELS: Record<string, string> = {
  environment: "環境",
  market: "マーケット",
  culture: "文化・歴史",
  economy: "経済",
  society: "社会",
  technology: "技術",
};

const FINDING_CONFIG: Record<string, { label: string; labelJa: string; color: string; bg: string }> = {
  fact: { label: "Facts", labelJa: "事実", color: "text-blue-400", bg: "bg-blue-400/10" },
  implication: { label: "Implications", labelJa: "示唆", color: "text-amber-400", bg: "bg-amber-400/10" },
  risk: { label: "Risks", labelJa: "リスク", color: "text-red-400", bg: "bg-red-400/10" },
  opportunity: { label: "Opportunities", labelJa: "機会", color: "text-emerald-400", bg: "bg-emerald-400/10" },
};

interface DomainState {
  notes: string;
  weight: number;
  tags: string[];
  findings?: ResearchFinding[];
  weightRationale?: string;
  relatedDomains?: ResearchDomain[];
  isResearching?: boolean;
}

function createInitialState(): Record<ResearchDomain, DomainState> {
  const state = {} as Record<ResearchDomain, DomainState>;
  for (const d of DOMAINS) {
    state[d.key] = { notes: "", weight: 50, tags: [] };
  }
  return state;
}

function conditionsToState(conditions: ResearchCondition[]): Record<ResearchDomain, DomainState> {
  const state = createInitialState();
  for (const c of conditions) {
    if (state[c.domain as ResearchDomain]) {
      state[c.domain as ResearchDomain] = {
        notes: c.notes,
        weight: Math.round(c.weight * 100),
        tags: c.tags,
        findings: c.findings,
        weightRationale: c.weightRationale,
        relatedDomains: c.relatedDomains,
      };
    }
  }
  return state;
}

// --- Domain Detail Modal ---

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
      <div className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-semibold text-zinc-100">{domain.ja}</h3>
            <span className="text-sm text-zinc-500">{domain.en}</span>
          </div>
          <div className="flex items-center gap-2">
            {findings.length > 0 && (
              <span className="text-[10px] text-zinc-500">
                {activeFindings.length} findings{starredFindings.length > 0 && `, ${starredFindings.length} starred`}{excludedCount > 0 && `, ${excludedCount} excluded`}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
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
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                    <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${config?.color.replace("text-", "bg-") ?? "bg-zinc-400"}`} />
                    <span className="flex-1">{f.text}</span>
                    <span className={`flex-shrink-0 rounded px-1 py-0.5 text-[9px] ${config?.color ?? "text-zinc-400"} ${config?.bg ?? "bg-zinc-800"}`}>
                      {config?.labelJa ?? f.type}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Weight + Rationale */}
        <div className="mb-5 rounded-lg border border-zinc-800 bg-zinc-800/40 p-4">
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Weight
          </label>
          <div className="mb-2 flex items-center gap-3">
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
          {state.weightRationale && (
            <p className="text-xs leading-relaxed text-zinc-500">
              理由: {state.weightRationale}
            </p>
          )}
        </div>

        {/* Findings by category with star/exclude toggles */}
        {findings.length > 0 && (
          <div className="mb-5 space-y-3">
            {(["fact", "implication", "risk", "opportunity"] as const).map((type) => {
              const items = grouped[type];
              if (!items || items.length === 0) return null;
              const config = FINDING_CONFIG[type];
              return (
                <div key={type} className={`rounded-lg border border-zinc-800 ${config.bg} p-4`}>
                  <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                    {config.labelJa} ({config.label})
                  </h4>
                  <ul className="space-y-1.5">
                    {items.map(({ finding: f, originalIndex }) => (
                      <li
                        key={originalIndex}
                        className={`group flex items-start gap-2 text-sm ${
                          f.excluded
                            ? "text-zinc-600 line-through opacity-50"
                            : f.starred
                            ? "text-zinc-100"
                            : "text-zinc-300"
                        }`}
                      >
                        <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${config.color.replace("text-", "bg-")}`} />
                        <span className="flex-1">{f.text}</span>
                        <div className="flex flex-shrink-0 items-center gap-1 opacity-40 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => toggleFindingStar(originalIndex)}
                            className={`rounded p-0.5 transition-colors ${
                              f.starred ? "text-yellow-400" : "text-zinc-500 hover:text-yellow-400"
                            }`}
                            aria-label={f.starred ? "Unstar" : "Star"}
                            title={f.starred ? "重要マークを外す" : "重要マークを付ける"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={f.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          </button>
                          <button
                            onClick={() => toggleFindingExclude(originalIndex)}
                            className={`rounded p-0.5 transition-colors ${
                              f.excluded ? "text-red-400" : "text-zinc-500 hover:text-red-400"
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
            className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            {showDeepDive ? "深掘りを閉じる" : "深掘りリサーチ"}
          </button>
          {showDeepDive && (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-800/40 p-4">
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                深掘りの質問
              </label>
              <p className="mb-2 text-[11px] text-zinc-500">
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
                  className="flex-1 rounded border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                  disabled={isDeepDiving}
                />
                <button
                  onClick={handleDeepDiveSubmit}
                  disabled={isDeepDiving || !deepDiveInput.trim()}
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {isDeepDiving ? "調査中..." : "深掘り"}
                </button>
              </div>
              {isDeepDiving && (
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                  深掘りリサーチ中...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
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

        {/* Notes */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Notes（自由記述）
          </label>
          <textarea
            value={state.notes}
            onChange={(e) =>
              onChange(domain.key, { ...state, notes: e.target.value })
            }
            rows={6}
            placeholder={`Research notes for ${domain.en}...`}
            className="w-full resize-y rounded border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        {/* Related Domains */}
        {state.relatedDomains && state.relatedDomains.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              関連ドメイン
            </label>
            <div className="flex flex-wrap gap-1.5">
              {state.relatedDomains.map((rd) => (
                <span
                  key={rd}
                  className="rounded-full border border-zinc-600 bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300"
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

// --- Domain Card ---

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

// --- Summary Panel ---

function SummaryPanel({
  domains,
  state,
}: {
  domains: typeof DOMAINS;
  state: Record<ResearchDomain, DomainState>;
}) {
  const active = domains.filter(
    (d) => state[d.key].weight > 0 && (state[d.key].notes || state[d.key].tags.length > 0)
  );

  if (active.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-600">
        Add notes or tags to domains to see a summary here.
      </div>
    );
  }

  const maxWeight = Math.max(...active.map((d) => state[d.key].weight), 1);

  return (
    <div className="space-y-3">
      {active
        .sort((a, b) => state[b.key].weight - state[a.key].weight)
        .map((d) => {
          const s = state[d.key];
          const pct = (s.weight / maxWeight) * 100;
          return (
            <div key={d.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-medium text-zinc-300">
                  {d.ja}
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  {s.weight}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-400 transition-all duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {s.relatedDomains && s.relatedDomains.length > 0 && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                  <span>→</span>
                  {s.relatedDomains.map((rd) => (
                    <span key={rd}>{DOMAIN_LABELS[rd] ?? rd}</span>
                  )).reduce<React.ReactNode[]>((acc, el, i) => {
                    if (i > 0) acc.push(<span key={`sep-${i}`}>,</span>);
                    acc.push(el);
                    return acc;
                  }, [])}
                </div>
              )}
              {s.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

// --- Job History ---

function JobHistory({
  jobs,
  onLoad,
}: {
  jobs: ResearchJob[];
  onLoad: (jobId: string) => void;
}) {
  if (jobs.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Research History
      </h4>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {[...jobs].reverse().map((job) => (
          <button
            key={job.id}
            onClick={() => onLoad(job.id)}
            className="w-full rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800/60"
          >
            <div className="truncate text-sm text-zinc-300">{job.theme}</div>
            <div className="mt-0.5 text-[10px] text-zinc-600">
              {new Date(job.timestamp).toLocaleString()} -- {job.conditions.length} domains
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Concept Comparison Panel ---

function ConceptComparisonPanel({
  concepts,
  onChangeA,
  onChangeB,
}: {
  concepts: ArchitecturalConcept[];
  onChangeA: (updated: ArchitecturalConcept) => void;
  onChangeB: (updated: ArchitecturalConcept) => void;
}) {
  const a = concepts[0];
  const b = concepts[1];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/60">
      <div className="border-b border-zinc-700 bg-zinc-800/40 px-4 py-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Concept Comparison
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="w-[120px] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500" />
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Concept A
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Concept B
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-800/60">
              <td className="px-4 py-2 text-xs font-medium text-zinc-500">Title</td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={a.title}
                  onChange={(e) => onChangeA({ ...a, title: e.target.value })}
                  className="w-full rounded border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-sm font-semibold text-zinc-100 focus:border-zinc-500 focus:outline-none"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={b.title}
                  onChange={(e) => onChangeB({ ...b, title: e.target.value })}
                  className="w-full rounded border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-sm font-semibold text-zinc-100 focus:border-zinc-500 focus:outline-none"
                />
              </td>
            </tr>
            <tr className="border-b border-zinc-800/60">
              <td className="px-4 py-2 align-top text-xs font-medium text-zinc-500">Description</td>
              <td className="px-4 py-2">
                <textarea
                  value={a.description}
                  onChange={(e) => onChangeA({ ...a, description: e.target.value })}
                  rows={3}
                  className="w-full resize-y rounded border border-zinc-700 bg-zinc-800/80 px-2.5 py-2 text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                />
              </td>
              <td className="px-4 py-2">
                <textarea
                  value={b.description}
                  onChange={(e) => onChangeB({ ...b, description: e.target.value })}
                  rows={3}
                  className="w-full resize-y rounded border border-zinc-700 bg-zinc-800/80 px-2.5 py-2 text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
                />
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-xs font-medium text-zinc-500">Domains</td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1">
                  {a.relatedDomains.map((d) => (
                    <span key={d} className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      {DOMAIN_LABELS[d] ?? d}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1">
                  {b.relatedDomains.map((d) => (
                    <span key={d} className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      {DOMAIN_LABELS[d] ?? d}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Config Summary Display ---

const CONFIG_AXES: {
  key: string;
  label: string;
  labelJa: string;
  getValue: (c: ArchitectureConfig) => string | null;
}[] = [
  { key: "boundary", label: "Boundary", labelJa: "境界", getValue: (c) => c.boundary?.strategy ?? null },
  { key: "spatial", label: "Spatial", labelJa: "空間構造", getValue: (c) => c.spatial?.topology ?? null },
  { key: "ground", label: "Ground", labelJa: "大地", getValue: (c) => c.ground?.relation ?? null },
  { key: "light", label: "Light", labelJa: "光", getValue: (c) => c.light?.source_strategy ?? null },
  { key: "movement", label: "Movement", labelJa: "動線", getValue: (c) => c.movement?.path_topology?.type ?? null },
  { key: "scale", label: "Scale", labelJa: "スケール", getValue: (c) => c.scale?.human_relation ?? null },
  { key: "social", label: "Social Gradient", labelJa: "公私", getValue: (c) => c.social_gradient?.type ?? null },
  { key: "tectonic", label: "Tectonic", labelJa: "構造", getValue: (c) => c.tectonic?.expression ?? null },
  { key: "material", label: "Material", labelJa: "素材", getValue: (c) => c.material?.weight_impression ?? null },
  { key: "color", label: "Color", labelJa: "色彩", getValue: (c) => c.color?.presence ?? null },
  { key: "section", label: "Section", labelJa: "断面", getValue: (c) => c.section?.dominant_profile ?? null },
  { key: "facade", label: "Facade/Interior", labelJa: "外内関係", getValue: (c) => c.facade_interior_relationship?.type ?? null },
];

function ConfigComparisonTable({
  configA,
  configB,
}: {
  configA: ArchitectureConfig;
  configB: ArchitectureConfig;
}) {
  const rows = CONFIG_AXES.map((axis) => {
    const valA = axis.getValue(configA);
    const valB = axis.getValue(configB);
    const same = valA != null && valB != null && valA === valB;
    return { ...axis, valA, valB, same };
  }).filter((r) => r.valA != null || r.valB != null);

  const matchCount = rows.filter((r) => r.same).length;
  const diffCount = rows.filter((r) => !r.same).length;
  const total = rows.length;

  const confA = configA.meta?.confidence != null ? Math.round(configA.meta.confidence * 100) : null;
  const confB = configB.meta?.confidence != null ? Math.round(configB.meta.confidence * 100) : null;

  const materialsA = configA.material?.primary ?? [];
  const materialsB = configB.material?.primary ?? [];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800/40 px-4 py-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Architecture Config Comparison
        </h4>
        {(confA != null || confB != null) && (
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span>Confidence:</span>
            {confA != null && (
              <span>
                A <span className="font-mono text-zinc-400">{confA}%</span>
              </span>
            )}
            {confB != null && (
              <span>
                B <span className="font-mono text-zinc-400">{confB}%</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="w-[100px] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                軸
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Concept A
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Concept B
              </th>
              <th className="w-[60px] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                比較
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={`border-b border-zinc-800/60 ${
                  row.same
                    ? "bg-transparent"
                    : "bg-amber-500/[0.04]"
                }`}
              >
                <td className="px-4 py-1.5 text-xs font-medium text-zinc-500">
                  {row.labelJa}
                </td>
                <td className="px-4 py-1.5">
                  <span className={`text-xs font-medium ${row.same ? "text-zinc-500" : "text-zinc-200"}`}>
                    {row.valA ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-1.5">
                  <span className={`text-xs font-medium ${row.same ? "text-zinc-500" : "text-zinc-200"}`}>
                    {row.valB ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-1.5 text-center">
                  {row.same ? (
                    <span className="text-[10px] text-zinc-600">= 同</span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-400/80">≠ 異</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Materials (array, separate display) */}
      {(materialsA.length > 0 || materialsB.length > 0) && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            素材
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500">A:</span>
              {materialsA.map((m) => (
                <span key={m} className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">
                  {m}
                </span>
              ))}
              {materialsA.length === 0 && <span className="text-[10px] text-zinc-600">—</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500">B:</span>
              {materialsB.map((m) => (
                <span key={m} className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">
                  {m}
                </span>
              ))}
              {materialsB.length === 0 && <span className="text-[10px] text-zinc-600">—</span>}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="border-t border-zinc-800 bg-zinc-800/30 px-4 py-2.5">
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-zinc-500">
            一致: <span className="font-mono font-medium text-zinc-400">{matchCount}/{total}軸</span>
          </span>
          <span className="text-zinc-500">
            差異: <span className="font-mono font-medium text-amber-400/80">{diffCount}/{total}軸</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Concept Blend Panel ---

interface BlendKeyword {
  axis: string;
  labelJa: string;
  valueA: string | null;
  valueB: string | null;
  blended: string | null;
}

function ConceptBlendPanel({
  configA,
  configB,
  theme,
}: {
  configA: ArchitectureConfig;
  configB: ArchitectureConfig;
  theme: string;
}) {
  const [ratio, setRatio] = useState(50);
  const [keywords, setKeywords] = useState<BlendKeyword[]>([]);
  const [summary, setSummary] = useState<string[]>([]);
  const [isBlending, setIsBlending] = useState(false);
  const [blendError, setBlendError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBlend = useCallback(
    async (r: number) => {
      setIsBlending(true);
      setBlendError(null);
      try {
        const res = await fetch("/api/architecture/blend-keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            configA,
            configB,
            ratios: [r],
            theme,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        const data = await res.json();
        const first = data.results?.[0];
        setKeywords(first?.keywords ?? []);
        setSummary(first?.summary ?? []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Blend failed";
        setBlendError(message);
      } finally {
        setIsBlending(false);
      }
    },
    [configA, configB, theme]
  );

  const handleRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setRatio(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchBlend(val), 500);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/60">
      <div className="border-b border-zinc-700 bg-zinc-800/40 px-4 py-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Concept Blend / コンセプトブレンド
        </h4>
      </div>

      <div className="px-4 py-4">
        {/* Slider */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-zinc-400">
            <span>A</span>
            <span>B</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={ratio}
            onChange={handleRatioChange}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-zinc-300"
          />
          <div className="mt-1 text-center font-mono text-sm text-zinc-300">
            {ratio}%
          </div>
        </div>

        {/* Loading */}
        {isBlending && (
          <div className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
            ブレンドキーワードを生成中...
          </div>
        )}

        {blendError && (
          <p className="mb-3 text-sm text-red-400">{blendError}</p>
        )}

        {/* Keyword results */}
        {keywords.length > 0 && !isBlending && (
          <div className="space-y-1.5">
            {keywords.map((kw) => (
              <div
                key={kw.axis}
                className="flex items-center gap-3 rounded border border-zinc-800/60 bg-zinc-800/30 px-3 py-1.5"
              >
                <span className="w-[72px] flex-shrink-0 text-xs font-medium text-zinc-500">
                  {kw.labelJa}
                </span>
                <span className="text-[10px] text-zinc-600">{kw.valueA ?? "—"}</span>
                <span className="text-[10px] text-zinc-700">→</span>
                {kw.blended ? (
                  <span className="rounded-full bg-zinc-600/50 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                    {kw.blended}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-600">—</span>
                )}
                <span className="text-[10px] text-zinc-700">←</span>
                <span className="text-[10px] text-zinc-600">{kw.valueB ?? "—"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Summary keywords */}
        {summary.length > 0 && !isBlending && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
            {summary.map((s, i) => (
              <span
                key={i}
                className="rounded-full bg-zinc-200/10 px-3 py-1 text-xs font-medium text-zinc-200"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Section ---

export default function ResearchSection() {
  const [domainState, setDomainState] = useState(createInitialState);
  const [theme, setTheme] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<ResearchDomain | null>(null);
  const {
    conditions,
    updateConditions,
    researchTheme,
    setResearchTheme,
    researchJobs,
    addResearchJob,
    loadResearchJob,
    selectedConcepts,
    setSelectedConcepts,
  } = useAppState();

  const [concepts, setConcepts] = useState<ArchitecturalConcept[]>([]);
  const [isProposingConcepts, setIsProposingConcepts] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [weightsChangedSinceConcept, setWeightsChangedSinceConcept] = useState(false);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const [hasRestored, setHasRestored] = useState(false);
  if (!hasRestored && conditions.length > 0) {
    setDomainState(conditionsToState(conditions));
    if (selectedConcepts.length >= 2) {
      setConcepts(selectedConcepts);
    }
    if (researchTheme) {
      setTheme(researchTheme);
    }
    setHasRestored(true);
  }

  const handleChange = useCallback(
    (key: ResearchDomain, next: DomainState) => {
      setDomainState((prev) => ({ ...prev, [key]: next }));
      if (concepts.length >= 2) {
        setWeightsChangedSinceConcept(true);
      }
    },
    [concepts.length]
  );

  const handleLoadJob = useCallback(
    (jobId: string) => {
      const job = researchJobs.find((j) => j.id === jobId);
      if (job) {
        setTheme(job.theme);
        setDomainState(conditionsToState(job.conditions));
        loadResearchJob(jobId);
      }
    },
    [researchJobs, loadResearchJob]
  );

  const handleResearch = async () => {
    if (!theme.trim()) return;
    setIsResearching(true);
    setResearchError(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: theme.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const domains = data.domains;

      if (domains) {
        const newState = { ...domainState };
        for (const d of DOMAINS) {
          const result = domains[d.key];
          if (result) {
            newState[d.key] = {
              notes: result.notes || "",
              weight: typeof result.weight === "number" ? result.weight : 50,
              tags: Array.isArray(result.tags) ? result.tags : [],
              findings: Array.isArray(result.findings) ? result.findings : undefined,
              weightRationale: typeof result.weight_rationale === "string" ? result.weight_rationale : undefined,
              relatedDomains: Array.isArray(result.related_domains) ? result.related_domains : undefined,
            };
          }
        }
        setDomainState(newState);

        const jobConditions: ResearchCondition[] = DOMAINS.map((d) => ({
          domain: d.key,
          notes: newState[d.key].notes,
          weight: newState[d.key].weight / 100,
          tags: newState[d.key].tags,
          findings: newState[d.key].findings,
          weightRationale: newState[d.key].weightRationale,
          relatedDomains: newState[d.key].relatedDomains,
        }));

        const job: ResearchJob = {
          id: `research-${Date.now()}`,
          theme: theme.trim(),
          conditions: jobConditions,
          timestamp: new Date().toISOString(),
        };
        addResearchJob(job);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Research failed";
      setResearchError(message);
    } finally {
      setIsResearching(false);
    }
  };

  const handleProposeConcepts = async () => {
    setIsProposingConcepts(true);
    setConceptError(null);

    const currentConditions: ResearchCondition[] = DOMAINS.map((d) => ({
      domain: d.key,
      notes: domainState[d.key].notes,
      weight: domainState[d.key].weight / 100,
      tags: domainState[d.key].tags,
      findings: domainState[d.key].findings,
      weightRationale: domainState[d.key].weightRationale,
      relatedDomains: domainState[d.key].relatedDomains,
    }));

    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: theme.trim(), conditions: currentConditions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      if (data.concepts && data.concepts.length >= 2) {
        const proposed = data.concepts.slice(0, 2);
        setConcepts(proposed);
        setSelectedConcepts(proposed);
        setWeightsChangedSinceConcept(false);
      } else {
        throw new Error("Expected 2 concepts from API");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Concept proposal failed";
      setConceptError(message);
    } finally {
      setIsProposingConcepts(false);
    }
  };

  const handleTranslateToConfig = async () => {
    if (concepts.length < 2) return;

    setIsTranslating(true);
    setTranslateError(null);

    const currentConditions: ResearchCondition[] = DOMAINS.map((d) => ({
      domain: d.key,
      notes: domainState[d.key].notes,
      weight: domainState[d.key].weight / 100,
      tags: domainState[d.key].tags,
      findings: domainState[d.key].findings,
      weightRationale: domainState[d.key].weightRationale,
      relatedDomains: domainState[d.key].relatedDomains,
    }));

    try {
      const results = await Promise.all(
        concepts.slice(0, 2).map(async (concept) => {
          const res = await fetch("/api/architecture/from-concept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concept,
              conditions: currentConditions,
              theme: theme.trim(),
            }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || `Request failed (${res.status})`);
          }

          const data = await res.json();
          return data.config as ArchitectureConfig;
        })
      );

      const updated = concepts.map((c, i) => ({
        ...c,
        architectureConfig: i < results.length ? results[i] : c.architectureConfig,
      }));
      setConcepts(updated);
      setSelectedConcepts(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Translation failed";
      setTranslateError(message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleResearchDomain = async (domainKey: ResearchDomain) => {
    if (!theme.trim()) return;

    setDomainState((prev) => ({
      ...prev,
      [domainKey]: { ...prev[domainKey], isResearching: true },
    }));

    try {
      const res = await fetch("/api/research/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: theme.trim(),
          domain: domainKey,
          existingFindings: domainState[domainKey].findings,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const result = await res.json();

      setDomainState((prev) => ({
        ...prev,
        [domainKey]: {
          ...prev[domainKey],
          notes: result.notes || prev[domainKey].notes,
          weight: typeof result.weight === "number" ? result.weight : prev[domainKey].weight,
          tags: Array.isArray(result.tags) ? result.tags : prev[domainKey].tags,
          findings: Array.isArray(result.findings) ? result.findings : prev[domainKey].findings,
          weightRationale: typeof result.weight_rationale === "string" ? result.weight_rationale : prev[domainKey].weightRationale,
          relatedDomains: Array.isArray(result.related_domains) ? result.related_domains : prev[domainKey].relatedDomains,
          isResearching: false,
        },
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Domain research failed";
      setResearchError(message);
      setDomainState((prev) => ({
        ...prev,
        [domainKey]: { ...prev[domainKey], isResearching: false },
      }));
    }
  };

  const handleDeepDive = async (domainKey: ResearchDomain, question: string) => {
    if (!theme.trim() || !question.trim()) return;

    setDomainState((prev) => ({
      ...prev,
      [domainKey]: { ...prev[domainKey], isResearching: true },
    }));

    try {
      const res = await fetch("/api/research/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: theme.trim(),
          domain: domainKey,
          existingFindings: domainState[domainKey].findings,
          deepDiveQuestion: question.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const result = await res.json();
      const newFindings: ResearchFinding[] = Array.isArray(result.findings) ? result.findings : [];
      const existingFindings = domainState[domainKey].findings ?? [];

      setDomainState((prev) => ({
        ...prev,
        [domainKey]: {
          ...prev[domainKey],
          findings: [...existingFindings, ...newFindings],
          isResearching: false,
        },
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deep dive failed";
      setResearchError(message);
      setDomainState((prev) => ({
        ...prev,
        [domainKey]: { ...prev[domainKey], isResearching: false },
      }));
    }
  };

  const handleProceed = () => {
    const jobConditions: ResearchCondition[] = DOMAINS.filter(
      (d) =>
        domainState[d.key].notes ||
        domainState[d.key].tags.length > 0 ||
        domainState[d.key].weight > 0
    ).map((d) => ({
      domain: d.key,
      notes: domainState[d.key].notes,
      weight: domainState[d.key].weight / 100,
      tags: domainState[d.key].tags,
      findings: domainState[d.key].findings,
      weightRationale: domainState[d.key].weightRationale,
      relatedDomains: domainState[d.key].relatedDomains,
    }));

    updateConditions(jobConditions);
    setResearchTheme(theme.trim());
    if (concepts.length >= 2) {
      setSelectedConcepts(concepts);
    }
    document.getElementById("generate")?.scrollIntoView({ behavior: "smooth" });
  };

  const activeCount = DOMAINS.filter(
    (d) =>
      domainState[d.key].weight > 0 &&
      (domainState[d.key].notes || domainState[d.key].tags.length > 0)
  ).length;

  const modalDomain = detailModal ? DOMAINS.find((d) => d.key === detailModal) : null;

  return (
    <div>
      {/* Detail Modal */}
      {detailModal && modalDomain && (
        <DomainDetailModal
          domain={modalDomain}
          state={domainState[detailModal]}
          onChange={handleChange}
          onClose={() => setDetailModal(null)}
          onDeepDive={(question) => handleDeepDive(detailModal, question)}
          isDeepDiving={domainState[detailModal].isResearching ?? false}
        />
      )}

      <h2 className="text-lg font-semibold text-zinc-100">
        Research / リサーチ
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        テーマを入力すると、AIが6つの領域から多角的にリサーチを行います。
      </p>

      <div className="mt-5 rounded-lg border border-zinc-700 bg-zinc-900/80 p-5">
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Theme
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleResearch();
              }
            }}
            placeholder="e.g. 東京都心の木造3階建て住宅、環境配慮型オフィスビル..."
            className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none"
          />
          <button
            onClick={handleResearch}
            disabled={isResearching || !theme.trim()}
            className="rounded-lg bg-zinc-200 px-6 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            {isResearching ? "Researching..." : "Research"}
          </button>
        </div>
        {isResearching && (
          <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
            6つの領域を分析中...
          </div>
        )}
        {researchError && (
          <p className="mt-3 text-sm text-red-400">{researchError}</p>
        )}
      </div>

      {/* Domain Cards + Summary */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {DOMAINS.map((d) => (
            <DomainCard
              key={d.key}
              domain={d}
              state={domainState[d.key]}
              onChange={handleChange}
              onOpenDetail={() => setDetailModal(d.key)}
              onResearchDomain={() => handleResearchDomain(d.key)}
            />
          ))}
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Condition Summary
          </h3>
          <SummaryPanel domains={DOMAINS} state={domainState} />

          <JobHistory jobs={researchJobs} onLoad={handleLoadJob} />
        </aside>
      </div>

      {/* Concept Proposal Section */}
      {activeCount > 0 && (
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Architectural Concepts / コンセプト方向性
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                リサーチ結果と各領域の比重から、2つの対照的な建築コンセプトを提案します。
              </p>
            </div>
            <button
              onClick={handleProposeConcepts}
              disabled={isProposingConcepts || !theme.trim()}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 ${
                weightsChangedSinceConcept
                  ? "bg-zinc-200 text-zinc-900 hover:bg-white"
                  : "bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
              }`}
            >
              {isProposingConcepts ? "Proposing..." : concepts.length >= 2 ? "コンセプトを再提案" : "コンセプトを提案"}
            </button>
          </div>

          {weightsChangedSinceConcept && concepts.length >= 2 && (
            <div className="mt-3 rounded border border-yellow-800/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-300/80">
              比重が変更されました。「コンセプトを再提案」で新しい比重に基づくコンセプトを生成できます。
            </div>
          )}

          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            AIがリサーチで得られた6領域の知見と比重を分析し、対比・緊張関係にある2つの建築コンセプト方向性を提案します。比重を変更した後に再提案すると、新しい比重に基づいたコンセプトが生成されます。タイトルと説明は編集可能です。
          </p>

          {isProposingConcepts && (
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
              コンセプト方向性を分析中...
            </div>
          )}

          {conceptError && (
            <p className="mt-3 text-sm text-red-400">{conceptError}</p>
          )}

          {concepts.length >= 2 && (
            <div className="mt-4">
              <ConceptComparisonPanel
                concepts={concepts}
                onChangeA={(updated) => {
                  const next = [updated, concepts[1]];
                  setConcepts(next);
                  setSelectedConcepts(next);
                }}
                onChangeB={(updated) => {
                  const next = [concepts[0], updated];
                  setConcepts(next);
                  setSelectedConcepts(next);
                }}
              />
            </div>
          )}

          {/* Architecture Config Translation */}
          {concepts.length >= 2 && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">
                    Architecture Config / 建築的翻訳
                  </h4>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    コンセプトを12軸の建築パラメータに翻訳し、生成の精度を高めます。
                  </p>
                </div>
                <button
                  onClick={handleTranslateToConfig}
                  disabled={isTranslating}
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {isTranslating
                    ? "翻訳中..."
                    : concepts[0].architectureConfig
                    ? "再翻訳"
                    : "建築的に翻訳"}
                </button>
              </div>

              {isTranslating && (
                <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
                  2つのコンセプトを建築パラメータに翻訳中...
                </div>
              )}

              {translateError && (
                <p className="mt-3 text-sm text-red-400">{translateError}</p>
              )}

              {concepts[0].architectureConfig && concepts[1].architectureConfig && (
                <div className="mt-4 space-y-4">
                  <ConfigComparisonTable
                    configA={concepts[0].architectureConfig}
                    configB={concepts[1].architectureConfig}
                  />
                  <ConceptBlendPanel
                    configA={concepts[0].architectureConfig}
                    configB={concepts[1].architectureConfig}
                    theme={theme}
                  />
                </div>
              )}
            </div>
          )}

          {concepts.length >= 2 && (
            <button
              onClick={handleProceed}
              className="mt-5 w-full rounded-lg bg-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white"
            >
              Proceed to Generate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
