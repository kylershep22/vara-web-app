# BrainStateCheckin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the horizontal-scroll pill layout in `BrainStateCheckin` with a vertical stack of alpha-tinted rows showing each state's label AND description (all five visible without scroll), plus a 1.2s focused celebration animation when one is selected.

**Architecture:** Decompose the existing 309-line single-file component into an orchestrator plus per-view components under a new `brainStateCheckin/` subdirectory. Introduce a `freshMoss` brand token so Energized is visually distinct from Clear (both previously `#1B5E57`). The captured phase is owned by a new `BrainStateCapturedView` that runs its own animation timeline and calls `onComplete` to transition to the collapsed view.

**Tech Stack:** React Native, Expo SDK 54, TypeScript, `react-native-reanimated` (already installed), `expo-haptics` (already installed), `@testing-library/react-native` (Jest with `react-native` preset).

**Spec:** `docs/superpowers/specs/2026-04-19-brain-state-checkin-redesign-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `mobile/src/constants/colors.ts` | Modify | Add `freshMoss: '#4A9B7E'` |
| `mobile/src/hooks/useBrainStateWeekTrend.ts` | Modify | Point `STATE_COLORS.energized` at `Colors.freshMoss` |
| `mobile/src/components/dashboard/brainStateCheckin/colorUtils.ts` | Create | `withAlpha(hex, alpha)` helper |
| `mobile/src/components/dashboard/brainStateCheckin/brainStateOptions.ts` | Create | `BrainStateOption` type + `BRAIN_STATES` array |
| `mobile/src/components/dashboard/brainStateCheckin/BrainStateOptionRow.tsx` | Create | One option row (tappable, alpha-tinted) |
| `mobile/src/components/dashboard/brainStateCheckin/BrainStateCapturedView.tsx` | Create | 1.2s celebration animation |
| `mobile/src/components/dashboard/brainStateCheckin/BrainStateCollapsedView.tsx` | Create | Extracted collapsed/returning view (no visual change) |
| `mobile/src/components/dashboard/BrainStateCheckin.tsx` | Rewrite | Orchestrator that picks among the three views |
| `mobile/src/components/dashboard/brainStateCheckin/__tests__/colorUtils.test.ts` | Create | Unit tests for `withAlpha` |
| `mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateOptionRow.test.tsx` | Create | Unit tests for the row |
| `mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateCapturedView.test.tsx` | Create | Unit tests for the captured animation |

No barrel updates — the existing `mobile/src/components/dashboard/index.ts` already re-exports `BrainStateCheckin`, and the sub-folder files are internal.

---

## Task 1: Add `freshMoss` token and update week-trend mapping

**Files:**
- Modify: `mobile/src/constants/colors.ts`
- Modify: `mobile/src/hooks/useBrainStateWeekTrend.ts`

- [ ] **Step 1: Add the `freshMoss` token to colors.ts**

Open `mobile/src/constants/colors.ts`. Find the existing `success` line:

```ts
  success: '#1B5E57',          // Use primary teal for success states
```

Immediately after it, add:

```ts
  freshMoss: '#4A9B7E',        // Brighter green for "energized" state, distinct from evergreenTeal
```

- [ ] **Step 2: Update `STATE_COLORS` in useBrainStateWeekTrend.ts**

Open `mobile/src/hooks/useBrainStateWeekTrend.ts`. Find this block (around lines 18–24):

```ts
const STATE_COLORS: Record<BrainState, string> = {
  wired: Colors.softCoral,
  foggy: Colors.sunriseAmber,
  okay: Colors.mutedSageGray,
  clear: Colors.evergreenTeal,
  energized: Colors.success,
};
```

Change the `energized` line:

```ts
  energized: Colors.freshMoss,
```

Resulting block:

```ts
const STATE_COLORS: Record<BrainState, string> = {
  wired: Colors.softCoral,
  foggy: Colors.sunriseAmber,
  okay: Colors.mutedSageGray,
  clear: Colors.evergreenTeal,
  energized: Colors.freshMoss,
};
```

- [ ] **Step 3: Type check**

Run from `mobile/`:

```bash
npx tsc --noEmit
```

Expected: no new errors. `Colors.freshMoss` should resolve.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/constants/colors.ts mobile/src/hooks/useBrainStateWeekTrend.ts
git commit -m "feat(colors): add freshMoss token and map to energized state"
```

---

## Task 2: Create `colorUtils.ts` with TDD

**Files:**
- Create: `mobile/src/components/dashboard/brainStateCheckin/__tests__/colorUtils.test.ts`
- Create: `mobile/src/components/dashboard/brainStateCheckin/colorUtils.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/dashboard/brainStateCheckin/__tests__/colorUtils.test.ts`:

```ts
import { withAlpha } from '../colorUtils';

describe('withAlpha', () => {
  it('converts a 6-digit hex to rgba with the given alpha', () => {
    expect(withAlpha('#D97A6E', 0.12)).toBe('rgba(217, 122, 110, 0.12)');
  });

  it('handles the full amber color correctly', () => {
    expect(withAlpha('#F4C542', 0.3)).toBe('rgba(244, 197, 66, 0.3)');
  });

  it('strips a leading hash if present', () => {
    expect(withAlpha('F4C542', 0.3)).toBe('rgba(244, 197, 66, 0.3)');
  });

  it('preserves alpha values at extremes', () => {
    expect(withAlpha('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
    expect(withAlpha('#FFFFFF', 1)).toBe('rgba(255, 255, 255, 1)');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

From `mobile/`:

```bash
npx jest src/components/dashboard/brainStateCheckin/__tests__/colorUtils.test.ts --forceExit
```

Expected: FAIL with "Cannot find module '../colorUtils'".

- [ ] **Step 3: Implement `withAlpha`**

Create `mobile/src/components/dashboard/brainStateCheckin/colorUtils.ts`:

```ts
/**
 * Convert a 6-digit hex color to rgba with the given alpha.
 * Accepts "#RRGGBB" or "RRGGBB".
 */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/components/dashboard/brainStateCheckin/__tests__/colorUtils.test.ts --forceExit
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/dashboard/brainStateCheckin/colorUtils.ts mobile/src/components/dashboard/brainStateCheckin/__tests__/colorUtils.test.ts
git commit -m "feat(brainStateCheckin): add withAlpha color helper"
```

---

## Task 3: Create `brainStateOptions.ts` data module

**Files:**
- Create: `mobile/src/components/dashboard/brainStateCheckin/brainStateOptions.ts`

- [ ] **Step 1: Create the data module**

Create `mobile/src/components/dashboard/brainStateCheckin/brainStateOptions.ts`:

```ts
import { BrainState } from '../../../types';
import { Colors } from '../../../constants';

export interface BrainStateOption {
  state: BrainState;
  label: string;
  description: string;
  color: string;
}

export const BRAIN_STATES: BrainStateOption[] = [
  { state: 'wired', label: 'Wired', description: "Racing thoughts, can't settle", color: Colors.softCoral },
  { state: 'foggy', label: 'Foggy', description: 'Low energy, hard to focus', color: Colors.sunriseAmber },
  { state: 'okay', label: 'Okay', description: 'Nothing great, nothing bad', color: Colors.mutedSageGray },
  { state: 'clear', label: 'Clear', description: 'Calm, present, ready', color: Colors.evergreenTeal },
  { state: 'energized', label: 'Energized', description: 'Focused and sharp', color: Colors.freshMoss },
];
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/dashboard/brainStateCheckin/brainStateOptions.ts
git commit -m "feat(brainStateCheckin): extract BRAIN_STATES into shared data module"
```

---

## Task 4: Create `BrainStateOptionRow` with TDD

**Files:**
- Create: `mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateOptionRow.test.tsx`
- Create: `mobile/src/components/dashboard/brainStateCheckin/BrainStateOptionRow.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateOptionRow.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BrainStateOptionRow } from '../BrainStateOptionRow';
import { BRAIN_STATES } from '../brainStateOptions';

const wired = BRAIN_STATES[0];

describe('BrainStateOptionRow', () => {
  it('renders label and description', () => {
    const { getByText } = render(
      <BrainStateOptionRow option={wired} onPress={jest.fn()} />
    );
    expect(getByText('Wired')).toBeTruthy();
    expect(getByText("Racing thoughts, can't settle")).toBeTruthy();
  });

  it('renders a colored dot with the state-specific testID', () => {
    const { getByTestId } = render(
      <BrainStateOptionRow option={wired} onPress={jest.fn()} />
    );
    expect(getByTestId('brain-state-dot-wired')).toBeTruthy();
  });

  it('calls onPress with the state when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <BrainStateOptionRow option={wired} onPress={onPress} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledWith('wired');
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <BrainStateOptionRow option={wired} onPress={onPress} disabled />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a checkmark when selected', () => {
    const { getByTestId } = render(
      <BrainStateOptionRow option={wired} onPress={jest.fn()} selected />
    );
    expect(getByTestId('brain-state-check-wired')).toBeTruthy();
  });

  it('does not show a checkmark when not selected', () => {
    const { queryByTestId } = render(
      <BrainStateOptionRow option={wired} onPress={jest.fn()} />
    );
    expect(queryByTestId('brain-state-check-wired')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/components/dashboard/brainStateCheckin/__tests__/BrainStateOptionRow.test.tsx --forceExit
```

Expected: FAIL with "Cannot find module '../BrainStateOptionRow'".

- [ ] **Step 3: Implement `BrainStateOptionRow`**

Create `mobile/src/components/dashboard/brainStateCheckin/BrainStateOptionRow.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { BrainState } from '../../../types';
import { BrainStateOption } from './brainStateOptions';
import { withAlpha } from './colorUtils';

interface BrainStateOptionRowProps {
  option: BrainStateOption;
  onPress: (state: BrainState) => void;
  selected?: boolean;
  disabled?: boolean;
  isLast?: boolean;
}

export const BrainStateOptionRow: React.FC<BrainStateOptionRowProps> = ({
  option,
  onPress,
  selected = false,
  disabled = false,
  isLast = false,
}) => {
  const backgroundColor = withAlpha(option.color, 0.12);
  const borderColor = withAlpha(option.color, selected ? 0.6 : 0.3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.label}
      accessibilityHint={option.description}
      onPress={() => !disabled && onPress(option.state)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor, borderColor },
        !isLast && styles.rowSpacing,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.rowPressed,
      ]}
    >
      <View
        testID={`brain-state-dot-${option.state}`}
        style={[styles.dot, { backgroundColor: option.color }]}
      />
      <View style={styles.textColumn}>
        <Text style={styles.label}>{option.label}</Text>
        <Text style={styles.description}>{option.description}</Text>
      </View>
      {selected && (
        <MaterialCommunityIcons
          testID={`brain-state-check-${option.state}`}
          name="check-circle"
          size={22}
          color={option.color}
          style={styles.check}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  rowSpacing: {
    marginBottom: Spacing.sm,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.base,
  },
  textColumn: {
    flex: 1,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  check: {
    marginLeft: Spacing.sm,
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/components/dashboard/brainStateCheckin/__tests__/BrainStateOptionRow.test.tsx --forceExit
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/dashboard/brainStateCheckin/BrainStateOptionRow.tsx mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateOptionRow.test.tsx
git commit -m "feat(brainStateCheckin): add BrainStateOptionRow component"
```

---

## Task 5: Create `BrainStateCapturedView` with TDD

**Files:**
- Create: `mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateCapturedView.test.tsx`
- Create: `mobile/src/components/dashboard/brainStateCheckin/BrainStateCapturedView.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateCapturedView.test.tsx`:

```tsx
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { BrainStateCapturedView } from '../BrainStateCapturedView';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (val: any) => val,
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

describe('BrainStateCapturedView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the selected state label, description, and dot', () => {
    const { getByText, getByTestId } = render(
      <BrainStateCapturedView selectedState="clear" onComplete={jest.fn()} />
    );
    expect(getByText('Clear')).toBeTruthy();
    expect(getByText('Calm, present, ready')).toBeTruthy();
    expect(getByTestId('brain-state-dot-clear')).toBeTruthy();
  });

  it('shows a checkmark on the selected state row', () => {
    const { getByTestId } = render(
      <BrainStateCapturedView selectedState="foggy" onComplete={jest.fn()} />
    );
    expect(getByTestId('brain-state-check-foggy')).toBeTruthy();
  });

  it('renders all five options initially so non-winners can fade', () => {
    const { getByTestId } = render(
      <BrainStateCapturedView selectedState="clear" onComplete={jest.fn()} />
    );
    expect(getByTestId('brain-state-dot-wired')).toBeTruthy();
    expect(getByTestId('brain-state-dot-foggy')).toBeTruthy();
    expect(getByTestId('brain-state-dot-okay')).toBeTruthy();
    expect(getByTestId('brain-state-dot-clear')).toBeTruthy();
    expect(getByTestId('brain-state-dot-energized')).toBeTruthy();
  });

  it('calls onComplete after 1200ms', () => {
    const onComplete = jest.fn();
    render(<BrainStateCapturedView selectedState="clear" onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1199);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('fires the success haptic at ~800ms', () => {
    const haptics = require('expo-haptics');
    render(<BrainStateCapturedView selectedState="clear" onComplete={jest.fn()} />);

    expect(haptics.notificationAsync).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(haptics.notificationAsync).toHaveBeenCalledWith('success');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/components/dashboard/brainStateCheckin/__tests__/BrainStateCapturedView.test.tsx --forceExit
```

Expected: FAIL with "Cannot find module '../BrainStateCapturedView'".

- [ ] **Step 3: Implement `BrainStateCapturedView`**

Create `mobile/src/components/dashboard/brainStateCheckin/BrainStateCapturedView.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Layout } from '../../../constants';
import { BrainState } from '../../../types';
import { BRAIN_STATES } from './brainStateOptions';
import { BrainStateOptionRow } from './BrainStateOptionRow';

interface BrainStateCapturedViewProps {
  selectedState: BrainState;
  onComplete: () => void;
}

const FADE_DURATION = 200;
const SCALE_DURATION = 180;
const SUCCESS_HAPTIC_DELAY = 800;
const TOTAL_DURATION = 1200;

export const BrainStateCapturedView: React.FC<BrainStateCapturedViewProps> = ({
  selectedState,
  onComplete,
}) => {
  const nonWinnerOpacity = useSharedValue(1);
  const winnerScale = useSharedValue(1);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    nonWinnerOpacity.value = withTiming(0, { duration: FADE_DURATION });
    winnerScale.value = withTiming(1.05, { duration: SCALE_DURATION });

    hapticTimerRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, SUCCESS_HAPTIC_DELAY);

    completeTimerRef.current = setTimeout(() => {
      onComplete();
    }, TOTAL_DURATION);

    return () => {
      if (hapticTimerRef.current) clearTimeout(hapticTimerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [onComplete, nonWinnerOpacity, winnerScale]);

  const nonWinnerStyle = useAnimatedStyle(() => ({
    opacity: nonWinnerOpacity.value,
  }));

  const winnerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: winnerScale.value }],
  }));

  return (
    <View style={styles.container}>
      {BRAIN_STATES.map((option, index) => {
        const isWinner = option.state === selectedState;
        const isLast = index === BRAIN_STATES.length - 1;
        return (
          <Animated.View
            key={option.state}
            style={isWinner ? winnerStyle : nonWinnerStyle}
          >
            <BrainStateOptionRow
              option={option}
              onPress={() => {}}
              selected={isWinner}
              disabled
              isLast={isLast}
            />
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/components/dashboard/brainStateCheckin/__tests__/BrainStateCapturedView.test.tsx --forceExit
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/dashboard/brainStateCheckin/BrainStateCapturedView.tsx mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateCapturedView.test.tsx
git commit -m "feat(brainStateCheckin): add BrainStateCapturedView celebration"
```

---

## Task 6: Extract `BrainStateCollapsedView` (no visual change)

**Files:**
- Create: `mobile/src/components/dashboard/brainStateCheckin/BrainStateCollapsedView.tsx`

This extraction has no tests because:
- The component has no logic — it's pure rendering with styles identical to the current inline block.
- Its behavior is verified through manual testing (Task 8) and by the fact that `BrainStateCheckin.tsx` will render it unchanged.

- [ ] **Step 1: Create the extracted view**

Create `mobile/src/components/dashboard/brainStateCheckin/BrainStateCollapsedView.tsx`:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { DaySlot } from '../../../hooks/useBrainStateWeekTrend';
import { BrainStateOption } from './brainStateOptions';

interface BrainStateCollapsedViewProps {
  selectedState: BrainStateOption;
  onChangePress: () => void;
  onSeeWeekPress: () => void;
  days: DaySlot[];
  summary: string | null;
}

export const BrainStateCollapsedView: React.FC<BrainStateCollapsedViewProps> = ({
  selectedState,
  onChangePress,
  onSeeWeekPress,
  days,
  summary,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.collapsedRow}>
        <View style={styles.collapsedLeft}>
          <View style={[styles.dot, { backgroundColor: selectedState.color }]} />
          <Text style={styles.collapsedLabel}>{selectedState.label}</Text>
        </View>
        <TouchableOpacity
          onPress={onChangePress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.changeButton}>Change</Text>
        </TouchableOpacity>
      </View>

      {summary && (
        <View style={styles.trendSection}>
          <View style={styles.dotsRow}>
            {days.map((day) => (
              <View key={day.date} style={styles.dayColumn}>
                <View
                  style={[
                    styles.trendDot,
                    day.color
                      ? { backgroundColor: day.color }
                      : styles.trendDotEmpty,
                  ]}
                />
                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.summaryText}>{summary}</Text>
          <TouchableOpacity
            onPress={onSeeWeekPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeWeekLink}>See your week →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
  },
  collapsedLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  changeButton: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  trendSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trendDotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  summaryText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  seeWeekLink: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/dashboard/brainStateCheckin/BrainStateCollapsedView.tsx
git commit -m "feat(brainStateCheckin): extract BrainStateCollapsedView"
```

---

## Task 7: Rewrite `BrainStateCheckin.tsx` as orchestrator

**Files:**
- Modify: `mobile/src/components/dashboard/BrainStateCheckin.tsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Open `mobile/src/components/dashboard/BrainStateCheckin.tsx` and REPLACE the entire file with:

```tsx
/**
 * BrainStateCheckin
 * Single-tap daily check-in for Dashboard V2.
 * Orchestrates three views: expanded (pre-checkin), captured (celebration), collapsed (post-checkin).
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainState } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBrainStateWeekTrend } from '../../hooks/useBrainStateWeekTrend';
import { BRAIN_STATES } from './brainStateCheckin/brainStateOptions';
import { BrainStateOptionRow } from './brainStateCheckin/BrainStateOptionRow';
import { BrainStateCapturedView } from './brainStateCheckin/BrainStateCapturedView';
import { BrainStateCollapsedView } from './brainStateCheckin/BrainStateCollapsedView';

interface BrainStateCheckinProps {
  currentCheckIn: { brainState: BrainState } | null;
  onSelect: (state: BrainState) => void;
  loading?: boolean;
}

type Phase = 'expanded' | 'captured' | 'collapsed';

export const BrainStateCheckin: React.FC<BrainStateCheckinProps> = ({
  currentCheckIn,
  onSelect,
  loading = false,
}) => {
  const [phase, setPhase] = useState<Phase>(currentCheckIn ? 'collapsed' : 'expanded');
  const [pendingSelection, setPendingSelection] = useState<BrainState | null>(null);

  const navigation = useNavigation();
  const { user } = useAuth();
  const { days, summary } = useBrainStateWeekTrend(
    user?.uid,
    currentCheckIn?.brainState
  );

  useEffect(() => {
    if (currentCheckIn && phase === 'expanded') {
      setPhase('collapsed');
    }
    if (!currentCheckIn && phase === 'collapsed') {
      setPhase('expanded');
    }
  }, [currentCheckIn, phase]);

  const handleSelect = (state: BrainState) => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(state);
    setPendingSelection(state);
    setPhase('captured');
  };

  const handleCapturedComplete = () => {
    setPhase('collapsed');
    setPendingSelection(null);
  };

  const handleChangePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('expanded');
  };

  const handleSeeWeekPress = () => {
    navigation.navigate('Insights' as never);
  };

  if (phase === 'captured' && pendingSelection) {
    return (
      <BrainStateCapturedView
        selectedState={pendingSelection}
        onComplete={handleCapturedComplete}
      />
    );
  }

  if (phase === 'collapsed' && currentCheckIn) {
    const selected = BRAIN_STATES.find((s) => s.state === currentCheckIn.brainState);
    if (!selected) return null;
    return (
      <BrainStateCollapsedView
        selectedState={selected}
        onChangePress={handleChangePress}
        onSeeWeekPress={handleSeeWeekPress}
        days={days}
        summary={summary}
      />
    );
  }

  const currentSelection = currentCheckIn?.brainState ?? null;

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>How are you feeling right now?</Text>
      <Text style={styles.subtext}>Just one tap. No wrong answers.</Text>
      {BRAIN_STATES.map((option, index) => (
        <BrainStateOptionRow
          key={option.state}
          option={option}
          onPress={handleSelect}
          selected={currentSelection === option.state}
          disabled={loading}
          isLast={index === BRAIN_STATES.length - 1}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  prompt: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
});
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no new errors related to `BrainStateCheckin`. Pre-existing project-wide errors (e.g., `weekInsightDismissed` in DashboardScreen) still exist and are unrelated.

- [ ] **Step 3: Run all BrainStateCheckin-related tests**

```bash
npx jest src/components/dashboard/brainStateCheckin --forceExit
```

Expected: all tests from Tasks 2, 4, and 5 pass.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

```bash
npx jest --forceExit
```

Expected: No NEW failures. Pre-existing failures (`brandCompliance` checks for `DashboardScreen`, `useBrainStateWeekTrend` firebase/storage ES module issue) may remain as they were. Specifically confirm `useBrainStateWeekTrend.test.ts` has not suddenly started failing with a NEW error from your changes — if it has, it means the `STATE_COLORS.energized` change broke a test expectation there. Inspect and address.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/dashboard/BrainStateCheckin.tsx
git commit -m "feat(brainStateCheckin): rewrite as orchestrator with new vertical layout"
```

---

## Task 8: Manual verification

**Files:** none (manual QA).

- [ ] **Step 1: Start the dev server**

```bash
cd mobile && npx expo start
```

- [ ] **Step 2: Launch on an iPhone 12+ simulator (or equivalent Android) with an account that has no check-in today**

If needed, delete today's `brainStateCheckIns/{userId}_{YYYY-MM-DD}` doc via the Firebase console first.

Expected in the pre-checkin phase:
- Prompt "How are you feeling right now?" and subtext "Just one tap. No wrong answers." are visible.
- Five vertically stacked option rows are visible. Each shows: a colored dot on the left, the label ("Wired", etc.) in primary text, and the description below in secondary text.
- All five rows fit without any scroll on the device.
- Clear's row is teal-tinted; Energized's row is a distinctly brighter green. The two are visually different.

- [ ] **Step 3: Tap each of the 5 options (separate sessions)**

For each tap, verify:
- Light haptic fires immediately on tap.
- The tapped row scales up slightly and its checkmark icon appears.
- The other 4 rows (and the prompt/subtext) fade out.
- Around 800ms in, a success haptic fires.
- At ~1.2s, the card transitions to the collapsed view showing the selected state + week trend.

Also verify:
- In the week-trend dots, today's dot color matches the selected state color (especially for Energized — should be freshMoss, not teal).

- [ ] **Step 4: Tap "Change" in the collapsed view**

Expected:
- Light haptic fires.
- Card returns to the expanded view with all 5 rows visible.
- The row matching the previously selected state shows the selected highlight (thicker border) and a checkmark.

- [ ] **Step 5: Pull-to-refresh on the dashboard while in pre-checkin**

Expected: state machine stays in `expanded`. No flicker.

- [ ] **Step 6: VoiceOver/TalkBack check**

With a screen reader enabled:
- Focus moves across the 5 rows in spectrum order.
- Each row announces its label AND description (e.g., "Wired, button, Racing thoughts can't settle").
- Tapping with a double-tap triggers selection.

- [ ] **Step 7: If any behavior deviates, document and fix**

Return to the relevant task's Step 1, adjust, and re-run the tests for that task.

---

## Self-Review

**Spec coverage:**
- `freshMoss` color token + Energized mapping in week-trend — ✅ Task 1
- `withAlpha` helper — ✅ Task 2
- `BrainStateOption` type + `BRAIN_STATES` array — ✅ Task 3
- `BrainStateOptionRow` with label, description, dot, checkmark when selected, a11y — ✅ Task 4
- `BrainStateCapturedView` with 1.2s sequence and haptic at 800ms — ✅ Task 5
- `BrainStateCollapsedView` extraction with no visual change — ✅ Task 6
- Orchestrator replaces `showCaptured`/`setTimeout` with phase state machine — ✅ Task 7
- Manual test plan for iPhone 12+ — ✅ Task 8
- Unit tests: `colorUtils`, `BrainStateOptionRow`, `BrainStateCapturedView` — ✅ Tasks 2, 4, 5
- Integration test for `BrainStateCheckin` phases — Intentionally deferred (orchestrator is small, manual test covers flows); noted in spec as covered by manual testing and component-level tests.

**Placeholder scan:** No TBDs, no "implement later", no "similar to Task N" references. Every code-changing step has complete code.

**Type consistency:**
- `BrainStateOption` defined in Task 3, consumed identically in Tasks 4, 5, 6 — ✅
- `BrainStateOptionRowProps` (Task 4) and the props usage in Task 5's `BrainStateCapturedView` and Task 7's orchestrator match: `option`, `onPress`, `selected`, `disabled`, `isLast` — ✅
- `BrainStateCapturedViewProps` (Task 5) consumed in Task 7 with `selectedState` and `onComplete` — ✅
- `BrainStateCollapsedViewProps` (Task 6) consumed in Task 7 with `selectedState`, `onChangePress`, `onSeeWeekPress`, `days`, `summary` — ✅
- `DaySlot` imported consistently from `'../../../hooks/useBrainStateWeekTrend'` — ✅
- `withAlpha` signature `(hex: string, alpha: number) => string` consumed in Task 4 — ✅
- Animation timing constants (`FADE_DURATION=200`, `SUCCESS_HAPTIC_DELAY=800`, `TOTAL_DURATION=1200`) match the spec's animation table — ✅
