"use client";

import { type ArchitecturalConcept } from "@/lib/types";
import { DOMAIN_LABELS } from "./constants";

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
    <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-800/60">
      <div className="border-b border-slate-600 bg-slate-700/40 px-4 py-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Concept Comparison
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="w-[120px] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500" />
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Concept A
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Concept B
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-700/60">
              <td className="px-4 py-2 text-xs font-medium text-slate-500">Title</td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={a.title}
                  onChange={(e) => onChangeA({ ...a, title: e.target.value })}
                  className="w-full rounded border border-slate-600 bg-slate-700/80 px-2.5 py-1.5 text-sm font-semibold text-slate-100 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={b.title}
                  onChange={(e) => onChangeB({ ...b, title: e.target.value })}
                  className="w-full rounded border border-slate-600 bg-slate-700/80 px-2.5 py-1.5 text-sm font-semibold text-slate-100 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                />
              </td>
            </tr>
            <tr className="border-b border-slate-700/60">
              <td className="px-4 py-2 align-top text-xs font-medium text-slate-500">Description</td>
              <td className="px-4 py-2">
                <textarea
                  value={a.description}
                  onChange={(e) => onChangeA({ ...a, description: e.target.value })}
                  rows={3}
                  className="w-full resize-y rounded border border-slate-600 bg-slate-700/80 px-2.5 py-2 text-xs text-slate-300 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                />
              </td>
              <td className="px-4 py-2">
                <textarea
                  value={b.description}
                  onChange={(e) => onChangeB({ ...b, description: e.target.value })}
                  rows={3}
                  className="w-full resize-y rounded border border-slate-600 bg-slate-700/80 px-2.5 py-2 text-xs text-slate-300 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                />
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-xs font-medium text-slate-500">Domains</td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1">
                  {a.relatedDomains.map((d) => (
                    <span key={d} className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">
                      {DOMAIN_LABELS[d] ?? d}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1">
                  {b.relatedDomains.map((d) => (
                    <span key={d} className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">
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

export default ConceptComparisonPanel;
