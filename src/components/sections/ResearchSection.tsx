"use client";

import { useState, useCallback } from "react";
import { ResearchDomain, type ResearchCondition, type ResearchJob, type ArchitecturalConcept } from "@/lib/types";
import { useAppState } from "@/lib/store";

const DOMAINS: { key: ResearchDomain; ja: string; en: string }[] = [
  { key: ResearchDomain.Environment, ja: "環境", en: "Environment" },
  { key: ResearchDomain.Market, ja: "マーケット", en: "Market" },
  { key: ResearchDomain.Culture, ja: "文化・歴史", en: "Culture / History" },
  { key: ResearchDomain.Economy, ja: "経済", en: "Economy" },
  { key: ResearchDomain.Society, ja: "社会", en: "Society" },
  { key: ResearchDomain.Technology, ja: "技術", en: "Technology" },
];

interface DomainState {
  notes: string;
  weight: number;
  tags: string[];
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
      };
    }
  }
  return state;
}

function DomainCard({
  domain,
  state,
  onChange,
}: {
  domain: (typeof DOMAINS)[number];
  state: DomainState;
  onChange: (key: ResearchDomain, next: DomainState) => void;
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

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-base font-semibold text-zinc-100">{domain.ja}</h3>
        <span className="text-xs text-zinc-500">{domain.en}</span>
      </div>

      <label className="mb-1 block text-xs font-medium text-zinc-400">
        Notes / Findings
      </label>
      <textarea
        value={state.notes}
        onChange={(e) =>
          onChange(domain.key, { ...state, notes: e.target.value })
        }
        rows={3}
        placeholder={`Research notes for ${domain.en}...`}
        className="mb-4 w-full resize-y rounded border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
      />

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

const DOMAIN_LABELS: Record<string, string> = {
  environment: "環境",
  market: "マーケット",
  culture: "文化・歴史",
  economy: "経済",
  society: "社会",
  technology: "技術",
};

function ConceptCard({
  concept,
  label,
  onChange,
}: {
  concept: ArchitecturalConcept;
  label: string;
  onChange: (updated: ArchitecturalConcept) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <input
        type="text"
        value={concept.title}
        onChange={(e) => onChange({ ...concept, title: e.target.value })}
        className="mb-2 w-full rounded border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-sm font-semibold text-zinc-100 focus:border-zinc-500 focus:outline-none"
      />
      <textarea
        value={concept.description}
        onChange={(e) => onChange({ ...concept, description: e.target.value })}
        rows={3}
        className="mb-2 w-full resize-y rounded border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs text-zinc-300 focus:border-zinc-500 focus:outline-none"
      />
      <div className="flex flex-wrap gap-1">
        {concept.relatedDomains.map((d) => (
          <span
            key={d}
            className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400"
          >
            {DOMAIN_LABELS[d] ?? d}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ResearchSection() {
  const [domainState, setDomainState] = useState(createInitialState);
  const [theme, setTheme] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
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
            };
          }
        }
        setDomainState(newState);

        const jobConditions: ResearchCondition[] = DOMAINS.map((d) => ({
          domain: d.key,
          notes: newState[d.key].notes,
          weight: newState[d.key].weight / 100,
          tags: newState[d.key].tags,
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

  return (
    <div>
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
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <ConceptCard
                concept={concepts[0]}
                label="Concept A"
                onChange={(updated) => {
                  const next = [updated, concepts[1]];
                  setConcepts(next);
                  setSelectedConcepts(next);
                }}
              />
              <ConceptCard
                concept={concepts[1]}
                label="Concept B"
                onChange={(updated) => {
                  const next = [concepts[0], updated];
                  setConcepts(next);
                  setSelectedConcepts(next);
                }}
              />
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
