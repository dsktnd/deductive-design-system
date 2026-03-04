import { ResearchDomain } from "@/lib/types";

export const DETAIL_STAGE_LABELS: Record<string, { label: string; labelJa: string }> = {
  diagram: { label: "Diagram", labelJa: "ダイアグラム" },
  concept: { label: "Concept Image", labelJa: "コンセプトイメージ" },
  material: { label: "Material Board", labelJa: "マテリアルボード" },
  exterior: { label: "Exterior", labelJa: "外観イメージ" },
  interior: { label: "Interior", labelJa: "内観イメージ" },
};

export const STAGE_ORDER = ["diagram", "concept", "material", "exterior", "interior"];

export const DOMAIN_LABELS: Record<string, { en: string; ja: string }> = {
  [ResearchDomain.Environment]: { en: "Environment", ja: "環境" },
  [ResearchDomain.Market]: { en: "Market", ja: "市場" },
  [ResearchDomain.Culture]: { en: "Culture", ja: "文化" },
  [ResearchDomain.Economy]: { en: "Economy", ja: "経済" },
  [ResearchDomain.Society]: { en: "Society", ja: "社会" },
  [ResearchDomain.Technology]: { en: "Technology", ja: "技術" },
};

export function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-slate-400";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-400";
}

export function scoreTextColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-slate-300";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export interface PromptHint {
  targetImage: string;
  hint: string;
}

export interface ImprovementData {
  suggestions: string[];
  revisedPromptHints: PromptHint[];
}
