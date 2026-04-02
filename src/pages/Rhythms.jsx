// src/pages/Rhythms.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Plus, Leaf, CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import SidebarLayout from '../components/layout/SidebarLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import HabitCompletionModal from '../components/habits/HabitCompletionModal';
import HabitCreationForm from '../components/habits/HabitCreationForm';
import { removeHabit } from '../services/db/habits.service';
import RoutinesTab from '../components/focus/RoutinesTab';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY_TABS = ['Habits', 'Routines'];
const SUB_FILTERS = ['All', 'Active', 'Complete'];

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

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function EmptyFilterState({ filter, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <p className="text-muted-sage-gray text-sm">
        No <span className="lowercase">{filter}</span> habits found.
      </p>
      <button
        onClick={onClear}
        className="text-evergreen-teal text-sm font-medium hover:underline"
      >
        Show all habits
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Rhythms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab + filter state — sync with URL query param
  const tabFromUrl = searchParams.get('tab') === 'routines' ? 'Routines' : 'Habits';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);
  const [subFilter, setSubFilter] = useState('All');

  // Habits data
  const [habits, setHabits] = useState([]);
  const [completionsByHabit, setCompletionsByHabit] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [completionModal, setCompletionModal] = useState(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'EEEE, MMMM d');

  // ── Load completions ────────────────────────────────────────────────────────
  const loadCompletions = useCallback(async (habitList) => {
    if (!habitList.length) return;
    const results = {};
    await Promise.all(
      habitList.map(async (habit) => {
        try {
          const snap = await getDocs(collection(db, 'habits', habit.id, 'completions'));
          results[habit.id] = snap.docs.map(d => d.id);
        } catch {
          results[habit.id] = [];
        }
      })
    );
    setCompletionsByHabit(results);
  }, []);

  // ── Subscribe to habits ─────────────────────────────────────────────────────
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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isCompletedToday = (habitId) =>
    (completionsByHabit[habitId] || []).includes(todayStr);

  const getFilteredHabits = () => {
    if (subFilter === 'Active') return habits.filter(h => !isCompletedToday(h.id));
    if (subFilter === 'Complete') return habits.filter(h => isCompletedToday(h.id));
    return habits;
  };

  const handleToggleCompletion = (habit) => {
    if (isCompletedToday(habit.id)) return;
    setCompletionModal({ habit });
  };

  const handleCompletionSaved = (habitId, date) => {
    setCompletionsByHabit(prev => ({
      ...prev,
      [habitId]: [...(prev[habitId] || []), date],
    }));
  };

  const handleHabitCreated = () => {
    setShowCreateForm(false);
  };

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filteredHabits = getFilteredHabits();

  return (
    <SidebarLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <ClipboardCheck className="text-evergreen-teal" size={26} />
          <h1 className="text-vara-2xl font-semibold text-soft-charcoal">Rhythms</h1>
        </div>

        {/* Primary tab bar — segmented control */}
        <div className="flex rounded-vara-pill overflow-hidden border border-divider">
          {PRIMARY_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-evergreen-teal text-white'
                    : 'bg-white text-soft-charcoal border-divider hover:bg-dew-sage-light'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Habits tab */}
        {activeTab === 'Habits' && (
          <>
            {/* Sub-filter bar */}
            <div className="flex items-center gap-2">
              {SUB_FILTERS.map((filter) => {
                const isActive = subFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setSubFilter(filter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-evergreen-teal/10 text-evergreen-teal font-medium'
                        : 'text-muted-sage-gray hover:text-soft-charcoal'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}

              {/* Add habit button — pushed to the right */}
              <div className="ml-auto">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-evergreen-teal text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} />
                  Add Habit
                </button>
              </div>
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

            {!loading && !error && habits.length > 0 && filteredHabits.length === 0 && (
              <EmptyFilterState filter={subFilter} onClear={() => setSubFilter('All')} />
            )}

            {!loading && !error && filteredHabits.length > 0 && (
              <div className="space-y-3">
                {filteredHabits.map((habit) => {
                  const done = isCompletedToday(habit.id);
                  const categoryColor = getCategoryColor(habit.category);

                  return (
                    <div
                      key={habit.id}
                      className="bg-white border border-divider rounded-xl p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/habits/${habit.id}`)}
                    >
                      {/* Completion toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCompletion(habit);
                        }}
                        className={`flex-shrink-0 transition-colors ${
                          done ? 'text-evergreen-teal' : 'text-gray-300 hover:text-evergreen-teal'
                        }`}
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
          </>
        )}

        {/* Routines tab */}
        {activeTab === 'Routines' && (
          <RoutinesTab userId={user?.uid} />
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
    </SidebarLayout>
  );
}
