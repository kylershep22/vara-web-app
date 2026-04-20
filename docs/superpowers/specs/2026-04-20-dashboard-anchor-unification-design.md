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

| Trigger | Recommended behavior |
|---|---|
| **User tap on anchor** | Toggle collapsed ↔ expanded. Primary interaction. |
| **Scroll past ~200px of dashboard content** | Auto-collapse (one-way). Feels natural: the anchor tucks away as the user engages with the rest of the dashboard. |
| **Scroll back to top** | Auto-expand only if the user never manually collapsed it this session. Once the user manually toggles, respect their intent for the rest of the session. |
| **Timer** | **Not recommended.** Auto-collapsing on a timer feels like the app is rushing the user. Violates "calm over pressure." |
| **Re-check-in** | New check-in re-expands the anchor with the new brief (see Section 4). |

### Initial state

- Immediately after a check-in completes (returning from `BrainStateCheckin`'s captured view): **expanded**.
- On subsequent dashboard mounts (navigating back to the tab, opening the app later in the day): see Question Q3.

### Animation

- Collapse ↔ expand: animated height + opacity cross-fade. Expanded view fades out as compact bar fades in. Reanimated `withTiming(duration: 250ms)`.
- Entry (fresh mount after check-in): the existing `SlideInUp.duration(300).springify()` from `BrainBrief` carries over. The entry is from the captured-view transition, not a fresh mount of the dashboard.
- Does NOT reuse the `LockedDivider` blur-reveal animation — that animation exists specifically to remove the pre-check-in mute. The anchor has different semantics: collapse/expand is a user-driven refinement, not a phase unlock. A simple height/opacity transition reads more naturally.

### Sticky behavior

- When collapsed **during scroll**, the anchor sticks to the top of the scroll viewport as a thin bar until the user scrolls back above its original position.
- When **at top of scroll** (no scroll), collapsed or expanded, the anchor sits inline in its natural position.
- See Question Q4 for the sticky implementation approach.

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

The collapsed anchor already has a "Change" touch target today (`BrainStatusBar` chevron opens the inline state picker). The unified component keeps that affordance in the collapsed view. Tapping "Change" opens the redesigned `BrainStateCheckin` expanded view (not the legacy inline pill row — see Section 7's notes on `BrainStatusBar`'s pill regression).

See Question Q2: should the "Change" action open the full `BrainStateCheckin` screen / modal, or should it expand a state picker inside the anchor?

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
  onChangeStatePress: () => void;        // Opens the BrainStateCheckin expanded view
  scrollY?: Animated.SharedValue<number>; // Optional — enables scroll-based collapse
}
```

The component accepts a `scrollY` shared value (driven by `DashboardScreen`'s `ScrollView`) so the scroll-triggered collapse logic can live inside the anchor and drive its own reanimated style without requiring the parent to manage anchor state.

### Shared state / context

None at component level. Internal state only:

```ts
const [collapsed, setCollapsed] = useState(false);
const [userLocked, setUserLocked] = useState(false); // set true after manual toggle
```

`userLocked` ensures a user who explicitly collapsed the anchor doesn't see it auto-expand on a scroll-to-top event.

### Approximate LOC impact

| File | LOC |
|---|---|
| `DashboardAnchor.tsx` (orchestrator + state + animations) | ~100 |
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

## Open questions

Questions the implementer should not answer on their own. Product decisions.

| # | Question | Why it needs a product decision |
|---|---|---|
| **Q1** | Does `scrollY`-driven auto-collapse fire only once (a threshold crossing) or track continuously (collapse at >200, re-expand at <50)? The recommendation is track continuously for natural feel, but some users may find the automatic re-expansion unwanted when they scroll back to adjust a card above. | Balances "anchor as always-visible companion" vs "anchor as non-intrusive marker." |
| **Q2** | When the user taps "Change" on the collapsed anchor, what UI appears? (a) the redesigned `BrainStateCheckin` expanded view rendered inline in the dashboard (displacing the anchor until complete); (b) a modal / bottom sheet containing `BrainStateCheckin`; (c) navigate to a dedicated check-in screen. | Each option carries different weight. (a) is fastest but disrupts the dashboard layout. (b) is a new UI pattern for this app. (c) is the most explicit but costs a navigation. |
| **Q3** | On mount (user returns to the Dashboard tab), what's the initial collapsed state? Three options: (a) always expanded — welcome them back with the full brief; (b) always collapsed — don't re-grab their attention; (c) remember the last state via AsyncStorage. | (a) is warm but can feel like nagging on re-entry. (b) is restrained but may hide content they'd want to see. (c) is most "respect the user" but adds a persistence hop. |
| **Q4** | Should the collapsed anchor **stick to the top of the scroll viewport** as the user scrolls down, or should it scroll away with the rest of the content? A sticky bar provides a true always-visible anchor; a non-sticky one is a marker that fades as you read. | Sticky = stronger anchor, heavier visual commitment. Non-sticky = lighter, more like a label. Need product call. |
| **Q5** | Does the brief's content need to be **re-generated** if the user checks in twice with the same state? Example: user checks in "Foggy" at 8am, protocol doesn't help, checks in "Foggy" again at 2pm. Is the anchor's message identical, or subtly different? | Today they'd be identical (content is state-keyed, not time-keyed). The perceived value may be low; the implementation cost is non-trivial. Ties into Section 3. |
| **Q6** | If a user wants to **undo a check-in**, is that supported? If yes, how does the anchor react? | Today there is no undo flow. Product decision on whether this spec should include the beginning of that capability. |
| **Q7** | Accessibility: when the anchor is **collapsed**, should VoiceOver announce the abbreviated content, or should the full brief be part of the accessibility label so screen readers hear the complete message? | Visual collapse vs semantic collapse are different concerns. Both approaches are defensible. |
| **Q8** | Does the anchor need a **loading state** for the brief? Today, `BrainBrief` renders synchronously from hard-coded content. If Q5 goes toward dynamic / time-of-day content, the anchor needs a loading or skeleton state. | Only relevant if Q5 introduces async content. For the static v1, no loading state is needed. |

---

## Summary

| Decision | Recommendation |
|---|---|
| Component structure | Single component, internal state |
| Primary trigger | User tap |
| Secondary trigger | Scroll past ~200px |
| Timer auto-collapse | Not recommended |
| Content freshness | Static per check-in for v1 |
| Re-check-in | Replace, with fade |
| Cross-tab | Dashboard-only for v1 |
| Dismissibility | Collapsible only, not dismissible |
| Migration | One-shot after the load-bearing refactors land |

Open questions Q1, Q2, Q3, Q4, Q7 all need a product decision before the implementer starts. Q5, Q6, Q8 can be deferred as follow-up items.

Once Q1–Q4 and Q7 are answered, this spec is detailed enough for a standalone implementation task.
