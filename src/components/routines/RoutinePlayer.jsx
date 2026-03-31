import React, { useState, useEffect, useRef } from "react";
import {
  X, Play, Pause, SkipForward, RotateCcw,
  CheckCircle2, Circle, Clock, List, Timer
} from "lucide-react";
import { startSession, completeSession } from "../../services/db/routineSessions.service";

/**
 * Full-screen routine player with checklist and timed modes.
 *
 * Props:
 *   routine   – routine object with { id, name, type, activities }
 *   userId    – current user's UID
 *   onClose   – called when the player should close
 */
export default function RoutinePlayer({ routine, userId, onClose }) {
  const [mode, setMode] = useState("checklist");
  const [checkedActivities, setCheckedActivities] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const timerRef = useRef(null);

  const activities = routine?.activities || [];
  const totalActivities = activities.length;
  const currentActivity = activities[currentIndex];

  // Start session on mount
  useEffect(() => {
    if (!routine || !userId) return;
    startSession(userId, routine).then(setSessionId);
  }, [routine, userId]);

  // Initialize timer when switching to timed mode or advancing activity
  useEffect(() => {
    if (mode === "timed" && currentActivity) {
      setTimeRemaining(currentActivity.duration * 60);
      setIsPaused(true);
    }
  }, [mode, currentIndex, currentActivity]);

  // Timer tick
  useEffect(() => {
    if (mode !== "timed" || isPaused || timeRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimedActivityComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [mode, isPaused, timeRemaining]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function handleTimedActivityComplete() {
    setCheckedActivities((prev) => new Set([...prev, currentIndex]));
    if (currentIndex < totalActivities - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPaused(true);
    } else {
      finishRoutine();
    }
  }

  function handleChecklistToggle(index) {
    setCheckedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleSkip() {
    if (currentIndex < totalActivities - 1) {
      setCheckedActivities((prev) => new Set([...prev, currentIndex]));
      setCurrentIndex(currentIndex + 1);
      setIsPaused(true);
    } else {
      finishRoutine();
    }
  }

  function handleRestart() {
    if (currentActivity) {
      setTimeRemaining(currentActivity.duration * 60);
      setIsPaused(true);
    }
  }

  function finishRoutine() {
    setIsComplete(true);
    if (sessionId) {
      completeSession(sessionId, checkedActivities.size + 1);
    }
  }

  function handleChecklistDone() {
    setIsComplete(true);
    if (sessionId) {
      completeSession(sessionId, checkedActivities.size);
    }
  }

  const progress = totalActivities > 0
    ? Math.round((checkedActivities.size / totalActivities) * 100)
    : 0;

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  if (!routine) return null;

  // ── Completion State ──
  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-evergreen-teal/15 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-evergreen-teal" />
          </div>
          <h2 className="text-2xl font-semibold text-soft-charcoal mb-2">Routine complete</h2>
          <p className="text-muted-sage-gray mb-8">
            {checkedActivities.size} of {totalActivities} activities completed
          </p>
          <button
            onClick={onClose}
            className="bg-evergreen-teal text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition"
          >
            Back to Focus
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-divider">
        <div>
          <h2 className="text-lg font-semibold text-soft-charcoal">{routine.name}</h2>
          <p className="text-sm text-muted-sage-gray">
            {routine.type.charAt(0).toUpperCase() + routine.type.slice(1)} routine
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-sage-gray hover:text-soft-charcoal p-2"
        >
          <X size={24} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-evergreen-teal transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-2 mx-4 mt-4 bg-gray-100 rounded-lg">
        <button
          onClick={() => setMode("checklist")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
            mode === "checklist"
              ? "bg-white text-evergreen-teal shadow-sm"
              : "text-muted-sage-gray"
          }`}
        >
          <List size={16} /> Checklist
        </button>
        <button
          onClick={() => setMode("timed")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
            mode === "timed"
              ? "bg-white text-evergreen-teal shadow-sm"
              : "text-muted-sage-gray"
          }`}
        >
          <Timer size={16} /> Timed
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {mode === "checklist" ? (
          <ChecklistMode
            activities={activities}
            checkedActivities={checkedActivities}
            onToggle={handleChecklistToggle}
          />
        ) : (
          <TimedMode
            activities={activities}
            currentIndex={currentIndex}
            timeRemaining={timeRemaining}
            formatTime={formatTime}
            currentActivity={currentActivity}
          />
        )}
      </div>

      {/* Footer controls */}
      <div className="p-4 border-t border-divider">
        {mode === "checklist" ? (
          <button
            onClick={handleChecklistDone}
            disabled={checkedActivities.size === 0}
            className="w-full bg-evergreen-teal text-white py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-40"
          >
            Done ({checkedActivities.size}/{totalActivities})
          </button>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleRestart}
              className="p-3 rounded-full border border-divider text-muted-sage-gray hover:text-soft-charcoal transition"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-4 rounded-full bg-evergreen-teal text-white hover:opacity-90 transition"
            >
              {isPaused ? <Play size={24} /> : <Pause size={24} />}
            </button>
            <button
              onClick={handleSkip}
              className="p-3 rounded-full border border-divider text-muted-sage-gray hover:text-soft-charcoal transition"
            >
              <SkipForward size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Checklist Mode ────────────────────────────────────────────── */

function ChecklistMode({ activities, checkedActivities, onToggle }) {
  return (
    <div className="space-y-2 max-w-lg mx-auto">
      {activities.map((activity, index) => {
        const checked = checkedActivities.has(index);
        return (
          <button
            key={activity.id ?? index}
            onClick={() => onToggle(index)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              checked
                ? "border-evergreen-teal bg-teal-50"
                : "border-divider hover:border-silver-sage"
            }`}
          >
            {checked ? (
              <CheckCircle2 size={24} className="text-evergreen-teal flex-shrink-0" />
            ) : (
              <Circle size={24} className="text-muted-sage-gray flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${checked ? "text-evergreen-teal line-through" : "text-soft-charcoal"}`}>
                {activity.name}
              </p>
              <p className="text-sm text-muted-sage-gray flex items-center gap-1 mt-0.5">
                <Clock size={12} /> {activity.duration} min
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Timed Mode ────────────────────────────────────────────────── */

function TimedMode({ activities, currentIndex, timeRemaining, formatTime, currentActivity }) {
  if (!currentActivity) return null;

  const totalSeconds = currentActivity.duration * 60;
  const elapsed = totalSeconds - timeRemaining;
  const progressPct = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;
  const nextActivity = currentIndex < activities.length - 1 ? activities[currentIndex + 1] : null;

  const size = 200;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressPct / 100);

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto">
      <p className="text-sm text-muted-sage-gray mb-2">
        Activity {currentIndex + 1} of {activities.length}
      </p>
      <h3 className="text-xl font-semibold text-soft-charcoal mb-6">
        {currentActivity.name}
      </h3>

      {/* Timer ring */}
      <div className="relative mb-8">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1B5E57"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-mono font-semibold text-soft-charcoal">
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {nextActivity && (
        <div className="w-full bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-muted-sage-gray uppercase tracking-wide mb-1">Up next</p>
          <p className="text-sm font-medium text-soft-charcoal">{nextActivity.name}</p>
          <p className="text-xs text-muted-sage-gray">{nextActivity.duration} min</p>
        </div>
      )}
    </div>
  );
}
