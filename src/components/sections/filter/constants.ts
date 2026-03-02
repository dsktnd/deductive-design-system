import type { GeneratedImage } from "@/lib/types";

// Ordered from abstract → concrete. Each stage can reference all prior stages.
export const DETAIL_STAGES = [
  {
    key: "diagram",
    label: "Diagram",
    labelJa: "ダイアグラム",
    style: "Diagram",
    abstractionLevel: 2,
    description: "Design concept expressed as an abstract diagram — relationships, flows, spatial organization.",
  },
  {
    key: "concept",
    label: "Concept Image",
    labelJa: "コンセプトイメージ",
    style: "Sketch",
    abstractionLevel: 2,
    description: "Evocative concept image capturing atmosphere, color, light, and material identity.",
  },
  {
    key: "material",
    label: "Material Board",
    labelJa: "マテリアルボード",
    style: "Sketch",
    abstractionLevel: 1,
    description: "Material palette — textures, colors, samples that embody the concept.",
  },
  {
    key: "exterior",
    label: "Exterior",
    labelJa: "外観イメージ",
    style: "Photorealistic",
    abstractionLevel: 4,
    description: "Photorealistic exterior view — building form, facade, materials, landscape context.",
  },
  {
    key: "interior",
    label: "Interior",
    labelJa: "内観イメージ",
    style: "Photorealistic",
    abstractionLevel: 3,
    description: "Photorealistic interior view — spatial quality, light, materials, human scale.",
  },
] as const;

export type StageStatus = {
  image: GeneratedImage | null;
  loading: boolean;
  error: string | null;
};

export type StageType = (typeof DETAIL_STAGES)[number];

export function dataUrlToRef(dataUrl: string, label: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { base64: match[2], mimeType: match[1], label };
}
