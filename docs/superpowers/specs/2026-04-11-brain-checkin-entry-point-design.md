# Brain Check-In as Entry Point: Dashboard State Machine

**Date:** 2026-04-11
**Status:** Draft
**Platform:** Mobile (React Native/Expo)

---

## Overview

Transform the mobile dashboard from a static card layout into a brain-state-responsive experience. The brain check-in becomes the clear focal point when the user opens the app, and completing it visibly changes what the dashboard shows and how it's ordered. This is the structural shift that makes Vara feel like a brain-health companion rather than a habit tracker with extras.

### Design Principles

- **The check-in must visibly change the dashboard** — if the user taps "foggy" and the dashboard looks the same, they'll see through it
- **Brain-first, not brain-gated** — the dashboard is muted before check-in, not hidden. The user can see what's there but is drawn to check in first
- **Reuse existing infrastructure** — the nudge priority map, protocol mapping, and check-in component already exist and work well
- **No em dashes in user-facing text**

---

## Dashboard State Machine

The dashboard operates in 3 phases determined at runtime:

### Phase: `pre-checkin`

**Condition:** No brain state check-in exists for today.

**Behavior:**
- Brain check-in card renders at full opacity, expanded (existing behavior, no change)
- All other dashboard cards render at 50% opacity with `pointerEvents: 'none'` (visible but non-interactive)
- A subtle text hint below the check-in: "Check in to unlock your personalized dashboard" in sageGray
- The dashboard feels "asleep"

### Phase: `post-checkin`

**Condition:** Check-in exists AND `hasSeenBriefThisSession.current === false`.

**Behavior:**
- BrainBrief component appears at the top (personalized message based on brain state)
- Muted cards animate to full opacity (Reanimated `withTiming` from 0.5 to 1.0, ~400ms)
- Cards reorder based on brain-state priority (no reorder animation, opacity fade masks position change)
- `pointerEvents` switches to `'auto'`
- `hasSeenBriefThisSession.current` set to `true`

### Phase: `returning`

**Condition:** Check-in exists AND `hasSeenBriefThisSession.current === true`.

**Behavior:**
- Compact BrainStatusBar at the top (state + protocol status)
- Cards in brain-state-ordered layout
- Full interactivity

### Phase Determination

```typescript
// In useDashboard hook
const hasSeenBriefThisSession = useRef(false);

const dashboardPhase = useMemo(() => {
  if (!brainStateCheckIn) return 'pre-checkin';
  if (!hasSeenBriefThisSession.current) return 'post-checkin';
  return 'returning';
}, [brainStateCheckIn]);
```

`hasSeenBriefThisSession` is a `useRef(false)` that resets when the app process restarts. This means:
- First open of the day (no check-in) -> `pre-checkin`
- After checking in -> `post-checkin` (brief shown)
- Close and reopen app same day -> `returning` (status bar)
- App backgrounded and foregrounded -> `returning` (ref persists)

---

## Card Ordering System

### Priority Map

Uses the existing nudge priority system from `getNudgeSuggestion.ts`, extended to map to dashboard card IDs.

**Brain state to feature priority:**

```
wired:     breathwork -> journal -> discover -> community -> brainHealth -> focus
foggy:     focus -> breathwork -> brainHealth -> journal -> discover -> community
okay:      journal -> community -> discover -> focus -> breathwork -> brainHealth
clear:     focus -> journal -> brainHealth -> discover -> community -> breathwork
energized: masterclass -> community -> brainHealth -> journal -> focus -> breathwork
```

### Feature-to-Card Mapping

| Nudge Feature | Dashboard Card |
|---|---|
| `breathwork` | Protocol Card |
| `focus` | Routines Card |
| `journal` | Daily Reflection Card |
| `brainHealth` | Week Insight Card |
| `community` | Nudge Card (pointing to community) |
| `discover` | Nudge Card (pointing to discover) |
| `masterclass` | Nudge Card (pointing to masterclass) |

### Fixed Positions

- **Always top:** BrainBrief (post-checkin) or BrainStatusBar (returning)
- **Always visible:** Weekly Habits card. This is the user's daily action center. It never gets deprioritized or hidden, but its position in the list is determined by the brain-state ordering.

### Reorderable Cards

Protocol, Nudge, Routines, Daily Reflection, Week Insight.

### Pre-checkin Order

Default order (current behavior), but all cards muted.

### New Utility

`getDashboardCardOrder(brainState: BrainState): string[]` — takes the brain state, looks up the priority map, maps features to card IDs, returns ordered array. Cards not in the map go to the end in default order.

---

## BrainBrief Component (New)

Appears at the top of the dashboard in `post-checkin` phase.

### Layout
- Card styling: white background, 16px border radius, standard teal shadow
- Left border accent in brain-state-associated color
- Brain state icon + state name
- 1-2 sentence personalized message
- No dismiss button. Transitions to status bar on next session/render.

### Message Templates

| State | Message |
|---|---|
| Wired | "Your mind is running hot today. Let's channel that energy. Start with a calming protocol, then ease into your habits." |
| Foggy | "Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in." |
| Okay | "Steady baseline today. A good day to reflect and connect. Your journal and community are where you'll find momentum." |
| Clear | "You're in a great headspace. This is the day to lock in focus work and build on your habits." |
| Energized | "Sharp and ready. Use this energy. Explore a masterclass, connect with your community, then ride the momentum through your habits." |

Messages are hardcoded (not LLM-generated) for instant rendering. No em dashes in any text.

---

## BrainStatusBar Component (New)

Appears at the top of the dashboard in `returning` phase.

### Layout
- Single row, compact height (~44px)
- Left side: brain state icon + state name (e.g., "Clear")
- Right side: protocol status ("Protocol done" or "Protocol ready")
- Tappable: opens inline expansion or bottom sheet to change brain state

### Protocol Status Text

| Condition | Text |
|---|---|
| `protocolCompleted === true` | "Protocol done" |
| `protocolCompleted === false` | "Protocol ready" |

### State Change Flow

When user taps and selects a new state:
1. Brain state check-in updated in Firestore (existing `updateBrainStateCheckIn` function)
2. Dashboard cards reorder to match new state
3. Status bar updates to show new state
4. No new brain brief shown (this is a correction, not a first impression)

---

## Muted Dashboard (Pre-Checkin Visual Treatment)

### Implementation
- Wrap non-checkin cards in a `View` with `opacity: 0.5` and `pointerEvents: 'none'`
- Brain check-in card renders at full opacity, expanded (existing behavior)
- Subtle text hint below check-in: "Check in to unlock your personalized dashboard" in sageGray, small font

### Transition Animation (on check-in completion)

1. BrainBrief slides in from top (Reanimated `FadeIn` + `SlideInUp`, ~300ms)
2. Muted cards animate to full opacity (`withTiming` from 0.5 to 1.0, ~400ms)
3. Cards appear in brain-state priority order (no reorder animation, opacity fade masks position change)
4. `pointerEvents` switches to `'auto'`

No layout animation on reorder. Layout animations with conditional card rendering are unreliable. The opacity transition provides enough visual feedback that the dashboard responded.

---

## Files Changed

| File | Change Type |
|------|-------------|
| `mobile/src/hooks/useDashboard.ts` | Modify: add `dashboardPhase`, `hasSeenBriefThisSession` ref, expose phase and card order |
| `mobile/src/screens/DashboardScreen.tsx` | Modify: render based on phase (muted wrapper, brief vs status bar, reordered cards) |
| `mobile/src/components/dashboard/BrainBrief.tsx` | New: personalized message component |
| `mobile/src/components/dashboard/BrainStatusBar.tsx` | New: compact status bar component |
| `mobile/src/utils/getDashboardCardOrder.ts` | New: maps brain state to card order via nudge priorities |
| `mobile/src/utils/getNudgeSuggestion.ts` | Modify: update energized priority to masterclass -> community -> brainHealth -> journal -> focus -> breathwork |

## Not Changing

- `BrainStateCheckin.tsx` — check-in card stays as-is
- `TodaysProtocolCard.tsx` — no changes
- `brainStateCheckIn.service.ts` — no data model changes
- `brainStateProtocols.ts` — protocol mappings unchanged
- Navigation / bottom tabs — no changes
- Firestore schema — no changes (dashboardPhase is derived at runtime)

---

## Future Sub-Projects (Not In This Spec)

These were identified in the brainstorming session as separate specs:

1. **Habit-pillar tagging** — Tag each habit to a brain pillar (Sleep, Focus, Movement, Stress, Nutrition, Connection). UI shows habits grouped by pillar. Dashboard shows pillar-level progress. Requires data model addition.

2. **Micro-feedback after actions** — Content library of 50-100 brain-health statements mapped to habit categories. Displayed contextually after completing a habit, journal entry, or protocol. Low effort, high differentiation.
