import React from "react";

const STAGES = [
  { key: "signup", label: "Signup" },
  { key: "onboardingComplete", label: "Onboarding" },
  { key: "firstHabit", label: "First Habit" },
  { key: "active7d", label: "7-Day Active" },
  { key: "retained30d", label: "30-Day Retained" },
];

function conversionColor(rate) {
  if (rate >= 0.7) return "bg-emerald-500";
  if (rate >= 0.4) return "bg-amber-400";
  return "bg-red-400";
}

export default function LifecycleFunnel({ data }) {
  if (!data) return null;

  const maxCount = data.signup || 1;

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        User Lifecycle Funnel
      </h3>
      <div className="space-y-3">
        {STAGES.map((stage, idx) => {
          const count = data[stage.key] ?? 0;
          const prevCount = idx === 0 ? count : (data[STAGES[idx - 1].key] ?? 1);
          const convRate = prevCount > 0 ? count / prevCount : 0;
          const widthPct = maxCount > 0 ? Math.max((count / maxCount) * 100, 8) : 8;

          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-vara-sm font-medium text-soft-charcoal">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-vara-sm font-semibold text-soft-charcoal">{count.toLocaleString()}</span>
                  {idx > 0 && (
                    <span className={`text-vara-xs px-1.5 py-0.5 rounded text-white ${conversionColor(convRate)}`}>
                      {(convRate * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${idx === 0 ? "bg-evergreen-teal" : conversionColor(convRate)}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
