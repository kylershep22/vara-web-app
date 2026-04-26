# Vara Implementation — Working Notes Per Phase

Carry-over reminders that surface during one phase but apply to a later phase.
Each phase reads its section before starting work.

---

## Phase 1

### Sub-step 1: schema lock landed

`models.ts` now defines `Protocol`, the `ProtocolStep` discriminated union
(`breath` | `audio` | `instruction` | `timer`), `BreathPhase`, `EvidenceTier`,
`TimeOfDay`, `ProtocolModality`, and `ProtocolFamily` (closed set of 11 launch
families; Bellows Breath excluded). `protocolIdNormalizer` mirrors the
Phase 0 `brainStateNormalizer` pattern and resolves legacy ids:

- `extended-exhale` → `extended-exhale`
- `micro-reset` → `sensory-reset`
- `activating-breathwork`, `gratitude-clarity`, `focus-primer` → `null`

Call sites must handle `null` as "protocol no longer available" — do not
fabricate a substitute.

### Sub-step 2: static data populated

`constants/brainStateProtocols.ts` now contains all 16 launch variants
keyed by id (always-suffix scheme: `{family}-{minutes}`). The dict is
typed via `satisfies Record<string, Protocol>` so `ProtocolId` resolves
to the literal union of variant ids. Data validated by 41 assertions in
`constants/__tests__/brainStateProtocols.test.ts`.

Decisions encoded in the data:

- Box Breathing `durationSeconds = 128` (8 complete cycles × 16s),
  user-facing label still "2 min" via `timeWindow`. Other breath
  protocols sum exactly to their duration. Test enforces "every breath
  step is a whole-cycle multiple."
- Focused Work Window: two variants only (45 / 90), both in the 45-min
  time window. `focused-work-90` only surfaces in `mid_morning` and
  `midday` time-of-day; `focused-work-45` extends through
  `early_afternoon`.
- NSDR audio paths: `nsdr/nsdr_10min_v1.mp3`, `nsdr/nsdr_20min_v1.mp3`.
  Test enforces the `nsdr/nsdr_{min}min_v{ver}.mp3` shape.
- LEGACY_PROTOCOL_ID_MAP updated for the new ids:
  `extended-exhale → extended-exhale-2`, `micro-reset → sensory-reset-2`.
- `getProtocolForState(state)` retained as a deprecated Phase 1
  transitional helper that returns the first state-matching variant in
  library iteration order. Phase 2 swaps the existing call sites
  (`brainStateCheckIn.service.ts`, `useDashboard.ts`,
  `OnboardingV2CheckInScreen.tsx`, `OnboardingV2ProtocolScreen.tsx`)
  over to the new check-in loop. `TodaysProtocolCard.tsx` already
  consumes the new `Protocol` shape via `utils/protocolDisplay.ts`.

### Sub-step 3: primitives landed (BreathPacer + audio loader)

**BreathPacer** at `components/protocol/BreathPacer.tsx`. Self-contained
primitive: takes a `BreathStep` and an optional `startAtScheduleIndex`,
walks the schedule via `setTimeout`, animates the scale via Reanimated 4
shared values, and surfaces phase boundaries to the parent via
`onPhaseChange`/`onComplete`. Pause/resume is owned by the parent: pause =
unmount, resume = remount with the saved index. The pure schedule logic
lives in `utils/breathPacerSchedule.ts` (computes 16-cycle / 8-cycle /
30-cycle entry lists for the launch breath protocols) and is fully
unit-tested.

Reduce Motion path: when `useReducedMotion()` is true, renders a static
silver-sage circle with a numeric countdown (driven by a 250ms
setInterval) instead of the animated teal circle. Phase label still
updates. Verify on device by toggling iOS Settings > Accessibility >
Motion > Reduce Motion.

**protocolAudioLoader** at `services/audio/protocolAudioLoader.ts`.
Three exports:
- `prefetchProtocolAudio(audioPath)` — call from Protocol Detail screen
  mount; resolves URL + warms the platform HTTP cache by briefly opening
  and immediately unloading an `Audio.Sound`. Non-fatal: any error is
  logged and swallowed.
- `loadProtocolAudio(audioPath)` — returns a fully-loaded `Audio.Sound`
  ready to play. Caller owns the lifetime (must call `unloadAsync()`
  in cleanup). Throws a user-friendly error on failure.
- In-memory `urlCache: Map<audioPath, downloadUrl>`. Keyed by audioPath;
  versioned filenames handle invalidation. Cache lives for the JS bundle
  lifetime (cleared on app restart / hot reload).

Path convention: `audioPath` is relative to the `protocolAudio/` root
in Firebase Storage. The full Storage path is constructed by prepending
`protocolAudio/`. Test enforces this.

**Dev test screens** at `screens/_dev/`:
- `BreathPacerTestScreen.tsx` — preset selector for the four breath
  protocols + a 6-second short-cycle preset, restart button, phase log,
  reduce-motion indicator. Mount anywhere via temporary navigator
  route while testing.
- `ProtocolAudioLoaderTestScreen.tsx` — preset paths, prefetch / load /
  play / pause / reset buttons, ms-timed log, cache size readout, on-screen
  verification checklist. Requires a stub clip uploaded to
  `protocolAudio/nsdr/nsdr_10min_v1.mp3` (founder action).

Both screens are gated by directory naming (`_dev/`) — easy to spot
and remove before TestFlight. They are not referenced by the navigator
yet; the founder wires a temporary route while testing on device.

### Sub-step 4 — landed

Player composition shipped across 4.3.1 → 4.3.4. Summary:

- **`utils/sessionMarker.ts`** — AsyncStorage marker module, 19 tests.
- **`utils/playerReducer.ts`** — pure reducer with discriminated
  PlayerStatus union; 52 tests including audio_error transitions.
- **`hooks/useStepCountdown.ts`** — shared countdown hook for
  Instruction/Timer leaves; 10 tests including the inline-arrow
  callback regression.
- **Leaves**: `BreathPacer`, `AudioStepView`, `InstructionStepView`,
  `TimerStepView`. AudioStepView has a `__DEV__`-gated "Force audio
  error" button for the test screen.
- **Transport + modal**: `PlayerTransport` (bottom-pinned bar) +
  `EndEarlyConfirmModal` (centered modal). Verb-aligned ("End early"),
  Soft Coral destructive treatment, 48px touch targets, light haptics
  on Pause/Resume + Back-15s + End early.
- **`GuidedSessionPlayer`** — composes everything. Mount-only
  recovery effect with 30s timeout, ref-driven handler, single-key
  marker preservation on parent rejection. Header X dispatches
  user_exit always; transport End early dispatches audio_error in
  error state.
- **Dev test harness**: `screens/_dev/GuidedSessionPlayerTestScreen`
  with protocol picker, recovery fixture options (none / happy /
  expired / corrupt), real mount/unmount semantics for the player,
  on-device verification checklist.

Phase 1 sweep at sub-step 4.3.4 close: **299/299 tests across 14
suites**. tsc baseline unchanged at 181 pre-existing errors.

### Sub-step 4 deferred-to-Phase-6

- FWW notifications silence — flagged here, not implemented. Adding
  `expo-notifications.setNotificationHandler` is invasive; user can
  rely on system Focus mode for now.
- AppState background-lifecycle handling — not implemented. Phase 1
  recovers force_quit via the AsyncStorage marker on next mount; brief
  app backgrounding is not detected as abandonment.
- "Skippable after first use" orientation — every Phase 1 session
  shows the brief idle-state orientation. Tracking which protocols
  the user has seen before is Phase 6 polish.

### Sub-step 4.4 entry checklist — device verification

Before sub-step 4.4 begins, the founder runs the on-device
verification checklist baked into
`GuidedSessionPlayerTestScreen.tsx`. Seven scenarios cover the major
production code paths (happy completion, audio-error transport flow,
Try again loop, header X exit, three recovery fixtures).

Sub-step 4.4 itself is targeted-test or device-fix-only depending on
what device verification surfaces. Per founder direction: no
additional integration tests beyond the 14 already in
`GuidedSessionPlayer.test.tsx` unless device verification reveals a
gap.

### Sub-step 5: audio path convention

Audio steps reference Firebase Storage paths relative to `protocolAudio/`.
NSDR variants ship as versioned mp3 files per
`docs/Vara_NSDR_Audio_Scripts.md`:
- `nsdr/nsdr_10min_v1.mp3`
- `nsdr/nsdr_20min_v1.mp3`

The audio loader can stub against a short test clip uploaded to Storage
until production NSDR audio lands; do not block sub-step 4 player work
on production audio.

---

## Phase 2

### Phase 2 entry test baseline (post-jest-config-fix)

After the `firebase|@firebase` transformIgnorePatterns fix and `mjs`
transform-pattern extension landed at Phase 2 entry:

- **Test suites:** 35 passed / 35 total
- **Tests:** 542 passed / 542 total
- **tsc:** 181 pre-existing errors (unchanged from Phase 0/1 baseline)

**Asterisk on prior Phase 1 baselines.** Phase 1's "299/299 across 14
suites" reports (sub-step 4.3.4 close, similar reports across earlier
sub-steps) were technically accurate but **scoped to suites that ran
successfully** — the pre-existing `firebase/storage` ESM transform
issue meant `useBrainStateWeekTrend.test.ts` never executed during
those reported sweeps. Phase 1 runs appear to have been path-filtered
to brain-state-touching code, which silently excluded the unloadable
suite from the result line. A full-project `npx jest` (no path filter)
at any point during Phase 1 would have shown "1 failed, N passed" and
surfaced the gap. The asterisk: prior Phase 1 baselines reflected what
ran, not the full project state. Treat 35/542 as the Phase 2-going-
forward truth.

The dep chain that triggered the latent failure (`useBrainStateWeekTrend.ts`
→ `brainStateCheckIn.service.ts` → `src/config/firebase.ts` →
`firebase/storage`) was assembled pre-redesign (last link 2026-03-30,
Phase 0 starts 2026-04-24). Not a Phase 1 regression; just unobserved.

### Sub-step 2.2 entry — locked decisions

Sub-step 2.2 builds the multi-step check-in flow orchestration (state
→ time → recommendation → running → re-check → response). Locked
decisions before composition begins:

- **Reducer treats `GuidedSessionPlayer` as opaque.** Render
  `<GuidedSessionPlayer onExit={...}>`. Do not observe internal player
  state.
- **Back navigation:** enabled during state-pick, time-pick,
  recommendation. **Disabled** during running, re-check, response.
  Once a protocol starts, the only exits are End early (→ abandoned)
  and Complete (→ re-check → response).
- **Practices index screen ships in 2.2** (resolves the "See other
  options" route gap). Thin screen listing protocols matching
  `(state, timeWindow)`; tap to launch `GuidedSessionPlayer`. No
  ranking, no algorithm — Phase 4 adds ranking on top of the existing
  screen. Pre-builds the surface that the Build Guide's "Practices
  index" tab root will eventually align to. The "Try something longer"
  affordance on the not-shifted response routes to the same screen.
  Estimated +4–6 hours on top of the reducer work; kept in 2.2, not a
  separate sub-step.
- **Overwhelm Safety Card flow** skips state-pick, time-pick, AND
  recommendation. Caller pre-picks the protocol (Cyclic Sighing or
  Sensory Reset 2-min) and the flow initializes directly at the
  running step. The Safety Card itself is the consent moment.
- **Abandoned outcome short-circuits.** Player exit with
  `reason='ended_early'` writes the ProtocolSession with
  `outcome='abandoned'`, `stateAfter=null`, and exits to Today with a
  soft "come back when ready" surface. Re-check is **not** shown.
  Implication: `ReCheckStep` and `ResponseStep` are only reachable
  with `playerExitReason: 'completed'`.
- **Auto-dismiss vs user-tap on shifted path.** Distinguish
  `'dismissed'` (user tapped Continue) from `'auto_dismissed'` (4-second
  timer fired without interaction) in `userChosenNextStep`. Phase 5
  Patterns may care about the difference.
- **Outcome classifier as pure function.** `outcomeClassifier.ts`
  pulled forward from sub-step 2.3 because the 2.2 reducer needs it at
  the re-check → response transition. Lives at
  `mobile/src/services/outcomeClassifier.ts` (decoupled from UI for
  later reuse). Rules: `wired→foggy = 'partial_shift'` (strict, only
  this transition); negative→green = `'shifted'`; green→green (any
  direction, including upward) = `'maintenance'` per the "user remains
  functional" rationale; same-negative-state and green→negative
  regressions = `'not_shifted'`. **`'failed'` is reserved for system
  failures (audio_error and similar)** — user-side regressions are
  `'not_shifted'`, not `'failed'`.
- **`STEP_TRANSITION_DURATION_MS = 250`** hoisted to
  `mobile/src/constants/motion.ts` (new file). Both
  `GuidedSessionPlayer.tsx:487` and 2.2's flow transitions reference
  it. Other Build Guide motion-range constants (haptic timings, button
  feedback, modal fades) colocated in the same file if obvious during
  the scan; ambiguous cases defer to a future cleanup.

### Sub-step 2.3 entry — TransitionKey table sizing

`ShiftedResponse` copy table (sub-step 2.3 deliverable) uses
`Record<TransitionKey, string>` where `TransitionKey` encodes
`(stateBefore, stateAfter)` — e.g. `'wired_to_steady'`. Table sizing
must cover **all** transitions that classify as `'shifted'` /
`'partial_shift'` / `'maintenance'`, including upward green-to-green
shifts. Don't size assuming only "negative→green" transitions exist.

Concretely, the table needs entries for at minimum:
- `wired_to_foggy` (partial_shift — only this one)
- 6 `(wired|foggy) → (steady|clear|alive)` shifts
- 3 upward green shifts: `steady_to_clear`, `steady_to_alive`,
  `clear_to_alive` (per the 2.2 classifier rule — see
  SPEC_CONSISTENCY_BACKLOG.md "Outcome classifier" entry)
- 6 maintenance entries: 3 same-state green (`steady_to_steady`,
  `clear_to_clear`, `alive_to_alive`) + 3 downward green
  (`alive_to_clear`, `clear_to_steady`, `alive_to_steady`)

Total: 16 transitions worth copy. Different emotional moments
(`wired_to_clear` vs `steady_to_alive` vs `clear_to_clear`); don't
collapse them into a single template.

Phase 5 expansion: `Record<IntentPath, Record<TransitionKey, string>>`
multiplies this by 4 paths. Design 2.3's data shape so the path
nesting can be added without a structural rewrite (e.g., default-path
table at the inner level from day one).

The `'not_shifted'` path doesn't need per-transition copy — Core Loop
v2 uses one validating message regardless of the specific (before,
after) pair.

### Firestore rules deploy required before first write

The `protocolSessions/{sessionId}` rules block was added in Phase 0 but
**not deployed.** Phase 2 is the first phase that writes to this collection.

Before any Phase 2 code path writes a `ProtocolSession` doc, run:

```bash
firebase deploy --only firestore:rules
```

If the deploy is missed, writes will fail with `FirebaseError: Missing or
insufficient permissions` and existing TestFlight users will hit the error
during the new check-in loop.

Surfaced: Phase 0 wrap-up.

### Doc-ID convention for `protocolSessions`

Per the Phase 0 rules-block comment: auto-generated IDs (multiple sessions per
user per day are expected, unlike `brainStateCheckIns` which uses
`{userId}_{date}`). Use `addDoc()` rather than `setDoc()` with a constructed ID.

### Sub-step 2.4 entry — locked decisions

Sub-step 2.4 builds the polished `NotShiftedResponse` component
(replacing the 2.2 placeholder in `ResponseStepView`) and adds the
late-night NSDR swap as a thin Phase-2-stub-extension wrapper.

- **Wrapper, not stub-recommender extension.** Late-night NSDR
  override lives in `services/lateNightNSDRSwap.ts` as a separate
  pure function. NOT inside `protocolSelector.service.ts`. Phase 4
  owns the recommender's full algorithm including time-of-day —
  injecting it into the Phase 2 stub muddies the contract. Wrapper
  is marked for absorption into Phase 4; delete the file when Phase 4
  lands.
- **Hour boundaries:** `hour >= 22 || hour < 4`. Six hours total
  (22, 23, 0, 1, 2, 3) trigger the override. 4 AM is the cutoff
  because someone Wired past that point is closer to "give up and
  start the day" than "rest" — a 20-minute NSDR is the wrong
  recommendation.
- **State filter:** `stateBefore === 'wired'` only. Foggy late-at-
  night is a different problem; recommender's normal output is fine.
- **Variant:** hardcoded `nsdr-20`. Phase 4 will pick variant from
  user's NSDR completion history (users who've abandoned 20-min
  mid-session should get `nsdr-10`). Comment in the wrapper notes
  this.
- **Two consumers, single source of truth.** Both `NotShiftedResponse`
  (copy adaptation: button label changes to "Try NSDR when you're
  ready") and the `CheckInFlow` PARENT (navigation routing: route to
  `PracticeRun(nsdr-20)` instead of Practices index) call
  `getLateNightNSDRSwap`. Pure + cheap, two callers fine. Avoids a
  "swap detected for copy but missed for navigation" drift class.
- **Late-night hint copy is neutral**, not sleep-specific.
  `'About 20 minutes of guided rest'`. Wired at 11pm doesn't always
  mean "going to sleep" (working late, traveling, etc.). Vara has
  `sleep` as a distinct intent path; default-path users getting
  sleep-framed copy creates cross-path inconsistency. Phase 5 layers
  in path-specific late-night hints; default stays neutral.
- **Hour zone source of truth:** device-local-hour
  (`new Date().getHours()`). Spoofing is self-harm only; user moving
  timezones works correctly. Logged in TECH_DEBT_BACKLOG for a
  future device-time-vs-server-time skew check (Phase 4 at the
  earliest).
- **Scope-creep guardrail.** Late-night NSDR is the only recommender
  override in Phase 2. Additional overrides (bright-light morning,
  post-meal movement, etc.) are Phase 4 territory regardless of how
  mechanically simple they look. The wrapper pattern is a
  stub-extension, not a general escape valve.
- **Action shape unchanged.** The button still fires `'try_longer'`
  on tap when in late-night mode. Only the affordance copy and the
  parent-side navigation target differ.
- **No auto-dismiss on the not_shifted path.** Carried forward from
  the 2.2 placeholder (and from Core Loop v2 spec). The user gets a
  decision to make; we don't take it for them.

### Sub-step 2.5 deliverables

Caller migration + first ProtocolSession writes. The scope is broader
than just "swap call sites" — measurement coverage is the real
deliverable.

- **Firestore rules deploy** — run `firebase deploy --only firestore:rules`
  before any code path writes its first `ProtocolSession` doc. The
  rules block has been pending deploy since Phase 0.
- **`protocolSession.service.ts`** — new service module wrapping the
  `addDoc()`-based write to `protocolSessions/{sessionId}`. Consumers
  pass the full record assembled from `FlowCompleteStep` /
  `AbandonedStep` payloads.
- **CheckInFlow `onComplete` callers** — replace the placeholder
  `logger.log` in CheckInFlow's terminal-state useEffect with a real
  Firestore write driven through `protocolSession.service`.
- **Caller migration** — `BrainStateCheckin.tsx`, `useDashboard.ts`,
  `OnboardingV2CheckInScreen.tsx`, `OnboardingV2ProtocolScreen.tsx`
  (per the Phase 1 sub-step 2 list) move from the legacy single-tap
  pattern to launching `CheckInFlow` with the appropriate
  `FlowInit`. Surface the entry from the dashboard, onboarding, and
  any deep-link / notification handler.
- **Browse-launched sessions write ProtocolSession records via Case 4
  flow.** Per Core Loop v2 §Case 4 (Practices browse view): state is
  pre-known from the caller's selection, time-window is pre-known
  from the picked protocol's `timeWindow` field, recommendation is
  skipped, but the run → re-check → response loop still runs. The
  re-check is the measurement (Build Guide §1, atomic unit of value)
  — a browse-launched session that exits without re-check produces
  no state transition, defeating the entire data model. Replace
  `PracticeRunScreen`'s `GuidedSessionPlayer.onExit → goBack()` with
  a CheckInFlow-style mini flow (or factor a shared running →
  re_check → response sub-machine and reuse it).

If Case 4 is forgotten, 2.5 looks complete (caller migration done,
sessions writing) while ~30% of the launch-window's session sources
silently produce zero state transitions. Track explicitly.

---

## Phase 3

_None yet._

---

## Phase 4

_None yet._

---

## Phase 5

_None yet._

---

## Phase 6

### Backlog files to sweep

- `docs/VOICE_AUDIT_BACKLOG.md` — brand-voice issues surfaced during rename and
  feature work.
- `docs/TEST_INFRASTRUCTURE_BACKLOG.md` — Jest config and test environment
  issues.

Both are appended to as work progresses; Phase 6 closes them out.
