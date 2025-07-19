import React, { useEffect, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  subMonths,
  addMonths,
} from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export default function GlobalHabitCalendar() {
  const { user } = useAuth();
  const [habitEvents, setHabitEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filters, setFilters] = useState({
    goalId: [],
    status: [],
    type: [],
    trigger: [],
    reward: [],
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  useEffect(() => {
    if (user) fetchAllHabits();
  }, [user]);

  const fetchAllHabits = async () => {
    const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setHabitEvents(events);
  };

  const applyFilters = (habit) => {
    return Object.keys(filters).every((key) => {
      return filters[key].length === 0 || filters[key].includes(habit[key]);
    });
  };

  const isDayMarked = (day, status) =>
    habitEvents.some(
      (habit) =>
        applyFilters(habit) &&
        habit.status === status &&
        habit.datesCompleted?.some((d) => isSameDay(new Date(d), day))
    );

  const getDayHabitCount = (day, status) =>
    habitEvents.filter(
      (habit) =>
        applyFilters(habit) &&
        habit.status === status &&
        habit.datesCompleted?.some((d) => isSameDay(new Date(d), day))
    ).length;

  const uniqueValues = (key) => [
    ...new Set(habitEvents.map((h) => h[key]).filter(Boolean)),
  ];

  const toggleFilterValue = (key, value) => {
    setFilters((prev) => {
      const current = new Set(prev[key]);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [key]: Array.from(current) };
    });
  };

  const clearFilters = () => {
    setFilters({ goalId: [], status: [], type: [], trigger: [], reward: [] });
  };

  return (
    <div className="mt-12">
      {/* Header and Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-[#1B5E57] flex items-center gap-2">
          🗓️ All Habits This Month - {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="space-x-2">
          <button
            className="px-3 py-1 text-sm rounded bg-[#D5E3D1] text-[#1B5E57]"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 text-sm rounded bg-[#D5E3D1] text-[#1B5E57]"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            Next
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
        {['goalId', 'status', 'type', 'trigger', 'reward'].map((key) => (
          <div key={key} className="text-sm">
            <p className="text-[#1B5E57] font-medium mb-1">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </p>
            <div className="flex flex-wrap gap-1">
              {uniqueValues(key).map((val) => (
                <button
                  key={val}
                  onClick={() => toggleFilterValue(key, val)}
                  className={`px-2 py-1 border rounded text-xs ${
                    filters[key].includes(val)
                      ? 'bg-[#1B5E57] text-white border-[#1B5E57]'
                      : 'bg-white text-[#3E3E3E] border-[#D5E3D1]'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={clearFilters}
        className="mb-6 text-sm text-[#1B5E57] underline hover:text-[#3E3E3E]"
      >
        Clear all filters
      </button>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#B8CDBA] rounded"></span>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-[#F4C542] rounded"></span>
          <span>Open</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 text-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-[#9AAE8C] font-medium">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const completed = isDayMarked(day, 'completed');
          const open = isDayMarked(day, 'open');
          const completedCount = getDayHabitCount(day, 'completed');
          const openCount = getDayHabitCount(day, 'open');

          return (
            <div
              key={day.toISOString()}
              className={`h-14 w-14 flex flex-col items-center justify-center rounded-lg text-xs relative border transition-all duration-200
                ${completed
                  ? 'bg-[#B8CDBA] text-white border-[#B8CDBA]'
                  : open
                  ? 'bg-[#F4C542] text-white border-[#F4C542]'
                  : 'bg-[#FAFAF6] text-[#3E3E3E] border-[#D5E3D1]'}
              `}
            >
              <div>{day.getDate()}</div>
              {(completedCount > 0 || openCount > 0) && (
                <div className="text-[10px] mt-1">
                  {completedCount > 0 && `✔️ ${completedCount}`} {openCount > 0 && `🕒 ${openCount}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

