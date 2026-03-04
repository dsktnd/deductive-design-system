"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { type ArchitectureConfig } from "@/lib/types";

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
    <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-800/60">
      <div className="border-b border-slate-600 bg-slate-700/40 px-4 py-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Concept Blend / コンセプトブレンド
        </h4>
      </div>

      <div className="px-4 py-4">
        {/* Slider */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-400">
            <span>A</span>
            <span>B</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={ratio}
            onChange={handleRatioChange}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-600 accent-blue-500"
          />
          <div className="mt-1 text-center font-mono text-sm text-slate-300">
            {ratio}%
          </div>
        </div>

        {/* Loading */}
        {isBlending && (
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" />
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
                className="flex items-center gap-3 rounded border border-slate-700/60 bg-slate-700/30 px-3 py-1.5"
              >
                <span className="w-[72px] flex-shrink-0 text-xs font-medium text-slate-500">
                  {kw.labelJa}
                </span>
                <span className="text-[10px] text-slate-500">{kw.valueA ?? "—"}</span>
                <span className="text-[10px] text-slate-600">→</span>
                {kw.blended ? (
                  <span className="rounded-full bg-slate-500/50 px-2.5 py-0.5 text-xs font-semibold text-slate-100">
                    {kw.blended}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">—</span>
                )}
                <span className="text-[10px] text-slate-600">←</span>
                <span className="text-[10px] text-slate-500">{kw.valueB ?? "—"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Summary keywords */}
        {summary.length > 0 && !isBlending && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-700 pt-3">
            {summary.map((s, i) => (
              <span
                key={i}
                className="rounded-full bg-slate-200/10 px-3 py-1 text-xs font-medium text-slate-200"
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

export default ConceptBlendPanel;
