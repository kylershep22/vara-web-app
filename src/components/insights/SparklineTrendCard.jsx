import React from "react";

function Sparkline({ points, width = 80, height = 24 }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="#1B5E57"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SparklineTrendCard({ label, value, points = [], trend = "steady" }) {
  const trendConfig = {
    improving: { label: "Improving", color: "text-evergreen-teal" },
    steady: { label: "Steady", color: "text-muted-sage-gray" },
    needs_attention: { label: "Needs attention", color: "text-amber-600" },
  };
  const t = trendConfig[trend] || trendConfig.steady;

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-4">
      <p className="text-xs text-muted-sage-gray mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold text-soft-charcoal">{value}</span>
        <Sparkline points={points} />
      </div>
      <p className={`text-xs mt-2 font-medium ${t.color}`}>{t.label}</p>
    </div>
  );
}
