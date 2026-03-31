# Onboarding V2 Simplification & Tasks Removal — Design Spec

**Date:** 2026-03-28
**Priority:** Critical (onboarding) / High (tasks removal)
**Effort:** 2–3 days combined
**Approach:** Feature flag for onboarding, navigation removal for tasks

---

## 1. Feature Flag

**File:** `mobile/src/constants/dashboardConfig.ts`

```typescript
export const DASHBOARD_V2 = true;
export const ONBOARDING_V2 = true;
```

Both flags in the same file. `ONBOARDING_V2 = true` by default. Set to `false` to restore the original 6-screen flow.

---

## 2. Onboarding V2 Flow (3 Screens)

### Screen 1: Welcome

**Component:** `OnboardingV2WelcomeScreen`

- Vara logo + minimal nature-inspired illustration (use existing brand assets)
- Headline: "Vara works with your brain, not against it."
- Subtext: "Build habits that last by first supporting how your brain actually works."
- No name input — uses `displayName` from Firebase Auth (set during signup)
- CTA: "Let's begin" (primary button, full width)
- No back button (first screen)
- No progress indicator (3 screens is fast enough without one)

### Screen 2: First Check-In

**Component:** `OnboardingV2CheckInScreen`

- Headline: "How's your brain feeling right now?"
- Subtext: "This is what you'll do each day. Just one tap."
- Reuses the `BrainStateCheckin` component from Dashboard V2
- `currentCheckIn` prop is `null` (always expanded, no collapsed state during onboarding)
- On state selection: saves `brainStateCheckIn` to Firestore (same `brainStateCheckIns` collection and service as dashboard), then auto-navigates to Screen 3 after the 2-second "Captured." confirmation
- Back button to return to Screen 1

### Screen 3: First Protocol

**Component:** `OnboardingV2ProtocolScreen`

- Displays the protocol mapped to the selected brain state
- Reuses `TodaysProtocolCard` component from Dashboard V2 with same inline instructions approach
- The component needs a new prop `startExpanded?: boolean` (default `false`). When `true`, instructions are shown immediately without needing to tap "Begin when ready". This is used only during onboarding — on the dashboard, the default collapsed behavior remains.
- "Done" button behavior:
  1. Marks protocol completed via `markProtocolCompleted()` service
  2. Shows native iOS/Android notification permission request via `expo-notifications` `requestPermissionsAsync()`
  3. Calls `completeOnboarding(userId)` to set `hasCompletedOnboarding: true`
  4. The existing Firestore listener in AppNavigator automatically transitions to MainNavigator
- Back button to return to Screen 2

### Data Flow

- Screen 1: No data saved
- Screen 2: `saveBrainStateCheckIn(userId, brainState)` — same collection and service as dashboard
- Screen 3: `markProtocolCompleted(userId)`, then `completeOnboarding(userId)`

### What Is NOT Saved (vs V1)

The new flow does **not** write these V1 onboarding fields to the user document:
- `onboardingCheckIn` (energy/focus/mood)
- `onboardingInsight`
- `selectedPillar`
- `selectedValues`
- `completedOnboardingActivity`
- `onboardingHabitCreated`

These fields will simply be undefined for users who onboard via V2. The V1 onboarding service functions are not called.

---

## 3. Onboarding Navigator Changes

**File:** `mobile/src/navigation/AppNavigator.tsx`

When `ONBOARDING_V2 = true`:
```
OnboardingNavigator (Stack)
  ├─ OnboardingV2Welcome
  ├─ OnboardingV2CheckIn
  └─ OnboardingV2Protocol
```

When `ONBOARDING_V2 = false`:
```
OnboardingNavigator (Stack) — unchanged
  ├─ OnboardingWelcome
  ├─ OnboardingCheckIn
  ├─ OnboardingInsight
  ├─ OnboardingActivity
  ├─ OnboardingValues
  └─ OnboardingPersonalizedEntry
```

The conditional is inside the `OnboardingNavigator` component — the parent `AppNavigator` logic for deciding auth → verification → onboarding → main is unchanged.

---

## 4. Warm Install Flow (Phase 3 — Documented Only)

Deferred to Phase 3. The spec is:
- Landing: "Welcome from [Event Name]" with Jen's photo or event branding
- Skip the Welcome pitch — they just heard it live
- Show cohort: "14 others from your group are here"
- Go straight to check-in → protocol
- Requires: unique URL scheme or invite code system, cohort data model, event name storage

No implementation in this phase.

---

## 5. Tasks Removal

### PlanScreen Changes

**File:** `mobile/src/screens/PlanScreen.tsx`

- Remove "Tasks" from `PrimaryTabGroup` tabs array: `['habits', 'routines', 'tasks']` → `['habits', 'routines']`
- Remove `TasksScreen` rendering conditional from the content area
- Remove task-related filter mapping logic (`'todo'`, `'done'` mappings for tasks)
- Remove `TasksScreen` import

### Bottom Navigation Rename

**File:** `mobile/src/navigation/AppNavigator.tsx`

- Rename the "Track" tab to "Rhythms" in the `BottomTabsNavigator`
- Change the tab label from "Track" to "Rhythms"
- Keep the same icon (no icon change)

### TaskDetail Route Removal

**File:** `mobile/src/navigation/AppNavigator.tsx`

- Remove the `TaskDetail` screen from the app stack navigator
- No way to navigate to it anymore, so removing is cleanest

### useDashboard Task Loading Gate

**File:** `mobile/src/hooks/useDashboard.ts`

- Gate the `useTasks()` hook call behind `!DASHBOARD_V2`
- When `DASHBOARD_V2 = true`: tasks returns an empty array, no Firestore subscription
- The return signature stays the same — `tasks` is always present, just empty in V2

### AppNavigator Task References

**File:** `mobile/src/navigation/AppNavigator.tsx`

- The app-level `useTasks()` feeds tasks to the AI Assistant FAB context
- Gate this behind `!DASHBOARD_V2` — pass empty array in V2 mode

### Insights Screen

**File:** `mobile/src/screens/InsightsScreen.tsx`

- Remove `useTasks()` import and call
- Remove any task-related metrics, charts, or stats from the screen

### Already Handled by Dashboard V2

These dashboard cards reference tasks but are already hidden in V2:
- `TasksCard` — not in V2 layout
- `UpNextCard` — not in V2 layout
- `NextBestActionCard` — not in V2 layout

No changes needed.

---

## 6. Files Changed Summary

### Onboarding V2

| File | Change | Description |
|------|--------|-------------|
| `mobile/src/constants/dashboardConfig.ts` | Modify | Add `ONBOARDING_V2 = true` |
| `mobile/src/constants/index.ts` | Modify | Export `ONBOARDING_V2` |
| `mobile/src/screens/onboarding/OnboardingV2WelcomeScreen.tsx` | New | Welcome with headline + CTA |
| `mobile/src/screens/onboarding/OnboardingV2CheckInScreen.tsx` | New | BrainStateCheckin reuse + auto-advance |
| `mobile/src/screens/onboarding/OnboardingV2ProtocolScreen.tsx` | New | Protocol + notifications + completeOnboarding |
| `mobile/src/screens/onboarding/index.ts` | Modify | Export new screens |
| `mobile/src/components/dashboard/TodaysProtocolCard.tsx` | Modify | Add `startExpanded` prop |
| `mobile/src/navigation/AppNavigator.tsx` | Modify | V2 conditional onboarding stack |

### Tasks Removal

| File | Change | Description |
|------|--------|-------------|
| `mobile/src/screens/PlanScreen.tsx` | Modify | Remove Tasks tab (Habits + Routines only) |
| `mobile/src/navigation/AppNavigator.tsx` | Modify | Rename Track → Rhythms, remove TaskDetail route |
| `mobile/src/hooks/useDashboard.ts` | Modify | Gate task loading behind `!DASHBOARD_V2` |
| `mobile/src/screens/InsightsScreen.tsx` | Modify | Remove task references |

### Not Changed

- No old onboarding screens modified or deleted
- No task components, services, hooks, or types deleted
- Task data in Firestore untouched
- No changes to auth flow or verification flow
