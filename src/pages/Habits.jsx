// src/pages/Habits.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Leaf, CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import SidebarLayout from '../components/layout/SidebarLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import HabitCompletionModal from '../components/habits/HabitCompletionModal';
import HabitCreationForm from '../components/habits/HabitCreationForm';
import HabitDetailPanel from '../components/habits/HabitDetailPanel';
import { removeHabit } from '../services/db/habits.service';

const CATEGORY_COLORS = {
  'Sleep': 'bg-blue-100 text-blue-700',
  'Focus & Clarity': 'bg-purple-100 text-purple-700',
  'Movement': 'bg-orange-100 text-orange-700',
  'Mindfulness': 'bg-teal-100 text-teal-700',
  'Connection': 'bg-pink-100 text-pink-700',
  'General': 'bg-gray-100 text-gray-600',
};

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['General'];
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-evergreen-teal border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center">
        <Leaf size={28} className="text-evergreen-teal" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-soft-charcoal">Your habits live here</h3>
        <p className="text-muted-sage-gray text-sm mt-1 max-w-xs">
          Start with one small thing that feels manageable.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-evergreen-teal text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Plus size={16} />
        Add a habit
      </button>
    </div>
  );
}

export default function Habits() {
  const { user } = useAuth();

  const [habits, setHabits] = useState([]);
  const [completionsByHabit, setCompletionsByHabit] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [completionModal, setCompletionModal] = useState(null); // { habit }
  const [detailPanel, setDetailPanel] = useState(null); // habit

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'EEEE, MMMM d');

  // Load completions for all habits
  const loadCompletions = useCallback(async (habitList) => {
    if (!habitList.length) return;
    const results = {};
    await Promise.all(
      habitList.map(async (habit) => {
        try {
          const snap = await getDocs(collection(db, 'habits', habit.id, 'completions'));
          results[habit.id] = snap.docs.map(d => d.id); // doc IDs are YYYY-MM-DD strings
        } catch {
          results[habit.id] = [];
        }
      })
    );
    setCompletionsByHabit(results);
  }, []);

  // Subscribe to habits
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'habits'),
      where('userId', '==', user.uid),
      where('active', '==', true)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHabits(data);
        setLoading(false);
        loadCompletions(data);
      },
      (err) => {
        console.error('Error loading habits:', err);
        setError('Failed to load habits.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, loadCompletions]);

  const isCompletedToday = (habitId) => {
    return (completionsByHabit[habitId] || []).includes(todayStr);
  };

  const handleToggleCompletion = (habit) => {
    if (isCompletedToday(habit.id)) return; // already done today
    setCompletionModal({ habit });
  };

  const handleCompletionSaved = (habitId, date) => {
    setCompletionsByHabit(prev => ({
      ...prev,
      [habitId]: [...(prev[habitId] || []), date],
    }));
  };

  const handleHabitCreated = (habit) => {
    setShowCreateForm(false);
    // onSnapshot will pick up the new habit automatically
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      await removeHabit(habitId);
      setDetailPanel(null);
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-soft-charcoal">Habits</h1>
            <p className="text-muted-sage-gray text-sm mt-0.5">
              Build consistency, one day at a time
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-evergreen-teal text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0 ml-4"
          >
            <Plus size={16} />
            Add Habit
          </button>
        </div>

        {/* Today banner */}
        <div className="bg-teal-light rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-evergreen-teal">{todayDisplay}</p>
        </div>

        {/* Content */}
        {loading && <LoadingSpinner />}

        {!loading && error && (
          <div className="text-center py-12 space-y-3">
            <p className="text-muted-sage-gray">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-divider text-soft-charcoal text-sm hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )}

        {!loading && !error && habits.length === 0 && (
          <EmptyState onAdd={() => setShowCreateForm(true)} />
        )}

        {!loading && !error && habits.length > 0 && (
          <div className="space-y-3">
            {habits.map((habit) => {
              const done = isCompletedToday(habit.id);
              const categoryColor = getCategoryColor(habit.category);

              return (
                <div
                  key={habit.id}
                  className="bg-white border border-divider rounded-xl p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setDetailPanel(habit)}
                >
                  {/* Completion toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCompletion(habit);
                    }}
                    className={`flex-shrink-0 transition-colors ${done ? 'text-evergreen-teal' : 'text-gray-300 hover:text-evergreen-teal'}`}
                    aria-label={done ? 'Completed today' : 'Mark as done'}
                  >
                    {done ? <CheckCircle2 size={26} /> : <Circle size={26} />}
                  </button>

                  {/* Habit info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${done ? 'text-muted-sage-gray line-through' : 'text-soft-charcoal'}`}>
                      {habit.name || habit.title}
                    </p>
                    {habit.category && (
                      <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor}`}>
                        {habit.category}
                      </span>
                    )}
                  </div>

                  {/* Frequency badge */}
                  <span className="flex-shrink-0 text-xs text-muted-sage-gray capitalize">
                    {habit.frequency || 'daily'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateForm && (
        <HabitCreationForm
          userId={user?.uid}
          onSave={handleHabitCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {completionModal && (
        <HabitCompletionModal
          isOpen={!!completionModal}
          habit={completionModal.habit}
          date={todayStr}
          onComplete={handleCompletionSaved}
          onDismiss={() => setCompletionModal(null)}
        />
      )}

      {detailPanel && (
        <HabitDetailPanel
          habit={detailPanel}
          completionDates={completionsByHabit[detailPanel.id] || []}
          onEdit={() => {/* future edit flow */}}
          onDelete={handleDeleteHabit}
          onClose={() => setDetailPanel(null)}
        />
      )}
    </SidebarLayout>
  );
}
