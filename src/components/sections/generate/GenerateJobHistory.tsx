import { ABSTRACTION_LEVELS } from "@/lib/gemini";
import type { GenerateJob } from "@/lib/types";

function GenerateJobHistory({ jobs }: { jobs: GenerateJob[] }) {
  if (jobs.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Generation History
      </h4>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {[...jobs].reverse().map((job) => {
          const levelInfo = ABSTRACTION_LEVELS.find((l) => l.level === job.abstractionLevel);
          return (
            <div
              key={job.id}
              className="rounded border border-slate-700 bg-slate-800/40 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {levelInfo && (
                  <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {levelInfo.label}
                  </span>
                )}
                <span className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {job.style}
                </span>
                <span className="text-[10px] text-slate-500">
                  {job.images.length} image{job.images.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-slate-400">{job.basePrompt}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {new Date(job.timestamp).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GenerateJobHistory;
