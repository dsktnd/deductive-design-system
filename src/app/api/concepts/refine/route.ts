import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: {
    theme: string;
    conceptA: { title: string; description: string };
    conceptB: { title: string; description: string };
    selectedRatios: number[];
    conditions: { domain: string; weight: number; notes: string; tags?: string[] }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { theme, conceptA, conceptB, selectedRatios, conditions } = body;

  if (!conceptA || !conceptB || !selectedRatios?.length) {
    return NextResponse.json(
      { error: "conceptA, conceptB, and selectedRatios are required" },
      { status: 400 }
    );
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const ratioAnalysis = selectedRatios
    .map((r) => `- ${conceptA.title} ${100 - r}% / ${conceptB.title} ${r}%`)
    .join("\n");

  const avgRatio = selectedRatios.reduce((a, b) => a + b, 0) / selectedRatios.length;
  const ratioSpread = Math.max(...selectedRatios) - Math.min(...selectedRatios);

  const conditionSummary = conditions
    .filter((c) => c.weight > 0.2)
    .sort((a, b) => b.weight - a.weight)
    .map((c) => `- ${c.domain} (weight: ${c.weight}): ${c.notes}`)
    .join("\n");

  const prompt = `You are an architectural design consultant. Analyze the user's design preferences based on their selected images from a concept spectrum, and synthesize a refined architectural concept.

## Project Theme
${theme || "Architectural design project"}

## Original Concepts

### Concept A: "${conceptA.title}"
${conceptA.description}

### Concept B: "${conceptB.title}"
${conceptB.description}

## User's Selected Positions on Spectrum
The user selected images at these positions (0 = pure Concept A, 100 = pure Concept B):
${ratioAnalysis}

Average position: ${avgRatio.toFixed(1)}% (spread: ${ratioSpread} points)
${avgRatio < 40 ? `The user leans toward "${conceptA.title}".` : avgRatio > 60 ? `The user leans toward "${conceptB.title}".` : "The user prefers a balanced blend of both concepts."}
${ratioSpread > 30 ? "The wide spread suggests interest in exploring diverse expressions." : "The narrow spread suggests a focused preference."}

## Design Conditions
${conditionSummary || "No specific conditions."}

## Task
Based on this analysis, create ONE refined architectural concept that:
1. Reflects the user's preference direction on the spectrum
2. Synthesizes the best elements from both original concepts weighted by the user's selections
3. Is specific enough to guide detailed design generation (materials, spatial quality, atmosphere, form)

Respond in JSON format:
{
  "refinedTitle": "コンセプトタイトル (concise, evocative, in Japanese)",
  "refinedDescription": "Detailed description in Japanese (3-5 sentences). Describe the architectural vision, spatial qualities, material palette, atmosphere, and design philosophy. Be specific enough to generate architectural images from this description."
}

Respond ONLY with valid JSON, no markdown fences.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      refinedTitle: parsed.refinedTitle,
      refinedDescription: parsed.refinedDescription,
    });
  } catch (error) {
    console.error("Concept refinement error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
