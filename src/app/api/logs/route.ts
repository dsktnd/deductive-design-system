import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, readFile } from "fs/promises";
import path from "path";

const LOGS_DIR = path.join(process.cwd(), "logs");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await mkdir(LOGS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `process-log-${timestamp}.json`;
    const filepath = path.join(LOGS_DIR, filename);

    await writeFile(filepath, JSON.stringify(body, null, 2), "utf-8");

    return NextResponse.json({ success: true, filename, path: filepath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save log";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await mkdir(LOGS_DIR, { recursive: true });
    const files = await readdir(LOGS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

    const logs = await Promise.all(
      jsonFiles.slice(0, 20).map(async (f) => {
        const content = await readFile(path.join(LOGS_DIR, f), "utf-8");
        return { filename: f, data: JSON.parse(content) };
      })
    );

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to read logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
