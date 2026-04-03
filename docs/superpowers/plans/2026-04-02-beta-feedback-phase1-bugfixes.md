# Beta Feedback Phase 1: Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all crash bugs and broken functionality reported by beta testers on the mobile app.

**Architecture:** Create a shared safe image picker utility, fix unsafe array access patterns, decouple habit completion from reminder scheduling, fix community data passing, and standardize naming. All changes in `mobile/src/`.

**Tech Stack:** React Native, Expo (expo-image-picker), TypeScript, Firebase Firestore

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `mobile/src/utils/safeImagePicker.ts` | Shared image picker with null checks, debounce, size validation |

### Modified Files
| File | Changes |
|---|---|
| `mobile/src/screens/ProfileScreen.tsx` | Use safePickFromLibrary, add picker debounce |
| `mobile/src/components/community/CreatePostModal.tsx` | Use safe picker functions, add debounce |
| `mobile/src/services/firebase/storage.service.ts` | Add response.ok check in uriToBlob |
| `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx` | Guard empty activities array |
| `mobile/src/screens/Focus/components/ChecklistPlayer.tsx` | Fix ID type coercion, add onActivityToggle callback |
| `mobile/src/hooks/useHabitsScreen.ts` | Optimistic state update, decouple reminder, fix un-toggle |
| `mobile/src/hooks/useGroupDetail.ts` | Pass authorName to addCommentToPost |
| `mobile/src/components/community/CommunityOrientationCard.tsx` | Make pills clickable with navigation |
| `mobile/src/components/community/PostCard.tsx` | Add onAuthorPress prop, wrap author row |
| `mobile/src/screens/community/CommunityScreen.tsx` | Pass onAuthorPress to PostCard |
| `mobile/src/screens/community/GroupDetailScreen.tsx` | Pass onAuthorPress to PostCard |
| `mobile/src/screens/community/GroupsScreen.tsx` | Fix back button navigation |
| `mobile/src/components/habits/SimpleHabitCreateScreen.tsx` | Change "New Rhythm" to "New Habit" |
| `mobile/src/screens/PlanScreen.tsx` | Add "Your habits and routines" subtitle |

### Deleted Files
| File | Reason |
|---|---|
| `mobile/src/components/routines/RoutinesTab.tsx` | Dead code with crash bug (navigates to non-existent route) |

---

## Task 1: Create Safe Image Picker Utility

**Files:**
- Create: `mobile/src/utils/safeImagePicker.ts`

- [ ] **Step 1: Create the utility file**

```typescript
/**
 * Safe wrappers around expo-image-picker.
 * Handles permissions, null checks, debounce guards, and size validation.
 */
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { logger } from './logger';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Safely pick image(s) from the media library.
 * Returns validated assets array, or null on failure/cancel.
 */
export async function safePickFromLibrary(
  options: Partial<ImagePicker.ImagePickerOptions> = {}
): Promise<ImagePicker.ImagePickerAsset[] | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please grant photo library access in Settings.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      ...options,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets;
  } catch (error) {
    logger.error('safePickFromLibrary error:', error);
    return null;
  }
}

/**
 * Safely take a photo or video with the camera.
 * Returns validated assets array, or null on failure/cancel.
 */
export async function safePickFromCamera(
  options: Partial<ImagePicker.ImagePickerOptions> = {}
): Promise<ImagePicker.ImagePickerAsset[] | null> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please grant camera access in Settings.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      ...options,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets;
  } catch (error) {
    logger.error('safePickFromCamera error:', error);
    return null;
  }
}

/**
 * Safely convert a URI to a Blob with response and size validation.
 * Returns null if the fetch fails, response is not ok, or file exceeds 10MB.
 */
export async function safeUriToBlob(uri: string): Promise<Blob | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      logger.error(`safeUriToBlob: fetch failed with status ${response.status}`);
      return null;
    }

    const blob = await response.blob();

    if (blob.size > MAX_FILE_SIZE_BYTES) {
      Alert.alert('Image Too Large', 'Please select an image under 10MB.');
      return null;
    }

    return blob;
  } catch (error) {
    logger.error('safeUriToBlob error:', error);
    return null;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd mobile && npx expo export --platform ios --output-dir /tmp/expo-build-check 2>&1 | head -20` (or just `npx tsc --noEmit 2>&1 | tail -10`)

- [ ] **Step 3: Commit**

```bash
git add mobile/src/utils/safeImagePicker.ts
git commit -m "feat(mobile): add shared safe image picker utility with null checks, debounce, size validation"
```

---

## Task 2: Fix Profile Image Upload Crash

**Files:**
- Modify: `mobile/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Update handleUploadImage to use safe picker**

In `ProfileScreen.tsx`, find the `handleUploadImage` function and replace it. The current code has unsafe `result.assets[0].uri` access and raw `fetch` without response validation.

Find this code:
```typescript
const handleUploadImage = async (type: 'avatar' | 'banner') => {
    if (!user || !db) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setUploading(true);
      try {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
```

Replace the permission check, picker call, and blob conversion with safe equivalents:

```typescript
const handleUploadImage = async (type: 'avatar' | 'banner') => {
    if (!user || !db) return;
    if (isPickerOpen.current) return;
    isPickerOpen.current = true;

    try {
      const assets = await safePickFromLibrary({
        allowsEditing: true,
        aspect: type === 'avatar' ? [1, 1] : [16, 9],
      });

      if (!assets) { isPickerOpen.current = false; return; }

      setUploading(true);
      const blob = await safeUriToBlob(assets[0].uri);
      if (!blob) { setUploading(false); isPickerOpen.current = false; return; }
```

The rest of the function (upload to Storage, update Firestore, set state) stays the same. Add `isPickerOpen.current = false;` in the `finally` block.

Also add near the top of the component:
```typescript
const isPickerOpen = useRef(false);
```

And add import:
```typescript
import { safePickFromLibrary, safeUriToBlob } from '../utils/safeImagePicker';
```

Remove the now-unused `import * as ImagePicker from 'expo-image-picker';` if no other usage remains in the file.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | tail -10`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/ProfileScreen.tsx
git commit -m "fix(mobile): prevent profile image upload crash with safe picker and debounce"
```

---

## Task 3: Fix Community Post Image Crash

**Files:**
- Modify: `mobile/src/components/community/CreatePostModal.tsx`

- [ ] **Step 1: Replace all three media handler functions**

Add import at top of file:
```typescript
import { safePickFromLibrary, safePickFromCamera } from '../../utils/safeImagePicker';
```

Add ref inside the component:
```typescript
const isPickerOpen = useRef(false);
```

Replace `handleTakePhoto`:
```typescript
const handleTakePhoto = async () => {
  if (isPickerOpen.current) return;
  isPickerOpen.current = true;
  try {
    const assets = await safePickFromCamera({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (assets) {
      setSelectedMedia(prev => [...prev, {
        uri: assets[0].uri,
        type: 'image' as const,
        id: Date.now().toString(),
      }]);
    }
  } finally {
    isPickerOpen.current = false;
  }
};
```

Replace `handleRecordVideo`:
```typescript
const handleRecordVideo = async () => {
  if (isPickerOpen.current) return;
  isPickerOpen.current = true;
  try {
    const assets = await safePickFromCamera({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 300,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (assets) {
      if (assets[0].duration && assets[0].duration > 300) {
        Alert.alert('Video Too Long', 'Videos must be 5 minutes or less');
        return;
      }
      setSelectedMedia(prev => [...prev, {
        uri: assets[0].uri,
        type: 'video' as const,
        id: Date.now().toString(),
      }]);
    }
  } finally {
    isPickerOpen.current = false;
  }
};
```

Replace `handleChooseFromLibrary`:
```typescript
const handleChooseFromLibrary = async () => {
  if (isPickerOpen.current) return;
  isPickerOpen.current = true;
  try {
    const assets = await safePickFromLibrary({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (assets) {
      const newMedia = assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' as const : 'image' as const,
        id: `${Date.now()}_${Math.random()}`,
      }));
      setSelectedMedia(prev => [...prev, ...newMedia]);
    }
  } finally {
    isPickerOpen.current = false;
  }
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | tail -10`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/community/CreatePostModal.tsx
git commit -m "fix(mobile): prevent community post image crash with safe picker and debounce"
```

---

## Task 4: Fix storage.service.ts uriToBlob

**Files:**
- Modify: `mobile/src/services/firebase/storage.service.ts`

- [ ] **Step 1: Add response.ok check**

Find this code:
```typescript
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}
```

Replace with:
```typescript
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: HTTP ${response.status}`);
  }
  const blob = await response.blob();
  return blob;
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/services/firebase/storage.service.ts
git commit -m "fix(mobile): add response.ok validation in storage uriToBlob"
```

---

## Task 5: Fix ActiveRoutinePlayer Crash on Empty Activities

**Files:**
- Modify: `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx`

- [ ] **Step 1: Add early guard for empty activities**

Find the component function start (after the props destructuring, around line 76):
```typescript
  const reduceMotion = useReducedMotion();
```

Add an early return guard right after it:
```typescript
  const reduceMotion = useReducedMotion();

  // Guard: if routine has no activities, show empty state
  if (!routine.activities || routine.activities.length === 0) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Icon name="playlist-remove" size={48} color={ColorTokens.textSecondary} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: ColorTokens.textPrimary, marginTop: 16, textAlign: 'center' }}>
              No activities added yet
            </Text>
            <Text style={{ fontSize: 14, color: ColorTokens.textSecondary, marginTop: 8, textAlign: 'center' }}>
              Edit this routine to add activities.
            </Text>
            <TouchableOpacity
              onPress={onEditRoutine}
              style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: ColorTokens.evergreenTeal, borderRadius: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Edit Routine</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
              <Text style={{ color: ColorTokens.textSecondary, fontSize: 14 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }
```

Note: This guard must come BEFORE the `useState` calls that access `routine.activities[0]` (line 83). Since React hooks can't be called conditionally, move the guard to wrap the return JSX instead. The actual fix: wrap the main return in a conditional and render the empty state when activities is empty, while keeping the useState initializer safe with a fallback:

Find line 83:
```typescript
const [timeRemaining, setTimeRemaining] = useState(routine.activities[0]?.duration * 60 || 0);
```

Replace with:
```typescript
const safeActivities = routine.activities || [];
const [timeRemaining, setTimeRemaining] = useState(safeActivities[0]?.duration ? safeActivities[0].duration * 60 : 0);
```

And replace lines 97-100:
```typescript
const currentActivity = routine.activities[currentIndex];
const totalActivities = routine.activities.length;
const nextActivity = currentIndex < totalActivities - 1
  ? routine.activities[currentIndex + 1]
  : null;
```

With:
```typescript
const currentActivity = safeActivities[currentIndex];
const totalActivities = safeActivities.length;
const nextActivity = currentIndex < totalActivities - 1
  ? safeActivities[currentIndex + 1]
  : null;
```

Then add the empty state check before the main return:
```typescript
if (totalActivities === 0) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Icon name="playlist-remove" size={48} color={ColorTokens.textSecondary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: ColorTokens.textPrimary, marginTop: 16, textAlign: 'center' }}>
            No activities added yet
          </Text>
          <Text style={{ fontSize: 14, color: ColorTokens.textSecondary, marginTop: 8, textAlign: 'center' }}>
            Edit this routine to add activities.
          </Text>
          <TouchableOpacity
            onPress={onEditRoutine}
            style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: ColorTokens.evergreenTeal, borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Edit Routine</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: ColorTokens.textSecondary, fontSize: 14 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/Focus/ActiveRoutinePlayer.tsx
git commit -m "fix(mobile): prevent ActiveRoutinePlayer crash on empty activities array"
```

---

## Task 6: Delete Dead Routines Code & Fix ChecklistPlayer

**Files:**
- Delete: `mobile/src/components/routines/RoutinesTab.tsx`
- Modify: `mobile/src/screens/Focus/components/ChecklistPlayer.tsx`

- [ ] **Step 1: Delete dead code**

```bash
rm mobile/src/components/routines/RoutinesTab.tsx
```

Check if the directory is now empty and clean up:
```bash
ls mobile/src/components/routines/
```
If empty or only has an index file that exports the deleted file, clean that up too.

- [ ] **Step 2: Fix ChecklistPlayer ID type coercion**

In `mobile/src/screens/Focus/components/ChecklistPlayer.tsx`, find:
```typescript
const toggleActivity = (id: number) => {
  Haptics.selectionAsync();
  setCompletedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};
```

Replace with (change type from `number` to `string`, coerce IDs):
```typescript
const toggleActivity = (id: number | string) => {
  const stringId = String(id);
  Haptics.selectionAsync();
  setCompletedIds((prev) => {
    const next = new Set(prev);
    if (next.has(stringId)) {
      next.delete(stringId);
    } else {
      next.add(stringId);
    }
    return next;
  });
};
```

Also update the Set type from `Set<number>` to `Set<string>`:
```typescript
const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
```

And update the `isCompleted` check to coerce too:
Find where completedIds.has is called in the render (likely `completedIds.has(activity.id)`):
Replace with `completedIds.has(String(activity.id))`

- [ ] **Step 3: Commit**

```bash
git add -A mobile/src/components/routines/ mobile/src/screens/Focus/components/ChecklistPlayer.tsx
git commit -m "fix(mobile): delete dead RoutinesTab, fix ChecklistPlayer ID type handling"
```

---

## Task 7: Fix Habit Completion Toggle

**Files:**
- Modify: `mobile/src/hooks/useHabitsScreen.ts`

- [ ] **Step 1: Add optimistic update and decouple reminder**

Find the `handleToggleCompletion` function:
```typescript
const handleToggleCompletion = useCallback(async (habitId: string) => {
  const isCompleted = completedToday.has(habitId);

  try {
    if (isCompleted) {
      // Unchecking — no sheet needed
      await unmarkHabitComplete(habitId, today);
      setCompletedToday(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        return newSet;
      });
      setAllHabitsCompletedToday(false);
    } else if (DASHBOARD_V2 || !reflectionEnabled) {
      // V2: single-tap completion, no sheet. Also used when reflections disabled.
      await markHabitComplete(habitId, user!.uid, today, { source: 'track' });
      completeHabitLocally(habitId);
    } else {
```

Replace with optimistic state update pattern:
```typescript
const [togglingHabits, setTogglingHabits] = useState<Set<string>>(new Set());

const handleToggleCompletion = useCallback(async (habitId: string) => {
  // Prevent rapid double-taps on the same habit
  if (togglingHabits.has(habitId)) return;
  setTogglingHabits(prev => new Set(prev).add(habitId));

  const isCompleted = completedToday.has(habitId);

  try {
    if (isCompleted) {
      // Optimistic: immediately show as unchecked
      setCompletedToday(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        return newSet;
      });
      setAllHabitsCompletedToday(false);
      await unmarkHabitComplete(habitId, today);
    } else if (DASHBOARD_V2 || !reflectionEnabled) {
      // Optimistic: immediately show as checked
      completeHabitLocally(habitId);
      await markHabitComplete(habitId, user!.uid, today, { source: 'track' });
    } else {
      // V1: Open the completion sheet for reflection
      const habit = habits.find((h) => h.id === habitId);
      if (habit) {
        setCompletionSheetHabit(habit);
      }
    }
  } catch (error) {
    // Rollback on failure
    if (isCompleted) {
      // Was trying to uncheck — restore checked state
      completeHabitLocally(habitId);
    } else {
      // Was trying to check — restore unchecked state
      setCompletedToday(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        return newSet;
      });
    }
    logger.error('Error toggling habit completion:', error);
    Alert.alert('Error', 'Failed to update habit. Please try again.');
  } finally {
    setTogglingHabits(prev => {
      const newSet = new Set(prev);
      newSet.delete(habitId);
      return newSet;
    });
  }
}, [completedToday, today, user, habits, reflectionEnabled, togglingHabits, setAllHabitsCompletedToday]);
```

Add the `togglingHabits` state declaration near the other useState calls in the hook.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | tail -10`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useHabitsScreen.ts
git commit -m "fix(mobile): optimistic habit toggle with rollback, prevent rapid double-taps"
```

---

## Task 8: Fix Community Comments "Someone" Bug

**Files:**
- Modify: `mobile/src/hooks/useGroupDetail.ts`

- [ ] **Step 1: Pass authorName to addCommentToPost**

Find:
```typescript
  await addCommentToPost(postId, { userId: user.uid, text });
```

Replace with:
```typescript
  await addCommentToPost(postId, { userId: user.uid, text, authorName: user.displayName || 'Someone' });
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useGroupDetail.ts
git commit -m "fix(mobile): pass displayName to addCommentToPost so comments show real name"
```

---

## Task 9: Make Community Orientation Pill Items Clickable

**Files:**
- Modify: `mobile/src/components/community/CommunityOrientationCard.tsx`

- [ ] **Step 1: Add onPress to PillProps and change View to TouchableOpacity**

Find the PillProps interface:
```typescript
interface PillProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}
```

Replace with:
```typescript
interface PillProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
}
```

Find the ConceptPill component:
```typescript
const ConceptPill: React.FC<PillProps> = ({ icon, title, subtitle }) => (
  <View style={styles.pill}>
```

Replace with:
```typescript
const ConceptPill: React.FC<PillProps> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.7}>
```

And change the closing `</View>` of the pill to `</TouchableOpacity>`.

Also add `TouchableOpacity` to the React Native import at the top of the file.

- [ ] **Step 2: Add navigation props to CommunityOrientationCardProps**

Find:
```typescript
interface CommunityOrientationCardProps {
  onFindGroup: () => void;
  onSkip: () => void;
}
```

Replace with:
```typescript
interface CommunityOrientationCardProps {
  onFindGroup: () => void;
  onSkip: () => void;
  onNavigateGroups?: () => void;
  onNavigateChallenges?: () => void;
}
```

- [ ] **Step 3: Pass onPress to each ConceptPill**

Find where the three ConceptPill components are rendered and add `onPress` to the Groups and Challenges pills. The Groups pill gets `onPress={onNavigateGroups}`, the Challenges pill gets `onPress={onNavigateChallenges}`. The Posts pill can use `onPress={onSkip}` (dismiss the card to show the feed).

- [ ] **Step 4: Update parent component to pass navigation callbacks**

In the parent that renders `CommunityOrientationCard` (likely `CommunityScreen.tsx`), pass:
```typescript
onNavigateGroups={() => navigation.navigate('Groups')}
onNavigateChallenges={() => navigation.navigate('Challenges')}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/community/CommunityOrientationCard.tsx mobile/src/screens/community/CommunityScreen.tsx
git commit -m "fix(mobile): make community orientation pills clickable with navigation"
```

---

## Task 10: Make Post Author Name Tappable

**Files:**
- Modify: `mobile/src/components/community/PostCard.tsx`
- Modify: `mobile/src/screens/community/CommunityScreen.tsx`
- Modify: `mobile/src/screens/community/GroupDetailScreen.tsx`

- [ ] **Step 1: Add onAuthorPress prop to PostCard**

In PostCard.tsx, find the PostCardProps interface:
```typescript
interface PostCardProps {
  post: any;
  onLike: (postId: string) => Promise<boolean>;
  onComment: (post: any) => void;
  formatTimestamp: (post: any) => string;
  disabled?: boolean;
  disabledMessage?: string;
  onGroupPress?: () => void;
  /** Hide group context badge (when viewing inside a group) */
  hideGroupBadge?: boolean;
  /** Called when the overflow ⋯ icon is tapped */
  onMorePress?: (post: any) => void;
}
```

Add after `onMorePress`:
```typescript
  /** Called when the author name/avatar is tapped */
  onAuthorPress?: (userId: string) => void;
```

- [ ] **Step 2: Wrap author row in TouchableOpacity**

Find the author row (around line 160):
```typescript
<View style={styles.authorRow}>
  <CommunityAvatar
    name={authorName}
    photoURL={avatarUrl}
    size={36}
  />
  <View style={styles.authorInfo}>
    <Text style={styles.authorName}>{authorName}</Text>
    <Text style={styles.timestamp}>
      {isChallengePost ? `checked in \u00B7 ${timestamp}` : timestamp}
    </Text>
  </View>
```

Wrap the avatar and author info in a TouchableOpacity (before the badge and overflow button):
```typescript
<View style={styles.authorRow}>
  <TouchableOpacity
    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
    onPress={() => onAuthorPress?.(post.author?.uid || post.userId)}
    disabled={!onAuthorPress}
    activeOpacity={0.7}
  >
    <CommunityAvatar
      name={authorName}
      photoURL={avatarUrl}
      size={36}
    />
    <View style={styles.authorInfo}>
      <Text style={styles.authorName}>{authorName}</Text>
      <Text style={styles.timestamp}>
        {isChallengePost ? `checked in \u00B7 ${timestamp}` : timestamp}
      </Text>
    </View>
  </TouchableOpacity>
```

Make sure `onAuthorPress` is destructured from props in the component.

- [ ] **Step 3: Pass onAuthorPress in CommunityScreen**

In `CommunityScreen.tsx`, find the renderPost function:
```typescript
<PostCard
  post={item}
  onLike={handleLike}
  onComment={(post: any) => setCommentPost(post)}
  formatTimestamp={formatTimestamp}
  onGroupPress={item.groupId ? () => navigation.navigate('GroupDetail', { groupId: item.groupId, groupName: item.groupName }) : undefined}
  onMorePress={handleMorePress}
/>
```

Add:
```typescript
  onAuthorPress={(userId) => navigation.navigate('UserProfile', { userId })}
```

- [ ] **Step 4: Pass onAuthorPress in GroupDetailScreen**

In `GroupDetailScreen.tsx`, find the renderPost function:
```typescript
<PostCard
  post={item}
  onLike={handleLikePost}
  onComment={(post) => setCommentPost(post)}
  formatTimestamp={formatTimestamp}
  disabled={!isMember}
  disabledMessage="Join this group to support and comment on posts"
  hideGroupBadge
  onMorePress={handleMorePress}
/>
```

Add:
```typescript
  onAuthorPress={(userId) => navigation.navigate('UserProfile', { userId })}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/community/PostCard.tsx mobile/src/screens/community/CommunityScreen.tsx mobile/src/screens/community/GroupDetailScreen.tsx
git commit -m "fix(mobile): make post author name and avatar tappable to navigate to profile"
```

---

## Task 11: Fix Groups Screen Back Button

**Files:**
- Modify: `mobile/src/screens/community/GroupsScreen.tsx`

- [ ] **Step 1: Replace goBack with explicit navigation**

Find:
```typescript
<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
  <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
</TouchableOpacity>
```

Replace with:
```typescript
<TouchableOpacity onPress={() => navigation.navigate('CommunityMain')} style={styles.backButton}>
  <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
</TouchableOpacity>
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/community/GroupsScreen.tsx
git commit -m "fix(mobile): Groups back button navigates to CommunityMain explicitly"
```

---

## Task 12: Fix Naming Consistency

**Files:**
- Modify: `mobile/src/components/habits/SimpleHabitCreateScreen.tsx`
- Modify: `mobile/src/screens/PlanScreen.tsx`

- [ ] **Step 1: Change "New Rhythm" to "New Habit"**

In `SimpleHabitCreateScreen.tsx`, find all instances of:
```typescript
title="New Rhythm"
```

Replace with:
```typescript
title="New Habit"
```

(There are two instances — lines 110 and 119.)

- [ ] **Step 2: Add subtitle to PlanScreen header**

In `PlanScreen.tsx`, find the `getSubtitle` function:
```typescript
const getSubtitle = (): string => {
  switch (activeTab) {
    case 'habits':
      return 'Build consistency, one day at a time';
    case 'routines':
      return FocusCopy.routinesSubtitle;
    default:
      return '';
  }
};
```

This already provides a subtitle per tab. But the page title itself ("Rhythms") has no top-level context. Add a small subtitle right after the page title. Find:
```typescript
<View style={styles.header}>
  <Text style={styles.pageTitle}>Rhythms</Text>
  <Text style={styles.pageSubtitle}>{getSubtitle()}</Text>
</View>
```

The subtitle is already dynamic per tab, which is good. The issue is the tab-level subtitle doesn't explain what "Rhythms" means. Replace:
```typescript
<View style={styles.header}>
  <Text style={styles.pageTitle}>Rhythms</Text>
  <Text style={styles.pageSubtitle}>Your habits and routines</Text>
</View>
```

This makes it immediately clear that Rhythms = Habits + Routines. The tab-specific subtitle was redundant since the tabs themselves provide context.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/habits/SimpleHabitCreateScreen.tsx mobile/src/screens/PlanScreen.tsx
git commit -m "fix(mobile): standardize naming — 'New Habit' modal title, 'Your habits and routines' subtitle"
```

---

## Task 0: Create Feature Branch (DO THIS FIRST)

- [ ] **Step 1: Create the feature branch before any code changes**

```bash
cd mobile
git checkout -b fix/beta-feedback-phase1
```

All tasks above should be committed on this branch.

- [ ] **Step 2: Final TypeScript check**

Run: `cd mobile && npx tsc --noEmit 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 3: Verify all files exist/deleted**

```bash
ls mobile/src/utils/safeImagePicker.ts
ls mobile/src/components/routines/RoutinesTab.tsx 2>&1  # Should say "No such file"
```
