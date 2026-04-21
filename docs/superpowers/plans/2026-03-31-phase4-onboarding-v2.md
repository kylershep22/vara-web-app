# Phase 4: Onboarding V2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the web onboarding flow to match mobile: add a Values screen, add habit-offer to Confirmation, update progress indicators, and remove legacy routes.

**Architecture:** The existing 5-screen onboarding (Welcome → Check-In → Insight → Activity → Confirmation) already matches most of the spec. This plan adds Screen 6 (Values), upgrades Screen 5 (Confirmation) with a habit offer, adds `saveSelectedValues` to the service, updates progress dots to 6 across all screens, and removes the legacy `/onboarding/profile` and `/onboarding/set-goal` routes.

**Tech Stack:** React, Tailwind CSS, Firebase Firestore, lucide-react

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/services/db/onboarding.service.js` | Modify | Add `saveSelectedValues()` |
| `src/pages/onboarding/OnboardingConfirmation.jsx` | Rewrite | Add habit offer (Yes/Maybe Later), navigate to values instead of dashboard |
| `src/pages/onboarding/OnboardingValues.jsx` | Create | Values grid selection + summary + "Begin" CTA |
| `src/pages/onboarding/OnboardingWelcome.jsx` | Modify | Update progress dots from 5 to 6 |
| `src/pages/onboarding/OnboardingCheckIn.jsx` | Modify | Update progress dots from 5 to 6 |
| `src/pages/onboarding/OnboardingInsight.jsx` | Modify | Update progress dots from 5 to 6 |
| `src/pages/onboarding/OnboardingActivity.jsx` | Modify | Update progress dots from 5 to 6 |
| `src/App.js` | Modify | Add values route, remove profile/set-goal routes |

---

### Task 1: Add saveSelectedValues to Onboarding Service

**Files:**
- Modify: `src/services/db/onboarding.service.js`

- [ ] **Step 1: Add the saveSelectedValues function**

Add after `completeOnboarding` (line 85) in `src/services/db/onboarding.service.js`:

```js
/**
 * Save user's selected values from onboarding
 */
export async function saveSelectedValues(userId, values) {
  if (!userId) throw new Error('userId is required');
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, {
    selectedValues: values,
    updatedAt: serverTimestamp(),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db/onboarding.service.js
git commit -m "feat(web): add saveSelectedValues to onboarding service"
```

---

### Task 2: Rewrite OnboardingConfirmation with Habit Offer

**Files:**
- Rewrite: `src/pages/onboarding/OnboardingConfirmation.jsx`

- [ ] **Step 1: Rewrite the confirmation page**

Replace the entire contents of `src/pages/onboarding/OnboardingConfirmation.jsx`:

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createHabit } from '../../services/db/habits.service';

const TOTAL_STEPS = 6;

export default function OnboardingConfirmation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [habitOffered, setHabitOffered] = useState(false);
  const [creating, setCreating] = useState(false);

  // Read the completed activity from sessionStorage (set by OnboardingActivity)
  const activityRaw = sessionStorage.getItem('onboardingActivity');
  const activity = activityRaw ? JSON.parse(activityRaw) : null;

  async function handleAddHabit() {
    if (!user?.uid || !activity) return;
    setCreating(true);
    try {
      await createHabit(user.uid, {
        name: activity.name,
        type: 'daily',
        frequency: 1,
        category: 'Mindfulness',
        active: true,
        streak: 0,
      });
      sessionStorage.setItem('onboardingHabitCreated', 'true');
    } catch (err) {
      console.error('Failed to create onboarding habit:', err);
    } finally {
      setCreating(false);
      navigate('/onboarding/values');
    }
  }

  function handleSkip() {
    sessionStorage.setItem('onboardingHabitCreated', 'false');
    navigate('/onboarding/values');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-white to-dew-sage-light flex items-center justify-center p-vara-base">
      <div className="max-w-md w-full text-center">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i < 5 ? 'w-2 bg-evergreen-teal' : 'w-2 bg-divider'
              } ${i === 4 ? 'w-6 bg-evergreen-teal' : ''}`}
            />
          ))}
        </div>

        {/* Success icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-evergreen-teal/10 mb-6">
          <CheckCircle className="text-evergreen-teal" size={40} />
        </div>

        <h1 className="text-vara-2xl font-semibold text-soft-charcoal mb-3">
          Nice work!
        </h1>
        <p className="text-vara-base text-muted-sage-gray mb-8 leading-relaxed">
          {activity
            ? `You just completed "${activity.name}". Small steps like this build lasting change.`
            : "You've taken your first step toward lasting wellness."}
        </p>

        {/* Habit offer */}
        {activity && (
          <div className="bg-white rounded-vara-lg p-vara-lg border border-divider mb-8 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-sunrise-amber" size={16} />
              <h3 className="text-vara-sm font-medium text-soft-charcoal">Add to your routine?</h3>
            </div>
            <p className="text-vara-sm text-muted-sage-gray mb-4">
              Make "{activity.name}" a daily habit to keep building momentum.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAddHabit}
                disabled={creating}
                className="flex-1 py-3 rounded-lg bg-evergreen-teal text-white font-medium text-vara-sm hover:opacity-90 transition disabled:opacity-60"
              >
                {creating ? 'Adding...' : 'Yes, add it'}
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 py-3 rounded-lg border border-divider text-soft-charcoal font-medium text-vara-sm hover:bg-dew-sage-light transition"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {!activity && (
          <button
            onClick={handleSkip}
            className="w-full py-4 rounded-vara-lg bg-evergreen-teal text-white font-medium text-vara-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/onboarding/OnboardingConfirmation.jsx
git commit -m "feat(web): add habit offer to onboarding confirmation"
```

---

### Task 3: Create OnboardingValues Page

**Files:**
- Create: `src/pages/onboarding/OnboardingValues.jsx`

- [ ] **Step 1: Create the values page**

Create `src/pages/onboarding/OnboardingValues.jsx`:

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveSelectedValues, completeOnboarding } from '../../services/db/onboarding.service';

const TOTAL_STEPS = 6;

const VALUES = [
  'Health', 'Family', 'Growth', 'Creativity',
  'Connection', 'Purpose', 'Joy', 'Resilience',
  'Balance', 'Courage', 'Kindness', 'Focus',
  'Freedom', 'Gratitude', 'Integrity', 'Peace',
];

export default function OnboardingValues() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  function toggleValue(value) {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= 3) return prev;
      return [...prev, value];
    });
  }

  async function handleFinish() {
    if (!user?.uid || selected.length === 0) return;
    setSaving(true);
    try {
      const habitCreated = sessionStorage.getItem('onboardingHabitCreated') === 'true';
      await saveSelectedValues(user.uid, selected);
      await completeOnboarding(user.uid, habitCreated);
      sessionStorage.removeItem('onboardingActivity');
      sessionStorage.removeItem('onboardingHabitCreated');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Failed to save values:', err);
      navigate('/dashboard', { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-white to-dew-sage-light flex items-center justify-center p-vara-base">
      <div className="max-w-md w-full">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i < TOTAL_STEPS ? 'bg-evergreen-teal' : 'bg-divider'
              } ${i === TOTAL_STEPS - 1 ? 'w-6' : 'w-2'}`}
            />
          ))}
        </div>

        <h1 className="text-vara-2xl font-semibold text-soft-charcoal text-center mb-2">
          What matters most to you?
        </h1>
        <p className="text-vara-sm text-muted-sage-gray text-center mb-8">
          Pick 2-3 values. We'll use these to personalize your experience.
        </p>

        {/* Values grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {VALUES.map((value) => {
            const isSelected = selected.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleValue(value)}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium text-center transition-all ${
                  isSelected
                    ? 'border-evergreen-teal bg-teal-light/30 text-evergreen-teal'
                    : 'border-divider text-soft-charcoal hover:border-silver-sage'
                } ${selected.length >= 3 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {value}
              </button>
            );
          })}
        </div>

        {/* Selected summary */}
        {selected.length > 0 && (
          <div className="bg-white rounded-vara-lg p-vara-base border border-divider mb-6 text-center">
            <p className="text-vara-sm text-muted-sage-gray mb-1">Your values</p>
            <p className="text-vara-base font-medium text-soft-charcoal">
              {selected.join(' · ')}
            </p>
          </div>
        )}

        <button
          onClick={handleFinish}
          disabled={selected.length === 0 || saving}
          className="w-full py-4 rounded-vara-lg bg-evergreen-teal text-white font-medium text-vara-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? 'Setting up...' : 'Begin'}
          <ArrowRight size={20} />
        </button>

        <p className="text-center text-vara-xs text-muted-sage-gray mt-4">
          {selected.length}/3 selected
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/onboarding/OnboardingValues.jsx
git commit -m "feat(web): add OnboardingValues screen for value selection"
```

---

### Task 4: Update Progress Dots and Routes

**Files:**
- Modify: `src/pages/onboarding/OnboardingWelcome.jsx`
- Modify: `src/pages/onboarding/OnboardingCheckIn.jsx`
- Modify: `src/pages/onboarding/OnboardingInsight.jsx`
- Modify: `src/pages/onboarding/OnboardingActivity.jsx`
- Modify: `src/App.js`

- [ ] **Step 1: Update progress dots in all 4 existing onboarding screens**

In each of these 4 files, find the progress dots section (renders 5 dots) and update to render 6 dots. The pattern is the same in each — find `[0, 1, 2, 3, 4].map` and replace with `[0, 1, 2, 3, 4, 5].map`.

**OnboardingWelcome.jsx** — step index 0, so dot 0 is active
**OnboardingCheckIn.jsx** — step index 1, so dot 1 is active
**OnboardingInsight.jsx** — step index 2, so dot 2 is active
**OnboardingActivity.jsx** — step index 3, so dot 3 is active

- [ ] **Step 2: Add values route and remove legacy routes in App.js**

In `src/App.js`:

Add import at top:
```js
import OnboardingValues from './pages/onboarding/OnboardingValues';
```

Add route after the confirmation route:
```jsx
<Route path="/onboarding/values" element={<ProtectedRoute><OnboardingValues /></ProtectedRoute>} />
```

Remove these two routes:
```jsx
<Route path="/onboarding/set-goal" element={<SetGoalFlow />} />
<Route path="/onboarding/profile" element={<ProtectedRoute><UserProfileForm /></ProtectedRoute>} />
```

Also remove the corresponding imports if they're only used for these routes (`SetGoalFlow` import from the goal flow, `UserProfileForm` import).

- [ ] **Step 3: Store activity in sessionStorage from OnboardingActivity**

In `src/pages/onboarding/OnboardingActivity.jsx`, find where the user completes an activity and navigates to confirmation. Add a `sessionStorage.setItem('onboardingActivity', JSON.stringify({ name, type }))` call so the Confirmation page can read it for the habit offer.

- [ ] **Step 4: Commit**

```bash
git add src/pages/onboarding/ src/App.js
git commit -m "feat(web): update onboarding progress dots to 6 steps, add values route, remove legacy routes"
```

---

### Task 5: Build Verification

- [ ] **Step 1: Build the app**

```bash
npx react-scripts build 2>&1 | tail -15
```

Expected: Build succeeds.

- [ ] **Step 2: Final commit if cleanup needed**

```bash
git add -A
git commit -m "fix(web): phase 4 onboarding cleanup"
```
