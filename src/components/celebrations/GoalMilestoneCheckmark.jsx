// src/components/celebrations/GoalMilestoneCheckmark.jsx
import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export default function GoalMilestoneCheckmark({ progress, milestones = [25, 50, 75, 100] }) {
  const [celebratingIndex, setCelebratingIndex] = useState(-1);

  useEffect(() => {
    const reached = milestones.findIndex(
      (m, i) => progress >= m && (i === 0 || progress < milestones[i - 1] + (milestones[i] - milestones[i - 1]))
    );
    if (reached >= 0 && reached !== celebratingIndex) {
      setCelebratingIndex(reached);
    }
  }, [progress, milestones, celebratingIndex]);

  return (
    <div className="flex items-center gap-2">
      {milestones.map((milestone, i) => {
        const reached = progress >= milestone;
        const isCelebrating = i === celebratingIndex && reached;

        return (
          <div key={milestone} className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                reached
                  ? 'bg-evergreen-teal text-white'
                  : 'bg-dew-sage-light text-muted-sage-gray'
              } ${isCelebrating ? 'scale-125 ring-4 ring-evergreen-teal/20' : 'scale-100'}`}
            >
              {reached ? <Check size={16} strokeWidth={3} /> : <span className="text-vara-xs">{milestone}%</span>}
            </div>
            <span className="text-[10px] text-muted-sage-gray">{milestone}%</span>
          </div>
        );
      })}
    </div>
  );
}
