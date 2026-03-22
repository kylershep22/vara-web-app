# Reminders & Completion Sounds — Design Spec

**Date:** 2026-03-21
**Branch:** mobile/community-improvements
**Status:** Draft (v2 — post-review fixes)

---

## Problem

Three notification/audio gaps exist in the mobile app:

1. **Habit reminders** — Users set time-based triggers (e.g., "7:00 AM") in the habit wizard, but no notification is scheduled. The data is stored (`habit.cue.type` / `habit.cue.value`) but nothing happens at the trigger time.
2. **Routine reminders** — Routines store a `reminderTime` string field (e.g., "08:00"), but no notification is scheduled.
3. **Timer completion sounds** — Pomodoro and routine timers signal completion with haptics only. Users miss the signal when not looking at their phone.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Centralized service (Approach A) | Follows existing `notificationScheduler.service.ts` pattern, single source of truth |
| Habit reminder behavior | Daily repeat, skip if completed (foreground only) | Habit frequency is a number (not specific days), so daily + suppression is the pragmatic choice |
| Routine reminder behavior | Daily repeat | Consistent UX; no completion tracking exists for routines |
| Completion sound selection | Global setting in Notification Settings | One choice for all timers; avoids per-feature picker clutter |
| Sound options | 4 curated sounds (singing bowl, soft chime, nature bell, stream) | Small set that fits wellness brand |
| Deep link on tap | Navigate to relevant screen | Habits screen for habit reminders, Focus screen for routine reminders |
| Quiet hours vs. user-set reminder time | User-set time wins | If a user explicitly sets a 5 AM habit trigger, they want the notification then |
| Completion sound vs. master notification toggle | Independent | Completion sounds are local audio, not push notifications — they are controlled only by their own toggle |

---

## 1. Reminder Scheduling Service

### New file: `mobile/src/services/reminderScheduler.service.ts`

Owns all habit and routine reminder scheduling. Builds on `notifications.service.ts` (expo-notifications wrapper).

### Functions

```typescript
// Schedule a daily notification for a habit's time-based cue
// Only schedules if habit.cue?.type === 'time' and cue.value is parseable
scheduleHabitReminder(habit: Habit): Promise<void>

// Cancel a scheduled habit reminder
cancelHabitReminder(habitId: string): Promise<void>

// Schedule a daily notification for a routine's reminderTime
// Only schedules if routine.active === true and reminderTime is non-null
scheduleRoutineReminder(routine: Routine): Promise<void>

// Cancel a scheduled routine reminder
cancelRoutineReminder(routineId: string): Promise<void>

// Re-sync all reminders on app launch / foreground
syncAllReminders(userId: string): Promise<void>
```

### Data model notes

**Habit cue field** (from `types/models.ts`):
```typescript
cue?: {
  type: 'time' | 'location' | 'after_habit' | 'emotion';
  value: string;  // e.g., "7:00 AM"
};
```
- The `cue` field is optional — null-check required before scheduling
- Only `cue.type === 'time'` triggers a reminder
- `cue.value` is a human-readable time string like "7:00 AM" or "14:30" — the service must parse both 12h and 24h formats

**Routine reminderTime field** (from `routines.service.ts`):
```typescript
reminderTime: string | null;  // e.g., "08:00"
```
- Free-form text input with placeholder "08:00" (see `RoutineEditor.tsx` line 322)
- The service must parse with fallback — if unparseable, log a warning and skip (no crash)

### Time parsing

A shared `parseTimeString(value: string): { hour: number; minute: number } | null` utility:
- Handles "7:00 AM", "7:00 PM", "07:00", "14:30", "7:00am"
- Returns null for unparseable strings (caller logs and skips)

### Scheduling details

- Uses `Notifications.scheduleNotificationAsync()` with `DailyTriggerInput` (hour + minute, repeating)
- Notification identifiers: `habit-reminder-{habitId}`, `routine-reminder-{routineId}`
- Before scheduling, cancels any existing notification with the same identifier (prevents duplicates)
- Checks `allNotificationsEnabled` master toggle before scheduling — if disabled, no-ops with a log
- **Does NOT enforce quiet hours** — if a user explicitly sets a 5 AM habit trigger, they want it

### Permission handling

Before scheduling, check `Notifications.getPermissionsAsync()`. If permissions are not granted:
- Log a warning
- Return without scheduling (silent no-op)
- No UI prompt from the scheduler itself — permission requests happen at the existing opt-in flow

### Notification content

**Habit reminders:**
- Title: `"Time for {habit.name}"`
- Body: `"Your {cue.value} reminder"`
- Data: `{ type: 'habit-reminder', habitId: string }`

**Routine reminders:**
- Title: `"Your {routine.type} routine is ready"`
- Body: `"{routine.name} — {totalDuration} min"`
- Data: `{ type: 'routine-reminder', routineId: string, routineType: string }`

### syncAllReminders(userId)

Called on app foreground (alongside existing `initializeUserNotifications()`):

1. Call `Notifications.getAllScheduledNotificationsAsync()` to get all scheduled notifications
2. Filter to those with identifiers starting with `habit-reminder-` or `routine-reminder-`
3. Cancel each one individually via `Notifications.cancelScheduledNotificationAsync(id)`
4. Fetch all active habits with `cue?.type === 'time'` for the user
5. Fetch all active routines with non-null `reminderTime` for the user
6. Re-schedule each valid one
7. Check notification permissions first — if denied, skip all scheduling

---

## 2. Completion Sound System

### New file: `mobile/src/hooks/useCompletionSound.ts`

Hook that loads and plays completion alert sounds. Follows `useAmbientSound.ts` pattern with `expo-av` `Audio.Sound`, but for short one-shot sounds.

### Sound options

| Key | Description | Duration |
|-----|-------------|----------|
| `singing-bowl` | Warm resonant meditation tone | ~2s |
| `soft-chime` | Clean single chime | ~1s |
| `nature-bell` | Gentle chirp tone | ~1.5s |
| `stream` | Brief flowing water | ~2s |

Audio files: `mobile/assets/sounds/completion/{key}.mp3` (< 50KB each).

### Hook API

```typescript
const { playCompletionSound, isReady } = useCompletionSound();

// Fire-and-forget — does not block the completion flow
playCompletionSound();
```

### Internal behavior

1. On mount: read `completionSound` preference from notification preferences (Firestore)
2. Pre-load selected sound file with `Audio.Sound.createAsync({ shouldPlay: false })`
3. `playCompletionSound()`: fire-and-forget (no await at call site). Internally plays at 60% volume, detects playback end via `onPlaybackStatusUpdate`, then resets position to 0 for next play
4. Audio mode: `playsInSilentModeIOS: true` (deliberate alert)
5. Cleanup on unmount: stop + unload sound

### Error handling

- If audio file fails to load: log warning, set `isReady = false`, `playCompletionSound` becomes a no-op
- Existing haptic feedback is always called independently — sound failure does not affect haptics
- If preference read fails: default to `singing-bowl`

### Preference reactivity

The hook does NOT re-load the sound when preferences change mid-session. It reads once on mount. If the user changes their sound in settings, it takes effect next time the hook mounts (next screen visit). This avoids complexity and mid-timer disruptions.

### Independence from notification master toggle

`completionSound.enabled` is its own toggle, independent of `allNotificationsEnabled`. Completion sounds are local audio playback, not push notifications. A user who disables all notifications can still have timer sounds, and vice versa.

---

## 3. Sound Picker UI

### Modified file: `mobile/src/screens/NotificationSettingsScreen.tsx`

New "Completion Sound" section added after existing notification category toggles.

### UI layout

- Section header: "Completion Sound"
- Description: "Plays when timers and sessions finish"
- Enable/disable toggle row (same styling as existing toggles)
- When enabled: list of 4 sound options as selectable rows
  - Each row: radio indicator + sound name
  - Tapping a row selects it AND plays a short preview
  - Only one preview plays at a time (tapping another stops the previous)
  - Selection persists immediately to Firestore

### Preview playback

Use the same `Audio.Sound.createAsync` pattern. Load on tap, play, unload when done or when another is tapped. Wrap in try-catch — if audio load fails, just select the option without preview.

### Preference schema addition

New field on existing `NotificationPreferences` document:

```typescript
completionSound: {
  enabled: boolean;    // default: true
  sound: 'singing-bowl' | 'soft-chime' | 'nature-bell' | 'stream';
  // default: 'singing-bowl'
}
```

Added to:
- `notificationPreferences.service.ts` — defaults object and V2 schema
- `types/models.ts` — `NotificationPreferences` interface
- V1→V2 migration: add `completionSound` with defaults if missing (same pattern as existing migration)

---

## 4. Deep Link Navigation & Foreground Suppression

### Modified file: `mobile/src/services/notifications.service.ts`

Extend `setForegroundNotificationHandler` to pass notification data:

```typescript
// Current signature (must change):
setForegroundNotificationHandler(handler: (title: string, body: string) => void)

// New signature:
setForegroundNotificationHandler(
  handler: (title: string, body: string, data?: Record<string, unknown>) => void
)
```

Inside the `handleNotification` callback, pass `notification.request.content.data` as the third argument. Existing callers that don't use the third argument are unaffected.

### Modified file: `mobile/src/context/NotificationContext.tsx`

**Two additions:**

**A) Notification response listener (deep links):**

Add a new `useEffect` that registers a notification response listener using the existing `addNotificationResponseListener` wrapper from `notifications.service.ts` (line 194). Do NOT call the expo API directly — maintain the existing abstraction where all expo-notifications calls go through the service layer. This listener does NOT currently exist in NotificationContext.

Navigation requires a `navigationRef`. The existing `AppNavigator.tsx` should export a `navigationRef` created via `createNavigationContainerRef()` and pass it to the `NavigationContainer`. `NotificationContext` imports this ref.

Routing logic:
- `{ type: 'habit-reminder' }` → `navigationRef.navigate('HabitsScreen')`
- `{ type: 'routine-reminder' }` → `navigationRef.navigate('FocusScreen')`
- Unknown types → no-op (existing behavior)

**B) Foreground suppression for habit reminders:**

Update the foreground handler registration to use the new 3-arg signature. When `data.type === 'habit-reminder'`:
1. Read `habitId` from data
2. Call `isHabitCompletedToday(habitId, userId)` (already exists in habits.service.ts)
3. If completed → suppress (don't show toast)
4. If not completed → show toast as normal

Routine reminders always show when foregrounded (no completion tracking for routines).

**C) syncAllReminders call:**

Add `syncAllReminders(userId)` call alongside existing `initializeUserNotifications()` in the foreground/init flow.

---

## 5. Habit & Routine Integration Points

### Modified file: `mobile/src/hooks/useHabitsScreen.ts`

In `handleWizardComplete`:
- `createHabit(user.uid, habitData)` currently does not capture the return value (the new habit ID). Change to: `const habitId = await createHabit(user.uid, habitData);`
- After create: if `habitData.cue?.type === 'time'`, call `scheduleHabitReminder({ id: habitId, ...habitData } as Habit)`
- After update: call `cancelHabitReminder(editingHabit.id)` then `scheduleHabitReminder(updatedHabit)` if cue is time-based

In `handleDeleteHabit` (or wherever delete happens):
- Call `cancelHabitReminder(habitId)` before or after the Firestore delete

### Modified file: `mobile/src/components/routines/RoutineEditor.tsx`

In the save handler (line ~143 for update, ~151 for create):
- `createRoutine` currently does not capture the return value. Change to: `const routineId = await createRoutine(user.uid, routineData);` (`createRoutine` returns `Promise<string>`)
- After create: if `reminderTime` is non-null, call `scheduleRoutineReminder({ id: routineId, ...routineData } as Routine)`
- For update: call `cancelRoutineReminder(routineId)` first, then reschedule if new reminderTime exists

### Modified file: `mobile/src/screens/Focus/PomodoroTab.tsx`

In `handleSessionComplete`:
- Add `const { playCompletionSound } = useCompletionSound();` at hook level
- Call `playCompletionSound()` (fire-and-forget) alongside existing haptic

### Modified file: `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx` (and `RoutineCompleteState`)

The existing completion haptic (`Haptics.notificationAsync(Success)`) fires inside `RoutineCompleteState.tsx` on mount — not in `ActiveRoutinePlayer.tsx`. The completion sound should fire at the same moment as the haptic for consistency.

- Add `useCompletionSound` hook to `RoutineCompleteState.tsx` (or whichever component renders the completion view)
- Call `playCompletionSound()` on mount, alongside the existing haptic
- If `RoutineCompleteState` is a child component rendered by `ActiveRoutinePlayer`, the hook lives in the child

---

## 6. File Change Summary

### New files
- `mobile/src/services/reminderScheduler.service.ts` — centralized reminder scheduling
- `mobile/src/hooks/useCompletionSound.ts` — completion sound hook
- `mobile/assets/sounds/completion/singing-bowl.mp3`
- `mobile/assets/sounds/completion/soft-chime.mp3`
- `mobile/assets/sounds/completion/nature-bell.mp3`
- `mobile/assets/sounds/completion/stream.mp3`

### Modified files
- `mobile/src/services/notifications.service.ts` — extend foreground handler to pass notification data
- `mobile/src/services/firebase/notificationPreferences.service.ts` — add `completionSound` to schema, defaults, and V1→V2 migration
- `mobile/src/types/models.ts` — add `completionSound` to `NotificationPreferences` interface
- `mobile/src/context/NotificationContext.tsx` — add `syncAllReminders` call, notification response listener for deep links, foreground suppression for habit reminders
- `mobile/src/navigation/AppNavigator.tsx` — export `navigationRef` for deep link routing
- `mobile/src/hooks/useHabitsScreen.ts` — capture `createHabit` return value, call schedule/cancel on habit create/update/delete
- `mobile/src/components/routines/RoutineEditor.tsx` — call schedule/cancel on routine save
- `mobile/src/screens/Focus/PomodoroTab.tsx` — add `useCompletionSound`, call on session complete
- `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx` (and `RoutineCompleteState`) — add `useCompletionSound`, call on routine complete
- `mobile/src/screens/NotificationSettingsScreen.tsx` — add completion sound picker section

---

## 7. Data Flow Diagrams

### Habit reminder flow

```
User creates habit with cue: { type: 'time', value: '7:00 AM' }
  -> useHabitsScreen captures habitId from createHabit()
  -> calls scheduleHabitReminder({ id: habitId, cue: { type: 'time', value: '7:00 AM' } })
    -> parseTimeString('7:00 AM') -> { hour: 7, minute: 0 }
    -> checks notification permissions (skip if denied)
    -> checks allNotificationsEnabled (skip if false)
    -> cancels existing 'habit-reminder-{id}' if any
    -> schedules DailyTriggerInput { hour: 7, minute: 0, repeats: true }

Daily at 7:00 AM:
  App foregrounded:
    -> NotificationContext reads data.type === 'habit-reminder'
    -> checks isHabitCompletedToday(habitId)
    -> completed: suppress | not completed: show toast
  App backgrounded:
    -> system notification shows
    -> tap -> response listener -> navigate to Habits screen
```

### Routine reminder flow

```
User saves routine with reminderTime: '06:30'
  -> RoutineEditor calls scheduleRoutineReminder(routine)
    -> parseTimeString('06:30') -> { hour: 6, minute: 30 }
    -> checks permissions + master toggle
    -> cancels existing 'routine-reminder-{id}' if any
    -> schedules DailyTriggerInput { hour: 6, minute: 30, repeats: true }

Daily at 6:30 AM:
  App foregrounded -> toast shown
  App backgrounded -> system notification -> tap -> navigate to Focus screen
```

### Timer completion sound flow

```
User starts Pomodoro / routine
  -> useCompletionSound reads preference on mount, pre-loads sound
  -> Timer counts down...
  -> onSessionComplete / routine complete fires
    -> playCompletionSound() (fire-and-forget, 60% volume, one-shot)
    -> Haptics.notificationAsync(Success) (existing, always runs)
  -> If sound load failed: haptic still fires, sound is silently skipped
```

### App foreground sync

```
App returns to foreground
  -> NotificationContext.initializeUserNotifications() (existing)
  -> syncAllReminders(userId) (new)
    -> getAllScheduledNotificationsAsync()
    -> filter identifiers starting with 'habit-reminder-' or 'routine-reminder-'
    -> cancel each individually
    -> fetch active habits with cue?.type === 'time'
    -> fetch active routines with non-null reminderTime
    -> re-schedule each (with permission + preference checks)
```
