import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function CalendarView({ userId, goalId }) {
  const today = new Date();
  const days = eachDayOfInterval({
    start: startOfMonth(today),
    end: endOfMonth(today),
  });

  return (
    <div className="grid grid-cols-7 gap-2 text-sm">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <div key={d} className="text-center text-[#9AAE8C] font-medium">
          {d}
        </div>
      ))}

      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={`h-10 w-10 flex items-center justify-center rounded-lg text-xs
            ${
              format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                ? 'bg-[#B8CDBA] text-white font-semibold'
                : 'bg-[#FAFAF6] border border-[#D5E3D1] text-[#3E3E3E]'
            }
          `}
        >
          {day.getDate()}
        </div>
      ))}
    </div>
  );
}
