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
    researchTheme: string;
    refinedConcept: { title: string; description: string };
    conditions: { domain: string; weight: number; notes: string; tags?: string[] }[];
    detailImages: { key: string; text: string | null; prompt: string }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { researchTheme, refinedConcept, conditions, detailImages } = body;

  if (!refinedConcept || !conditions?.length || !detailImages?.length) {
    return NextResponse.json(
      { error: "refinedConcept, conditions, and detailImages are required" },
      { status: 400 }
    );
  }

  const domainJaMap: Record<string, string> = {
    environment: "環境",
    market: "市場",
    culture: "文化",
    economy: "経済",
    society: "社会",
    technology: "技術",
  };

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const conditionsList = conditions
    .map((c) => `- ${c.domain} (weight: ${c.weight}): ${c.notes}${c.tags?.length ? ` [${c.tags.join(", ")}]` : ""}`)
    .join("\n");

  const imageDescriptions = detailImages
    .map((img) => `### ${img.key}\nPrompt: ${img.prompt}\n${img.text ? `AI Description: ${img.text}` : "(No text description)"}`)
    .join("\n\n");

  const prompt = `You are an architectural design evaluator. Evaluate how well the final design proposal reflects each research condition domain.

## Project Theme
${researchTheme || "Architectural design project"}

## Refined Concept
Title: "${refinedConcept.title}"
${refinedConcept.description}

## Research Conditions (6 domains)
${conditionsList}

## Final Design Images (text descriptions)
${imageDescriptions}

## Task
For each of the following 6 domains, evaluate how well the final design (described above) reflects and addresses the research conditions set for that domain. Consider all 5 detail images collectively.

Domains to evaluate: environment, market, culture, economy, society, technology

For each domain:
1. Score from 0-100 how well the design addresses this domain's conditions
2. Provide a concise comment (2-3 sentences in Japanese) explaining what aspects of the design reflect this domain and what could be improved
3. List 1-3 strengths (short phrases in Japanese) where the design excels for this domain
4. List 1-3 improvements (short phrases in Japanese) that could better address this domain

Also provide:
- An overall score (weighted average considering condition weights)
- An overall comment (2-3 sentences in Japanese) summarizing the design's comprehensive evaluation

Respond in JSON format:
{
  "evaluations": [
    { "domain": "environment", "domainJa": "環境", "score": 75, "comment": "...", "strengths": ["..."], "improvements": ["..."] },
    { "domain": "market", "domainJa": "市場", "score": 60, "comment": "...", "strengths": ["..."], "improvements": ["..."] },
    { "domain": "culture", "domainJa": "文化", "score": 80, "comment": "...", "strengths": ["..."], "improvements": ["..."] },
    { "domain": "economy", "domainJa": "経済", "score": 65, "comment": "...", "strengths": ["..."], "improvements": ["..."] },
    { "domain": "society", "domainJa": "社会", "score": 70, "comment": "...", "strengths": ["..."], "improvements": ["..."] },
    { "domain": "technology", "domainJa": "技術", "score": 55, "comment": "...", "strengths": ["..."], "improvements": ["..."] }
  ],
  "overallScore": 68,
  "overallComment": "..."
}

Respond ONLY with valid JSON, no markdown fences.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Ensure domainJa is populated
    const evaluations = (parsed.evaluations || []).map((e: Record<string, unknown>) => ({
      ...e,
      domainJa: e.domainJa || domainJaMap[e.domain as string] || e.domain,
      strengths: e.strengths || [],
      improvements: e.improvements || [],
    }));

    return NextResponse.json({
      evaluations,
      overallScore: parsed.overallScore ?? Math.round(evaluations.reduce((sum: number, e: { score: number }) => sum + e.score, 0) / evaluations.length),
      overallComment: parsed.overallComment ?? "",
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
