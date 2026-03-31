# Focus Timer & Insights Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the Focus Timer (remove all Pomodoro references, add adjustable break, relocate to Library tab) and simplify the Insights page to 3 widgets with Vara voice.

**Architecture:** The Focus screen moves from a bottom tab to a stack screen accessed via a card on the Wellness/Library screen. The bottom tab bar loses the Focus tab. The Insights screen is stripped down to 3 widgets (AI narrative, heatmap, sparklines) with a Week/Month toggle and new "Your week" title. The backend narrative prompt is updated to enforce Vara's observational voice.

**Tech Stack:** React Native, Expo, React Navigation, Firebase/Firestore, Express.js backend, OpenAI GPT-4o-mini

---

## File Map

### Focus Timer changes
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `mobile/src/tokens/design-tokens.ts` | Update FocusCopy strings (remove Pomodoro refs, new break copy) |
| Modify | `mobile/src/screens/Focus/FocusScreen.tsx` | Update subtitle copy |
| Modify | `mobile/src/screens/Focus/PomodoroTab.tsx` | Remove BrainHealthTip, wire adjustable break duration |
| Modify | `mobile/src/screens/Focus/components/BreakPrompt.tsx` | New 3-button session_complete UI with adjustable break, new copy |
| Modify | `mobile/src/hooks/useTimer.ts` | Accept mutable breakDurationMinutes, expose setter |
| Modify | `mobile/src/navigation/AppNavigator.tsx` | Remove Focus bottom tab, add Focus as stack screen |
| Modify | `mobile/src/screens/MoreMenuScreen.tsx` | Add Focus card to Wellness screen |

### Insights changes
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `mobile/src/screens/InsightsScreen.tsx` | Strip to 3 widgets, new title/subtitle, Week/Month toggle |
| Modify | `mobile/src/components/insights/NarrativeRecap.tsx` | Update header to "What shaped your week", add insufficient data fallback |
| Modify | `mobile/src/components/insights/HabitHeatmap.tsx` | Rebuild as 7-col x ~4-row calendar grid with percentage-based colors |
| Modify | `mobile/src/components/insights/SparklineTrendCard.tsx` | Add relative progress bars, rename to "At a glance" layout |
| Modify | `mobile/src/navigation/AppNavigator.tsx` | Update Insights header title to "Your week" |
| Modify | `backend/server.js` | Update weekly-narrative system prompt for Vara voice |

---

### Task 1: Update Focus Copy Strings in Design Tokens

**Files:**
- Modify: `mobile/src/tokens/design-tokens.ts:250-273`

- [ ] **Step 1: Update FocusCopy strings**

Replace the FocusCopy block with updated strings. Remove Pomodoro references. Add new break prompt copy.

```typescript
export const FocusCopy = {
  // Page level
  pageTitle: 'Focus',
  pomodoroSubtitle: 'Give your brain a focused window',
  routinesSubtitle: 'Build routines that support your brain',
  tabPomodoro: 'Focus',
  tabRoutines: 'Routines',

  // Focus tab
  taskInputLabel: 'What are you focusing on?',
  taskInputPlaceholder: 'e.g., Writing, deep reading, design work...',
  durationChipsLabel: 'Session length',
  sessionCompleteLine1: 'Session complete.',
  sessionCompleteLine2: 'Your brain worked hard. Rest if it feels right.',
  breakCtaTakeBreak: 'Take a break',
  breakCtaStartAnother: 'Start another',
  breakCtaDoneForNow: 'Done for now',
  breakCompleteLine1: "Break's over",
  breakCompleteLine2: 'Ready for another session?',
  breakCtaPrimary: 'Begin another',
  breakCtaTertiary: 'Done for now',
  notificationLabel: 'Silence notifications',
  notificationHelperOff: 'Reduce distractions while focusing',
  notificationHelperOn: 'Notifications paused during sessions',
  ambientPanelLabel: 'Ambient sound',
  loading: 'Taking a moment...',

  // Routines tab
  startCta: 'Begin at your own pace',
  reminderLink: 'Set a gentle reminder',
  addActivityLabel: 'Add an activity',
  editButton: 'Edit',
  emptyHeadline: 'A fresh start',
  emptyBody: "Create a routine for this time of day, whenever you're ready.",
  emptyCta: 'Create a routine',
};
```

Key changes:
- `pomodoroSubtitle`: "Give your brain a focused window"
- `sessionCompleteLine1`: "Session complete." (with period)
- `sessionCompleteLine2`: "Your brain worked hard. Rest if it feels right."
- Added `breakCtaTakeBreak`, `breakCtaStartAnother`, `breakCtaDoneForNow` for new 3-button layout
- Removed `tipCardTitle` (BrainHealthTip card is being removed)

- [ ] **Step 2: Verify no compile errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -30`

Check for any references to removed `tipCardTitle` or `sessionCompleteLine2` old value. Fix any type errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/tokens/design-tokens.ts
git commit -m "refactor: update Focus copy strings, remove Pomodoro references"
```

---

### Task 2: Update useTimer to Support Adjustable Break Duration

**Files:**
- Modify: `mobile/src/hooks/useTimer.ts:25-36, 67-73, 172-180`

- [ ] **Step 1: Add setBreakDuration to the hook interface and return**

In `useTimer.ts`, add `breakDurationMinutes` as a stateful value instead of just using the prop, and expose a setter. Update `UseTimerReturn` interface:

Add to the `UseTimerReturn` interface (after `isActive`):

```typescript
  /** Current break duration in minutes */
  breakDurationMinutes: number;
  /** Adjust break duration */
  setBreakDuration: (minutes: number) => void;
```

Update the hook implementation — replace the destructured `breakDurationMinutes` parameter with internal state:

```typescript
export const useTimer = ({
  durationMinutes,
  breakDurationMinutes: initialBreakMinutes = 5,
  onSessionComplete,
  onBreakComplete,
  onTick,
}: UseTimerOptions): UseTimerReturn => {
  const [state, setState] = useState<TimerState>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60);
  const [totalSeconds, setTotalSeconds] = useState(durationMinutes * 60);
  const [breakMinutes, setBreakMinutes] = useState(initialBreakMinutes);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
```

Update `startBreak` to use internal `breakMinutes`:

```typescript
  const startBreak = useCallback(() => {
    if (state === 'session_complete') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const breakSeconds = breakMinutes * 60;
      setRemainingSeconds(breakSeconds);
      setTotalSeconds(breakSeconds);
      setState('break_running');
    }
  }, [state, breakMinutes]);
```

Add the setter (clamp between 1 and 15):

```typescript
  const setBreakDuration = useCallback((minutes: number) => {
    const clamped = Math.max(1, Math.min(15, minutes));
    setBreakMinutes(clamped);
  }, []);
```

Update the return object to include the new fields:

```typescript
  return {
    state,
    remainingSeconds,
    totalSeconds,
    progress,
    formattedTime: formatTime(remainingSeconds),
    start,
    pause,
    resume,
    reset,
    startBreak,
    beginAnother,
    isBreak: state === 'break_running' || state === 'break_complete',
    isActive: state === 'running' || state === 'break_running',
    breakDurationMinutes: breakMinutes,
    setBreakDuration,
  };
```

- [ ] **Step 2: Verify no compile errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useTimer.ts
git commit -m "feat: add adjustable break duration to useTimer hook"
```

---

### Task 3: Redesign BreakPrompt with 3-Button Session Complete UI

**Files:**
- Modify: `mobile/src/screens/Focus/components/BreakPrompt.tsx`

- [ ] **Step 1: Rewrite BreakPrompt with new session_complete layout**

The `session_complete` state now shows 3 buttons: "Take a break" (with adjustable duration), "Start another", and "Done for now". Add break duration adjustment (minus/plus buttons around the break duration number).

Replace the full file content:

```typescript
/**
 * BreakPrompt Component
 * Break flow shown after focus session completes
 *
 * Session complete: 3-option layout with adjustable break duration
 * Break running: Countdown display
 * Break complete: "Begin another" / "Done for now"
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import {
  ColorTokens,
  SpacingTokens,
  SizeTokens,
  FocusCopy,
} from '../../../tokens/design-tokens';

type BreakState = 'session_complete' | 'break_running' | 'break_complete';

interface BreakPromptProps {
  state: BreakState;
  onStartBreak: () => void;
  onBeginAnother: () => void;
  onDoneForNow: () => void;
  breakTimeRemaining?: string;
  breakDurationMinutes?: number;
  onAdjustBreak?: (minutes: number) => void;
}

export const BreakPrompt: React.FC<BreakPromptProps> = ({
  state,
  onStartBreak,
  onBeginAnother,
  onDoneForNow,
  breakTimeRemaining,
  breakDurationMinutes = 5,
  onAdjustBreak,
}) => {
  const renderContent = () => {
    switch (state) {
      case 'session_complete':
        return (
          <View style={styles.content}>
            <Text style={styles.headline}>{FocusCopy.sessionCompleteLine1}</Text>
            <Text style={styles.subtext}>{FocusCopy.sessionCompleteLine2}</Text>
          </View>
        );

      case 'break_running':
        return (
          <View style={styles.content}>
            <Text style={styles.breakTime}>{breakTimeRemaining}</Text>
            <Text style={styles.subtext}>Taking a break</Text>
          </View>
        );

      case 'break_complete':
        return (
          <View style={styles.content}>
            <Text style={styles.headline}>{FocusCopy.breakCompleteLine1}</Text>
            <Text style={styles.subtext}>{FocusCopy.breakCompleteLine2}</Text>
          </View>
        );

      default:
        return null;
    }
  };

  const renderControls = () => {
    switch (state) {
      case 'session_complete':
        return (
          <View style={styles.sessionCompleteControls}>
            {/* Take a break with duration adjuster */}
            <View style={styles.breakRow}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => onAdjustBreak?.(breakDurationMinutes - 1)}
                accessibilityRole="button"
                accessibilityLabel="Decrease break duration"
                disabled={breakDurationMinutes <= 1}
              >
                <Icon
                  name="minus"
                  size={16}
                  color={breakDurationMinutes <= 1 ? ColorTokens.textTertiary : ColorTokens.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onStartBreak}
                accessibilityRole="button"
                accessibilityLabel={`Take a ${breakDurationMinutes} minute break`}
              >
                <Text style={styles.primaryButtonText}>
                  {FocusCopy.breakCtaTakeBreak} ({breakDurationMinutes}m)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => onAdjustBreak?.(breakDurationMinutes + 1)}
                accessibilityRole="button"
                accessibilityLabel="Increase break duration"
                disabled={breakDurationMinutes >= 15}
              >
                <Icon
                  name="plus"
                  size={16}
                  color={breakDurationMinutes >= 15 ? ColorTokens.textTertiary : ColorTokens.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Start another */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onBeginAnother}
              accessibilityRole="button"
              accessibilityLabel={FocusCopy.breakCtaStartAnother}
            >
              <Text style={styles.secondaryButtonText}>{FocusCopy.breakCtaStartAnother}</Text>
            </TouchableOpacity>

            {/* Done for now */}
            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={onDoneForNow}
              accessibilityRole="button"
              accessibilityLabel={FocusCopy.breakCtaDoneForNow}
            >
              <Text style={styles.tertiaryButtonText}>{FocusCopy.breakCtaDoneForNow}</Text>
            </TouchableOpacity>
          </View>
        );

      case 'break_complete':
        return (
          <View style={styles.breakCompleteControls}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onBeginAnother}
              accessibilityRole="button"
              accessibilityLabel={FocusCopy.breakCtaPrimary}
            >
              <Text style={styles.primaryButtonText}>{FocusCopy.breakCtaPrimary}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={onDoneForNow}
              accessibilityRole="button"
              accessibilityLabel={FocusCopy.breakCtaTertiary}
            >
              <Text style={styles.tertiaryButtonText}>{FocusCopy.breakCtaTertiary}</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      {renderControls()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: SpacingTokens.lg,
  },
  headline: {
    fontSize: 18,
    fontWeight: '500',
    color: ColorTokens.primary,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    fontWeight: '400',
    color: ColorTokens.textSecondary,
    textAlign: 'center',
    marginTop: SpacingTokens.xs,
    maxWidth: 220,
  },
  breakTime: {
    fontSize: 48,
    fontWeight: '600',
    color: ColorTokens.accentApricot,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.02 * 48,
  },
  sessionCompleteControls: {
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ColorTokens.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ColorTokens.backgroundPrimary,
  },
  primaryButton: {
    height: SizeTokens.buttonHeightPrimary,
    paddingHorizontal: SizeTokens.buttonPaddingHorizontal,
    backgroundColor: ColorTokens.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: ColorTokens.textOnPrimary,
  },
  secondaryButton: {
    height: SizeTokens.buttonHeightPrimary,
    paddingHorizontal: SizeTokens.buttonPaddingHorizontal,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ColorTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: ColorTokens.primary,
  },
  breakCompleteControls: {
    alignItems: 'center',
    gap: SpacingTokens.md,
  },
  tertiaryButton: {
    paddingVertical: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.base,
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.primary,
  },
});

export default BreakPrompt;
```

- [ ] **Step 2: Verify no compile errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/Focus/components/BreakPrompt.tsx
git commit -m "feat: redesign BreakPrompt with 3-button layout and adjustable break"
```

---

### Task 4: Remove BrainHealthTip from PomodoroTab & Wire Adjustable Break

**Files:**
- Modify: `mobile/src/screens/Focus/PomodoroTab.tsx`

- [ ] **Step 1: Remove BrainHealthTip import and usage**

Remove `BrainHealthTip` from the component imports (line 36) and remove the `<BrainHealthTip />` JSX at line 303.

In the imports block, change:

```typescript
import {
  TimerRing,
  DurationChips,
  TaskLabelInput,
  BrainHealthTip,
  BreakPrompt,
  NotificationToggle,
  AmbientSoundSelector,
} from './components';
```

to:

```typescript
import {
  TimerRing,
  DurationChips,
  TaskLabelInput,
  BreakPrompt,
  NotificationToggle,
  AmbientSoundSelector,
} from './components';
```

Remove line 303 (`<BrainHealthTip />`).

- [ ] **Step 2: Wire adjustable break duration to BreakPrompt**

Update the BreakPrompt usage in `renderTimerContent()` to pass `breakDurationMinutes` and `onAdjustBreak`. The `session_complete` BreakPrompt now also needs `onBeginAnother` wired to `timer.beginAnother` (for "Start another" button).

Since `timer.beginAnother` currently only works from `break_complete` state, we need to handle "Start another" from `session_complete` by resetting and starting:

Add a handler after the existing handlers:

```typescript
  const handleStartAnother = useCallback(() => {
    timer.reset();
    // Small delay to let state settle before starting
    setTimeout(() => timer.start(), 50);
  }, [timer]);
```

Update the `renderTimerContent` function's `session_complete` case:

```typescript
    if (timer.state === 'session_complete' || timer.state === 'break_complete') {
      return (
        <BreakPrompt
          state={timer.state === 'session_complete' ? 'session_complete' : 'break_complete'}
          onStartBreak={timer.startBreak}
          onBeginAnother={timer.state === 'break_complete' ? timer.beginAnother : handleStartAnother}
          onDoneForNow={timer.reset}
          breakDurationMinutes={timer.breakDurationMinutes}
          onAdjustBreak={timer.setBreakDuration}
        />
      );
    }
```

- [ ] **Step 3: Verify no compile errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/Focus/PomodoroTab.tsx
git commit -m "feat: remove BrainHealthTip, wire adjustable break duration"
```

---

### Task 5: Remove Focus Tab from Bottom Navigation & Add to Wellness Screen

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx:438-447, 518-537`
- Modify: `mobile/src/screens/MoreMenuScreen.tsx:42-106`

- [ ] **Step 1: Remove Focus tab from BottomTabsNavigator**

In `AppNavigator.tsx`, remove the entire Focus tab block (lines 438-447):

```typescript
      <BottomTabs.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          tabBarLabel: 'Focus',
          tabBarIcon: ({ color, size }) => (
            <Icon name="timer-outline" size={size} color={color} />
          ),
        }}
      />
```

- [ ] **Step 2: Add Focus as a stack screen in MainNavigator**

In `AppNavigator.tsx`, add a Focus stack screen near the Insights screen registration (after line 537):

```typescript
        {/* Focus Timer - Accessible from Wellness menu */}
        <AppStack.Screen
          name="FocusTimer"
          component={FocusScreen}
          options={{
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Focus',
            headerShadowVisible: false,
          }}
        />
```

- [ ] **Step 3: Add Focus card to MoreMenuScreen (Wellness screen)**

In `MoreMenuScreen.tsx`, add a Focus entry to the `YOUR_TOOLS_ITEMS` array. Insert it after the `sleep` item (before `movement`):

```typescript
  {
    id: 'focus',
    title: 'Focus',
    subtitle: 'Set a focused window for deep work',
    icon: 'timer-outline',
    iconColor: Colors.evergreenTeal,
    gradientColors: [Colors.dewSage + '40', Colors.dewSage + '60'] as [string, string],
    route: 'FocusTimer',
  },
```

- [ ] **Step 4: Verify no compile errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx mobile/src/screens/MoreMenuScreen.tsx
git commit -m "feat: move Focus timer from bottom tab to Wellness screen"
```

---

### Task 6: Update FocusScreen Subtitle

**Files:**
- Modify: `mobile/src/screens/Focus/FocusScreen.tsx:24-25`

- [ ] **Step 1: Update the subtitle display**

The `FocusScreen.tsx` currently shows the subtitle from `FocusCopy.pomodoroSubtitle`. Since we updated that string in Task 1, the subtitle will automatically show "Give your brain a focused window". However, when accessed as a stack screen with a header, the built-in header already shows "Focus" — so hide the screen's own header to avoid duplication.

Update the FocusScreen to conditionally hide its header when rendered inside a stack navigator (which provides its own header):

```typescript
export const FocusScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.subtitle}>{FocusCopy.pomodoroSubtitle}</Text>
      </View>

      {/* Focus Content */}
      <View style={styles.content}>
        <PomodoroTab showAdvancedDuration />
      </View>
    </SafeAreaView>
  );
};
```

Change: Remove the title line (since the stack header shows "Focus"), keep only the subtitle. Change `edges={['top']}` to `edges={[]}` since the stack header handles safe area.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/Focus/FocusScreen.tsx
git commit -m "refactor: simplify FocusScreen header for stack navigation"
```

---

### Task 7: Rebuild HabitHeatmap as 7-Column Calendar Grid

**Files:**
- Modify: `mobile/src/components/insights/HabitHeatmap.tsx`

- [ ] **Step 1: Rewrite HabitHeatmap as a 7-column weekly grid**

Replace the full file. The new grid has 7 columns (Mon-Sun) and ~4-5 rows (weeks). Color intensity maps to completion percentage: 0% = empty/light, 25% = light sage, 50% = medium sage, 75% = silver sage, 100% = teal. No numbers on dots. Blank days are neutral.

```typescript
/**
 * Habit Heatmap
 * 30-day rhythm heatmap in 7-column calendar grid
 * Color intensity based on daily completion percentage
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';

const VARA_COLORS = {
  teal: '#1B5E57',
  tealMid: '#227A71',
  dewSage: '#D5E3D1',
  silverSage: '#A8B5A0',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  white: '#FFFFFF',
};

// 5 color levels mapped to completion percentage
const HEATMAP_COLORS = [
  '#F0F2F0', // 0%: empty (near white)
  '#D5E3D1', // ~25%: light sage
  '#9BB89D', // ~50%: medium sage
  '#A8B5A0', // ~75%: silver sage
  '#1B5E57', // 100%: teal
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface HabitHeatmapProps {
  data: { date: string; count: number }[];
  totalHabits: number;
  daysToShow?: number;
}

const getColorForPercentage = (percentage: number): string => {
  if (percentage === 0) return HEATMAP_COLORS[0];
  if (percentage <= 25) return HEATMAP_COLORS[1];
  if (percentage <= 50) return HEATMAP_COLORS[2];
  if (percentage <= 75) return HEATMAP_COLORS[3];
  return HEATMAP_COLORS[4];
};

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({
  data,
  totalHabits,
  daysToShow = 30,
}) => {
  const gridData = useMemo(() => {
    const today = new Date();
    const days: { date: string; percentage: number }[] = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = data.find((d) => d.date === dateStr);
      const count = dayData?.count || 0;
      const percentage = totalHabits > 0 ? (count / totalHabits) * 100 : 0;
      days.push({ date: dateStr, percentage });
    }

    // Determine which day of week the first day falls on (Monday-based: 0=Mon, 6=Sun)
    const firstDate = new Date(days[0].date);
    const firstDayOfWeek = firstDate.getDay();
    const mondayBased = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Pad the beginning with empty cells so the grid aligns to day columns
    const paddedDays: ({ date: string; percentage: number } | null)[] = [];
    for (let i = 0; i < mondayBased; i++) {
      paddedDays.push(null);
    }
    paddedDays.push(...days);

    // Build rows of 7
    const rows: (typeof paddedDays)[] = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      const row = paddedDays.slice(i, i + 7);
      // Pad last row if needed
      while (row.length < 7) {
        row.push(null);
      }
      rows.push(row);
    }

    return rows;
  }, [data, totalHabits, daysToShow]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>30-day rhythm</Text>

      {/* Day labels */}
      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.dayLabel}>{label}</Text>
        ))}
      </View>

      {/* Grid rows */}
      {gridData.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.gridRow}>
          {row.map((cell, colIndex) => (
            <View
              key={`${rowIndex}-${colIndex}`}
              style={[
                styles.cell,
                {
                  backgroundColor: cell
                    ? getColorForPercentage(cell.percentage)
                    : 'transparent',
                },
              ]}
            />
          ))}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={styles.legendColors}>
          {HEATMAP_COLORS.map((color, index) => (
            <View key={index} style={[styles.legendDot, { backgroundColor: color }]} />
          ))}
        </View>
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

const CELL_SIZE = 32;
const CELL_GAP = 5;

const styles = StyleSheet.create({
  container: {
    backgroundColor: VARA_COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
    marginBottom: 12,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    color: VARA_COLORS.sageGray,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    color: VARA_COLORS.sageGray,
  },
  legendColors: {
    flexDirection: 'row',
    gap: 3,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export { HabitHeatmap };
```

- [ ] **Step 2: Verify no compile errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/insights/HabitHeatmap.tsx
git commit -m "feat: rebuild HabitHeatmap as 7-column calendar grid with percentage colors"
```

---

### Task 8: Update NarrativeRecap Component

**Files:**
- Modify: `mobile/src/components/insights/NarrativeRecap.tsx`

- [ ] **Step 1: Update header and add insufficient data fallback**

Replace the file content:

```typescript
/**
 * Narrative Recap
 * AI-driven weekly narrative — Vara's killer insight feature
 * Header: "What shaped your week"
 * Insufficient data fallback with warm message
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';

interface NarrativeRecapProps {
  narrative: string | null;
  loading: boolean;
  timeframeLabel: string;
  hasInsufficientData?: boolean;
}

const NarrativeRecap: React.FC<NarrativeRecapProps> = ({
  narrative,
  loading,
  timeframeLabel,
  hasInsufficientData = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>What shaped your week</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.evergreenTeal} />
          <Text style={styles.loadingText}>Putting your week together...</Text>
        </View>
      ) : hasInsufficientData || !narrative ? (
        <Text style={styles.insufficientData}>
          More patterns will emerge as you use Vara this week.
        </Text>
      ) : (
        <Text style={styles.narrative}>{narrative}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  narrative: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  insufficientData: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    fontStyle: 'italic',
  },
});

export { NarrativeRecap };
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/insights/NarrativeRecap.tsx
git commit -m "feat: update NarrativeRecap header and add insufficient data fallback"
```

---

### Task 9: Add "At a Glance" Sparkline Widget with Relative Progress Bars

**Files:**
- Modify: `mobile/src/components/insights/SparklineTrendCard.tsx`

- [ ] **Step 1: Add AtAGlanceCard component**

Add a new component at the bottom of `SparklineTrendCard.tsx` that shows 3 compact metrics with sparklines and relative progress bars. The highest value gets the longest bar; others scale proportionally.

Add this component and its styles to the end of the file (before the final `export` statement):

```typescript
interface AtAGlanceMetric {
  label: string;
  value: number;
  data: number[];
  color: string;
}

interface AtAGlanceCardProps {
  metrics: AtAGlanceMetric[];
}

export const AtAGlanceCard: React.FC<AtAGlanceCardProps> = ({ metrics }) => {
  const maxValue = Math.max(...metrics.map((m) => m.value), 1);

  return (
    <View style={atAGlanceStyles.container}>
      <Text style={atAGlanceStyles.title}>At a glance</Text>
      {metrics.map((metric, index) => {
        const barWidth = maxValue > 0 ? (metric.value / maxValue) * 100 : 0;
        return (
          <View key={index} style={atAGlanceStyles.metricRow}>
            <View style={atAGlanceStyles.metricHeader}>
              <Text style={atAGlanceStyles.metricValue}>{metric.value}</Text>
              <Text style={atAGlanceStyles.metricLabel}>{metric.label}</Text>
            </View>
            <View style={atAGlanceStyles.barContainer}>
              <View
                style={[
                  atAGlanceStyles.bar,
                  {
                    width: `${Math.max(barWidth, 4)}%`,
                    backgroundColor: metric.color,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const atAGlanceStyles = StyleSheet.create({
  container: {
    backgroundColor: VARA_COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
    marginBottom: 14,
  },
  metricRow: {
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: VARA_COLORS.charcoal,
    marginRight: 6,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: VARA_COLORS.sageGray,
  },
  barContainer: {
    height: 4,
    backgroundColor: '#F0F2F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: 4,
    borderRadius: 2,
  },
});
```

- [ ] **Step 2: Export the new component from the barrel**

Check `mobile/src/components/index.ts` and ensure `AtAGlanceCard` is exported. If `SparklineTrendCard` is already re-exported from the barrel, the named export will be picked up automatically. If not, add it.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/insights/SparklineTrendCard.tsx mobile/src/components/index.ts
git commit -m "feat: add AtAGlanceCard with relative progress bars"
```

---

### Task 10: Rebuild InsightsScreen with 3 Widgets

**Files:**
- Modify: `mobile/src/screens/InsightsScreen.tsx`
- Modify: `mobile/src/navigation/AppNavigator.tsx:527-537`

- [ ] **Step 1: Simplify InsightsScreen to 3 widgets**

This is a significant rewrite. The screen keeps: NarrativeRecap, HabitHeatmap, AtAGlanceCard. Everything else is removed. TimeFrame is simplified to Week/Month only. Title becomes "Your week". Subtitle shows date range.

Replace the InsightsScreen with the simplified version. Key changes:
- Remove imports: `HeroSummaryCard`, `RingProgressCard`, `WeeklyBarChart`, `ConsolidatedMetricsCard`, `EmptyStateCard`, `SparklineTrendCardRow`
- Add import: `AtAGlanceCard` from components
- Remove state: `brainMetrics`, `communityActivity`, `weeklyActivity`, `dailyCheckIns`
- Remove data loading: brain health queries, community queries, weekly activity calculation
- Remove trend functions: `getReadinessTrend`, `getCheckInsTrend`
- Simplify `TimeFrame` to `'week' | 'month'`
- Widget order: NarrativeRecap, HabitHeatmap, AtAGlanceCard

```typescript
/**
 * Insights Screen — "Your week"
 * Simplified to 3 high-value widgets:
 * 1. AI weekly narrative
 * 2. 30-day habit heatmap
 * 3. At a glance sparklines
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LoadingSpinner,
  NarrativeRecap,
  HabitHeatmap,
} from '../components';
import { AtAGlanceCard } from '../components/insights/SparklineTrendCard';
import { Colors, Spacing, Typography } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useHabits } from '../hooks';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { apiPost } from '../services/api/client';
import { getHabitCompletions } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const VARA_COLORS = {
  teal: '#1B5E57',
  tealMid: '#227A71',
  apricot: '#F5B971',
  mistWhite: '#FAFAF6',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
};

type TimeFrame = 'week' | 'month';

const InsightsScreen: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
  const { correlations } = useWeeklyCorrelations();
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
  const [habitCompletionData, setHabitCompletionData] = useState<{ [habitId: string]: string[] }>({});
  const [focusSessions, setFocusSessions] = useState<{ id: string; duration: number; completed: boolean; startedAt: any }[]>([]);
  const [journalEntries, setJournalEntries] = useState<{ id: string; createdAt: any }[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();
    if (timeFrame === 'week') {
      start.setDate(end.getDate() - 7);
    } else {
      start.setMonth(end.getMonth() - 1);
    }
    return { start, end };
  };

  const getDateRangeLabel = (): string => {
    const { start, end } = getDateRange();
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return `${fmt(start)} \u2013 ${fmt(end)}`;
  };

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user || !db) return;
      setLoading(true);
      try {
        const { start, end } = getDateRange();
        const startTimestamp = start.getTime() / 1000;
        const endTimestamp = end.getTime() / 1000;

        // Load habit completions
        const habitData: { [habitId: string]: string[] } = {};
        const dailyCompletions: { [date: string]: number } = {};

        for (const habit of habits) {
          const completions = await getHabitCompletions(habit.id);
          const filteredCompletions = completions
            .map((c) => c.date)
            .filter((date) => {
              const dateTimestamp = new Date(date).getTime() / 1000;
              return dateTimestamp >= startTimestamp && dateTimestamp <= endTimestamp;
            });
          habitData[habit.id] = filteredCompletions;
          filteredCompletions.forEach((date) => {
            dailyCompletions[date] = (dailyCompletions[date] || 0) + 1;
          });
        }
        setHabitCompletionData(habitData);

        // Load focus sessions
        try {
          const focusQuery = query(
            collection(db, 'focusSessions'),
            where('userId', '==', user.uid),
            orderBy('startedAt', 'desc')
          );
          const focusSnapshot = await getDocs(focusQuery);
          const sessions = focusSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as any))
            .filter((session: any) => {
              const sessionTime = session.startedAt?.seconds || 0;
              return sessionTime >= startTimestamp && sessionTime <= endTimestamp;
            });
          setFocusSessions(sessions);
        } catch {
          setFocusSessions([]);
        }

        // Load journal entries
        try {
          const journalQuery = query(
            collection(db, 'journalEntries'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const journalSnapshot = await getDocs(journalQuery);
          const entries = journalSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as any))
            .filter((entry: any) => {
              const entryTime = entry.createdAt?.seconds || 0;
              return entryTime >= startTimestamp && entryTime <= endTimestamp;
            });
          setJournalEntries(entries);
        } catch {
          setJournalEntries([]);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!habitsLoading) {
      loadAnalytics();
    }
  }, [user, timeFrame, habits, habitsLoading]);

  // Fetch AI weekly narrative
  useEffect(() => {
    if (!correlations || !user) return;

    const NARRATIVE_CACHE_KEY = 'vara_weekly_narrative';
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const fetchNarrative = async () => {
      try {
        const cached = await AsyncStorage.getItem(NARRATIVE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && Date.now() - parsed.timestamp < SEVEN_DAYS_MS && parsed.narrative) {
            setAiNarrative(parsed.narrative);
            return;
          }
        }
      } catch {
        // Cache miss
      }

      setNarrativeLoading(true);
      try {
        const correlationData = {
          sleepHabitCorrelation: correlations.sleepHabitCorrelation,
          energyHabitCorrelation: correlations.energyHabitCorrelation,
          journalMoodCorrelation: correlations.journalMoodCorrelation,
          topDriver: correlations.topDriver,
          brightSpot: correlations.brightSpot,
          stressTrend: correlations.stressTrend,
          weekOverWeek: correlations.weekOverWeek,
          dataCompleteness: correlations.dataCompleteness,
        };

        const response = await apiPost<{ narrative: string }>('/weekly-narrative', {
          correlationData,
        }, { debug: __DEV__ });

        try {
          await AsyncStorage.setItem(
            NARRATIVE_CACHE_KEY,
            JSON.stringify({ narrative: response.narrative, timestamp: Date.now() })
          );
        } catch {
          // Non-critical
        }

        setAiNarrative(response.narrative);
      } catch {
        const habitPct = correlations.weekOverWeek?.habitChange != null
          ? Math.round(50 + correlations.weekOverWeek.habitChange)
          : null;
        const habitSentence = habitPct != null
          ? `This week you completed about ${habitPct}% of your habits.`
          : 'This week you stayed consistent with your habits.';
        const brightSpotSentence = correlations.brightSpot?.insight ?? '';
        const stressSentence = correlations.stressTrend === 'declining'
          ? ' Your stress levels have been trending down.'
          : '';
        setAiNarrative(
          `${habitSentence}${brightSpotSentence ? ' ' + brightSpotSentence : ''}${stressSentence}`
        );
      } finally {
        setNarrativeLoading(false);
      }
    };

    fetchNarrative();
  }, [correlations, user]);

  // Compute metrics
  const metrics = useMemo(() => {
    const activeDays = new Set(Object.values(habitCompletionData).flat()).size;
    const protocolsCompleted = focusSessions.filter((s) => s.completed).length;
    const reflections = journalEntries.length;
    return { activeDays, protocolsCompleted, reflections };
  }, [habitCompletionData, focusSessions, journalEntries]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const dailyCompletions: { [date: string]: number } = {};
    Object.values(habitCompletionData).forEach((dates) => {
      dates.forEach((date) => {
        dailyCompletions[date] = (dailyCompletions[date] || 0) + 1;
      });
    });
    return Object.entries(dailyCompletions).map(([date, count]) => ({ date, count }));
  }, [habitCompletionData]);

  const hasInsufficientData = useMemo(() => {
    const totalCompletions = Object.values(habitCompletionData).reduce(
      (sum, dates) => sum + dates.length, 0
    );
    return totalCompletions < 3 && journalEntries.length < 2;
  }, [habitCompletionData, journalEntries]);

  if (loading || habitsLoading) {
    return <LoadingSpinner message="Loading insights..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Your week</Text>
          <Text style={styles.subtitle}>{getDateRangeLabel()}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Timeframe Selector — Week / Month only */}
        <View style={styles.filterSection}>
          <View style={styles.chipContainer}>
            {(['week', 'month'] as TimeFrame[]).map((tf) => (
              <TouchableOpacity
                key={tf}
                onPress={() => setTimeFrame(tf)}
                style={[styles.chip, timeFrame === tf && styles.chipSelected]}
              >
                <Text style={timeFrame === tf ? styles.chipTextSelected : styles.chipText}>
                  {tf === 'week' ? 'Week' : 'Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Widget 1: AI Narrative */}
        <NarrativeRecap
          narrative={aiNarrative}
          loading={narrativeLoading}
          timeframeLabel={timeFrame === 'week' ? 'This Week' : 'This Month'}
          hasInsufficientData={hasInsufficientData}
        />

        {/* Widget 2: 30-day Habit Heatmap */}
        <HabitHeatmap
          data={heatmapData}
          totalHabits={habits.length}
          daysToShow={30}
        />

        {/* Widget 3: At a Glance */}
        <AtAGlanceCard
          metrics={[
            {
              label: 'Days active',
              value: metrics.activeDays,
              data: [],
              color: VARA_COLORS.teal,
            },
            {
              label: 'Protocols completed',
              value: metrics.protocolsCompleted,
              data: [],
              color: VARA_COLORS.tealMid,
            },
            {
              label: 'Reflections',
              value: metrics.reflections,
              data: [],
              color: VARA_COLORS.apricot,
            },
          ]}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VARA_COLORS.mistWhite,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.bold,
    color: VARA_COLORS.teal,
  },
  subtitle: {
    fontSize: 14,
    color: VARA_COLORS.sageGray,
    marginTop: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  filterSection: {
    marginBottom: Spacing.base,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.12)',
  },
  chipSelected: {
    backgroundColor: VARA_COLORS.teal,
  },
  chipText: {
    fontSize: 14,
    color: VARA_COLORS.charcoal,
  },
  chipTextSelected: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});

export default InsightsScreen;
```

- [ ] **Step 2: Update navigation header title**

In `AppNavigator.tsx`, change the Insights screen title from `'Insights'` to `'Your week'`:

```typescript
        <AppStack.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Your week',
            headerShadowVisible: false,
          }}
        />
```

- [ ] **Step 3: Verify no compile errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/InsightsScreen.tsx mobile/src/navigation/AppNavigator.tsx
git commit -m "feat: simplify Insights to 3 widgets with 'Your week' title"
```

---

### Task 11: Update Backend Narrative Prompt for Vara Voice

**Files:**
- Modify: `backend/server.js` (the `/api/weekly-narrative` route, ~line 287-351)

- [ ] **Step 1: Update the system prompt**

Replace the existing `systemPrompt` in the weekly-narrative endpoint with Vara's voice guidelines:

```javascript
    const systemPrompt = `
You are Vara, a calm and observant wellness companion writing a brief weekly reflection.

Voice rules:
- Write 3-5 sentences maximum. One insight per week, not more.
- Frame every observation positively. Never frame as deficit. Say "You were most consistent on mornings where you started with a protocol" not "You missed 40% of your habits."
- Use conditional, observational language: "this pattern suggests", "it seems like", "you may have noticed". Never "this proves" or "you should".
- Your output is plain text for a mobile app. No markdown, no bold, no italics, no asterisks, no headers, no bullet points.
- Never use em dashes. Use commas or periods instead.
- No scientific jargon. No medical claims.
- If insufficient data to draw a meaningful pattern, respond with exactly: "More patterns will emerge as you use Vara this week."
- Acknowledge effort over outcomes. Consistency matters more than perfection.
- End with one gentle observation or reflection, not a directive or suggestion.
- Tone: warm, brief, like a thoughtful friend who notices patterns without judging.
    `.trim();
```

- [ ] **Step 2: Commit**

```bash
git add backend/server.js
git commit -m "feat: update weekly-narrative prompt to Vara observational voice"
```

---

### Task 12: Update Components Barrel Export

**Files:**
- Modify: `mobile/src/components/index.ts`

- [ ] **Step 1: Verify AtAGlanceCard is exported**

Check `mobile/src/components/index.ts` for the SparklineTrendCard re-export. If it uses `export * from './insights/SparklineTrendCard'`, the `AtAGlanceCard` will automatically be available. If not, add:

```typescript
export { AtAGlanceCard } from './insights/SparklineTrendCard';
```

Also verify that removed components (`HeroSummaryCard`, `RingProgressCard`, `WeeklyBarChart`, `ConsolidatedMetricsCard`, `EmptyStateCard`, `SparklineTrendCardRow`) are not imported from `InsightsScreen.tsx` anymore. The barrel exports can stay for now (other screens might use them), but `InsightsScreen` no longer imports them.

- [ ] **Step 2: Verify full build**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit if changes were needed**

```bash
git add mobile/src/components/index.ts
git commit -m "chore: update component barrel exports for AtAGlanceCard"
```

---

### Task 13: Final Verification Against Spec Checklist

- [ ] **Step 1: Verify no "Pomodoro" references in mobile app UI**

Run: `grep -ri "pomodoro" mobile/src/ --include="*.tsx" --include="*.ts" -l`

Expect: Only `design-tokens.ts` may have the old `tabPomodoro` key name (now set to `'Focus'`). Any UI-visible "Pomodoro" text should be gone. The analytics `sessionType: 'pomodoro'` in Firestore is intentionally kept per user decision.

- [ ] **Step 2: Verify Focus timer has no BrainHealthTip**

Run: `grep -r "BrainHealthTip" mobile/src/screens/Focus/ --include="*.tsx"`

Expected: Only `BrainHealthTip.tsx` component file itself and possibly `components/index.ts`. Not in `PomodoroTab.tsx`.

- [ ] **Step 3: Verify Insights page has exactly 3 widgets**

Open `mobile/src/screens/InsightsScreen.tsx` and confirm:
- `NarrativeRecap` is rendered
- `HabitHeatmap` is rendered
- `AtAGlanceCard` is rendered
- No `HeroSummaryCard`, `RingProgressCard`, `WeeklyBarChart`, `ConsolidatedMetricsCard`

- [ ] **Step 4: Verify Insights title is "Your week"**

Check `AppNavigator.tsx` Insights screen `title` is `'Your week'`.
Check `InsightsScreen.tsx` header shows `"Your week"`.

- [ ] **Step 5: Verify Focus is not in bottom tabs**

Check `AppNavigator.tsx` BottomTabsNavigator has no Focus tab.

- [ ] **Step 6: Commit verification notes**

No commit needed — this is a verification-only task.
