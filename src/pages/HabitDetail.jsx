// src/pages/HabitDetail.jsx

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Flame, CheckCircle2, Calendar, Pencil, Trash2, X, Brain, Zap, Star } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import SidebarLayout from '../components/layout/SidebarLayout';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { updateHabit, removeHabit } from '../services/db/habits.service';

const CATEGORY_COLORS = {
  'Sleep': 'bg-blue-100 text-blue-700',
  'Focus & Clarity': 'bg-purple-100 text-purple-700',
  'Movement': 'bg-orange-100 text-orange-700',
  'Mindfulness': 'bg-teal-100 text-teal-700',
  'Connection': 'bg-pink-100 text-pink-700',
  'General': 'bg-gray-100 text-gray-600',
};

const CATEGORIES = ['Sleep', 'Focus & Clarity', 'Movement', 'Mindfulness', 'Connection', 'General'];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function inputCls() {
  return 'w-full border border-divider rounded-lg px-3 py-2 text-soft-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal focus:border-transparent';
}

function StatCard({ icon, value, label }) {
  return (
    <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center space-y-1">
      <div className="flex justify-center">{icon}</div>
      <p className="text-2xl font-semibold text-evergreen-teal">{value}</p>
      <p className="text-xs text-muted-sage-gray">{label}</p>
    </div>
  );
}

function CompletionHistory({ completionDates }) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(today, 13 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    return { dateStr, dayLabel: DAY_LABELS[dayOfWeek], completed: completionDates.has(dateStr) };
  });

  return (
    <div className="flex gap-2 justify-between">
      {days.map(({ dateStr, dayLabel, completed }) => (
        <div key={dateStr} className="flex flex-col items-center gap-1.5">
          <div
            title={dateStr}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              completed
                ? 'bg-evergreen-teal text-white'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {completed ? <CheckCircle2 size={14} /> : null}
          </div>
          <span className="text-[10px] text-muted-sage-gray">{dayLabel}</span>
        </div>
      ))}
    </div>
  );
}

function EditModal({ habit, onSave, onClose }) {
  const [name, setName] = useState(habit.name || habit.title || '');
  const [category, setCategory] = useState(habit.category || 'General');
  const [frequency, setFrequency] = useState(habit.frequency || 'daily');
  const [identityStatement, setIdentityStatement] = useState(habit.identityStatement || '');
  const [why, setWhy] = useState(habit.why || '');
  const [startSmall, setStartSmall] = useState(habit.startSmall || '');
  const [fullVersion, setFullVersion] = useState(habit.fullVersion || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Habit name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        title: name.trim(),
        category,
        frequency: frequency.toLowerCase(),
        identityStatement: identityStatement.trim() || null,
        why: why.trim() || null,
        startSmall: startSmall.trim() || null,
        fullVersion: fullVersion.trim() || null,
      });
      onClose();
    } catch (err) {
      console.error('Error updating habit:', err);
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-divider flex-shrink-0">
          <h2 className="text-xl font-semibold text-soft-charcoal">Edit Habit</h2>
          <button onClick={onClose} className="text-muted-sage-gray hover:text-soft-charcoal transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-muted-sage-gray mb-1">Habit name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls()} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-sage-gray mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls()}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-sage-gray mb-1">Frequency</label>
            <div className="flex gap-3">
              {['daily', 'weekly', 'custom'].map(opt => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="frequency" value={opt} checked={frequency === opt} onChange={() => setFrequency(opt)} className="accent-evergreen-teal" />
                  <span className="text-sm text-soft-charcoal capitalize">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-sage-gray mb-1">Identity statement</label>
            <input type="text" value={identityStatement} onChange={(e) => setIdentityStatement(e.target.value)} placeholder="I am someone who..." className={inputCls()} />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-sage-gray mb-1">Why this habit?</label>
            <textarea value={why} onChange={(e) => setWhy(e.target.value)} placeholder="What matters to you about this?" rows={3} className={inputCls() + ' resize-none'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-sage-gray mb-1">Start small version</label>
              <input type="text" value={startSmall} onChange={(e) => setStartSmall(e.target.value)} placeholder="e.g. 5 minutes" className={inputCls()} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-sage-gray mb-1">Full version</label>
              <input type="text" value={fullVersion} onChange={(e) => setFullVersion(e.target.value)} placeholder="e.g. 30-minute walk" className={inputCls()} />
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-divider flex gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-divider text-soft-charcoal text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-evergreen-teal text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HabitDetail() {
  const { habitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [habit, setHabit] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Subscribe to habit doc
  useEffect(() => {
    if (!habitId) return;
    const ref = doc(db, 'habits', habitId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setHabit({ id: snap.id, ...snap.data() });
      setLoading(false);
    }, (err) => {
      console.error('Error loading habit:', err);
      setNotFound(true);
      setLoading(false);
    });
    return () => unsub();
  }, [habitId]);

  // Load completions from flat habitCompletions collection
  useEffect(() => {
    if (!habitId || !user) return;
    const q = query(
      collection(db, 'habitCompletions'),
      where('habitId', '==', habitId),
      where('userId', '==', user.uid),
      orderBy('dateISO', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setCompletions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Error loading completions:', err);
    });
    return () => unsub();
  }, [habitId, user]);

  // Also load from subcollection (legacy pattern used by Habits page)
  const [subCompletions, setSubCompletions] = useState([]);
  useEffect(() => {
    if (!habitId) return;
    const colRef = collection(db, 'habits', habitId, 'completions');
    getDocs(colRef).then((snap) => {
      setSubCompletions(snap.docs.map(d => d.id)); // doc IDs are YYYY-MM-DD
    }).catch(() => {});
  }, [habitId]);

  const completionDateSet = useMemo(() => {
    const set = new Set();
    completions.forEach(c => { if (c.dateISO) set.add(c.dateISO); });
    subCompletions.forEach(d => set.add(d));
    return set;
  }, [completions, subCompletions]);

  const totalCompletions = completionDateSet.size;

  // Current streak calculation
  const currentStreak = useMemo(() => {
    if (completionDateSet.size === 0) return 0;
    const today = new Date();
    let streak = 0;
    let probe = new Date(today);
    while (true) {
      const dateStr = format(probe, 'yyyy-MM-dd');
      if (completionDateSet.has(dateStr)) {
        streak++;
        probe = subDays(probe, 1);
      } else {
        break;
      }
    }
    return streak;
  }, [completionDateSet]);

  const activeSince = habit?.createdAt
    ? format(habit.createdAt.toDate ? habit.createdAt.toDate() : new Date(habit.createdAt), 'MMM d, yyyy')
    : null;

  const handleEdit = async (patch) => {
    await updateHabit(habitId, patch);
  };

  const handleDelete = () => {
    const name = habit?.name || habit?.title || 'this habit';
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      removeHabit(habitId).then(() => {
        navigate('/habits');
      }).catch(err => {
        console.error('Error deleting habit:', err);
      });
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-evergreen-teal border-t-transparent rounded-full animate-spin" />
        </div>
      </SidebarLayout>
    );
  }

  if (notFound) {
    return (
      <SidebarLayout>
        <div className="p-6 max-w-3xl mx-auto text-center py-20 space-y-4">
          <h1 className="text-xl font-semibold text-soft-charcoal">Habit not found</h1>
          <p className="text-muted-sage-gray text-sm">This habit may have been deleted.</p>
          <Link to="/habits" className="inline-flex items-center gap-1.5 text-evergreen-teal text-sm font-medium hover:underline">
            <ArrowLeft size={14} /> Back to Habits
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  const categoryColor = CATEGORY_COLORS[habit?.category] || CATEGORY_COLORS['General'];
  const hasScaling = habit?.startSmall || habit?.fullVersion;
  const hasIntention = habit?.why || habit?.valueAlignment;

  return (
    <SidebarLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Back link */}
        <Link to="/habits" className="inline-flex items-center gap-1.5 text-muted-sage-gray text-sm hover:text-soft-charcoal transition-colors">
          <ArrowLeft size={14} />
          Back to Habits
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-soft-charcoal">
              {habit.name || habit.title}
            </h1>
            {habit.category && (
              <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${categoryColor}`}>
                {habit.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-divider text-soft-charcoal text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white border border-divider rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-soft-charcoal mb-4">Stats</h2>
          <div className="flex gap-4">
            <StatCard
              icon={<Flame size={20} className="text-orange-500" />}
              value={habit.streak || currentStreak}
              label="Current streak"
            />
            <StatCard
              icon={<CheckCircle2 size={20} className="text-evergreen-teal" />}
              value={totalCompletions}
              label="Total completions"
            />
            {activeSince && (
              <StatCard
                icon={<Calendar size={20} className="text-blue-500" />}
                value={activeSince}
                label="Active since"
              />
            )}
          </div>
        </div>

        {/* Scaling Versions */}
        {hasScaling && (
          <div className="bg-white border border-divider rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-soft-charcoal mb-4">Scaling Versions</h2>
            <div className="grid gap-3">
              {habit.fullVersion && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-light border border-evergreen-teal/20">
                  <Star size={16} className="text-evergreen-teal mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-evergreen-teal uppercase tracking-wide">Full</p>
                    <p className="text-sm text-soft-charcoal mt-0.5">{habit.fullVersion}</p>
                  </div>
                </div>
              )}
              {habit.startSmall && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Zap size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-muted-sage-gray uppercase tracking-wide">Quick Start</p>
                    <p className="text-sm text-soft-charcoal mt-0.5">{habit.startSmall}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <CheckCircle2 size={16} className="text-muted-sage-gray mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-muted-sage-gray uppercase tracking-wide">Just Show Up</p>
                  <p className="text-sm text-soft-charcoal mt-0.5">
                    {habit.startSmall ? `Even easier: just begin ${habit.startSmall.toLowerCase()}` : 'Just show up and do the minimum'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Intention */}
        {hasIntention && (
          <div className="bg-white border border-divider rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-soft-charcoal mb-4">Intention</h2>
            {habit.valueAlignment && (
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                  <Brain size={12} />
                  {habit.valueAlignment}
                </span>
              </div>
            )}
            {habit.why && (
              <div>
                <p className="text-xs font-semibold text-muted-sage-gray uppercase tracking-wide mb-1">Why this matters</p>
                <p className="text-sm text-soft-charcoal leading-relaxed">{habit.why}</p>
              </div>
            )}
          </div>
        )}

        {/* Identity */}
        {habit.identityStatement && (
          <div className="bg-teal-light rounded-xl p-5 border border-evergreen-teal/20">
            <p className="text-xs font-semibold text-evergreen-teal uppercase tracking-wide mb-1">Identity</p>
            <p className="text-sm text-soft-charcoal italic">"{habit.identityStatement}"</p>
          </div>
        )}

        {/* Completion History */}
        <div className="bg-white border border-divider rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-soft-charcoal mb-4">Last 14 Days</h2>
          <CompletionHistory completionDates={completionDateSet} />
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <EditModal
          habit={habit}
          onSave={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
    </SidebarLayout>
  );
}
