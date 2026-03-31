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
        <p className="text-vara-sm text-muted-sage-gray text-center py-vara-base">
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
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
      <h3 className="text-vara-sm font-semibold text-soft-charcoal mb-vara-base">
        This Week
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-vara-xs font-medium text-muted-sage-gray pb-3 pr-3 min-w-[120px]">
                Habit
              </th>
              {visibleDays.map((day) => (
                <th
                  key={day.date}
                  className={`text-center pb-3 w-10 ${
                    day.isToday ? "text-evergreen-teal" : "text-muted-sage-gray"
                  }`}
                >
                  <span className="text-vara-xs font-medium">{day.label}</span>
                  {day.isToday && (
                    <div className="w-1 h-1 rounded-full bg-evergreen-teal mx-auto mt-1" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeHabits.map((habit, idx) => (
              <tr
                key={habit.id}
                className={idx !== activeHabits.length - 1 ? "border-b border-divider/30" : ""}
              >
                <td className="text-vara-sm text-soft-charcoal py-3 pr-3 max-w-[180px] truncate">
                  {habit.name || habit.title}
                </td>
                {visibleDays.map((day) => {
                  const completed = isCompleted(habit.id, day.date);
                  const isFuture = day.date > today;
                  const isToday = day.date === today;
                  return (
                    <td
                      key={day.date}
                      className={`text-center py-3 ${isToday ? "bg-teal-light/30 rounded" : ""}`}
                    >
                      {isFuture ? (
                        <span className="w-5 h-5 inline-block" />
                      ) : (
                        <button
                          onClick={() => onToggle(habit, day.date, !completed)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                            isToday && !completed
                              ? "hover:bg-teal-light"
                              : ""
                          }`}
                          disabled={!isToday}
                        >
                          {completed ? (
                            <CheckCircle2
                              size={22}
                              className="text-evergreen-teal"
                            />
                          ) : (
                            <Circle
                              size={22}
                              className={
                                isToday
                                  ? "text-muted-sage-gray hover:text-evergreen-teal"
                                  : "text-gray-200"
                              }
                            />
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
