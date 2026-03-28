# Dashboard V2 Simplification — Design Spec

**Date:** 2026-03-28
**Priority:** Critical — this is the screen users see every day
**Effort:** 2–3 days
**Approach:** Hide cards behind feature flag, do not delete code

---

## 1. Feature Flag

**File:** `mobile/src/constants/dashboardConfig.ts`

```typescript
export const DASHBOARD_V2 = true;
```

Single boolean. `true` by default (all users get V2). Set to `false` to restore original layout. Both the rendering (DashboardScreen) and data-fetching (useDashboard hook) are gated behind this flag.

---

## 2. Dashboard Layout

### V2 Card Order

| Position | Component | Behavior |
|----------|-----------|----------|
| — | **Header** | Updated greeting (see section 5). Settings button unchanged. |
| — | **NotificationOptInCard** | Kept in current conditional position. |
| 1 | **BrainStateCheckin** | New. Expanded if not completed today, collapsed summary if completed. Resets daily. |
| 2 | **TodaysProtocolCard** | New. Only renders after check-in is completed. |
| 3 | **WeeklyHabitsCard** | Existing, unchanged. |
| 4 | **WeekInsightCard** | Existing, unchanged. Below fold. Only shows with 5+ days data. |
| 5 | **BrainHealthEducationCard** | Existing, unchanged. Below fold. |

### Hidden Cards (V2)

These are not rendered and their data is not fetched. Code is preserved behind `DASHBOARD_V2 === false`:

- WelcomeBackCard
- NextBestActionCard
- QuickActionsRow
- FourThreeTwoOneCard
- AIDailyPlanCard
- WellnessScoreCard + WellnessScoreOptInCard + WellnessScoreBreakdown
- BrainHealthInsightStrip
- MorningCheckIn (old two-step version)

---

## 3. BrainStateCheckin Component

**File:** `mobile/src/components/dashboard/BrainStateCheckin.tsx`

### Brain States

| State | Description | Dot Color | Protocol Mapping |
|-------|-------------|-----------|-----------------|
| Wired | Racing thoughts, can't settle | `softCoral` (#D97A6E) | Extended Exhale (5 min) |
| Foggy | Low energy, hard to focus | `sunriseAmber` (#F4C542) | Activating Breathwork (4 min) |
| Okay | Nothing great, nothing bad | `mutedSageGray` (#6F7F77) | 90-Second Micro-Reset |
| Clear | Calm, present, ready | `evergreenTeal` (#1B5E57) | Gratitude & Clarity Reflection (3 min) |
| Energized | Focused and sharp | `success` (#1B5E57) | Focus Primer (5 min) |

### Uncompleted State (default each day)

- Card-style container
- Prompt: "How's your brain feeling?"
- Subtext: "Just one tap. No wrong answers."
- 5 vertically stacked tappable rows
- Each row: colored dot (10px), state label (14px bold), description (12px muted)
- Single tap selects state, saves check-in, shows "Captured." confirmation
- "Captured." auto-dismisses after 2 seconds, card collapses to completed state

### Completed State (collapsed)

- Compact single row: selected state's colored dot + state label
- Subtle "Change" text button on the right
- Tapping "Change" expands back to full selection for re-selection
- Re-selecting saves the updated state and re-collapses

### Interaction Rules

- No sliders, number scales, or multi-step forms
- Entire interaction completable in one tap
- Haptic feedback on selection (Light impact)
- Success haptic on save (Success notification)

---

## 4. TodaysProtocol Component

**File:** `mobile/src/components/dashboard/TodaysProtocolCard.tsx`

### Visibility

Only renders when today's brain state check-in exists.

### Card Content

- Protocol name (bold)
- One-sentence plain-language explanation of why it helps
- Duration badge
- Single CTA: "Begin when ready"

### CTA Behavior

Expands the card inline to reveal step-by-step instructions from the protocol definition. No navigation to another screen — the user stays on the dashboard. A "Done" button collapses the instructions and sets `protocolCompleted: true`. Extensible for future guided audio/timer content (swap inline instructions for a screen navigation when ready).

---

## 5. Protocol Definitions

**File:** `mobile/src/constants/brainStateProtocols.ts`

### Type

```typescript
interface BrainStateProtocol {
  id: string;
  brainState: BrainState;
  name: string;
  description: string;       // one-sentence "why it helps"
  duration: string;           // display string e.g. "5 min"
  durationSeconds: number;    // for timer/tracking
  instructions: string[];     // step-by-step written guide
  category: 'breathwork' | 'reflection' | 'reset';
}
```

### Protocol Definitions

| Brain State | Name | Description | Duration | Category |
|-------------|------|-------------|----------|----------|
| Wired | Extended Exhale | Longer exhales activate your parasympathetic nervous system, slowing a racing mind. | 5 min (300s) | breathwork |
| Foggy | Activating Breathwork | Short, rhythmic breathing increases oxygen flow and wakes up your prefrontal cortex. | 4 min (240s) | breathwork |
| Okay | 90-Second Micro-Reset | A brief pause to reconnect with your senses and sharpen your awareness. | 90 sec (90s) | reset |
| Clear | Gratitude & Clarity Reflection | When your mind is already calm, gratitude deepens that state and builds momentum. | 3 min (180s) | reflection |
| Energized | Focus Primer | Channel high energy into a single intention before it scatters. | 5 min (300s) | reflection |

Each protocol includes 3–5 plain-language instruction steps.

---

## 6. Greeting Update

**In `useDashboard.ts`, gated behind `DASHBOARD_V2`:**

| Time Range | Greeting |
|------------|----------|
| 5:00am – 11:59am | "Good morning, [Name]." |
| 12:00pm – 4:59pm | "Good afternoon, [Name]." |
| 5:00pm – 9:59pm | "Good evening, [Name]." |
| 10:00pm – 4:59am | "Hey, [Name]." |

No reference to absence duration. No "Welcome back." No "We missed you." This is a brand-level decision: Vara's greeting feels the same whether someone opens the app daily or after two weeks.

The `lastActiveAt` Firestore update still runs (needed for other features) but the welcome-back card logic is skipped in V2.

---

## 7. Data Model

### New Firestore Collection: `brainStateCheckIns`

**Document ID:** `{userId}_{YYYY-MM-DD}`

```typescript
type BrainState = 'wired' | 'foggy' | 'okay' | 'clear' | 'energized';

interface BrainStateCheckIn {
  id: string;
  userId: string;
  date: string;                // YYYY-MM-DD
  brainState: BrainState;
  protocolId: string;          // maps to protocol constant
  protocolCompleted: boolean;  // tracks if user did the protocol
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Separate from the existing `morningCheckIns` collection. Both coexist. The old collection continues to work when `DASHBOARD_V2 = false`.

### Firestore Security Rules

Same owner-only pattern as other personal data collections:

```
match /brainStateCheckIns/{docId} {
  allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
}
```

---

## 8. Service Layer

**New file:** `mobile/src/services/firebase/brainStateCheckIn.service.ts`

### Functions

- `getTodayBrainStateCheckIn(userId: string): Promise<BrainStateCheckIn | null>` — Fetch today's doc by ID pattern `{userId}_{YYYY-MM-DD}`
- `saveBrainStateCheckIn(userId: string, brainState: BrainState): Promise<BrainStateCheckIn>` — Upsert today's doc. Sets `protocolId` from constant mapping, `protocolCompleted: false`, timestamps.
- `markProtocolCompleted(userId: string): Promise<void>` — Sets `protocolCompleted: true` on today's doc.
- `getBrainStateHistory(userId: string, days: number): Promise<BrainStateCheckIn[]>` — Query last N days. For future insights use.

Exported from `mobile/src/services/firebase/index.ts`.

---

## 9. useDashboard Hook Changes

### Performance-Gated Data Fetching

When `DASHBOARD_V2 = true`, the hook **skips**:
- Wellness score fetch and calculation (`getTodayWellnessScore`, `calculateWellnessScore`)
- Old morning check-in fetch (`getMorningCheckIn`)
- 4-3-2-1 entry fetch (`getTodayEntry`)
- Daily plan load from SecureStore
- Welcome-back card display logic (still updates `lastActiveAt`)

When `DASHBOARD_V2 = true`, the hook **adds**:
- `brainStateCheckIn` — today's check-in from new collection
- `brainStateCheckInLoading` — loading state
- `handleBrainStateCheckIn(state: BrainState)` — saves to new collection
- `todaysProtocol` — derived from `brainStateCheckIn.brainState` via protocol constants lookup

When `DASHBOARD_V2 = true`, the hook **keeps**:
- Habits, tasks, goals, journal data (used by V2 cards)
- Feature discovery tracking
- Notification opt-in logic
- Refresh handler
- Greeting (updated time ranges)

All existing state variables and handlers remain declared but are only populated/called when `DASHBOARD_V2 = false`. The hook's return signature stays the same — V2-specific values are added to it.

---

## 10. Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `mobile/src/constants/dashboardConfig.ts` | **New** | `DASHBOARD_V2` feature flag |
| `mobile/src/constants/brainStateProtocols.ts` | **New** | 5 protocol definitions with instructions |
| `mobile/src/types/models.ts` | **Modify** | Add `BrainState` type and `BrainStateCheckIn` interface |
| `mobile/src/services/firebase/brainStateCheckIn.service.ts` | **New** | CRUD for `brainStateCheckIns` collection |
| `mobile/src/services/firebase/index.ts` | **Modify** | Export new service functions |
| `mobile/src/components/dashboard/BrainStateCheckin.tsx` | **New** | Check-in card (expanded + collapsed states) |
| `mobile/src/components/dashboard/TodaysProtocolCard.tsx` | **New** | Protocol recommendation card |
| `mobile/src/components/dashboard/index.ts` | **Modify** | Export new components |
| `mobile/src/hooks/useDashboard.ts` | **Modify** | V2 conditional data fetching, greeting update, brain state handlers |
| `mobile/src/screens/DashboardScreen.tsx` | **Modify** | V2 conditional rendering layout |
| `firestore.rules` | **Modify** | Add `brainStateCheckIns` security rules |

### Not Changed

- No existing dashboard card components are modified or deleted
- No changes to existing services, types, or constants
- No changes to navigation, routing, or other screens
