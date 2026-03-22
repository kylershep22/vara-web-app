# Reminders & Completion Sounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schedule daily push notifications for habit triggers and routine reminders, and play selectable completion sounds when Pomodoro/routine timers finish.

**Architecture:** Centralized `reminderScheduler.service.ts` handles all notification scheduling (habits + routines). A `useCompletionSound` hook manages audio playback for timer completions. Both integrate with the existing notification preferences system in Firestore.

**Tech Stack:** expo-notifications (DailyTriggerInput), expo-av (Audio.Sound), Firestore (preferences), React Native

**Spec:** `docs/superpowers/specs/2026-03-21-reminders-and-completion-sounds-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `mobile/src/services/reminderScheduler.service.ts` | Schedule/cancel/sync habit and routine reminder notifications |
| `mobile/src/hooks/useCompletionSound.ts` | Load and play completion alert sounds |
| `mobile/assets/sounds/completion/*.mp3` | 4 audio files (singing-bowl, soft-chime, nature-bell, stream) |

### Modified Files
| File | Change |
|------|--------|
| `mobile/src/types/models.ts` | Add `completionSound` to `NotificationPreferences` interface |
| `mobile/src/services/firebase/notificationPreferences.service.ts` | Add `completionSound` to defaults and V1->V2 migration |
| `mobile/src/services/notifications.service.ts` | Extend foreground handler to pass notification data |
| `mobile/src/navigation/AppNavigator.tsx` | Export `navigationRef` for deep link routing |
| `mobile/src/context/NotificationContext.tsx` | Add syncAllReminders, response listener, foreground suppression |
| `mobile/src/hooks/useHabitsScreen.ts` | Call schedule/cancel on habit create/update/delete |
| `mobile/src/components/routines/RoutineEditor.tsx` | Call schedule/cancel on routine save |
| `mobile/src/screens/Focus/PomodoroTab.tsx` | Add completion sound on session complete |
| `mobile/src/screens/Focus/components/RoutineCompleteState.tsx` | Add completion sound on routine complete |
| `mobile/src/screens/NotificationSettingsScreen.tsx` | Add completion sound picker section |

---

## Task 1: Add `completionSound` to Preferences Schema

**Files:**
- Modify: `mobile/src/types/models.ts:570-617`
- Modify: `mobile/src/services/firebase/notificationPreferences.service.ts:28-60`

- [ ] **Step 1: Add `completionSound` to `NotificationPreferences` interface**

In `mobile/src/types/models.ts`, add after the `milestonesReflection` field (around line 600):

```typescript
completionSound: {
  enabled: boolean;
  sound: 'singing-bowl' | 'soft-chime' | 'nature-bell' | 'stream';
};
```

- [ ] **Step 2: Add `completionSound` to defaults object**

In `mobile/src/services/firebase/notificationPreferences.service.ts`, add to `DEFAULT_NOTIFICATION_PREFERENCES` after `milestonesReflection` (around line 57):

```typescript
completionSound: {
  enabled: true,
  sound: 'singing-bowl',
},
```

- [ ] **Step 3: Add `completionSound` to V1->V2 migration**

In `migratePreferencesToV2` function, add `completionSound` with defaults when migrating from V1 (the migrated object should include it). Find the section that builds the V2 object and add:

```typescript
completionSound: {
  enabled: true,
  sound: 'singing-bowl' as const,
},
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/types/models.ts mobile/src/services/firebase/notificationPreferences.service.ts
git commit -m "feat: add completionSound to notification preferences schema"
```

---

## Task 2: Create `parseTimeString` Utility and `reminderScheduler.service.ts`

**Files:**
- Create: `mobile/src/services/reminderScheduler.service.ts`

- [ ] **Step 1: Create the reminder scheduler service**

Create `mobile/src/services/reminderScheduler.service.ts`:

```typescript
/**
 * Reminder Scheduler Service
 * Schedules and manages daily notifications for habit triggers and routine reminders.
 * Uses expo-notifications DailyTriggerInput for repeating daily notifications.
 */

import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';
import { Habit } from '../types';
import { Routine, fetchUserRoutines } from './firebase/routines.service';
import { getNotificationPreferences } from './firebase/notificationPreferences.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateTotalDuration } from './firebase/routines.service';

// ─── Time Parsing ──────────────────────────────────────────────

/**
 * Parse a human-readable time string into hour/minute.
 * Handles: "7:00 AM", "7:00 PM", "07:00", "14:30", "7:00am", "7:00pm"
 * Returns null for unparseable strings.
 */
export function parseTimeString(value: string): { hour: number; minute: number } | null {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim().toLowerCase();

  // Try 12-hour format: "7:00 AM", "7:00am", "12:30 pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const period = match12[3];

    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

    if (period === 'am' && hour === 12) hour = 0;
    else if (period === 'pm' && hour !== 12) hour += 12;

    return { hour, minute };
  }

  // Try 24-hour format: "07:00", "14:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    return { hour, minute };
  }

  return null;
}

// ─── Permission & Preference Checks ───────────────────────────

async function hasNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function areNotificationsEnabled(userId: string): Promise<boolean> {
  try {
    const prefs = await getNotificationPreferences(userId);
    return prefs?.allNotificationsEnabled ?? false;
  } catch {
    return false;
  }
}

// ─── Habit Reminders ──────────────────────────────────────────

/**
 * Schedule a daily notification for a habit's time-based cue.
 * Only schedules if habit.cue?.type === 'time' and cue.value is parseable.
 */
export async function scheduleHabitReminder(habit: Habit): Promise<void> {
  if (!habit.cue || habit.cue.type !== 'time' || !habit.cue.value) {
    return;
  }

  const parsed = parseTimeString(habit.cue.value);
  if (!parsed) {
    logger.warn(`[reminderScheduler] Cannot parse habit cue time: "${habit.cue.value}" for habit ${habit.id}`);
    return;
  }

  if (!(await hasNotificationPermission())) {
    logger.warn('[reminderScheduler] Notification permission not granted, skipping habit reminder');
    return;
  }

  const identifier = `habit-reminder-${habit.id}`;

  // Cancel existing before scheduling (prevents duplicates)
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // May not exist, that's fine
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `Time for ${habit.name}`,
        body: `Your ${habit.cue.value} reminder`,
        sound: true,
        data: { type: 'habit-reminder', habitId: habit.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parsed.hour,
        minute: parsed.minute,
      },
    });
    logger.log(`[reminderScheduler] Scheduled habit reminder: ${identifier} at ${parsed.hour}:${String(parsed.minute).padStart(2, '0')}`);
  } catch (error) {
    logger.error(`[reminderScheduler] Failed to schedule habit reminder:`, error);
  }
}

/**
 * Cancel a scheduled habit reminder.
 */
export async function cancelHabitReminder(habitId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`habit-reminder-${habitId}`);
    logger.log(`[reminderScheduler] Cancelled habit reminder: habit-reminder-${habitId}`);
  } catch {
    // May not exist, that's fine
  }
}

// ─── Routine Reminders ────────────────────────────────────────

/**
 * Schedule a daily notification for a routine's reminderTime.
 * Only schedules if routine.active === true and reminderTime is non-null and parseable.
 */
export async function scheduleRoutineReminder(routine: Routine): Promise<void> {
  if (!routine.active || !routine.reminderTime) {
    return;
  }

  const parsed = parseTimeString(routine.reminderTime);
  if (!parsed) {
    logger.warn(`[reminderScheduler] Cannot parse routine reminderTime: "${routine.reminderTime}" for routine ${routine.id}`);
    return;
  }

  if (!(await hasNotificationPermission())) {
    logger.warn('[reminderScheduler] Notification permission not granted, skipping routine reminder');
    return;
  }

  const identifier = `routine-reminder-${routine.id}`;

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // May not exist
  }

  const totalDuration = calculateTotalDuration(routine.activities);
  const typeLabel = routine.type === 'custom' ? '' : `${routine.type} `;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `Your ${typeLabel}routine is ready`,
        body: `${routine.name} \u2014 ${totalDuration} min`,
        sound: true,
        data: { type: 'routine-reminder', routineId: routine.id, routineType: routine.type },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parsed.hour,
        minute: parsed.minute,
      },
    });
    logger.log(`[reminderScheduler] Scheduled routine reminder: ${identifier} at ${parsed.hour}:${String(parsed.minute).padStart(2, '0')}`);
  } catch (error) {
    logger.error(`[reminderScheduler] Failed to schedule routine reminder:`, error);
  }
}

/**
 * Cancel a scheduled routine reminder.
 */
export async function cancelRoutineReminder(routineId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`routine-reminder-${routineId}`);
    logger.log(`[reminderScheduler] Cancelled routine reminder: routine-reminder-${routineId}`);
  } catch {
    // May not exist
  }
}

// ─── Sync All Reminders ───────────────────────────────────────

/**
 * Re-sync all habit and routine reminders.
 * Called on app foreground to handle habits/routines changed while app was killed.
 */
export async function syncAllReminders(userId: string): Promise<void> {
  if (!(await hasNotificationPermission())) {
    logger.log('[reminderScheduler] No notification permission, skipping sync');
    return;
  }

  try {
    const prefs = await getNotificationPreferences(userId);
    if (!prefs?.allNotificationsEnabled) {
      logger.log('[reminderScheduler] Notifications disabled, skipping sync');
      return;
    }
  } catch {
    logger.warn('[reminderScheduler] Could not read preferences, skipping sync');
    return;
  }

  // 1. Get all scheduled notifications and cancel reminder ones
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const reminderNotifications = allScheduled.filter(
      (n) =>
        n.identifier.startsWith('habit-reminder-') ||
        n.identifier.startsWith('routine-reminder-')
    );

    for (const n of reminderNotifications) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    logger.log(`[reminderScheduler] Cancelled ${reminderNotifications.length} stale reminders`);
  } catch (error) {
    logger.error('[reminderScheduler] Error cancelling stale reminders:', error);
  }

  // 2. Re-schedule habit reminders
  if (db) {
    try {
      const habitsQuery = query(
        collection(db, 'habits'),
        where('userId', '==', userId),
        where('active', '==', true)
      );
      const habitsSnapshot = await getDocs(habitsQuery);
      const habits = habitsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Habit));

      for (const habit of habits) {
        if (habit.cue?.type === 'time') {
          await scheduleHabitReminder(habit);
        }
      }
      logger.log(`[reminderScheduler] Synced ${habits.filter((h) => h.cue?.type === 'time').length} habit reminders`);
    } catch (error) {
      logger.error('[reminderScheduler] Error syncing habit reminders:', error);
    }
  }

  // 3. Re-schedule routine reminders
  try {
    const routines = await fetchUserRoutines(userId);
    for (const routine of routines) {
      if (routine.active && routine.reminderTime) {
        await scheduleRoutineReminder(routine);
      }
    }
    logger.log(`[reminderScheduler] Synced ${routines.filter((r) => r.active && r.reminderTime).length} routine reminders`);
  } catch (error) {
    logger.error('[reminderScheduler] Error syncing routine reminders:', error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/services/reminderScheduler.service.ts
git commit -m "feat: add reminderScheduler service for habit and routine notifications"
```

---

## Task 3: Create `useCompletionSound` Hook

**Files:**
- Create: `mobile/src/hooks/useCompletionSound.ts`
- Create: `mobile/assets/sounds/completion/` (placeholder references)

- [ ] **Step 1: Create placeholder sound asset directory**

```bash
mkdir -p mobile/assets/sounds/completion
```

Note: Actual `.mp3` files (singing-bowl, soft-chime, nature-bell, stream) need to be sourced and added separately. The hook will gracefully handle missing files.

- [ ] **Step 2: Create the useCompletionSound hook**

Create `mobile/src/hooks/useCompletionSound.ts`:

```typescript
/**
 * useCompletionSound Hook
 * Loads and plays a short completion alert sound when timers/sessions finish.
 * Follows the useAmbientSound pattern with expo-av Audio.Sound.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { logger } from '../utils/logger';
import { useNotificationPreferences } from './useNotificationPreferences';

type CompletionSoundKey = 'singing-bowl' | 'soft-chime' | 'nature-bell' | 'stream';

// Map sound keys to asset requires
// These must be static require() calls for Metro bundler
const SOUND_ASSETS: Record<CompletionSoundKey, any> = {
  'singing-bowl': null, // require('../../../assets/sounds/completion/singing-bowl.mp3'),
  'soft-chime': null,   // require('../../../assets/sounds/completion/soft-chime.mp3'),
  'nature-bell': null,  // require('../../../assets/sounds/completion/nature-bell.mp3'),
  'stream': null,       // require('../../../assets/sounds/completion/stream.mp3'),
};

// Set to true once actual audio files are added to assets
const SOUNDS_AVAILABLE = false;

const PLAYBACK_VOLUME = 0.6;

interface UseCompletionSoundReturn {
  playCompletionSound: () => void;
  isReady: boolean;
}

export function useCompletionSound(): UseCompletionSoundReturn {
  const { preferences } = useNotificationPreferences();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isReady, setIsReady] = useState(false);

  const selectedSound: CompletionSoundKey =
    preferences?.completionSound?.sound ?? 'singing-bowl';
  const enabled = preferences?.completionSound?.enabled ?? true;

  // Load sound on mount
  useEffect(() => {
    if (!enabled || !SOUNDS_AVAILABLE) {
      setIsReady(false);
      return;
    }

    const asset = SOUND_ASSETS[selectedSound];
    if (!asset) {
      logger.warn(`[useCompletionSound] No asset for sound: ${selectedSound}`);
      setIsReady(false);
      return;
    }

    let mounted = true;

    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(asset, {
          volume: PLAYBACK_VOLUME,
          shouldPlay: false,
        });

        if (mounted) {
          soundRef.current = sound;
          setIsReady(true);
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        logger.warn('[useCompletionSound] Failed to load sound:', error);
        if (mounted) setIsReady(false);
      }
    };

    loadSound();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      setIsReady(false);
    };
  }, [selectedSound, enabled]);

  const playCompletionSound = useCallback(() => {
    if (!enabled || !isReady || !soundRef.current) return;

    // Fire-and-forget: play then reset position for next play
    (async () => {
      try {
        await soundRef.current?.setPositionAsync(0);
        await soundRef.current?.playAsync();
      } catch (error) {
        logger.warn('[useCompletionSound] Failed to play sound:', error);
      }
    })();
  }, [enabled, isReady]);

  return { playCompletionSound, isReady };
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useCompletionSound.ts
git commit -m "feat: add useCompletionSound hook for timer completion alerts"
```

---

## Task 4: Extend Foreground Notification Handler

**Files:**
- Modify: `mobile/src/services/notifications.service.ts:31-35,42-65`

- [ ] **Step 1: Update the handler type and registration**

In `mobile/src/services/notifications.service.ts`, change the handler variable type and `setForegroundNotificationHandler` function (around line 25 and 31-35):

Find the handler variable declaration (around line 25):
```typescript
let _onForegroundNotification: ((title: string, body: string) => void) | null = null;
```
Replace with:
```typescript
let _onForegroundNotification: ((title: string, body: string, data?: Record<string, unknown>) => void) | null = null;
```

Update the function signature (lines 31-35):
```typescript
export function setForegroundNotificationHandler(
  handler: (title: string, body: string, data?: Record<string, unknown>) => void,
): void {
  _onForegroundNotification = handler;
}
```

- [ ] **Step 2: Pass notification data in the handleNotification callback**

In the `handleNotification` callback (around line 44-47), change:
```typescript
if (_onForegroundNotification && (title || body)) {
  _onForegroundNotification(title, body);
}
```
To:
```typescript
if (_onForegroundNotification && (title || body)) {
  const data = notification.request.content.data as Record<string, unknown> | undefined;
  _onForegroundNotification(title, body, data);
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/services/notifications.service.ts
git commit -m "feat: extend foreground notification handler to pass notification data"
```

---

## Task 5: Export `navigationRef` from AppNavigator

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Create and export navigationRef**

At the top of `mobile/src/navigation/AppNavigator.tsx`, after the imports (around line 20), add:

```typescript
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();
```

- [ ] **Step 2: Pass navigationRef to NavigationContainer**

Find the `<NavigationContainer>` element in the file and add the `ref` prop:

```typescript
<NavigationContainer ref={navigationRef} linking={linking}>
```

**Note:** This `NavigationContainer` has a dynamic `key` prop that changes on auth state transitions. When the key changes, the container remounts and the ref is temporarily null. The `navigationRef.isReady()` guard in Task 6 Step 3 handles this — if the ref is null during a remount, notification taps are silently ignored (the user can just tap again).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx
git commit -m "feat: export navigationRef for deep link notification routing"
```

---

## Task 6: Update NotificationContext — syncAllReminders, Deep Links, Foreground Suppression

**Files:**
- Modify: `mobile/src/context/NotificationContext.tsx`

- [ ] **Step 1: Add imports**

Add to the imports from `notifications.service.ts` (around line 16-21):

```typescript
import {
  setForegroundNotificationHandler,
  cancelAllNotifications,
  registerAndSaveFCMToken,
  isServerPushEnabled,
  addNotificationResponseListener,
} from '../services/notifications.service';
```

Add new imports:

```typescript
import { syncAllReminders } from '../services/reminderScheduler.service';
import { isHabitCompletedToday } from '../services/firebase/habits.service';
import { navigationRef } from '../navigation/AppNavigator';
```

- [ ] **Step 2: Add syncAllReminders to initialization flow**

Find where `initializeUserNotifications` is called (around line 97). Add `syncAllReminders` call after it:

```typescript
if (!serverPush) {
  initializeUserNotifications(user.uid);
}
// Always sync reminders (independent of server push toggle)
syncAllReminders(user.uid);
```

- [ ] **Step 3: Add notification response listener for deep links**

Add a new `useEffect` in the component (after existing effects):

```typescript
// Deep link routing for notification taps
useEffect(() => {
  const subscription = addNotificationResponseListener((response) => {
    const data = response.notification.request.content.data;
    if (!data?.type || !navigationRef.isReady()) return;

    if (data.type === 'habit-reminder') {
      navigationRef.navigate('Track' as never);
    } else if (data.type === 'routine-reminder') {
      navigationRef.navigate('Focus' as never);
    }
  });

  return () => subscription.remove();
}, []);
```

- [ ] **Step 4: Update foreground handler with suppression logic**

Update the existing `setForegroundNotificationHandler` registration (around lines 55-59). Change:

```typescript
useEffect(() => {
  setForegroundNotificationHandler((title: string, body: string) => {
    showNotificationToast(title, body);
  });
}, [showNotificationToast]);
```

To:

```typescript
useEffect(() => {
  setForegroundNotificationHandler(async (title: string, body: string, data?: Record<string, unknown>) => {
    // Suppress habit reminders for already-completed habits
    if (data?.type === 'habit-reminder' && data?.habitId) {
      try {
        const completed = await isHabitCompletedToday(data.habitId as string);
        if (completed) return; // Suppress
      } catch {
        // If check fails, show the notification anyway
      }
    }
    showNotificationToast(title, body);
  });
}, [showNotificationToast, user?.uid]);
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/context/NotificationContext.tsx
git commit -m "feat: add reminder sync, deep link routing, and foreground suppression"
```

---

## Task 7: Integrate Habit Reminder Scheduling

**Files:**
- Modify: `mobile/src/hooks/useHabitsScreen.ts:87-169,171-191`

- [ ] **Step 1: Add imports**

At the top of `mobile/src/hooks/useHabitsScreen.ts`, add:

```typescript
import { scheduleHabitReminder, cancelHabitReminder } from '../services/reminderScheduler.service';
```

- [ ] **Step 2: Update handleWizardComplete to schedule reminders**

In `handleWizardComplete` (around line 154-158), change:

```typescript
if (editingHabit) {
  await updateHabit(editingHabit.id, habitData);
} else {
  await createHabit(user.uid, habitData);
}
```

To:

```typescript
if (editingHabit) {
  await updateHabit(editingHabit.id, habitData);
  // Re-schedule reminder (cancel old, schedule new if time-based cue)
  await cancelHabitReminder(editingHabit.id);
  if (habitData.cue?.type === 'time') {
    await scheduleHabitReminder({ id: editingHabit.id, ...habitData } as Habit);
  }
} else {
  const habitId = await createHabit(user.uid, habitData);
  if (habitData.cue?.type === 'time') {
    await scheduleHabitReminder({ id: habitId, ...habitData } as Habit);
  }
}
```

- [ ] **Step 3: Update handleDeleteHabit to cancel reminders**

In `handleDeleteHabit` (around line 183), inside the `onPress` callback, add `cancelHabitReminder` before or after `deleteHabit`:

```typescript
onPress: async () => {
  try {
    await cancelHabitReminder(habitId);
    await deleteHabit(habitId);
  } catch (error) {
    logger.error('Error deleting habit:', error);
    Alert.alert('Error', 'Failed to delete habit');
  }
},
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/hooks/useHabitsScreen.ts
git commit -m "feat: schedule/cancel habit reminders on create, update, and delete"
```

---

## Task 8: Integrate Routine Reminder Scheduling

**Files:**
- Modify: `mobile/src/components/routines/RoutineEditor.tsx:127-167`

- [ ] **Step 1: Add imports**

At the top of `mobile/src/components/routines/RoutineEditor.tsx`, add:

```typescript
import { scheduleRoutineReminder, cancelRoutineReminder } from '../../services/reminderScheduler.service';
```

- [ ] **Step 2: Update handleSave to schedule reminders**

In the `handleSave` function, update the create and update blocks. For the **update** block (around line 143-148):

```typescript
if (existingRoutine) {
  await updateRoutine(existingRoutine.id, {
    name: routineName.trim(),
    activities,
    reminderTime: reminderTime.trim() || null,
  });
  // Re-schedule reminder
  await cancelRoutineReminder(existingRoutine.id);
  if (reminderTime.trim()) {
    await scheduleRoutineReminder({
      ...existingRoutine,
      name: routineName.trim(),
      activities,
      reminderTime: reminderTime.trim(),
    });
  }
  Alert.alert('Success', 'Routine updated successfully!');
```

For the **create** block (around line 150-158):

```typescript
} else {
  const routineId = await createRoutine(userId, {
    name: routineName.trim(),
    type: routineType,
    activities,
    active: true,
    reminderTime: reminderTime.trim() || null,
  });
  if (reminderTime.trim()) {
    await scheduleRoutineReminder({
      id: routineId,
      userId,
      name: routineName.trim(),
      type: routineType,
      activities,
      active: true,
      reminderTime: reminderTime.trim(),
    } as Routine);
  }
  Alert.alert('Success', 'Routine created successfully!');
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/routines/RoutineEditor.tsx
git commit -m "feat: schedule/cancel routine reminders on create and update"
```

---

## Task 9: Add Completion Sound to Pomodoro Timer

**Files:**
- Modify: `mobile/src/screens/Focus/PomodoroTab.tsx:63-68,117-137`

- [ ] **Step 1: Add hook import and call**

At the top of `PomodoroTab.tsx`, add:

```typescript
import { useCompletionSound } from '../../hooks/useCompletionSound';
```

Inside the component function, before the `useTimer` call (around line 62), add:

```typescript
const { playCompletionSound } = useCompletionSound();
```

- [ ] **Step 2: Call playCompletionSound in handleSessionComplete**

At the beginning of `handleSessionComplete` (line 118), add:

```typescript
async function handleSessionComplete() {
  playCompletionSound();
  // ... existing Firestore logging code ...
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/Focus/PomodoroTab.tsx
git commit -m "feat: play completion sound when Pomodoro session finishes"
```

---

## Task 10: Add Completion Sound to Routine Complete

**Files:**
- Modify: `mobile/src/screens/Focus/components/RoutineCompleteState.tsx:14-63`

- [ ] **Step 1: Add hook import and call**

In `RoutineCompleteState.tsx`, add import:

```typescript
import { useCompletionSound } from '../../../hooks/useCompletionSound';
```

Inside the component, before the `useEffect` (around line 43), add:

```typescript
const { playCompletionSound } = useCompletionSound();
```

- [ ] **Step 2: Call playCompletionSound in the mount useEffect**

In the existing `useEffect` (around line 52-63), add `playCompletionSound()` alongside the haptic:

```typescript
useEffect(() => {
  if (!reduceMotion) {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: AnimationTokens.durationSlow,
      useNativeDriver: true,
    }).start();
  }

  // Haptic + sound feedback on mount
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  playCompletionSound();
}, [reduceMotion]);
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/Focus/components/RoutineCompleteState.tsx
git commit -m "feat: play completion sound when routine finishes"
```

---

## Task 11: Add Completion Sound Picker to Notification Settings

**Files:**
- Modify: `mobile/src/screens/NotificationSettingsScreen.tsx`

- [ ] **Step 1: Add Audio import and sound preview state**

Add at the top:

```typescript
import { Audio } from 'expo-av';
```

Inside the component, add state for preview playback:

```typescript
const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);

const completionSoundOptions = [
  { key: 'singing-bowl' as const, label: 'Singing Bowl' },
  { key: 'soft-chime' as const, label: 'Soft Chime' },
  { key: 'nature-bell' as const, label: 'Nature Bell' },
  { key: 'stream' as const, label: 'Stream' },
];
```

Add cleanup on unmount:

```typescript
useEffect(() => {
  return () => {
    previewSound?.unloadAsync().catch(() => {});
  };
}, [previewSound]);
```

- [ ] **Step 2: Add preview playback handler**

```typescript
const handleSoundSelect = async (soundKey: typeof completionSoundOptions[number]['key']) => {
  // Update preference immediately
  await updateCategory('completionSound', {
    ...preferences.completionSound,
    sound: soundKey,
  });

  // Stop previous preview
  if (previewSound) {
    try { await previewSound.unloadAsync(); } catch {}
  }

  // Play preview (when audio files are available)
  // const SOUND_ASSETS = { ... };
  // const asset = SOUND_ASSETS[soundKey];
  // if (!asset) return;
  // try {
  //   const { sound } = await Audio.Sound.createAsync(asset, { volume: 0.6 });
  //   setPreviewSound(sound);
  //   await sound.playAsync();
  //   sound.setOnPlaybackStatusUpdate((status) => {
  //     if (status.isLoaded && status.didJustFinish) {
  //       sound.unloadAsync().catch(() => {});
  //     }
  //   });
  // } catch {}
};
```

- [ ] **Step 3: Add Completion Sound section to the JSX**

After the Milestones & Reflection section (around line 196), before Quiet Hours, add:

```typescript
{/* Completion Sound */}
<Text style={styles.sectionHeader}>Completion Sound</Text>
<View style={styles.card}>
  <SettingRow
    icon="volume-high"
    iconBg={Colors.evergreenTeal + '20'}
    iconColor={Colors.evergreenTeal}
    label="Timer completion sound"
    description="Plays when timers and sessions finish"
    value={preferences.completionSound?.enabled ?? true}
    onToggle={(v) => updateCategory('completionSound', {
      ...preferences.completionSound,
      enabled: v,
      sound: preferences.completionSound?.sound ?? 'singing-bowl',
    })}
  />
  {(preferences.completionSound?.enabled ?? true) && (
    <>
      <View style={styles.divider} />
      {completionSoundOptions.map((option) => {
        const isSelected = (preferences.completionSound?.sound ?? 'singing-bowl') === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={styles.timeRow}
            onPress={() => handleSoundSelect(option.key)}
          >
            <Text style={[styles.subLabel, isSelected && { color: Colors.evergreenTeal, fontWeight: '600' }]}>
              {option.label}
            </Text>
            <Ionicons
              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={isSelected ? Colors.evergreenTeal : Colors.textSecondary}
            />
          </TouchableOpacity>
        );
      })}
    </>
  )}
</View>
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/NotificationSettingsScreen.tsx
git commit -m "feat: add completion sound picker to notification settings"
```

---

## Task 12: Final Integration Verification

- [ ] **Step 1: Verify TypeScript compiles**

```bash
cd mobile && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors (or only pre-existing ones unrelated to our changes).

- [ ] **Step 2: Verify all imports resolve**

Check that `reminderScheduler.service.ts` is importable from the files that use it:

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -i "reminderScheduler\|useCompletionSound\|completionSound"
```

Expected: No errors.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "fix: resolve any TypeScript errors from reminders integration"
```
