"use client";

import { useMemo } from "react";
import type { ArchitectureConfig } from "@/lib/types";

export type ConfigDiffEntry = {
  labelJa: string;
  valueA: string;
  valueB: string;
};

export type BlendKeywordResult = {
  ratio: number;
  keywords: { axis: string; labelJa: string; blended: string | null }[];
  summary: string[];
};

const CONFIG_AXES: {
  labelJa: string;
  getValue: (c: ArchitectureConfig) => string | null;
}[] = [
  { labelJa: "境界", getValue: (c) => c.boundary?.strategy ?? null },
  { labelJa: "空間構造", getValue: (c) => c.spatial?.topology ?? null },
  { labelJa: "大地", getValue: (c) => c.ground?.relation ?? null },
  { labelJa: "光", getValue: (c) => c.light?.source_strategy ?? null },
  { labelJa: "動線", getValue: (c) => c.movement?.path_topology?.type ?? null },
  { labelJa: "スケール", getValue: (c) => c.scale?.human_relation ?? null },
  { labelJa: "公私", getValue: (c) => c.social_gradient?.type ?? null },
  { labelJa: "構造", getValue: (c) => c.tectonic?.expression ?? null },
  { labelJa: "素材感", getValue: (c) => c.material?.weight_impression ?? null },
  { labelJa: "色彩", getValue: (c) => c.color?.presence ?? null },
  { labelJa: "断面", getValue: (c) => c.section?.dominant_profile ?? null },
  { labelJa: "外内関係", getValue: (c) => c.facade_interior_relationship?.type ?? null },
];

export function computeConfigDiff(
  configA: ArchitectureConfig,
  configB: ArchitectureConfig
): ConfigDiffEntry[] {
  const diffs: ConfigDiffEntry[] = [];

  for (const axis of CONFIG_AXES) {
    const vA = axis.getValue(configA);
    const vB = axis.getValue(configB);
    if (vA != null && vB != null && vA !== vB) {
      diffs.push({ labelJa: axis.labelJa, valueA: vA, valueB: vB });
    }
  }

  // material.primary comparison
  const matA = configA.material?.primary ?? [];
  const matB = configB.material?.primary ?? [];
  const matAStr = [...matA].sort().join(", ");
  const matBStr = [...matB].sort().join(", ");
  if (matAStr && matBStr && matAStr !== matBStr) {
    diffs.push({ labelJa: "素材", valueA: matAStr, valueB: matBStr });
  }

  return diffs;
}

function ConfigDiffPanel({
  diffs,
  ratios,
  blendResults,
}: {
  diffs: ConfigDiffEntry[];
  ratios: number[];
  blendResults: BlendKeywordResult[];
}) {
  // Build a lookup: labelJa -> ratio -> blended keyword
  const blendLookup = useMemo(() => {
    const map = new Map<string, Map<number, string>>();
    for (const br of blendResults) {
      for (const kw of br.keywords) {
        if (!kw.blended) continue;
        if (!map.has(kw.labelJa)) map.set(kw.labelJa, new Map());
        map.get(kw.labelJa)!.set(br.ratio, kw.blended);
      }
    }
    return map;
  }, [blendResults]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Design Space の変化軸
      </div>
      <div className="space-y-2">
        {diffs.map((d) => {
          const axisBlend = blendLookup.get(d.labelJa);
          return (
            <div key={d.labelJa} className="flex items-center gap-2 text-[11px]">
              <span className="w-16 shrink-0 text-right text-zinc-500">
                {d.labelJa}
              </span>
              <span className="w-20 shrink-0 truncate text-right font-medium text-zinc-400">
                {d.valueA}
              </span>
              <div className="relative h-2 flex-1 rounded-full bg-zinc-800">
                {/* gradient track */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-zinc-600 to-zinc-400 opacity-40" />
                {/* spectrum step dots */}
                {ratios.map((ratio) => {
                  const blended = axisBlend?.get(ratio);
                  return (
                    <div
                      key={ratio}
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${ratio}%` }}
                    >
                      <div className={`h-3 w-3 rounded-full border shadow-sm ${
                        blended
                          ? "border-zinc-400 bg-zinc-200"
                          : "border-zinc-500 bg-zinc-300"
                      }`} />
                      <span className={`absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap text-[8px] ${
                        blended ? "font-medium text-zinc-300" : "font-mono text-zinc-500"
                      }`}>
                        {ratio === 0
                          ? d.valueA
                          : ratio === 100
                          ? d.valueB
                          : blended ?? `${100 - ratio}/${ratio}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <span className="w-20 shrink-0 truncate font-medium text-zinc-400">
                {d.valueB}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary keywords per ratio */}
      {blendResults.length > 0 && (
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            ブレンドキーワード（各ステップ）
          </div>
          <div className="space-y-2">
            {blendResults.map((br) => (
              <div key={br.ratio} className="flex items-start gap-2">
                <span className="mt-0.5 w-12 shrink-0 text-right font-mono text-[10px] text-zinc-500">
                  {100 - br.ratio}/{br.ratio}
                </span>
                <div className="flex flex-wrap gap-1">
                  {br.summary.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-zinc-200/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratios.length > 2 && blendResults.length === 0 && (
        <p className="mt-3 text-[10px] text-zinc-600">
          各ドットはスペクトラム上の生成ポイント。左端＝A、右端＝B、中間はブレンド比率。
        </p>
      )}
    </div>
  );
}

export default ConfigDiffPanel;
