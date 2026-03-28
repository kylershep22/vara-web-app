// src/components/brain/FocusWindowIndicator.jsx
// Shows current optimal focus window based on time of day.

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const WINDOWS = [
  {
    label: 'Early Morning',
    range: '6am – 10am',
    startHour: 6,
    endHour: 10,
    description: 'Creative and receptive. Good for learning, journaling, and new skills.',
  },
  {
    label: 'Peak Focus',
    range: '10am – 2pm',
    startHour: 10,
    endHour: 14,
    description: 'Peak focus. Best for deep work and complex tasks.',
  },
  {
    label: 'Afternoon',
    range: '2pm – 5pm',
    startHour: 14,
    endHour: 17,
    description: 'Energy declining. Good for movement, admin, and lighter tasks.',
  },
  {
    label: 'Evening',
    range: '5pm – 12am',
    startHour: 17,
    endHour: 24,
    description: 'Wind-down time. Good for reflection, connection, and breathwork.',
  },
];

function getCurrentWindowIndex() {
  const hour = new Date().getHours();
  for (let i = 0; i < WINDOWS.length; i++) {
    if (hour >= WINDOWS[i].startHour && hour < WINDOWS[i].endHour) return i;
  }
  // Before 6am — treat as evening wind-down (last window)
  return 3;
}

export default function FocusWindowIndicator() {
  const [currentIdx, setCurrentIdx] = useState(getCurrentWindowIndex);

  // Refresh index every minute in case user leaves page open
  useEffect(() => {
    const interval = setInterval(() => setCurrentIdx(getCurrentWindowIndex()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider p-vara-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-vara-lg">
        <Clock size={16} className="text-evergreen-teal shrink-0" />
        <p className="text-[15px] font-semibold text-soft-charcoal">Your Focus Windows</p>
      </div>

      <div className="space-y-vara-sm">
        {WINDOWS.map((w, i) => {
          const isActive = i === currentIdx;
          return (
            <div
              key={w.label}
              className={`rounded-vara-md p-vara-sm transition-all ${
                isActive
                  ? 'border-2 border-evergreen-teal bg-teal-light'
                  : 'border border-divider bg-transparent opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-vara-xs">
                <span className={`text-[13px] font-semibold ${isActive ? 'text-evergreen-teal' : 'text-soft-charcoal'}`}>
                  {w.label}
                </span>
                <span className={`text-[11px] font-medium ${isActive ? 'text-evergreen-teal' : 'text-muted-sage-gray'}`}>
                  {w.range}
                </span>
              </div>
              <p className={`text-[12px] leading-snug ${isActive ? 'text-soft-charcoal' : 'text-muted-sage-gray'}`}>
                {w.description}
              </p>
              {isActive && (
                <span className="inline-block mt-vara-xs text-[11px] font-semibold text-white bg-evergreen-teal rounded-vara-pill px-vara-sm py-vara-2xs">
                  Now
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
