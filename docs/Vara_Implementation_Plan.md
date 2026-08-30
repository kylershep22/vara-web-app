> **CAUTION — contains stale references.** This plan predates the August 2026
> doc-precedence restructure and repeatedly instructs loading the Build Guide,
> which is now quarantined at docs/archive/Vara_Build_Guide_SUPERSEDED.md.
> Source-of-truth precedence now lives in mobile/CLAUDE.md. This plan has not
> been re-audited against current docs; treat phase instructions as historical.

---

# Vara Redesign — Phased Implementation Plan
**Version 1.0 | April 2026 | Solo founder working nights and weekends**

---

## Purpose

This document sequences the redesign work for Vara so that a solo founder can ship it in manageable phases, each of which is testable on its own. Designed to be fed to Claude Code as feature-level chunks.

**What's in scope:**
- Core loop revision (state → time → protocol → re-check → adaptive response)
- Intent-based personalization (Pattern copy, Coach tone)
- Time-of-day defaults from onboarding
- Vocabulary alignment (`okay` → `steady`, `energized` → `alive`)
- Protocol library expansion to the 11-protocol launch set
- New `protocolSessions` Firestore collection
- Guided-session player for protocol execution

**What's explicitly deferred to v1.1 or later:**
- "Prep for something" proactive entry point (Refinement 3 — deferred)
- Marketing surface variants (Refinement 1 — parallel work, not in this plan)
- Dark mode
- Analytics activation beyond Firestore
- Custom illustrations for onboarding brand moments
- Wearable integration (HRV, sleep data)
- B2B2C coach channel features

---

## Working with the existing codebase

The mobile app is React Native 0.81 + Expo SDK 54 + TypeScript in `mobile/`. The check-in → protocol → reflect loop is already wired up and shipping to TestFlight users. **This work is primarily refactoring and extending, not building from scratch.**

### Branch strategy

All of this work happens on the `stress-recovery-redesign` branch. Per founder direction, we are NOT worried about conflicts with `main` because no further work will land on `main` during this redesign. When all phases are complete, `stress-recovery-redesign` becomes the next TestFlight build and eventually merges to `main` as a single landing.

If in-flight work on `main` does happen during this redesign (bug fixes, urgent patches), rebase `stress-recovery-redesign` onto `main` at the start of the next phase. Don't let the branches drift by more than one phase.

### File ownership during the redesign

Some files will be touched by multiple phases. To avoid churn:

- `mobile/src/types/models.ts` — touched by Phases 1, 2, 3. Expect repeated edits.
- `mobile/src/constants/brainStateProtocols.ts` — touched by Phases 1 and 2. Significant in Phase 2.
- `mobile/src/services/firebase/brainStateCheckIn.service.ts` — touched by Phases 2 and 3.
- `mobile/src/services/nextAction.service.ts` — touched by Phase 2 (algorithm redesign).
- `mobile/src/components/dashboard/BrainStateCheckin.tsx` — touched by Phase 2 (loop revision).

For each phase, Claude Code should read the Build Guide first, then the phase-specific spec, then start work. Phase boundaries are designed so that each phase leaves the app in a working state — you should be able to install on your device and do a smoke test of the loop at every phase boundary.

### Testing between phases

After each phase:
1. Install on device, run through the happy path (check-in → protocol → re-check → Today)
2. Run any automated tests Claude Code has written for the phase
3. Verify no regressions in related surfaces (Dashboard, Onboarding, Journal)
4. Commit phase on a phase-specific sub-branch if desired, or accumulate on `stress-recovery-redesign` directly

Do NOT move to the next phase until the current phase's acceptance criteria are met.

### TestFlight strategy

Push to TestFlight after Phase 4 (the loop is fully revised and the protocol library is expanded). Between Phase 4 and Phase 6, continue TestFlight cadence every 1-2 phases so beta users can validate each addition.

---

## The phases at a glance

| Phase | Goal | Est. Claude Code sessions | Est. focus hours |
|---|---|---|---|
| **0** | Pre-work: align vocabulary, scaffold data model | 1-2 | 4-6 |
| **1** | Rebuild protocol library + guided session player | 3-4 | 20-30 |
| **2** | Revise core loop (check-in → time → protocol → adaptive re-check) | 3-4 | 20-30 |
| **3** | Intent path + onboarding questions + path-aware data | 2-3 | 12-18 |
| **4** | Algorithm upgrade (state + time + time-of-day + path) | 2-3 | 10-14 |
| **5** | Patterns copy tuning + Coach tone calibration | 2-3 | 10-14 |
| **6** | Polish, testing, launch prep | 2-3 | 10-14 |
| **Total** | | **15-22** | **86-126** |

At 15-20 hours per week, this is roughly 6-8 weeks of focused work. Plan for slippage — assume 10 weeks of calendar time.

---

## Phase 0 — Pre-work (foundation)

### Goal
Align the internal code vocabulary to match the design spec, and scaffold the new data model for the richer session records we'll be writing starting in Phase 2.

### Scope
**Rename in code:**
- `BrainState` enum: `okay` → `steady`, `energized` → `alive`
- All TypeScript types, constants, Firestore read/write paths, and UI references
- Copy strings that display state labels

**Data model scaffolding:**
- Create a new `protocolSessions` Firestore collection with the schema below (don't wire it into the UI yet — that's Phase 2)
- Add TypeScript types in `mobile/src/types/models.ts`

```ts
// New schema — add to models.ts
export interface ProtocolSession {
  userId: string;
  protocolId: string;
  stateBefore: BrainState;
  stateAfter: BrainState | null; // null until re-check completes
  timeWindowSelected: 2 | 5 | 10 | 20 | 45;
  durationActualSeconds: number;
  outcome: 'shifted' | 'not_shifted' | 'maintenance' | 'abandoned';
  userChosenNextStep: 'try_longer' | 'rest_later' | 'dismissed' | null;
  intentPath: 'down_regulation' | 'sleep' | 'activation' | 'default';
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}
```

**Firestore rules update:**
- Add `protocolSessions/{sessionId}` rules matching the existing pattern (userId-scoped)

**Intent path scaffolding:**
- Add `intentPath` field to the User profile type (default to `'default'` for existing users)
- No UI changes yet — Phase 3 handles the onboarding capture

### Files touched
- `mobile/src/types/models.ts`
- `mobile/src/constants/brainStateProtocols.ts` (key rename, values stay for now)
- `mobile/src/services/firebase/*` (rename references)
- `mobile/src/components/dashboard/BrainStateCheckin.tsx` (rename references)
- `mobile/src/constants/brainInsightsCopy.ts` (rename any state references in copy)
- `firestore.rules` (add `protocolSessions` rules)
- Any other file grep surfaces for `okay` or `energized` as BrainState

### Files created
- None (all changes are modifications or schema additions)

### Acceptance criteria
- `grep -r "BrainState.*okay" mobile/src/` returns no results (or only commented/migration code)
- `grep -r "BrainState.*energized" mobile/src/` returns no results
- App installs, launches, and completes a check-in with the new state labels visible
- No Firestore read errors for existing check-in docs (backward compatibility — existing `okay`/`energized` values need a migration or adapter)
- New `ProtocolSession` type is defined but unused

### Backward compatibility note for Claude Code
Existing Firestore data has `okay` and `energized` values. Options:
1. Migrate all historical data in a one-time script (cleanest, but risks data loss)
2. Read-time adapter: when reading a check-in with `okay`, map it to `steady` in memory
3. Write-time only: new writes use new labels, old reads are handled via adapter

Recommend option 2 for Phase 0. A full migration can happen later if desired.

### Claude Code input files
- `Vara_Build_Guide.md`
- This plan (Phase 0 section)

### Estimated effort
1-2 Claude Code sessions, 4-6 hours of focused time.

---

## Phase 1 — Rebuild protocol library + guided session player

### Goal
Expand the static `BRAIN_STATE_PROTOCOLS` from its current set (Extended Exhale, Activating Breathwork, 90-Second Micro-Reset, Gratitude & Clarity Reflection) to the 11-protocol launch library. Build a real guided-session player that runs any protocol with timed steps, audio (for NSDR), and visual pacing (for breathwork).

### Scope

**Protocol library expansion:**
- Restructure `brainStateProtocols.ts` from `Record<BrainState, Protocol>` to `Record<ProtocolId, Protocol>` because protocols are now 1:many with states
- Add the 11 protocols from `Vara_Brain_State_Model_v2.2.md`:
  - Cyclic Sighing (2 min)
  - Sensory Reset (2 min)
  - Extended Exhale (2 min)
  - Box Breathing (2 min)
  - Coherence Breathing (5 min)
  - Brief Movement (5 min, 10 min variants)
  - NSDR (10 min, 20 min variants)
  - Cold Water Reset (5 min including prep)
  - Mindful Walking (10 min, 20 min variants)
  - Focused Work Window (45 min, 90 min)
  - Bright Light Exposure (10 min, 20 min)
- Each protocol has: id, name, description, evidenceTier, durationSeconds, timeWindow, category, steps (array of {instruction, durationSeconds, audioCue?}), suitableForStates, suitableForTimesOfDay, contraindications
- Remove or deprecate the old protocol entries (Activating Breathwork, etc.) — if they overlap with new protocols, rename; otherwise remove

**Guided session player:**
- New component: `mobile/src/components/protocol/GuidedSessionPlayer.tsx`
- Plays a protocol step by step with timers
- For breathwork: visual pacing (expanding/contracting circle using Reanimated 3)
- For NSDR: audio playback (ElevenLabs-generated files bundled with the app or streamed from Firebase Storage)
- For Sensory Reset: sequential instructions ("Notice 5 things you can see...")
- Handles pause, resume, skip-step, abandon
- Records session start/end times, steps completed, abandonment

**Audio infrastructure:**
- For Phase 1, use ElevenLabs-generated audio (per founder direction)
- Store audio files in Firebase Storage under `protocolAudio/{protocolId}/{variant}.mp3`
- Use `expo-av` for playback (already in the dependency tree)
- NSDR scripts from `Vara_NSDR_Audio_Scripts.md` are the source for recording

**Protocol detail screen:**
- New component or revision of existing: `mobile/src/screens/protocol/ProtocolDetailScreen.tsx`
- Shows protocol name, description, duration, what to expect, evidence citation
- CTA: "Start" — launches the GuidedSessionPlayer

### Files touched
- `mobile/src/constants/brainStateProtocols.ts` (major restructure)
- `mobile/src/types/models.ts` (protocol type extensions)

### Files created
- `mobile/src/components/protocol/GuidedSessionPlayer.tsx`
- `mobile/src/components/protocol/BreathPacer.tsx` (the expanding/contracting circle)
- `mobile/src/screens/protocol/ProtocolDetailScreen.tsx` (if not already present)
- `mobile/src/services/audio/protocolAudioLoader.ts`
- Audio files: 10-min NSDR, 20-min NSDR, potentially Sensory Reset voiceover

### Acceptance criteria
- All 11 protocols defined in the library with correct durations, steps, and metadata
- GuidedSessionPlayer plays through a 2-minute Cyclic Sighing end-to-end with visual pacing
- GuidedSessionPlayer plays through a 10-minute NSDR end-to-end with audio
- Pause/resume works; skip-step works; abandon records data correctly
- No regressions in the existing check-in flow (protocol launch still works)
- Audio files load within 2 seconds on first play (cache after that)

### NSDR audio production
Before or during Phase 1, generate the NSDR audio files:
- ElevenLabs: select a voice that matches Vara's brand tone (calm, grounded, neutral). Recommend testing 3-4 voices before committing.
- Feed the scripts from `Vara_NSDR_Audio_Scripts.md` exactly as written
- Generate 10-min and 20-min variants
- Export as MP3 at 128kbps (small enough for mobile, high enough quality for spoken voice)
- Upload to Firebase Storage under `protocolAudio/nsdr/`

### Claude Code input files
- `Vara_Build_Guide.md`
- `Vara_Brain_State_Model_v2.2.md`
- `Vara_Protocol_Detail_Content.md`
- `Vara_NSDR_Audio_Scripts.md`

### Estimated effort
3-4 Claude Code sessions, 20-30 hours of focused time. The guided session player is the biggest single piece of net-new UI in the whole plan.

---

## Phase 2 — Revise core loop (check-in → time → protocol → adaptive re-check)

### Goal
Implement the revised core loop specified in `Vara_Core_Loop_v2.md`. This replaces the current single-tap check-in + static protocol flow with a multi-step flow that captures state, time window, runs a selected protocol, re-checks, and branches based on whether the state shifted.

### Scope

**Check-in revision:**
- Refactor `BrainStateCheckin.tsx` to become a multi-step flow:
  1. Step 1: state selection (existing)
  2. Step 2: time window selection (new)
  3. Step 3: protocol recommendation (new UI showing the selected protocol with confirmation)
  4. Step 4: guided session player runs
  5. Step 5: state re-check (new UI, mirrors step 1)
  6. Step 6: adaptive response (new — shifted vs not-shifted paths)

**Time window selection:**
- New component: `TimeWindowSelector.tsx`
- Five chips: 2 min, 5 min, 10 min, 20 min, 45+ min
- Each chip shows duration + one-line framing ("A quick reset," etc.)
- Single tap advances to protocol recommendation

**Protocol recommendation screen:**
- Shows the algorithm-selected protocol
- Copy: "Here's what fits your Wired state and 5 minutes: Cyclic Sighing"
- CTA: "Start" — launches the GuidedSessionPlayer from Phase 1
- Secondary: "See other options" — opens a filtered view of alternatives

**Re-check:**
- New component: `PostProtocolReCheck.tsx`
- Same 5 state chips as the initial check-in
- Copy: "How are you now?" (no subtitle — the just-completed protocol is identified visually elsewhere on the screen so users re-mounting after an interruption aren't confused about which protocol they're re-checking against)
- Single tap advances to adaptive response

**Adaptive response — shifted path:**
- Full-screen modal (or overlay) with affirming copy
- Copy varies by transition (per spec — Wired → Steady is different from Foggy → Clear)
- Auto-dismiss after 4 seconds or on tap; routes to Today

**Adaptive response — not-shifted path:**
- Full-screen modal with validating copy
- Two secondary-styled buttons: "Try something longer" + "Rest and come back later"
- Never auto-dismiss; waits for user action
- "Try something longer" → routes to Practices, filtered to longer protocols matching current state
- "Rest and come back later" → routes to Today with a quiet "welcome back whenever" card in the top slot

**Session data capture:**
- Every session now writes a full `ProtocolSession` record to Firestore (not just `protocolCompleted: true` on the check-in doc)
- Fields captured: stateBefore, stateAfter, timeWindowSelected, durationActualSeconds, outcome, userChosenNextStep, intentPath
- The daily `brainStateCheckIn` doc still exists for backward compatibility (it records the first check-in of the day), but the richer session data is the new authoritative source

**Overwhelm Safety Card integration:**
- When entered via Overwhelm Safety Card, skip state selection (assume wired), skip time selection (default 2 min), go directly to a Cyclic Sighing or Sensory Reset
- Still run the re-check, but the not-shifted copy uses softer language per the spec
- This routing is handled at the entry point, not in the main check-in flow

### Files touched
- `mobile/src/components/dashboard/BrainStateCheckin.tsx` (major refactor)
- `mobile/src/services/firebase/brainStateCheckIn.service.ts` (extended to also write ProtocolSession records)
- `mobile/src/screens/dashboard/DashboardScreen.tsx` (may need updates for how it launches the new flow)

### Files created
- `mobile/src/components/checkin/TimeWindowSelector.tsx`
- `mobile/src/components/checkin/ProtocolRecommendation.tsx`
- `mobile/src/components/checkin/PostProtocolReCheck.tsx`
- `mobile/src/components/checkin/ShiftedResponse.tsx`
- `mobile/src/components/checkin/NotShiftedResponse.tsx`
- `mobile/src/services/firebase/protocolSession.service.ts`

### Acceptance criteria
- User can complete the full loop end-to-end on device: check-in → time → protocol → re-check → shifted response → Today
- User can complete the not-shifted path and reach both "Try something longer" and "Rest and come back later" branches
- ProtocolSession record is written to Firestore with correct data for both shifted and not-shifted outcomes
- Abandoning mid-protocol records `outcome: 'abandoned'`
- State transitions match the shifted/not-shifted definitions in the spec (Wired → Foggy counts as partial shift, Steady → Steady after Focused Work counts as maintenance, etc.)
- Overwhelm Safety Card flow works and bypasses state/time selection

### Claude Code input files
- `Vara_Build_Guide.md`
- `Vara_Core_Loop_v2.md`
- `Vara_Modal_Design_System_v1.1.md`
- `Vara_Brain_State_Model_v2.2.md` (for protocol reference)

### Estimated effort
3-4 Claude Code sessions, 20-30 hours of focused time. This is the biggest behavioral change in the whole plan.

---

## Phase 3 — Intent path + onboarding questions + path-aware data

### Goal
Capture the user's intent path during onboarding (down-regulation / sleep / activation / default), capture their time-of-day stress patterns, and persist both to the user profile for use by the algorithm and the copy system.

### Scope

**Intent path screen in onboarding:**
- Add an "Intent Capture" screen after the existing onboarding's explanation of what Vara is, before the Promise screen
- Multi-select allowed: user can pick 1+ of 7 options
- Mapping from options to paths per `Vara_Intent_Paths.md`:
  - "I get overwhelmed easily" / "I react instead of respond" → down_regulation
  - "I can't wind down at night" → sleep
  - "My focus is scattered" / "I'm running on empty" → activation
  - "I want to understand how my brain works" / "Just exploring" → default

**Path resolution logic:**
- If multiple paths match, resolve per priority: sleep > down_regulation > activation > default
- If zero paths match (user skipped or edge case), default to `default`
- Store both the selected options (for future reference) and the resolved path on the user profile

**Intent-shaped path screen:**
- After Intent Capture, show the path-specific "Your first week is shaped for [X]" screen
- Four variants per `Vara_Intent_Paths.md`
- Each shows: headline, body copy, starter Learning card, CTA "See your Today"

**Time-of-day questions:**
- Add two screens to onboarding after the path screen
- "When during your day do you usually feel most Wired?" — 7 chips (early morning, mid-morning, midday, early afternoon, late afternoon, evening, late night) + "Not sure yet"
- "When during your day do you usually feel most Foggy?" — same chips
- Both optional (user can tap "Not sure yet" for either or both)

**Notification defaults based on time-of-day answers:**
- If `wiredTimeOfDay` is set, schedule primary check-in notification 30 min before that window
- If `foggyTimeOfDay` is set, schedule secondary optional notification at that window
- If both are unset, fall back to existing default (9 AM)
- Special case for sleep path: override with evening-specific schedule regardless of other answers

**Starter Learning insertion:**
- On completion of the path screen, unlock the path-specific starter Learning immediately
- This Learning appears as the user's second Learning (the first is the existing onboarding Learning from the current codebase, or a net-new "Long exhales activate recovery" if that doesn't exist yet)

### Files touched
- Existing Onboarding V2 screens
- `mobile/src/types/models.ts` (add `intentPath`, `intentSelections`, `wiredTimeOfDay`, `foggyTimeOfDay` to User profile)
- `mobile/src/services/notifications/notificationScheduler.ts` (or equivalent — wire the time-of-day logic into scheduling)

### Files created
- `mobile/src/screens/onboarding/IntentCaptureScreen.tsx`
- `mobile/src/screens/onboarding/IntentPathScreen.tsx` (shows the path-specific content)
- `mobile/src/screens/onboarding/TimeOfDayWiredScreen.tsx`
- `mobile/src/screens/onboarding/TimeOfDayFoggyScreen.tsx`
- `mobile/src/constants/intentPathContent.ts` (the 4 path variants of headline, body, starter Learning)

### Acceptance criteria
- New user can complete onboarding and select intents
- Resolved path is stored correctly on user profile
- Path-specific screen renders with correct copy per variant
- Time-of-day questions capture and persist
- Notification scheduling reflects time-of-day answers (verify by checking scheduled notifications in device settings or emulator)
- Existing users (who onboarded before this change) default to `intentPath: 'default'` without errors

### Existing-user migration
Existing TestFlight users don't have `intentPath` on their profile. Handle via:
- Default to `'default'` in code when reading a profile without the field
- Optionally prompt existing users to update their path via Settings (nice-to-have, not required for Phase 3)

### Claude Code input files
- `Vara_Build_Guide.md`
- `Vara_Intent_Paths.md`
- `Vara_Modal_Design_System_v1.1.md`

### Estimated effort
2-3 Claude Code sessions, 12-18 hours of focused time.

---

## Phase 4 — Algorithm upgrade

### Goal
Replace the static `brainState → protocol` table lookup with a real algorithm that uses state + time window + time of day + intent path + recent history to select the best-fitting protocol.

### Scope

**New protocol selection service:**
- Create `mobile/src/services/protocolSelector.service.ts`
- Pure function: `selectProtocol(input: ProtocolSelectionInput): ProtocolId`
- Input: `{ state, timeWindow, timeOfDay, intentPath, pathDecayDay, recentSessions }`
- Output: A single protocol ID

**Algorithm logic per `Vara_Core_Loop_v2.md`:**
1. Hard filter: protocols within the time window
2. State-match strength scoring (some protocols strong for some states)
3. Time-of-day fit (NSDR afternoons/evenings, Bright Light mornings)
4. Intent path bias (per Intent Paths spec — linear decay over 7 days)
5. Recency penalty (protocols done in last 48h deranked)
6. Response history bonus (protocols that shifted this user get a boost)
7. Tie-break: evidence tier, then un-tried protocols preferred

**Recent history query:**
- Pull last 7 days of `ProtocolSession` records from Firestore
- Cache in memory for the current session to avoid repeated queries
- Invalidate cache on any new session write

**Integration with check-in flow:**
- The "Protocol Recommendation" step from Phase 2 calls this service instead of the old `getProtocolForState()` table lookup
- Display the selected protocol in the recommendation screen
- "See other options" shows top 3-5 alternatives per the scoring

**Backward compatibility:**
- `getProtocolForState()` can remain as a fallback or be deprecated entirely
- If deprecated, ensure no other code paths reference it (grep + refactor)

### Files touched
- `mobile/src/components/checkin/ProtocolRecommendation.tsx` (from Phase 2)
- `mobile/src/constants/brainStateProtocols.ts` (add metadata needed for scoring: `suitableForTimesOfDay`, `stateMatchStrength`, etc. if not in Phase 1)
- Any file that references `getProtocolForState()` — replace with `selectProtocol()`

### Files created
- `mobile/src/services/protocolSelector.service.ts`
- `mobile/src/services/protocolSelector.types.ts`
- `mobile/src/services/__tests__/protocolSelector.test.ts` (unit tests — the algorithm is pure, so easily testable)

### Acceptance criteria
- Given (Wired, 5 min, afternoon, down_regulation path day 3, no recent sessions), selectProtocol returns one of: Sensory Reset, Cyclic Sighing, or Extended Exhale
- Given (Wired, 20 min, evening, sleep path day 2, no recent sessions), selectProtocol returns NSDR 20-minute
- Given (Foggy, 10 min, early afternoon, activation path day 1, no recent sessions), selectProtocol returns Brief Movement or NSDR 10-min
- Given a user with 3 recent Cyclic Sighing sessions, next selectProtocol for (Wired, 2 min) does NOT return Cyclic Sighing if other suitable options exist
- All unit tests pass
- No regressions in the existing check-in flow

### Claude Code input files
- `Vara_Build_Guide.md`
- `Vara_Core_Loop_v2.md` (has the algorithm spec)
- `Vara_Intent_Paths.md` (has the path bias rules)
- `Vara_Brain_State_Model_v2.2.md` (has the protocol metadata)

### Estimated effort
2-3 Claude Code sessions, 10-14 hours of focused time. Most of the time is testing permutations, not writing the algorithm.

---

## Phase 5 — Patterns copy tuning + Coach tone calibration

### Goal
Surface Pattern insights with copy that matches the user's intent path, and calibrate Coach (V) to speak in a tone appropriate to the user's path.

### Scope

**Patterns copy variants:**
- Identify the insight types that Patterns surfaces (likely 8-12: recovery count, most-Wired time, fastest-recovery protocol, time-of-day patterns, etc.)
- For each insight type, write 4 copy variants — one per intent path
- Store in `mobile/src/constants/patternsCopyTemplates.ts`
- At render time, select the variant based on `user.intentPath`

Example:
```ts
// patternsCopyTemplates.ts
export const RECOVERY_COUNT_TEMPLATES = {
  down_regulation: (count, protocol) =>
    `You recovered from Wired ${count} times this month. Your fastest path back: ${protocol}.`,
  sleep: (count, protocol) =>
    `${count} times this month, your evening state shifted from Wired to Steady. That's recovery practice working.`,
  activation: (count, protocol) =>
    `You moved out of Wired ${count} times this month. Worth noticing: your system can do this.`,
  default: (count, protocol) =>
    `Your most Wired time is ${timeLabel}. ${protocol} shifted you ${count} times this month.`,
};
```

**Coach (V) tone calibration:**
- Update V's system prompt to include a section conditioning on `user.intentPath`
- Four tone variants per `Vara_Persona_Validation.md`:
  - down_regulation: softer, "settle," "recover," "support," "ease"
  - sleep: quiet, evening-appropriate, "wind down," "release," "let go"
  - activation: lift-oriented, "reset," "clear," "shift," "ready"
  - default: balanced, observation-driven
- No change to V's behavior, scope, or protocols — only language register

### Files touched
- `mobile/src/screens/patterns/*` (or equivalent — wherever insights render)
- V's system prompt file (wherever it lives in the codebase)
- `mobile/src/services/coachPrompt.service.ts` (or equivalent — wherever the prompt is composed)

### Files created
- `mobile/src/constants/patternsCopyTemplates.ts`
- Possibly `mobile/src/services/coachToneSelector.ts` if cleaner than inline

### Acceptance criteria
- User on down_regulation path sees different Pattern copy than user on default path (verified with test accounts of each path)
- V's replies to the same question differ in tone across paths (verified by sending identical messages from two test accounts on different paths and comparing)
- No functional change — V still recommends the same protocols, answers the same questions, respects the same safety boundaries

### Claude Code input files
- `Vara_Build_Guide.md`
- `Vara_Intent_Paths.md`
- `Vara_Persona_Validation.md` (for the tone guidelines)

### Estimated effort
2-3 Claude Code sessions, 10-14 hours. Most time is content writing (32-48 copy strings for the Pattern templates); code changes are modest.

---

## Phase 6 — Polish, testing, launch prep

### Goal
Bring everything to launch quality: fix edges, verify flows, test on devices, produce TestFlight build, handle App Store submission prep.

### Scope

**Edge case testing:**
- First-time user end-to-end: download → onboarding → first check-in → first protocol → Patterns empty state → return next day
- Returning user after 5-day absence: no shame, welcome back, Patterns still intact
- User abandons mid-protocol: data recorded correctly, no partial state issues
- User with slow network: all Firestore writes have retry + offline queue
- User who denies notification permissions: app works, just no scheduled check-ins

**Performance passes:**
- Cold launch to Today screen: under 2 seconds
- Check-in modal open to state selection: under 300ms
- Protocol start (including audio load if NSDR): under 2 seconds
- Animations hit 60fps on iPhone 12 / mid-tier Android

**Copy review pass:**
- Read every screen of the app aloud
- Flag any copy that feels off-brand (too clinical, too cheerful, too pressure-y, uses banned patterns)
- Cross-reference against the CTA Library and Voice & Tone Rules

**Empty states final review:**
- Verify all six empty states from the spec are implemented
- Patterns, Learnings, Journal (2 variants), Community, Habits, Routines

**Accessibility pass:**
- Touch targets ≥ 48px
- Color contrast meets WCAG 2.1 AA (all copy)
- Screen reader support on the check-in flow and protocol player
- Respects Reduce Motion system setting

**Privacy and settings:**
- Verify the Privacy Policy accurately reflects the new ProtocolSession data collection
- Update the in-app privacy summary if needed
- Verify account deletion removes all ProtocolSession records

**TestFlight build:**
- Increment build number in eas.json
- Run `eas build --profile preview --platform ios`
- Submit to App Store Connect internal testing
- Invite beta testers

**App Store submission prep:**
- Take new screenshots reflecting the revised loop (6.7", 6.1", optionally iPad)
- Update App Store listing copy if positioning has shifted since the last submission
- Verify privacy nutrition labels still accurate

### Files touched
- Many — this is a cleanup and polish phase across the whole app

### Files created
- `mobile/src/__tests__/e2e/` — end-to-end test scripts if not already present
- `BETA_LAUNCH_PHASE_2_CHECKLIST.md` — successor to the existing checklist

### Acceptance criteria
- Full app smoke test passes on physical iPhone and Android device
- TestFlight build uploads successfully
- Beta testers can install and use without crashes
- No copy flagged as off-brand in the read-aloud review
- Performance benchmarks met

### Claude Code input files
- `Vara_Build_Guide.md`
- All specs (for cross-referencing copy and behavior)

### Estimated effort
2-3 Claude Code sessions, 10-14 hours. Most of the effort is manual testing and copy review, not new code.

---

## Summary

**Total estimated effort: 86-126 hours of focused work**, 15-22 Claude Code sessions.

At 15-20 focused hours per week, this is roughly 6-8 weeks. Plan for 10 weeks of calendar time to account for:
- Scope discoveries in each phase
- In-flight bug fixes from TestFlight feedback
- NSDR audio production time (separate from Claude Code work)
- Personal time, rest, and the reality that solo founders don't ship on hour-level precision

The plan is sequenced so that each phase leaves the app in a shippable state. If the founder runs out of time, the natural cut point is after Phase 4 — at that point, the core loop is revised and the algorithm is upgraded, but Patterns copy and Coach tone are unchanged. Phase 5 is high-value but deferrable; Phase 6 is launch polish that's always necessary regardless.

---

*Version 1.0 | April 2026 | Ready to execute*
