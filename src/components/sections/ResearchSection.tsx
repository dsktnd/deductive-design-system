"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import { ResearchDomain, type ResearchCondition, type ResearchFinding, type ResearchJob, type ArchitecturalConcept, type ArchitectureConfig, type DomainState } from "@/lib/types";
import { useStore } from "@/lib/store";
import { DOMAINS, createInitialState, conditionsToState } from "./research/constants";
import DomainDetailModal from "./research/DomainDetailModal";
import DomainCard from "./research/DomainCard";
import SummaryPanel from "./research/SummaryPanel";
import JobHistory from "./research/JobHistory";
import ConceptComparisonPanel from "./research/ConceptComparisonPanel";
import ConfigComparisonTable from "./research/ConfigComparisonTable";
import ConceptBlendPanel from "./research/ConceptBlendPanel";

const ResearchGraph = lazy(() => import("@/components/ResearchGraph"));
import CorrelationMatrix from "./research/CorrelationMatrix";

// --- Main Section ---

export default function ResearchSection() {
  const [domainState, setDomainState] = useState(createInitialState);
  const [theme, setTheme] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<ResearchDomain | null>(null);
  const conditions = useStore((s) => s.conditions);
  const updateConditions = useStore((s) => s.updateConditions);
  const researchTheme = useStore((s) => s.researchTheme);
  const setResearchTheme = useStore((s) => s.setResearchTheme);
  const researchJobs = useStore((s) => s.researchJobs);
  const addResearchJob = useStore((s) => s.addResearchJob);
  const loadResearchJob = useStore((s) => s.loadResearchJob);
  const selectedConcepts = useStore((s) => s.selectedConcepts);
  const setSelectedConcepts = useStore((s) => s.setSelectedConcepts);

  const [concepts, setConcepts] = useState<ArchitecturalConcept[]>([]);
  const [isProposingConcepts, setIsProposingConcepts] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [weightsChangedSinceConcept, setWeightsChangedSinceConcept] = useState(false);
  const [researchingDomains, setResearchingDomains] = useState<Set<string>>(new Set());
  const [completedDomains, setCompletedDomains] = useState(0);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "graph" | "matrix">("cards");

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
    setCompletedDomains(0);
    setResearchingDomains(new Set(DOMAINS.map((d) => d.key)));
    // Mark all domains as researching in the domain state
    setDomainState((prev) => {
      const next = { ...prev };
      for (const d of DOMAINS) {
        next[d.key] = { ...next[d.key], isResearching: true };
      }
      return next;
    });

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: theme.trim(), stream: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      const accumulated: Record<string, DomainState> = { ...domainState };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            const event = JSON.parse(json);
            if (event.type === "domain") {
              const result = event.result;
              const key = event.domain as ResearchDomain;
              accumulated[key] = {
                notes: result.notes || "",
                weight: typeof result.weight === "number" ? result.weight : 50,
                tags: Array.isArray(result.tags) ? result.tags : [],
                findings: Array.isArray(result.findings) ? result.findings : undefined,
                weightRationale: typeof result.weight_rationale === "string" ? result.weight_rationale : undefined,
                relatedDomains: Array.isArray(result.related_domains) ? result.related_domains : undefined,
                isResearching: false,
              };
              setDomainState((prev) => ({ ...prev, [key]: accumulated[key] }));
              setResearchingDomains((prev) => {
                const next = new Set(prev);
                next.delete(event.domain);
                return next;
              });
              setCompletedDomains((prev) => prev + 1);
            } else if (event.type === "error") {
              setResearchingDomains((prev) => {
                const next = new Set(prev);
                next.delete(event.domain);
                return next;
              });
              setCompletedDomains((prev) => prev + 1);
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }

      // Save research job with final state
      const jobConditions: ResearchCondition[] = DOMAINS.map((d) => ({
        domain: d.key,
        notes: accumulated[d.key].notes,
        weight: accumulated[d.key].weight / 100,
        tags: accumulated[d.key].tags,
        findings: accumulated[d.key].findings,
        weightRationale: accumulated[d.key].weightRationale,
        relatedDomains: accumulated[d.key].relatedDomains,
      }));

      const job: ResearchJob = {
        id: `research-${Date.now()}`,
        theme: theme.trim(),
        conditions: jobConditions,
        timestamp: new Date().toISOString(),
      };
      addResearchJob(job);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Research failed";
      setResearchError(message);
    } finally {
      setIsResearching(false);
      setResearchingDomains(new Set());
      // Clear any remaining isResearching flags
      setDomainState((prev) => {
        const next = { ...prev };
        for (const d of DOMAINS) {
          if (next[d.key].isResearching) {
            next[d.key] = { ...next[d.key], isResearching: false };
          }
        }
        return next;
      });
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
          <div className="mt-3 flex items-center gap-3 text-sm text-zinc-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
            <span>{completedDomains}/{DOMAINS.length} 領域を分析中...</span>
            <div className="flex gap-1">
              {DOMAINS.map((d) => (
                <div
                  key={d.key}
                  className={`h-2 w-6 rounded-full transition-colors duration-300 ${
                    researchingDomains.has(d.key)
                      ? "animate-pulse bg-zinc-500"
                      : completedDomains > 0 && !researchingDomains.has(d.key)
                      ? "bg-emerald-500"
                      : "bg-zinc-700"
                  }`}
                  title={d.ja}
                />
              ))}
            </div>
          </div>
        )}
        {researchError && (
          <p className="mt-3 text-sm text-red-400">{researchError}</p>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="mt-6 flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 w-fit">
        <button
          onClick={() => setViewMode("cards")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            viewMode === "cards"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Cards
        </button>
        <button
          onClick={() => setViewMode("graph")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            viewMode === "graph"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Graph
        </button>
        <button
          onClick={() => setViewMode("matrix")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            viewMode === "matrix"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Matrix
        </button>
      </div>

      {/* Domain Cards + Summary / Graph / Matrix */}
      {viewMode === "cards" ? (
        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
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
      ) : viewMode === "graph" ? (
        <div className="mt-4">
          <Suspense
            fallback={
              <div className="flex h-[600px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
                <span className="text-sm text-zinc-500">グラフを読み込み中...</span>
              </div>
            }
          >
            <ResearchGraph
              theme={theme}
              domainState={domainState}
              concepts={concepts}
              onOpenDomainDetail={(domain) => setDetailModal(domain)}
            />
          </Suspense>
        </div>
      ) : (
        <div className="mt-4">
          <CorrelationMatrix domainState={domainState} />
        </div>
      )}

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
