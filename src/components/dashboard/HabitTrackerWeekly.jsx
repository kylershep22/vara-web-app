// src/components/dashboard/HabitTrackerWeekly.jsx

import React from 'react';
import { Flame, Check, X } from 'lucide-react';

const HabitTrackerWeekly = ({ habits, habitCompletions, onComplete }) => {
  // Generate last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        dateKey: formatDateKey(date),
        isToday: i === 0
      });
    }
    return days;
  };

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const days = getLast7Days();
  const activeHabits = habits.filter(h => h.active !== false);

  const isHabitCompleted = (habitId, dateKey) => {
    const completions = habitCompletions[habitId] || [];
    return completions.includes(dateKey);
  };

  const todayKey = formatDateKey(new Date());

  return (
    <div className="space-y-4">
      {/* Header - Days of the week */}
      <div className="grid grid-cols-8 gap-2 text-center mb-2">
        <div className="text-xs font-medium text-gray-500">Habit</div>
        {days.map((day, idx) => (
          <div key={idx} className="text-xs">
            <div className={`font-semibold ${day.isToday ? 'text-[#1B5E57]' : 'text-gray-700'}`}>
              {day.dayName}
            </div>
            <div className={`text-xs ${day.isToday ? 'text-[#1B5E57]' : 'text-gray-500'}`}>
              {day.dayNumber}
            </div>
          </div>
        ))}
      </div>

      {/* Habit Rows */}
      <div className="space-y-3">
        {activeHabits.length > 0 ? (
          activeHabits.map(habit => {
            const streak = habit.streak || 0;
            return (
              <div key={habit.id} className="grid grid-cols-8 gap-2 items-center">
                {/* Habit Name with Streak */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate" title={habit.name}>
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <span className="flex items-center gap-1 text-xs text-orange-600 font-semibold whitespace-nowrap">
                      <Flame size={12} />
                      {streak}
                    </span>
                  )}
                </div>

                {/* 7-day Grid */}
                {days.map((day, idx) => {
                  const completed = isHabitCompleted(habit.id, day.dateKey);
                  const isToday = day.dateKey === todayKey;

                  return (
                    <button
                      key={idx}
                      onClick={() => isToday && onComplete(habit.id)}
                      disabled={!isToday}
                      className={`
                        aspect-square rounded-lg flex items-center justify-center transition-all
                        ${completed
                          ? 'bg-green-500 hover:bg-green-600 shadow-sm'
                          : isToday
                          ? 'bg-gray-100 border-2 border-dashed border-gray-300 hover:border-[#1B5E57] hover:bg-[#1B5E57]/5'
                          : 'bg-gray-50 border border-gray-200'
                        }
                        ${isToday && !completed ? 'cursor-pointer' : 'cursor-default'}
                      `}
                      title={`${habit.name} - ${day.dayName} ${day.dayNumber}`}
                    >
                      {completed ? (
                        <Check size={16} className="text-white" />
                      ) : (
                        isToday && <div className="w-2 h-2 rounded-full bg-gray-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No active habits yet</p>
            <p className="text-sm mt-1">Create habits to start tracking</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500 flex items-center justify-center">
            <Check size={12} className="text-white" />
          </div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          </div>
          <span>Today (click to complete)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-50 border border-gray-200" />
          <span>Missed</span>
        </div>
      </div>
    </div>
  );
};

export default HabitTrackerWeekly;
