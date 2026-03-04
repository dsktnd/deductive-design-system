"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ResearchDomain, type ResearchCondition } from "@/lib/types";
import { useStore } from "@/lib/store";

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
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-5">
      <div className="mb-4 flex items-baseline gap-2">
        <h3 className="text-base font-semibold text-slate-100">{domain.ja}</h3>
        <span className="text-xs text-slate-500">{domain.en}</span>
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-400">
        Notes / Findings
      </label>
      <textarea
        value={state.notes}
        onChange={(e) =>
          onChange(domain.key, { ...state, notes: e.target.value })
        }
        rows={3}
        placeholder={`Research notes for ${domain.en}...`}
        className="mb-4 w-full resize-y rounded border border-slate-600 bg-slate-700/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
      />

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
      <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
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
                <span className="text-sm font-medium text-slate-300">
                  {d.ja}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {s.weight}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-slate-400 transition-all duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {s.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500"
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

export default function ResearchPage() {
  const [domainState, setDomainState] = useState(createInitialState);
  const updateConditions = useStore((s) => s.updateConditions);
  const router = useRouter();

  const handleChange = useCallback(
    (key: ResearchDomain, next: DomainState) => {
      setDomainState((prev) => ({ ...prev, [key]: next }));
    },
    []
  );

  const handleProceed = () => {
    const conditions: ResearchCondition[] = DOMAINS.filter(
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

    updateConditions(conditions);
    router.push("/generate");
  };

  const activeCount = DOMAINS.filter(
    (d) =>
      domainState[d.key].weight > 0 &&
      (domainState[d.key].notes || domainState[d.key].tags.length > 0)
  ).length;

  return (
    <div>
      <h2 className="font-[family-name:var(--font-dm-serif)] text-xl text-slate-100">
        Research / リサーチ
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Define and weight research conditions across the 7 domains.
      </p>

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

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Condition Summary
          </h3>
          <SummaryPanel domains={DOMAINS} state={domainState} />

          <button
            onClick={handleProceed}
            disabled={activeCount === 0}
            className="mt-6 w-full rounded-lg gradient-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-105 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            Proceed to Generate
          </button>
          {activeCount > 0 && (
            <p className="mt-2 text-center text-xs text-slate-500">
              {activeCount} domain{activeCount !== 1 ? "s" : ""} active
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
