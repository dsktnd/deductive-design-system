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
    configA: Record<string, unknown>;
    configB: Record<string, unknown>;
    ratios: number[];
    theme: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { configA, configB, ratios, theme } = body;

  if (!configA || !configB) {
    return NextResponse.json(
      { error: "configA and configB are required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(ratios) || ratios.length === 0 || ratios.some((r) => typeof r !== "number" || r < 0 || r > 100)) {
    return NextResponse.json(
      { error: "ratios must be a non-empty array of numbers between 0 and 100" },
      { status: 400 }
    );
  }

  const axes = [
    { key: "boundary", labelJa: "境界", extract: (c: Record<string, unknown>) => (c.boundary as Record<string, unknown>)?.strategy ?? null },
    { key: "spatial", labelJa: "空間構造", extract: (c: Record<string, unknown>) => (c.spatial as Record<string, unknown>)?.topology ?? null },
    { key: "ground", labelJa: "大地", extract: (c: Record<string, unknown>) => (c.ground as Record<string, unknown>)?.relation ?? null },
    { key: "light", labelJa: "光", extract: (c: Record<string, unknown>) => (c.light as Record<string, unknown>)?.source_strategy ?? null },
    { key: "movement", labelJa: "動線", extract: (c: Record<string, unknown>) => ((c.movement as Record<string, unknown>)?.path_topology as Record<string, unknown>)?.type ?? null },
    { key: "scale", labelJa: "スケール", extract: (c: Record<string, unknown>) => (c.scale as Record<string, unknown>)?.human_relation ?? null },
    { key: "social", labelJa: "公私", extract: (c: Record<string, unknown>) => (c.social_gradient as Record<string, unknown>)?.type ?? null },
    { key: "tectonic", labelJa: "構造", extract: (c: Record<string, unknown>) => (c.tectonic as Record<string, unknown>)?.expression ?? null },
    { key: "material", labelJa: "素材", extract: (c: Record<string, unknown>) => (c.material as Record<string, unknown>)?.weight_impression ?? null },
    { key: "color", labelJa: "色彩", extract: (c: Record<string, unknown>) => (c.color as Record<string, unknown>)?.presence ?? null },
    { key: "section", labelJa: "断面", extract: (c: Record<string, unknown>) => (c.section as Record<string, unknown>)?.dominant_profile ?? null },
    { key: "facade", labelJa: "外内関係", extract: (c: Record<string, unknown>) => (c.facade_interior_relationship as Record<string, unknown>)?.type ?? null },
  ];

  const axisEntries = axes.map((a) => ({
    axis: a.key,
    labelJa: a.labelJa,
    valueA: a.extract(configA) as string | null,
    valueB: a.extract(configB) as string | null,
  }));

  const axisText = axisEntries
    .map((e) => `- ${e.labelJa} (${e.axis}): A="${e.valueA ?? "null"}", B="${e.valueB ?? "null"}"`)
    .join("\n");

  const ratioList = ratios.map((r) => `  - A ${100 - r}% / B ${r}%`).join("\n");

  const prompt = `You are an architectural design linguist. Given two architectural configurations (Concept A and Concept B) and multiple blend ratios, generate a single architectural keyword for each axis at each ratio that represents the intermediate state between A and B.

## Project Theme
${theme || "Architectural design project"}

## Blend Ratios
${ratioList}

## Axes (A value → B value)
${axisText}

## Task
For EACH ratio listed above, and for EACH axis, produce a single English architectural keyword that captures the intermediate quality. The keyword should be:
- A real architectural/spatial term (not a made-up compound)
- Evocative and precise — keywords should DIFFER across ratios to reflect the gradient
- If A and B are the same, return that same value
- If one side is null, lean toward the non-null side
- If both are null, return null

Also generate 3-5 "summary" keywords (in Japanese) per ratio that capture the overall blended architectural character at that point.

Respond ONLY with valid JSON (no markdown fences):
{
  "results": [
    {
      "ratio": ${ratios[0]},
      "keywords": [
        { "axis": "boundary", "blended": "porous" },
        { "axis": "spatial", "blended": "clustered" }
      ],
      "summary": ["透過性", "半地下", "拡散光"]
    }
  ]
}

Return one entry per ratio in the "results" array, in the same order as listed above.`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const results = (parsed.results ?? []).map((entry: { ratio: number; keywords: { axis: string; blended: string }[]; summary: string[] }) => {
      const keywordMap = new Map<string, string>();
      for (const kw of entry.keywords ?? []) {
        keywordMap.set(kw.axis, kw.blended);
      }

      return {
        ratio: entry.ratio,
        keywords: axisEntries.map((e) => ({
          axis: e.axis,
          labelJa: e.labelJa,
          valueA: e.valueA,
          valueB: e.valueB,
          blended: keywordMap.get(e.axis) ?? null,
        })),
        summary: entry.summary ?? [],
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Blend keywords generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
