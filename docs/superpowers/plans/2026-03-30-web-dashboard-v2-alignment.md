# Web Dashboard V2 Alignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web dashboard's V1 layout with the mobile V2 paradigm (Brain State Check-in, Protocol Card, Daily Reflection, Habit Tracker, Week Insight) and remove web-only pages that have no mobile equivalent.

**Architecture:** New Firestore services for brain state check-ins and daily reflections follow the existing `habits.service.js` pattern. A new `useDashboardV2` hook replaces the existing one, orchestrating the V2 card data. New dashboard components use Tailwind CSS matching the existing web design system. Routes and sidebar entries for removed pages are deleted.

**Tech Stack:** React, Tailwind CSS, Firebase Firestore, lucide-react icons

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/constants/brainStateProtocols.js` | Create | Protocol definitions ported from mobile |
| `src/services/db/brainStateCheckIn.service.js` | Create | CRUD for brainStateCheckIns collection |
| `src/services/db/dailyReflection.service.js` | Create | CRUD for dailyReflections collection |
| `src/hooks/useBrainStateWeekTrend.js` | Create | Rolling 7-day trend + summary computation |
| `src/hooks/useDashboardV2.js` | Rewrite | Orchestrate V2 dashboard state |
| `src/components/dashboard/BrainStateCheckin.jsx` | Create | 5-state picker with collapsed trend view |
| `src/components/dashboard/TodaysProtocolCard.jsx` | Create | Protocol card driven by brain state |
| `src/components/dashboard/DailyReflectionCard.jsx` | Create | Smooth/okay/hard reflection selector |
| `src/components/dashboard/WeeklyHabitsTracker.jsx` | Create | 7-day habit grid (replaces WeeklyHabitsCard) |
| `src/pages/Dashboard.jsx` | Rewrite | V2 card layout |
| `src/components/layout/SidebarLayout.jsx` | Modify | Remove nav links for deleted pages |
| `src/App.js` | Modify | Remove routes for deleted pages |

---

### Task 1: Brain State Protocols Constants

**Files:**
- Create: `src/constants/brainStateProtocols.js`

- [ ] **Step 1: Create the protocols file**

Create `src/constants/brainStateProtocols.js`:

```js
/**
 * Brain State Protocol Definitions
 * Maps each brain state to a recommended protocol.
 * Ported from mobile/src/constants/brainStateProtocols.ts
 */

export const BRAIN_STATES = [
  { state: 'wired', label: 'Wired', description: "Racing thoughts, can't settle", color: '#F87171' },
  { state: 'foggy', label: 'Foggy', description: 'Low energy, hard to focus', color: '#FBBF24' },
  { state: 'okay', label: 'Okay', description: 'Nothing great, nothing bad', color: '#9CA3AF' },
  { state: 'clear', label: 'Clear', description: 'Calm, present, ready', color: '#1B5E57' },
  { state: 'energized', label: 'Energized', description: 'Focused and sharp', color: '#10B981' },
];

export const BRAIN_STATE_PROTOCOLS = {
  wired: {
    id: 'extended-exhale',
    brainState: 'wired',
    name: 'Extended Exhale',
    description: 'Longer exhales activate your parasympathetic nervous system, slowing a racing mind.',
    duration: '5 min',
    durationSeconds: 300,
    category: 'breathwork',
    instructions: [
      'Find a comfortable seated position and close your eyes.',
      'Inhale slowly through your nose for 4 seconds.',
      'Exhale slowly through your mouth for 8 seconds.',
      'Repeat this pattern for 5 minutes, letting each exhale feel longer and softer.',
      'When your mind wanders, gently return to the breath count.',
    ],
  },
  foggy: {
    id: 'activating-breathwork',
    brainState: 'foggy',
    name: 'Activating Breathwork',
    description: 'Short, rhythmic breathing increases oxygen flow and wakes up your prefrontal cortex.',
    duration: '4 min',
    durationSeconds: 240,
    category: 'breathwork',
    instructions: [
      'Sit upright with your shoulders back.',
      'Inhale sharply through your nose for 2 seconds.',
      'Exhale forcefully through your mouth for 2 seconds.',
      'Keep a steady, energizing rhythm for 4 minutes.',
      'Finish with one deep breath in and a slow exhale out.',
    ],
  },
  okay: {
    id: 'micro-reset',
    brainState: 'okay',
    name: '90-Second Micro-Reset',
    description: 'A brief pause to reconnect with your senses and sharpen your awareness.',
    duration: '90 sec',
    durationSeconds: 90,
    category: 'reset',
    instructions: [
      'Pause whatever you are doing and sit still.',
      'Name 3 things you can see right now.',
      'Name 2 things you can hear.',
      'Name 1 thing you can feel (texture, temperature, pressure).',
      'Take one slow breath and continue your day.',
    ],
  },
  clear: {
    id: 'gratitude-clarity',
    brainState: 'clear',
    name: 'Gratitude & Clarity Reflection',
    description: 'When your mind is already calm, gratitude deepens that state and builds momentum.',
    duration: '3 min',
    durationSeconds: 180,
    category: 'reflection',
    instructions: [
      'Close your eyes and take three slow breaths.',
      'Think of one thing you are genuinely grateful for today. Stay with it for a moment.',
      'Ask yourself: what is the one thing that matters most today?',
      'Visualize yourself completing that one thing with calm focus.',
      'Open your eyes when you are ready.',
    ],
  },
  energized: {
    id: 'focus-primer',
    brainState: 'energized',
    name: 'Focus Primer',
    description: 'Channel high energy into a single intention before it scatters.',
    duration: '5 min',
    durationSeconds: 300,
    category: 'reflection',
    instructions: [
      'Write down or mentally name the single most important task for this energy.',
      'Close your eyes. Take 5 deep breaths to center your focus.',
      'Visualize the task from start to finish — what does "done" look like?',
      'Set a clear intention: "For the next block of time, I focus only on this."',
      'Open your eyes and begin immediately. Do not check your phone first.',
    ],
  },
};

export function getProtocolForState(state) {
  return BRAIN_STATE_PROTOCOLS[state];
}

export const STATE_RANK = {
  foggy: 1,
  wired: 2,
  okay: 3,
  clear: 4,
  energized: 5,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/brainStateProtocols.js
git commit -m "feat(web): add brain state protocol constants ported from mobile"
```

---

### Task 2: Brain State Check-In Service

**Files:**
- Create: `src/services/db/brainStateCheckIn.service.js`

- [ ] **Step 1: Create the service file**

Create `src/services/db/brainStateCheckIn.service.js`:

```js
import { db } from "../../firebase";
import {
  doc, getDoc, setDoc, updateDoc, query, collection,
  where, orderBy, limit, getDocs, serverTimestamp
} from "firebase/firestore";
import { getProtocolForState } from "../../constants/brainStateProtocols";

const COLLECTION = "brainStateCheckIns";

function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function getTodayCheckIn(userId) {
  const todayDate = getTodayDate();
  const checkInId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, checkInId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

export async function saveCheckIn(userId, brainState) {
  const todayDate = getTodayDate();
  const checkInId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, checkInId);
  const protocol = getProtocolForState(brainState);

  const existing = await getDoc(ref);
  if (existing.exists()) {
    const stateChanged = existing.data().brainState !== brainState;
    await updateDoc(ref, {
      brainState,
      protocolId: protocol.id,
      ...(stateChanged && { protocolCompleted: false }),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      userId,
      date: todayDate,
      brainState,
      protocolId: protocol.id,
      protocolCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

export async function markProtocolCompleted(userId) {
  const todayDate = getTodayDate();
  const checkInId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, checkInId);
  await updateDoc(ref, {
    protocolCompleted: true,
    updatedAt: serverTimestamp(),
  });
}

export async function getHistory(userId, days = 7) {
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(days)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db/brainStateCheckIn.service.js
git commit -m "feat(web): add brain state check-in Firestore service"
```

---

### Task 3: Daily Reflection Service

**Files:**
- Create: `src/services/db/dailyReflection.service.js`

- [ ] **Step 1: Create the service file**

Create `src/services/db/dailyReflection.service.js`:

```js
import { db } from "../../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const COLLECTION = "dailyReflections";

function getTodayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function getTodayReflection(userId) {
  const todayDate = getTodayDate();
  const reflectionId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, reflectionId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

export async function saveReflection(userId, difficulty) {
  const todayDate = getTodayDate();
  const reflectionId = `${userId}_${todayDate}`;
  const ref = doc(db, COLLECTION, reflectionId);
  await setDoc(ref, {
    userId,
    date: todayDate,
    difficulty,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db/dailyReflection.service.js
git commit -m "feat(web): add daily reflection Firestore service"
```

---

### Task 4: Brain State Week Trend Hook

**Files:**
- Create: `src/hooks/useBrainStateWeekTrend.js`

- [ ] **Step 1: Create the hook file**

Create `src/hooks/useBrainStateWeekTrend.js` (same logic as mobile, adapted for plain JS):

```js
import { useState, useEffect } from "react";
import { getHistory } from "../services/db/brainStateCheckIn.service";
import { BRAIN_STATES, STATE_RANK } from "../constants/brainStateProtocols";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getColorForState(state) {
  const found = BRAIN_STATES.find((s) => s.state === state);
  return found ? found.color : null;
}

export function buildWeekSlots(history) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const historyMap = new Map(history.map((h) => [h.date, h.brainState]));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayIndex = (d.getDay() + 6) % 7;
    const state = historyMap.get(dateStr) ?? null;
    return {
      date: dateStr,
      dayLabel: DAY_LABELS[dayIndex],
      brainState: state,
      color: state ? getColorForState(state) : null,
    };
  });
}

export function computeSummary(days) {
  const withData = days.filter((d) => d.brainState !== null);
  if (withData.length < 2) return null;

  const counts = new Map();
  for (const d of withData) {
    counts.set(d.brainState, (counts.get(d.brainState) ?? 0) + 1);
  }
  for (const [state, count] of counts) {
    if (count >= 3) {
      const label = state.charAt(0).toUpperCase() + state.slice(1);
      return `${label} ${count} of ${withData.length} days`;
    }
  }

  if (withData.length >= 4) {
    const mid = Math.floor(withData.length / 2);
    const firstHalf = withData.slice(0, mid);
    const secondHalf = withData.slice(mid);
    const avg = (arr) =>
      arr.reduce((sum, d) => sum + STATE_RANK[d.brainState], 0) / arr.length;
    const firstAvg = avg(firstHalf);
    const secondAvg = avg(secondHalf);
    if (secondAvg - firstAvg >= 0.5) return "Trending clearer this week";
    if (firstAvg - secondAvg >= 0.5) return "Trending foggier this week";
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const parts = sorted.slice(0, 2).map(([state, count]) => `${count} ${state}`);
  return `Mixed week — ${parts.join(", ")}`;
}

export function useBrainStateWeekTrend(userId, refreshKey) {
  const [trend, setTrend] = useState({ days: [], summary: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const history = await getHistory(userId, 7);
        if (cancelled) return;

        const mapped = history.map((h) => ({
          date: h.date,
          brainState: h.brainState,
        }));

        const days = buildWeekSlots(mapped);
        const summary = computeSummary(days);
        setTrend({ days, summary });
      } catch {
        // Fail silently — trend is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  return { ...trend, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useBrainStateWeekTrend.js
git commit -m "feat(web): add brain state week trend hook"
```

---

### Task 5: BrainStateCheckin Component

**Files:**
- Create: `src/components/dashboard/BrainStateCheckin.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/BrainStateCheckin.jsx`:

```jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BRAIN_STATES } from "../../constants/brainStateProtocols";
import { useAuth } from "../../context/AuthContext";
import { useBrainStateWeekTrend } from "../../hooks/useBrainStateWeekTrend";

export default function BrainStateCheckin({ currentCheckIn, onSelect, loading }) {
  const [isExpanded, setIsExpanded] = useState(!currentCheckIn);
  const [showCaptured, setShowCaptured] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { days, summary } = useBrainStateWeekTrend(
    user?.uid,
    currentCheckIn?.brainState
  );

  useEffect(() => {
    setIsExpanded(!currentCheckIn);
  }, [currentCheckIn]);

  const handleSelect = (state) => {
    if (loading) return;
    onSelect(state);
    setShowCaptured(true);
    setTimeout(() => {
      setShowCaptured(false);
      setIsExpanded(false);
    }, 2000);
  };

  // Captured confirmation
  if (showCaptured) {
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
        <div className="flex items-center justify-center py-vara-lg">
          <span className="text-vara-base font-medium text-evergreen-teal">Captured.</span>
        </div>
      </div>
    );
  }

  // Collapsed state
  if (!isExpanded && currentCheckIn) {
    const selectedState = BRAIN_STATES.find((s) => s.state === currentCheckIn.brainState);
    if (!selectedState) return null;

    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: selectedState.color }}
            />
            <span className="text-vara-sm font-semibold text-soft-charcoal">
              {selectedState.label}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-vara-sm text-evergreen-teal font-medium hover:opacity-80"
          >
            Change
          </button>
        </div>

        {summary && (
          <div className="border-t border-divider mt-vara-base pt-vara-base">
            <div className="flex justify-between px-2">
              {days.map((day) => (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={
                      day.color
                        ? { backgroundColor: day.color }
                        : { border: "1px solid #E5E7EB", backgroundColor: "transparent" }
                    }
                  />
                  <span className="text-[10px] text-muted-sage-gray">{day.dayLabel}</span>
                </div>
              ))}
            </div>
            <p className="text-vara-xs text-muted-sage-gray mt-vara-sm">{summary}</p>
            <button
              onClick={() => navigate("/insights")}
              className="text-vara-xs text-evergreen-teal mt-1 block ml-auto hover:opacity-80"
            >
              See your week →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Expanded state
  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
      <h2 className="text-vara-lg font-semibold text-soft-charcoal">
        How's your brain feeling?
      </h2>
      <p className="text-vara-xs text-muted-sage-gray mb-vara-lg">
        Just one tap. No wrong answers.
      </p>

      <div className="flex flex-col gap-vara-sm">
        {BRAIN_STATES.map((item) => (
          <button
            key={item.state}
            onClick={() => handleSelect(item.state)}
            disabled={loading}
            className={`flex items-center gap-3 px-vara-base py-vara-sm rounded-vara-md text-left transition-colors ${
              currentCheckIn?.brainState === item.state
                ? "bg-dew-sage-light"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div>
              <span className="text-vara-sm font-semibold text-soft-charcoal block">
                {item.label}
              </span>
              <span className="text-vara-xs text-muted-sage-gray">
                {item.description}
              </span>
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-vara-lg">
          <span className="text-vara-sm text-muted-sage-gray">Saving...</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/BrainStateCheckin.jsx
git commit -m "feat(web): add BrainStateCheckin dashboard component"
```

---

### Task 6: TodaysProtocolCard Component

**Files:**
- Create: `src/components/dashboard/TodaysProtocolCard.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/TodaysProtocolCard.jsx`:

```jsx
import React, { useState } from "react";
import { CheckCircle2, Circle, Clock, Wind, RotateCcw, Lightbulb } from "lucide-react";
import { getProtocolForState } from "../../constants/brainStateProtocols";

const CATEGORY_ICONS = {
  breathwork: Wind,
  reset: RotateCcw,
  reflection: Lightbulb,
};

export default function TodaysProtocolCard({ brainState, protocolCompleted, onComplete }) {
  const [showInstructions, setShowInstructions] = useState(false);
  const protocol = getProtocolForState(brainState);
  if (!protocol) return null;

  const Icon = CATEGORY_ICONS[protocol.category] || Lightbulb;

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-vara-md bg-teal-light flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-evergreen-teal" />
          </div>
          <div>
            <h3 className="text-vara-sm font-semibold text-soft-charcoal">
              {protocol.name}
            </h3>
            <p className="text-vara-xs text-muted-sage-gray mt-0.5">
              {protocol.description}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Clock size={12} className="text-muted-sage-gray" />
              <span className="text-vara-xs text-muted-sage-gray">{protocol.duration}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onComplete}
          disabled={protocolCompleted}
          className="flex-shrink-0 ml-3"
        >
          {protocolCompleted ? (
            <CheckCircle2 size={24} className="text-evergreen-teal" />
          ) : (
            <Circle size={24} className="text-muted-sage-gray hover:text-evergreen-teal transition-colors" />
          )}
        </button>
      </div>

      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="text-vara-xs text-evergreen-teal mt-vara-sm hover:opacity-80"
      >
        {showInstructions ? "Hide steps" : "Show steps"}
      </button>

      {showInstructions && (
        <ol className="mt-vara-sm space-y-2 pl-5 list-decimal">
          {protocol.instructions.map((step, i) => (
            <li key={i} className="text-vara-xs text-soft-charcoal">{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/TodaysProtocolCard.jsx
git commit -m "feat(web): add TodaysProtocolCard dashboard component"
```

---

### Task 7: DailyReflectionCard Component

**Files:**
- Create: `src/components/dashboard/DailyReflectionCard.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/DailyReflectionCard.jsx`:

```jsx
import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const DIFFICULTIES = [
  { value: "smooth", label: "Smooth", emoji: "😊" },
  { value: "okay", label: "Okay", emoji: "😐" },
  { value: "hard", label: "Hard", emoji: "😓" },
];

export default function DailyReflectionCard({ reflection, onSave, loading }) {
  const [saved, setSaved] = useState(!!reflection);

  if (saved || reflection) {
    const selected = DIFFICULTIES.find((d) => d.value === (reflection?.difficulty || "okay"));
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={20} className="text-evergreen-teal" />
          <span className="text-vara-sm text-soft-charcoal">
            Today felt <strong>{selected?.label.toLowerCase()}</strong>
          </span>
        </div>
      </div>
    );
  }

  const handleSelect = async (difficulty) => {
    await onSave(difficulty);
    setSaved(true);
  };

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
      <h3 className="text-vara-sm font-semibold text-soft-charcoal">
        How did today feel?
      </h3>
      <p className="text-vara-xs text-muted-sage-gray mt-0.5 mb-vara-base">
        All your habits are done. Quick reflection before you go.
      </p>

      <div className="flex gap-vara-sm">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value}
            onClick={() => handleSelect(d.value)}
            disabled={loading}
            className="flex-1 flex flex-col items-center gap-1 py-vara-sm px-vara-base rounded-vara-md bg-gray-50 hover:bg-teal-light transition-colors"
          >
            <span className="text-xl">{d.emoji}</span>
            <span className="text-vara-xs text-soft-charcoal font-medium">{d.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/DailyReflectionCard.jsx
git commit -m "feat(web): add DailyReflectionCard dashboard component"
```

---

### Task 8: WeeklyHabitsTracker Component

**Files:**
- Create: `src/components/dashboard/WeeklyHabitsTracker.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/WeeklyHabitsTracker.jsx`:

```jsx
import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

function getTodayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildVisibleDays() {
  const days = [];
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: ymd, label: labels[d.getDay()], isToday: i === 0 });
  }
  return days;
}

export default function WeeklyHabitsTracker({ habits, completions, onToggle }) {
  const visibleDays = buildVisibleDays();
  const today = getTodayYMD();

  const activeHabits = habits.filter((h) => h.active !== false);

  if (activeHabits.length === 0) {
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
        <p className="text-vara-sm text-muted-sage-gray text-center">
          No active habits yet. Create one to get started.
        </p>
      </div>
    );
  }

  function isCompleted(habitId, date) {
    return completions.some(
      (c) => c.habitId === habitId && c.dateISO === date
    );
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider overflow-x-auto">
      <h3 className="text-vara-sm font-semibold text-soft-charcoal mb-vara-base">
        This Week
      </h3>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `1fr repeat(7, 40px)` }}
      >
        {/* Header row */}
        <div />
        {visibleDays.map((day) => (
          <div
            key={day.date}
            className={`text-center text-vara-xs font-medium pb-2 ${
              day.isToday ? "text-evergreen-teal" : "text-muted-sage-gray"
            }`}
          >
            {day.label}
          </div>
        ))}

        {/* Habit rows */}
        {activeHabits.map((habit) => (
          <React.Fragment key={habit.id}>
            <div className="text-vara-xs text-soft-charcoal truncate pr-2 flex items-center">
              {habit.name || habit.title}
            </div>
            {visibleDays.map((day) => {
              const completed = isCompleted(habit.id, day.date);
              const isFuture = day.date > today;
              return (
                <div key={day.date} className="flex items-center justify-center">
                  {isFuture ? (
                    <span className="w-5 h-5" />
                  ) : (
                    <button
                      onClick={() => onToggle(habit.id, day.date, !completed)}
                      className="transition-colors"
                      disabled={day.date !== today}
                    >
                      {completed ? (
                        <CheckCircle2
                          size={20}
                          className="text-evergreen-teal"
                        />
                      ) : (
                        <Circle
                          size={20}
                          className={
                            day.date === today
                              ? "text-muted-sage-gray hover:text-evergreen-teal"
                              : "text-gray-200"
                          }
                        />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/WeeklyHabitsTracker.jsx
git commit -m "feat(web): add WeeklyHabitsTracker dashboard component"
```

---

### Task 9: Rewrite useDashboardV2 Hook

**Files:**
- Rewrite: `src/hooks/useDashboardV2.js`

- [ ] **Step 1: Rewrite the hook**

Replace the entire contents of `src/hooks/useDashboardV2.js` with:

```js
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useHabits } from "./useHabits";
import {
  getTodayCheckIn,
  saveCheckIn,
  markProtocolCompleted,
} from "../services/db/brainStateCheckIn.service";
import {
  getTodayReflection,
  saveReflection,
} from "../services/db/dailyReflection.service";

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function useDashboardV2() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [userName, setUserName] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  // Brain state check-in
  const [brainStateCheckIn, setBrainStateCheckIn] = useState(null);
  const [brainStateLoading, setBrainStateLoading] = useState(false);

  // Daily reflection
  const [reflection, setReflection] = useState(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);

  // Habits
  const { habits, habitCompletions, logHabitToday } = useHabits(uid);

  // Load initial data
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    async function load() {
      try {
        const [userDoc, checkIn, refl] = await Promise.all([
          getDoc(doc(db, "users", uid)),
          getTodayCheckIn(uid),
          getTodayReflection(uid),
        ]);

        if (cancelled) return;

        if (userDoc.exists()) {
          setUserName(userDoc.data().displayName || "");
        }
        setBrainStateCheckIn(checkIn);
        setReflection(refl);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [uid]);

  // Handle brain state selection
  const handleBrainStateSelect = useCallback(async (state) => {
    if (!uid) return;
    setBrainStateLoading(true);
    try {
      const result = await saveCheckIn(uid, state);
      setBrainStateCheckIn(result);
    } catch (err) {
      console.error("Brain state save error:", err);
    } finally {
      setBrainStateLoading(false);
    }
  }, [uid]);

  // Handle protocol completion
  const handleProtocolComplete = useCallback(async () => {
    if (!uid) return;
    try {
      await markProtocolCompleted(uid);
      setBrainStateCheckIn((prev) => prev ? { ...prev, protocolCompleted: true } : prev);
    } catch (err) {
      console.error("Protocol complete error:", err);
    }
  }, [uid]);

  // Handle daily reflection
  const handleReflectionSave = useCallback(async (difficulty) => {
    if (!uid) return;
    setReflectionLoading(true);
    try {
      const result = await saveReflection(uid, difficulty);
      setReflection(result);
    } catch (err) {
      console.error("Reflection save error:", err);
    } finally {
      setReflectionLoading(false);
    }
  }, [uid]);

  // Handle habit toggle
  const handleHabitToggle = useCallback(async (habitId, date, completed) => {
    if (!uid) return;
    await logHabitToday(habitId, date, completed);
  }, [uid, logHabitToday]);

  // Check if all active habits are completed today
  const today = todayYMD();
  const activeHabits = habits.filter((h) => h.active !== false);
  const allHabitsCompleted =
    activeHabits.length > 0 &&
    activeHabits.every((h) =>
      habitCompletions.some((c) => c.habitId === h.id && c.dateISO === today)
    );
  const showReflection = allHabitsCompleted && !reflection;

  return {
    user,
    userName,
    greeting: getGreeting(),
    formattedDate: getFormattedDate(),
    dataLoading,

    brainStateCheckIn,
    brainStateLoading,
    handleBrainStateSelect,

    handleProtocolComplete,

    habits,
    habitCompletions,
    handleHabitToggle,

    reflection,
    reflectionLoading,
    showReflection,
    handleReflectionSave,

    allHabitsCompleted,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useDashboardV2.js
git commit -m "feat(web): rewrite useDashboardV2 hook for V2 dashboard layout"
```

---

### Task 10: Rewrite Dashboard Page

**Files:**
- Rewrite: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Rewrite the dashboard page**

Replace the entire contents of `src/pages/Dashboard.jsx` with:

```jsx
import React from "react";
import SidebarLayout from "../components/layout/SidebarLayout";

import { useDashboardV2 } from "../hooks/useDashboardV2";
import { useWeeklyCorrelations } from "../hooks/useWeeklyCorrelations";
import { selectWeekInsight } from "../constants/weekInsightTemplates";

import BrainStateCheckin from "../components/dashboard/BrainStateCheckin";
import TodaysProtocolCard from "../components/dashboard/TodaysProtocolCard";
import DailyReflectionCard from "../components/dashboard/DailyReflectionCard";
import WeeklyHabitsTracker from "../components/dashboard/WeeklyHabitsTracker";
import WeekInsightCard from "../components/dashboard/WeekInsightCard";

export default function Dashboard() {
  const {
    user,
    userName,
    greeting,
    formattedDate,
    dataLoading,

    brainStateCheckIn,
    brainStateLoading,
    handleBrainStateSelect,

    handleProtocolComplete,

    habits,
    habitCompletions,
    handleHabitToggle,

    reflection,
    reflectionLoading,
    showReflection,
    handleReflectionSave,
  } = useDashboardV2();

  const { correlations } = useWeeklyCorrelations();
  const weekInsight = correlations ? selectWeekInsight(correlations) : null;

  if (dataLoading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-evergreen-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-vara-sm text-muted-sage-gray">Loading your dashboard...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-3xl mx-auto px-vara-base py-vara-lg">

        {/* Header */}
        <h1 className="text-vara-2xl font-semibold text-soft-charcoal">
          {greeting}, {userName}
        </h1>
        <p className="text-vara-sm text-muted-sage-gray mt-1">{formattedDate}</p>

        {/* V2 Card Stack */}
        <div className="flex flex-col gap-vara-base mt-vara-lg">

          {/* 1. Brain State Check-In */}
          <BrainStateCheckin
            currentCheckIn={brainStateCheckIn}
            onSelect={handleBrainStateSelect}
            loading={brainStateLoading}
          />

          {/* 2. Today's Protocol (only after check-in) */}
          {brainStateCheckIn && (
            <TodaysProtocolCard
              brainState={brainStateCheckIn.brainState}
              protocolCompleted={brainStateCheckIn.protocolCompleted}
              onComplete={handleProtocolComplete}
            />
          )}

          {/* 3. Daily Reflection (only after all habits done) */}
          {(showReflection || reflection) && (
            <DailyReflectionCard
              reflection={reflection}
              onSave={handleReflectionSave}
              loading={reflectionLoading}
            />
          )}

          {/* 4. Weekly Habits Tracker */}
          <WeeklyHabitsTracker
            habits={habits}
            completions={habitCompletions}
            onToggle={handleHabitToggle}
          />

          {/* 5. Week Insight Card */}
          {weekInsight && (
            <WeekInsightCard
              headline={weekInsight.headline}
              supporting={weekInsight.supporting}
            />
          )}

        </div>
      </div>
    </SidebarLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat(web): rewrite Dashboard page with V2 layout"
```

---

### Task 11: Remove Deleted Pages — Routes and Sidebar

**Files:**
- Modify: `src/App.js`
- Modify: `src/components/layout/SidebarLayout.jsx`

- [ ] **Step 1: Remove routes from App.js**

Remove the following `<Route>` blocks from `src/App.js`:
- The route with `path="/brain-health"`
- The route with `path="/mental-resilience"`
- The route with `path="/fuel-recovery"`
- The route with `path="/sleep"` (standalone sleep page, NOT `/discover/sleep`)
- The route with `path="/reflections"`

Also remove the corresponding `import` statements for these page components at the top of the file.

- [ ] **Step 2: Remove sidebar nav entries from SidebarLayout.jsx**

In `src/components/layout/SidebarLayout.jsx`, modify the `navSections` array:

In the `"focus"` section, remove the `{ path: "/brain-health", label: "Brain Health", icon: Brain }` entry.

The result should be:
```js
{
  id: "focus",
  label: "Focus",
  items: [
    { path: "/focus", label: "Pomodoro & Routines", icon: Timer },
  ],
},
```

Also remove the `Brain` import from the lucide-react imports if it's no longer used elsewhere.

No other sidebar sections need changes — `/sleep` is under Discover as `/discover/sleep` (stays), `/reflections` and `/mental-resilience` and `/fuel-recovery` are not in the sidebar.

- [ ] **Step 3: Verify the app compiles**

Run: `cd C:/Users/kyler/wellness-app && npm run build 2>&1 | tail -20`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.js src/components/layout/SidebarLayout.jsx
git commit -m "refactor(web): remove web-only pages with no mobile equivalent"
```

---

### Task 12: Smoke Test and Cleanup

- [ ] **Step 1: Start the dev server and verify dashboard loads**

Run: `cd C:/Users/kyler/wellness-app && npm start`

Navigate to `http://localhost:3000/dashboard`. Verify:
- Brain State Check-in card shows 5 states
- Selecting a state shows "Captured." then collapses
- Protocol card appears after selection
- Habits tracker shows active habits
- No console errors related to removed components

- [ ] **Step 2: Verify removed routes return 404 or redirect**

Navigate to:
- `/brain-health` — should not render the old page
- `/mental-resilience` — should not render the old page
- `/fuel-recovery` — should not render the old page

- [ ] **Step 3: Verify sidebar has no dead links**

Check that Brain Health is no longer in the sidebar.

- [ ] **Step 4: Run existing tests**

Run: `cd C:/Users/kyler/wellness-app && npm test -- --watchAll=false 2>&1 | tail -20`

Fix any failures caused by removed imports.

- [ ] **Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore(web): cleanup after dashboard V2 migration"
```
