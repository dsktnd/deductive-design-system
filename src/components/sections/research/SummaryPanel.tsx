import React from "react";
import { ResearchDomain, type DomainState } from "@/lib/types";
import { DOMAINS, DOMAIN_LABELS } from "./constants";

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

export default SummaryPanel;
