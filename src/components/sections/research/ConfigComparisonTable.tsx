import { type ArchitectureConfig } from "@/lib/types";

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
    <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-800/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-600 bg-slate-700/40 px-4 py-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Architecture Config Comparison
        </h4>
        {(confA != null || confB != null) && (
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span>Confidence:</span>
            {confA != null && (
              <span>
                A <span className="font-mono text-slate-400">{confA}%</span>
              </span>
            )}
            {confB != null && (
              <span>
                B <span className="font-mono text-slate-400">{confB}%</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="w-[100px] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                軸
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Concept A
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Concept B
              </th>
              <th className="w-[60px] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                比較
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={`border-b border-slate-700/60 ${
                  row.same
                    ? "bg-transparent"
                    : "bg-amber-500/[0.04]"
                }`}
              >
                <td className="px-4 py-1.5 text-xs font-medium text-slate-500">
                  {row.labelJa}
                </td>
                <td className="px-4 py-1.5">
                  <span className={`text-xs font-medium ${row.same ? "text-slate-500" : "text-slate-200"}`}>
                    {row.valA ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-1.5">
                  <span className={`text-xs font-medium ${row.same ? "text-slate-500" : "text-slate-200"}`}>
                    {row.valB ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-1.5 text-center">
                  {row.same ? (
                    <span className="text-[10px] text-slate-500">= 同</span>
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
        <div className="border-t border-slate-700 px-4 py-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            素材
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500">A:</span>
              {materialsA.map((m) => (
                <span key={m} className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-300">
                  {m}
                </span>
              ))}
              {materialsA.length === 0 && <span className="text-[10px] text-slate-500">—</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500">B:</span>
              {materialsB.map((m) => (
                <span key={m} className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-300">
                  {m}
                </span>
              ))}
              {materialsB.length === 0 && <span className="text-[10px] text-slate-500">—</span>}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="border-t border-slate-700 bg-slate-700/30 px-4 py-2.5">
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-slate-500">
            一致: <span className="font-mono font-medium text-slate-400">{matchCount}/{total}軸</span>
          </span>
          <span className="text-slate-500">
            差異: <span className="font-mono font-medium text-amber-400/80">{diffCount}/{total}軸</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default ConfigComparisonTable;
