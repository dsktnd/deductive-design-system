import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
        Deductive Design
      </h1>
      <p className="mt-1 text-sm tracking-wider text-zinc-500">
        演繹的デザイン
      </p>
      <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-zinc-400">
        From chains of assertion to continuous exploration. Define research
        conditions, generate continuous design spaces, filter progressively, and
        distill with human judgment.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/research"
          className="rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
        >
          Begin Research
        </Link>
      </div>
    </div>
  );
}
