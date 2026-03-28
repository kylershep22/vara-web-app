// src/components/focus/RoutinesTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun,
  Moon,
  Calendar,
  Sparkles,
  Bell,
  Clock,
  List,
  Timer,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Edit3,
  X,
  Save,
  CheckSquare,
} from 'lucide-react';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import RoutinePlayer from './RoutinePlayer';

// ─── Templates ───────────────────────────────────────────────────────────────

const MORNING_TEMPLATES = [
  {
    id: 'morning-essentials',
    name: 'The Essentials',
    description: 'For people who hit snooze twice and need a fast start',
    totalMinutes: 10,
    activities: [
      { name: 'Hydration', duration: 1 },
      { name: 'Stretching', duration: 3 },
      { name: 'Intention Setting', duration: 3 },
      { name: 'Breakfast', duration: 3 },
    ],
  },
  {
    id: 'morning-energize',
    name: 'Energize & Focus',
    description: 'For people who want to own their morning before the day owns them',
    totalMinutes: 25,
    activities: [
      { name: 'Hydration', duration: 1 },
      { name: 'Movement / Exercise', duration: 10 },
      { name: 'Breathwork', duration: 3 },
      { name: 'Journaling', duration: 5 },
      { name: 'Goal Review', duration: 3 },
      { name: 'Breakfast', duration: 3 },
    ],
  },
  {
    id: 'morning-mindful',
    name: 'Mindful Morning',
    description: 'For people who want calm clarity before the noise starts',
    totalMinutes: 20,
    activities: [
      { name: 'Hydration', duration: 1 },
      { name: 'Meditation', duration: 5 },
      { name: 'Gratitude Practice', duration: 3 },
      { name: 'Journaling', duration: 5 },
      { name: 'Fresh Air', duration: 6 },
    ],
  },
];

const EVENING_TEMPLATES = [
  {
    id: 'evening-quick',
    name: 'Quick Wind-Down',
    description: "For people who just need to signal their brain it's time to stop",
    totalMinutes: 10,
    activities: [
      { name: 'Phone to DND', duration: 1 },
      { name: 'Breathwork', duration: 4 },
      { name: 'Gratitude Journal', duration: 5 },
    ],
  },
  {
    id: 'evening-full-reset',
    name: 'Full Reset',
    description: "For people who carry the day's stress into the night",
    totalMinutes: 25,
    activities: [
      { name: 'Dim Lights', duration: 1 },
      { name: 'Phone to DND', duration: 1 },
      { name: 'Stretching', duration: 5 },
      { name: 'Gratitude Journal', duration: 5 },
      { name: 'Reading', duration: 13 },
    ],
  },
  {
    id: 'evening-sleep-optimizer',
    name: 'Sleep Optimizer',
    description: 'For people who struggle to fall or stay asleep',
    totalMinutes: 20,
    activities: [
      { name: 'No Screens', duration: 1 },
      { name: 'Cool Room', duration: 1 },
      { name: 'Herbal Tea', duration: 3 },
      { name: 'Meditation / Breathwork', duration: 5 },
      { name: 'Sleep Sounds', duration: 10 },
    ],
  },
];

const CUSTOM_TEMPLATES = [
  {
    id: 'custom-weekly-reset',
    name: 'Weekly Reset',
    description: 'For people who want to start the week feeling prepared, not behind',
    totalMinutes: 30,
    activities: [
      { name: 'Week Review', duration: 5 },
      { name: 'Goal Setting', duration: 5 },
      { name: 'Meal Planning', duration: 10 },
      { name: 'Learning Time', duration: 5 },
      { name: 'Relaxation', duration: 5 },
    ],
  },
  {
    id: 'custom-recharge',
    name: 'Recharge Day',
    description: 'For people who need permission to slow down',
    totalMinutes: 25,
    activities: [
      { name: 'Gratitude Practice', duration: 5 },
      { name: 'Creative Time', duration: 10 },
      { name: 'Social Connection', duration: 5 },
      { name: 'Relaxation', duration: 5 },
    ],
  },
];

function getTemplatesForTime(timeOfDay) {
  switch (timeOfDay) {
    case 'morning': return MORNING_TEMPLATES;
    case 'evening': return EVENING_TEMPLATES;
    case 'bedtime': return EVENING_TEMPLATES; // reuse evening for bedtime
    case 'custom': return CUSTOM_TEMPLATES;
    default: return [];
  }
}

// ─── Time-of-day options ──────────────────────────────────────────────────────

const TIME_OPTIONS = [
  { id: 'morning', label: 'Morning', icon: Sun },
  { id: 'evening', label: 'Evening', icon: Moon },
  { id: 'bedtime', label: 'Bedtime', icon: Moon },
  { id: 'custom', label: 'Custom', icon: Calendar },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalDuration(activities) {
  return activities.reduce((sum, a) => sum + (parseInt(a.duration) || 0), 0);
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditRoutineModal({ routine, timeOfDay, onSave, onCancel }) {
  const [name, setName] = useState(routine?.name || `My ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} Routine`);
  const [activities, setActivities] = useState(
    routine?.activities ? routine.activities.map((a, i) => ({ ...a, _key: i })) : []
  );
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDuration, setNewActivityDuration] = useState('');
  const [saving, setSaving] = useState(false);

  const addActivity = () => {
    const trimmed = newActivityName.trim();
    if (!trimmed) return;
    const dur = parseInt(newActivityDuration) || 5;
    setActivities(prev => [...prev, { name: trimmed, duration: dur, order: prev.length, _key: Date.now() }]);
    setNewActivityName('');
    setNewActivityDuration('');
  };

  const removeActivity = (key) => {
    setActivities(prev => prev.filter(a => a._key !== key));
  };

  const moveActivity = (index, direction) => {
    const next = direction === 'up' ? index - 1 : index + 1;
    if (next < 0 || next >= activities.length) return;
    const arr = [...activities];
    [arr[index], arr[next]] = [arr[next], arr[index]];
    setActivities(arr.map((a, i) => ({ ...a, order: i })));
  };

  const handleSave = async () => {
    if (!name.trim() || activities.length === 0) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      activities: activities.map(({ _key, ...rest }, i) => ({ ...rest, order: i })),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-vara-xl shadow-vara-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <h3 className="text-vara-lg font-semibold text-soft-charcoal">
            {routine ? 'Edit Routine' : 'New Routine'}
          </h3>
          <button onClick={onCancel} className="text-muted-sage-gray hover:text-soft-charcoal">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-1.5">
              Routine Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Morning Routine"
              className="w-full px-3 py-2 rounded-vara-md border border-divider focus:border-evergreen-teal focus:ring-2 focus:ring-evergreen-teal/20 outline-none text-vara-sm"
            />
          </div>

          {/* Activities list */}
          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">
              Activities
            </label>
            {activities.length === 0 ? (
              <div className="py-6 text-center text-muted-sage-gray text-vara-sm bg-dew-sage-light rounded-vara-md border-2 border-dashed border-divider mb-3">
                No activities yet
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {activities.map((activity, index) => (
                  <div
                    key={activity._key}
                    className="flex items-center gap-2 p-3 rounded-vara-md bg-dew-sage-light border border-divider"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-soft-charcoal text-vara-sm truncate">
                        {activity.name}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-muted-sage-gray/60" />
                        <span className="text-xs text-muted-sage-gray">{activity.duration} min</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveActivity(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => moveActivity(index, 'down')}
                        disabled={index === activities.length - 1}
                        className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        onClick={() => removeActivity(activity._key)}
                        className="p-1 rounded hover:bg-red-100 text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add activity */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newActivityName}
                onChange={e => setNewActivityName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addActivity()}
                placeholder="Activity name"
                className="flex-1 px-3 py-2 rounded-vara-md border border-divider focus:border-evergreen-teal focus:ring-2 focus:ring-evergreen-teal/20 outline-none text-vara-sm"
              />
              <input
                type="number"
                value={newActivityDuration}
                onChange={e => setNewActivityDuration(e.target.value)}
                placeholder="min"
                min="1"
                max="180"
                className="w-16 px-2 py-2 rounded-vara-md border border-divider focus:border-evergreen-teal focus:ring-2 focus:ring-evergreen-teal/20 outline-none text-vara-sm text-center"
              />
              <button
                onClick={addActivity}
                className="flex items-center gap-1.5 px-3 py-2 rounded-vara-md bg-evergreen-teal text-white text-vara-sm font-medium hover:opacity-90 transition-all"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-divider">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || activities.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-vara-md bg-evergreen-teal text-white text-vara-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Routine'}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-vara-md border border-divider text-soft-charcoal text-vara-sm font-medium hover:bg-dew-sage-light transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main RoutinesTab ─────────────────────────────────────────────────────────

export default function RoutinesTab({ userId }) {
  const [selectedTime, setSelectedTime] = useState('morning');
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activePlayer, setActivePlayer] = useState(null); // routine object when playing
  const [applyingTemplate, setApplyingTemplate] = useState(null);

  // ── Fetch active routine for selectedTime ──────────────────────────────────
  const loadRoutine = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'routines'),
        where('userId', '==', userId),
        where('timeOfDay', '==', selectedTime),
        where('active', '==', true)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0];
        setRoutine({ id: docData.id, ...docData.data() });
      } else {
        setRoutine(null);
      }
    } catch (err) {
      console.error('Error loading routine:', err);
      setRoutine(null);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedTime]);

  useEffect(() => {
    loadRoutine();
  }, [loadRoutine]);

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async ({ name, activities }) => {
    if (!userId) return;
    const payload = {
      userId,
      name,
      timeOfDay: selectedTime,
      mode: routine?.mode || 'checklist',
      activities,
      active: true,
      reminderTime: routine?.reminderTime || null,
      updatedAt: serverTimestamp(),
    };

    try {
      if (routine?.id) {
        await updateDoc(doc(db, 'routines', routine.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'routines'), payload);
      }
      await loadRoutine();
    } catch (err) {
      console.error('Error saving routine:', err);
    }
    setIsEditing(false);
  };

  // ── Toggle mode ────────────────────────────────────────────────────────────
  const handleModeChange = async (mode) => {
    if (!routine?.id) return;
    try {
      await updateDoc(doc(db, 'routines', routine.id), { mode });
      setRoutine(prev => ({ ...prev, mode }));
    } catch (err) {
      console.error('Error updating mode:', err);
    }
  };

  // ── Reorder activities ─────────────────────────────────────────────────────
  const handleMoveActivity = async (index, direction) => {
    if (!routine) return;
    const arr = [...routine.activities];
    const next = direction === 'up' ? index - 1 : index + 1;
    if (next < 0 || next >= arr.length) return;
    [arr[index], arr[next]] = [arr[next], arr[index]];
    const reordered = arr.map((a, i) => ({ ...a, order: i }));
    setRoutine(prev => ({ ...prev, activities: reordered }));
    try {
      await updateDoc(doc(db, 'routines', routine.id), { activities: reordered });
    } catch (err) {
      console.error('Error reordering:', err);
      loadRoutine();
    }
  };

  // ── Apply template ─────────────────────────────────────────────────────────
  const handleApplyTemplate = async (template) => {
    if (!userId) return;
    setApplyingTemplate(template.id);
    try {
      const activities = template.activities.map((a, i) => ({ ...a, id: i + 1, order: i }));
      await addDoc(collection(db, 'routines'), {
        userId,
        name: template.name,
        timeOfDay: selectedTime,
        mode: 'checklist',
        activities,
        active: true,
        reminderTime: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await loadRoutine();
    } catch (err) {
      console.error('Error applying template:', err);
    } finally {
      setApplyingTemplate(null);
    }
  };

  const templates = getTemplatesForTime(selectedTime);
  const total = routine ? totalDuration(routine.activities) : 0;

  // ── Routine Player ─────────────────────────────────────────────────────────
  if (activePlayer) {
    return (
      <RoutinePlayer
        routine={activePlayer}
        onClose={() => setActivePlayer(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit modal */}
      {isEditing && (
        <EditRoutineModal
          routine={routine}
          timeOfDay={selectedTime}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {/* Time-of-day selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIME_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const active = selectedTime === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelectedTime(opt.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-vara-lg font-medium text-vara-sm transition-all ${
                active
                  ? 'bg-evergreen-teal text-white shadow-vara-sm'
                  : 'bg-dew-sage-light text-soft-charcoal hover:bg-silver-sage/30'
              }`}
            >
              <Icon size={16} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      {loading ? (
        <div className="py-12 text-center text-muted-sage-gray text-vara-sm">Loading routine...</div>
      ) : routine ? (
        // ── Routine card ────────────────────────────────────────────────────
        <div className="bg-white rounded-vara-xl border border-divider shadow-vara-sm p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-vara-lg font-semibold text-soft-charcoal">{routine.name}</h3>
              {routine.reminderTime && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Bell size={13} className="text-evergreen-teal" />
                  <span className="text-xs text-evergreen-teal font-medium">{routine.reminderTime}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-vara-md border border-divider text-soft-charcoal text-vara-sm font-medium hover:bg-dew-sage-light transition-all shrink-0"
            >
              <Edit3 size={14} />
              Edit
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-vara-md border border-divider overflow-hidden">
            <button
              onClick={() => handleModeChange('checklist')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-vara-sm font-medium transition-all ${
                routine.mode !== 'timed'
                  ? 'bg-evergreen-teal text-white'
                  : 'bg-white text-muted-sage-gray hover:bg-dew-sage-light'
              }`}
            >
              <CheckSquare size={16} />
              Checklist
            </button>
            <button
              onClick={() => handleModeChange('timed')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-vara-sm font-medium transition-all ${
                routine.mode === 'timed'
                  ? 'bg-evergreen-teal text-white'
                  : 'bg-white text-muted-sage-gray hover:bg-dew-sage-light'
              }`}
            >
              <Timer size={16} />
              Timed
            </button>
          </div>

          {/* Activity list */}
          <div className="space-y-2">
            {routine.activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-vara-md bg-dew-sage-light border border-divider"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-soft-charcoal text-vara-sm">{activity.name}</div>
                  {routine.mode === 'timed' && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={12} className="text-muted-sage-gray/60" />
                      <span className="text-xs text-muted-sage-gray">{activity.duration} min</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMoveActivity(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-muted-sage-gray"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => handleMoveActivity(index, 'down')}
                    disabled={index === routine.activities.length - 1}
                    className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-muted-sage-gray"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center gap-5 pt-3 border-t border-divider">
            <div className="flex items-center gap-1.5 text-vara-sm text-muted-sage-gray">
              <Clock size={15} />
              <span>{total} min total</span>
            </div>
            <div className="flex items-center gap-1.5 text-vara-sm text-muted-sage-gray">
              <List size={15} />
              <span>{routine.activities.length} activities</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => setActivePlayer(routine)}
            className="w-full py-3.5 rounded-vara-lg bg-evergreen-teal text-white font-semibold text-vara-sm hover:opacity-90 transition-all shadow-vara-sm"
          >
            Begin at your own pace
          </button>
        </div>
      ) : (
        // ── Empty state ─────────────────────────────────────────────────────
        <div className="space-y-4">
          <div className="py-10 text-center">
            <div className="text-5xl mb-4 opacity-60">🌱</div>
            <h3 className="text-vara-lg font-semibold text-evergreen-teal mb-2">
              Build your first routine
            </h3>
            <p className="text-vara-sm text-muted-sage-gray max-w-sm mx-auto">
              Structured routines reduce decision fatigue and help you build lasting habits.
            </p>
          </div>

          {/* Templates */}
          {templates.length > 0 && (
            <div className="space-y-3">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-white rounded-vara-lg border border-divider p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-soft-charcoal text-vara-sm">{template.name}</div>
                    <div className="text-xs text-muted-sage-gray mt-0.5">{template.description}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <Sparkles size={12} className="text-evergreen-teal" />
                      <span className="text-xs text-evergreen-teal font-medium">
                        {template.activities.length} activities · ~{template.totalMinutes} min
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    disabled={applyingTemplate !== null}
                    className="shrink-0 px-3 py-1.5 rounded-vara-md bg-dew-sage-light text-evergreen-teal text-xs font-semibold hover:bg-silver-sage/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyingTemplate === template.id ? 'Applying...' : 'Use template'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Build from scratch */}
          <button
            onClick={() => setIsEditing(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-vara-lg border-2 border-dashed border-divider text-soft-charcoal font-medium text-vara-sm hover:border-evergreen-teal hover:text-evergreen-teal transition-all"
          >
            <Plus size={18} />
            {templates.length > 0 ? 'Build from scratch' : 'Create routine'}
          </button>
        </div>
      )}
    </div>
  );
}
