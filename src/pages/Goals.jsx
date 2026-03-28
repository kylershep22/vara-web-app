// src/pages/Goals.jsx
import React, { useEffect, useState, useCallback } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Leaf, Plus, AlertCircle, Target, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  listGoals,
  createGoal,
  updateGoal,
} from '../services/db/goals.service';

// ─── constants ────────────────────────────────────────────────────────────────

const FOCUS_OPTIONS = [
  {
    label: 'Physical Health & Fitness',
    value: 'Physical Health & Fitness',
    suggestedPillars: ['energy', 'resilience'],
  },
  {
    label: 'Mental & Emotional Wellness',
    value: 'Mental & Emotional Wellness',
    suggestedPillars: ['resilience', 'focus'],
  },
  {
    label: 'Lifestyle & Personal Growth',
    value: 'Lifestyle & Personal Growth',
    suggestedPillars: ['growth', 'focus'],
  },
  {
    label: 'Sleep & Recovery',
    value: 'Sleep & Recovery',
    suggestedPillars: ['energy', 'resilience'],
  },
];

const TIMEFRAME_OPTIONS = [
  { label: '21 days (Build a habit)', value: '21 days' },
  { label: '30 days (Monthly challenge)', value: '30 days' },
  { label: '66 days (Make it stick)', value: '66 days' },
  { label: '90 days (Transform your life)', value: '90 days' },
  { label: '6 months (Major change)', value: '6 months' },
  { label: '1 year (Long-term goal)', value: '1 year' },
];

const BRAIN_PILLARS = [
  { value: 'growth', label: 'Growth', color: 'bg-violet-100 text-violet-700 border-violet-300' },
  { value: 'energy', label: 'Energy', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'focus', label: 'Focus', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'resilience', label: 'Resilience', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'connection', label: 'Connection', color: 'bg-rose-100 text-rose-700 border-rose-300' },
];

const PILLAR_COLOR_MAP = Object.fromEntries(BRAIN_PILLARS.map((p) => [p.value, p.color]));

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Done' },
];

const EMPTY_FORM = {
  title: '',
  primaryFocus: '',
  timeframe: '',
  brainPillars: [],
};

// ─── sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className="bg-evergreen-teal h-2 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PillarBadge({ pillar }) {
  const colors = PILLAR_COLOR_MAP[pillar] || 'bg-gray-100 text-gray-600 border-gray-300';
  const label = BRAIN_PILLARS.find((p) => p.value === pillar)?.label || pillar;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors}`}>
      {label}
    </span>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onCardClick, onQuickProgress }) {
  const [hovered, setHovered] = useState(false);
  const pct = Math.max(0, Math.min(100, goal.progress || 0));
  const pillars = goal.brainPillars || [];

  return (
    <div
      className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider cursor-pointer hover:shadow-lg transition-shadow relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onCardClick(goal)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-soft-charcoal truncate">{goal.title}</h3>
          <p className="text-sm text-muted-sage-gray mt-0.5">
            {[goal.primaryFocus, goal.timeframe].filter(Boolean).join(' · ')}
          </p>
        </div>
        {/* Quick update buttons revealed on hover */}
        {hovered && (
          <div
            className="flex gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onQuickProgress(goal, 5)}
              className="text-xs bg-teal-light text-evergreen-teal font-semibold px-2 py-1 rounded-md hover:bg-evergreen-teal hover:text-white transition-colors"
            >
              +5%
            </button>
            <button
              onClick={() => onQuickProgress(goal, 10)}
              className="text-xs bg-teal-light text-evergreen-teal font-semibold px-2 py-1 rounded-md hover:bg-evergreen-teal hover:text-white transition-colors"
            >
              +10%
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <ProgressBar value={pct} />
        <p className="text-xs text-muted-sage-gray mt-1 text-right">{pct}%</p>
      </div>

      {/* Brain pillar badges */}
      {pillars.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {pillars.map((p) => (
            <PillarBadge key={p} pillar={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Progress Update Modal ────────────────────────────────────────────────────

function ProgressModal({ goal, onClose, onSave }) {
  const [progress, setProgress] = useState(goal?.progress ?? 0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProgress(goal?.progress ?? 0);
    setNotes('');
  }, [goal]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(goal.id, Math.round(progress), notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!goal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-vara-lg shadow-vara-md w-full max-w-md p-vara-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal">Update Progress</h2>
          <button onClick={onClose} className="text-muted-sage-gray hover:text-soft-charcoal">
            <X size={20} />
          </button>
        </div>

        {/* Goal label */}
        <p className="text-sm text-muted-sage-gray mb-1">Goal</p>
        <p className="font-medium text-soft-charcoal mb-4 truncate">{goal.title}</p>

        {/* Progress value */}
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-sage-gray">Progress</span>
          <span className="font-semibold text-evergreen-teal">{Math.round(progress)}%</span>
        </div>
        <ProgressBar value={progress} />

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full mt-3 accent-evergreen-teal"
        />

        {/* Notes */}
        <label className="block mt-4">
          <span className="text-sm text-muted-sage-gray">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you accomplish?"
            rows={3}
            className="mt-1 w-full border border-divider rounded-vara-lg px-3 py-2 text-sm text-soft-charcoal placeholder-muted-sage-gray focus:outline-none focus:ring-2 focus:ring-evergreen-teal resize-none"
          />
        </label>

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-vara-lg border border-divider text-soft-charcoal text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-vara-lg bg-evergreen-teal text-white text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Goal Modal ────────────────────────────────────────────────────────

function CreateGoalModal({ onClose, onCreated, userId }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const togglePillar = (pillar) => {
    setForm((prev) => ({
      ...prev,
      brainPillars: prev.brainPillars.includes(pillar)
        ? prev.brainPillars.filter((p) => p !== pillar)
        : [...prev.brainPillars, pillar],
    }));
  };

  const handleFocusChange = (value) => {
    const opt = FOCUS_OPTIONS.find((o) => o.value === value);
    setForm((prev) => ({
      ...prev,
      primaryFocus: value,
      brainPillars: opt?.suggestedPillars || prev.brainPillars,
    }));
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setError('Goal title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await createGoal(userId, {
        title: form.title.trim(),
        primaryFocus: form.primaryFocus || null,
        timeframe: form.timeframe || null,
        brainPillars: form.brainPillars,
        progress: 0,
        status: 'active',
      });
      onCreated(created);
      onClose();
    } catch (err) {
      console.error('Error creating goal:', err);
      setError('Failed to create goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-vara-lg shadow-vara-md w-full max-w-md max-h-[90vh] overflow-y-auto p-vara-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-evergreen-teal" />
            <h2 className="text-vara-lg font-semibold text-soft-charcoal">New Goal</h2>
          </div>
          <button onClick={onClose} className="text-muted-sage-gray hover:text-soft-charcoal">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {/* Title */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-soft-charcoal">Goal Title *</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g., Exercise 3 times per week"
            className="mt-1 w-full border border-divider rounded-vara-lg px-3 py-2 text-sm text-soft-charcoal placeholder-muted-sage-gray focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
          />
        </label>

        {/* Focus Area */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-soft-charcoal">Focus Area</span>
          <select
            value={form.primaryFocus}
            onChange={(e) => handleFocusChange(e.target.value)}
            className="mt-1 w-full border border-divider rounded-vara-lg px-3 py-2 text-sm text-soft-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
          >
            <option value="">Select focus area...</option>
            {FOCUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Timeframe */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-soft-charcoal">Timeframe</span>
          <select
            value={form.timeframe}
            onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))}
            className="mt-1 w-full border border-divider rounded-vara-lg px-3 py-2 text-sm text-soft-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
          >
            <option value="">Select timeframe...</option>
            {TIMEFRAME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Brain Pillars multi-select */}
        <div className="mb-5">
          <p className="text-sm font-medium text-soft-charcoal mb-1">
            What does this goal support?{' '}
            <span className="text-muted-sage-gray font-normal">(Optional)</span>
          </p>
          <p className="text-xs text-muted-sage-gray mb-3">
            Select the areas of wellness this goal will help you build
          </p>
          <div className="flex flex-wrap gap-2">
            {BRAIN_PILLARS.map((p) => {
              const selected = form.brainPillars.includes(p.value);
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePillar(p.value)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    selected
                      ? `${p.color} border-current`
                      : 'bg-gray-50 text-muted-sage-gray border-divider hover:border-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-vara-lg border border-divider text-soft-charcoal text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 py-2 rounded-vara-lg bg-evergreen-teal text-white text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [progressGoal, setProgressGoal] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listGoals(user.uid);
      setGoals(data);
    } catch (err) {
      console.error('Error loading goals:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredGoals = goals.filter((g) => {
    if (filter === 'active') return g.status === 'active';
    if (filter === 'completed') return g.status === 'completed';
    return true;
  });

  const handleQuickProgress = async (goal, increment) => {
    const newPct = Math.min(100, (goal.progress || 0) + increment);
    const patch = { progress: newPct };
    if (newPct >= 100) patch.status = 'completed';
    try {
      const updated = await updateGoal(goal.id, patch);
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, ...updated } : g)));
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleProgressSave = async (goalId, newProgress) => {
    const patch = { progress: newProgress };
    if (newProgress >= 100) patch.status = 'completed';
    const updated = await updateGoal(goalId, patch);
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, ...updated } : g)));
  };

  const handleGoalCreated = (newGoal) => {
    setGoals((prev) => [newGoal, ...prev]);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-evergreen-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-sage-gray text-sm">Loading goals...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h2 className="text-vara-lg font-semibold text-red-600 mb-2">Unable to Load Goals</h2>
          <p className="text-muted-sage-gray mb-1 text-sm">
            There was a problem loading your goals. Please check your connection and try again.
          </p>
          {error.message && (
            <p className="text-xs text-muted-sage-gray mb-4">Error: {error.message}</p>
          )}
          <button
            onClick={load}
            className="px-5 py-2 border border-divider rounded-vara-lg text-soft-charcoal text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Try again
          </button>
        </div>
      </SidebarLayout>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <SidebarLayout>
      <div className="max-w-3xl mx-auto px-vara-base py-vara-lg">

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-vara-2xl font-semibold text-evergreen-teal">Goals</h1>
            <p className="text-muted-sage-gray mt-1 text-sm">
              Track your progress toward your dreams
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-evergreen-teal text-white px-4 py-2 rounded-vara-lg text-sm font-semibold hover:bg-opacity-90 transition-colors shrink-0"
          >
            <Plus size={16} />
            Add Goal
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-5 mb-6">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-evergreen-teal text-white'
                  : 'bg-teal-light text-evergreen-teal hover:bg-evergreen-teal hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Goals list / empty state */}
        {filteredGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center mb-4">
              <Leaf size={28} className="text-evergreen-teal" />
            </div>
            <h3 className="font-semibold text-soft-charcoal mb-1">A fresh space for your goals</h3>
            <p className="text-muted-sage-gray text-sm mb-6">
              Add a goal whenever you're ready - no rush.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-evergreen-teal text-white px-5 py-2 rounded-vara-lg text-sm font-semibold hover:bg-opacity-90 transition-colors"
            >
              <Plus size={16} />
              Add a goal
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onCardClick={setProgressGoal}
                onQuickProgress={handleQuickProgress}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress update modal */}
      {progressGoal && (
        <ProgressModal
          goal={progressGoal}
          onClose={() => setProgressGoal(null)}
          onSave={handleProgressSave}
        />
      )}

      {/* Create goal modal */}
      {showCreate && (
        <CreateGoalModal
          userId={user.uid}
          onClose={() => setShowCreate(false)}
          onCreated={handleGoalCreated}
        />
      )}
    </SidebarLayout>
  );
}
