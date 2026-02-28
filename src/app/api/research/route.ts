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

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  let body: { theme: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.theme || typeof body.theme !== "string" || body.theme.trim().length === 0) {
    return NextResponse.json({ error: "theme is required" }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `あなたは建築・都市デザインのリサーチャーです。以下のテーマ・コンセプトについて、6つの領域から多角的にリサーチを行い、それぞれの領域での知見・条件・考慮すべき点を構造化してまとめてください。

テーマ: ${body.theme.trim()}

以下の6領域について、それぞれ調査結果をまとめてください。各領域につき:
- findings: 「事実(fact)」「示唆(implication)」「リスク(risk)」「機会(opportunity)」の4カテゴリに分類した知見（各カテゴリ1-3個）
- notes: 調査結果の要約テキスト
- tags: 3-5個のキータグ（短いキーワード）
- weight: 0-100の重要度
- weight_rationale: なぜこの重要度かの理由（1文）
- related_domains: 関連が強い他のドメイン名の配列

${DOMAINS.map((d, i) => `${i + 1}. ${d.ja}（${d.en}）: ${d.question}`).join("\n")}

以下のJSON形式で回答してください。他の文字は含めないでください:
{
  "domains": {
    "environment": {
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
    },
    "market": { ... },
    "culture": { ... },
    "economy": { ... },
    "society": { ... },
    "technology": { ... }
  }
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse research results", raw: text }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Research API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
