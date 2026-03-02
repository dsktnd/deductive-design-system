import type { EvaluationScore } from "@/lib/types";

export const STYLES = [
  "Diagram",
  "Sketch",
  "Photorealistic",
] as const;

export const SPECTRUM_STEP_OPTIONS = [2, 3, 5, 7] as const;

export const ATMOSPHERE_PRESETS = [
  { key: "minimal", ja: "ミニマル", en: "Minimal", prompt: "clean, minimal, white space, restrained" },
  { key: "brutal", ja: "ブルータル", en: "Brutalist", prompt: "raw concrete, bold geometric, heavy mass" },
  { key: "organic", ja: "有機的", en: "Organic", prompt: "flowing forms, natural curves, biomorphic" },
  { key: "futuristic", ja: "未来的", en: "Futuristic", prompt: "sleek, parametric, advanced materials" },
  { key: "vernacular", ja: "ヴァナキュラー", en: "Vernacular", prompt: "local materials, traditional craft, contextual" },
  { key: "ethereal", ja: "幻想的", en: "Ethereal", prompt: "translucent, light-filled, dreamlike, atmospheric" },
  { key: "industrial", ja: "インダストリアル", en: "Industrial", prompt: "exposed structure, raw materials, utilitarian" },
  { key: "zen", ja: "禅", en: "Zen", prompt: "tranquil, empty space, natural materials, meditative" },
] as const;

const DOMAIN_LABELS: Record<string, string> = {
  environment: "環境",
  market: "マーケット",
  culture: "文化・歴史",
  economy: "経済",
  society: "社会",
  technology: "技術",
};

export function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain;
}

export function defaultScores(): EvaluationScore {
  return { performance: 0, economy: 0, context: 0, experience: 0, social: 0, aesthetics: 0 };
}

export function generateSpectrumSteps(steps: number): number[] {
  if (steps <= 1) return [50];
  return Array.from({ length: steps }, (_, i) => Math.round((i / (steps - 1)) * 100));
}
