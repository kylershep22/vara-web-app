# Dashboard Engagement Phase 2 — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Mobile dashboard engagement improvements — always-visible insight card, brain-state nudge, greeting fix
**Platform:** Mobile (React Native/Expo)
**Branch:** `feat/dashboard-engagement-phase2`

---

## Goal

Make the mobile dashboard feel dynamic and engaging rather than "bare bones" after the brain state check-in. Guide users toward their next best action based on how their brain is feeling, and set expectations for value that builds over time.

---

## Section 1: WeekInsightCard Always-Visible with Empty State

**Current behavior:** The `WeekInsightCard` only renders when correlation data exists AND the user hasn't dismissed it. When there's no data, the space is empty.

**New behavior:** The card is always rendered — no conditional hide, no dismiss button.

### Data State (correlation data exists)
Same as current: headline + supporting text + "See your full week story" link to Insights screen. No changes to this rendering path.

### Empty State (insufficient data)
Shown when the rolling 7-day correlation data is insufficient (new users in first 1-2 days, or users returning after 7+ days of inactivity).

- **Icon:** Lightbulb outline (same as data state, `lightbulb-outline` from MaterialCommunityIcons)
- **Headline:** "Your weekly patterns"
- **Body:** "As you check in and build habits this week, patterns will appear here to help you understand what works for your brain."
- **No action button, no dismiss button** — just warmth and expectation-setting
- **Visual style:** Same card container as the data state (white card, teal accent bar, same border radius and padding)

### Data Source
Rolling 7-day window via existing `useWeeklyCorrelations` hook. The empty state shows only when this hook returns null/insufficient data. It does not reset on calendar week boundaries.

### Position on Dashboard
Same as current — below the daily reflection / habits grid area. Acts as a consistent "bottom anchor" of the dashboard.

### Implementation
Modify the existing `WeekInsightCard` component to accept an `empty` boolean prop. When `empty` is true, render the warm empty state. The parent (`DashboardScreen`) always renders the card, passing `empty={!correlations}` or similar.

### Files Modified
- `mobile/src/components/dashboard/WeekInsightCard.tsx` — Add empty state rendering
- `mobile/src/screens/DashboardScreen.tsx` — Remove conditional rendering, always show card

---

## Section 2: Next Action Nudge Card

A contextual card that suggests one brain-state-relevant action from features the user hasn't engaged with today.

### When It Appears
- After the protocol card, before the weekly habits grid
- Only shows when brain state check-in is done AND protocol is done/skipped AND at least one feature remains undone today
- Does not show if all nudge-able features have been used today

### Nudge Targets (Active Features)
| Feature | "Done today" detection | Navigation target |
|---|---|---|
| Journal | `journalEntries` doc with today's date + userId | Journal screen |
| Focus Session | `focusSessions` doc with today's date + userId | Focus screen |
| Breathwork | In-memory flag (set when user visits breathwork this session) | Breathwork screen |
| Community | In-memory flag (set when user visits community this session) | Community screen |
| Brain Health | `brainMetrics` doc with today's date + userId | Brain Health screen |
| Masterclass/Podcasts | In-memory flag (set when user visits discover this session) | Discover screen |

Firestore checks are used for features that create persistent data (journal, focus, brain metrics). In-memory flags are used for browsing features (breathwork, community, masterclass) to avoid unnecessary Firestore reads — these reset each app session, which is fine since the nudge is about encouraging daily engagement.

### Brain State to Suggestion Priority

| Brain State | Priority Order (first undone wins) |
|---|---|
| **Wired** | Breathwork → Journal → Masterclass/Podcasts → Community → Brain Health → Focus Session |
| **Foggy** | Focus Session → Breathwork → Brain Health → Journal → Masterclass/Podcasts → Community |
| **Okay** | Journal → Community → Masterclass/Podcasts → Focus Session → Breathwork → Brain Health |
| **Clear** | Focus Session → Journal → Brain Health → Masterclass/Podcasts → Community → Breathwork |
| **Energized** | Focus Session → Community → Brain Health → Journal → Masterclass/Podcasts → Breathwork |

### Suggestion Data Structure

```typescript
interface NudgeSuggestion {
  feature: string;           // 'journal' | 'focus' | 'breathwork' | 'community' | 'brainHealth' | 'discover'
  icon: string;              // MaterialCommunityIcons name
  headline: string;          // Brain-state-contextual headline
  description: string;       // One-line description
  ctaLabel: string;          // Button text
  screenName: string;        // Navigation target
}
```

### Headline Copy (per brain state x feature)

Each combination has a specific headline. Examples:
- Wired + Breathwork: "Settle your mind" / "Extended exhales help a racing brain find its rhythm."
- Foggy + Focus Session: "Sharpen your focus" / "A short focus session can cut through the fog."
- Clear + Journal: "Capture this clarity" / "A clear mind is the best time to reflect."
- Energized + Community: "Share your energy" / "Your momentum might be what someone else needs today."

The full copy map lives in `getNudgeSuggestion.ts` as a static lookup — no API calls needed.

### Card Layout
- Feature icon (left-aligned, teal background circle)
- Headline (bold, primary text color)
- Description (secondary text color, one line)
- CTA button ("Start", "Open", or feature-specific label)
- "Not now" text link below CTA — dismisses the card for this session (in-memory, resets on next app open)

### Implementation

**New files:**
- `mobile/src/utils/getNudgeSuggestion.ts` — Pure function: `(brainState, completedFeatures) → NudgeSuggestion | null`. Contains the priority map and copy. No side effects, easy to test.
- `mobile/src/components/dashboard/NudgeCard.tsx` — Renders a single suggestion. Accepts `suggestion: NudgeSuggestion`, `onAction: () => void`, `onDismiss: () => void`.

**Modified files:**
- `mobile/src/hooks/useDashboard.ts` — Add logic to check which features are done today (Firestore queries for journal/focus/brainMetrics, in-memory flags for browsing features). Expose `nudgeSuggestion` and `dismissNudge` to the dashboard.
- `mobile/src/screens/DashboardScreen.tsx` — Render `NudgeCard` after the protocol card when `nudgeSuggestion` is non-null.

---

## Section 3: Greeting Fix

**Current:** Users between 10 PM and 5 AM get "Hey." as the greeting — feels abrupt.

**Fix:** In `mobile/src/hooks/useDashboard.ts`, replace the late-night fallback:

| Time | Current | New |
|---|---|---|
| 5 AM - 12 PM | "Good morning" | "Good morning" (no change) |
| 12 PM - 5 PM | "Good afternoon" | "Good afternoon" (no change) |
| 5 PM - 10 PM | "Good evening" | "Good evening" (no change) |
| 10 PM - 5 AM | "Hey" | "Good evening" |

One line change: replace `else timeGreeting = 'Hey'` with `else timeGreeting = 'Good evening'`.

### Files Modified
- `mobile/src/hooks/useDashboard.ts`

---

## Out of Scope

- Dashboard layout restructuring or reordering existing cards
- New Firestore collections or backend API changes
- Web app dashboard changes
- Push notification changes
- AI-generated content (nudge copy is static, not API-driven)
- Checklist vs Timed tab explanation copy
