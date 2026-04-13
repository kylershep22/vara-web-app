# Brain State Week Trend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 7-day trend visualization with summary text to the collapsed BrainStateCheckin card, closing the feedback loop for daily check-ins.

**Architecture:** A new hook (`useBrainStateWeekTrend`) fetches 7 days of brain state history via the existing `getBrainStateHistory` service, computes day slots for the current week and a summary string, and returns them. The `BrainStateCheckin` component renders the trend section below the existing collapsed row when data is available.

**Tech Stack:** React Native, TypeScript, Firebase/Firestore (existing service), Jest for testing

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/useBrainStateWeekTrend.ts` | Create | Hook: fetch history, compute week slots + summary |
| `src/hooks/__tests__/useBrainStateWeekTrend.test.ts` | Create | Unit tests for summary logic (pure function extracted for testability) |
| `src/components/dashboard/BrainStateCheckin.tsx` | Modify | Render trend dots, summary, and "See your week" link in collapsed state |

---

### Task 1: Summary Logic — Pure Function + Tests

**Files:**
- Create: `src/hooks/useBrainStateWeekTrend.ts`
- Create: `src/hooks/__tests__/useBrainStateWeekTrend.test.ts`

The summary logic is extracted as a pure exported function `computeWeekTrend` for direct unit testing without mocking hooks.

- [ ] **Step 1: Create the hook file with types and pure function skeleton**

Create `src/hooks/useBrainStateWeekTrend.ts`:

```ts
import { useState, useEffect } from 'react';
import { getBrainStateHistory } from '../services/firebase/brainStateCheckIn.service';
import { BrainState } from '../types';
import { Colors } from '../constants';

export interface DaySlot {
  date: string;
  dayLabel: string;
  brainState: BrainState | null;
  color: string | null;
}

export interface WeekTrend {
  days: DaySlot[];
  summary: string | null;
}

const STATE_COLORS: Record<BrainState, string> = {
  wired: Colors.softCoral,
  foggy: Colors.sunriseAmber,
  okay: Colors.mutedSageGray,
  clear: Colors.evergreenTeal,
  energized: Colors.success,
};

const STATE_RANK: Record<BrainState, number> = {
  foggy: 1,
  wired: 2,
  okay: 3,
  clear: 4,
  energized: 5,
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Build the 7-day slot array for the current calendar week (Mon-Sun).
 * `history` is an array of { date: 'YYYY-MM-DD', brainState: BrainState }.
 */
export function buildWeekSlots(
  history: Array<{ date: string; brainState: BrainState }>
): DaySlot[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const historyMap = new Map(history.map((h) => [h.date, h.brainState]));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const state = historyMap.get(dateStr) ?? null;
    return {
      date: dateStr,
      dayLabel: DAY_LABELS[i],
      brainState: state,
      color: state ? STATE_COLORS[state] : null,
    };
  });
}

/**
 * Compute a human-readable summary from the week's brain state data.
 * Returns null if fewer than 2 days have data.
 */
export function computeSummary(days: DaySlot[]): string | null {
  const withData = days.filter((d) => d.brainState !== null);
  if (withData.length < 2) return null;

  // Rule 1: Dominant state (3+ days)
  const counts = new Map<BrainState, number>();
  for (const d of withData) {
    counts.set(d.brainState!, (counts.get(d.brainState!) ?? 0) + 1);
  }
  for (const [state, count] of counts) {
    if (count >= 3) {
      const label = state.charAt(0).toUpperCase() + state.slice(1);
      return `${label} ${count} of ${withData.length} days`;
    }
  }

  // Rule 2 & 3: Trending better or worse
  // Compare average rank of first half vs second half of days with data
  if (withData.length >= 4) {
    const mid = Math.floor(withData.length / 2);
    const firstHalf = withData.slice(0, mid);
    const secondHalf = withData.slice(mid);
    const avg = (arr: DaySlot[]) =>
      arr.reduce((sum, d) => sum + STATE_RANK[d.brainState!], 0) / arr.length;
    const firstAvg = avg(firstHalf);
    const secondAvg = avg(secondHalf);
    if (secondAvg - firstAvg >= 0.5) return 'Trending clearer this week';
    if (firstAvg - secondAvg >= 0.5) return 'Trending foggier this week';
  }

  // Rule 4: Fallback — top 2 states
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const parts = sorted
    .slice(0, 2)
    .map(([state, count]) => `${count} ${state}`);
  return `Mixed week — ${parts.join(', ')}`;
}
```

- [ ] **Step 2: Write tests for `computeSummary` and `buildWeekSlots`**

Create `src/hooks/__tests__/useBrainStateWeekTrend.test.ts`:

```ts
import { computeSummary, buildWeekSlots, DaySlot } from '../useBrainStateWeekTrend';

function makeSlot(brainState: string | null): DaySlot {
  return {
    date: '2026-03-23',
    dayLabel: 'M',
    brainState: brainState as DaySlot['brainState'],
    color: null,
  };
}

describe('computeSummary', () => {
  it('returns null when fewer than 2 days have data', () => {
    const days = [
      makeSlot('clear'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    expect(computeSummary(days)).toBeNull();
  });

  it('returns dominant state when 3+ days match', () => {
    const days = [
      makeSlot('foggy'),
      makeSlot('foggy'),
      makeSlot('foggy'),
      makeSlot('clear'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).toBe('Foggy 3 of 4 days');
  });

  it('returns trending clearer when later days rank higher', () => {
    const days = [
      makeSlot('foggy'),
      makeSlot('foggy'),
      makeSlot('clear'),
      makeSlot('energized'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).toBe('Trending clearer this week');
  });

  it('returns trending foggier when later days rank lower', () => {
    const days = [
      makeSlot('energized'),
      makeSlot('clear'),
      makeSlot('foggy'),
      makeSlot('foggy'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).toBe('Trending foggier this week');
  });

  it('returns mixed week fallback with top 2 states', () => {
    const days = [
      makeSlot('foggy'),
      makeSlot('clear'),
      makeSlot('okay'),
      makeSlot('wired'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).toMatch(/^Mixed week/);
  });

  it('returns summary with exactly 2 days of data', () => {
    const days = [
      makeSlot('clear'),
      makeSlot('foggy'),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
      makeSlot(null),
    ];
    const result = computeSummary(days);
    expect(result).not.toBeNull();
  });
});

describe('buildWeekSlots', () => {
  it('returns 7 slots with correct day labels', () => {
    const slots = buildWeekSlots([]);
    expect(slots).toHaveLength(7);
    expect(slots.map((s) => s.dayLabel)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });

  it('maps history entries to correct slots', () => {
    // Get this Monday's date dynamically
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    const slots = buildWeekSlots([{ date: mondayStr, brainState: 'clear' }]);
    expect(slots[0].brainState).toBe('clear');
    expect(slots[0].color).not.toBeNull();
    expect(slots[1].brainState).toBeNull();
  });

  it('leaves slots null for days without history', () => {
    const slots = buildWeekSlots([]);
    for (const slot of slots) {
      expect(slot.brainState).toBeNull();
      expect(slot.color).toBeNull();
    }
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd mobile && npx jest src/hooks/__tests__/useBrainStateWeekTrend.test.ts --forceExit --no-coverage`

Expected: Tests should fail because the module doesn't exist yet (or pass if step 1 was already saved — verify the test file runs).

- [ ] **Step 4: Verify all tests pass**

Run: `cd mobile && npx jest src/hooks/__tests__/useBrainStateWeekTrend.test.ts --forceExit --no-coverage`

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/useBrainStateWeekTrend.ts mobile/src/hooks/__tests__/useBrainStateWeekTrend.test.ts
git commit -m "feat: add brain state week trend pure functions with tests"
```

---

### Task 2: React Hook

**Files:**
- Modify: `src/hooks/useBrainStateWeekTrend.ts`

- [ ] **Step 1: Add the `useBrainStateWeekTrend` hook to the existing file**

Append to the bottom of `src/hooks/useBrainStateWeekTrend.ts`:

```ts
/**
 * Hook that fetches 7-day brain state history and computes trend data.
 * Returns { days, summary, loading }.
 */
export function useBrainStateWeekTrend(userId: string | undefined) {
  const [trend, setTrend] = useState<WeekTrend>({ days: [], summary: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const history = await getBrainStateHistory(userId!, 7);
        if (cancelled) return;

        const mapped = history.map((h) => ({
          date: h.date,
          brainState: h.brainState,
        }));

        const days = buildWeekSlots(mapped);
        const summary = computeSummary(days);
        setTrend({ days, summary });
      } catch {
        // Fail silently — trend is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  return { ...trend, loading };
}
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `cd mobile && npx jest src/hooks/__tests__/useBrainStateWeekTrend.test.ts --forceExit --no-coverage`

Expected: All 8 tests PASS (hook code doesn't affect pure function tests).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useBrainStateWeekTrend.ts
git commit -m "feat: add useBrainStateWeekTrend hook"
```

---

### Task 3: Integrate Trend Section into BrainStateCheckin

**Files:**
- Modify: `src/components/dashboard/BrainStateCheckin.tsx`

- [ ] **Step 1: Add imports**

Add to the top of `BrainStateCheckin.tsx`:

```ts
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useBrainStateWeekTrend } from '../../hooks/useBrainStateWeekTrend';
```

- [ ] **Step 2: Add hook calls inside the component**

Inside the `BrainStateCheckin` component function, after the existing `useEffect` blocks, add:

```ts
  const navigation = useNavigation();
  const { user } = useAuth();
  const { days, summary, loading: trendLoading } = useBrainStateWeekTrend(user?.uid);
```

- [ ] **Step 3: Add a `refetch` trigger when check-in changes**

The hook currently fetches on mount only. To refresh after a new check-in, update the hook's dependency. Modify `useBrainStateWeekTrend` to accept an optional `refreshKey`:

In `src/hooks/useBrainStateWeekTrend.ts`, change the hook signature and effect dependency:

```ts
export function useBrainStateWeekTrend(userId: string | undefined, refreshKey?: string | null) {
```

And update the `useEffect` dependency array:

```ts
  }, [userId, refreshKey]);
```

Then in `BrainStateCheckin.tsx`, pass the current check-in state as the refresh key:

```ts
  const { days, summary, loading: trendLoading } = useBrainStateWeekTrend(
    user?.uid,
    currentCheckIn?.brainState
  );
```

- [ ] **Step 4: Replace the collapsed state JSX**

Replace the collapsed state block (the `if (!isExpanded && currentCheckIn)` return) with:

```tsx
  // Collapsed state (already checked in today)
  if (!isExpanded && currentCheckIn) {
    const selectedState = BRAIN_STATES.find((s) => s.state === currentCheckIn.brainState);
    if (!selectedState) return null;

    return (
      <View style={styles.container}>
        <View style={styles.collapsedRow}>
          <View style={styles.collapsedLeft}>
            <View style={[styles.dot, { backgroundColor: selectedState.color }]} />
            <Text style={styles.collapsedLabel}>{selectedState.label}</Text>
          </View>
          <TouchableOpacity onPress={handleChange} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.changeButton}>Change</Text>
          </TouchableOpacity>
        </View>

        {summary && (
          <View style={styles.trendSection}>
            <View style={styles.dotsRow}>
              {days.map((day, i) => (
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
              onPress={() => navigation.navigate('Insights' as never)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeWeekLink}>See your week →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
```

- [ ] **Step 5: Add styles**

Add these styles to the `StyleSheet.create` block:

```ts
  // Trend section
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
```

- [ ] **Step 6: Verify the app compiles**

Run: `cd mobile && npx expo export --platform ios --dump-sourcemap false 2>&1 | head -20`

Or start the dev server and check for TypeScript/compilation errors:

Run: `cd mobile && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 7: Run all existing tests to verify no regressions**

Run: `cd mobile && npx jest --forceExit --no-coverage`

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/hooks/useBrainStateWeekTrend.ts mobile/src/components/dashboard/BrainStateCheckin.tsx
git commit -m "feat: add 7-day brain state trend to collapsed check-in card"
```

---

### Task 4: Manual Testing Checklist

- [ ] **Step 1: Test with 0 days of data (new user)**

Open dashboard with no brain state history. Check in for the first time. Collapsed card should show only the state + Change button. No trend section visible.

- [ ] **Step 2: Test with 1 day of data**

After checking in once (today only), collapsed card should show state + Change button. No trend section (need 2+ days).

- [ ] **Step 3: Test with 2+ days of data**

If you have 2+ days of check-ins, the trend section should appear: colored dots, day labels, summary text, and "See your week →" link.

- [ ] **Step 4: Test "See your week" navigation**

Tap "See your week →" — should navigate to the Insights screen.

- [ ] **Step 5: Test changing brain state**

Tap "Change", select a different state. After the "Captured." overlay clears, the trend should refresh with the updated dot for today.
