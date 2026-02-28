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
    domain: string;
    domainJa: string;
    score: number;
    comment: string;
    improvements: string[];
    concept: { title: string; description: string };
    conditions: { domain: string; weight: number; notes: string; tags?: string[] }[];
    detailImageKeys: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, domainJa, score, comment, improvements, concept, conditions, detailImageKeys } = body;

  if (!domain || !concept) {
    return NextResponse.json(
      { error: "domain and concept are required" },
      { status: 400 }
    );
  }

  const domainCondition = conditions.find((c) => c.domain === domain);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are an architectural design improvement consultant. A design was evaluated and the "${domainJa}" (${domain}) domain scored ${score}/100, which is below target.

## Current Concept
Title: "${concept.title}"
${concept.description}

## Domain Condition
${domainCondition ? `${domainCondition.domain} (weight: ${domainCondition.weight}): ${domainCondition.notes}${domainCondition.tags?.length ? ` [${domainCondition.tags.join(", ")}]` : ""}` : domain}

## Current Evaluation
Score: ${score}/100
Comment: ${comment}
Identified improvements needed: ${improvements.join("; ")}

## Detail Images Available
${detailImageKeys.map((k) => `- ${k}`).join("\n")}

## Task
Provide concrete, actionable improvement suggestions for this domain. For each suggestion, also indicate which detail image(s) should be regenerated to implement the improvement, and provide a prompt hint for regenerating that image.

Respond in JSON format:
{
  "suggestions": [
    "具体的な改善提案1（日本語）",
    "具体的な改善提案2（日本語）",
    "具体的な改善提案3（日本語）"
  ],
  "revisedPromptHints": [
    { "targetImage": "exterior", "hint": "改善のためのプロンプトヒント（日本語）" },
    { "targetImage": "interior", "hint": "改善のためのプロンプトヒント（日本語）" }
  ]
}

Provide 2-4 suggestions and 1-3 prompt hints targeting the most relevant images. Respond ONLY with valid JSON, no markdown fences.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      suggestions: parsed.suggestions || [],
      revisedPromptHints: parsed.revisedPromptHints || [],
    });
  } catch (error) {
    console.error("Improvement suggestion error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
