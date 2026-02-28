import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DOMAIN_INFO: Record<string, { ja: string; en: string; question: string }> = {
  environment: { ja: "環境", en: "Environment", question: "この土地・プロジェクトの環境特性は何か" },
  market: { ja: "マーケット", en: "Market", question: "どのような市場・ターゲット層が想定されるか" },
  culture: { ja: "文化・歴史", en: "Culture / History", question: "この場所の物語は何か" },
  economy: { ja: "経済", en: "Economy", question: "何が実現可能か" },
  society: { ja: "社会", en: "Society", question: "誰のために、何が求められているか" },
  technology: { ja: "技術", en: "Technology", question: "何が技術的に可能か" },
};

interface RequestBody {
  theme: string;
  domain: string;
  existingFindings?: { type: string; text: string }[];
  deepDiveQuestion?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.theme || typeof body.theme !== "string" || body.theme.trim().length === 0) {
    return NextResponse.json({ error: "theme is required" }, { status: 400 });
  }

  if (!body.domain || !DOMAIN_INFO[body.domain]) {
    return NextResponse.json({ error: "Valid domain is required" }, { status: 400 });
  }

  const domainInfo = DOMAIN_INFO[body.domain];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let contextSection = "";
  if (body.existingFindings && body.existingFindings.length > 0) {
    contextSection = `\n\n既存の調査結果（これらと重複しない、より深い知見を提供してください）:\n${body.existingFindings.map((f) => `- [${f.type}] ${f.text}`).join("\n")}`;
  }

  let deepDiveSection = "";
  if (body.deepDiveQuestion) {
    deepDiveSection = `\n\n深掘りの質問: ${body.deepDiveQuestion}\nこの質問に特にフォーカスして、より詳細で具体的な知見を提供してください。`;
  }

  const prompt = `あなたは建築・都市デザインのリサーチャーです。以下のテーマについて、「${domainInfo.ja}（${domainInfo.en}）」の領域に特化してリサーチを行ってください。

テーマ: ${body.theme.trim()}

領域: ${domainInfo.ja}（${domainInfo.en}）
調査の視点: ${domainInfo.question}${contextSection}${deepDiveSection}

以下の形式でJSON回答してください。他の文字は含めないでください:
{
  "findings": [
    { "type": "fact", "text": "事実の記述" },
    { "type": "implication", "text": "示唆の記述" },
    { "type": "risk", "text": "リスクの記述" },
    { "type": "opportunity", "text": "機会の記述" }
  ],
  "notes": "調査結果の要約テキスト",
  "weight": 75,
  "weight_rationale": "なぜこの重要度か",
  "tags": ["tag1", "tag2", "tag3"],
  "related_domains": ["economy", "society"]
}

findingsは各カテゴリ(fact, implication, risk, opportunity)で${body.deepDiveQuestion ? "2-4" : "1-3"}個ずつ提供してください。
weight は 0-100 の重要度スコアです。
related_domains は environment, market, culture, economy, society, technology のうち関連が強いものを選んでください。`;

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
    console.error("Domain research API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
