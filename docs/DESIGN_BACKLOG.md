# Design Backlog

UI/design refinement items deferred from the current sprint. Separate
from `TECH_DEBT_BACKLOG.md` (which tracks code/architecture debt) —
this file is for **visual / interaction / copy refinements** that
need a design pass before implementation.

Items here have either (a) been spec'd at mockup level but deferred
to focus on launch-blockers, or (b) been flagged during device
verification as polish opportunities, or (c) raised architectural
questions that need an investigation before implementation can begin.

Last updated: 2026-05-11

---

## 1. Section 1 — Box Breathing in-session refinements

**Source:** `vara_protocol_mockups.html` Section 1.

**Scope:**
- Phase ring rendered around the breath circle (visual progress
  through the current cycle's phases).
- "Cycle N of M · Time left" header.
- H1 phase label rendered in Evergreen Teal.
- Soft duration helper text (de-emphasized vs. the phase label).

**Q1 verdict (resolved 2026-05-11): COSMETIC, no architectural
change required.**

The cycle infrastructure already exists end-to-end at the
computation layer:

- `mobile/src/utils/breathPacerSchedule.ts:11` — `PhaseScheduleEntry`
  carries `cycleIndex` (0-based).
- `mobile/src/components/protocol/BreathPacer.tsx:156` —
  `onPhaseChange` callback receives the `PhaseScheduleEntry`
  including `cycleIndex`.
- `mobile/src/components/protocol/GuidedSessionPlayer.tsx:437` —
  intercepts `onPhaseChange` but currently discards `cycleIndex`
  in favor of a flat schedule index.
- `mobile/src/constants/brainStateProtocols.ts:204` — Box Breathing
  declares `durationSeconds: 128`. Cycles are derived
  (`durationSeconds / cycleDurationSeconds = 8`) rather than
  declared as a top-level field.

Implementation path: extract `cycleIndex` from the
`PhaseScheduleEntry` in `GuidedSessionPlayer`, compute
`totalCycles` from the step's `durationSeconds`, pass both as
props to `BreathPacer`. No changes to `playerReducer`,
`ProtocolSession` schema, or protocol definitions.

**Refinement before implementation:** consider hiding the
time-remaining text after N successful sessions to avoid
countdown/urgency feel for returning users. Box Breathing's
purpose is regulation; a persistent countdown adds time-pressure
that fights the protocol's intent. Possible implementations:
hide after Nth session, hide for users on the
"already-shifted-once" path, or always show only on first run.
Founder to spec the trigger condition.

**Priority:** Polish; post-launch.

---

## 2. Section 2 — Cyclic Sighing intro polish

**Source:** `vara_protocol_mockups.html` Section 2.

**Scope:**
- Soft icon (mockup specifies a breath-related glyph) inside a Dew
  Sage circle as the visual anchor at the top of the intro screen.
- Content vertically centered in the available space.
- Sticky full-width "Begin" button at the bottom (52px height,
  14px radius per `Vara_Modal_Design_System_v1.1.md`).
- Meta tags above the body copy for duration and protocol type
  (e.g., "3 min · Breathwork").

**Why deferred:** pure polish. The current intro renders functional
content; the visual hierarchy refinement is post-launch.

**Priority:** Polish; post-launch.

---

## 3. Section 3 — Sensory Reset step dots + countdown ring

**Source:** `vara_protocol_mockups.html` Section 3.

**Scope:**
- Step dots ("3 of 5" filled) rendered above the current prompt to
  show progress through the sensory-reset sequence.
- Countdown ring around the prompt circle to indicate when the
  step will auto-advance.

**Q2 verdict (resolved 2026-05-11): COSMETIC, no architectural
change required.**

Sensory-reset-2 is already defined as a 5-step protocol:

- `mobile/src/constants/brainStateProtocols.ts:448-509` — declares
  5 InstructionSteps (see / hear / feel / smell / taste) each
  with `durationSeconds`, `id`, and `text`.
- `mobile/src/components/protocol/InstructionStepView.tsx:15-37` —
  renders one step; consumes `useStepCountdown` for the auto-advance
  timer.
- `mobile/src/utils/playerReducer.ts:43,95` — player state machine
  tracks `currentStepIndex` and `stepsCompleted`.
- `mobile/src/components/protocol/GuidedSessionPlayer.tsx:575` —
  Header component already renders "Step N of Total" textually.

Step dots can be rendered cosmetically by reading
`currentStepIndex` + `totalSteps` from the existing player state.
No protocol-definition or schema changes needed.

**IMPORTANT — brand-mechanic refinement before implementation.**
The mockup's 3-second auto-advance countdown on prompts asking
users to look at their physical environment is a contradiction with
Vara's "no urgency, no countdown pressure" brand principle. The
purpose of sensory reset is to redirect attention outward —
a countdown ring pulls attention back to the screen.

Three alternatives to explore before implementing:

1. **Much longer interval per prompt** (e.g., 10–15s) so the
   countdown is implicit rather than urgent.
2. **"Done noticing" tap-to-advance** — replace the timer with
   a "I'm with you" / "Done" affordance that the user taps when
   ready. Removes time pressure; respects the variable attention
   required for noticing physical environment.
3. **Audio cue with no visual timer** — protocol audio guides the
   pacing; no on-screen countdown at all.

Founder to pick one (or sketch a fourth) before implementation
begins.

**Priority:** Polish; post-launch, after brand-mechanic
refinement decision.

---

## 4. Section 4 — Post-protocol re-check polish

**Source:** `vara_protocol_mockups.html` Section 4.

**Scope** (deferred portions only — H1 color and FAB hiding are
in Phase 2.8.3):
- Completed pill upgrade: two-part visual treatment with
  "Completed" label and the protocol name on a single chip,
  replacing the current single-text pill.
- Sub-line below the H1: "No wrong answer. Just notice." (mockup
  copy — voice/copy review before adoption).
- Tighter state cards — 60–68px tall so 5 cards stack without
  scrolling on iPhone SE / 12 / 15 viewports.

**Why deferred:** the H1 color fix and FAB hiding eliminate the
launch-blocker issues; pill / sub-line / card height are pure
visual polish.

**Priority:** Polish; post-launch.

---

## 5. First-shift footer distinct treatment

**Source:** Round 14 / 15 device verification of `stress-recovery-redesign`
(PR #14 / `project_round3_stress_recovery.md`).

**Scope:** The response screen rendered after any shifted protocol
outcome currently looks visually identical regardless of whether
this is the user's first shift or their Nth. The AsyncStorage
marker name (`@vara/firstShiftFooterShownAt:{userId}`) implies a
discrete footer element, but the current implementation has no
visually distinct first-shift treatment beyond `FirstShiftFooter`
being conditionally rendered.

**Two implementation options to spec before building:**

1. A discrete `FirstShiftFooter` component rendered below the
   shifted-response screen, with its own visual identity (color,
   icon, copy) emphasizing "this is your first one." Current
   `FirstShiftFooter` component is dashboard-only — would be
   extended or duplicated.
2. A visually distinct first-shift response variant of
   `ShiftedResponse` itself, swapping copy and visual treatment
   inline when it's the user's first shift.

Founder to spec which shape; bundle implementation with the
post-launch UI polish batch.

**Priority:** Post-launch UI polish batch.

---

## 6. firestore.rules — `protocolSessions` doc-ID comment refinement

**Source:** Phase 2.7 closure pre-deploy investigation (2026-05-11).

**Scope:** The `protocolSessions` rules block in `firestore.rules`
includes a comment describing doc IDs as "auto-generated." Sub-step
2.5 actually settled on `${userId}_${sessionStartedAt}ms` (deterministic
per-user, per-session-start). Doc ID format does not affect rule
correctness (the rule reads `userId` from the document field, not the
ID); only the comment is stale.

Update the comment in a future docs-only commit. Low priority — no
behavior impact, no user impact, only readability for future
maintainers reading the rules file.

**Priority:** Low; docs-only follow-up.
