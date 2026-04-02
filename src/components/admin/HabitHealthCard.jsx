import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmtPct(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

const STREAK_ORDER = ["0", "1-3", "4-7", "8-14", "15-30", "30+"];

export default function HabitHealthCard({ data }) {
  if (!data) return null;

  const streakData = data.streakDistribution
    ? STREAK_ORDER.map(bucket => ({
        name: bucket,
        count: data.streakDistribution[bucket] || 0,
      }))
    : [];

  const topCategories = data.topCategories || [];

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        Habit Health
      </h3>

      <div className="space-y-0 mb-vara-sm">
        <div className="flex justify-between items-center py-vara-sm border-b border-divider">
          <span className="text-vara-sm text-muted-sage-gray">Avg Completion Rate</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.avgCompletionRate)}</span>
        </div>
        <div className="flex justify-between items-center py-vara-sm border-b border-divider">
          <span className="text-vara-sm text-muted-sage-gray">Bounce-Back Rate</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.bounceBackRate)}</span>
        </div>
      </div>

      {streakData.length > 0 && (
        <>
          <p className="text-vara-xs text-muted-sage-gray mb-vara-xs">Streak Distribution (days)</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={streakData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2A7C6F" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {topCategories.length > 0 && (
        <div className="mt-vara-sm">
          <p className="text-vara-xs text-muted-sage-gray mb-vara-xs">Top Categories</p>
          {topCategories.map((cat, idx) => (
            <div key={idx} className="flex justify-between items-center py-1">
              <span className="text-vara-xs text-soft-charcoal">{cat.name}</span>
              <span className="text-vara-xs font-medium text-muted-sage-gray">{cat.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
