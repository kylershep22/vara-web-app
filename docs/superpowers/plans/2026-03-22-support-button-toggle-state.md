# Support Button Toggle State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clear toggled/untoggled visual states to the Support button on community post cards, with optimistic updates, animated transitions, and inline error handling.

**Architecture:** The Support button in `PostCard.tsx` gets a full visual rework with two distinct states (unsupported/supported) using SVG heart icons, animated transitions via `react-native-reanimated`, and per-card inline error display. The `useFeed` hook gains optimistic update logic so the UI responds instantly on tap. A new `HeartIcon` component encapsulates the SVG path. Error state is managed locally in PostCard. The `useGroupDetail` hook is updated for type compatibility.

**Tech Stack:** React Native, react-native-svg, react-native-reanimated, Firestore

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/components/community/HeartIcon.tsx` | **Create** | SVG heart icon with filled/outline variants |
| `mobile/src/components/community/PostCard.tsx` | **Modify** | Support button visual states, animations, accessibility, inline error |
| `mobile/src/hooks/useFeed.ts` | **Modify** | Optimistic update logic in `handleLikePost` |
| `mobile/src/hooks/useCommunityFeed.ts` | **Modify** | Return success/failure from `handleLike` instead of Alert |
| `mobile/src/hooks/useGroupDetail.ts` | **Modify** | Return success/failure from `handleLikePost` for type compatibility |

---

### Task 1: Create HeartIcon SVG Component

**Files:**
- Create: `mobile/src/components/community/HeartIcon.tsx`

- [ ] **Step 1: Create the HeartIcon component**

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants';

interface HeartIconProps {
  filled: boolean;
  size?: number;
}

export const HeartIcon: React.FC<HeartIconProps> = ({ filled, size = 14 }) => {
  // Design spec: 14x13 base, viewBox 0 0 14 13
  const aspectRatio = 13 / 14;
  const height = size * aspectRatio;

  return (
    <Svg width={size} height={height} viewBox="0 0 14 13" fill="none">
      <Path
        d="M7 12C7 12 1 8 1 4C1 2.3 2.3 1 4 1C5.1 1 6.1 1.6 7 2.5C7.9 1.6 8.9 1 10 1C11.7 1 13 2.3 13 4C13 8 7 12 7 12Z"
        fill={filled ? Colors.evergreenTeal : 'none'}
        stroke={filled ? Colors.evergreenTeal : Colors.softCharcoal}
        strokeWidth={filled ? 1.2 : 1.3}
        strokeLinejoin="round"
      />
    </Svg>
  );
};
```

- [ ] **Step 2: Verify the file was created and has no syntax errors**

Run: `cd mobile && npx tsc --noEmit src/components/community/HeartIcon.tsx 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/community/HeartIcon.tsx
git commit -m "feat: add HeartIcon SVG component for support button states"
```

---

### Task 2: Add Optimistic Update Logic to useFeed

**Files:**
- Modify: `mobile/src/hooks/useFeed.ts` (lines 300-309, the `handleLikePost` function)

The current `handleLikePost` calls Firestore and waits for `onSnapshot` to update the UI. We need it to:
1. Immediately update local `posts` state (toggle `isLiked`, increment/decrement `likesCount`)
2. Call Firestore in the background
3. If Firestore fails, revert via functional updater (not stale closure) and return `false`
4. If Firestore succeeds, return `true` (the next `onSnapshot` will confirm the real state)

**Important:** The rollback must use a functional updater (`setPosts(current => ...)`) to reverse the toggle, NOT capture `posts` in a closure. The `onSnapshot` subscription may have already updated `posts` between the optimistic update and the error, making a captured snapshot stale.

- [ ] **Step 1: Replace handleLikePost with optimistic version**

Replace the `handleLikePost` function (around lines 300-309) with:

```typescript
const handleLikePost = async (postId: string): Promise<boolean> => {
  if (!user) return false;

  // Optimistic update
  setPosts((current) =>
    current.map((p) => {
      if (p.id !== postId) return p;
      const nowLiked = !p.isLiked;
      return {
        ...p,
        isLiked: nowLiked,
        likesCount: nowLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
      };
    })
  );

  try {
    await togglePostLike(postId, user.uid);
    return true;
  } catch (err) {
    logger.error('Error liking post:', err);
    // Revert using functional updater to avoid stale closure
    setPosts((current) =>
      current.map((p) => {
        if (p.id !== postId) return p;
        const reverted = !p.isLiked;
        return {
          ...p,
          isLiked: reverted,
          likesCount: reverted ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      })
    );
    return false;
  }
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep -i "useFeed" | head -10`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useFeed.ts
git commit -m "feat: add optimistic update logic for post support toggle"
```

---

### Task 3: Update useCommunityFeed and useGroupDetail Error Handling

**Files:**
- Modify: `mobile/src/hooks/useCommunityFeed.ts` (lines 122-128, the `handleLike` function)
- Modify: `mobile/src/hooks/useGroupDetail.ts` (lines 311-333, the `handleLikePost` function)

Both hooks currently use `Alert.alert` for errors. Both need to return `Promise<boolean>` so PostCard can show inline errors.

- [ ] **Step 1: Update useCommunityFeed handleLike to return success/failure**

Replace the `handleLike` function (around lines 122-128) with:

```typescript
const handleLike = useCallback(async (postId: string): Promise<boolean> => {
  try {
    const success = await likePost(postId);
    return success;
  } catch (error) {
    return false;
  }
}, [likePost]);
```

- [ ] **Step 2: Update useGroupDetail handleLikePost to return success/failure**

Replace the `handleLikePost` function (around lines 311-333 in `useGroupDetail.ts`) with:

```typescript
const handleLikePost = useCallback(async (postId: string): Promise<boolean> => {
  if (!user) return false;
  if (!group?.members.includes(user.uid)) {
    Alert.alert('Join Required', 'Join this group to support posts');
    return false;
  }
  try {
    await togglePostLike(postId, user.uid);
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.isLiked;
        return {
          ...post,
          isLiked: !isLiked,
          likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1,
        };
      }
      return post;
    }));
    return true;
  } catch (error) {
    return false;
  }
}, [user, group]);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep -i "error" | head -10`

- [ ] **Step 4: Commit**

```bash
git add mobile/src/hooks/useCommunityFeed.ts mobile/src/hooks/useGroupDetail.ts
git commit -m "feat: return success/failure from support toggle for inline error handling"
```

---

### Task 4: Rework Support Button in PostCard

**Files:**
- Modify: `mobile/src/components/community/PostCard.tsx`

This is the main UI task. Changes:
1. Update `onLike` prop type to `Promise<boolean>`
2. Import `HeartIcon`, `Animated` from reanimated, and `AccessibilityInfo`
3. Add animated heart scale, inline error state, tap guard, unmount cleanup
4. Replace the Support button with the full spec visual treatment
5. Add inline error message row below action buttons
6. Update styles for both states using design tokens

- [ ] **Step 1: Add imports**

Add these imports at the top of `PostCard.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { AccessibilityInfo } from 'react-native';
import { HeartIcon } from './HeartIcon';
```

Update the existing React import — keep `import React from 'react';` on line 6, add `useEffect`, `useRef`, `useState` to the new import above.

- [ ] **Step 2: Update the onLike prop type**

In the `PostCardProps` interface (line 21), change:

```typescript
onLike: (postId: string) => void;
```

to:

```typescript
onLike: (postId: string) => Promise<boolean>;
```

- [ ] **Step 3: Add animation, error state, and tap guard inside PostCardComponent**

Add this block inside `PostCardComponent`, after the existing `const` declarations (after line ~50, before the `return`):

```typescript
const [supportError, setSupportError] = useState<string | null>(null);
const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const isProcessingRef = useRef(false);
const heartScale = useSharedValue(1);

const heartAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: heartScale.value }],
}));

// Clean up error timeout on unmount
useEffect(() => {
  return () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
  };
}, []);

const handleSupportPress = async () => {
  if (disabled) {
    Alert.alert('Join Required', disabledMessage);
    return;
  }

  // Guard against rapid double-taps
  if (isProcessingRef.current) return;
  isProcessingRef.current = true;

  // Clear any existing error
  if (errorTimeoutRef.current) {
    clearTimeout(errorTimeoutRef.current);
    setSupportError(null);
  }

  const wasLiked = post.isLiked;

  // Animate heart scale on support (not on unsupport)
  if (!wasLiked) {
    heartScale.value = withSequence(
      withTiming(1.15, { duration: 180, easing: Easing.ease }),
      withTiming(1, { duration: 180, easing: Easing.ease }),
    );
  }

  // Announce state change to screen reader
  const announcement = wasLiked ? 'Support removed' : 'Supported';
  AccessibilityInfo.announceForAccessibility(announcement);

  const success = await onLike(post.id);
  if (!success) {
    setSupportError("Couldn't save that \u2014 try again when you're ready.");
    errorTimeoutRef.current = setTimeout(() => {
      setSupportError(null);
    }, 3000);
  }

  isProcessingRef.current = false;
};
```

- [ ] **Step 4: Replace the Support button TouchableOpacity**

Replace the Support button block (lines 169-189) with:

```tsx
<TouchableOpacity
  style={[
    styles.actionButton,
    post.isLiked ? styles.supportButtonActive : styles.supportButtonDefault,
    disabled && styles.actionButtonDisabled,
  ]}
  onPress={handleSupportPress}
  accessibilityLabel={post.isLiked ? 'Remove support from this post' : 'Support this post'}
  accessibilityRole="button"
  activeOpacity={0.7}
>
  <Animated.View style={heartAnimatedStyle}>
    <HeartIcon filled={post.isLiked} />
  </Animated.View>
  <Text style={[
    styles.supportButtonText,
    post.isLiked && styles.supportButtonTextActive,
  ]}>
    {post.isLiked ? 'Supported' : 'Support'}
  </Text>
</TouchableOpacity>
```

- [ ] **Step 5: Add inline error display below the action row**

Immediately after the closing `</View>` of the `actionRow` (after line ~205), add:

```tsx
{/* Inline error for failed support toggle */}
{supportError && (
  <View style={styles.errorRow}>
    <Text style={styles.errorText}>{supportError}</Text>
  </View>
)}
```

- [ ] **Step 6: Update styles**

Remove `actionButtonActive` and `actionTextActive` styles (they are replaced by the new support-specific styles).

Update `actionButton` base style:

```typescript
actionButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  height: 36,
  borderRadius: Layout.borderRadius.md,
  backgroundColor: Colors.dewSageLight,
  minHeight: 48,  // Accessibility: 48px touch target
},
```

Add these new styles to the `StyleSheet.create` block:

```typescript
// Support Button — Default (unsupported)
supportButtonDefault: {
  backgroundColor: Colors.white,
  borderWidth: 1.5,
  borderColor: Colors.silverSage,
},
// Support Button — Active (supported)
supportButtonActive: {
  backgroundColor: Colors.dewSage,
  borderWidth: 1.5,
  borderColor: Colors.evergreenTeal,
},
// Support Button Text — Default
supportButtonText: {
  fontSize: 12.5,
  fontWeight: Typography.fontWeight.medium,
  color: Colors.softCharcoal,
  marginLeft: Spacing.sm,
},
// Support Button Text — Active
supportButtonTextActive: {
  fontWeight: Typography.fontWeight.semibold,
  color: Colors.evergreenTeal,
},
// Inline error row
errorRow: {
  paddingHorizontal: Spacing.base,
  paddingBottom: Spacing.sm,
},
errorText: {
  fontSize: Typography.fontSize.xs,
  color: Colors.softCoral,
},
```

- [ ] **Step 7: Verify TypeScript compiles and no errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 8: Commit**

```bash
git add mobile/src/components/community/PostCard.tsx
git commit -m "feat: implement support button toggle states with animation and inline errors"
```

---

### Task 5: Manual QA Checklist

This task is not code — it is a verification checklist to run through before considering the feature complete.

- [ ] **Step 1: Verify default load state** — Open community feed. Posts where you previously tapped Support should show the Supported state (filled teal heart, Dew Sage bg, "Supported" label). Other posts show default state.

- [ ] **Step 2: Verify tap to support** — Tap Support on an unsupported post. Button transitions to Supported state. Heart fills and briefly scales to 1.15x. Support count increments by 1. Transition feels calm (no bounce/spring).

- [ ] **Step 3: Verify tap to unsupport** — Tap Supported on a supported post. Button transitions back to default. Heart returns to outline. Count decrements by 1.

- [ ] **Step 4: Verify scroll persistence** — Support a post, scroll away, scroll back. Button retains Supported state.

- [ ] **Step 5: Verify both card types** — Test on a group post card (teal context bar) and a personal post card. Behavior is identical.

- [ ] **Step 6: Verify Comment button unchanged** — Comment button still has dewSageLight background, no border changes, no toggle state.

- [ ] **Step 7: Verify accessibility** — Enable screen reader. Tap Support. Verify "Supported" is announced. Tap again. Verify "Support removed" is announced. Verify accessible labels read "Support this post" / "Remove support from this post".

- [ ] **Step 8: Verify error handling** — Simulate API failure (e.g., airplane mode). Tap Support. Button and count should revert. Inline error in Soft Coral appears below actions: "Couldn't save that -- try again when you're ready." Error auto-dismisses after 3 seconds.

- [ ] **Step 9: Verify group detail screen** — Navigate to a group detail page. Support buttons on posts there should also show the correct toggle behavior and return to the correct state.
