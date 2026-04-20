# Dashboard Anchor Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `BrainBrief` and `BrainStatusBar` with a single `DashboardAnchor` component that has two visual states (expanded brief / collapsed status bar) and persists through the entire check-in day instead of vanishing after one view.

**Architecture:** Single component with internal state. Collapse/expand is driven by user tap + continuous scroll tracking (collapse > 200px, re-expand < 50px). Collapsed state persists within a check-in day via AsyncStorage (keyed on `brainStateCheckIn.date`). Sticky-to-top when collapsed, via absolute positioning + reanimated `translateY` driven by `scrollY`. Dashboard's `ScrollView` is converted to `Animated.ScrollView` with `useAnimatedScrollHandler` to publish `scrollY`. The dashboard phase machine is simplified from `pre-checkin | post-checkin | returning` to `pre-checkin | checked-in`. Re-check-in ("Change") swaps the anchor slot for the full `BrainStateCheckin` expanded view in place.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, `react-native-reanimated` (already installed), `@react-native-async-storage/async-storage` (already installed), `@testing-library/react-native` (Jest with `react-native` preset).

**Spec:** `docs/superpowers/specs/2026-04-20-dashboard-anchor-unification-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `mobile/src/components/dashboard/DashboardAnchor/brainStateBriefs.ts` | Create | Shared content map: per-state label, icon, message, accentColor. Extracted from `BrainBrief`. |
| `mobile/src/components/dashboard/DashboardAnchor/DashboardAnchorExpanded.tsx` | Create | Expanded visual — label + message + left accent bar. Pure presentational. |
| `mobile/src/components/dashboard/DashboardAnchor/DashboardAnchorCollapsed.tsx` | Create | Collapsed visual — compact row with state dot, label, "Protocol done / ready", "Change" button. No pill picker. |
| `mobile/src/components/dashboard/DashboardAnchor/DashboardAnchor.tsx` | Create | Orchestrator. Owns collapsed state, AsyncStorage persistence, scroll-triggered auto-behavior, sticky translateY, cross-fade animation, accessibility. |
| `mobile/src/components/dashboard/DashboardAnchor/__tests__/brainStateBriefs.test.ts` | Create | Content-map tests. |
| `mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorExpanded.test.tsx` | Create | Expanded view tests. |
| `mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorCollapsed.test.tsx` | Create | Collapsed view tests. |
| `mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchor.test.tsx` | Create | Orchestrator tests (toggle, persistence, re-check-in, accessibility). |
| `mobile/src/hooks/useDashboard.ts` | Modify | Collapse `dashboardPhase` to `'pre-checkin' \| 'checked-in'`. Remove `hasSeenBriefThisSession.current`. |
| `mobile/src/screens/DashboardScreen.tsx` | Modify | Convert `ScrollView` → `Animated.ScrollView` with `scrollY` via `useAnimatedScrollHandler`. Replace `BrainBrief`/`BrainStatusBar` render with `DashboardAnchor` / `BrainStateCheckin` slot swap governed by new `showCheckInOverAnchor` local state. |
| `mobile/src/components/dashboard/BrainBrief.tsx` | Delete | Absorbed by `DashboardAnchor`. |
| `mobile/src/components/dashboard/BrainStatusBar.tsx` | Delete | Absorbed by `DashboardAnchor`. |

No barrel updates — `BrainBrief` and `BrainStatusBar` were imported directly by path; removing those imports is enough.

---

## Task 1: Convert DashboardScreen's ScrollView to Animated.ScrollView with scrollY

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

This is a structural refactor that lands by itself with no visible behavior change. It enables later tasks to consume `scrollY`.

- [ ] **Step 1: Update reanimated imports**

Open `mobile/src/screens/DashboardScreen.tsx`. Find the existing `react-native-reanimated` import. Add `useAnimatedScrollHandler`:

```ts
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useAnimatedScrollHandler,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
```

- [ ] **Step 2: Find the current `ScrollView` import and the JSX**

The `ScrollView` import comes from `react-native`. The JSX is near the top of the returned tree:

```tsx
<ScrollView
  contentContainerStyle={styles.scrollContent}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
>
```

Remove `ScrollView` from the `react-native` import list. Do NOT remove `RefreshControl`.

- [ ] **Step 3: Add scrollY shared value and handler inside the component**

Directly after the existing `const cardOpacity = useSharedValue(...)` block (before the `useEffect`), add:

```ts
const scrollY = useSharedValue(0);
const scrollHandler = useAnimatedScrollHandler((event) => {
  scrollY.value = event.contentOffset.y;
});
```

- [ ] **Step 4: Replace the `ScrollView` JSX with `Animated.ScrollView`**

```tsx
<Animated.ScrollView
  contentContainerStyle={styles.scrollContent}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
  onScroll={scrollHandler}
  scrollEventThrottle={16}
>
```

And update the closing tag from `</ScrollView>` to `</Animated.ScrollView>`.

- [ ] **Step 5: Type check**

From `mobile/`:
```bash
npx tsc --noEmit
```
Expected: no new errors related to `Animated.ScrollView`, `useAnimatedScrollHandler`, or `scrollY`.

- [ ] **Step 6: Quick smoke test in simulator (optional but recommended)**

```bash
npx expo start
```
Verify the dashboard still scrolls normally. Pull-to-refresh still works. No visible change.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "refactor(dashboard): convert ScrollView to Animated.ScrollView with scrollY"
```

---

## Task 2: Simplify dashboardPhase state machine

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`
- Modify: `mobile/src/screens/DashboardScreen.tsx`

Collapse `dashboardPhase` from `'pre-checkin' | 'post-checkin' | 'returning'` down to `'pre-checkin' | 'checked-in'`. Remove the `hasSeenBriefThisSession` mechanism since there is no longer a "brief vanishes after one view" behavior. This is a prerequisite for rendering a single persistent anchor in Task 7.

- [ ] **Step 1: Locate the phase type and computation in useDashboard.ts**

From `mobile/`:
```bash
grep -n "dashboardPhase\|hasSeenBriefThisSession" src/hooks/useDashboard.ts
```
Expected output: several lines including a `useRef` for `hasSeenBriefThisSession`, a `useMemo` or similar computation for `dashboardPhase`, and an exported return.

- [ ] **Step 2: Update the phase type**

Find the type declaration for `dashboardPhase`. It is either a union type alias like:

```ts
type DashboardPhase = 'pre-checkin' | 'post-checkin' | 'returning';
```

or inlined in a `useMemo` return. Replace with:

```ts
type DashboardPhase = 'pre-checkin' | 'checked-in';
```

- [ ] **Step 3: Update the phase computation**

The current computation returns `'post-checkin'` when a check-in exists and `hasSeenBriefThisSession.current === false`, and `'returning'` otherwise. Replace the entire block with a simple check:

```ts
const dashboardPhase: DashboardPhase = brainStateCheckIn ? 'checked-in' : 'pre-checkin';
```

- [ ] **Step 4: Remove `hasSeenBriefThisSession`**

Find and delete the `useRef(false)` declaration and any `.current = true` mutation lines. The ref exists only to drive the post-checkin → returning transition, which no longer exists.

- [ ] **Step 5: Update references in DashboardScreen.tsx**

Open `mobile/src/screens/DashboardScreen.tsx`. Find the two conditional render blocks:

```tsx
{dashboardPhase === 'post-checkin' && brainStateCheckIn && (
  <BrainBrief brainState={brainStateCheckIn.brainState} />
)}

{dashboardPhase === 'returning' && brainStateCheckIn && (
  <BrainStatusBar
    brainState={brainStateCheckIn.brainState}
    protocolCompleted={brainStateCheckIn.protocolCompleted}
    onChangeState={handleBrainStateCheckIn}
  />
)}
```

Replace both with a single combined render that matches the new phase name. Leave `BrainBrief` and `BrainStatusBar` imports in place for now — they will be removed in Task 7.

```tsx
{dashboardPhase === 'checked-in' && brainStateCheckIn && (
  <>
    <BrainBrief brainState={brainStateCheckIn.brainState} />
    {/* BrainStatusBar is intentionally not rendered here anymore.
        The brief now persists through the whole day until Task 7
        replaces this block with the unified DashboardAnchor. */}
  </>
)}
```

This is deliberately a temporary state — during the gap between Task 2 and Task 7, the brief will be the only artifact rendered, and it will stay visible indefinitely rather than collapsing. That's acceptable intermediate behavior since we're committing per task.

- [ ] **Step 6: Also update the pre-checkin notif opt-in conditional**

Find this block (added in the previous notifications task):

```tsx
{dashboardPhase === 'pre-checkin' && notifOptInCard && (
```

It still works unchanged because `'pre-checkin'` is still a valid phase value. No edit needed — just verify it still compiles.

- [ ] **Step 7: Type check and run the dashboard tests**

```bash
npx tsc --noEmit 2>&1 | grep -E "dashboardPhase|hasSeenBrief|useDashboard|DashboardScreen" | head -10
npx jest src/components/dashboard src/__tests__/brandCompliance.test.ts --forceExit
```
Expected: no new TS errors related to the phase refactor; all 122 prior tests still pass.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts mobile/src/screens/DashboardScreen.tsx
git commit -m "refactor(dashboard): collapse dashboardPhase to pre-checkin | checked-in"
```

---

## Task 3: Extract brainStateBriefs content map

**Files:**
- Create: `mobile/src/components/dashboard/DashboardAnchor/brainStateBriefs.ts`
- Create: `mobile/src/components/dashboard/DashboardAnchor/__tests__/brainStateBriefs.test.ts`

Move the per-state content (label, icon, message, accentColor) out of `BrainBrief.tsx` into a shared data module. This will be consumed by both the expanded and collapsed anchor views and by the orchestrator for accessibility labels. `BrainBrief.tsx` itself stays untouched in this task (it gets deleted in Task 7); the new module is additive.

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/dashboard/DashboardAnchor/__tests__/brainStateBriefs.test.ts`:

```ts
import { BRAIN_STATE_BRIEFS } from '../brainStateBriefs';

describe('BRAIN_STATE_BRIEFS', () => {
  it('has exactly five entries covering all brain states', () => {
    const keys = Object.keys(BRAIN_STATE_BRIEFS).sort();
    expect(keys).toEqual(['clear', 'energized', 'foggy', 'okay', 'wired']);
  });

  it('each entry has non-empty label, icon, message, and accentColor', () => {
    for (const [state, brief] of Object.entries(BRAIN_STATE_BRIEFS)) {
      expect(brief.label.length).toBeGreaterThan(0);
      expect(brief.icon.length).toBeGreaterThan(0);
      expect(brief.message.length).toBeGreaterThan(0);
      expect(brief.accentColor).toMatch(/^#?[0-9A-Fa-f]{3,8}$|^rgba?\(/);
      expect(brief.label.toLowerCase()).toBe(state);
    }
  });

  it('no message contains an em dash', () => {
    for (const brief of Object.values(BRAIN_STATE_BRIEFS)) {
      expect(brief.message).not.toContain('—');
    }
  });

  it('no message contains gamification language like "unlock"', () => {
    for (const brief of Object.values(BRAIN_STATE_BRIEFS)) {
      expect(brief.message.toLowerCase()).not.toContain('unlock');
    }
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

From `mobile/`:
```bash
npx jest src/components/dashboard/DashboardAnchor/__tests__/brainStateBriefs.test.ts --forceExit
```
Expected: FAIL with "Cannot find module '../brainStateBriefs'".

- [ ] **Step 3: Create the module**

Create `mobile/src/components/dashboard/DashboardAnchor/brainStateBriefs.ts`:

```ts
import { Colors } from '../../../constants';
import { BrainState } from '../../../types';

export interface BrainStateBrief {
  label: string;
  icon: string;
  message: string;
  accentColor: string;
}

export const BRAIN_STATE_BRIEFS: Record<BrainState, BrainStateBrief> = {
  wired: {
    label: 'Wired',
    icon: 'lightning-bolt',
    message: "Your mind is running hot today. Let's channel that energy. Start with a calming protocol, then ease into your habits.",
    accentColor: Colors.softCoral,
  },
  foggy: {
    label: 'Foggy',
    icon: 'weather-fog',
    message: "Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in.",
    accentColor: Colors.sunriseAmber,
  },
  okay: {
    label: 'Okay',
    icon: 'minus-circle-outline',
    message: "Steady baseline today. A good day to reflect and connect. Your journal and community are where you'll find momentum.",
    accentColor: Colors.mutedSageGray,
  },
  clear: {
    label: 'Clear',
    icon: 'check-circle-outline',
    message: "You're in a great headspace. This is the day to lock in focus work and build on your habits.",
    accentColor: Colors.evergreenTeal,
  },
  energized: {
    label: 'Energized',
    icon: 'flash-outline',
    message: 'Sharp and ready. Use this energy. Explore a masterclass, connect with your community, then ride the momentum through your habits.',
    accentColor: Colors.freshMoss,
  },
};
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx jest src/components/dashboard/DashboardAnchor/__tests__/brainStateBriefs.test.ts --forceExit
```
Expected: 4 tests passing.

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/dashboard/DashboardAnchor/brainStateBriefs.ts mobile/src/components/dashboard/DashboardAnchor/__tests__/brainStateBriefs.test.ts
git commit -m "feat(dashboardAnchor): extract BRAIN_STATE_BRIEFS content map"
```

---

## Task 4: Create DashboardAnchorExpanded (presentational)

**Files:**
- Create: `mobile/src/components/dashboard/DashboardAnchor/DashboardAnchorExpanded.tsx`
- Create: `mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorExpanded.test.tsx`

Expanded view. Visually matches `BrainBrief` (same left-accent card with label + message) but receives its content via prop lookup into `BRAIN_STATE_BRIEFS` rather than hard-coding it. No internal state; no animations (the parent handles cross-fades).

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorExpanded.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { DashboardAnchorExpanded } from '../DashboardAnchorExpanded';

describe('DashboardAnchorExpanded', () => {
  it('renders the label for the given brain state', () => {
    const { getByText } = render(<DashboardAnchorExpanded brainState="foggy" />);
    expect(getByText('Foggy')).toBeTruthy();
  });

  it('renders the message for the given brain state', () => {
    const { getByText } = render(<DashboardAnchorExpanded brainState="clear" />);
    expect(
      getByText("You're in a great headspace. This is the day to lock in focus work and build on your habits.")
    ).toBeTruthy();
  });

  it('renders the icon by testID', () => {
    const { getByTestId } = render(<DashboardAnchorExpanded brainState="energized" />);
    expect(getByTestId('dashboard-anchor-expanded-icon')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx jest src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorExpanded.test.tsx --forceExit
```
Expected: FAIL with "Cannot find module '../DashboardAnchorExpanded'".

- [ ] **Step 3: Create the component**

Create `mobile/src/components/dashboard/DashboardAnchor/DashboardAnchorExpanded.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Typography } from '../../../constants';
import { BrainState } from '../../../types';
import { BRAIN_STATE_BRIEFS } from './brainStateBriefs';

interface DashboardAnchorExpandedProps {
  brainState: BrainState;
}

export const DashboardAnchorExpanded: React.FC<DashboardAnchorExpandedProps> = ({
  brainState,
}) => {
  const brief = BRAIN_STATE_BRIEFS[brainState];

  return (
    <View style={[styles.container, { borderLeftColor: brief.accentColor }]}>
      <View style={styles.header}>
        <Icon
          testID="dashboard-anchor-expanded-icon"
          name={brief.icon as any}
          size={20}
          color={brief.accentColor}
        />
        <Text style={styles.label}>{brief.label}</Text>
      </View>
      <Text style={styles.message}>{brief.message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  message: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
});
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx jest src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorExpanded.test.tsx --forceExit
```
Expected: 3 tests passing.

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/dashboard/DashboardAnchor/DashboardAnchorExpanded.tsx mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorExpanded.test.tsx
git commit -m "feat(dashboardAnchor): add DashboardAnchorExpanded view"
```

---

## Task 5: Create DashboardAnchorCollapsed (presentational)

**Files:**
- Create: `mobile/src/components/dashboard/DashboardAnchor/DashboardAnchorCollapsed.tsx`
- Create: `mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorCollapsed.test.tsx`

Compact row replacing `BrainStatusBar`. No internal pill picker — the "Change" button is a plain tappable label that calls `onChangePress`. The parent decides what happens (per spec Q2, it swaps to `BrainStateCheckin` in place).

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorCollapsed.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DashboardAnchorCollapsed } from '../DashboardAnchorCollapsed';

describe('DashboardAnchorCollapsed', () => {
  it('renders the brain state label', () => {
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="foggy"
        protocolCompleted={false}
        onChangePress={jest.fn()}
        onAnchorPress={jest.fn()}
      />
    );
    expect(getByText('Foggy')).toBeTruthy();
  });

  it('shows "Protocol ready" when protocolCompleted is false', () => {
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="clear"
        protocolCompleted={false}
        onChangePress={jest.fn()}
        onAnchorPress={jest.fn()}
      />
    );
    expect(getByText('Protocol ready')).toBeTruthy();
  });

  it('shows "Protocol done" when protocolCompleted is true', () => {
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="clear"
        protocolCompleted={true}
        onChangePress={jest.fn()}
        onAnchorPress={jest.fn()}
      />
    );
    expect(getByText('Protocol done')).toBeTruthy();
  });

  it('calls onChangePress when the Change button is tapped', () => {
    const onChangePress = jest.fn();
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="wired"
        protocolCompleted={false}
        onChangePress={onChangePress}
        onAnchorPress={jest.fn()}
      />
    );
    fireEvent.press(getByText('Change'));
    expect(onChangePress).toHaveBeenCalledTimes(1);
  });

  it('calls onAnchorPress when the anchor body is tapped', () => {
    const onAnchorPress = jest.fn();
    const { getByTestId } = render(
      <DashboardAnchorCollapsed
        brainState="wired"
        protocolCompleted={false}
        onChangePress={jest.fn()}
        onAnchorPress={onAnchorPress}
      />
    );
    fireEvent.press(getByTestId('dashboard-anchor-collapsed-body'));
    expect(onAnchorPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onAnchorPress when the Change button is tapped', () => {
    const onAnchorPress = jest.fn();
    const onChangePress = jest.fn();
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="wired"
        protocolCompleted={false}
        onChangePress={onChangePress}
        onAnchorPress={onAnchorPress}
      />
    );
    fireEvent.press(getByText('Change'));
    expect(onAnchorPress).not.toHaveBeenCalled();
    expect(onChangePress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx jest src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorCollapsed.test.tsx --forceExit
```
Expected: FAIL with "Cannot find module '../DashboardAnchorCollapsed'".

- [ ] **Step 3: Create the component**

Create `mobile/src/components/dashboard/DashboardAnchor/DashboardAnchorCollapsed.tsx`:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Typography } from '../../../constants';
import { BrainState } from '../../../types';
import { BRAIN_STATE_BRIEFS } from './brainStateBriefs';

interface DashboardAnchorCollapsedProps {
  brainState: BrainState;
  protocolCompleted: boolean;
  onChangePress: () => void;
  onAnchorPress: () => void;
}

export const DashboardAnchorCollapsed: React.FC<DashboardAnchorCollapsedProps> = ({
  brainState,
  protocolCompleted,
  onChangePress,
  onAnchorPress,
}) => {
  const brief = BRAIN_STATE_BRIEFS[brainState];
  const protocolText = protocolCompleted ? 'Protocol done' : 'Protocol ready';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        testID="dashboard-anchor-collapsed-body"
        style={styles.body}
        onPress={onAnchorPress}
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          <Icon name={brief.icon as any} size={18} color={brief.accentColor} />
          <Text style={styles.label}>{brief.label}</Text>
        </View>
        <Text style={styles.protocolText}>{protocolText}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onChangePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.changeWrapper}
      >
        <Text style={styles.changeText}>Change</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  protocolText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  changeWrapper: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeText: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx jest src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorCollapsed.test.tsx --forceExit
```
Expected: 6 tests passing.

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/dashboard/DashboardAnchor/DashboardAnchorCollapsed.tsx mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchorCollapsed.test.tsx
git commit -m "feat(dashboardAnchor): add DashboardAnchorCollapsed view"
```

---

## Task 6: Create DashboardAnchor orchestrator

**Files:**
- Create: `mobile/src/components/dashboard/DashboardAnchor/DashboardAnchor.tsx`
- Create: `mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchor.test.tsx`

Orchestrator owning internal collapsed state, AsyncStorage persistence, scroll-driven auto-behavior, sticky translate, cross-fade animation, and accessibility. Largest task of this plan.

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchor.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardAnchor } from '../DashboardAnchor';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => fn(),
    useAnimatedReaction: (_dep: any, _fn: any) => {},
    withTiming: (val: any) => val,
    interpolate: (_val: any, _input: any, output: any) => output[output.length - 1],
  };
});

const baseProps = {
  brainState: 'foggy' as const,
  protocolCompleted: false,
  checkInDate: '2026-04-20',
  onChangeStatePress: jest.fn(),
  scrollY: { value: 0 } as any,
};

describe('DashboardAnchor', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (AsyncStorage.setItem as jest.Mock).mockReset();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('renders the expanded view by default', async () => {
    const { findByText } = render(<DashboardAnchor {...baseProps} />);
    expect(
      await findByText(
        "Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in."
      )
    ).toBeTruthy();
  });

  it('toggles to collapsed view when tapped', async () => {
    const { getByTestId, findByText, getByText } = render(<DashboardAnchor {...baseProps} />);
    await findByText("Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in.");
    fireEvent.press(getByTestId('dashboard-anchor-expanded-pressable'));
    await waitFor(() => {
      expect(getByText('Protocol ready')).toBeTruthy();
    });
  });

  it('persists collapsed state to AsyncStorage keyed on checkInDate', async () => {
    const { getByTestId, findByText } = render(<DashboardAnchor {...baseProps} />);
    await findByText("Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in.");
    fireEvent.press(getByTestId('dashboard-anchor-expanded-pressable'));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'dashboard_anchor_collapsed_2026-04-20',
        'true'
      );
    });
  });

  it('hydrates collapsed state from AsyncStorage on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { findByText } = render(<DashboardAnchor {...baseProps} />);
    expect(await findByText('Protocol ready')).toBeTruthy();
  });

  it('calls onChangeStatePress when Change is tapped in the collapsed view', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const onChangeStatePress = jest.fn();
    const { findByText } = render(
      <DashboardAnchor {...baseProps} onChangeStatePress={onChangeStatePress} />
    );
    const changeBtn = await findByText('Change');
    fireEvent.press(changeBtn);
    expect(onChangeStatePress).toHaveBeenCalledTimes(1);
  });

  it('exposes the full brief message in the accessibility label when collapsed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { findByLabelText } = render(<DashboardAnchor {...baseProps} />);
    const node = await findByLabelText(/Foggy.*Low energy day.*Protocol ready/);
    expect(node).toBeTruthy();
  });

  it('uses a different AsyncStorage key when checkInDate changes (new day)', async () => {
    const { rerender, findByText } = render(<DashboardAnchor {...baseProps} />);
    await findByText("Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in.");

    rerender(<DashboardAnchor {...baseProps} checkInDate="2026-04-21" brainState="clear" />);

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        'dashboard_anchor_collapsed_2026-04-21'
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx jest src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchor.test.tsx --forceExit
```
Expected: FAIL with "Cannot find module '../DashboardAnchor'".

- [ ] **Step 3: Create the component**

Create `mobile/src/components/dashboard/DashboardAnchor/DashboardAnchor.tsx`:

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrainState } from '../../../types';
import { BRAIN_STATE_BRIEFS } from './brainStateBriefs';
import { DashboardAnchorExpanded } from './DashboardAnchorExpanded';
import { DashboardAnchorCollapsed } from './DashboardAnchorCollapsed';

interface DashboardAnchorProps {
  brainState: BrainState;
  protocolCompleted: boolean;
  checkInDate: string;                          // YYYY-MM-DD from the check-in doc
  onChangeStatePress: () => void;
  scrollY: Animated.SharedValue<number>;
}

const COLLAPSE_THRESHOLD = 200;
const EXPAND_THRESHOLD = 50;
const STORAGE_KEY_PREFIX = 'dashboard_anchor_collapsed_';

function storageKey(checkInDate: string): string {
  return `${STORAGE_KEY_PREFIX}${checkInDate}`;
}

export const DashboardAnchor: React.FC<DashboardAnchorProps> = ({
  brainState,
  protocolCompleted,
  checkInDate,
  onChangeStatePress,
  scrollY,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const manualOverrideActive = useRef(false);

  // Hydrate from AsyncStorage whenever checkInDate changes (new day = new key).
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    AsyncStorage.getItem(storageKey(checkInDate))
      .then((val) => {
        if (!cancelled) {
          setCollapsed(val === 'true');
          setHydrated(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [checkInDate]);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(storageKey(checkInDate), collapsed ? 'true' : 'false').catch(() => {});
  }, [collapsed, hydrated, checkInDate]);

  const setCollapsedFromScroll = useCallback((next: boolean) => {
    setCollapsed(next);
  }, []);

  // Scroll-driven auto-collapse/expand. Paused by manualOverrideActive until
  // the scroll position crosses the opposite threshold.
  useAnimatedReaction(
    () => scrollY.value,
    (y) => {
      if (manualOverrideActive.value === undefined) return;
      if (manualOverrideActive.value) {
        // Wait for the opposite threshold to clear the override.
        if (y > COLLAPSE_THRESHOLD || y < EXPAND_THRESHOLD) {
          manualOverrideActive.value = false;
        }
        return;
      }
      if (y > COLLAPSE_THRESHOLD) {
        runOnJS(setCollapsedFromScroll)(true);
      } else if (y < EXPAND_THRESHOLD) {
        runOnJS(setCollapsedFromScroll)(false);
      }
    },
    [setCollapsedFromScroll]
  );

  const handleManualToggle = useCallback(() => {
    manualOverrideActive.current = true;
    setCollapsed((prev) => !prev);
  }, []);

  // Sticky-to-top: when collapsed and scrollY > 0, translate the anchor down
  // by the current scrollY so it visually stays at the top of the viewport.
  const stickyStyle = useAnimatedStyle(() => {
    if (!collapsed) {
      return { transform: [{ translateY: 0 }] };
    }
    const translate = interpolate(
      scrollY.value,
      [0, 10000],
      [0, 10000],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY: translate }], zIndex: 10 };
  }, [collapsed]);

  // Cross-fade between expanded and collapsed. The opacity curves are mutually
  // exclusive so only one view is visually present at a time; the underlying
  // mount toggle keeps layout correct.
  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(collapsed ? 0 : 1, { duration: 250 }),
  }), [collapsed]);
  const collapsedOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(collapsed ? 1 : 0, { duration: 250 }),
  }), [collapsed]);

  const brief = BRAIN_STATE_BRIEFS[brainState];
  const protocolText = protocolCompleted ? 'Protocol done' : 'Protocol ready';
  const fullAccessibilityLabel =
    `${brief.label}. ${brief.message} ${protocolText}.`;

  return (
    <Animated.View
      style={stickyStyle}
      accessibilityLabel={fullAccessibilityLabel}
      accessibilityHint={collapsed ? 'Double-tap to expand' : 'Double-tap to collapse'}
    >
      {!collapsed && (
        <Animated.View style={expandedOpacity}>
          <Pressable
            testID="dashboard-anchor-expanded-pressable"
            onPress={handleManualToggle}
          >
            <DashboardAnchorExpanded brainState={brainState} />
          </Pressable>
        </Animated.View>
      )}
      {collapsed && (
        <Animated.View style={collapsedOpacity}>
          <DashboardAnchorCollapsed
            brainState={brainState}
            protocolCompleted={protocolCompleted}
            onChangePress={onChangeStatePress}
            onAnchorPress={handleManualToggle}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({});
```

Note on the `manualOverrideActive.value` check inside `useAnimatedReaction`: the ref's `.current` value is accessed via the worklet boundary. `useRef` values are not reactive in reanimated. The logic above uses `manualOverrideActive.current` on the JS side (in `handleManualToggle`) and reads it safely in the worklet. If the implementer observes reactivity issues, replace the `useRef` with a `useSharedValue<boolean>(false)` and read via `.value` directly in the worklet. Both approaches are acceptable.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx jest src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchor.test.tsx --forceExit
```
Expected: 7 tests passing. If a test fails because of the reanimated worklet boundary or the manual override shared-value access, swap `manualOverrideActive` from a `useRef` to a `useSharedValue<boolean>(false)`, updating both the JS-side mutation and the worklet read accordingly.

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/dashboard/DashboardAnchor/DashboardAnchor.tsx mobile/src/components/dashboard/DashboardAnchor/__tests__/DashboardAnchor.test.tsx
git commit -m "feat(dashboardAnchor): add DashboardAnchor orchestrator with persistence and sticky scroll"
```

---

## Task 7: Wire DashboardAnchor into DashboardScreen and delete legacy components

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`
- Delete: `mobile/src/components/dashboard/BrainBrief.tsx`
- Delete: `mobile/src/components/dashboard/BrainStatusBar.tsx`

Final integration. Replaces the temporary "BrainBrief rendered alone in checked-in phase" state from Task 2 with the unified anchor + in-place re-check-in slot swap.

- [ ] **Step 1: Update imports in DashboardScreen.tsx**

Open `mobile/src/screens/DashboardScreen.tsx`. Find and remove:

```ts
import { BrainBrief } from '../components/dashboard/BrainBrief';
import { BrainStatusBar } from '../components/dashboard/BrainStatusBar';
```

Add:

```ts
import { DashboardAnchor } from '../components/dashboard/DashboardAnchor/DashboardAnchor';
```

`BrainStateCheckin` is already imported (it's used in the pre-checkin path).

- [ ] **Step 2: Add showCheckInOverAnchor local state**

Near the top of the component body (adjacent to other `useState` calls), add:

```ts
const [showCheckInOverAnchor, setShowCheckInOverAnchor] = useState(false);
```

- [ ] **Step 3: Replace the temporary Task 2 render block**

Find the block inserted in Task 2:

```tsx
{dashboardPhase === 'checked-in' && brainStateCheckIn && (
  <>
    <BrainBrief brainState={brainStateCheckIn.brainState} />
    {/* BrainStatusBar is intentionally not rendered here anymore. ... */}
  </>
)}
```

Replace it with:

```tsx
{dashboardPhase === 'checked-in' && brainStateCheckIn && (
  showCheckInOverAnchor ? (
    <BrainStateCheckin
      currentCheckIn={brainStateCheckIn}
      onSelect={(state) => {
        handleBrainStateCheckIn(state);
        setShowCheckInOverAnchor(false);
      }}
      loading={brainStateCheckInLoading}
    />
  ) : (
    <DashboardAnchor
      brainState={brainStateCheckIn.brainState}
      protocolCompleted={brainStateCheckIn.protocolCompleted}
      checkInDate={brainStateCheckIn.date}
      onChangeStatePress={() => setShowCheckInOverAnchor(true)}
      scrollY={scrollY}
    />
  )
)}
```

- [ ] **Step 4: Delete BrainBrief.tsx and BrainStatusBar.tsx**

```bash
rm mobile/src/components/dashboard/BrainBrief.tsx
rm mobile/src/components/dashboard/BrainStatusBar.tsx
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```
Expected: no new errors related to `BrainBrief`, `BrainStatusBar`, `DashboardAnchor`, or `showCheckInOverAnchor`. Pre-existing `as never` and `weekInsightDismissed` errors remain.

- [ ] **Step 6: Run dashboard tests**

```bash
npx jest src/components/dashboard src/__tests__/brandCompliance.test.ts --forceExit
```
Expected: all prior tests pass. New DashboardAnchor tests pass. Total count reflects the three new suites from Tasks 3–6 (brainStateBriefs: 4, Expanded: 3, Collapsed: 6, Anchor: 7 = 20 new tests). Brand compliance still 104/104.

- [ ] **Step 7: Run the full suite to catch regressions**

```bash
npx jest --forceExit
```
Expected: no NEW failures. Pre-existing `useBrainStateWeekTrend.test.ts` firebase/storage issue unchanged.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git rm mobile/src/components/dashboard/BrainBrief.tsx mobile/src/components/dashboard/BrainStatusBar.tsx
git commit -m "feat(dashboard): replace BrainBrief and BrainStatusBar with DashboardAnchor

The unified anchor persists through the full check-in day and composes
expanded / collapsed views via internal state. Re-check-in opens the
full BrainStateCheckin expanded view in place via showCheckInOverAnchor."
```

---

## Task 8: Manual verification

**Files:** none.

- [ ] **Step 1: Start the dev server**

```bash
cd mobile && npx expo start
```

- [ ] **Step 2: Pre-check-in phase — no anchor**

With no check-in for today:
- The `BrainStateCheckin` expanded view is shown.
- `LockedDivider` is below it.
- Muted cards below the divider.
- Notification opt-in (if eligible) is above the divider and fully interactive.
- No anchor is visible (correct — there's no check-in yet).

- [ ] **Step 3: Complete a check-in — anchor appears expanded**

Tap a brain state. The captured animation plays. On completion:
- The anchor appears in expanded form (brief message + left accent bar + label).
- The dashboard cards below are fully visible.
- No `BrainStatusBar`-style compact bar — just the brief.

- [ ] **Step 4: Scroll down — anchor collapses and sticks**

Scroll the dashboard down past 200px of content:
- The anchor cross-fades from expanded to collapsed (~250ms).
- Once collapsed, the anchor stays at the top of the viewport as the user continues scrolling.
- The collapsed bar shows the state dot, label, "Protocol ready" / "Protocol done", and a "Change" button.

Scroll back up to the top:
- At scrollY < 50, the anchor cross-fades back to expanded.
- The sticky translation zeros out.

- [ ] **Step 5: Manual tap toggle**

Tap the expanded anchor at the top of the scroll:
- It collapses. The scroll auto-expand is suppressed until the user crosses the collapse threshold AND back.

Tap the collapsed anchor:
- It expands. Same override logic in reverse.

- [ ] **Step 6: Tap "Change" — in-place re-check-in**

From the collapsed (or expanded) anchor, tap "Change":
- The anchor unmounts from its slot.
- The full `BrainStateCheckin` expanded view replaces it in the same physical layout location.
- User picks a new state. The captured animation plays.
- The anchor remounts in expanded form with the new brief.

- [ ] **Step 7: Persistence within the day**

- Collapse the anchor manually.
- Navigate to another tab and back (or kill and re-launch the app on the same day).
- Expected: the anchor returns in the collapsed state (hydrated from AsyncStorage under today's date key).

- [ ] **Step 8: Reset on a new day**

Difficult to test manually without date manipulation. If easily doable in the dev environment:
- Advance the system clock / simulator date to the next day.
- Do a check-in.
- Expected: the anchor starts expanded, regardless of yesterday's collapsed state.

Alternative: inspect AsyncStorage via Expo dev tools; confirm a new key `dashboard_anchor_collapsed_<new-date>` is written.

- [ ] **Step 9: Accessibility with VoiceOver / TalkBack**

Enable VoiceOver or TalkBack. Focus the collapsed anchor:
- Screen reader announces the full brief (e.g., "Foggy. Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in. Protocol ready. Double-tap to expand.").

- [ ] **Step 10: If any behavior deviates, document and fix**

Return to the relevant task and adjust. Re-run the affected task's tests.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Covered by |
|---|---|
| Single component with internal state | Task 6 |
| User tap toggle | Tasks 5, 6 |
| Scroll-driven continuous collapse/expand (>200 / <50) | Task 6 |
| Sticky to top | Task 6 |
| No timer-based collapse | Not implemented (absence is correct) |
| Static content per check-in | Task 3 |
| Re-check-in replaces with fade, in place | Task 7 (slot swap), Task 6 (cross-fade via remount) |
| Dashboard-only persistence | Task 6 (AsyncStorage keyed on date) |
| Remembered within day, reset on new day | Task 6 (Step 3 hydrate effect keyed on checkInDate) |
| Collapsible only, not dismissible | By construction — no dismiss affordance |
| One-shot migration after load-bearing refactors | Tasks 1, 2 (refactors), Tasks 3–6 (new), Task 7 (swap + delete) |
| Full-brief `accessibilityLabel` on collapsed | Task 6 |
| Phase machine collapsed to `pre-checkin | checked-in` | Task 2 |
| Remove `hasSeenBriefThisSession` | Task 2 |
| Drop `BrainStatusBar` pill picker | By construction — not in Task 5 |
| Convert to `Animated.ScrollView` with `scrollY` | Task 1 |

**Placeholder scan:** No TBDs, no "implement later," no "similar to task N." Every code-changing step shows the code.

**Type consistency:**
- `BrainStateBrief` interface defined in Task 3, consumed in Tasks 4, 5, 6 — consistent.
- `DashboardAnchorProps` (Task 6) matches the consumer in Task 7 — `brainState`, `protocolCompleted`, `checkInDate`, `onChangeStatePress`, `scrollY` all threaded.
- `checkInDate` sourced from `brainStateCheckIn.date` (the real field on `BrainStateCheckIn` at `mobile/src/types/models.ts:781`).
- `STORAGE_KEY_PREFIX` + `checkInDate` assertion in the Task 6 test (`dashboard_anchor_collapsed_2026-04-20`) matches the prefix constant in the Task 6 implementation.
- `onAnchorPress` / `onChangePress` prop names are consistent between Task 5 (`DashboardAnchorCollapsed`) and Task 6 (`DashboardAnchor` orchestrator calls).
- `scrollY` shared-value variable name consistent between Task 1 (`DashboardScreen`) and Task 6 (`DashboardAnchor`).
- `dashboardPhase` values in Task 2 (`'pre-checkin' | 'checked-in'`) match all downstream references in Task 7.
