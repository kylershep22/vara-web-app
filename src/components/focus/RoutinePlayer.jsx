// src/components/focus/RoutinePlayer.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  SkipForward,
  CheckSquare,
  Square,
  ChevronRight,
} from 'lucide-react';

/**
 * RoutinePlayer — card-based step-through execution UI for web.
 *
 * Checklist mode: checkbox per activity, tap to mark complete, auto-advances.
 * Timed mode:    countdown timer per activity, Pause/Resume, Skip.
 * Completion:    "Routine complete!" screen with encouraging message.
 */
export default function RoutinePlayer({ routine, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Timed-mode state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  // Checklist-mode state
  const [checked, setChecked] = useState([]);

  const isTimed = routine.mode === 'timed';
  const activities = routine.activities;
  const current = activities[currentIndex];
  const totalActivities = activities.length;

  // ── Init timer when activity changes (timed mode) ──────────────────────────
  useEffect(() => {
    if (isTimed && current) {
      setTimeRemaining(current.duration * 60);
      setIsPaused(false);
    }
  }, [currentIndex, isTimed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTimed || isPaused || isCompleted) return;

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isTimed, isPaused, isCompleted, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => {
    if (currentIndex < totalActivities - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setIsCompleted(true);
    }
  }, [currentIndex, totalActivities]);

  const handleSkip = () => {
    clearInterval(intervalRef.current);
    handleNext();
  };

  const handleToggleCheck = (index) => {
    setChecked(prev => {
      const next = prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index];
      // Auto-advance to first unchecked
      const firstUnchecked = activities.findIndex((_, i) => !next.includes(i));
      if (firstUnchecked === -1) {
        // All checked
        setTimeout(() => setIsCompleted(true), 400);
      } else {
        setCurrentIndex(firstUnchecked);
      }
      return next;
    });
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── Completion screen ──────────────────────────────────────────────────────
  if (isCompleted) {
    return (
      <div className="bg-white rounded-vara-xl border border-divider shadow-vara-sm p-8 text-center space-y-5">
        <div className="text-5xl">🎉</div>
        <h3 className="text-vara-xl font-semibold text-evergreen-teal">Routine complete!</h3>
        <p className="text-vara-sm text-muted-sage-gray max-w-xs mx-auto">
          You finished <span className="font-semibold text-soft-charcoal">{routine.name}</span>.
          Great job showing up for yourself today.
        </p>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-vara-lg bg-evergreen-teal text-white font-semibold text-vara-sm hover:opacity-90 transition-all"
        >
          Back to routines
        </button>
      </div>
    );
  }

  // ── Progress header ────────────────────────────────────────────────────────
  const progressPct = ((currentIndex) / totalActivities) * 100;

  return (
    <div className="bg-white rounded-vara-xl border border-divider shadow-vara-sm overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-divider">
        <div>
          <div className="font-semibold text-soft-charcoal text-vara-sm">{routine.name}</div>
          <div className="text-xs text-muted-sage-gray mt-0.5">
            {currentIndex + 1} of {totalActivities}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-sage-gray hover:text-soft-charcoal p-1"
          aria-label="End routine"
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-dew-sage-light">
        <div
          className="h-full bg-evergreen-teal transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {isTimed ? (
        // ── Timed mode ─────────────────────────────────────────────────────
        <div className="p-8 text-center space-y-6">
          <div>
            <h3 className="text-vara-2xl font-semibold text-soft-charcoal mb-1">{current?.name}</h3>
            <p className="text-vara-sm text-muted-sage-gray">{current?.duration} min</p>
          </div>

          {/* Timer */}
          <div className="text-6xl font-bold text-evergreen-teal tracking-tight font-mono">
            {formatTime(timeRemaining)}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIsPaused(p => !p)}
              className="flex items-center gap-2 px-6 py-3 rounded-vara-lg bg-evergreen-teal text-white font-semibold text-vara-sm hover:opacity-90 transition-all"
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={handleSkip}
              className="flex items-center gap-2 px-5 py-3 rounded-vara-lg border border-divider text-soft-charcoal font-medium text-vara-sm hover:bg-dew-sage-light transition-all"
            >
              <SkipForward size={18} />
              Skip
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-muted-sage-gray text-vara-sm hover:text-soft-charcoal transition-all"
          >
            End routine
          </button>
        </div>
      ) : (
        // ── Checklist mode ────────────────────────────────────────────────
        <div className="p-5 space-y-3">
          {activities.map((activity, index) => {
            const isDone = checked.includes(index);
            const isCurrent = index === currentIndex && !isDone;
            return (
              <button
                key={index}
                onClick={() => handleToggleCheck(index)}
                className={`w-full flex items-center gap-3 p-4 rounded-vara-lg border transition-all text-left ${
                  isDone
                    ? 'bg-dew-sage-light border-evergreen-teal/30 opacity-60'
                    : isCurrent
                    ? 'bg-white border-evergreen-teal shadow-vara-sm'
                    : 'bg-white border-divider hover:border-silver-sage'
                }`}
              >
                {isDone ? (
                  <CheckSquare size={20} className="text-evergreen-teal shrink-0" />
                ) : (
                  <Square size={20} className={`shrink-0 ${isCurrent ? 'text-evergreen-teal' : 'text-muted-sage-gray/50'}`} />
                )}
                <span className={`flex-1 font-medium text-vara-sm ${isDone ? 'line-through text-muted-sage-gray' : 'text-soft-charcoal'}`}>
                  {activity.name}
                </span>
                {isCurrent && !isDone && (
                  <ChevronRight size={16} className="text-evergreen-teal shrink-0" />
                )}
              </button>
            );
          })}

          <button
            onClick={onClose}
            className="w-full text-center text-muted-sage-gray text-vara-sm py-2 hover:text-soft-charcoal transition-all"
          >
            End routine
          </button>
        </div>
      )}
    </div>
  );
}
