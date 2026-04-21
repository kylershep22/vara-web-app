# Phase 3: Routine Player — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Active Routine Player with checklist and timed modes to the existing web routines system, plus a Firestore service layer and session logging.

**Architecture:** The web already has `RoutineDesigner.jsx` (full CRUD, activity library, reorder) embedded in the Focus page's Routines tab. This plan adds: (1) a `routines.service.js` for session logging, (2) a `RoutinePlayer.jsx` full-screen modal with checklist and timed modes, and (3) a "Begin Routine" button in `RoutineDesigner.jsx` that launches the player. The RoutineDesigner's existing inline Firestore calls are left as-is — only session logging uses the new service.

**Tech Stack:** React, Tailwind CSS, Firebase Firestore, lucide-react icons

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/services/db/routineSessions.service.js` | Create | Log routine sessions (start, complete) |
| `src/components/routines/RoutinePlayer.jsx` | Create | Full-screen routine player (checklist + timed modes) |
| `src/components/focus/RoutineDesigner.jsx` | Modify | Add "Begin Routine" button that opens the player |

---

### Task 1: Routine Sessions Service

**Files:**
- Create: `src/services/db/routineSessions.service.js`

- [ ] **Step 1: Create the service file**

Create `src/services/db/routineSessions.service.js`:

```js
import { db } from "../../firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

const COLLECTION = "focusSessions";

/**
 * Start a routine session. Returns the session doc ID.
 */
export async function startSession(userId, routine) {
  const ref = await addDoc(collection(db, COLLECTION), {
    userId,
    routineId: routine.id,
    routineName: routine.name,
    routineType: routine.type,
    totalActivities: routine.activities.length,
    activitiesCompleted: 0,
    completed: false,
    startedAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}

/**
 * Mark a session as complete.
 */
export async function completeSession(sessionId, activitiesCompleted) {
  const ref = doc(db, COLLECTION, sessionId);
  await updateDoc(ref, {
    completed: true,
    activitiesCompleted,
    completedAt: serverTimestamp(),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db/routineSessions.service.js
git commit -m "feat(web): add routine session logging service"
```

---

### Task 2: RoutinePlayer Component

**Files:**
- Create: `src/components/routines/RoutinePlayer.jsx`

- [ ] **Step 1: Create the player component**

Create `src/components/routines/RoutinePlayer.jsx`. This is a full-screen modal with two modes: checklist and timed.

```jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Check, Play, Pause, SkipForward, RotateCcw,
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
  const [mode, setMode] = useState("checklist"); // "checklist" | "timed"
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
            isPaused={isPaused}
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

function TimedMode({ activities, currentIndex, timeRemaining, isPaused, formatTime, currentActivity }) {
  if (!currentActivity) return null;

  const totalSeconds = currentActivity.duration * 60;
  const elapsed = totalSeconds - timeRemaining;
  const progressPct = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;
  const nextActivity = currentIndex < activities.length - 1 ? activities[currentIndex + 1] : null;

  // SVG ring dimensions
  const size = 200;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressPct / 100);

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto">
      {/* Current activity label */}
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

      {/* Up next */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/routines/RoutinePlayer.jsx
git commit -m "feat(web): add RoutinePlayer with checklist and timed modes"
```

---

### Task 3: Add "Begin Routine" Button to RoutineDesigner

**Files:**
- Modify: `src/components/focus/RoutineDesigner.jsx`

- [ ] **Step 1: Add imports and state for the player**

At the top of `RoutineDesigner.jsx`, add the import for the player (after existing imports around line 37):

```js
import RoutinePlayer from '../routines/RoutinePlayer';
```

Inside the component (after `const [loading, setLoading] = useState(false);` at line 47), add:

```js
const [playingRoutine, setPlayingRoutine] = useState(null);
```

- [ ] **Step 2: Add the "Begin Routine" button in the view mode**

In the routine view section (around line 492-500), after the Edit button, add a Begin button. Find this block:

```jsx
<button
  onClick={() => editExistingRoutine(currentRoutine)}
  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-divider text-soft-charcoal hover:bg-dew-sage-light transition-all"
>
  <Edit3 size={16} />
  Edit
</button>
```

Replace it with two buttons:

```jsx
<div className="flex gap-2">
  <button
    onClick={() => setPlayingRoutine(currentRoutine)}
    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-evergreen-teal text-white hover:opacity-90 transition-all font-medium"
  >
    <Play size={16} />
    Begin
  </button>
  <button
    onClick={() => editExistingRoutine(currentRoutine)}
    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-divider text-soft-charcoal hover:bg-dew-sage-light transition-all"
  >
    <Edit3 size={16} />
    Edit
  </button>
</div>
```

Also add `Play` to the lucide-react import at the top (after `Edit3` on line 23):

```js
import { ..., Edit3, Play, ... } from 'lucide-react';
```

- [ ] **Step 3: Render the player modal**

At the bottom of the component's return JSX (just before the closing `</div>` of the root div around line 591), add:

```jsx
{playingRoutine && (
  <RoutinePlayer
    routine={playingRoutine}
    userId={userId}
    onClose={() => setPlayingRoutine(null)}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/focus/RoutineDesigner.jsx
git commit -m "feat(web): add Begin Routine button and wire RoutinePlayer"
```

---

### Task 4: Smoke Test

- [ ] **Step 1: Build the app to verify no compilation errors**

```bash
npx react-scripts build 2>&1 | tail -15
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify the routines tab shows the Begin button**

Start the dev server, navigate to `/focus`, click "Routines" tab. If a routine exists, verify "Begin" button appears next to "Edit".

- [ ] **Step 3: Verify the player opens and both modes work**

Click "Begin" on a routine. The full-screen player should open. Toggle between Checklist and Timed modes. In checklist mode, check off activities and click "Done". In timed mode, hit play and verify the timer counts down.

- [ ] **Step 4: Verify completion state**

After completing a routine, the completion screen should show with "Routine complete" and a "Back to Focus" button.

- [ ] **Step 5: Final commit if cleanup needed**

```bash
git add -A
git commit -m "fix(web): phase 3 smoke test cleanup"
```
