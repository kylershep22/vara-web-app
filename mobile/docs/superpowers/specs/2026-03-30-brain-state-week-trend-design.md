# Brain State Week Trend — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Branch:** feature/admin-dashboard (will need its own branch)

## Problem

Users check in with their brain state daily but get no visible feedback loop beyond the immediate protocol recommendation. The data feeds the wellness score (V1 only, not shown in V2), weekly correlations, and AI coach context — but none of that is surfaced near the check-in itself. Users feel like their data "goes off into the darkness."

## Solution

Add a 7-day trend visualization with a summary line directly into the collapsed state of the BrainStateCheckin card. Link to the existing Insights screen for deeper analysis.

## Design

### Data & Hook: `useBrainStateWeekTrend`

**Location:** `mobile/src/hooks/useBrainStateWeekTrend.ts`

**Input:** `userId: string`

**Data source:** `getBrainStateHistory(userId, 7)` from `brainStateCheckIn.service.ts` (already exists)

**Returns:**
```ts
{
  days: Array<{
    date: string;          // YYYY-MM-DD
    dayLabel: string;      // Single letter: M, T, W, T, F, S, S
    brainState: BrainState | null;
    color: string | null;  // From BRAIN_STATES constant, null if no check-in
  }>;  // Always length 7, Monday-Sunday of current week
  summary: string | null;  // null if fewer than 2 days of data
}
```

**Summary generation logic:**

Brain state ranking (for trend calculation):
- foggy: 1
- wired: 2
- okay: 3
- clear: 4
- energized: 5

Rules (evaluated in order, first match wins):
1. **Dominant state** (3+ days with same state): "[State] {count} of {daysWithData} days"
2. **Trending better** (avg of last 3 days > avg of first 3 days by 0.5+): "Trending clearer this week"
3. **Trending worse** (avg of first 3 days > avg of last 3 days by 0.5+): "Trending foggier this week"
4. **Fallback**: "Mixed week" with top 2 states listed (e.g., "Mixed week — 2 clear, 2 foggy")

**Behavior:**
- Fetches on mount and when `currentCheckIn` changes (today's update refreshes trend)
- Returns `{ days: [...], summary: null }` if fewer than 2 days of data
- Returns `{ days: [], summary: null }` while loading

### UI: Collapsed Card Enhancement

**File:** `mobile/src/components/dashboard/BrainStateCheckin.tsx`

The collapsed state currently shows:
```
[dot] Clear                    Change
```

Enhanced collapsed state:
```
[dot] Clear                    Change
─────────────────────────────────────
●  ●  ○  ●  ●  ●  ●
M  T  W  T  F  S  S

Trending clearer this week
                    See your week →
```

**Visual details:**
- Separator: 1px top border using `Colors.border`, with `Spacing.md` margin above
- Dot row: 7 dots, each 10px diameter (matches existing `dot` style)
  - Filled dots: use brain state color from `BRAIN_STATES` constant
  - Empty dots (no check-in): muted outline circle, `Colors.border` border, transparent fill
- Day labels: single-letter abbreviations, `Colors.textSecondary`, `Typography.fontSize.xs`
- Summary text: `Colors.textSecondary`, `Typography.fontSize.xs`
- "See your week" link: right-aligned, `Colors.evergreenTeal`, `Typography.fontSize.xs`, navigates to `'Insights'` screen
- Spacing: `Spacing.sm` between dot row and day labels, `Spacing.sm` between day labels and summary, `Spacing.xs` between summary and link

**Conditional rendering:**
- Trend section only renders when hook returns `summary !== null` (2+ days of data)
- While hook is loading, only the existing collapsed row shows (no skeleton/spinner)

### Navigation

- "See your week" calls `navigation.navigate('Insights')`
- InsightsScreen already exists with weekly narrative, habit heatmap, and at-a-glance stats
- No new screens or routes needed
- Navigation prop needs to be passed into or accessed within BrainStateCheckin (via `useNavigation()`)

### Integration

- All changes self-contained in BrainStateCheckin component + new hook
- No changes to DashboardScreen.tsx
- No changes to useDashboard hook
- No changes to InsightsScreen

## Out of Scope

- Re-adding wellness score to V2 dashboard
- Modifying the Insights screen
- Push notifications or weekly summary notifications
- Changes to the expanded (pre-check-in) state of the card
- Morning check-in integration

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/useBrainStateWeekTrend.ts` | Create — new hook |
| `src/components/dashboard/BrainStateCheckin.tsx` | Modify — add trend section to collapsed state |

## Testing

- Hook unit test: verify summary logic for dominant state, trending better/worse, mixed, and insufficient data cases
- Component: verify trend section renders only when 2+ days exist, verify navigation on link tap
