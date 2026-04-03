# Beta Feedback Phase 1: Bug Fixes & Broken Functionality — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Scope:** P0 crash fixes, P1 broken functionality, P2 naming consistency
**Platform:** Mobile (React Native/Expo)
**Branch:** `fix/beta-feedback-phase1`

---

## Goal

Fix all crash bugs and broken functionality reported by beta testers. Ship these fixes before tackling Phase 2 dashboard engagement improvements.

---

## Section 1: Shared Image Picker Utility

**Problem:** Both Profile avatar upload and Community post image selection crash the app due to unsafe `result.assets[0]` access without null checks, no debounce on picker button (double-tap launches picker twice causing state collision), and no validation on fetch response or file size.

**Solution:** Create a shared utility at `mobile/src/utils/safeImagePicker.ts` that wraps `expo-image-picker` with safety guards.

### Exported Functions

**`safePickFromLibrary(options?)`**
- Requests media library permission via `ImagePicker.requestMediaLibraryPermissionsAsync()`
- Returns `null` if permission denied (no crash)
- Launches `ImagePicker.launchImageLibraryAsync()` with provided options
- Validates `result.canceled === false` AND `result.assets` is a non-empty array
- Returns the validated assets array, or `null` on any failure
- Logs errors but never throws

**`safePickFromCamera(options?)`**
- Same pattern as `safePickFromLibrary` but uses `ImagePicker.requestCameraPermissionsAsync()` and `ImagePicker.launchCameraAsync()`

**`safeUriToBlob(uri)`**
- Calls `fetch(uri)` with a check: if `!response.ok`, returns `null` with error log
- Calls `response.blob()` and validates blob size is under 10MB
- If over 10MB, shows `Alert.alert('Image Too Large', 'Please select an image under 10MB.')` and returns `null`
- Returns the validated `Blob`, or `null` on any failure

### Debounce Pattern
Each calling component maintains a local `isPickerOpen` ref (not state — refs don't cause re-renders). Set to `true` before calling any `safePick*` function, set to `false` when it returns. Guard the button's `onPress` with `if (isPickerOpen.current) return;`.

### Files Modified

- **Create:** `mobile/src/utils/safeImagePicker.ts`
- **Modify:** `mobile/src/screens/ProfileScreen.tsx` — Replace raw `ImagePicker` calls with `safePickFromLibrary`/`safePickFromCamera`, add `isPickerOpen` ref guard
- **Modify:** `mobile/src/components/community/CreatePostModal.tsx` — Replace `handleChooseFromLibrary`, `handleTakePhoto`, `handleRecordVideo` with safe equivalents, add `isPickerOpen` ref guard
- **Modify:** `mobile/src/services/firebase/storage.service.ts` — Add `response.ok` check in `uriToBlob` function

---

## Section 2: Routine Crash Fixes

**Problem:** ActiveRoutinePlayer crashes when `routine.activities` is undefined or empty. Dead code in `components/routines/RoutinesTab.tsx` navigates to non-existent route. ChecklistPlayer completion state is local-only and doesn't persist.

### Fix A: ActiveRoutinePlayer Guard

In `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx`:
- Add early guard: if `!routine.activities?.length`, render an empty state message ("No activities added yet. Edit this routine to add activities.") with an "Edit Routine" button that calls `onEditRoutine`.
- Guard `routine.activities[0]?.duration` access on line 83 with fallback to 0.
- Guard `currentActivity` usage throughout — if undefined, don't render timer/activity UI.

### Fix B: Delete Dead Code

Delete `mobile/src/components/routines/RoutinesTab.tsx` — confirmed unused (no imports found in codebase). Contains navigation to non-existent `'RoutineTimer'` route.

### Fix C: ChecklistPlayer Completion

In `mobile/src/screens/Focus/components/ChecklistPlayer.tsx`:
- Ensure `toggleActivity` handles both string and number IDs by coercing to string before Set operations.
- Add an `onActivityToggle` callback prop so the parent can track which activities are completed.
- When "Done" is pressed or all activities are checked, call `onComplete` with the list of completed activity IDs so the parent can persist if needed.

### Files Modified

- **Modify:** `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx`
- **Delete:** `mobile/src/components/routines/RoutinesTab.tsx`
- **Modify:** `mobile/src/screens/Focus/components/ChecklistPlayer.tsx`

---

## Section 3: Habit Completion Fix

**Problem:** After checking off a habit and declining the timer reminder popup, the user can't check off the same habit again — it appears stuck.

**Root Cause:** The reminder scheduling flow is coupled with the completion state update. If the reminder interaction interferes with the callback chain, the local state doesn't reflect the actual completion status.

### Fix

In `mobile/src/hooks/useHabitsScreen.ts`:

1. **Decouple completion from reminder:** Complete the habit in Firebase first, update local state optimistically, then offer the reminder as a separate non-blocking action. The reminder popup must not gate or interfere with the completion state.

2. **Optimistic state update:** On tap, immediately update local completion state (show as completed). If the Firebase call fails, roll back the local state and show an error toast.

3. **Fix un-toggle path:** Ensure tapping an already-completed habit properly un-toggles it. The current code may be short-circuiting because it sees the habit as "already done" in stale local state.

4. **Guard against rapid taps:** Add a per-habit loading flag (using a Set of habitIds currently being toggled) to prevent duplicate Firebase calls from rapid tapping.

### Files Modified

- **Modify:** `mobile/src/hooks/useHabitsScreen.ts`

---

## Section 4: Community Fixes

### Fix A: Comments Showing "Someone" Instead of Real Name

**Problem:** `useGroupDetail.ts` doesn't pass `user.displayName` to `addCommentToPost()`, so the service layer falls back to `'Someone'`.

**Fix:** In `mobile/src/hooks/useGroupDetail.ts`, update the `handleCommentSubmit` call:
```
await addCommentToPost(postId, {
  userId: user.uid,
  text,
  authorName: user.displayName || 'Someone',
});
```

### Fix B: Community Orientation Card Pills Not Clickable

**Problem:** `ConceptPill` components render as plain `View` with no press handler.

**Fix:** In `mobile/src/components/community/CommunityOrientationCard.tsx`:
- Change `ConceptPill`'s outer `View` to `TouchableOpacity`
- Add `onPress` prop to `ConceptPill`
- Pass navigation callbacks: Groups pill → `GroupsScreen`, Challenges pill → `ChallengesScreen`, Posts pill → dismiss card and scroll to feed

### Fix C: Author Name Tappable on Posts

**Problem:** Author name/avatar in `PostCard.tsx` is plain text with no press handler.

**Fix:** In `mobile/src/components/community/PostCard.tsx`:
- Wrap the author row (avatar + name + timestamp) in a `TouchableOpacity`
- Add `onAuthorPress` prop to `PostCard` (receives `userId`)
- All parent components that render `PostCard` pass an `onAuthorPress` callback that navigates to `UserProfile` screen with the author's userId

### Fix D: Groups Screen Back Button

**Problem:** `navigation.goBack()` may return to unexpected screen depending on navigation entry point.

**Fix:** In `mobile/src/screens/community/GroupsScreen.tsx`:
- Replace `navigation.goBack()` with `navigation.navigate('CommunityMain')` for explicit, consistent navigation back to community home.

### Files Modified

- **Modify:** `mobile/src/hooks/useGroupDetail.ts`
- **Modify:** `mobile/src/components/community/CommunityOrientationCard.tsx`
- **Modify:** `mobile/src/components/community/PostCard.tsx`
- **Modify:** Parent components rendering PostCard (CommunityScreen, GroupScreen, feed views) — add `onAuthorPress` handler
- **Modify:** `mobile/src/screens/community/GroupsScreen.tsx`

---

## Section 5: Naming Consistency

**Problem:** Tester confused by seeing "Habits", "Rhythms", and "New Rhythm" in the same flow.

**Convention:** "Rhythms" is the umbrella section containing Habits and Routines.

### Changes

| Location | Current | Change To |
|---|---|---|
| `SimpleHabitCreateScreen.tsx` modal title | "New Rhythm" | "New Habit" |
| `PlanScreen.tsx` header subtitle | (none) | Add "Your habits and routines" subtitle |

**No changes needed:**
- Bottom nav tab: already "Rhythms"
- Page header: already "Rhythms"
- Sub-tabs: already "Habits" | "Routines"
- Add button text: already "Add a habit"

### Files Modified

- **Modify:** `mobile/src/components/habits/SimpleHabitCreateScreen.tsx`
- **Modify:** `mobile/src/screens/PlanScreen.tsx`

---

## Out of Scope (Phase 2)

- Dashboard engagement redesign (progress summaries, quick actions, motivational hooks)
- "Hey" greeting improvements (time-of-day personality)
- Checklist vs Timed tab explanation copy
- Any new features or navigation restructuring
