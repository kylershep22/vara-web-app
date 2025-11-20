// src/components/dashboard/HabitTrackerWeekly.jsx

import React, { useState } from 'react';
import { Flame, Circle, CheckCircle2, Edit2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, addDoc, collection, serverTimestamp, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import HabitCreateModal from './HabitCreateModal';
import { useAuth } from '../../context/AuthContext';

const HabitTrackerWeekly = ({ habits, habitCompletions, onComplete, onEdit }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get current week (Mon-Sun)
  const getCurrentWeek = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Adjust to start week on Monday
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + mondayOffset + i);
      days.push({
        date: date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        dateKey: formatDateKey(date),
        isToday: formatDateKey(date) === formatDateKey(new Date())
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

  const days = getCurrentWeek();
  const activeHabits = habits.filter(h => h.active !== false);

  const isHabitCompleted = (habitId, dateKey) => {
    const completions = habitCompletions[habitId] || [];
    return completions.includes(dateKey);
  };

  const handleToggleCompletion = async (habit, dateKey) => {
    const completed = isHabitCompleted(habit.id, dateKey);

    if (completed) {
      // Find and delete the completion
      const q = query(
        collection(db, 'habitCompletions'),
        where('habitId', '==', habit.id),
        where('dateISO', '==', dateKey)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
    } else {
      // Add completion
      await addDoc(collection(db, 'habitCompletions'), {
        userId: habit.userId,
        habitId: habit.id,
        dateISO: dateKey,
        createdAt: serverTimestamp()
      });
    }

    // Trigger parent refresh
    if (onComplete) {
      onComplete(habit.id);
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Create Button Row */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-600">
            Track your habits for the week
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B5E57] text-white rounded-lg text-sm font-medium hover:bg-[#164e48] transition-colors"
          >
            <Plus size={16} />
            Create Habit
          </button>
        </div>

        {/* Header Row */}
        <div className="grid gap-px bg-gray-200 border-b border-gray-200" style={{ gridTemplateColumns: '1fr repeat(7, 56px)' }}>
          <div className="bg-white px-4 py-3">
            <span className="text-xs font-semibold text-gray-600 uppercase">Habit</span>
          </div>
        {days.map((day, idx) => (
          <div key={idx} className={`px-1 py-3 text-center ${day.isToday ? 'bg-emerald-100/80' : 'bg-white'}`}>
            <div className={`text-xs font-semibold ${day.isToday ? 'text-emerald-700' : 'text-gray-700'}`}>
              {day.dayName}
            </div>
            <div className={`text-xs ${day.isToday ? 'text-emerald-600' : 'text-gray-500'}`}>
              {day.dayNumber}
            </div>
          </div>
        ))}
      </div>

      {/* Habit Rows */}
      {activeHabits.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {activeHabits.map((habit, habitIdx) => {
            const streak = habit.streak || 0;
            return (
              <div
                key={habit.id}
                className="grid gap-px bg-gray-200 hover:bg-gray-100 transition-colors group"
                style={{ gridTemplateColumns: '1fr repeat(7, 56px)' }}
              >
                {/* Habit Name Column */}
                <div className="bg-white px-4 py-3 flex items-center justify-between min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {habit.name}
                    </span>
                    {streak > 0 && (
                      <span className="flex items-center gap-1 text-xs text-orange-600 font-semibold whitespace-nowrap">
                        <Flame size={12} />
                        {streak}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onEdit ? onEdit(habit) : navigate('/goals-habits')}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded transition-opacity"
                    title="Edit habit"
                  >
                    <Edit2 size={14} className="text-gray-500" />
                  </button>
                </div>

                {/* Day Dots */}
                {days.map((day, dayIdx) => {
                  const completed = isHabitCompleted(habit.id, day.dateKey);
                  return (
                    <div
                      key={dayIdx}
                      className={`px-1 py-3 flex items-center justify-center ${day.isToday ? 'bg-emerald-100/80' : 'bg-white'}`}
                    >
                      <button
                        onClick={() => handleToggleCompletion(habit, day.dateKey)}
                        className="group/dot transition-transform hover:scale-125"
                        title={`${habit.name} - ${day.dayName} ${day.dayNumber}`}
                      >
                        {completed ? (
                          <CheckCircle2
                            size={24}
                            className="text-emerald-600 fill-emerald-600 transition-colors"
                          />
                        ) : (
                          <Circle
                            size={24}
                            className={`${day.isToday ? 'text-emerald-500' : 'text-gray-300'} group-hover/dot:text-emerald-500 transition-colors`}
                          />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 bg-white">
          <p className="text-sm">No active habits yet</p>
          <button
            onClick={() => navigate('/goals-habits')}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-2"
          >
            Create your first habit →
          </button>
        </div>
      )}

        {/* Legend */}
        <div className="flex items-center gap-6 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 fill-emerald-600" />
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle size={16} className="text-gray-300" />
            <span className="text-gray-600">Not completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-100/80 border border-emerald-300 rounded" />
            <span className="text-gray-600">Today's column</span>
          </div>
        </div>
      </div>

      {/* Create Habit Modal */}
      {showCreateModal && (
        <HabitCreateModal
          userId={user?.uid}
          onClose={() => setShowCreateModal(false)}
          onSave={onComplete}
        />
      )}
    </>
  );
};

export default HabitTrackerWeekly;
