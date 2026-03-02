import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DOMAINS = [
  { key: "environment", ja: "環境", en: "Environment", question: "この土地・プロジェクトの環境特性は何か" },
  { key: "market", ja: "マーケット", en: "Market", question: "どのような市場・ターゲット層が想定されるか" },
  { key: "culture", ja: "文化・歴史", en: "Culture / History", question: "この場所の物語は何か" },
  { key: "economy", ja: "経済", en: "Economy", question: "何が実現可能か" },
  { key: "society", ja: "社会", en: "Society", question: "誰のために、何が求められているか" },
  { key: "technology", ja: "技術", en: "Technology", question: "何が技術的に可能か" },
];

function buildDomainPrompt(theme: string, domain: typeof DOMAINS[number]): string {
  return `あなたは建築・都市デザインのリサーチャーです。以下のテーマについて、「${domain.ja}（${domain.en}）」の観点からリサーチを行ってください。

テーマ: ${theme}

問い: ${domain.question}

以下の形式でJSONのみ回答してください:
{
  "findings": [
    { "type": "fact", "text": "事実の記述" },
    { "type": "implication", "text": "示唆の記述" },
    { "type": "risk", "text": "リスクの記述" },
    { "type": "opportunity", "text": "機会の記述" }
  ],
  "notes": "調査結果の要約テキスト",
  "tags": ["tag1", "tag2", "tag3"],
  "weight": 75,
  "weight_rationale": "なぜこの重要度か",
  "related_domains": ["economy", "society"]
}

findings は各カテゴリ1-3個、tags は3-5個のキータグ、weight は0-100の重要度、related_domainsは関連が強い他のドメイン名（${DOMAINS.map(d => d.key).join(", ")}から選択）。`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  let body: { theme: string; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.theme || typeof body.theme !== "string" || body.theme.trim().length === 0) {
    return NextResponse.json({ error: "theme is required" }, { status: 400 });
  }

  const theme = body.theme.trim();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // SSE streaming mode: each domain streams back as it completes
  if (body.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Fire all domain requests in parallel
        const promises = DOMAINS.map(async (domain) => {
          try {
            const prompt = buildDomainPrompt(theme, domain);
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", domain: domain.key, error: "Failed to parse" })}\n\n`)
              );
              return;
            }
            const parsed = JSON.parse(jsonMatch[0]);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "domain", domain: domain.key, result: parsed })}\n\n`)
            );
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", domain: domain.key, error: message })}\n\n`)
            );
          }
        });

        await Promise.all(promises);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Legacy non-streaming mode (backward compatible)
  const allDomains: Record<string, unknown> = {};
  const promises = DOMAINS.map(async (domain) => {
    try {
      const prompt = buildDomainPrompt(theme, domain);
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        allDomains[domain.key] = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // skip failed domain
    }
  });

  await Promise.all(promises);
  return NextResponse.json({ domains: allDomains });
}
