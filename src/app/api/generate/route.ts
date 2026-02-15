import { NextRequest, NextResponse } from "next/server";
import { generateArchitectureImage, type Condition } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: { prompt: string; style?: string; conditions?: Condition[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { prompt, style, conditions } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json(
      { error: "prompt is required and must be a string" },
      { status: 400 }
    );
  }

  try {
    const result = await generateArchitectureImage(
      prompt,
      conditions ?? [],
      style
    );

    if (!result.imageBase64 || !result.mimeType) {
      return NextResponse.json(
        {
          error: "No image was generated",
          text: result.text,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      image: `data:${result.mimeType};base64,${result.imageBase64}`,
      text: result.text,
    });
  } catch (error) {
    console.error("Gemini generation error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
