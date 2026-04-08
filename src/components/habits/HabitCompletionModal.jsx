// src/components/habits/HabitCompletionModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getCompletionInsight } from '../../constants/brainInsightsCopy';
import { useAuth } from '../../context/AuthContext';

const REFLECTION_OPTIONS = [
  { key: 'smooth', label: 'Smooth', affirm: 'Captured.' },
  { key: 'okay', label: 'Okay', affirm: 'Showing up is the work.' },
  { key: 'hard', label: 'Hard today', affirm: 'Hard days count the most.' },
];

export default function HabitCompletionModal({ habit, date, onComplete, onDismiss, isOpen }) {
  const { user } = useAuth();
  const [selectedReflection, setSelectedReflection] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const insight = habit ? getCompletionInsight(habit.category) : '';

  const handleClose = useCallback(() => {
    setSelectedReflection(null);
    setSaved(false);
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, handleClose]);

  const saveCompletion = async (reflection) => {
    if (!habit || saving) return;
    setSaving(true);
    try {
      // Write to subcollection (used by Habits page)
      const completionRef = doc(db, 'habits', habit.id, 'completions', date);
      await setDoc(completionRef, {
        date,
        completed: true,
        completedAt: serverTimestamp(),
        ...(reflection ? { reflection } : {}),
      });

      // Write to top-level habitCompletions (used by dashboard/useHabits)
      if (user?.uid) {
        const topLevelRef = doc(db, 'habitCompletions', `${habit.id}_${date}`);
        await setDoc(topLevelRef, {
          userId: user.uid,
          habitId: habit.id,
          dateISO: date,
          reflection: reflection ?? null,
          skippedReflection: !reflection,
          source: 'habits_page',
          createdAt: serverTimestamp(),
        });
      }

      setSaved(true);
      if (onComplete) onComplete(habit.id, date);
    } catch (err) {
      console.error('Error saving completion:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReflectionSelect = async (key) => {
    setSelectedReflection(key);
    await saveCompletion(key);
  };

  const handleSkip = async () => {
    await saveCompletion(null);
  };

  if (!isOpen || !habit) return null;

  const selectedOption = REFLECTION_OPTIONS.find(o => o.key === selectedReflection);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative p-6 space-y-5">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-sage-gray hover:text-soft-charcoal transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="w-12 h-12 rounded-full bg-teal-light flex items-center justify-center">
            <CheckCircle2 size={24} className="text-evergreen-teal" />
          </div>
          <h2 className="text-lg font-semibold text-soft-charcoal text-center">{habit.name || habit.title}</h2>
          <p className="text-sm text-muted-sage-gray text-center">How did it feel today?</p>
        </div>

        {/* Reflection chips or affirm message */}
        {saved && selectedOption ? (
          <div className="text-center py-2">
            <p className="text-evergreen-teal font-medium text-base">{selectedOption.affirm}</p>
          </div>
        ) : saved ? (
          <div className="text-center py-2">
            <p className="text-evergreen-teal font-medium text-base">Logged.</p>
          </div>
        ) : (
          <div className="flex gap-2 justify-center flex-wrap">
            {REFLECTION_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleReflectionSelect(key)}
                disabled={saving}
                className="px-4 py-2 rounded-full border border-divider text-soft-charcoal text-sm hover:bg-teal-light hover:border-evergreen-teal hover:text-evergreen-teal transition-colors disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Skip */}
        {!saved && (
          <div className="text-center">
            <button
              onClick={handleSkip}
              disabled={saving}
              className="text-sm text-muted-sage-gray hover:text-soft-charcoal underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              Skip reflection
            </button>
          </div>
        )}

        {/* Brain insight */}
        <div className="bg-gray-50 rounded-xl p-4 border border-divider">
          <p className="text-xs font-semibold text-evergreen-teal uppercase tracking-wide mb-1">Did you know?</p>
          <p className="text-sm text-soft-charcoal leading-relaxed">{insight}</p>
        </div>

        {/* Done button when saved */}
        {saved && (
          <button
            onClick={handleClose}
            className="w-full bg-evergreen-teal text-white py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
