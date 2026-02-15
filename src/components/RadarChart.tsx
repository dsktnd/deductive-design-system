"use client";

import type { EvaluationScore } from "@/lib/types";

const AXES: { key: keyof EvaluationScore; label: string }[] = [
  { key: "performance", label: "P" },
  { key: "economy", label: "Ec" },
  { key: "context", label: "Cx" },
  { key: "experience", label: "Ex" },
  { key: "social", label: "So" },
  { key: "aesthetics", label: "Ae" },
];

interface RadarChartProps {
  scores: EvaluationScore;
  size?: number;
  showLabels?: boolean;
  fillColor?: string;
  strokeColor?: string;
}

export default function RadarChart({
  scores,
  size = 120,
  showLabels = true,
  fillColor = "rgba(161, 161, 170, 0.15)",
  strokeColor = "rgb(161, 161, 170)",
}: RadarChartProps) {
  const center = size / 2;
  const radius = size / 2 - (showLabels ? 16 : 8);
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  };

  const dataPoints = AXES.map((axis, i) => getPoint(i, scores[axis.key] / 100));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={AXES.map((_, i) => {
            const p = getPoint(i, level);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="rgb(63 63 70)"
          strokeWidth="0.5"
        />
      ))}

      {AXES.map((_, i) => {
        const p = getPoint(i, 1);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgb(63 63 70)"
            strokeWidth="0.5"
          />
        );
      })}

      <polygon
        points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
      />

      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="rgb(212 212 216)" />
      ))}

      {showLabels &&
        AXES.map((axis, i) => {
          const p = getPoint(i, 1);
          const labelOffset = 10;
          const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
          const lx = center + (radius + labelOffset) * Math.cos(angle);
          const ly = center + (radius + labelOffset) * Math.sin(angle);
          return (
            <text
              key={axis.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgb(113 113 122)"
              fontSize="7"
            >
              {axis.label}
            </text>
          );
        })}
    </svg>
  );
}
