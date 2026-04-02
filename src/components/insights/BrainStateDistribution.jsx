import React from 'react';
import { Activity } from 'lucide-react';

const BAR_COLORS = {
  Energized: 'bg-evergreen-teal',
  Clear: 'bg-silver-sage',
  Okay: 'bg-silver-sage',
  Foggy: 'bg-soft-coral',
  Wired: 'bg-[#F4C542]',
};

export default function BrainStateDistribution({
  distribution,
  totalDays,
  positiveStateDays,
  priorPositiveStateDays,
}) {
  const improved =
    priorPositiveStateDays !== null &&
    positiveStateDays > priorPositiveStateDays;

  return (
    <div>
      <div className="flex items-center gap-1 mb-2.5">
        <Activity size={16} className="text-evergreen-teal" />
        <span className="text-[13px] font-medium text-evergreen-teal">
          How you've been feeling
        </span>
      </div>

      <div className="bg-white rounded-vara-lg p-vara-lg border-[0.5px] border-silver-sage/30">
        <div className="flex flex-col gap-2">
          {distribution.map((item) => {
            const widthPct =
              totalDays > 0 ? (item.days / totalDays) * 100 : 0;
            return (
              <div key={item.state} className="flex items-center">
                <span className="w-6 text-center text-[16px]">
                  {item.emoji}
                </span>
                <span className="w-[70px] text-[13px] text-soft-charcoal">
                  {item.state}
                </span>
                <div className="flex-1 h-4 bg-silver-sage/20 rounded-full overflow-hidden">
                  <div
                    className={`h-4 rounded-full ${BAR_COLORS[item.state] || 'bg-silver-sage'}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[12px] text-muted-sage-gray">
                  {item.days}d
                </span>
              </div>
            );
          })}
        </div>

        {priorPositiveStateDays !== null && (
          <p className="mt-2 text-[12px] text-muted-sage-gray">
            You spent {positiveStateDays} of {totalDays} days in Clear or
            Energized states
            {improved && (
              <span className="bg-evergreen-teal/[0.08] text-evergreen-teal text-xs font-medium px-2 py-0.5 rounded-[10px] inline-flex ml-1">
                ↑ vs last week
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
