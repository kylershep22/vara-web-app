import React from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_BUCKETS = [
  { key: "morning", label: "Morning (6a-12p)" },
  { key: "afternoon", label: "Afternoon (12p-6p)" },
  { key: "evening", label: "Evening (6p-12a)" },
];

function intensityColor(value, max) {
  if (max === 0 || value === 0) return "bg-gray-100";
  const ratio = value / max;
  if (ratio >= 0.75) return "bg-teal-600";
  if (ratio >= 0.5) return "bg-teal-400";
  if (ratio >= 0.25) return "bg-teal-200";
  return "bg-teal-100";
}

export default function EngagementHeatmap({ data }) {
  if (!data?.matrix) return null;

  const matrix = data.matrix;
  const allValues = Object.values(matrix);
  const maxVal = Math.max(...allValues, 1);

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        Engagement by Day & Time
      </h3>
      <p className="text-vara-xs text-muted-sage-gray mb-vara-base">Last 7 days. Darker cells mean more activity.</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-vara-xs text-muted-sage-gray font-medium text-left pr-3 pb-2" />
              {TIME_BUCKETS.map(t => (
                <th key={t.key} className="text-vara-xs text-muted-sage-gray font-medium text-center pb-2 px-2">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => (
              <tr key={day}>
                <td className="text-vara-xs font-medium text-soft-charcoal pr-3 py-1">{day}</td>
                {TIME_BUCKETS.map(t => {
                  const val = matrix[`${day}_${t.key}`] || 0;
                  return (
                    <td key={t.key} className="px-2 py-1">
                      <div
                        className={`h-8 rounded ${intensityColor(val, maxVal)} flex items-center justify-center`}
                        title={`${day} ${t.label}: ${val} actions`}
                      >
                        <span className="text-vara-xs font-medium text-soft-charcoal/70">{val || ""}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
