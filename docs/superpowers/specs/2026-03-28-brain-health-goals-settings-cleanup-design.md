# Brain Health Hiding, Goals Cleanup & Settings Cleanup — Design Spec

**Date:** 2026-03-28
**Priority:** High (brain health) / Medium (goals) / Low (settings)
**Effort:** 1.5 days combined
**Approach:** Remove from navigation, gate data loading, clean user-visible surfaces

---

## 1. Hide Brain Health Dashboard

### Navigation Removal

- Remove the "Brain Health" menu item from `MoreMenuScreen.tsx` (the Wellness tab menu). The item has `id: 'brain-health'`, `route: 'BrainHealth'`.
- Remove the `BrainHealth` screen registration from `AppNavigator.tsx` (the `<AppStack.Screen name="BrainHealth" .../>` block).
- Remove the `BrainHealthDashboard` import from `AppNavigator.tsx`.

### Components Preserved

All 7 widgets in `mobile/src/components/brain/` stay in the codebase:
- AIBrainInsightCard
- BrainReadinessWidget
- NeuroplasticityTracker
- AMCCChallengeCard
- FocusWindowIndicator
- NervousSystemToolsWidget
- WeeklyBrainMetricsChart

They are no longer reachable since the screen that renders them is removed from navigation.

### AMCC Challenge

Hidden for now. No redistribution to Community. Can be revisited in a later phase.

---

## 2. Nervous System Tools → Breathwork Library

Two new entries added to the `BREATHWORK_SESSIONS` array in `mobile/src/services/firebase/library.service.ts`. These use plain-language names per brand guidelines.

### New Session 1: Double Breath Reset

| Field | Value |
|-------|-------|
| id | `double-breath-reset` |
| title | Double Breath Reset |
| description | A calming technique using a double inhale followed by an extended exhale. Activates your body's natural relaxation response in under a minute. |
| duration | 60 |
| type | `Guided` |
| purpose | `Relax` |
| difficulty | `beginner` |
| breathingPattern | Inhale 2s → Quick inhale 1s → Long exhale 6s → Rest 1s |
| featured | false |
| instructions | ['Breathe in through your nose for 2 seconds.', 'Take a quick second inhale through your nose (1 second).', 'Exhale slowly through your mouth for 6 seconds.', 'Rest for 1 second, then repeat.', 'Continue for 60 seconds.'] |

### New Session 2: Wide Gaze Calm

| Field | Value |
|-------|-------|
| id | `wide-gaze-calm` |
| title | Wide Gaze Calm |
| description | A simple visual technique that shifts your nervous system from alert to calm by softening and expanding your gaze. No breathing required. |
| duration | 60 |
| type | `Guided` |
| purpose | `Relax` |
| difficulty | `beginner` |
| breathingPattern | No breathing pattern — visual focus exercise |
| featured | false |
| instructions | ['Find a spot ahead of you and let your eyes rest on it.', 'Without moving your eyes, begin to notice what is in your peripheral vision.', 'Slowly expand your awareness to the edges of your visual field.', 'Hold this wide, soft gaze for 60 seconds.', 'Notice any shift in how calm or alert you feel.'] |

These appear automatically in the existing `BreathworkScreen` under the "Relax" category filter. No new screens or components needed.

---

## 3. Science Vocabulary Toggle Removal

Remove the "Scientific Terminology" toggle from `SettingsScreen.tsx`. This is in the "Appearance" section. Since this toggle is the only item in the Appearance section, remove the entire section.

The `useBrainHealthVocabulary` hook and `brainHealth.ts` constants stay in the codebase but become unused. No functional impact.

---

## 4. Goals Cleanup

### Performance Gating

Same pattern as tasks — hook still called (React rules of hooks), output overridden when `DASHBOARD_V2 = true`:

**`mobile/src/hooks/useDashboard.ts`:**
```
const goalsResult = useGoals();
const goals = DASHBOARD_V2 ? [] : goalsResult.goals;
const goalsLoading = DASHBOARD_V2 ? false : goalsResult.loading;
```

**`mobile/src/navigation/AppNavigator.tsx`:**
```
const goals = DASHBOARD_V2 ? [] : (goalsData?.goals || []);
```

### InsightsScreen Cleanup

- Remove `useGoals` from imports
- Remove `useGoals()` call
- Remove goal metrics computation (`completedGoals`, `activeGoals`, `avgGoalProgress`)
- Remove `goals` from metrics object and useMemo dependencies
- Remove `goalsLoading` from loading checks
- Remove `goals` prop from `RingProgressCard`

### RingProgressCard

Make `goals` prop optional (same pattern as `tasks` fix):
- Update interface: `goals?: { percentage: number }`
- Guard `goals.percentage` accesses with optional chaining
- Conditionally render the Goals ring only when prop is provided

### Habit Wizard — Remove Outcome Goal Field

In `mobile/src/components/habits/wizard/IdentityStep.tsx`, remove the "Outcome Goal (Optional)" text input field and its label/description. Keep the rest of the identity step intact.

### Notification Scheduler

In `mobile/src/services/notificationScheduler.service.ts`, gate the `checkAndSendGoalMilestone` function behind `!DASHBOARD_V2`. When V2 is active, the function returns early without checking or sending goal notifications.

### Preserved

- Profile wellness goal tags (`goals: string[]` from `WELLNESS_GOALS`) — these are interest tags, not the Goal CRUD system
- All goal components, services, types, constants — preserved for V1 fallback
- Feature unlock constants referencing goals — no functional impact
- `useGoals` hook itself — still callable, just output ignored in V2

---

## 5. Settings Cleanup

### Remove from SettingsScreen

| Setting | Section | Action |
|---------|---------|--------|
| Scientific Terminology toggle | Appearance | Remove entire section (only item) |
| Intensity selector (Low/Standard/High) | AI Companion | Remove the picker |
| Tone selector (Gentle/Encouraging/Direct) | AI Companion | Remove the picker; section becomes empty, remove section header |
| Completion reflections toggle | Habits & Tracking | Remove toggle, info panel, data notice; section becomes empty, remove section header |

### Keep in Settings

- Account (email display)
- Feature Access (pillar, unlock progress, available features)
- Notifications (push toggle, preferences link)
- Privacy & Visibility (profile visibility, searchable, muted accounts)
- Data & Privacy (privacy policy, terms, data export)
- Subscription (plan, manage, redeem code)
- Account Actions (logout, delete)
- App Info (version)

---

## 6. Files Changed Summary

| File | Change | Description |
|------|--------|-------------|
| `mobile/src/screens/MoreMenuScreen.tsx` | Modify | Remove "Brain Health" menu item |
| `mobile/src/navigation/AppNavigator.tsx` | Modify | Remove BrainHealth screen + import, gate goals for AI FAB |
| `mobile/src/services/firebase/library.service.ts` | Modify | Add 2 breathwork sessions |
| `mobile/src/hooks/useDashboard.ts` | Modify | Gate useGoals() output behind DASHBOARD_V2 |
| `mobile/src/screens/InsightsScreen.tsx` | Modify | Remove useGoals, goal metrics |
| `mobile/src/components/insights/RingProgressCard.tsx` | Modify | Make goals prop optional + guards |
| `mobile/src/components/habits/wizard/IdentityStep.tsx` | Modify | Remove "Outcome Goal" field |
| `mobile/src/services/notificationScheduler.service.ts` | Modify | Gate goal milestone notifications |
| `mobile/src/screens/SettingsScreen.tsx` | Modify | Remove 4 settings + 3 empty sections |

### Not Changed

- No brain health components deleted
- No goal components, services, types, or constants deleted
- Profile wellness goal tags kept
- Feature unlock constants kept
- `useBrainHealthVocabulary` hook kept (unused)
