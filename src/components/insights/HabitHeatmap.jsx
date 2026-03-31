import React from "react";

const COLORS = ["#f3f4f6", "#d1e7dd", "#a3cfbb", "#1B5E57", "#0f3d38"];

function getColor(count) {
  if (count === 0) return COLORS[0];
  if (count === 1) return COLORS[1];
  if (count === 2) return COLORS[2];
  if (count === 3) return COLORS[3];
  return COLORS[4];
}

export default function HabitHeatmap({ data = [] }) {
  const dataMap = new Map(data.map((d) => [d.date, d.count]));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: iso, count: dataMap.get(iso) || 0 });
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-soft-charcoal mb-3">Habit Heatmap</h4>
      <div className="grid grid-cols-6 gap-1.5">
        {days.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${day.count} completions`}
            className="w-full aspect-square rounded-sm"
            style={{ backgroundColor: getColor(day.count) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-sage-gray">
        <span>Less</span>
        {COLORS.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
