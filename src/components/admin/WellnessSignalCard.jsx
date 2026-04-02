import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { BRAIN_STATES } from "../../constants/brainStateProtocols";

const STATE_COLORS = {};
BRAIN_STATES.forEach(s => { STATE_COLORS[s.state] = s.color; });

function fmtPct(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

export default function WellnessSignalCard({ data }) {
  if (!data) return null;

  const distribution = data.brainStateDistribution || {};
  const pieData = Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([state, count]) => ({
      name: BRAIN_STATES.find(s => s.state === state)?.label || state,
      value: count,
      color: STATE_COLORS[state] || "#9CA3AF",
    }));

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        Wellness Signal
      </h3>

      {pieData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="mt-vara-sm space-y-0">
        <div className="flex justify-between items-center py-vara-sm border-b border-divider">
          <span className="text-vara-sm text-muted-sage-gray">Protocol Completion</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">{fmtPct(data.protocolCompletionRate)}</span>
        </div>
        <div className="flex justify-between items-center py-vara-sm">
          <span className="text-vara-sm text-muted-sage-gray">Avg Brain Readiness</span>
          <span className="text-vara-sm font-medium text-soft-charcoal">
            {data.avgReadinessScore != null ? `${data.avgReadinessScore}/100` : "--"}
          </span>
        </div>
      </div>
    </div>
  );
}
