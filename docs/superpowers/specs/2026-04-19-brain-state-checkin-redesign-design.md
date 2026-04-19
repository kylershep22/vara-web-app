# BrainStateCheckin Redesign

**Date:** 2026-04-19
**Status:** Draft
**Platform:** Mobile (React Native/Expo)
**Branch:** `feature/brain-checkin-entry-point`

---

## Overview

The `BrainStateCheckin` card was designed when the dashboard rendered many cards at once, so it had to be compact — a horizontal-scrolling strip of five small pills. The recent "locked state" redesign promoted this card to the dashboard's clear focal point (it's the only fully visible, fully interactive element before check-in). Its current visual weight no longer matches its role.

This spec redesigns the **expanded** and **captured** states so:

- All five options are visible without any scrolling on iPhone 12-class devices and up.
- Each option explains itself via its existing `description` (today hidden).
- The "Captured." moment celebrates the user's selection with a focused animation instead of a text swap.

The **collapsed / returning** state (post-checkin with week trend) is extracted into its own file for maintainability but its visual and behavior are unchanged.

### Design Principles

- **One screen, no scroll** — the card's core job is a single tap; make the tap targets fit the moment.
- **Self-explanatory options** — the description is part of the choice, not a label to be memorized.
- **Warm, deliberate feedback** — the captured state should feel like a small ritual, not a toast.
- **No em dashes in user-facing text.**
- **Reuse existing infrastructure** — existing haptics, hooks, and week-trend logic carry forward untouched.

---

## Expanded State

Replaces the current horizontal `ScrollView` of five pills with a vertical stack of five `BrainStateOptionRow` components.

### Layout

```
┌─────────────────────────────────────────────┐
│ How are you feeling right now?              │
│ Just one tap. No wrong answers.             │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ ● Wired                              │   │
│  │   Racing thoughts, can't settle      │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ● Foggy                              │   │
│  │   Low energy, hard to focus          │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ● Okay                               │   │
│  │   Nothing great, nothing bad         │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ● Clear                              │   │
│  │   Calm, present, ready               │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ● Energized                          │   │
│  │   Focused and sharp                  │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Prompt + subtext (unchanged)

- Prompt: "How are you feeling right now?" — `fontSize.lg`, `fontWeight.semibold`, `Colors.textPrimary`.
- Subtext: "Just one tap. No wrong answers." — `fontSize.xs`, `Colors.textSecondary`.
- Bottom margin of subtext: `Spacing.md` (reduced from `Spacing.lg` to give rows more room).

### Option order (unchanged spectrum)

1. Wired (`Colors.softCoral` — `#D97A6E`)
2. Foggy (`Colors.sunriseAmber` — `#F4C542`)
3. Okay (`Colors.mutedSageGray` — `#6F7F77`)
4. Clear (`Colors.evergreenTeal` — `#1B5E57`)
5. Energized (`Colors.freshMoss` — `#4A9B7E`, new token)

**New color token:** `Colors.evergreenTeal` and `Colors.success` are both `#1B5E57`, so using `Colors.success` for Energized makes Clear and Energized visually indistinguishable in the alpha-tinted-row layout. This spec introduces a new token `freshMoss: '#4A9B7E'` in `mobile/src/constants/colors.ts` for the Energized state. The token follows the existing `[adjective][nature]` naming convention (cf. `dewSage`, `sunriseAmber`, `softCoral`). `Colors.success` is untouched (it remains an alias for `evergreenTeal` for other call sites).

### Row styling (`BrainStateOptionRow`)

- Container: `Pressable` with `accessibilityRole="button"`, `accessibilityLabel={label}`, `accessibilityHint={description}`.
- Background: state color at ~12% alpha (see Color Utility below).
- Border: 1px solid, state color at ~30% alpha.
- `borderRadius: Layout.borderRadius.md` (= 8).
- Padding: vertical `Spacing.base` (= 16), horizontal `Spacing.lg` (= 24).
- Layout: `flexDirection: 'row'`, `alignItems: 'center'`.
- Gap between rows: `Spacing.sm` (= 12), achieved via `marginBottom` on the row (except the last).
- Leading dot: 12×12 circle, `borderRadius: 6`, solid `state.color`, `marginRight: Spacing.base`.
- Text column (flex 1):
  - Label: `fontSize.base` (= 16), `fontWeight.semibold` (= '600'), `Colors.textPrimary`.
  - Description: `fontSize.sm` (= 14), `Colors.textSecondary`, `marginTop: 2`.
- No trailing chevron.

### Interaction

- Pressed state: `activeOpacity: 0.85` via `Pressable` style callback (`pressed ? { opacity: 0.85 } : null`).
- Disabled (during `loading`): overall row opacity 0.5, `onPress` no-op. The existing loading overlay behavior is removed since selection is now handled by the captured animation (see below).

### Color Utility

A small helper used only by this component set converts a hex color into `rgba` with a given alpha:

```ts
// brainStateCheckin/colorUtils.ts
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

The five state colors are all 6-digit hex (`#F4C542`, `#D97A6E`, etc., verified in `Colors`). No need to handle 3-digit shorthand.

---

## Captured State

Replaces the current `showCaptured` text block with a focused celebration animation.

### Timing

| T | Event |
|---|---|
| 0ms | User taps a row. |
| 0ms | Light haptic fires (existing). |
| 0–200ms | Non-selected rows fade out (`opacity: 1 → 0`). Prompt + subtext fade out (same 200ms). |
| 0–180ms | Selected row scales `1.0 → 1.05` and background alpha jumps `~12% → ~25%` of its state color. |
| 50–200ms | Checkmark icon fades in on the right side of the selected row (`MaterialCommunityIcons "check-circle"`, 22px, state color), 150ms fade. |
| ~800ms | Success haptic fires (existing `NotificationFeedbackType.Success`). |
| ~1200ms | `onComplete()` callback fires → `BrainStateCheckin` unmounts the captured view and renders the collapsed view. |

Total selection-to-collapsed time: **~1.2s** (current: 2.0s).

### Implementation notes

- Use `react-native-reanimated` shared values and `withTiming`. The animation sequence is locally owned by `BrainStateCapturedView`; `BrainStateCheckin` only renders it and waits for `onComplete`.
- The non-selected rows are rendered inside the captured view (full state list) so the user sees them fade, rather than swapping the whole card content immediately.
- Haptics are fired via `useEffect` with timers cleaned up on unmount.
- The existing loading overlay is no longer needed — if the network `onSelect` call takes longer than the captured animation, the orchestrator still transitions to collapsed on the 1.2s schedule; loading state is now invisible to the user (any error would be surfaced by the existing error banner on the dashboard).

---

## Component Structure

### File layout

```
mobile/src/components/dashboard/
├── BrainStateCheckin.tsx                               (orchestrator — shrinks)
└── brainStateCheckin/
    ├── brainStateOptions.ts                            (new — BRAIN_STATES array)
    ├── colorUtils.ts                                   (new — withAlpha helper)
    ├── BrainStateOptionRow.tsx                         (new)
    ├── BrainStateCapturedView.tsx                      (new)
    ├── BrainStateCollapsedView.tsx                     (new — extracted, no visual change)
    └── __tests__/
        ├── BrainStateOptionRow.test.tsx                (new)
        ├── BrainStateCapturedView.test.tsx             (new)
        └── colorUtils.test.ts                          (new)
```

The existing `BrainStateCheckin.tsx` shrinks from ~309 lines to ~80 lines, containing only state, handlers, and conditional view selection.

### `brainStateOptions.ts`

Exports the `BRAIN_STATES` array with the same shape as today, moved out of `BrainStateCheckin.tsx` so both `BrainStateCapturedView` (for description/color lookup) and `BrainStateOptionRow` can consume it.

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

### `BrainStateOptionRow` props

```ts
interface BrainStateOptionRowProps {
  option: BrainStateOption;
  selected?: boolean;         // optional marker for "user already chose this, came back via Change"
  disabled?: boolean;
  isLast?: boolean;           // suppress marginBottom on the last row
  onPress: (state: BrainState) => void;
  testID?: string;
}
```

`selected` is used only when the user has tapped "Change" and we want to highlight their current pick on the expanded view (border alpha ~60% instead of 30%, plus a checkmark). This keeps the expanded state consistent with the collapsed state.

### `BrainStateCapturedView` props

```ts
interface BrainStateCapturedViewProps {
  selectedState: BrainState;
  onComplete: () => void;
}
```

Uses `BRAIN_STATES` internally to look up the full option data. Owns all timers (tap → fade → complete) and haptics for the captured phase. Calls `onComplete` after `1200ms`.

### `BrainStateCollapsedView` props

Accepts the same data `BrainStateCheckin.tsx` currently computes inline:

```ts
interface BrainStateCollapsedViewProps {
  selectedState: BrainStateOption;
  onChangePress: () => void;
  days: DaySlot[];  // from useBrainStateWeekTrend (DaySlot is the hook's exported type)
  summary: string | null;
  trendLoading: boolean;
}
```

This is a pure re-extraction. No visual change, no behavior change. `BrainStateCheckin` remains the owner of `useBrainStateWeekTrend`; it passes the resolved values down.

### `BrainStateCheckin` orchestrator

Remains the top-level public component. Post-split:

```tsx
export const BrainStateCheckin: React.FC<BrainStateCheckinProps> = ({
  currentCheckIn,
  onSelect,
  loading = false,
}) => {
  const [phase, setPhase] = useState<'expanded' | 'captured' | 'collapsed'>(
    currentCheckIn ? 'collapsed' : 'expanded'
  );
  const [pendingSelection, setPendingSelection] = useState<BrainState | null>(null);
  const { user } = useAuth();
  const navigation = useNavigation();
  const { days, summary, loading: trendLoading } = useBrainStateWeekTrend(
    user?.uid,
    currentCheckIn?.brainState
  );

  // ...handlers omitted for brevity

  if (phase === 'captured' && pendingSelection) {
    return (
      <BrainStateCapturedView
        selectedState={pendingSelection}
        onComplete={() => setPhase('collapsed')}
      />
    );
  }

  if (phase === 'collapsed' && currentCheckIn) {
    const selected = BRAIN_STATES.find((s) => s.state === currentCheckIn.brainState);
    if (!selected) return null;
    return (
      <BrainStateCollapsedView
        selectedState={selected}
        onChangePress={() => setPhase('expanded')}
        days={days}
        summary={summary}
        trendLoading={trendLoading}
      />
    );
  }

  return (
    <BrainStateExpandedView
      currentSelection={currentCheckIn?.brainState ?? null}
      disabled={loading}
      onSelect={(state) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(state);
        setPendingSelection(state);
        setPhase('captured');
      }}
    />
  );
};
```

The existing `showCaptured` flag and its 2s `setTimeout` are removed from `BrainStateCheckin`; that timing is now owned by `BrainStateCapturedView`.

A small `BrainStateExpandedView` is created inline within `BrainStateCheckin.tsx` (not a separate file — it's ~25 lines of JSX that maps over `BRAIN_STATES` and renders `BrainStateOptionRow`s alongside the prompt/subtext).

---

## Device Sizing

Minimum supported viewport: **iPhone 12 class (~844pt screen height) or equivalent Android with ~700pt usable height**. This gives the card ~500pt of vertical space after the greeting header, safe areas, and tab bar. Five rows at 72pt each plus prompt (~60pt) fit comfortably.

**Out of scope for this spec:** SE-class device support (iPhone SE 2nd/3rd gen, 667pt screens). If a user is on a pre-iPhone-12 device and rows overflow the viewport, the existing ScrollView-based dashboard handles the overflow at the page level — there is no internal scrolling or responsive branch inside the card.

This matches the app's general support posture (no explicit SE polish in recent features) and keeps the card implementation simple.

---

## Color Alpha Values

| Surface | Alpha |
|---|---|
| Expanded row background (idle) | `0.12` |
| Expanded row border (idle) | `0.30` |
| Expanded row border (selected, after "Change") | `0.60` |
| Captured row background (winning row) | `0.25` |

All computed via `withAlpha(color, n)` from `colorUtils.ts`.

---

## Testing

### Unit tests

**`BrainStateOptionRow.test.tsx`:**
- Renders the option's label and description.
- Renders a dot styled with the state's color (via `testID={dot-${state}}`).
- Invokes `onPress` with the option's state when tapped.
- Does not invoke `onPress` when `disabled`.
- Shows a checkmark icon when `selected` is true.
- Applies `marginBottom: 0` when `isLast` is true (inspected via style prop).

**`BrainStateCapturedView.test.tsx`:**
- Renders the selected option's label, description, and dot.
- Renders a checkmark icon on the selected row.
- Calls `onComplete` after ~1200ms (verified with `jest.useFakeTimers()` and `jest.advanceTimersByTime`).

**`colorUtils.test.ts`:**
- `withAlpha('#D97A6E', 0.12)` returns `'rgba(217, 122, 110, 0.12)'`.
- `withAlpha('#F4C542', 0.3)` returns `'rgba(244, 197, 66, 0.3)'`.

### Integration test (extended from component behavior)

Add or extend a `BrainStateCheckin.test.tsx`:
- With `currentCheckIn === null`, renders 5 option rows.
- Tapping a row transitions to the captured view showing that state.
- After captured timer completes, renders the collapsed view with the state.
- When `currentCheckIn` is provided on mount, renders the collapsed view immediately.
- Tapping "Change" in the collapsed view returns to the expanded view.

### Manual test plan

1. Open app in pre-checkin state on an iPhone 12+ simulator. Verify all 5 options visible without scrolling.
2. Verify the prompt and subtext are readable and don't crowd the options.
3. Tap each of the 5 states in separate runs:
   - Selected row scales up and highlights.
   - Other 4 rows and the prompt fade out.
   - Checkmark appears on the selected row.
   - After ~1.2s, transitions to collapsed view with the selected state and week-trend dots.
4. Verify haptics: light on tap, success near the end of the captured sequence.
5. Tap "Change" in the collapsed view — verify expanded view returns, all 5 options visible, previously selected state shows the `selected` highlight (border + checkmark).
6. Accessibility (VoiceOver/TalkBack): focus moves across rows in spectrum order; each row announces "[Label], button, [description]".

---

## Files Affected

| File | Change |
|---|---|
| `mobile/src/constants/colors.ts` | Add `freshMoss: '#4A9B7E'` token |
| `mobile/src/hooks/useBrainStateWeekTrend.ts` | Update `STATE_COLORS.energized` to `Colors.freshMoss` (single line) |
| `mobile/src/components/dashboard/BrainStateCheckin.tsx` | Rewrite: orchestrator + inline `BrainStateExpandedView` |
| `mobile/src/components/dashboard/brainStateCheckin/brainStateOptions.ts` | New: shared `BRAIN_STATES` array |
| `mobile/src/components/dashboard/brainStateCheckin/colorUtils.ts` | New: `withAlpha` helper |
| `mobile/src/components/dashboard/brainStateCheckin/BrainStateOptionRow.tsx` | New |
| `mobile/src/components/dashboard/brainStateCheckin/BrainStateCapturedView.tsx` | New |
| `mobile/src/components/dashboard/brainStateCheckin/BrainStateCollapsedView.tsx` | New (extracted, no visual change) |
| `mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateOptionRow.test.tsx` | New |
| `mobile/src/components/dashboard/brainStateCheckin/__tests__/BrainStateCapturedView.test.tsx` | New |
| `mobile/src/components/dashboard/brainStateCheckin/__tests__/colorUtils.test.ts` | New |

The dashboard barrel (`mobile/src/components/dashboard/index.ts`) already re-exports `BrainStateCheckin`. The new sub-folder files are internal to the redesign and do not need barrel entries — they are consumed only by `BrainStateCheckin.tsx` via direct path imports.

---

## Out of Scope

- Changes to brain-state data shape, `BRAIN_STATES` contents, or spectrum ordering.
- Changes to the week-trend logic in `useBrainStateWeekTrend` or the collapsed view's visual design. (Exception: the hook's `STATE_COLORS` mapping for `energized` is updated from `Colors.success` to `Colors.freshMoss` so the week-trend dot color stays consistent with the option row color. No other hook logic changes.)
- Changes to how `onSelect` is plumbed through `useDashboard` to Firestore.
- SE-class (pre-iPhone-12) device polish.
- Dark mode support (the card uses alpha-tinted light backgrounds which would need rework for dark mode; deferred).
- Full reordering animation of other rows sliding up/down when the selected row is chosen (rows fade in place, do not reposition).
