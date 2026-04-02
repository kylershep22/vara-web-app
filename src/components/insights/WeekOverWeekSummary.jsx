import React from 'react';
import { TrendingUp } from 'lucide-react';

function DeltaIndicator({ delta }) {
  if (delta > 0) {
    return (
      <span className="bg-evergreen-teal/[0.08] text-evergreen-teal text-[10px] font-medium px-2 py-0.5 rounded-[10px] inline-flex">
        +{delta}
      </span>
    );
  }

  if (delta === 0) {
    return (
      <span className="text-[10px] text-muted-sage-gray">same</span>
    );
  }

  // delta < 0
  if (Math.abs(delta) <= 1) {
    return (
      <span className="text-[10px] text-muted-sage-gray">{delta}</span>
    );
  }

  return (
    <span className="bg-soft-coral/[0.08] text-soft-coral text-[10px] font-medium px-2 py-0.5 rounded-[10px] inline-flex">
      {delta}
    </span>
  );
}

export default function WeekOverWeekSummary({ metrics }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-2.5">
        <TrendingUp size={16} className="text-evergreen-teal" />
        <span className="text-[13px] font-medium text-evergreen-teal">
          Compared to last week
        </span>
      </div>

      <div className="flex gap-3">
        {metrics.map((metric, i) => (
          <div
            key={i}
            className="bg-dew-sage/20 rounded-vara-md py-3 px-2 flex-1 text-center"
          >
            <div
              className="text-xl font-medium"
              style={{ color: metric.color }}
            >
              {metric.value}
            </div>
            <div className="text-[11px] text-muted-sage-gray mt-0.5">
              {metric.label}
            </div>
            <div className="mt-1 flex justify-center">
              <DeltaIndicator delta={metric.delta} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
