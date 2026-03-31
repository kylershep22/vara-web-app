// src/components/habits/ConsistencyRhythm.jsx

import React from 'react';
import { subDays, format, isToday, parseISO } from 'date-fns';

function getConsistencyMessage(completionDates) {
  const today = new Date();
  const last30 = Array.from({ length: 30 }, (_, i) => format(subDays(today, 29 - i), 'yyyy-MM-dd'));
  const completedSet = new Set(completionDates);

  const last30Count = last30.filter(d => completedSet.has(d)).length;
  const rate = last30Count / 30;

  if (rate >= 0.8) return "You're in a great flow!";

  if (rate >= 0.5) return "Building a solid rhythm.";

  const last7 = last30.slice(-7);
  const last7Count = last7.filter(d => completedSet.has(d)).length;
  if (last7Count >= 3) return "You're building momentum.";

  return "Every journey begins with a single step.";
}

export default function ConsistencyRhythm({ completionDates = [] }) {
  const completedSet = new Set(completionDates);

  // Build a 35-day grid (7 cols x 5 rows), ending today
  const today = new Date();
  const days = Array.from({ length: 35 }, (_, i) => {
    const date = subDays(today, 34 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      dateStr,
      completed: completedSet.has(dateStr),
      isToday: isToday(date),
    };
  });

  const message = getConsistencyMessage(completionDates);

  return (
    <div className="space-y-3">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map(({ dateStr, completed, isToday: today }) => (
          <div
            key={dateStr}
            title={dateStr}
            className={[
              'w-5 h-5 rounded-full mx-auto',
              completed ? 'bg-evergreen-teal' : 'bg-gray-200',
              today ? 'ring-2 ring-offset-1 ring-evergreen-teal' : '',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="text-sm text-muted-sage-gray italic">{message}</p>
    </div>
  );
}
