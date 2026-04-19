# Dashboard Locked-State Prominence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the pre-checkin dashboard state visibly more "locked" by dropping card opacity to 0.35, adding an expo-blur overlay, and replacing the small gray hint with a prominent `LockedDivider` component containing a lock icon and rule lines.

**Architecture:** Presentational-only change on top of the existing `dashboardPhase` state machine. One new static component (`LockedDivider`). One new dependency (`expo-blur`). `DashboardScreen.tsx` is updated to animate both opacity and blur intensity via `react-native-reanimated`, with `BlurView` always mounted so intensity can animate smoothly.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, `react-native-reanimated` (already installed), `expo-blur` (new), `@testing-library/react-native` (Jest with `react-native` preset).

**Spec:** `docs/superpowers/specs/2026-04-18-dashboard-locked-state-prominence-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `mobile/package.json` | Modify | Add `expo-blur` dependency |
| `mobile/src/components/dashboard/LockedDivider.tsx` | Create | Static divider component with lock icon, label, and rule lines |
| `mobile/src/components/dashboard/__tests__/LockedDivider.test.tsx` | Create | Unit tests for the divider |
| `mobile/src/components/dashboard/index.ts` | Modify | Re-export `LockedDivider` |
| `mobile/src/screens/DashboardScreen.tsx` | Modify | Swap hint text for `LockedDivider`, add `BlurView` overlay, tighten opacity target, remove unused style |

No test file is added for `DashboardScreen` itself — `useDashboard` has too many dependencies to mock usefully in a focused PR. The divider has dedicated tests, and the integration is verified via the manual test plan in Task 5.

---

## Task 1: Install `expo-blur` dependency

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: Install the SDK 54-compatible version**

Run from the repo root:

```bash
cd mobile && npx expo install expo-blur
```

Expected: `expo-blur` added to `dependencies` at version `~14.0.x`. `package-lock.json` updated.

- [ ] **Step 2: Verify the install works**

Run from `mobile/`:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors related to missing `expo-blur` types.

- [ ] **Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore(mobile): add expo-blur for dashboard locked-state overlay"
```

---

## Task 2: Create `LockedDivider` component with failing test

**Files:**
- Create: `mobile/src/components/dashboard/__tests__/LockedDivider.test.tsx`
- Create: `mobile/src/components/dashboard/LockedDivider.tsx`

- [ ] **Step 1: Write the failing test file**

Create `mobile/src/components/dashboard/__tests__/LockedDivider.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { LockedDivider } from '../LockedDivider';

describe('LockedDivider', () => {
  it('renders the unlock label text', () => {
    const { getByText } = render(<LockedDivider />);
    expect(
      getByText('Check in to unlock your personalized dashboard')
    ).toBeTruthy();
  });

  it('exposes an accessibility label describing the locked state', () => {
    const { getByLabelText } = render(<LockedDivider />);
    expect(
      getByLabelText('Personalized dashboard is locked until you check in')
    ).toBeTruthy();
  });

  it('renders a lock icon by testID', () => {
    const { getByTestId } = render(<LockedDivider />);
    expect(getByTestId('locked-divider-icon')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `mobile/`:

```bash
npx jest src/components/dashboard/__tests__/LockedDivider.test.tsx --forceExit
```

Expected: FAIL with "Cannot find module '../LockedDivider'".

- [ ] **Step 3: Create the minimal `LockedDivider` component**

Create `mobile/src/components/dashboard/LockedDivider.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

export const LockedDivider: React.FC = () => {
  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel="Personalized dashboard is locked until you check in"
    >
      <View style={styles.rule} />
      <View style={styles.centerBlock}>
        <MaterialCommunityIcons
          testID="locked-divider-icon"
          name="lock-outline"
          size={16}
          color={Colors.evergreenTeal}
          style={styles.icon}
        />
        <Text style={styles.label} numberOfLines={1}>
          Check in to unlock your personalized dashboard
        </Text>
      </View>
      <View style={styles.rule} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  centerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `mobile/`:

```bash
npx jest src/components/dashboard/__tests__/LockedDivider.test.tsx --forceExit
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Run type check**

Run from `mobile/`:

```bash
npx tsc --noEmit
```

Expected: no new TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/dashboard/LockedDivider.tsx mobile/src/components/dashboard/__tests__/LockedDivider.test.tsx
git commit -m "feat(dashboard): add LockedDivider component for pre-checkin state"
```

---

## Task 3: Re-export `LockedDivider` from dashboard index

**Files:**
- Modify: `mobile/src/components/dashboard/index.ts`

- [ ] **Step 1: Add the named re-export**

Open `mobile/src/components/dashboard/index.ts` and add a new export line after the `DailyReflectionCard` line (line 28):

```ts
export { LockedDivider } from './LockedDivider';
```

The full section around that line should read:

```ts
export { BrainStateCheckin } from './BrainStateCheckin';
export { TodaysProtocolCard } from './TodaysProtocolCard';
export { DailyReflectionCard } from './DailyReflectionCard';
export { LockedDivider } from './LockedDivider';
```

Reason for using explicit named re-export: the Vara mobile codebase uses Metro 0.83 under SDK 54, which rejects `export *` in barrel files. This matches the existing pattern in this file.

- [ ] **Step 2: Verify the export resolves**

Run from `mobile/`:

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/dashboard/index.ts
git commit -m "feat(dashboard): export LockedDivider from barrel"
```

---

## Task 4: Integrate `LockedDivider` and blur into `DashboardScreen`

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

This is the largest task. Work through it step-by-step; each step is small. Do not commit until Step 8.

- [ ] **Step 1: Update imports**

Open `mobile/src/screens/DashboardScreen.tsx`.

Find the existing import of `react-native-reanimated` (around line 9):

```ts
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
```

Replace it with:

```ts
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
```

Then find the `BrainBrief` / `BrainStatusBar` import block (around lines 33–34) and add the `LockedDivider` import directly after it:

```ts
import { BrainBrief } from '../components/dashboard/BrainBrief';
import { BrainStatusBar } from '../components/dashboard/BrainStatusBar';
import { LockedDivider } from '../components/dashboard/LockedDivider';
```

Then, add the `BlurView` import near the top of the file, immediately after the `SafeAreaView` import (around line 11):

```ts
import { BlurView } from 'expo-blur';
```

- [ ] **Step 2: Create the `AnimatedBlurView` constant**

Right below the final import line and above `const DashboardScreen: React.FC = () => {` (around line 43), add:

```ts
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
```

- [ ] **Step 3: Replace the opacity shared value block with opacity + blur intensity**

Find this block (currently at lines ~114–125):

```ts
const cardOpacity = useSharedValue(dashboardPhase === 'pre-checkin' ? 0.5 : 1);

useEffect(() => {
  cardOpacity.value = withTiming(
    dashboardPhase === 'pre-checkin' ? 0.5 : 1,
    { duration: 400 }
  );
}, [dashboardPhase]);

const mutedStyle = useAnimatedStyle(() => ({
  opacity: cardOpacity.value,
}));

const isMuted = dashboardPhase === 'pre-checkin';
```

Replace it with:

```ts
const cardOpacity = useSharedValue(dashboardPhase === 'pre-checkin' ? 0.35 : 1);
const blurIntensity = useSharedValue(dashboardPhase === 'pre-checkin' ? 15 : 0);

useEffect(() => {
  cardOpacity.value = withTiming(
    dashboardPhase === 'pre-checkin' ? 0.35 : 1,
    { duration: 400 }
  );
  blurIntensity.value = withTiming(
    dashboardPhase === 'pre-checkin' ? 15 : 0,
    { duration: 400 }
  );
}, [dashboardPhase]);

const cardWrapperStyle = useAnimatedStyle(() => ({
  opacity: cardOpacity.value,
}));

const blurAnimatedProps = useAnimatedProps(() => ({
  intensity: blurIntensity.value,
}));

const isMuted = dashboardPhase === 'pre-checkin';
```

- [ ] **Step 4: Replace the pre-checkin hint with the LockedDivider**

Find this block (currently at lines ~283–288):

```tsx
{/* Pre-checkin hint */}
{dashboardPhase === 'pre-checkin' && (
  <Text style={styles.checkinHint}>
    Check in to unlock your personalized dashboard
  </Text>
)}
```

Replace it with:

```tsx
{/* Pre-checkin locked divider */}
{dashboardPhase === 'pre-checkin' && (
  <Animated.View
    entering={FadeIn.duration(200)}
    exiting={FadeOut.duration(200)}
  >
    <LockedDivider />
  </Animated.View>
)}
```

- [ ] **Step 5: Update the muted card wrapper to use renamed style and add BlurView overlay**

Find this block (currently at lines ~290–296):

```tsx
{/* Dashboard cards: muted in pre-checkin, ordered by brain state */}
<Animated.View
  style={[mutedStyle]}
  pointerEvents={isMuted ? 'none' : 'auto'}
>
  {cardOrder.map((cardId) => renderCard(cardId))}
</Animated.View>
```

Replace it with:

```tsx
{/* Dashboard cards: muted + blurred in pre-checkin, ordered by brain state */}
<Animated.View
  style={[cardWrapperStyle]}
  pointerEvents={isMuted ? 'none' : 'auto'}
>
  {cardOrder.map((cardId) => renderCard(cardId))}
  <AnimatedBlurView
    animatedProps={blurAnimatedProps}
    tint="light"
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
  />
</Animated.View>
```

Notes:
- `BlurView` is the last child so it sits on top of the cards in z-order.
- `pointerEvents="none"` on the `BlurView` prevents it from stealing touches (the outer `Animated.View` already has `pointerEvents="none"` when muted, but this is belt-and-suspenders).
- Keeping the `BlurView` mounted with `intensity: 0` in non-pre-checkin phases avoids a flicker on transition. Empirically `expo-blur` renders as a no-op at intensity 0.

- [ ] **Step 6: Remove the now-unused `checkinHint` style**

Find this style block in the `StyleSheet.create(...)` call (currently at lines ~493–499):

```ts
  checkinHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.base,
    fontStyle: 'italic',
  },
```

Delete it entirely.

- [ ] **Step 7: Run type check and lint**

Run from `mobile/`:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors. In particular, `useAnimatedProps` and `FadeIn`/`FadeOut` should resolve from `react-native-reanimated`, and `BlurView`'s props should accept `intensity` via `animatedProps`.

If there's a type complaint about `animatedProps` on `AnimatedBlurView`, it's because `BlurView`'s `intensity` prop is typed `number`, which is fine for `useAnimatedProps`. No workaround needed unless TypeScript explicitly complains — if it does, cast with `as any` on the `animatedProps` object and leave a comment referring to `expo-blur` issue tracking.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "feat(dashboard): strengthen pre-checkin locked state with blur and divider"
```

---

## Task 5: Manual verification

**Files:** none (manual QA).

- [ ] **Step 1: Start the dev server**

Run from `mobile/`:

```bash
npx expo start
```

- [ ] **Step 2: Launch the app on a simulator or device and sign in with an account that has no brain check-in for today**

If your dev account has already checked in, either use a different account or delete the latest `brainStateCheckIns/{userId}_{YYYY-MM-DD}` doc via the Firebase console before logging in.

Expected in `pre-checkin` phase:
- The `BrainStateCheckin` card is at full opacity and fully interactive.
- Below it, a prominent horizontal-rule divider reads "🔒 Check in to unlock your personalized dashboard" with visible rule lines on either side. The text is NOT italic and NOT gray — it should read as primary text.
- Below the divider, the dashboard cards are visibly dimmed (~35% opacity) AND visibly blurred. You should not be able to read fine card content clearly.
- Tapping on any muted card does nothing (no highlight, no navigation).

- [ ] **Step 3: Tap a brain-state option to complete the check-in**

Expected transition:
- The divider fades out over ~200ms.
- The cards smoothly animate from 0.35 → 1 opacity and the blur fades from 15 → 0 over ~400ms.
- No flicker, no visual pop.
- After the animation, cards are fully interactive.

- [ ] **Step 4: Pull-to-refresh while still in `pre-checkin`**

Force the app back into `pre-checkin` (delete today's check-in doc if needed, then relaunch).

Expected: after refresh, the locked state is maintained. No flicker on the `BlurView`. Opacity stays at 0.35.

- [ ] **Step 5: Accessibility check (iOS VoiceOver or Android TalkBack)**

With VoiceOver/TalkBack enabled:
- The divider is announced as "Personalized dashboard is locked until you check in".
- Muted cards are not focusable (pointerEvents: none prevents accessibility focus).

- [ ] **Step 6: Low-end Android check (optional but recommended)**

If a low-end Android device is available, verify the phase transition does not drop frames significantly. `expo-blur` uses `dimezisBlurView` on Android and can be expensive at high intensities; intensity 15 is modest and should perform acceptably, but confirm.

- [ ] **Step 7: If anything fails, document and fix**

If a behavior above doesn't match expectations, add a note to the PR description and return to Task 4 to adjust. Do not commit a partial fix — instead, finish debugging and create a focused follow-up commit.

---

## Self-Review

**Spec coverage:**
- Opacity 0.5 → 0.35 — ✅ Task 4 Step 3
- Blur intensity 15 via expo-blur — ✅ Task 1 (install) + Task 4 Step 5 (overlay)
- LockedDivider with lock icon, rule lines, and prominent text — ✅ Task 2
- Drop italic + gray, use `textPrimary` + medium weight + `fontSize.base` — ✅ Task 2 Step 3
- Animate opacity + blur over 400ms on phase flip — ✅ Task 4 Step 3
- Divider FadeIn/FadeOut 200ms — ✅ Task 4 Step 4
- Accessibility label on divider — ✅ Task 2 Step 3 (verified in Task 2 Step 1 test)
- Remove `styles.checkinHint` — ✅ Task 4 Step 6
- Export LockedDivider from barrel — ✅ Task 3
- Unit tests for LockedDivider — ✅ Task 2
- Manual test plan executed — ✅ Task 5

**Placeholder scan:** No TBDs, no "implement later", no "similar to Task N" shortcuts. Every code-changing step has the full code.

**Type consistency:**
- `LockedDivider` exported as named export in Task 2, imported as named in Task 3 and Task 4 — ✅
- `cardWrapperStyle` renamed from `mutedStyle` consistently in Task 4 Step 3 and Step 5 — ✅
- `blurAnimatedProps` defined in Task 4 Step 3, consumed in Task 4 Step 5 — ✅
- `AnimatedBlurView` defined in Task 4 Step 2, consumed in Task 4 Step 5 — ✅
- `FadeIn`, `FadeOut` imported in Task 4 Step 1, consumed in Task 4 Step 4 — ✅
- `useAnimatedProps` imported in Task 4 Step 1, consumed in Task 4 Step 3 — ✅
