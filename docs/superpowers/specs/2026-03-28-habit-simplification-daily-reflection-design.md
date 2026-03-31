# Habit Simplification & Daily Reflection — Design Spec

**Date:** 2026-03-28
**Priority:** High
**Effort:** 2–3 days
**Approach:** Replace 6-step wizard with single-screen form, single-tap completion, end-of-day reflection card

---

## 1. Habit Creation — Single Screen

### New Component: `SimpleHabitCreateScreen`

Replaces the 6-step `WizardContainer` modal. The wizard stays in the codebase but is not opened when `DASHBOARD_V2 = true`.

**Screen title:** "New rhythm"

### Fields

**Habit name** (required):
- Single text input
- Placeholder: "e.g. Morning walk, Read 10 pages"
- This is the only required field

**Frequency** (optional, default "Every day"):
- 3 tappable chip options: "Every day" | "Specific days" | "Flexible"
- "Every day" is selected by default
- "Specific days" reveals a row of 7 day-of-week toggle buttons (S M T W T F S)
- "Flexible" means no schedule — user logs when done

**Time of day** (optional, default "Anytime"):
- 4 tappable chip options: "Morning" | "Afternoon" | "Evening" | "Anytime"
- "Anytime" is selected by default

**One-line intention** (optional, collapsed by default):
- Shown as "+ Add a one-line intention (optional)" text link
- Tapping reveals a single text input
- Placeholder: "Why does this matter to you?"
- Maximum one sentence (no character limit enforced, just guidance)

### Not on the Create Screen

- Category badges — removed from creation. Defaults to `undefined`. Editable on habit detail screen.
- Identity statement — lives on habit detail view as expandable section (existing)
- Scaling (start small / full version) — cut entirely
- Brain state window hint — cut
- Review step — not needed for single screen

### Data Model Changes

Add to `Habit` interface in `mobile/src/types/models.ts`:

```typescript
frequencyType?: 'daily' | 'specific_days' | 'flexible';
specificDays?: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime';
```

Existing `type` and `frequency` fields kept for backward compatibility. The new `frequencyType` field is the V2 way to express frequency:
- `'daily'` → equivalent to old `type: 'daily'`, `frequency: 7`
- `'specific_days'` → equivalent to old `type: 'weekly'`, `frequency: specificDays.length`
- `'flexible'` → equivalent to old `type: 'custom'`, `frequency: 0`

The `createHabit` call should set BOTH old and new fields so existing code (insight engine, streak calculations) continues to work.

### Save Behavior

- CTA: "Save rhythm" (primary button, full width)
- Subtext below button: "You can always adjust this later"
- After save: "Saved." confirmation (auto-dismiss 2s), then dismiss modal and return to Rhythms tab
- The `intention` field from the one-line input maps to the existing `HabitIntention` system using `category: 'focus_clarity'` and `isCustom: true`

### Gating

When `DASHBOARD_V2 = true`:
- `useHabitsScreen.handleCreateHabit()` opens `SimpleHabitCreateScreen` (modal)
- `HabitsScreen` renders the new component instead of `WizardContainer`

When `DASHBOARD_V2 = false`:
- The existing `WizardContainer` 6-step flow is used unchanged

---

## 2. Habit Completion — Single Tap

### Current Behavior (V1)

When `reflectionEnabled` is true in user settings:
1. Tap habit checkbox
2. `HabitCompletionSheet` bottom sheet opens
3. User selects Smooth / Okay / Hard reflection chip
4. Optional note field
5. Dismiss

### New Behavior (V2)

When `DASHBOARD_V2 = true`:

1. Tap habit checkbox → immediately calls `markHabitComplete()`
2. `AnimatedCheckbox` scale-up animation (already exists)
3. Haptic feedback: light impact (already exists)
4. No bottom sheet. No reflection chips. No modal.
5. Tap again to undo (toggle back to incomplete) — already works via existing toggle logic

### Implementation

In `mobile/src/hooks/useHabitsScreen.ts`, the `handleToggleCompletion` function currently checks `reflectionEnabled` to decide whether to open the bottom sheet. When `DASHBOARD_V2 = true`, skip the reflection check and always mark complete immediately (same path as the existing "reflection disabled" branch).

### Preserved

- `HabitCompletionSheet` component stays in codebase (V1 fallback)
- `QuietFinish` celebration stays exactly as-is (5 messages, 2.5s auto-dismiss)
- `AnimatedCheckbox` animation stays as-is
- Completion sound deferred to when audio assets are available

---

## 3. End-of-Day Micro Check-In

### New Component: `DailyReflectionCard`

Replaces the per-habit Smooth/Okay/Hard reflection as the daily difficulty signal for the insight engine.

### Trigger Logic

In `useDashboard`, after habits and brain state check-in load:
- Check if ALL active daily habits for today are completed
- AND no `dailyReflection` has been saved for today
- If both true → show `DailyReflectionCard` on the dashboard

### Card Content

- Prompt: "How did today feel overall?"
- 3 tappable chips: "Smooth" | "Okay" | "Hard"
- "Skip for now" text button always visible
- Single tap on a chip saves the reflection and shows "Captured." (2s auto-dismiss), then card disappears
- Tapping "Skip for now" dismisses the card for the session (does not save anything)

### Dashboard Placement

Appears between `TodaysProtocolCard` (position 2) and `WeeklyHabitsCard` (position 3). Only visible when triggered. Hidden once reflection is saved or skipped.

### Data Model

**New Firestore collection:** `dailyReflections`

**Document ID:** `{userId}_{YYYY-MM-DD}`

```typescript
type DailyReflectionValue = 'smooth' | 'okay' | 'hard';

interface DailyReflection {
  id: string;
  userId: string;
  date: string;            // YYYY-MM-DD
  reflection: DailyReflectionValue;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Service Layer

**New file:** `mobile/src/services/firebase/dailyReflection.service.ts`

Functions:
- `getTodayDailyReflection(userId): Promise<DailyReflection | null>`
- `saveDailyReflection(userId, reflection): Promise<DailyReflection>`

Same patterns as `brainStateCheckIn.service.ts`.

### Firestore Security Rules

Same owner-only pattern:
```
match /dailyReflections/{docId} {
  allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid);
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
}
```

---

## 4. Files Changed Summary

### Habit Creation

| File | Change | Description |
|------|--------|-------------|
| `mobile/src/types/models.ts` | Modify | Add `frequencyType`, `specificDays`, `timeOfDay` to Habit |
| `mobile/src/components/habits/SimpleHabitCreateScreen.tsx` | New | Single-screen creation form |
| `mobile/src/hooks/useHabitsScreen.ts` | Modify | Gate wizard vs simple create behind DASHBOARD_V2 |
| `mobile/src/screens/HabitsScreen.tsx` | Modify | Render SimpleHabitCreateScreen in V2 |

### Habit Completion

| File | Change | Description |
|------|--------|-------------|
| `mobile/src/hooks/useHabitsScreen.ts` | Modify | Skip completion sheet in V2, mark complete immediately |

### End-of-Day Reflection

| File | Change | Description |
|------|--------|-------------|
| `mobile/src/types/models.ts` | Modify | Add `DailyReflection` and `DailyReflectionValue` types |
| `mobile/src/services/firebase/dailyReflection.service.ts` | New | CRUD for `dailyReflections` collection |
| `mobile/src/services/firebase/index.ts` | Modify | Export new service |
| `mobile/src/components/dashboard/DailyReflectionCard.tsx` | New | "How did today feel?" card |
| `mobile/src/components/dashboard/index.ts` | Modify | Export new component |
| `mobile/src/hooks/useDashboard.ts` | Modify | Add reflection state + all-habits-completed detection |
| `mobile/src/screens/DashboardScreen.tsx` | Modify | Render DailyReflectionCard in V2 layout |
| `firestore.rules` | Modify | Add `dailyReflections` rules |

### Not Changed

- WizardContainer and all 6 step components preserved
- HabitCompletionSheet preserved
- QuietFinish preserved exactly as-is
- Completion sound deferred (audio assets not yet available)
