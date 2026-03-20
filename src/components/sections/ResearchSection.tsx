"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ResearchDomain, type ResearchCondition, type ResearchFinding, type ResearchKeyword, type ResearchJob, type ArchitecturalConcept, type ArchitectureConfig, type DomainState } from "@/lib/types";
import { useStore } from "@/lib/store";
import { DOMAINS, DOMAIN_COLORS, DOMAIN_LABELS, createInitialState, conditionsToState } from "./research/constants";
import DomainDetailModal from "./research/DomainDetailModal";
import JobHistory from "./research/JobHistory";
import ConceptComparisonPanel from "./research/ConceptComparisonPanel";
import ConfigComparisonTable from "./research/ConfigComparisonTable";
import ConceptBlendPanel from "./research/ConceptBlendPanel";
import KeywordCloud from "@/components/KeywordCloud";

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
  const selectedKeywordTexts = useStore((s) => s.selectedKeywordTexts);
  const toggleKeyword = useStore((s) => s.toggleKeyword);
  const clearSelectedKeywords = useStore((s) => s.clearSelectedKeywords);

  const [concepts, setConcepts] = useState<ArchitecturalConcept[]>([]);
  const [isProposingConcepts, setIsProposingConcepts] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [researchingDomains, setResearchingDomains] = useState<Set<string>>(new Set());
  const [completedDomains, setCompletedDomains] = useState(0);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [embeddingPositions, setEmbeddingPositions] = useState<Map<string, [number, number]> | null>(null);
  const embedAbortRef = useRef<AbortController | null>(null);

  const [hasRestored, setHasRestored] = useState(false);
  if (!hasRestored && conditions.length > 0) {
    const restored = conditionsToState(conditions);
    setDomainState(restored);
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
    },
    []
  );

  const fetchEmbeddings = useCallback(
    async (state: Record<string, DomainState>) => {
      // Collect all keyword texts grouped by domain for fallback
      const allTexts: string[] = [];
      const textToDomain: Record<string, ResearchDomain> = {};
      const domainKeys = Object.values(ResearchDomain);
      for (const key of domainKeys) {
        for (const kw of state[key].keywords ?? []) {
          if (!allTexts.includes(kw.text)) {
            allTexts.push(kw.text);
            textToDomain[kw.text] = key;
          }
        }
      }
      if (allTexts.length === 0) {
        setEmbeddingPositions(null);
        return;
      }

      // Build fallback positions (domain-based circular layout)
      const buildFallback = () => {
        const map = new Map<string, [number, number]>();
        const domainCounters: Record<string, number> = {};
        const domainTotals: Record<string, number> = {};
        for (const t of allTexts) {
          const d = textToDomain[t];
          domainTotals[d] = (domainTotals[d] ?? 0) + 1;
        }
        for (const t of allTexts) {
          const d = textToDomain[t];
          const idx = domainCounters[d] ?? 0;
          domainCounters[d] = idx + 1;
          const dIdx = domainKeys.indexOf(d);
          const angle = (dIdx / domainKeys.length) * Math.PI * 2;
          const spread = 0.15;
          const r = 0.4 + (idx / Math.max(1, domainTotals[d] - 1)) * 0.4;
          const x = Math.cos(angle) * r + (Math.random() - 0.5) * spread;
          const y = Math.sin(angle) * r + (Math.random() - 0.5) * spread;
          map.set(t, [
            Math.max(-1, Math.min(1, x)),
            Math.max(-1, Math.min(1, y)),
          ]);
        }
        return map;
      };

      // Abort any in-flight request
      embedAbortRef.current?.abort();
      const controller = new AbortController();
      embedAbortRef.current = controller;

      try {
        const res = await fetch("/api/research/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: allTexts }),
          signal: controller.signal,
        });
        if (!res.ok) {
          console.warn("Embed API failed, using fallback layout:", res.status);
          setEmbeddingPositions(buildFallback());
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data.positions)) {
          setEmbeddingPositions(buildFallback());
          return;
        }

        const map = new Map<string, [number, number]>();
        for (let i = 0; i < allTexts.length; i++) {
          if (data.positions[i]) {
            map.set(allTexts[i], data.positions[i] as [number, number]);
          }
        }
        setEmbeddingPositions(map);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("Embed API error, using fallback layout:", err);
        setEmbeddingPositions(buildFallback());
      }
    },
    []
  );

  // Fetch embeddings when state is restored from store
  const restoredRef = useRef(false);
  useEffect(() => {
    if (hasRestored && !restoredRef.current) {
      restoredRef.current = true;
      fetchEmbeddings(domainState);
    }
  }, [hasRestored, domainState, fetchEmbeddings]);

  const handleLoadJob = useCallback(
    (jobId: string) => {
      const job = researchJobs.find((j) => j.id === jobId);
      if (job) {
        setTheme(job.theme);
        const restored = conditionsToState(job.conditions);
        setDomainState(restored);
        loadResearchJob(jobId);
        fetchEmbeddings(restored);
      }
    },
    [researchJobs, loadResearchJob, fetchEmbeddings]
  );

  const selectedKeywordsSet = useMemo(
    () => new Set(selectedKeywordTexts),
    [selectedKeywordTexts]
  );

  // Compute keyword selection breakdown by domain
  const keywordSelectionInfo = useMemo(() => {
    const domainCounts: Record<string, number> = {};
    const allKeywords: ResearchKeyword[] = [];

    for (const key of Object.values(ResearchDomain)) {
      const keywords = domainState[key].keywords ?? [];
      for (const kw of keywords) {
        allKeywords.push(kw);
        if (selectedKeywordsSet.has(kw.text)) {
          domainCounts[key] = (domainCounts[key] ?? 0) + 1;
        }
      }
    }

    return { domainCounts, allKeywords, total: selectedKeywordTexts.length };
  }, [domainState, selectedKeywordsSet, selectedKeywordTexts.length]);

  const handleResearch = async () => {
    if (!theme.trim()) return;
    setIsResearching(true);
    setResearchError(null);
    setCompletedDomains(0);
    setResearchingDomains(new Set(DOMAINS.map((d) => d.key)));
    // Mark all domains as researching
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

              // Map keywords from API response
              const apiKeywords: ResearchKeyword[] = Array.isArray(result.keywords)
                ? result.keywords.map((k: { text: string; relevance: number; finding_indices?: number[] }) => ({
                    text: k.text,
                    relevance: typeof k.relevance === "number" ? k.relevance : 50,
                    domain: key,
                    findingIndices: Array.isArray(k.finding_indices) ? k.finding_indices : [],
                  }))
                : [];

              accumulated[key] = {
                notes: result.notes || "",
                tags: Array.isArray(result.tags) ? result.tags : [],
                findings: Array.isArray(result.findings) ? result.findings : undefined,
                keywords: apiKeywords,
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
        tags: accumulated[d.key].tags,
        findings: accumulated[d.key].findings,
        keywords: accumulated[d.key].keywords,
        relatedDomains: accumulated[d.key].relatedDomains,
      }));

      const job: ResearchJob = {
        id: `research-${Date.now()}`,
        theme: theme.trim(),
        conditions: jobConditions,
        timestamp: new Date().toISOString(),
      };
      addResearchJob(job);

      // Prevent restore logic from overriding live domainState
      setHasRestored(true);

      // Persist to store so restore logic works on remount
      updateConditions(jobConditions);
      setResearchTheme(theme.trim());

      // Fetch embedding positions for the keyword cloud
      fetchEmbeddings(accumulated as Record<string, DomainState>);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Research failed";
      setResearchError(message);
    } finally {
      setIsResearching(false);
      setResearchingDomains(new Set());
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
    if (selectedKeywordTexts.length === 0) return;
    setIsProposingConcepts(true);
    setConceptError(null);

    // Build selected keywords with their findings
    const selectedKeywords: { text: string; domain: string; findings: string[] }[] = [];
    for (const key of Object.values(ResearchDomain)) {
      const ds = domainState[key];
      const keywords = ds.keywords ?? [];
      for (const kw of keywords) {
        if (selectedKeywordsSet.has(kw.text)) {
          const findings = (kw.findingIndices ?? [])
            .map((idx) => ds.findings?.[idx]?.text)
            .filter((t): t is string => !!t);
          selectedKeywords.push({ text: kw.text, domain: key, findings });
        }
      }
    }

    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: theme.trim(), selectedKeywords }),
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
      tags: domainState[d.key].tags,
      findings: domainState[d.key].findings,
      keywords: domainState[d.key].keywords,
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
      const key = domainKey;

      const apiKeywords: ResearchKeyword[] = Array.isArray(result.keywords)
        ? result.keywords.map((k: { text: string; relevance: number; finding_indices?: number[] }) => ({
            text: k.text,
            relevance: typeof k.relevance === "number" ? k.relevance : 50,
            domain: key,
            findingIndices: Array.isArray(k.finding_indices) ? k.finding_indices : [],
          }))
        : [];

      const updatedState: Record<string, DomainState> = { ...domainState };
      updatedState[domainKey] = {
        ...domainState[domainKey],
        notes: result.notes || domainState[domainKey].notes,
        tags: Array.isArray(result.tags) ? result.tags : domainState[domainKey].tags,
        findings: Array.isArray(result.findings) ? result.findings : domainState[domainKey].findings,
        keywords: apiKeywords.length > 0 ? apiKeywords : domainState[domainKey].keywords,
        relatedDomains: Array.isArray(result.related_domains) ? result.related_domains : domainState[domainKey].relatedDomains,
        isResearching: false,
      };
      setDomainState(updatedState as Record<ResearchDomain, DomainState>);
      fetchEmbeddings(updatedState);
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

      const apiKeywords: ResearchKeyword[] = Array.isArray(result.keywords)
        ? result.keywords.map((k: { text: string; relevance: number; finding_indices?: number[] }) => ({
            text: k.text,
            relevance: typeof k.relevance === "number" ? k.relevance : 50,
            domain: domainKey,
            findingIndices: Array.isArray(k.finding_indices)
              ? k.finding_indices.map((idx: number) => idx + existingFindings.length)
              : [],
          }))
        : [];

      const existingKeywords = domainState[domainKey].keywords ?? [];

      const updatedState: Record<string, DomainState> = { ...domainState };
      updatedState[domainKey] = {
        ...domainState[domainKey],
        findings: [...existingFindings, ...newFindings],
        keywords: [...existingKeywords, ...apiKeywords],
        isResearching: false,
      };
      setDomainState(updatedState as Record<ResearchDomain, DomainState>);
      fetchEmbeddings(updatedState);
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
        (domainState[d.key].keywords ?? []).length > 0
    ).map((d) => ({
      domain: d.key,
      notes: domainState[d.key].notes,
      tags: domainState[d.key].tags,
      findings: domainState[d.key].findings,
      keywords: domainState[d.key].keywords,
      relatedDomains: domainState[d.key].relatedDomains,
    }));

    updateConditions(jobConditions);
    setResearchTheme(theme.trim());
    if (concepts.length >= 2) {
      setSelectedConcepts(concepts);
    }
    document.getElementById("generate")?.scrollIntoView({ behavior: "smooth" });
  };

  const totalKeywords = useMemo(() => {
    let count = 0;
    for (const key of Object.values(ResearchDomain)) {
      count += (domainState[key].keywords ?? []).length;
    }
    return count;
  }, [domainState]);

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

      <h2 className="font-[family-name:var(--font-dm-serif)] text-xl text-slate-100">
        Research / リサーチ
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        テーマを入力すると、AIが6つの領域から多角的にリサーチを行い、キーワードを抽出します。
      </p>

      {/* Theme input + Research button */}
      <div className="mt-5 rounded-lg border border-slate-600 bg-slate-800/80 p-5">
        <label className="mb-2 block text-sm font-medium text-slate-300">
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
            className="flex-1 rounded border border-slate-500 bg-slate-700 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
          />
          <button
            onClick={handleResearch}
            disabled={isResearching || !theme.trim()}
            className="rounded-lg gradient-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-105 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-500"
          >
            {isResearching ? "Researching..." : "Research"}
          </button>
        </div>

        {/* Progress indicator */}
        {isResearching && (
          <div className="mt-3 flex items-center gap-3 text-sm text-slate-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
            <span>{completedDomains}/{DOMAINS.length} 領域を分析中...</span>
            <div className="flex gap-1">
              {DOMAINS.map((d) => (
                <div
                  key={d.key}
                  className={`h-2 w-6 rounded-full transition-colors duration-300 ${
                    researchingDomains.has(d.key)
                      ? "animate-pulse bg-slate-500"
                      : completedDomains > 0 && !researchingDomains.has(d.key)
                      ? "bg-emerald-500"
                      : "bg-slate-600"
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

      {/* Domain Results Grid */}
      {totalKeywords > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DOMAINS.map((d) => {
            const ds = domainState[d.key];
            const findingsCount = ds.findings?.length ?? 0;
            const kwCount = (ds.keywords ?? []).length;
            if (findingsCount === 0 && kwCount === 0) return null;
            const color = DOMAIN_COLORS[d.key] ?? "#a1a1aa";
            return (
              <button
                key={d.key}
                onClick={() => setDetailModal(d.key)}
                className="group rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-left transition-colors hover:border-slate-500 hover:bg-slate-700/60"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-slate-200">
                    {d.ja}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                  {findingsCount > 0 && <span>{findingsCount} findings</span>}
                  {kwCount > 0 && <span>{kwCount} keywords</span>}
                </div>
                {ds.isResearching && (
                  <div className="mt-1.5">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border border-slate-500 border-t-blue-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Keyword Cloud */}
      <div className="mt-6">
        <KeywordCloud
          domainState={domainState}
          positions={embeddingPositions}
          selectedKeywords={selectedKeywordsSet}
          onToggleKeyword={toggleKeyword}
        />
      </div>

      {/* Selected Keywords Bar */}
      {totalKeywords > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-200">
              {keywordSelectionInfo.total}個選択中
            </span>
            <div className="flex items-center gap-2">
              {Object.entries(keywordSelectionInfo.domainCounts).map(([domain, count]) => (
                <span
                  key={domain}
                  className="flex items-center gap-1 text-xs text-slate-400"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: DOMAIN_COLORS[domain] }}
                  />
                  {DOMAIN_LABELS[domain]}: {count}
                </span>
              ))}
            </div>
            {keywordSelectionInfo.total > 0 && (
              <button
                onClick={clearSelectedKeywords}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                クリア
              </button>
            )}
          </div>
          <button
            onClick={handleProposeConcepts}
            disabled={isProposingConcepts || keywordSelectionInfo.total === 0 || !theme.trim()}
            className="rounded-lg gradient-accent px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-105 hover:shadow-blue-600/40 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-500 disabled:shadow-none"
          >
            {isProposingConcepts ? "Proposing..." : "コンセプトを生成"}
          </button>
        </div>
      )}

      {/* Job History */}
      {researchJobs.length > 0 && (
        <div className="mt-4">
          <JobHistory jobs={researchJobs} onLoad={handleLoadJob} />
        </div>
      )}

      {/* Concept Proposal Section */}
      {isProposingConcepts && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
          コンセプト方向性を分析中...
        </div>
      )}

      {conceptError && (
        <p className="mt-4 text-sm text-red-400">{conceptError}</p>
      )}

      {concepts.length >= 2 && (
        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Architectural Concepts / コンセプト方向性
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                選択したキーワードから、2つの対照的な建築コンセプトを提案しました。
              </p>
            </div>
            <button
              onClick={handleProposeConcepts}
              disabled={isProposingConcepts || keywordSelectionInfo.total === 0 || !theme.trim()}
              className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
            >
              {isProposingConcepts ? "Proposing..." : "コンセプトを再提案"}
            </button>
          </div>

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

          {/* Architecture Config Translation */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">
                  Architecture Config / 建築的翻訳
                </h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  コンセプトを12軸の建築パラメータに翻訳し、生成の精度を高めます。
                </p>
              </div>
              <button
                onClick={handleTranslateToConfig}
                disabled={isTranslating}
                className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
              >
                {isTranslating
                  ? "翻訳中..."
                  : concepts[0].architectureConfig
                  ? "再翻訳"
                  : "建築的に翻訳"}
              </button>
            </div>

            {isTranslating && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
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

          <button
            onClick={handleProceed}
            className="mt-5 w-full rounded-lg gradient-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-105 hover:shadow-blue-600/40"
          >
            Proceed to Generate
          </button>
        </div>
      )}
    </div>
  );
}
