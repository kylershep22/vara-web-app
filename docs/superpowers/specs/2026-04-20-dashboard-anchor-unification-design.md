# Dashboard Anchor Unification

**Date:** 2026-04-20
**Status:** Draft — spec only, no implementation
**Platform:** Mobile (React Native/Expo)
**Branch:** `feature/brain-checkin-entry-point`

---

## Overview

`BrainBrief` and `BrainStatusBar` are currently two components that render in mutually exclusive phases of the post-check-in dashboard. `BrainBrief` (`mobile/src/components/dashboard/BrainBrief.tsx`) renders only once per session — it appears after check-in, the `hasSeenBriefThisSession` flag flips, and the component is replaced by `BrainStatusBar` (`mobile/src/components/dashboard/BrainStatusBar.tsx`) which is a compact status row. This breaks the product principle that the brief is the **anchor** of the post-check-in experience: the anchor vanishes.

This spec defines a single unified component, `DashboardAnchor`, with two visual states (expanded brief + collapsed status bar) and continuous persistence across the day. The user should have one visible thread back to their check-in from morning through night, never a one-shot message.

### Goals

- One component, two visual states (expanded / collapsed), seamlessly toggled.
- Persistent from check-in through end-of-day — no session-based vanishing.
- Preserves the state-change flow currently provided by `BrainStatusBar` (tap to re-check-in).
- Replaces all existing uses of `BrainBrief` and `BrainStatusBar`.

### Non-Goals

- Cross-tab persistence (anchor stays on the Dashboard tab for v1).
- Dynamic content that updates by time of day (static per check-in for v1).
- Multi-check-in timeline / history display.

---

## 1. Component structure

**Recommendation: a single component with internal state.**

```
DashboardAnchor
├── renders expanded view (full brief) when `collapsed === false`
└── renders compact view (status bar) when `collapsed === true`
```

### Tradeoff

| Option | Pros | Cons |
|---|---|---|
| **A) Single component, internal state** (recommended) | One source of truth. Encapsulated. Matches the `BrainStateCheckin` orchestrator pattern we established. Tests directly exercise both visual states through the same public API. | Tighter coupling between the two visual presentations. If one grows much more complex, the single file may exceed a reasonable size. |
| B) Two child components + shared context | Each visual state is its own file and can be tested in isolation. Context lets non-adjacent UI read the anchor state. | Over-engineered for two co-located visual states. Requires building and wiring a context provider. Cross-tab persistence (a non-goal today) is the only strong reason to reach for context. |

Internally, the component owns:
- `collapsed: boolean` — visual state
- Potentially `persistedCollapsedRef` (AsyncStorage) if we want to remember the state across app launches — see Question Q3 in Open Questions.

---

## 2. Collapse / expand behavior

### Triggers

| Trigger | Behavior |
|---|---|
| **User tap on anchor** | Toggle collapsed ↔ expanded. Primary interaction. |
| **Scroll past ~200px of dashboard content** | Auto-collapse. |
| **Scroll back above ~50px** | Auto-expand. Scroll tracking is **continuous**, not a one-shot threshold. The anchor acts as a companion to the scroll position. |
| **Timer** | Not used. Auto-collapsing on a timer feels like the app is rushing the user. Violates "calm over pressure." |
| **Re-check-in** | New check-in re-expands the anchor with the new brief (see Section 4). |

The manual tap and the scroll tracker interact through a small precedence rule: after a manual tap within the same render, the scroll-driven auto-behavior is paused until the user crosses the opposite threshold. This prevents the anchor from jittering if the user manually collapses while slightly above the collapse threshold.

### Initial state

- **Immediately after a check-in completes** (returning from `BrainStateCheckin`'s captured view): expanded.
- **On subsequent dashboard mounts within the same check-in day**: remembered — whatever state the user last left it in (via AsyncStorage keyed on the check-in doc's date, e.g., `dashboard_anchor_collapsed_2026-04-20`).
- **On the first mount of a new check-in day**: expanded, regardless of yesterday's state. Persistence key is date-scoped, so a new day's key doesn't exist yet, so the component defaults to expanded.

### Animation

- Collapse ↔ expand: animated height + opacity cross-fade. Expanded view fades out as compact bar fades in. Reanimated `withTiming(duration: 250ms)`.
- Entry (fresh mount after check-in): the existing `SlideInUp.duration(300).springify()` from `BrainBrief` carries over. The entry is from the captured-view transition, not a fresh mount of the dashboard.
- Does NOT reuse the `LockedDivider` blur-reveal animation — that animation exists specifically to remove the pre-check-in mute. The anchor has different semantics: collapse/expand is a user-driven refinement, not a phase unlock. A simple height/opacity transition reads more naturally.

### Sticky behavior

- The collapsed anchor sticks to the top of the scroll viewport. As the user scrolls down past its original position, it transitions to a thin bar anchored at the top of the visible area.
- When scrolled back above the anchor's original position, it returns to its inline location.
- Implementation: use the `stickyHeaderIndices` prop on `Animated.ScrollView`, with the anchor at a known index, OR position the anchor absolutely with a `translateY` animated from the `scrollY` shared value. The second approach integrates more cleanly with the blur/opacity animations we're already driving via reanimated, so it is the preferred path.

---

## 3. Content freshness

**Recommendation for v1: static content per check-in.**

The brief message is selected at check-in time (today's behavior in `BRAIN_STATE_CONFIG` in `BrainBrief.tsx`) and remains the same until a new check-in occurs. At 3pm the user still sees the brief generated from their 8am Foggy check-in — because that's what their brain signal was this morning, and nothing meaningful has told the app it has changed.

### Why static

- No backend call required. No new data fetching, no cache invalidation.
- Matches the voice principle that the brief is a considered response to the user's state, not a stream of suggestions.
- Users who want a different brief can re-check-in (Section 4).

### What a "time of day" variant would need

Listed for future reference only, not proposed for this spec:

- A second field on the check-in record (e.g., `briefVariants: { morning, afternoon, evening }`) OR server-side generation at read time.
- Logic to decide which variant is "current" based on local time zone.
- UI to smoothly replace the brief text when the variant changes.
- Product decision on whether the change is silent (text just swaps) or announced (toast or subtle shimmer).

This is a non-trivial feature; it should not ride along with this refactor.

---

## 4. Re-check-in behavior

**Recommendation: replace, with a brief fade transition.**

When the user taps the anchor's "Change" affordance (today's `BrainStatusBar` state picker), completes a new state selection, and `useDashboard` writes a new check-in to Firestore:

1. The anchor is animated out (opacity → 0, 150ms).
2. The new check-in's brainState is received via props.
3. The anchor is re-mounted in the expanded state with the new brief (uses the same `SlideInUp` entry as a fresh check-in).
4. The collapsed/expanded session memory is reset — the new brief starts expanded even if the previous one was collapsed.

### Why replace

- Appending (showing old + new) creates a timeline UI we don't have and haven't designed. Adds clutter.
- A single current anchor matches the "one primary signal" principle.
- The user voluntarily initiated the change; they expect the UI to reflect it immediately.

### What the re-check-in flow looks like UI-side

The collapsed anchor has a "Change" touch target. Tapping it opens the **redesigned `BrainStateCheckin` expanded view in place** — displacing the anchor in the dashboard layout until the new check-in completes. No modal, no navigation. The check-in lives in the same layout slot it occupies during the `pre-checkin` phase.

Sequence:
1. User taps "Change" on the collapsed anchor.
2. Anchor animates out (opacity → 0, 150ms).
3. `BrainStateCheckin` renders in the same slot (expanded view, current selection highlighted per the existing `selected` prop flow).
4. User picks a state. The captured animation from `BrainStateCheckin` plays (existing 1.2s sequence).
5. On `onComplete`, the anchor re-mounts with the new brief, expanded, with `SlideInUp` entry.

This means `DashboardScreen` treats the anchor slot and the check-in slot as the same physical slot, switched by orchestration state. Internally, this state (`showCheckInOverAnchor: boolean`) is owned by `DashboardScreen` or by a thin wrapper that composes both components, not by the anchor itself. See Section 7 for implementation notes.

---

## 5. Cross-tab persistence

**Recommendation: dashboard-only for v1.**

The anchor lives inside `DashboardScreen.tsx`'s render tree. When the user leaves the Dashboard tab, the anchor unmounts (or at minimum goes off-screen). When they return:

- If within the same day: the anchor re-renders with the current day's check-in data. Its collapsed/expanded state depends on Question Q3.
- If the day has rolled over and there is no new check-in: the anchor is not rendered (we're in the pre-check-in phase and `BrainStateCheckin` is shown instead).

### Why dashboard-only

- Adding a persistent app-wide header is a layout-level commitment that affects every screen's safe-area math, every modal's entrance animation, every scroll container's offset. It's a separate project.
- The dashboard is the home tab; users return there frequently. A dashboard anchor is already highly visible.

### What app-wide would cost (out of scope)

- A new `AppAnchorProvider` context that mounts above the tab navigator.
- Every screen's `SafeAreaView` / scroll containers re-tested.
- A dedicated dismiss / minimize affordance becomes more important because the anchor is always in the user's field of view.
- Keyboard interaction considerations on every screen.

Can be revisited after v1 data shows whether users engage with the anchor enough on the Dashboard to justify the cost.

---

## 6. Dismissibility

**Recommendation: not dismissible; collapsible only.**

The product direction is that the anchor is load-bearing — the user's check-in should always be recoverable, and hiding it entirely invites users to disengage from the brain-health loop.

### Edge cases worth flagging (not currently accommodated)

| Edge case | Consideration |
|---|---|
| User checked in "Wired" at 8am, tried a protocol, still feels wired at 2pm | They see the "Wired" anchor all afternoon. Could feel like a label they can't shed. Mitigation: "Change" is always tappable. |
| User opens the app only to journal, doesn't want to engage with today's state | The compact collapsed anchor is small and uninvasive. It doesn't block the user from using the rest of the app. Probably acceptable. |
| User with ADHD finds persistent elements distracting | Collapsed state is minimal. If beta feedback shows this as a real pain point, add a Settings-level preference ("Minimize dashboard anchor by default") rather than a per-session dismiss. |
| User wants to skip today entirely (rest day, sick day) | They simply don't check in; the pre-check-in dashboard is shown. No anchor is needed. But what if they checked in once, then want to "take it back"? Today there is no delete flow. See Question Q6. |
| VoiceOver user tabs through the dashboard repeatedly | The anchor is announced every time focus lands on it. Adding an `accessibilityHint` like "Double-tap to collapse" reduces friction. But if they explicitly collapse it, VoiceOver should still announce the collapsed form. |

If any of these prove to be a real pain point, a Settings-level "Show dashboard anchor" toggle is the right escape hatch — not a per-session dismiss button on the anchor itself.

---

## 7. Implementation plan

### File structure

```
mobile/src/components/dashboard/
├── DashboardAnchor/                              (NEW folder)
│   ├── DashboardAnchor.tsx                       (NEW — main component)
│   ├── DashboardAnchorExpanded.tsx               (NEW — expanded view, internal)
│   ├── DashboardAnchorCollapsed.tsx              (NEW — collapsed view, internal)
│   ├── brainStateBriefs.ts                       (NEW — content map, extracted from BrainBrief)
│   └── __tests__/
│       ├── DashboardAnchor.test.tsx              (NEW — behavior: collapse, expand, re-check-in)
│       └── brainStateBriefs.test.ts              (NEW — content shape)
├── BrainBrief.tsx                                (DELETE after migration)
└── BrainStatusBar.tsx                            (DELETE after migration)
```

### Component API

```ts
interface DashboardAnchorProps {
  brainState: BrainState;
  protocolCompleted: boolean;
  checkInDate: string;                    // "YYYY-MM-DD" for the current check-in. Used as AsyncStorage key suffix for collapsed-state persistence.
  onChangeStatePress: () => void;         // Called when the user taps "Change" on the collapsed view.
  scrollY: Animated.SharedValue<number>;  // Required — drives scroll-based auto-collapse.
}
```

The component accepts a `scrollY` shared value (driven by `DashboardScreen`'s `Animated.ScrollView`) so the scroll-triggered collapse/expand logic lives inside the anchor and drives its own reanimated styles without requiring the parent to manage anchor state.

### Shared state / context

None at component level. Internal state only:

```ts
const [collapsed, setCollapsed] = useState(false);        // visual state
const [manualOverrideUntilCross, setManualOverrideUntilCross] = useState(false);
```

- `collapsed` is hydrated on mount from `AsyncStorage.getItem('dashboard_anchor_collapsed_' + checkInDate)`.
- On every change to `collapsed`, the new value is written to that same key.
- `manualOverrideUntilCross` is set to `true` when the user manually taps to toggle. It pauses scroll-driven auto-transitions. Reset to `false` once the scroll position crosses the opposite threshold (e.g., if the user manually collapses, the scroll auto-expand stays suppressed until they scroll *back up past the collapse threshold*, at which point scroll-driven behavior resumes).

### Re-check-in slot wiring

The decision that "Change" opens the full `BrainStateCheckin` expanded view **in place** requires a small orchestration wrapper in `DashboardScreen.tsx` (or a new thin component if `DashboardScreen` gets too dense):

```tsx
// Inside DashboardScreen's render tree, in the slot formerly holding
// BrainBrief / BrainStatusBar:
{showCheckInOverAnchor ? (
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
)}
```

`showCheckInOverAnchor` is a new local state in `DashboardScreen`. It is `true` only between the moment the user taps "Change" and the moment the new check-in completes.

### Accessibility

When collapsed, the anchor's `accessibilityLabel` contains the **full brief message**, not the abbreviated collapsed copy. Example label for a Foggy user:

> "Foggy. Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in. Protocol ready. Double-tap to expand, or swipe right to change state."

This ensures screen-reader users get the same information as sighted users, even though the visible text is compressed. The `accessibilityHint` carries the interaction guidance ("Double-tap to expand...").

When expanded, the `accessibilityLabel` is the label + message pair, and the hint says "Double-tap to collapse."

### Approximate LOC impact

| File | LOC |
|---|---|
| `DashboardAnchor.tsx` (orchestrator + state + animations + sticky) | ~130 |
| `DashboardAnchorExpanded.tsx` (expanded view, extracted from BrainBrief) | ~70 |
| `DashboardAnchorCollapsed.tsx` (collapsed view, extracted from BrainStatusBar minus the pill picker) | ~60 |
| `brainStateBriefs.ts` (the `BRAIN_STATE_CONFIG` map) | ~40 |
| `__tests__/DashboardAnchor.test.tsx` | ~120 |
| `__tests__/brainStateBriefs.test.ts` | ~30 |
| `DashboardScreen.tsx` (replace two render cases with one, wire `scrollY`) | net -20 |
| `useDashboard.ts` (remove `hasSeenBriefThisSession`, simplify phase logic — see below) | net -10 |
| Delete `BrainBrief.tsx` + `BrainStatusBar.tsx` | -250 |

**Net LOC delta:** approximately +140 new, -280 removed = **net -140 LOC** in the mobile code base. The unification simplifies the system.

### Load-bearing refactors (must happen first)

These are not cosmetic — the visible change is not possible without them.

1. **Collapse `dashboardPhase` from `'post-checkin' | 'returning'` into a single `'checked-in'` phase.**
   - The distinction exists today purely to drive BrainBrief's one-shot rendering.
   - With a persistent anchor, there is no first-view vs. later-view split.
   - Files touched: `mobile/src/hooks/useDashboard.ts` (`dashboardPhase` type and assignment logic), and all `DashboardScreen.tsx` references that switch on `'post-checkin'` vs `'returning'`.
   - Pre-check-in phase remains.

2. **Remove `hasSeenBriefThisSession.current` from `useDashboard.ts`.**
   - The whole purpose of this flag was to collapse the brief after one view. No longer needed.

3. **Drop the `BrainStatusBar` expanded pill picker.**
   - The expanded state picker inside the old `BrainStatusBar` (the horizontal row of five colored pills) is the pre-redesign visual language. The anchor should invoke `BrainStateCheckin`'s full expanded view for re-check-in, matching the visual language we just shipped.
   - This is a behavior change for the re-check-in flow: a modal / full screen or inline expansion of the real check-in component rather than a pill row.
   - See Question Q2 for the UI approach.

4. **Thread a `scrollY` shared value from `DashboardScreen`'s `ScrollView` down to the anchor.**
   - Replace the current plain `ScrollView` in `DashboardScreen.tsx` with `Animated.ScrollView` and drive a `scrollY` shared value via `useAnimatedScrollHandler`.
   - The anchor consumes `scrollY` to decide when to auto-collapse.

### Tests

**`DashboardAnchor.test.tsx`**
- Renders the expanded view by default with the correct brain state's message.
- Tapping the anchor toggles to collapsed.
- Tapping again toggles back to expanded.
- Re-check-in (prop change of `brainState`) re-mounts in the expanded state.
- `protocolCompleted` prop controls the collapsed view's "Protocol done / ready" copy.
- Tapping "Change" in the collapsed view calls `onChangeStatePress`.

**`brainStateBriefs.test.ts`**
- Map has exactly five entries (wired, foggy, okay, clear, energized).
- Each entry has non-empty emoji, label, message, and accentColor fields.
- Brand-voice patterns (no em dashes, no "unlock" language, no "Don't miss" etc.) are not present.

**Integration tests (lightweight)**
- `DashboardScreen` in `checked-in` phase renders `DashboardAnchor`.
- `DashboardScreen` in `pre-checkin` phase does NOT render `DashboardAnchor`.

No manual test plan duplication — the existing dashboard QA flow covers the user-visible behavior.

---

## 8. Migration

**Recommendation: one-shot.**

### Why one-shot is safe

- `BrainBrief` is imported and rendered only in `DashboardScreen.tsx` (line 286 after the recent render-order refactor). Grep confirms no other consumers.
- `BrainStatusBar` is imported and rendered only in `DashboardScreen.tsx` (line 290). Grep confirms no other consumers.
- There are no external tests asserting on these components' rendered output beyond what the dashboard tests cover.
- Both files are slated for deletion; their responsibilities are fully absorbed into `DashboardAnchor`.

### Migration steps (in order)

1. **Create `DashboardAnchor` and its internal files** with tests. Do not wire into `DashboardScreen` yet.
2. **Refactor `useDashboard.ts`** to collapse `dashboardPhase` to `'pre-checkin' | 'checked-in'` and remove the brief-seen flag. Update all `DashboardScreen` switch sites.
3. **Convert `DashboardScreen`'s `ScrollView` to `Animated.ScrollView`** and expose `scrollY`. Pass down to the new anchor.
4. **Replace `<BrainBrief />` and `<BrainStatusBar />` with `<DashboardAnchor />`** in `DashboardScreen.tsx`. One render site now covers both formerly-phase-dependent branches.
5. **Delete `BrainBrief.tsx` and `BrainStatusBar.tsx`**. Remove their imports from `DashboardScreen`.
6. **Delete the `STATE_COLORS` duplicate** in `BrainStatusBar.tsx` if that logic needs to be kept — confirm it's either unused elsewhere or migrate to `brainStateBriefs.ts`.
7. **Full dashboard QA pass.**

No feature flag. No phased rollout. Each step is a small commit; the visible change lands on step 4.

---

## Resolved decisions

Answered by the product owner after the initial spec review:

| # | Decision |
|---|---|
| Q1 | Scroll-driven auto-collapse is **continuous**: collapse at scrollY > 200, re-expand at scrollY < 50. Manual tap temporarily pauses auto-behavior until the opposite threshold is crossed. |
| Q2 | "Change" on the collapsed anchor **opens the full `BrainStateCheckin` expanded view in place** (displacing the anchor in its own layout slot). No modal, no navigation. Handled by a new `showCheckInOverAnchor` local state in `DashboardScreen`. |
| Q3 | Initial collapsed state on dashboard re-entry is **remembered within the same check-in day** (persisted to AsyncStorage keyed on the check-in doc's date). **Resets to expanded on a new day** — because a new day produces a new storage key that doesn't yet exist. |
| Q4 | Collapsed anchor **sticks to the top of the scroll viewport**. Implementation via absolute positioning + `scrollY`-driven `translateY`, to compose cleanly with the existing reanimated blur/opacity animations. |
| Q7 | When collapsed, the anchor's `accessibilityLabel` contains the **full brief message** (not the abbreviated visible copy), so screen-reader users receive the same information as sighted users. |

## Deferred open questions

Can be revisited after v1 data. Not blockers for implementation.

| # | Question |
|---|---|
| **Q5** | Does the brief's content need to be re-generated if the user checks in twice with the same state? (Today: identical. Value unclear; cost non-trivial.) |
| **Q6** | If a user wants to undo a check-in, is that supported? (No undo flow exists today.) |
| **Q8** | Does the anchor need a loading state for the brief? (Not needed for static content in v1; becomes relevant only if Q5 introduces async content.) |

---

## Summary

| Decision | Final |
|---|---|
| Component structure | Single component, internal state |
| Primary trigger | User tap |
| Secondary trigger | Continuous scroll tracking (collapse > 200px, expand < 50px) |
| Timer auto-collapse | Not used |
| Initial state on mount | Remembered within the day; expanded on a new day |
| Content freshness | Static per check-in for v1 |
| Re-check-in UI | Full `BrainStateCheckin` expanded view, in place |
| Sticky | Yes, collapsed anchor sticks to top on scroll |
| Accessibility | Collapsed `accessibilityLabel` contains full brief |
| Cross-tab | Dashboard-only for v1 |
| Dismissibility | Collapsible only, not dismissible |
| Migration | One-shot after the load-bearing refactors land |

All blocker questions resolved. This spec is implementation-ready.
