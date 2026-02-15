import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Condition {
  domain: string;
  weight: number;
  notes: string;
  tags?: string[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const imageModel = genAI.getGenerativeModel({
  model: "gemini-3-pro-image-preview",
  generationConfig: {
    responseModalities: ["TEXT", "IMAGE"],
  } as Parameters<typeof genAI.getGenerativeModel>[0]["generationConfig"],
});

export const ABSTRACTION_LEVELS = [
  {
    level: 1,
    label: "Material Board",
    ja: "マテリアルボード",
    description: "A mood board / material palette composition. Show material samples, textures, color swatches, and tactile references arranged in a collage layout. Include wood, stone, metal, fabric, and other material close-ups that convey the design direction. No architectural form — focus purely on material identity and atmosphere.",
  },
  {
    level: 2,
    label: "Concept Image",
    ja: "コンセプトイメージ",
    description: "An abstract, evocative concept image that captures the essence and atmosphere of the design direction. Use color, light, texture, and composition to express the mood and feeling. May include abstract forms, natural references, or artistic imagery. Not a building — but the emotional and sensory identity of the architecture.",
  },
  {
    level: 3,
    label: "Space",
    ja: "空間",
    description: "An interior or exterior spatial visualization showing the quality of space — light, scale, openness, enclosure, materiality, and human experience. Focus on how the space feels to inhabit. Show spatial depth, atmosphere, and the relationship between structure, light, and material. Perspective view at human eye level.",
  },
  {
    level: 4,
    label: "Architecture",
    ja: "建築",
    description: "A complete architectural visualization showing the building in its context. Include building form, facade detail, structural expression, material choices, landscape, and surrounding environment. Show the architecture as a whole — exterior view with enough detail to understand massing, proportion, fenestration, and design intent.",
  },
] as const;

export function buildArchitecturePrompt(
  prompt: string,
  conditions: Condition[],
  style?: string,
  abstractionLevel?: number
): string {
  const sorted = [...conditions].sort((a, b) => b.weight - a.weight);

  const conditionLines = sorted.map((c) => {
    const emphasis = c.weight >= 0.8 ? "CRITICAL" : c.weight >= 0.5 ? "Important" : "Consider";
    const tagsStr = c.tags && c.tags.length > 0 ? ` [Keywords: ${c.tags.join(", ")}]` : "";
    return `- [${emphasis}, weight: ${c.weight}] ${c.domain}: ${c.notes}${tagsStr}`;
  });

  const level = ABSTRACTION_LEVELS.find((l) => l.level === abstractionLevel) ?? ABSTRACTION_LEVELS[2];

  const parts = [
    `Generate an architectural image at the "${level.label}" abstraction level.`,
    "",
    `Abstraction instruction: ${level.description}`,
    "",
    `Design brief: ${prompt}`,
  ];

  if (style) {
    parts.push("", `Architectural style: ${style}`);
  }

  if (conditionLines.length > 0) {
    parts.push("", "Design conditions (ordered by priority):", ...conditionLines);
  }

  parts.push(
    "",
    `Requirements: The output MUST match the "${level.label}" abstraction level described above. ` +
      "Do not add more detail than specified for this level. " +
      "If a [SCENE CONSTRAINT] is provided, strictly maintain the same viewpoint, composition, lighting, atmosphere, and material palette. " +
      "Only the conceptual/design direction marked as [VARIABLE] should change between images."
  );

  return parts.join("\n");
}

export interface ReferenceImage {
  base64: string;    // raw base64 (no data: prefix)
  mimeType: string;  // e.g. "image/png"
  label: string;     // e.g. "Concept Diagram" — used in prompt context
}

export async function generateArchitectureImage(
  prompt: string,
  conditions: Condition[] = [],
  style?: string,
  abstractionLevel?: number,
  referenceImages?: ReferenceImage[]
): Promise<{ text: string | null; imageBase64: string | null; mimeType: string | null }> {
  const fullPrompt = buildArchitecturePrompt(prompt, conditions, style, abstractionLevel);

  // Build multimodal content parts
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  if (referenceImages && referenceImages.length > 0) {
    // Add reference context
    parts.push({
      text: `The following ${referenceImages.length} reference image(s) represent earlier, more abstract stages of the same design project. Use them to maintain visual consistency in color palette, materials, spatial composition, and design language. The new image should feel like a natural, more detailed evolution of these references.\n\n`,
    });

    for (const ref of referenceImages) {
      parts.push({ text: `[Reference: ${ref.label}]\n` });
      parts.push({ inlineData: { data: ref.base64, mimeType: ref.mimeType } });
    }

    parts.push({ text: `\n---\nNow generate the following:\n\n${fullPrompt}` });
  } else {
    parts.push({ text: fullPrompt });
  }

  const result = await imageModel.generateContent(parts);
  const response = result.response;
  const candidates = response.candidates;

  if (!candidates || candidates.length === 0) {
    throw new Error("No response candidates returned from Gemini");
  }

  let text: string | null = null;
  let imageBase64: string | null = null;
  let mimeType: string | null = null;

  for (const part of candidates[0].content.parts) {
    if (part.text) {
      text = part.text;
    } else if (part.inlineData) {
      imageBase64 = part.inlineData.data;
      mimeType = part.inlineData.mimeType;
    }
  }

  return { text, imageBase64, mimeType };
}
