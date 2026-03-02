import { type ResearchJob } from "@/lib/types";

function JobHistory({
  jobs,
  onLoad,
}: {
  jobs: ResearchJob[];
  onLoad: (jobId: string) => void;
}) {
  if (jobs.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Research History
      </h4>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {[...jobs].reverse().map((job) => (
          <button
            key={job.id}
            onClick={() => onLoad(job.id)}
            className="w-full rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800/60"
          >
            <div className="truncate text-sm text-zinc-300">{job.theme}</div>
            <div className="mt-0.5 text-[10px] text-zinc-600">
              {new Date(job.timestamp).toLocaleString()} -- {job.conditions.length} domains
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default JobHistory;
