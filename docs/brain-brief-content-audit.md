# BrainBrief Content Audit

**Date:** 2026-04-20
**Purpose:** Collection of all BrainBrief message content, gathered verbatim for voice-and-content review. No modifications, no quality judgments — just the raw material.

---

## Generation Method

**All briefs are 100% templated static strings.** No LLM involvement.

- Content lives in a single file: `mobile/src/components/dashboard/DashboardAnchor/brainStateBriefs.ts`
- Exposed as `BRAIN_STATE_BRIEFS: Record<BrainState, BrainStateBrief>`
- Consumed by `DashboardAnchorExpanded.tsx` (renders `label`, `icon`, `message`) and `DashboardAnchorCollapsed.tsx` (renders `label`, `icon` only — the `message` is not shown when collapsed)

**Dynamic variables:** None. Each state maps to a fixed object `{ label, icon, message, accentColor }`. The `message` is rendered as a plain `<Text>{brief.message}</Text>` with zero interpolation.

**Backend/OpenAI involvement:** None. Backend prompts in `backend/server.js` cover journal summary, AI chat companion, and daily plan generation — none of them produce brain-state briefs. The BrainBrief content pipeline is entirely client-side.

**History:** Previously lived inline in the now-deleted `mobile/src/components/dashboard/BrainBrief.tsx`. Extracted unchanged into its own module in commit `9118dad` (feat(dashboardAnchor): extract BRAIN_STATE_BRIEFS content map) and referenced by the new `DashboardAnchor` orchestrator as of commit `337e347`.

---

## State Coverage Note

The `BrainState` enum (`mobile/src/utils/getNudgeSuggestion.ts:15`, `mobile/src/types/models.ts:771`) defines **five** states:

```ts
export type BrainState = 'wired' | 'foggy' | 'okay' | 'clear' | 'energized';
```

The task brief named four states (Foggy, Wired, Depleted, Energized). There is **no `depleted` state** in the codebase; the closest intermediate states are `okay` and `clear`. All five states are included below. Flagging so the reviewer can decide whether the discrepancy is a naming mismatch, a pending rename, or a state that's planned but not yet implemented.

---

## Templates (verbatim)

Source: `mobile/src/components/dashboard/DashboardAnchor/brainStateBriefs.ts:11-42`

### wired

- **label:** `Wired`
- **icon:** `lightning-bolt`
- **accentColor:** `Colors.softCoral`
- **message:**
  > Your mind is running hot today. Let's channel that energy. Start with a calming protocol, then ease into your habits.

---

### foggy

- **label:** `Foggy`
- **icon:** `weather-fog`
- **accentColor:** `Colors.sunriseAmber`
- **message:**
  > Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in.

---

### okay

- **label:** `Okay`
- **icon:** `minus-circle-outline`
- **accentColor:** `Colors.mutedSageGray`
- **message:**
  > Steady baseline today. A good day to reflect and connect. Your journal and community are where you'll find momentum.

---

### clear

- **label:** `Clear`
- **icon:** `check-circle-outline`
- **accentColor:** `Colors.evergreenTeal`
- **message:**
  > You're in a great headspace. This is the day to lock in focus work and build on your habits.

---

### energized

- **label:** `Energized`
- **icon:** `flash-outline`
- **accentColor:** `Colors.freshMoss`
- **message:**
  > Sharp and ready. Use this energy. Explore a masterclass, connect with your community, then ride the momentum through your habits.

---

## Dynamic Variables

None. Each state renders exactly one fixed string. A user who checks in as "foggy" on Monday and again on Tuesday will see the identical brief both days.

## Samples Section

N/A — because the briefs are fully static, there are no runtime samples distinct from the templates above. The template IS the sample, and it is the same every time for every user.
