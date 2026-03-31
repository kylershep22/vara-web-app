// src/components/dashboard/WeeklyHabitsCard.jsx

import React from 'react';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const WeeklyHabitsCard = ({ habits = [], completions = {}, visibleDays = [], onToggle }) => {
  const visibleHabits = habits.slice(0, 5);
  const hasMore = habits.length > 5;

  const isCompleted = (habitId, date) => {
    const dates = completions[habitId] || [];
    return dates.includes(date);
  };

  if (habits.length === 0) {
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md overflow-hidden">
        <div className="p-vara-lg text-center py-12">
          <p className="text-sm text-muted-sage-gray">No active habits yet</p>
          <Link
            to="/goals-habits"
            className="text-sm text-evergreen-teal font-medium mt-2 inline-block hover:underline"
          >
            Create your first habit →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md overflow-hidden">
      {/* Header row */}
      <div
        className="grid border-b border-divider"
        style={{ gridTemplateColumns: '1fr repeat(7, 40px)' }}
      >
        {/* Habit label cell */}
        <div className="px-4 py-3 flex items-center">
          <span className="text-xs font-semibold text-muted-sage-gray uppercase tracking-wide">
            Habit
          </span>
        </div>

        {/* Day header cells */}
        {visibleDays.map((day) => (
          <div
            key={day.date}
            className={`flex flex-col items-center justify-center py-3 ${
              day.isToday ? 'bg-teal-light' : ''
            }`}
          >
            <span
              className={`text-xs font-semibold ${
                day.isToday ? 'text-evergreen-teal' : 'text-soft-charcoal'
              }`}
            >
              {day.dayName}
            </span>
            <span
              className={`text-xs ${
                day.isToday ? 'text-evergreen-teal font-semibold' : 'text-muted-sage-gray'
              }`}
            >
              {day.dayNumber}
            </span>
          </div>
        ))}
      </div>

      {/* Habit rows */}
      <div className="divide-y divide-divider">
        {visibleHabits.map((habit) => (
          <div
            key={habit.id}
            className="grid hover:bg-gray-50 transition-colors"
            style={{ gridTemplateColumns: '1fr repeat(7, 40px)' }}
          >
            {/* Habit name */}
            <div className="px-4 py-3 flex items-center min-w-0">
              <span className="text-sm font-medium text-soft-charcoal truncate">
                {habit.name}
              </span>
            </div>

            {/* Dot cells */}
            {visibleDays.map((day) => {
              const done = isCompleted(habit.id, day.date);
              const isFuture = new Date(day.date) > new Date(new Date().toDateString());

              return (
                <div
                  key={day.date}
                  className={`flex items-center justify-center py-3 ${
                    day.isToday ? 'bg-teal-light' : ''
                  }`}
                >
                  <button
                    onClick={() => !isFuture && onToggle && onToggle(habit.id, day.date)}
                    disabled={isFuture}
                    className={`
                      w-6 h-6 flex items-center justify-center transition-transform
                      ${isFuture ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}
                    `}
                    aria-label={`${done ? 'Completed' : 'Not completed'}: ${habit.name} on ${day.dayName} ${day.dayNumber}`}
                    aria-pressed={done}
                  >
                    {done ? (
                      <CheckCircle2
                        size={24}
                        className="text-evergreen-teal fill-evergreen-teal"
                      />
                    ) : (
                      <Circle
                        size={24}
                        className={
                          day.isToday
                            ? 'text-evergreen-teal'
                            : 'text-muted-sage-gray/60'
                        }
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* View all link */}
      {hasMore && (
        <div className="px-4 py-3 border-t border-divider bg-gray-50">
          <Link
            to="/habits"
            className="inline-flex items-center gap-1 text-sm text-evergreen-teal font-medium hover:underline"
          >
            View all {habits.length} habits
            <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
};

export default WeeklyHabitsCard;
