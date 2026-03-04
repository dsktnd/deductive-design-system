import { scoreTextColor } from "./constants";

function OverallScoreDisplay({
  score,
  comment,
  previousScore,
}: {
  score: number;
  comment: string;
  previousScore: number | null;
}) {
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreDelta = previousScore != null ? score - previousScore : null;

  return (
    <div className="flex items-center gap-6 rounded-lg border border-slate-600 bg-slate-800/60 p-5">
      {/* Circular score gauge */}
      <div className="relative flex-shrink-0">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="rgb(39 39 42)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={
              score >= 80
                ? "rgb(16 185 129)"
                : score >= 60
                ? "rgb(161 161 170)"
                : score >= 40
                ? "rgb(245 158 11)"
                : "rgb(248 113 113)"
            }
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-3xl font-bold tabular-nums ${scoreTextColor(score)}`}
          >
            {score}
          </span>
          {scoreDelta != null && scoreDelta !== 0 ? (
            <span
              className={`text-xs font-semibold tabular-nums ${
                scoreDelta > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {scoreDelta > 0 ? "+" : ""}{scoreDelta}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">/ 100</span>
          )}
        </div>
      </div>

      {/* Overall comment */}
      <div className="flex-1">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Overall Evaluation / 総合評価
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{comment}</p>
      </div>
    </div>
  );
}

export default OverallScoreDisplay;
