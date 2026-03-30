import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

function getTodayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildVisibleDays() {
  const days = [];
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: ymd, label: labels[d.getDay()], isToday: i === 0 });
  }
  return days;
}

export default function WeeklyHabitsTracker({ habits, completions, onToggle }) {
  const visibleDays = buildVisibleDays();
  const today = getTodayYMD();

  const activeHabits = habits.filter((h) => h.active !== false);

  if (activeHabits.length === 0) {
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
        <p className="text-vara-sm text-muted-sage-gray text-center">
          No active habits yet. Create one to get started.
        </p>
      </div>
    );
  }

  function isCompleted(habitId, date) {
    return completions.some(
      (c) => c.habitId === habitId && c.dateISO === date
    );
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider overflow-x-auto">
      <h3 className="text-vara-sm font-semibold text-soft-charcoal mb-vara-base">
        This Week
      </h3>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `1fr repeat(7, 40px)` }}
      >
        {/* Header row */}
        <div />
        {visibleDays.map((day) => (
          <div
            key={day.date}
            className={`text-center text-vara-xs font-medium pb-2 ${
              day.isToday ? "text-evergreen-teal" : "text-muted-sage-gray"
            }`}
          >
            {day.label}
          </div>
        ))}

        {/* Habit rows */}
        {activeHabits.map((habit) => (
          <React.Fragment key={habit.id}>
            <div className="text-vara-xs text-soft-charcoal truncate pr-2 flex items-center">
              {habit.name || habit.title}
            </div>
            {visibleDays.map((day) => {
              const completed = isCompleted(habit.id, day.date);
              const isFuture = day.date > today;
              return (
                <div key={day.date} className="flex items-center justify-center">
                  {isFuture ? (
                    <span className="w-5 h-5" />
                  ) : (
                    <button
                      onClick={() => onToggle(habit.id, day.date, !completed)}
                      className="transition-colors"
                      disabled={day.date !== today}
                    >
                      {completed ? (
                        <CheckCircle2
                          size={20}
                          className="text-evergreen-teal"
                        />
                      ) : (
                        <Circle
                          size={20}
                          className={
                            day.date === today
                              ? "text-muted-sage-gray hover:text-evergreen-teal"
                              : "text-gray-200"
                          }
                        />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
