import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface SelectedKeyword {
  text: string;
  domain: string;
  findings: string[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  let body: { theme: string; selectedKeywords: SelectedKeyword[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.theme || !body.selectedKeywords || body.selectedKeywords.length === 0) {
    return NextResponse.json({ error: "theme and selectedKeywords are required" }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const keywordSummary = body.selectedKeywords
    .map((kw) => {
      const findingsText = kw.findings.length > 0
        ? `\n    根拠: ${kw.findings.join(" / ")}`
        : "";
      return `  - ${kw.text} (${kw.domain})${findingsText}`;
    })
    .join("\n");

  const prompt = `あなたは建築デザインのコンセプトストラテジストです。以下のリサーチから抽出されたキーワード群に基づいて、2つの対照的な建築コンセプト方向性を提案してください。

テーマ: ${body.theme.trim()}

選択されたキーワード:
${keywordSummary}

要件:
1. 2つのコンセプトは対比・緊張関係にあること（例: 閉鎖的 vs 開放的、伝統的 vs 革新的、環境共生 vs 都市密度）
2. どちらも選択されたキーワードとその根拠に基づくこと
3. どちらも建築的に実現可能で魅力的であること
4. タイトルは短く（2-4語）、日本語で
5. 説明は1-2文で、建築的な方向性を具体的に記述
6. relatedDomainsには最も関連する領域のキー（environment, market, culture, economy, society, technology）を2-3個選択

以下のJSON形式で回答してください。他の文字は含めないでください:
{
  "concepts": [
    {
      "id": "concept-a",
      "title": "コンセプトAのタイトル",
      "description": "コンセプトAの建築的方向性の説明。具体的な空間・構造・素材の方向性を含む。",
      "relatedDomains": ["domain1", "domain2"]
    },
    {
      "id": "concept-b",
      "title": "コンセプトBのタイトル",
      "description": "コンセプトBの建築的方向性の説明。具体的な空間・構造・素材の方向性を含む。",
      "relatedDomains": ["domain1", "domain2"]
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse concept results", raw: text }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Concepts API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
