import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * PCA 2D projection via power iteration on the covariance matrix.
 * Returns positions normalized to [-1, 1].
 */
function pcaProject2D(vectors: number[][]): [number, number][] {
  const n = vectors.length;
  if (n === 0) return [];
  if (n === 1) return [[0, 0]];

  const dim = vectors[0].length;

  // Compute mean
  const mean = new Float64Array(dim);
  for (let i = 0; i < n; i++) {
    for (let d = 0; d < dim; d++) {
      mean[d] += vectors[i][d];
    }
  }
  for (let d = 0; d < dim; d++) mean[d] /= n;

  // Center the data
  const centered = vectors.map((v) => v.map((val, d) => val - mean[d]));

  // Compute covariance matrix (dim x dim)
  const cov = Array.from({ length: dim }, () => new Float64Array(dim));
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < dim; a++) {
      for (let b = a; b < dim; b++) {
        const val = centered[i][a] * centered[i][b];
        cov[a][b] += val;
        if (a !== b) cov[b][a] += val;
      }
    }
  }
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      cov[a][b] /= n - 1;
    }
  }

  // Power iteration to find top eigenvector
  function powerIteration(
    matrix: Float64Array[],
    deflateVec?: number[]
  ): number[] {
    const d = matrix.length;
    let vec = Array.from({ length: d }, () => Math.random() - 0.5);
    const ITERS = 100;

    for (let iter = 0; iter < ITERS; iter++) {
      // Matrix-vector multiply
      const next = new Array(d).fill(0);
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          next[i] += matrix[i][j] * vec[j];
        }
      }

      // Deflate if needed
      if (deflateVec) {
        let dot = 0;
        for (let i = 0; i < d; i++) dot += next[i] * deflateVec[i];
        for (let i = 0; i < d; i++) next[i] -= dot * deflateVec[i];
      }

      // Normalize
      let norm = 0;
      for (let i = 0; i < d; i++) norm += next[i] * next[i];
      norm = Math.sqrt(norm);
      if (norm < 1e-10) break;
      for (let i = 0; i < d; i++) next[i] /= norm;

      vec = next;
    }
    return vec;
  }

  const pc1 = powerIteration(cov);
  const pc2 = powerIteration(cov, pc1);

  // Project centered data onto PC1 and PC2
  const positions: [number, number][] = centered.map((row) => {
    let x = 0,
      y = 0;
    for (let d = 0; d < dim; d++) {
      x += row[d] * pc1[d];
      y += row[d] * pc2[d];
    }
    return [x, y];
  });

  // Normalize to [-1, 1]
  let maxAbs = 0;
  for (const [x, y] of positions) {
    maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(y));
  }
  if (maxAbs > 1e-10) {
    for (const pos of positions) {
      pos[0] /= maxAbs;
      pos[1] /= maxAbs;
    }
  }

  return positions;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: { keywords: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !Array.isArray(body.keywords) ||
    body.keywords.length === 0 ||
    !body.keywords.every((k) => typeof k === "string")
  ) {
    return NextResponse.json(
      { error: "keywords must be a non-empty string array" },
      { status: 400 }
    );
  }

  const keywords = body.keywords;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // Batch embed all keywords in one API call
    const batchResult = await model.batchEmbedContents({
      requests: keywords.map((kw) => ({
        model: "models/text-embedding-004",
        content: { role: "user", parts: [{ text: kw }] },
      })),
    });
    const embeddings = batchResult.embeddings.map((e) => e.values);

    // PCA 2D projection
    const positions = pcaProject2D(embeddings);

    return NextResponse.json({ positions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Embedding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
