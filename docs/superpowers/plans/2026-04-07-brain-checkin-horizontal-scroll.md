# BrainStateCheckin Horizontal Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the expanded state of the mobile dashboard's `BrainStateCheckin` card from a vertical stack of labeled rows into a compact horizontal scrollable row of pills (dot + label only), and update the prompt copy.

**Architecture:** Edit a single React Native component file. Replace the inner vertical `View` with a horizontal `ScrollView` rendering pill-shaped `TouchableOpacity` elements. Remove styles no longer used, add new pill styles. No data, hook, or service changes.

**Tech Stack:** React Native, TypeScript, Expo Haptics, design tokens from `src/constants/` (Colors, Spacing, Typography, Layout).

**Spec:** `docs/superpowers/specs/2026-04-07-brain-checkin-horizontal-scroll-design.md`

---

### Task 1: Update copy and replace expanded-state layout

**Files:**
- Modify: `mobile/src/components/dashboard/BrainStateCheckin.tsx`

- [ ] **Step 1: Add `ScrollView` to the React Native import**

In `mobile/src/components/dashboard/BrainStateCheckin.tsx`, change line 8 from:

```tsx
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
```

to:

```tsx
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
```

- [ ] **Step 2: Update the prompt copy**

Change line 141 from:

```tsx
<Text style={styles.prompt}>How's your brain feeling?</Text>
```

to:

```tsx
<Text style={styles.prompt}>How are you feeling right now?</Text>
```

Leave the subtext on line 142 (`Just one tap. No wrong answers.`) unchanged.

- [ ] **Step 3: Replace the vertical states container with a horizontal ScrollView of pills**

Replace lines 144–163 (the `<View style={styles.statesContainer}>...</View>` block) with:

```tsx
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {BRAIN_STATES.map((item) => {
          const selected = currentCheckIn?.brainState === item.state;
          return (
            <TouchableOpacity
              key={item.state}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => handleSelect(item.state)}
              activeOpacity={0.7}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.pillLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
```

- [ ] **Step 4: Remove unused styles and add new pill styles**

In the `StyleSheet.create({...})` block, delete these entries:

- `statesContainer`
- `stateRow`
- `stateRowSelected`
- `stateTextContainer`
- `stateLabel`
- `stateDescription`

Keep the existing `dot` style but remove its `marginRight: Spacing.md` line (the pill layout uses a smaller gap). Replace with:

```tsx
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
  },
```

Then add these new styles alongside the others (before the `collapsedRow` style):

```tsx
  scrollContent: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.base,
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: Colors.dewSage,
    borderColor: Colors.dewSage,
  },
  pillLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
```

Note: the `dot` style was previously shared between the expanded rows and the collapsed row. It is still used in the collapsed row (`<View style={[styles.dot, ...]} />` on line 100) and in the pills, so reducing its `marginRight` to `Spacing.xs` is fine — the collapsed row uses `collapsedLeft` with `flexDirection: row` and the slightly smaller spacing is acceptable there as well. If the collapsed look regresses noticeably, use a separate `pillDot` style for the pill variant and keep `dot` unchanged.

- [ ] **Step 5: Type-check the file**

Run from the repo root:

```bash
cd mobile && npx tsc --noEmit -p tsconfig.json
```

Expected: no errors in `BrainStateCheckin.tsx`. (Other pre-existing errors in the project are fine — only ensure none reference this file.)

- [ ] **Step 6: Manual verification on device/simulator**

Start the mobile app (however the user normally runs it, e.g. `cd mobile && npx expo start`). On the home dashboard when no check-in exists for today, verify:

1. The prompt reads "How are you feeling right now?"
2. Subtext "Just one tap. No wrong answers." is still present.
3. The 5 brain state options render as horizontal pills (dot + label only, no description).
4. You can scroll horizontally to reveal the 5th pill (Energized) — on narrow screens it should peek at the right edge initially.
5. Tapping a pill triggers the "Captured." overlay and collapses to the check-in row within ~2 seconds.
6. The collapsed row and the week trend (if present) render unchanged from before.
7. The expanded card is visibly shorter vertically than before (previously ~5 stacked rows, now a single pill row).

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/dashboard/BrainStateCheckin.tsx
git commit -m "feat(mobile): convert brain check-in to horizontal pill scroll

Replace vertical stack of labeled rows with a horizontal ScrollView of
dot+label pills on the dashboard brain check-in card. Update prompt copy
to 'How are you feeling right now?'. Tightens vertical space on the home
dashboard before the daily check-in is completed."
```
