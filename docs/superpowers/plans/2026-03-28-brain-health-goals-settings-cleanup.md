# Brain Health Hiding, Goals Cleanup & Settings Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the Brain Health Dashboard from navigation, redistribute Nervous System Tools to the breathwork library, gate goals data for performance, and clean up Settings by removing 4 unnecessary toggles/selectors.

**Architecture:** Navigation-only removal for Brain Health (components preserved). Two new static breathwork entries in `library.service.ts`. Goals follow the same `DASHBOARD_V2` gating pattern as tasks. Settings cleanup is pure JSX removal.

**Tech Stack:** React Native, TypeScript, Firebase Firestore

**Spec:** `docs/superpowers/specs/2026-03-28-brain-health-goals-settings-cleanup-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/screens/MoreMenuScreen.tsx` | Modify | Remove Brain Health menu item |
| `mobile/src/navigation/AppNavigator.tsx` | Modify | Remove BrainHealth screen + import, gate goals for AI FAB |
| `mobile/src/services/firebase/library.service.ts` | Modify | Add 2 breathwork sessions |
| `mobile/src/hooks/useDashboard.ts` | Modify | Gate useGoals() output |
| `mobile/src/screens/InsightsScreen.tsx` | Modify | Remove useGoals, goal metrics |
| `mobile/src/components/insights/RingProgressCard.tsx` | Modify | Make goals prop optional |
| `mobile/src/components/habits/wizard/IdentityStep.tsx` | Modify | Remove Outcome Goal field |
| `mobile/src/services/notificationScheduler.service.ts` | Modify | Gate goal milestone notifications |
| `mobile/src/screens/SettingsScreen.tsx` | Modify | Remove 4 settings + 3 sections |

---

### Task 1: Hide Brain Health Dashboard from Navigation

**Files:**
- Modify: `mobile/src/screens/MoreMenuScreen.tsx`
- Modify: `mobile/src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Remove Brain Health menu item from MoreMenuScreen**

In `mobile/src/screens/MoreMenuScreen.tsx`, find the menu items array. Locate and remove the entire object with `id: 'brain-health'` (around lines 52-60):

```typescript
  {
    id: 'brain-health',
    title: 'Brain Health',
    subtitle: 'Track your cognitive wellness',
    icon: 'brain',
    iconColor: Colors.evergreenTeal,
    gradientColors: [Colors.dewSage + '60', Colors.dewSage] as [string, string],
    route: 'BrainHealth',
  },
```

Delete this entire object from the array.

- [ ] **Step 2: Remove BrainHealth screen from AppNavigator**

In `mobile/src/navigation/AppNavigator.tsx`, remove the import (around line 42):

```typescript
import BrainHealthDashboard from '../screens/BrainHealthDashboard';
```

Then find and remove the screen registration block (around lines 540-551):

```typescript
        {/* Brain Health - Accessible from Wellness menu */}
        <AppStack.Screen
          name="BrainHealth"
          component={BrainHealthDashboard}
          options={{
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Brain Health',
            headerShadowVisible: false,
          }}
        />
```

Delete this entire block.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/MoreMenuScreen.tsx mobile/src/navigation/AppNavigator.tsx
git commit -m "feat: hide Brain Health Dashboard from navigation"
```

---

### Task 2: Add Nervous System Tools to Breathwork Library

**Files:**
- Modify: `mobile/src/services/firebase/library.service.ts`

- [ ] **Step 1: Add two new breathwork sessions**

In `mobile/src/services/firebase/library.service.ts`, find the `BREATHWORK_SESSIONS` array. Add these two entries at the end of the array (before the closing `];`):

```typescript
  {
    id: 'double-breath-reset',
    title: 'Double Breath Reset',
    description: 'A calming technique using a double inhale followed by an extended exhale. Activates your body\'s natural relaxation response in under a minute.',
    duration: '1 min',
    type: 'Guided',
    purpose: 'Relax',
    difficulty: 'beginner',
    breathingPattern: 'Inhale 2s → Quick inhale 1s → Long exhale 6s → Rest 1s',
    featured: false,
    instructions: 'Breathe in through your nose for 2 seconds. Take a quick second inhale through your nose (1 second). Exhale slowly through your mouth for 6 seconds. Rest for 1 second, then repeat. Continue for 60 seconds.',
  },
  {
    id: 'wide-gaze-calm',
    title: 'Wide Gaze Calm',
    description: 'A simple visual technique that shifts your nervous system from alert to calm by softening and expanding your gaze. No breathing required.',
    duration: '1 min',
    type: 'Guided',
    purpose: 'Relax',
    difficulty: 'beginner',
    breathingPattern: 'No breathing pattern — visual focus exercise',
    featured: false,
    instructions: 'Find a spot ahead of you and let your eyes rest on it. Without moving your eyes, begin to notice what is in your peripheral vision. Slowly expand your awareness to the edges of your visual field. Hold this wide, soft gaze for 60 seconds. Notice any shift in how calm or alert you feel.',
  },
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/services/firebase/library.service.ts
git commit -m "feat: add Double Breath Reset and Wide Gaze Calm to breathwork library"
```

---

### Task 3: Gate Goals in useDashboard

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`

- [ ] **Step 1: Gate useGoals output**

In `mobile/src/hooks/useDashboard.ts`, find (around line 54):

```typescript
  const { goals, loading: goalsLoading } = useGoals();
```

Replace with:

```typescript
  const goalsResult = useGoals();
  const goals = DASHBOARD_V2 ? [] : goalsResult.goals;
  const goalsLoading = DASHBOARD_V2 ? false : goalsResult.loading;
```

The `DASHBOARD_V2` import already exists in this file.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts
git commit -m "feat: gate goals data behind DASHBOARD_V2 in useDashboard"
```

---

### Task 4: Gate Goals in AppNavigator

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Gate goals data for AI FAB**

In `mobile/src/navigation/AppNavigator.tsx`, find in the `MainNavigator` function (around line 488):

```typescript
  const goals = goalsData?.goals || [];
```

Replace with:

```typescript
  const goals = DASHBOARD_V2 ? [] : (goalsData?.goals || []);
```

The `DASHBOARD_V2` import already exists from prior work.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx
git commit -m "feat: gate goals data for AI FAB behind DASHBOARD_V2"
```

---

### Task 5: Remove Goals from InsightsScreen

**Files:**
- Modify: `mobile/src/screens/InsightsScreen.tsx`
- Modify: `mobile/src/components/insights/RingProgressCard.tsx`

- [ ] **Step 1: Remove useGoals from InsightsScreen**

In `mobile/src/screens/InsightsScreen.tsx`, find the import (around line 24):

```typescript
import { useGoals, useHabits } from '../hooks';
```

Replace with:

```typescript
import { useHabits } from '../hooks';
```

Find and remove the `useGoals()` call (search for `useGoals()`). It should look like:

```typescript
  const { goals, loading: goalsLoading } = useGoals();
```

Remove this line.

- [ ] **Step 2: Remove goal metrics from computation**

In the metrics `useMemo`, find and remove:
- Any variables computing goal stats (`completedGoals`, `activeGoals`, `avgGoalProgress`, or similar)
- The `goals: { ... }` block from the returned metrics object
- `goals` from the useMemo dependency array

Find `goalsLoading` references in loading conditions and remove them. For example:

```typescript
    if (!goalsLoading && !habitsLoading) {
```
Change to:
```typescript
    if (!habitsLoading) {
```

And:
```typescript
  if (loading || goalsLoading || habitsLoading) {
```
Change to:
```typescript
  if (loading || habitsLoading) {
```

- [ ] **Step 3: Remove goals prop from RingProgressCard usage**

Find the `RingProgressCard` usage in InsightsScreen and remove the `goals` prop:

```typescript
        <RingProgressCard
          habits={{ percentage: metrics.habits.completionRate }}
          totalCheckIns={metrics.habits.completions}
        />
```

- [ ] **Step 4: Make goals prop optional in RingProgressCard**

In `mobile/src/components/insights/RingProgressCard.tsx`, the `tasks` prop was already made optional in prior work. Now make `goals` optional too.

Find the interface (around line 36):

```typescript
interface RingProgressCardProps {
  goals: { percentage: number };
  habits: { percentage: number };
  tasks?: { percentage: number };
  totalCheckIns?: number;
}
```

Change `goals` to optional:

```typescript
interface RingProgressCardProps {
  goals?: { percentage: number };
  habits: { percentage: number };
  tasks?: { percentage: number };
  totalCheckIns?: number;
}
```

In the component body, find the Goals `ProgressRing` (around line 127-133) and wrap it in a guard:

```typescript
        {goals && (
          <ProgressRing
            percentage={goals.percentage}
            color={VARA_COLORS.teal}
            label="Goals"
            subLabel="Avg completion"
            delay={0}
          />
        )}
```

Also update the nudge condition to guard `goals?.percentage`:

Find:
```typescript
        [goals.percentage, habits.percentage, tasks?.percentage ?? 0].filter(p => p === 0).length >= 2 && (
```

Replace with:
```typescript
        [goals?.percentage ?? 0, habits.percentage, tasks?.percentage ?? 0].filter(p => p === 0).length >= 2 && (
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/InsightsScreen.tsx mobile/src/components/insights/RingProgressCard.tsx
git commit -m "feat: remove goals from InsightsScreen, make goals optional in RingProgressCard"
```

---

### Task 6: Remove Outcome Goal from Habit Wizard

**Files:**
- Modify: `mobile/src/components/habits/wizard/IdentityStep.tsx`

- [ ] **Step 1: Remove the Outcome Goal input**

In `mobile/src/components/habits/wizard/IdentityStep.tsx`, find and remove the Outcome Goal `Input` block (lines 36-42):

```typescript
      <Input
        label="Outcome Goal (Optional)"
        value={formData.outcomeGoal}
        onChangeText={(text) => onUpdateFormData({ outcomeGoal: text })}
        placeholder="e.g., Run a 5K"
        style={styles.input}
      />
```

Delete these lines. The Identity input and preview remain.

- [ ] **Step 2: Update the component docstring**

Replace the comment on line 3:

```typescript
 * Identity, identity statement preview, outcome goal
```

With:

```typescript
 * Identity and identity statement preview
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/habits/wizard/IdentityStep.tsx
git commit -m "feat: remove Outcome Goal field from habit wizard IdentityStep"
```

---

### Task 7: Gate Goal Milestone Notifications

**Files:**
- Modify: `mobile/src/services/notificationScheduler.service.ts`

- [ ] **Step 1: Add early return when DASHBOARD_V2 is active**

In `mobile/src/services/notificationScheduler.service.ts`, find the `checkAndSendGoalMilestone` function (around line 402):

```typescript
export async function checkAndSendGoalMilestone(
  userId: string,
  progressPercent: number,
): Promise<void> {
  const milestones = Object.keys(GOAL_MILESTONE_MESSAGES).map(Number);
```

Add a DASHBOARD_V2 import at the top of the file:

```typescript
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
```

Then add an early return at the start of the function:

```typescript
export async function checkAndSendGoalMilestone(
  userId: string,
  progressPercent: number,
): Promise<void> {
  if (DASHBOARD_V2) return;
  const milestones = Object.keys(GOAL_MILESTONE_MESSAGES).map(Number);
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/services/notificationScheduler.service.ts
git commit -m "feat: gate goal milestone notifications behind DASHBOARD_V2"
```

---

### Task 8: Settings Cleanup

**Files:**
- Modify: `mobile/src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Remove the Habits & Tracking section**

Find the entire `{/* Habits & Tracking Section */}` block (around lines 427-470). This includes:
- Section header "Habits & Tracking"
- Card with completion reflections toggle
- Reflection info panel (conditional)
- Amber callout about data preservation

Delete from `{/* Habits & Tracking Section */}` through the closing `</View>` of the amber callout (the `</View>` at line 470).

- [ ] **Step 2: Remove the AI Companion section**

Find the entire `{/* AI Companion Section */}` block (around lines 472-544). This includes:
- Section header "AI Companion"
- Card with Tone selector (Alert dialog)
- Divider
- Intensity selector (Alert dialog)

Delete from `{/* AI Companion Section */}` through the closing `</View>` of the section (the `</View>` that closes the section, at line 544).

- [ ] **Step 3: Remove the Appearance section**

Find the entire `{/* Appearance Section */}` block (around lines 617-643). This includes:
- Section header "Appearance"
- Card with Scientific Terminology toggle

Delete the entire block.

- [ ] **Step 4: Clean up unused imports and state**

After removing the three sections:

Remove `useBrainHealthVocabulary` from imports. Find:
```typescript
  const { showScience, toggleVocabulary, loading: vocabularyLoading } = useBrainHealthVocabulary();
```
Remove this line.

Remove `useBrainHealthVocabulary` from the import statement at the top of the file.

In the `Settings` interface/type, the `tone`, `intensity`, and `reflectionEnabled` fields can remain (they're still in the Firestore document), but if `handleSaveSettings` only saves to Firestore, it won't break. Just remove any state initialization that references these removed settings if they cause unused-variable warnings.

Check if `REFLECTION_INFO_BULLETS` is used anywhere else — if not, remove it or leave it (it's a constant, not harmful).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/SettingsScreen.tsx
git commit -m "feat: remove vocabulary toggle, tone, intensity, and reflection settings"
```

---

### Task 9: Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

Verify no new type errors from our changes.

- [ ] **Step 2: Verify Brain Health hidden**

- Open app → Wellness tab → confirm "Brain Health" is not in the menu
- Confirm no crash on the Wellness/More screen

- [ ] **Step 3: Verify breathwork additions**

- Navigate to Discover → Breathwork
- Verify "Double Breath Reset" and "Wide Gaze Calm" appear under the Relax filter

- [ ] **Step 4: Verify Settings cleanup**

- Open Settings
- Confirm these are gone: Scientific Terminology, Tone, Intensity, Completion reflections
- Confirm these remain: Notifications, Feature Access, Privacy, Subscription, Account

- [ ] **Step 5: Verify Insights screen**

- Open Insights
- Confirm no goals metrics visible
- Confirm no crash

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues from brain health and cleanup smoke test"
```
