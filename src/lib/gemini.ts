import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Condition {
  domain: string;
  weight: number;
  notes: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const imageModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    responseModalities: ["TEXT", "IMAGE"],
  } as Parameters<typeof genAI.getGenerativeModel>[0]["generationConfig"],
});

export function buildArchitecturePrompt(
  prompt: string,
  conditions: Condition[],
  style?: string
): string {
  const sorted = [...conditions].sort((a, b) => b.weight - a.weight);

  const conditionLines = sorted.map((c) => {
    const emphasis = c.weight >= 0.8 ? "CRITICAL" : c.weight >= 0.5 ? "Important" : "Consider";
    return `- [${emphasis}, weight: ${c.weight}] ${c.domain}: ${c.notes}`;
  });

  const parts = [
    "Generate a detailed architectural design image.",
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
    "Requirements: Produce a high-quality architectural visualization. " +
      "Show materials, lighting, spatial relationships, and structural details clearly."
  );

  return parts.join("\n");
}

export async function generateArchitectureImage(
  prompt: string,
  conditions: Condition[] = [],
  style?: string
): Promise<{ text: string | null; imageBase64: string | null; mimeType: string | null }> {
  const fullPrompt = buildArchitecturePrompt(prompt, conditions, style);

  const result = await imageModel.generateContent(fullPrompt);
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
