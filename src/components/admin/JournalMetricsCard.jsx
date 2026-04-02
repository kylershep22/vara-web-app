import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const MOOD_ORDER = ["great", "good", "okay", "low", "difficult"];
const MOOD_COLORS = {
  great: "#10B981",
  good: "#6BB8A4",
  okay: "#9CA3AF",
  low: "#FBBF24",
  difficult: "#F87171",
};

function fmtPct(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

export default function JournalMetricsCard({ data }) {
  if (!data) return null;

  const moodData = data.moodDistribution
    ? MOOD_ORDER.map(mood => ({
        name: mood.charAt(0).toUpperCase() + mood.slice(1),
        count: data.moodDistribution[mood] || 0,
        color: MOOD_COLORS[mood] || "#9CA3AF",
      })).filter(d => d.count > 0)
    : [];

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        Journal & Reflection
      </h3>

      {moodData.length > 0 && (
        <>
          <p className="text-vara-xs text-muted-sage-gray mb-vara-xs">Mood Distribution (30 days)</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={moodData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {moodData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      <div className="mt-vara-sm space-y-0">
        <div className="flex justify-between items-center py-vara-sm border-b border-divider">
          <span className="text-vara-sm text-muted-sage-gray">Journaling Rate (7d)</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.journalingRate)}</span>
        </div>
        <div className="flex justify-between items-center py-vara-sm">
          <span className="text-vara-sm text-muted-sage-gray">Reflection Completion</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.reflectionCompletionRate)}</span>
        </div>
      </div>
    </div>
  );
}
