# Routine Player UI + Background Timer Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the routine player's top-area clipping, center the playback controls, and make the timer continue running (with activity transitions) when the app is backgrounded.

**Architecture:** The timer is converted from `setInterval`-decrement to a timestamp-based approach. An `AppState` listener detects foreground/background transitions. On backgrounding, local notifications are scheduled for each upcoming activity completion. On foregrounding, elapsed time is calculated and the player advances through any completed activities. The UI issues are fixed with safe area padding and control layout adjustments.

**Tech Stack:** React Native, expo-notifications (already installed), AppState API, expo-haptics

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx` | **Modify** | All changes — UI fixes + background timer logic |

This is a single-file change. The entire routine player is self-contained.

---

### Task 1: Fix UI — Safe Area and Controls Centering

**Files:**
- Modify: `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx`

Two UI fixes:
1. The close button and routine name overlap the iOS status bar despite `SafeAreaView` — add explicit top padding
2. The playback controls appear shifted right — adjust the controls layout

- [ ] **Step 1: Add extra top padding to header**

The `Modal` component on iOS can sometimes not respect `SafeAreaView` edges properly. Add `paddingTop` to the header style as a safety measure.

Find the `header` style (around line 431-437):
```typescript
header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: SpacingTokens.base,
  paddingVertical: SpacingTokens.md,
},
```

Replace with:
```typescript
header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: SpacingTokens.base,
  paddingTop: SpacingTokens.sm,
  paddingBottom: SpacingTokens.md,
},
```

- [ ] **Step 2: Fix controls centering**

The controls row has 4 items: Previous, Restart, Play/Pause (large), Skip. The large play button makes the visual center shift. Fix by ensuring all control buttons have equal width and the play button is truly centered.

Find the `controls` style (around line 510-516):
```typescript
controls: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: SpacingTokens.xl,
  paddingVertical: SpacingTokens.base,
},
```

Replace with:
```typescript
controls: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-evenly',
  paddingVertical: SpacingTokens.base,
  paddingHorizontal: SpacingTokens.xl,
},
```

Using `space-evenly` instead of `center` with `gap` ensures equal spacing between all items regardless of their individual widths. Adding `paddingHorizontal` prevents the controls from touching the screen edges.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "ActiveRoutinePlayer" | head -5`

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/Focus/ActiveRoutinePlayer.tsx
git commit -m "fix: routine player safe area padding and controls centering"
```

---

### Task 2: Convert Timer to Timestamp-Based + Background Support

**Files:**
- Modify: `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx`

This is the core change. Replace the `setInterval` decrement approach with:
1. Track absolute `activityStartTime` and `pausedElapsed`
2. Use `AppState` to detect background/foreground
3. On background: schedule notifications for upcoming activity completions
4. On foreground: reconcile state based on elapsed time
5. Timer display updates via `setInterval` but reads from timestamps (so it self-corrects)

- [ ] **Step 1: Add imports**

Add to the imports at the top of the file:

```typescript
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
```

Both `expo-notifications` and React Native's `AppState` are already available in the project.

- [ ] **Step 2: Add timestamp-based timer state**

Replace the existing state declarations (around lines 79-82):

```typescript
const [currentIndex, setCurrentIndex] = useState(0);
const [timeRemaining, setTimeRemaining] = useState(routine.activities[0]?.duration * 60 || 0);
const [isPaused, setIsPaused] = useState(false);
const [isCompleted, setIsCompleted] = useState(false);
```

With:

```typescript
const [currentIndex, setCurrentIndex] = useState(0);
const [timeRemaining, setTimeRemaining] = useState(routine.activities[0]?.duration * 60 || 0);
const [isPaused, setIsPaused] = useState(false);
const [isCompleted, setIsCompleted] = useState(false);

// Timestamp-based tracking for background support
const activityStartTimeRef = useRef<number>(Date.now());
const pausedElapsedRef = useRef<number>(0); // seconds elapsed when paused
const appStateRef = useRef<AppStateStatus>(AppState.currentState);
```

- [ ] **Step 3: Add notification scheduling helpers**

Add these helper functions before the timer useEffect:

```typescript
// Schedule notifications for upcoming activity completions
const scheduleActivityNotifications = useCallback(async () => {
  // Cancel any existing routine notifications
  await cancelActivityNotifications();

  if (isPaused || isCompleted) return;

  const now = Date.now();
  let cumulativeSeconds = timeRemaining; // time until current activity ends

  for (let i = currentIndex; i < totalActivities; i++) {
    const activityName = routine.activities[i].name;
    const isLast = i === totalActivities - 1;

    // Schedule notification for when this activity completes
    if (cumulativeSeconds > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isLast ? 'Routine Complete!' : `Up next: ${routine.activities[i + 1]?.name || ''}`,
          body: isLast
            ? `You finished ${routine.name}!`
            : `${activityName} is done. Moving to the next activity.`,
          sound: 'default',
          data: { type: 'routine-activity-complete', routineId: routine.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: cumulativeSeconds,
        },
        identifier: `routine-activity-${i}`,
      });
    }

    // Add next activity's duration
    if (i + 1 < totalActivities) {
      cumulativeSeconds += routine.activities[i + 1].duration * 60;
    }
  }
}, [currentIndex, timeRemaining, isPaused, isCompleted, totalActivities, routine]);

const cancelActivityNotifications = useCallback(async () => {
  for (let i = 0; i < totalActivities; i++) {
    await Notifications.cancelScheduledNotificationAsync(`routine-activity-${i}`).catch(() => {});
  }
}, [totalActivities]);
```

- [ ] **Step 4: Add AppState listener for background/foreground transitions**

Add this useEffect after the notification helpers:

```typescript
// Handle app state changes (background/foreground)
useEffect(() => {
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const prevState = appStateRef.current;
    appStateRef.current = nextAppState;

    if (isPaused || isCompleted) return;

    // Going to background — schedule notifications
    if (prevState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
      await scheduleActivityNotifications();
    }

    // Coming back to foreground — reconcile timer state
    if ((prevState === 'background' || prevState === 'inactive') && nextAppState === 'active') {
      await cancelActivityNotifications();
      reconcileTimerState();
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}, [isPaused, isCompleted, scheduleActivityNotifications, cancelActivityNotifications]);
```

- [ ] **Step 5: Add reconcileTimerState function**

This function calculates how much time has passed while backgrounded and advances through activities accordingly:

```typescript
const reconcileTimerState = useCallback(() => {
  if (isPaused || isCompleted) return;

  const now = Date.now();
  const elapsedMs = now - activityStartTimeRef.current;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const activityDuration = routine.activities[currentIndex]?.duration * 60 || 0;
  const pausedOffset = pausedElapsedRef.current;

  let totalElapsed = elapsedSeconds;
  let idx = currentIndex;

  // Walk through activities that may have completed while backgrounded
  let remainingInCurrent = (routine.activities[idx]?.duration * 60 || 0) - pausedOffset;

  while (totalElapsed >= remainingInCurrent && idx < totalActivities - 1) {
    totalElapsed -= remainingInCurrent;
    idx++;
    remainingInCurrent = routine.activities[idx]?.duration * 60 || 0;
  }

  if (totalElapsed >= remainingInCurrent && idx === totalActivities - 1) {
    // Routine completed while backgrounded
    setIsCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }

  // Update to the correct activity and time
  if (idx !== currentIndex) {
    setCurrentIndex(idx);
    Haptics.selectionAsync();
  }

  const newRemaining = Math.max(0, remainingInCurrent - totalElapsed);
  setTimeRemaining(newRemaining);

  // Reset timestamp tracking for the new position
  activityStartTimeRef.current = now;
  pausedElapsedRef.current = (routine.activities[idx]?.duration * 60 || 0) - newRemaining;
}, [currentIndex, isPaused, isCompleted, totalActivities, routine.activities]);
```

- [ ] **Step 6: Update the timer useEffect**

Replace the existing timer useEffect (lines 133-152) with a version that also updates timestamp refs:

```typescript
// Timer logic — uses setInterval for display updates but self-corrects from timestamps
useEffect(() => {
  if (!isPaused && !isCompleted && timeRemaining > 0) {
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - activityStartTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      const activityDuration = currentActivity?.duration * 60 || 0;
      const remaining = Math.max(0, activityDuration - pausedElapsedRef.current - elapsedSeconds);

      if (remaining <= 0) {
        handleActivityComplete();
        return;
      }

      setTimeRemaining(remaining);
    }, 1000);
  }

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}, [isPaused, isCompleted, currentIndex, currentActivity]);
```

- [ ] **Step 7: Update handlePause to track paused elapsed time**

Replace the existing `handlePause` (line 188-191):

```typescript
const handlePause = useCallback(() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setIsPaused((prev) => {
    if (!prev) {
      // Pausing — record how much time has elapsed so far
      const elapsed = Math.floor((Date.now() - activityStartTimeRef.current) / 1000);
      pausedElapsedRef.current = pausedElapsedRef.current + elapsed;
    } else {
      // Resuming — reset start time
      activityStartTimeRef.current = Date.now();
    }
    return !prev;
  });
}, []);
```

- [ ] **Step 8: Update activity transition handlers to reset timestamps**

In `handleActivityComplete` (line 154-186), after setting the next activity state, reset the timestamp:

Add after `setTimeRemaining(routine.activities[nextIndex].duration * 60);` (inside the setTimeout):

```typescript
activityStartTimeRef.current = Date.now();
pausedElapsedRef.current = 0;
```

Similarly update `handlePrevious`, `handleRestart`, and `handleSkip` to reset timestamps:

In `handlePrevious`, after `setTimeRemaining(...)`:
```typescript
activityStartTimeRef.current = Date.now();
pausedElapsedRef.current = 0;
```

In `handleRestart`, after `setTimeRemaining(...)`:
```typescript
activityStartTimeRef.current = Date.now();
pausedElapsedRef.current = 0;
```

In `handleSkip`, after each `setTimeRemaining(...)`:
```typescript
activityStartTimeRef.current = Date.now();
pausedElapsedRef.current = 0;
```

- [ ] **Step 9: Cancel notifications on close/complete**

In `handleClose` (line 221-239), add `cancelActivityNotifications()` before `onClose()`:

```typescript
onPress: () => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
  }
  cancelActivityNotifications();
  onClose();
},
```

In `handleBackToFocus` (line 241-246), add the same:

```typescript
const handleBackToFocus = useCallback(() => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
  }
  cancelActivityNotifications();
  onClose();
}, [onClose, cancelActivityNotifications]);
```

- [ ] **Step 10: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "ActiveRoutinePlayer" | head -10`

- [ ] **Step 11: Commit**

```bash
git add mobile/src/screens/Focus/ActiveRoutinePlayer.tsx
git commit -m "feat: background timer with activity transitions and scheduled notifications"
```

---

### Task 3: Manual QA Checklist

- [ ] **Step 1: Safe area** — Open a routine, verify the close button (X) and routine name are below the iOS status bar and fully visible.

- [ ] **Step 2: Controls centering** — Verify Previous, Restart, Play/Pause, and Skip buttons are evenly spaced and visually centered on screen.

- [ ] **Step 3: Timer accuracy** — Start a routine with a short activity (1-2 min). Let it run for 30 seconds, lock the phone for 20 seconds, unlock. Timer should show approximately the correct remaining time (not paused at the pre-lock value).

- [ ] **Step 4: Background activity transition** — Set up a routine with a very short first activity (1 minute). Start it, immediately lock the phone. Wait 90 seconds, unlock. The player should have advanced to the second activity with the correct remaining time.

- [ ] **Step 5: Notification on completion** — With the phone locked and a short activity running, verify a notification appears when the activity completes (e.g., "Up next: Meditation").

- [ ] **Step 6: Pause/resume with background** — Pause the timer, lock the phone, wait 30 seconds, unlock. Timer should still be paused at the same value. Resume and verify it continues correctly.

- [ ] **Step 7: Full routine completion while backgrounded** — Start a routine with only 1-2 minutes total. Lock the phone and wait for the total duration. Unlock — the routine should show the completed state.

- [ ] **Step 8: Cancel notifications on close** — Start a routine, lock the phone, immediately unlock and press X to end the routine. Verify no lingering notifications fire afterward.
