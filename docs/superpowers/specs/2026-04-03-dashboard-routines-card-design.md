# Dashboard Routines Card — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Scope:** New dashboard routines card with completion tracking, collapsible layout, and ActiveRoutinePlayer integration
**Platform:** Mobile (React Native/Expo)

---

## Goal

Surface user-built routines on the mobile dashboard so they're top of mind and launchable without navigating to the Rhythms page. Add completion tracking so the card reflects daily progress.

---

## Section 1: Card Structure and Positioning

### Position on Dashboard
After the Weekly Habits Tracker, before the Week Insight Card. The V2 dashboard order becomes:

1. Brain State Check-In
2. Today's Protocol (conditional)
3. Nudge Card (conditional)
4. Daily Reflection (conditional)
5. Weekly Habits Tracker
6. **Routines Card (new)**
7. Week Insight Card

### Card Container
- **Header:** "Your Routines" with a collapse-all chevron toggle (up/down arrow)
- **Fully collapsed:** Just the header row, no routine rows visible
- **Collapse state:** Persisted in `AsyncStorage` so it remembers across sessions
- **Default:** Expanded on first use

### Routine Rows (inside the card)

Each routine the user has built appears as a collapsible row within the card.

**Collapsed row:**
- Routine name (e.g., "Morning Essentials")
- Total duration badge (e.g., "10 min")
- Completion checkmark if done today (green filled circle)
- Chevron to expand

**Expanded row:**
- Routine name + total duration
- Full activity list: each activity shows icon + name + duration (e.g., "☀ Meditation · 5 min")
- "Begin" button — launches ActiveRoutinePlayer
- Reminder time if set (e.g., "Reminder at 7:00 AM")
- Completion checkmark if already done today

### Auto-Expand Logic

On card load, routines expand based on current time and day:

| Routine Type | Auto-expand when |
|---|---|
| Morning | Current hour is 5 AM - 12 PM |
| Evening | Current hour is 12 PM onward |
| Sunday | Current day is Sunday |
| Custom | Always collapsed |

Multiple routines can be expanded simultaneously (e.g., Sunday morning shows both Morning and Sunday expanded).

**Exception:** If a routine is already completed today, it stays collapsed regardless of time relevance. Done = out of the way.

### Empty State (no routines built)

When the user has zero routines:

- **Icon:** Lightbulb outline
- **Headline:** "Build your first routine"
- **Body:** "Structured routines help your brain build consistency."
- **Template suggestions:** 1-2 templates from existing `routineTemplates.ts` based on time of day (morning templates in AM, evening templates in PM). Each shows template name + duration + "Try this" button.
- **"Try this" button:** Quick-applies the template via existing `createRoutine()` service, then refreshes the card to show the new routine.
- **"Browse all" link:** Navigates to Rhythms > Routines tab.

---

## Section 2: Routine Completion Tracking

### New Firestore Subcollection

**Path:** `routines/{routineId}/completions/{dateISO}`

**Document structure:**
```
{
  date: string,                // ISO date string "YYYY-MM-DD" (also the doc ID)
  completedAt: Timestamp,      // Server timestamp
  mode: "timed" | "checklist", // How it was completed
  durationMinutes: number,     // Actual time spent
}
```

### When Completion is Written

- **Timed mode:** When `ActiveRoutinePlayer` reaches the `RoutineCompleteState` (the existing final "complete" screen). Write the completion doc before calling `onClose`. Duration is calculated from the timer elapsed time.
- **Checklist mode:** When all activities in `ChecklistPlayer` are checked (the existing `allDone` condition). Write the completion doc when `onComplete` is called. Duration is the sum of all activity durations.

Only one completion doc per routine per day. If the doc already exists for today, do not overwrite it.

### Dashboard Reads

On load, query each routine's `completions` subcollection for today's date to determine checkmark state. Use `getDoc` with the deterministic doc ID (`dateISO`), not a query — fast and cheap.

### New Service Functions

In `mobile/src/services/firebase/routines.service.ts`:

- **`markRoutineComplete(routineId, data)`** — Writes a completion doc. `data` includes `mode` and `durationMinutes`. Uses `setDoc` with the date as doc ID. Skips write if doc already exists for today.
- **`getRoutineCompletionToday(routineId, dateISO)`** — Returns the completion doc if it exists, or null. Single `getDoc` call.

### Firestore Security Rules

Add to `firestore.rules`:
```
match /routines/{routineId}/completions/{completionId} {
  allow read, write: if request.auth != null
    && get(/databases/$(database)/documents/routines/$(routineId)).data.userId == request.auth.uid;
}
```

Read and write allowed only if the parent routine's `userId` matches the authenticated user.

---

## Section 3: "Begin" Button Behavior

### Launching a Routine

Tapping "Begin" on an expanded routine opens `ActiveRoutinePlayer` as a full-screen modal overlay — the same component and pattern used by `PlanScreen`. The dashboard manages `activeRoutine` and `playerVisible` state, same as PlanScreen does.

Both timed and checklist modes are handled by `ActiveRoutinePlayer` (it renders `ChecklistPlayer` internally for checklist mode).

### On Completion

When the routine finishes (either mode):
1. Completion doc is written to Firestore
2. Player closes
3. Dashboard card updates to show the checkmark without a full refresh (local state update)

### Already Completed Today

If a routine is already completed for today:
- The "Begin" button changes to a subtle "Do again" text link
- Tapping it launches the player again but does not write a second completion doc

### Navigation to Edit

Tapping the routine name (not the Begin button) navigates to the Rhythms tab with the Routines sub-tab focused. The dashboard card is for action, not editing.

---

## Files Involved

### New Files
| File | Responsibility |
|---|---|
| `mobile/src/components/dashboard/RoutinesCard.tsx` | Collapsible card with routine rows, auto-expand logic, empty state, Begin button |

### Modified Files
| File | Changes |
|---|---|
| `mobile/src/services/firebase/routines.service.ts` | Add `markRoutineComplete()` and `getRoutineCompletionToday()` |
| `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx` | Call `markRoutineComplete()` when reaching RoutineCompleteState |
| `mobile/src/screens/Focus/components/ChecklistPlayer.tsx` | Call `markRoutineComplete()` when all items checked |
| `mobile/src/screens/DashboardScreen.tsx` | Add RoutinesCard + ActiveRoutinePlayer state/modal |
| `mobile/src/hooks/useDashboard.ts` | Fetch user routines + today's completions, expose to dashboard |
| `firestore.rules` | Add completions subcollection rule for routines |

---

## Out of Scope

- Routine streaks or trends (future — once completion data accumulates)
- Editing routines from the dashboard card
- Web app routines card
- Routine notifications/reminders from the dashboard
- Reordering routines within the card
