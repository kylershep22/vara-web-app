# Phase 2: Identity-Based Habits — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the web habit system from basic CRUD to the mobile app's identity-based model with a 6-step creation wizard, scaling versions, completion reflections, and intention tracking.

**Architecture:** Two new constants files define categories and intentions. The existing `habits.service.js` gets a new completion function with reflection data. A new `HabitWizard` component replaces `AddHabitForm` for creation. A new `HabitCompletionSheet` modal intercepts habit toggles to capture reflections. The `GoalsHabits.jsx` page and `WeeklyHabitsTracker` are updated to wire everything together.

**Tech Stack:** React, Tailwind CSS, Firebase Firestore, lucide-react icons

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/constants/habitCategories.js` | Create | 12 categories, CR flags, CR callout content |
| `src/constants/intentions.js` | Create | 15 predefined intentions across 5 categories |
| `src/services/db/habits.service.js` | Modify | Add `logCompletion()` and `removeCompletion()` with reflection fields |
| `src/components/habits/HabitWizard.jsx` | Create | 6-step creation wizard (replaces AddHabitForm for new creation) |
| `src/components/habits/HabitCompletionSheet.jsx` | Create | Reflection modal shown on habit completion |
| `src/hooks/useHabits.js` | Modify | Use new `logCompletion()`, expose `pendingReflection` state |
| `src/pages/GoalsHabits.jsx` | Modify | Wire wizard for creation, completion sheet for toggles |
| `src/components/dashboard/WeeklyHabitsTracker.jsx` | Modify | Wire completion sheet for dashboard toggles |

---

### Task 1: Habit Categories Constants

**Files:**
- Create: `src/constants/habitCategories.js`

- [ ] **Step 1: Create the categories file**

Create `src/constants/habitCategories.js`:

```js
/**
 * Habit Categories — ported from mobile/src/constants/habitCategories.ts
 */

export const HABIT_CATEGORIES = [
  'Health',
  'Fitness',
  'Mindfulness',
  'Sleep',
  'Nutrition',
  'Productivity',
  'Learning',
  'Social',
  'Connection',
  'Creativity',
  'Self-Care',
  'Brain Health',
];

const COGNITIVE_RESERVE_CATEGORIES = {
  Health: false,
  Fitness: true,
  Mindfulness: false,
  Sleep: true,
  Nutrition: false,
  Productivity: false,
  Learning: true,
  Social: false,
  Connection: true,
  Creativity: true,
  'Self-Care': false,
  'Brain Health': true,
};

export function isCognitiveReserveCategory(category) {
  if (!category) return false;
  return COGNITIVE_RESERVE_CATEGORIES[category] === true;
}

export const CR_CALLOUT_CONTENT = {
  Connection: {
    headline: 'This habit supports brain health through connection',
    body: 'Meaningful connection triggers oxytocin — a natural stress buffer that protects long-term brain health.',
  },
  'Brain Health': {
    headline: 'This habit directly builds cognitive reserve',
    body: "Brain health habits build cognitive reserve — your brain's buffer against stress and aging.",
  },
  Fitness: {
    headline: 'This habit builds cognitive reserve through movement',
    body: 'Physical activity releases BDNF — a protein that supports new neural connections and long-term brain resilience.',
  },
  Learning: {
    headline: 'This habit builds cognitive reserve through novelty',
    body: "Learning new things creates neuroplastic pathways that strengthen your brain's long-term resilience.",
  },
  Sleep: {
    headline: 'This habit builds cognitive reserve through recovery',
    body: "Deep sleep activates the brain's glymphatic system, clearing metabolic waste that accumulates during the day.",
  },
  Creativity: {
    headline: 'This habit builds cognitive reserve through creative practice',
    body: 'Creative activity activates cross-hemispheric connections. Even short sessions contribute to long-term brain resilience.',
  },
};

export const CR_CALLOUT_FALLBACK = {
  headline: 'This category builds cognitive reserve',
  body: 'Habits in this category support neuroplasticity and long-term brain resilience.',
};

export function getCRCallout(category) {
  if (!isCognitiveReserveCategory(category)) return null;
  return CR_CALLOUT_CONTENT[category] || CR_CALLOUT_FALLBACK;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/habitCategories.js
git commit -m "feat(web): add habit categories with cognitive reserve mappings"
```

---

### Task 2: Intentions Constants

**Files:**
- Create: `src/constants/intentions.js`

- [ ] **Step 1: Create the intentions file**

Create `src/constants/intentions.js`:

```js
/**
 * Intention System Constants — ported from mobile/src/constants/intentions.ts
 */

export const INTENTION_OPTIONS = {
  focus_clarity: [
    'Sharpen my focus',
    'Clear mental fog',
    'Stay present and grounded',
  ],
  regulation_recovery: [
    'Manage stress better',
    'Process difficult emotions',
    'Build emotional resilience',
  ],
  sustainable_consistency: [
    'Show up for myself daily',
    'Build a lasting routine',
    'Create healthy momentum',
  ],
  energy_resilience: [
    'Boost my energy levels',
    'Recover from burnout',
    'Sustain energy throughout the day',
  ],
  brain_health: [
    'Build cognitive reserve',
    'Support long-term clarity',
    "Strengthen my brain's resilience",
  ],
};

export const INTENTION_CATEGORY_LABELS = {
  focus_clarity: 'Focus & Clarity',
  regulation_recovery: 'Regulation & Recovery',
  sustainable_consistency: 'Sustainable Consistency',
  energy_resilience: 'Energy & Resilience',
  brain_health: 'Brain Health',
};

export const INTENTION_CATEGORIES = Object.keys(INTENTION_OPTIONS);
```

- [ ] **Step 2: Commit**

```bash
git add src/constants/intentions.js
git commit -m "feat(web): add intention system constants"
```

---

### Task 3: Habit Completion Service Functions

**Files:**
- Modify: `src/services/db/habits.service.js`

- [ ] **Step 1: Add logCompletion and removeCompletion to habits.service.js**

Add after the existing `removeHabit` function (line 43) in `src/services/db/habits.service.js`:

```js
/**
 * Log a habit completion with optional reflection data.
 * Creates a doc in habitCompletions with a deterministic ID (habitId_dateISO).
 */
export async function logCompletion(userId, habitId, dateISO, reflectionData = {}) {
  const completionId = `${habitId}_${dateISO}`;
  const ref = doc(db, "habitCompletions", completionId);
  const { setDoc } = await import("firebase/firestore");
  await setDoc(ref, {
    userId,
    habitId,
    dateISO,
    reflection: reflectionData.reflection ?? null,
    connectionQuality: reflectionData.connectionQuality ?? null,
    skippedReflection: reflectionData.skippedReflection ?? false,
    source: reflectionData.source ?? 'track',
    crFlagged: reflectionData.crFlagged ?? false,
    valueAlignment: reflectionData.valueAlignment ?? null,
    createdAt: serverTimestamp(),
  });
  return { id: completionId };
}

/**
 * Remove a habit completion (un-toggle).
 */
export async function removeCompletion(habitId, dateISO) {
  const completionId = `${habitId}_${dateISO}`;
  const ref = doc(db, "habitCompletions", completionId);
  await deleteDoc(ref);
  return { id: completionId, deleted: true };
}
```

Also add `setDoc` to the imports at line 3. The full import line becomes:

```js
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc
} from "firebase/firestore";
```

And remove the dynamic `import("firebase/firestore")` from `logCompletion` — use the top-level `setDoc` instead.

Final `logCompletion`:

```js
export async function logCompletion(userId, habitId, dateISO, reflectionData = {}) {
  const completionId = `${habitId}_${dateISO}`;
  const ref = doc(db, "habitCompletions", completionId);
  await setDoc(ref, {
    userId,
    habitId,
    dateISO,
    reflection: reflectionData.reflection ?? null,
    connectionQuality: reflectionData.connectionQuality ?? null,
    skippedReflection: reflectionData.skippedReflection ?? false,
    source: reflectionData.source ?? 'track',
    crFlagged: reflectionData.crFlagged ?? false,
    valueAlignment: reflectionData.valueAlignment ?? null,
    createdAt: serverTimestamp(),
  });
  return { id: completionId };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db/habits.service.js
git commit -m "feat(web): add logCompletion and removeCompletion to habits service"
```

---

### Task 4: HabitCompletionSheet Component

**Files:**
- Create: `src/components/habits/HabitCompletionSheet.jsx`

- [ ] **Step 1: Create the completion sheet component**

Create `src/components/habits/HabitCompletionSheet.jsx`:

```jsx
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { isCognitiveReserveCategory } from "../../constants/habitCategories";

const REFLECTIONS = [
  { value: "smooth", label: "Smooth", emoji: "✓" },
  { value: "okay", label: "Okay", emoji: "~" },
  { value: "hard", label: "Hard today", emoji: "!" },
];

const CONNECTION_REFLECTIONS = [
  { value: "nourishing", label: "Nourishing", emoji: "🌿" },
  { value: "fine", label: "Fine", emoji: "~~" },
  { value: "draining", label: "Draining", emoji: "◌" },
];

const AFFIRMATIONS = {
  smooth: { title: "Captured. Building.", body: null },
  okay: { title: "Captured.", body: "Showing up is the work." },
  hard: { title: "Captured.", body: "Hard days count the most." },
  skip: { title: "Captured.", body: null },
  nourishing: { title: "Captured.", body: "That kind of connection is genuinely restorative." },
  fine: { title: "Captured.", body: "Connection is connection. It counts." },
  draining: { title: "Captured.", body: "Worth noticing. Your energy matters too." },
};

/**
 * Modal shown after toggling a habit complete.
 * Captures a reflection (smooth/okay/hard) or connection quality (nourishing/fine/draining).
 *
 * Props:
 *   habit        – the habit object being completed
 *   onSubmit     – called with { reflection, connectionQuality, skippedReflection, crFlagged, valueAlignment }
 *   onClose      – called when the sheet should close (cancel or after affirmation)
 */
export default function HabitCompletionSheet({ habit, onSubmit, onClose }) {
  const [selected, setSelected] = useState(null);
  const [affirmation, setAffirmation] = useState(null);

  const isConnection = habit?.category === "Connection";
  const isCR = isCognitiveReserveCategory(habit?.category);
  const options = isConnection ? CONNECTION_REFLECTIONS : REFLECTIONS;

  useEffect(() => {
    if (!affirmation) return;
    const timer = setTimeout(() => onClose(), 900);
    return () => clearTimeout(timer);
  }, [affirmation, onClose]);

  function handleSelect(value) {
    setSelected(value);

    const data = {
      reflection: isConnection ? null : value,
      connectionQuality: isConnection ? value : null,
      skippedReflection: false,
      crFlagged: isCR,
      valueAlignment: habit?.valueAlignment ?? null,
    };
    onSubmit(data);
    setAffirmation(AFFIRMATIONS[value]);
  }

  function handleSkip() {
    onSubmit({
      reflection: null,
      connectionQuality: null,
      skippedReflection: true,
      crFlagged: isCR,
      valueAlignment: habit?.valueAlignment ?? null,
    });
    setAffirmation(AFFIRMATIONS.skip);
  }

  if (!habit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-slide-up">
        {affirmation ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-evergreen-teal">{affirmation.title}</p>
            {affirmation.body && (
              <p className="text-sm text-muted-sage-gray mt-2">{affirmation.body}</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-soft-charcoal">
                {isConnection ? "How was that connection?" : "How did it go?"}
              </h3>
              <button onClick={onClose} className="text-muted-sage-gray hover:text-soft-charcoal">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-muted-sage-gray mb-4">
              {habit.name || habit.title}
            </p>

            {habit.valueAlignment && (
              <p className="text-xs text-evergreen-teal mb-4 italic">
                Today, toward {habit.valueAlignment}
              </p>
            )}

            <div className="flex gap-3 mb-4">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex-1 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                    selected === opt.value
                      ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal"
                      : "border-divider text-soft-charcoal hover:border-silver-sage"
                  }`}
                >
                  <span className="block text-lg mb-1">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>

            {isCR && (
              <p className="text-xs text-teal-700 bg-teal-50 rounded-lg p-2 mb-3">
                🌿 This habit builds your cognitive reserve
              </p>
            )}

            <button
              onClick={handleSkip}
              className="text-sm text-muted-sage-gray hover:text-soft-charcoal w-full text-center py-2"
            >
              Skip reflection
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/habits/HabitCompletionSheet.jsx
git commit -m "feat(web): add HabitCompletionSheet reflection modal"
```

---

### Task 5: HabitWizard Component

**Files:**
- Create: `src/components/habits/HabitWizard.jsx`

- [ ] **Step 1: Create the wizard component**

Create `src/components/habits/HabitWizard.jsx`:

```jsx
import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import { HABIT_CATEGORIES, isCognitiveReserveCategory, getCRCallout } from "../../constants/habitCategories";
import { INTENTION_OPTIONS, INTENTION_CATEGORY_LABELS, INTENTION_CATEGORIES } from "../../constants/intentions";

const TOTAL_STEPS = 6;

const DEFAULT_FORM = {
  name: "",
  category: "",
  type: "daily",
  frequency: 1,
  identity: "",
  identityStatement: "",
  outcomeGoal: "",
  fullVersion: "",
  quickStartVersion: "",
  justShowUpVersion: "",
  cueType: "time",
  cueValue: "",
  implementationIntention: "",
  intentionLabel: "",
  intentionCategory: "",
  intentionIsCustom: false,
  valueAlignment: "",
  problem: "",
};

/**
 * 6-step habit creation wizard matching mobile identity-based flow.
 *
 * Props:
 *   onSubmit  – called with the complete form data object
 *   onClose   – called to dismiss the wizard
 *   goalId    – optional goalId to link the habit
 */
export default function HabitWizard({ onSubmit, onClose, goalId }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canAdvance() {
    if (step === 1) return form.name.trim().length > 0;
    return true; // Steps 2-5 are skippable
  }

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }
  function handleBack() {
    if (step > 1) setStep(step - 1);
  }
  function handleSkip() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }

  function handleSubmit() {
    const data = { ...form };
    if (data.identity && !data.identityStatement) {
      data.identityStatement = `I'm becoming ${data.identity.toLowerCase()}`;
    }
    if (data.cueValue && data.name) {
      data.implementationIntention = `When ${data.cueValue}, I will ${data.name.toLowerCase()}`;
    }
    if (data.intentionLabel) {
      data.intention = {
        label: data.intentionLabel,
        category: data.intentionCategory,
        isCustom: data.intentionIsCustom,
      };
    }
    if (goalId) data.goalId = goalId;
    onSubmit(data);
  }

  const crCallout = getCRCallout(form.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-divider">
          <span className="text-sm text-muted-sage-gray">Step {step} of {TOTAL_STEPS}</span>
          <button onClick={onClose} className="text-muted-sage-gray hover:text-soft-charcoal">
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-evergreen-teal transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && <Step1Action form={form} set={set} crCallout={crCallout} />}
          {step === 2 && <Step2Identity form={form} set={set} />}
          {step === 3 && <Step3Scaling form={form} set={set} />}
          {step === 4 && <Step4Trigger form={form} set={set} />}
          {step === 5 && <Step5Intention form={form} set={set} />}
          {step === 6 && <Step6Review form={form} set={set} crCallout={crCallout} />}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between p-4 border-t border-divider">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1 text-sm text-muted-sage-gray hover:text-soft-charcoal disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="flex gap-2">
            {step > 1 && step < TOTAL_STEPS && (
              <button
                onClick={handleSkip}
                className="text-sm text-muted-sage-gray hover:text-soft-charcoal px-4 py-2"
              >
                Skip
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="flex items-center gap-1 bg-evergreen-teal text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-40 transition"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="bg-evergreen-teal text-white px-6 py-2 rounded-lg text-sm hover:opacity-90 transition font-medium"
              >
                Save Habit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Action (Required) ─────────────────────────────────── */

function Step1Action({ form, set, crCallout }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">What habit do you want to build?</h2>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Habit Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g., Morning run, Read 20 pages"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Category</label>
        <select
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal"
        >
          <option value="">Select a category...</option>
          {HABIT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {crCallout && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-sm font-medium text-teal-800 flex items-center gap-1">
            <Leaf size={14} /> {crCallout.headline}
          </p>
          <p className="text-xs text-teal-700 mt-1">{crCallout.body}</p>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-muted-sage-gray mb-1">Type</label>
          <div className="flex gap-2">
            {["daily", "weekly", "custom"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  set("type", t);
                  set("frequency", t === "daily" ? 1 : t === "weekly" ? 1 : form.frequency);
                }}
                className={`flex-1 py-2 rounded-lg text-sm border-2 transition ${
                  form.type === t
                    ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium"
                    : "border-divider text-soft-charcoal"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {form.type === "custom" && (
        <div>
          <label className="block text-sm font-medium text-muted-sage-gray mb-1">Times per week</label>
          <input
            type="number"
            min={1}
            max={7}
            value={form.frequency}
            onChange={(e) => set("frequency", parseInt(e.target.value, 10) || 1)}
            className="w-24 border border-divider rounded-lg p-2 text-soft-charcoal"
          />
        </div>
      )}
    </div>
  );
}

/* ── Step 2: Identity (Skippable) ──────────────────────────────── */

function Step2Identity({ form, set }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Who are you becoming?</h2>
      <p className="text-sm text-muted-sage-gray">
        Focus on the person you want to become, not just the outcome.
      </p>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">
          Identity (e.g., "A runner", "Someone who writes")
        </label>
        <input
          type="text"
          value={form.identity}
          onChange={(e) => set("identity", e.target.value)}
          placeholder="A person who..."
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      {form.identity.trim() && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-sm text-teal-800 italic">
            "I'm becoming {form.identity.toLowerCase()}"
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">
          Outcome Goal (optional)
        </label>
        <input
          type="text"
          value={form.outcomeGoal}
          onChange={(e) => set("outcomeGoal", e.target.value)}
          placeholder="e.g., Run a 5K"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>
    </div>
  );
}

/* ── Step 3: Scaling Versions (Skippable) ──────────────────────── */

function Step3Scaling({ form, set }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Set your scaling versions</h2>
      <p className="text-sm text-muted-sage-gray">
        On tough days, showing up is the win. Every version counts toward your progress!
      </p>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Full Version</label>
        <input
          type="text"
          value={form.fullVersion}
          onChange={(e) => set("fullVersion", e.target.value)}
          placeholder="e.g., Run 30 minutes"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Quick Start (5-10 min)</label>
        <input
          type="text"
          value={form.quickStartVersion}
          onChange={(e) => set("quickStartVersion", e.target.value)}
          placeholder="e.g., Run 10 minutes"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Just Show Up (1-2 min)</label>
        <input
          type="text"
          value={form.justShowUpVersion}
          onChange={(e) => set("justShowUpVersion", e.target.value)}
          placeholder="e.g., Put on shoes, step outside"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>
    </div>
  );
}

/* ── Step 4: Trigger (Skippable) ───────────────────────────────── */

const CUE_TYPES = [
  { value: "time", label: "Time", placeholder: "e.g., 7:00 AM" },
  { value: "after_habit", label: "After Habit", placeholder: "e.g., After breakfast" },
  { value: "location", label: "Location", placeholder: "e.g., At the gym" },
  { value: "emotion", label: "Feeling", placeholder: "e.g., When I feel stressed" },
];

function Step4Trigger({ form, set }) {
  const cueType = CUE_TYPES.find((c) => c.value === form.cueType) || CUE_TYPES[0];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Set a trigger</h2>
      <p className="text-sm text-muted-sage-gray">
        Linking your habit to a cue makes it more likely to stick.
      </p>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Cue Type</label>
        <div className="flex gap-2 flex-wrap">
          {CUE_TYPES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => set("cueType", c.value)}
              className={`px-3 py-2 rounded-lg text-sm border-2 transition ${
                form.cueType === c.value
                  ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium"
                  : "border-divider text-soft-charcoal"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">When?</label>
        <input
          type="text"
          value={form.cueValue}
          onChange={(e) => set("cueValue", e.target.value)}
          placeholder={cueType.placeholder}
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      {form.cueValue.trim() && form.name.trim() && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-sm text-teal-800 italic">
            "When {form.cueValue}, I will {form.name.toLowerCase()}"
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Step 5: Intention (Skippable) ─────────────────────────────── */

function Step5Intention({ form, set }) {
  const [expandedCat, setExpandedCat] = useState(null);
  const [customMode, setCustomMode] = useState(false);

  function selectIntention(label, category) {
    set("intentionLabel", label);
    set("intentionCategory", category);
    set("intentionIsCustom", false);
    setCustomMode(false);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Set an intention</h2>
      <p className="text-sm text-muted-sage-gray">
        Why does this habit matter to you?
      </p>

      {INTENTION_CATEGORIES.map((cat) => (
        <div key={cat}>
          <button
            type="button"
            onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
            className="w-full text-left text-sm font-medium text-soft-charcoal py-2 flex items-center justify-between"
          >
            {INTENTION_CATEGORY_LABELS[cat]}
            <ChevronRight
              size={16}
              className={`transition-transform ${expandedCat === cat ? "rotate-90" : ""}`}
            />
          </button>

          {expandedCat === cat && (
            <div className="flex flex-wrap gap-2 pb-2">
              {INTENTION_OPTIONS[cat].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => selectIntention(label, cat)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    form.intentionLabel === label && !form.intentionIsCustom
                      ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal"
                      : "border-divider text-soft-charcoal hover:border-silver-sage"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="border-t border-divider pt-3">
        <button
          type="button"
          onClick={() => setCustomMode(!customMode)}
          className="text-sm text-evergreen-teal hover:underline"
        >
          Write your own
        </button>
        {customMode && (
          <input
            type="text"
            value={form.intentionIsCustom ? form.intentionLabel : ""}
            onChange={(e) => {
              set("intentionLabel", e.target.value);
              set("intentionCategory", "sustainable_consistency");
              set("intentionIsCustom", true);
            }}
            maxLength={80}
            placeholder="My intention is..."
            className="mt-2 w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">
          Value alignment (optional)
        </label>
        <input
          type="text"
          value={form.valueAlignment}
          onChange={(e) => set("valueAlignment", e.target.value)}
          placeholder="e.g., Health, Family, Growth"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>
    </div>
  );
}

/* ── Step 6: Review ────────────────────────────────────────────── */

function Step6Review({ form, crCallout }) {
  const rows = [
    { label: "Habit", value: form.name },
    { label: "Category", value: form.category || "—" },
    { label: "Type", value: form.type },
    { label: "Identity", value: form.identity || "—" },
    { label: "Full version", value: form.fullVersion || "—" },
    { label: "Quick start", value: form.quickStartVersion || "—" },
    { label: "Just show up", value: form.justShowUpVersion || "—" },
    { label: "Trigger", value: form.cueValue ? `${form.cueType}: ${form.cueValue}` : "—" },
    { label: "Intention", value: form.intentionLabel || "—" },
    { label: "Value", value: form.valueAlignment || "—" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Review your habit</h2>

      {form.identity && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
          <p className="text-sm text-teal-800 italic">
            "I'm becoming {form.identity.toLowerCase()}"
          </p>
        </div>
      )}

      <div className="divide-y divide-divider/50">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between py-2">
            <span className="text-sm text-muted-sage-gray">{r.label}</span>
            <span className="text-sm text-soft-charcoal font-medium text-right max-w-[60%] truncate">
              {r.value}
              {r.label === "Category" && crCallout && (
                <span className="ml-1 text-xs text-teal-600">🌿 CR</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/habits/HabitWizard.jsx
git commit -m "feat(web): add 6-step HabitWizard creation component"
```

---

### Task 6: Update useHabits Hook

**Files:**
- Modify: `src/hooks/useHabits.js`

- [ ] **Step 1: Modify useHabits to support reflection-based completions**

Replace the `logHabitToday` function (lines 85-113) in `src/hooks/useHabits.js` with a version that:
1. Accepts optional `reflectionData` parameter
2. Uses deterministic completion IDs (`habitId_dateISO`)
3. Exposes `pendingReflection` state so the UI can show the completion sheet

Replace the full function and add new state/functions. The updated hook should be:

```js
import { useEffect, useMemo, useState, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  updateDoc, doc, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { logCompletion, removeCompletion } from '../services/db/habits.service';

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function toISO(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function getConsecutiveStreak(isoDatesSet) {
  const dates = Array.from(isoDatesSet).sort();
  const toDate = (iso) => new Date(iso + 'T00:00:00');
  let best = 0, current = 0, last = null;
  for (const iso of dates) {
    const d = toDate(iso);
    if (last) {
      const diff = Math.round((d - last) / (24*3600*1000));
      if (diff === 1) current += 1;
      else if (diff > 1) { best = Math.max(best, current); current = 1; }
    } else { current = 1; }
    last = d;
  }
  best = Math.max(best, current);
  const today = new Date(isoToday() + 'T00:00:00');
  let rolling = 0, probe = new Date(today);
  while (isoDatesSet.has(toISO(probe))) {
    rolling += 1;
    probe = new Date(probe.getTime() - 24*3600*1000);
  }
  return [rolling, best];
}

export function useHabits(userId) {
  const [habits, setHabits] = useState([]);
  const [habitCompletions, setHabitCompletions] = useState([]);
  const [pendingReflection, setPendingReflection] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const habitsQ = query(collection(db, 'habits'), where('userId', '==', userId));
    const unsubHabits = onSnapshot(habitsQ, (snap) => {
      setHabits(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        title: d.data().title ?? d.data().name ?? 'Untitled Habit',
        name: d.data().name ?? d.data().title ?? 'Untitled Habit',
        status: d.data().status ?? 'active',
        type: d.data().type ?? d.data().frequency ?? 'daily'
      })));
    });

    const hcQ = query(
      collection(db, 'habitCompletions'),
      where('userId', '==', userId),
      orderBy('dateISO', 'desc')
    );
    const unsubHC = onSnapshot(hcQ, (snap) => {
      setHabitCompletions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubHabits(); unsubHC(); };
  }, [userId]);

  const habitStreaks = useMemo(() => {
    const map = new Map();
    for (const h of habits) {
      const dates = habitCompletions.filter(c => c.habitId === h.id).map(c => c.dateISO);
      const [current, best] = getConsecutiveStreak(new Set(dates));
      map.set(h.id, { current, best });
    }
    return map;
  }, [habits, habitCompletions]);

  const beginToggle = useCallback((habit, dateISO) => {
    if (!userId || !habit?.id) return;
    const date = dateISO || isoToday();
    const already = habitCompletions.find(c => c.habitId === habit.id && c.dateISO === date);

    if (already) {
      // Un-toggle: remove completion immediately
      removeCompletion(habit.id, date).then(() => {
        const dates = habitCompletions
          .filter(c => c.habitId === habit.id && c.dateISO !== date)
          .map(c => c.dateISO);
        const [current, best] = getConsecutiveStreak(new Set(dates));
        updateDoc(doc(db, 'habits', habit.id), {
          streak: current, bestStreak: best, updatedAt: serverTimestamp()
        });
      }).catch(err => console.error('Error removing completion:', err));
      return;
    }

    // New completion: open reflection sheet
    setPendingReflection({ habit, dateISO: date });
  }, [userId, habitCompletions]);

  const confirmCompletion = useCallback(async (reflectionData = {}) => {
    if (!pendingReflection || !userId) return;
    const { habit, dateISO } = pendingReflection;
    setPendingReflection(null);

    try {
      await logCompletion(userId, habit.id, dateISO, {
        ...reflectionData,
        source: reflectionData.source || 'track',
      });

      const dates = habitCompletions
        .filter(c => c.habitId === habit.id)
        .map(c => c.dateISO)
        .concat(dateISO);
      const [current, best] = getConsecutiveStreak(new Set(dates));
      await updateDoc(doc(db, 'habits', habit.id), {
        streak: current, bestStreak: best, updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging habit completion:', error);
    }
  }, [userId, pendingReflection, habitCompletions]);

  const dismissReflection = useCallback(() => {
    setPendingReflection(null);
  }, []);

  const recomputeStreaksForHabit = async (habitId) => {
    const dates = habitCompletions.filter(c => c.habitId === habitId).map(c => c.dateISO);
    const [current, best] = getConsecutiveStreak(new Set(dates));
    await updateDoc(doc(db, 'habits', habitId), {
      streak: current, bestStreak: best, updatedAt: serverTimestamp()
    });
  };

  return {
    habits,
    habitCompletions,
    habitStreaks,
    pendingReflection,
    beginToggle,
    confirmCompletion,
    dismissReflection,
    recomputeStreaksForHabit,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useHabits.js
git commit -m "feat(web): add reflection flow and deterministic completions to useHabits"
```

---

### Task 7: Wire HabitWizard and CompletionSheet into GoalsHabits Page

**Files:**
- Modify: `src/pages/GoalsHabits.jsx`

- [ ] **Step 1: Add wizard and completion sheet imports and state**

At the top of `GoalsHabits.jsx`, add imports for the new components:

```js
import HabitWizard from '../components/habits/HabitWizard';
import HabitCompletionSheet from '../components/habits/HabitCompletionSheet';
```

- [ ] **Step 2: Wire the wizard to replace AddHabitForm where appropriate**

In the section of GoalsHabits.jsx where habits are created, add state for showing the wizard:

```js
const [showWizard, setShowWizard] = useState(false);
const [wizardGoalId, setWizardGoalId] = useState(null);
```

Add a "New Habit" button that opens the wizard modal, and wire `onSubmit` to call `createHabit` from the service layer with the wizard's form data.

- [ ] **Step 3: Wire the completion sheet to habit toggles**

Use the `pendingReflection`, `confirmCompletion`, and `dismissReflection` from the updated `useHabits` hook. Render the `HabitCompletionSheet` when `pendingReflection` is set:

```jsx
{pendingReflection && (
  <HabitCompletionSheet
    habit={pendingReflection.habit}
    onSubmit={confirmCompletion}
    onClose={dismissReflection}
  />
)}
```

Replace direct `logHabitToday` calls with `beginToggle` calls that go through the reflection flow.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GoalsHabits.jsx
git commit -m "feat(web): wire HabitWizard and CompletionSheet into GoalsHabits page"
```

---

### Task 8: Wire CompletionSheet into WeeklyHabitsTracker

**Files:**
- Modify: `src/components/dashboard/WeeklyHabitsTracker.jsx`

- [ ] **Step 1: Update the onToggle prop contract**

The `WeeklyHabitsTracker` currently calls `onToggle(habitId, date, newState)`. The parent (`Dashboard.jsx`) needs to pass `beginToggle` instead, which accepts `(habit, dateISO)`.

Update `WeeklyHabitsTracker.jsx` to pass the full habit object instead of just the ID:

Change the toggle button's onClick (line 93) from:
```jsx
onClick={() => onToggle(habit.id, day.date, !completed)}
```
to:
```jsx
onClick={() => {
  if (completed) {
    onToggle(habit, day.date, false);
  } else {
    onToggle(habit, day.date, true);
  }
}}
```

- [ ] **Step 2: Update Dashboard.jsx to use beginToggle and render CompletionSheet**

In `src/pages/Dashboard.jsx`, update the habit toggle handler to use `beginToggle` from useHabits, and render the `HabitCompletionSheet` when `pendingReflection` is set.

Import the completion sheet and wire it the same way as in Task 7, Step 3.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/WeeklyHabitsTracker.jsx src/pages/Dashboard.jsx
git commit -m "feat(web): wire completion reflection sheet into dashboard habit tracker"
```

---

### Task 9: Create Habit with Wizard Data

**Files:**
- Modify: `src/services/db/habits.service.js`

- [ ] **Step 1: Update createHabit to accept identity-based fields**

The existing `createHabit` function (lines 17-30 in `habits.service.js`) already spreads `...payload`, so wizard fields will pass through. No code change is needed in the service — the wizard's `onSubmit` handler in `GoalsHabits.jsx` just needs to call `createHabit(userId, formData)` with the full wizard output.

Verify by reading the current `createHabit` function and confirming the spread covers all new fields: `identity`, `identityStatement`, `outcomeGoal`, `fullVersion`, `quickStartVersion`, `justShowUpVersion`, `cue`, `implementationIntention`, `intention`, `valueAlignment`, `problem`, `category`.

- [ ] **Step 2: Wire the wizard submission in GoalsHabits.jsx**

In the wizard's `onSubmit` handler, transform the form data to match the Firestore schema and call `createHabit`:

```js
async function handleWizardSubmit(formData) {
  const payload = {
    name: formData.name,
    category: formData.category || null,
    type: formData.type,
    frequency: formData.type === 'daily' ? 1 : formData.frequency,
    active: true,
    streak: 0,
    longestStreak: 0,
    identity: formData.identity || null,
    identityStatement: formData.identityStatement || null,
    outcomeGoal: formData.outcomeGoal || null,
    fullVersion: formData.fullVersion || null,
    quickStartVersion: formData.quickStartVersion || null,
    justShowUpVersion: formData.justShowUpVersion || null,
    cue: formData.cueValue ? { type: formData.cueType, value: formData.cueValue } : null,
    implementationIntention: formData.implementationIntention || null,
    intention: formData.intention || null,
    valueAlignment: formData.valueAlignment || null,
    problem: formData.problem || null,
    goalId: formData.goalId || null,
  };
  await createHabit(user.uid, payload);
  setShowWizard(false);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/GoalsHabits.jsx
git commit -m "feat(web): wire wizard form data to createHabit service"
```

---

### Task 10: Smoke Test and Cleanup

- [ ] **Step 1: Start the dev server and verify the wizard opens**

```bash
npm start
```

Navigate to `/goals-habits`, click "New Habit", and verify the 6-step wizard opens.

- [ ] **Step 2: Create a test habit through the wizard**

Fill in all 6 steps and submit. Verify the habit appears in the list with all identity fields saved.

- [ ] **Step 3: Toggle a habit complete and verify the reflection sheet appears**

Click a habit's completion toggle. The `HabitCompletionSheet` should appear with Smooth/Okay/Hard options. Select one and verify the affirmation shows, then auto-dismisses.

- [ ] **Step 4: Verify dashboard habit tracker also shows reflections**

Navigate to the dashboard and toggle a habit. The same reflection sheet should appear.

- [ ] **Step 5: Verify un-toggle works**

Click a completed habit to un-complete it. It should toggle off without showing the reflection sheet.

- [ ] **Step 6: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "fix(web): phase 2 smoke test cleanup"
```
