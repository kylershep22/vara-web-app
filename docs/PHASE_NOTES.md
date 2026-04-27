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

### Sub-step 2.5 entry — locked decisions

Caller migration + first ProtocolSession writes + Case 4 mini-flow.
The largest remaining sub-step in Phase 2 (13–18h estimated). Scope
is broader than "swap call sites" — measurement coverage is the
real deliverable.

**Test baseline going in:** 43 suites / 738 tests / 181 TS errors.
This number is unambiguous — verified directly that no tests were
disabled or skipped during 2.4. Drift detected on a future entry
should be investigated, not normalized.

**Locked decisions:**

- **Firestore rules deploy** — manual step at the start of 2.5
  composition: `firebase deploy --only firestore:rules`. The rules
  block has been pending deploy since Phase 0; no `protocolSessions`
  write succeeds until this lands.
- **Doc ID format:** `${userId}_${sessionStartedAt}` where
  `sessionStartedAt` is the millisecond integer (Date.now() shape),
  not an ISO string. Idempotent under network retries / accidental
  double-fires of `onComplete` (setDoc with merge is a no-op for
  identical payloads). Deviation from the Phase 0 doc-ID-convention
  note ("auto-generated IDs") — the rationale (multiple sessions per
  user per day) is met by sub-millisecond `sessionStartedAt` values.
- **`writeProtocolSession` shape:** single function, accepts
  `(userId, payload, options?)` where options has `dryRun?: boolean`.
  - Production callers omit `options` (defaults to `dryRun: false`,
    real Firestore write).
  - Dev harness passes `dryRun: true` — skips `setDoc`, logs the
    payload via `logger.log`. Keeps production schema clean of
    harness pollution.
  - The mapper from terminal `FlowState` to write payload is a
    separate pure function in the same file, unit-testable without
    mocking Firestore.
- **`writeStandardFlowSession` helper** — extends
  `brainStateCheckIn.service.ts` per the Implementation Plan's
  parallel-write directive. Calls `writeProtocolSession` AND writes
  the legacy `brainStateCheckIns/{userId}_{date}` doc so v1 read
  paths keep working. CheckInFlow uses this; BrowseRunFlow uses
  `writeProtocolSession` directly (Case 4 doesn't need the legacy
  write — it didn't exist in v1, no backward-compat data dependency).
- **CheckInFlow ownership of writes.** CheckInFlow's terminal-state
  useEffect calls `writeStandardFlowSession` directly (fire-and-
  forget — UX shouldn't block on Firestore). CheckInFlow gets two
  new props: `userId: string` (required) and
  `writeMode?: 'production' | 'dev_dry_run'` (defaults to
  `'production'`). All existing CheckInFlow tests get updated to
  pass `userId='test-user'` + `writeMode='dev_dry_run'`.
- **Schema additions** (models.ts, landing in this commit):
  - `ProtocolSession.stateBefore: BrainState | null` — was required.
    Browse-launched sessions need null. Migration is a no-op
    (existing reads still work). Q3 grep confirmed no Firestore
    queries filter on stateBefore equality.
  - `ProtocolSession.outcome` enum gains `'browse_launched'` (7th
    value). Explicit semantic; faster Patterns queries than
    null-checking stateBefore.
  - `ProtocolNextStep` gains `'auto_dismissed'` (4th value) — back-
    fill from the 2.4 ResponseStepView/ShiftedResponse implementation.
- **`state_preselected` FlowInit variant** — third discriminated
  variant: `{ entrySource: 'state_preselected'; stateBefore }`. The
  reducer initializes at `TimePickStep` with `stateBefore` already
  captured. Used by the dashboard's BrainStateCheckin migration
  (tap a chip → mount CheckInFlow with state already chosen,
  preserves single-tap entry feel).
- **`getProtocolForState()` deletion** — same commit as the last
  caller migration. Don't leave `@deprecated`; that's how dead code
  accumulates. If a future phase reveals an unmigrated caller, it
  surfaces as a TS error and gets fixed immediately.
- **navBranch tag canonical set** — production callers fire the
  same four tags as the dev harness:
    `late_night_nsdr_override` / `no_override_practices_index` /
    `no_navigation_non_try_longer` / `no_navigation_abandoned`.
  Lock the set here so device verification on the harness transfers
  to production. If a fifth scenario emerges, add in one place; both
  consumers pick it up.

**Case 4 mini-flow (BrowseRunFlow):**

- Separate component (`mobile/src/components/checkin/flow/BrowseRunFlow.tsx`),
  not a CheckInFlow extension. Three-step state machine:
  `running → re_check → flow_complete | abandoned`. Reuses
  `ReCheckStepView` from sub-step 2.2 — same UI, no design
  divergence. The user sees identical re-check screens regardless
  of entry source.
- **No response screen.** Skip the shifted/maintenance/etc.
  classification; route directly back to Practices index after
  re-check completes. (See SPEC_CONSISTENCY_BACKLOG "Case 4 routing"
  for the override rationale — the spec says Today; we route to
  Practices to preserve the user's exploration context.)
- **Write payload:** `stateBefore: null`, `outcome: 'browse_launched'`,
  `userChosenNextStep: null`, `timeWindowSelected` pulled from
  `protocol.timeWindow` (not user-selected, but informationally
  useful for queries).
- **Abandoned browse-launched sessions** (player ended_early
  before re_check): `outcome: 'abandoned'` (existing value). The
  only differentiator from standard-flow abandoned is
  `stateBefore: null`.
- **Idempotent writes** — same `${userId}_${sessionStartedAt}` ID
  pattern.

If Case 4 is forgotten, 2.5 looks complete (caller migration done,
sessions writing) while ~30% of the launch-window's session sources
silently produce zero state transitions. The BrowseRunFlow component
+ PracticeRunScreen migration is the load-bearing piece; track
explicitly.

**Out of scope (deferred):**
- Force-quit recovery for re_check abandonment — failure mode named
  in 2.7's entry below; flow-level marker work.
- Telemetry surface for navBranch tags — Phase 5 / Phase 6.
- Migration of legacy `brainStateCheckIns` readers to
  `protocolSessions` — Phase 5+ (a parallel-write window during
  2.5 keeps both collections in sync).

### Sub-step 2.6 entry — locked decisions

Sub-step 2.6 builds the Overwhelm Safety Card from scratch (not a
refactor — the spec was always ahead of implementation; no v1
prototype existed). The CheckInFlow `overwhelm_safety_card` entry
source has been plumbed since 2.2 and exercised in the dev harness
since 2.4; the missing piece is the Today-surface UI that mounts
the flow.

**Locked decisions:**

- **Protocol:** Sensory Reset 2-min via `OVERWHELM_DEFAULT_PROTOCOL_ID`
  constant (`mobile/src/constants/overwhelmDefaults.ts`). Never
  inlined as a string literal at call sites — the constant stays
  stable while Phase 5 may grow conditional selection logic.
  SPEC_CONSISTENCY_BACKLOG flags Implementation Plan line 294 for
  doc reconciliation (drop "Cyclic Sighing or" alternative).
- **Card placement:** Today / dashboard surface, always visible v1.
  Phase 5 layers in surfacing-trigger logic per Intent Paths spec
  (Sleep path day 2, default-path Wired-twice-in-a-row threshold).
- **Visual treatment:** text-only, no icon. Dew Sage card
  background, Soft Charcoal heading, single-line subhead. A
  lifebuoy / SOS / similar icon carries emergency connotation
  banned by Build Guide §4 (calm over stimulation); a neutral icon
  doesn't help findability — typography and placement do that work.
  Re-evaluate post-launch if findability data says otherwise.
- **Card copy:** "Need something right now?" (verbatim from
  Persona Validation line 108). Subhead: "A two-minute reset for
  hard moments." (final wording during composition).
- **Touch target:** full card width, 60–72px tall. Larger than the
  standard 48px minimum because this is the affordance someone
  reaches for while overwhelmed; small targets fail.
- **Accessibility label:** "Need something right now? Two-minute
  Sensory Reset." Warm and explicit. Not "Overwhelm safety card"
  (clinical) or "Tap for help" (alarming).
- **Tap behavior:** `navigation.navigate('CheckInFlow', { entrySource:
  'overwhelm_safety_card', protocolId: OVERWHELM_DEFAULT_PROTOCOL_ID })`.
  CheckInFlowScreen's existing `buildFlowInit` switch handles the
  rest.
- **No analytics gating, no eligibility check.** v1 ships always-
  visible. Tap engagement event → Phase 5 / Phase 6 telemetry pass.
- **`entrySource` plumbing seam.** ResponseStepView →
  NotShiftedResponse threading lands in 2.6 even though
  NotShiftedResponse doesn't consume it yet. Phase 5 uses it to
  surface softer Overwhelm-specific not-shifted copy per Core Loop
  v2 §Case 3 lines 296–301 ("That was a hard moment. Nothing more
  is required of you right now. Rest."). Threading now prevents
  Phase 5 from having to reopen 2.4's component signatures.
- **Position on Today:** above-the-fold reachability is the bar.
  Below the brain-state check-in card is acceptable IF the
  check-in card is compact enough that Overwhelm stays visible
  without scrolling on iPhone 12-class. Otherwise move Overwhelm
  above. 2.7 device-verification screenshots iPhone 12, SE, 15.

**Out of scope:**
- Surfacing-trigger logic (path-specific thresholds) → Phase 5.
- Tap engagement / analytics → Phase 5/6.
- Soft Overwhelm not-shifted copy variant → Phase 5 (plumbing
  threaded in 2.6).
- "Try longer" affordance from Overwhelm path → not applicable
  (the late-night NSDR swap fires from the not-shifted response
  screen; Overwhelm lands there per the standard path).

### Sub-step 2.7 entry — known failure modes to address

Sub-step 2.7 is "first-shift footer + polish + integration + device
verify." Polish-tier sub-step. The known failure modes that should
be on its docket before composition:

- **BLOCKER GATE before TestFlight:** `firebase deploy --only
  firestore:rules` must be run AND a real check-in must produce a
  `protocolSessions` doc visible in Firestore Console. Verify by
  inspecting the doc, not just by absence of crashes. The
  fire-and-forget pattern in CheckInFlow / BrowseRunFlow means
  write failures are silent at the UX layer — the legacy
  brainStateCheckIns write keeps working (so users see no
  visible breakage), but the new schema's data simply never
  lands. The protocolSessions rules block has been pending deploy
  since Phase 0; there is NO automation that runs the deploy.
  This is on the founder, not Claude Code.
- **Dashboard chip-tap → CheckInFlow modal mount UX.** Tap a state
  chip on dashboard. Verify CheckInFlow modal mounts smoothly with
  no visible empty/loading state during transition. Test on cold
  app launch AND warm app state. Slow-device flicker between chip
  tap and modal mount is the failure mode to watch for.
- **Overwhelm Safety Card above-the-fold check.** Screenshot
  Today screen on iPhone 12, iPhone SE, iPhone 15. Confirm
  Overwhelm Safety Card is visible above the fold on all three.
  The 2 AM ruminating scenario assumes a distressed user finds
  the card without scrolling — a card that requires a scroll
  fails the persona validation.
- **Re_check force-quit recovery.** If the user kills the app
  between player exit (player completes successfully) and re-check
  completion, the session has a `stateBefore` but no `stateAfter`,
  no outcome, and no `protocolSessions` doc gets written. On next
  launch, the force-quit recovery marker (Phase 1's AsyncStorage
  pattern) currently only knows about player-level recovery, not
  flow-level. Solving this properly means the flow itself owns a
  marker distinct from the player's marker — written on entry to
  `re_check`, cleared when the user selects a state. On recovery,
  re-mount at the re_check step with the captured running data.
  Real 2.7 work; not a 2.5 addition.
- **First-shift footer** ("Your first shift is logged in Patterns")
  — the small one-time celebration on Today after the user's first
  positive shift. Per Core Loop v2 line 238 — "brand-appropriate
  celebration, no confetti, no badge, just quiet acknowledgment."
- **Device verification.** Full happy path on physical iPhone (and
  Android if available): standard flow + Overwhelm flow + browse
  flow + late-night NSDR override. Verify navBranch tags fire
  correctly in production callers (the dev harness validated them
  in 2.4).

### Phase 2 close summary (sub-step 2.7 wrap)

Phase 2 — Revise core loop (check-in → time → protocol → adaptive
re-check) — composition complete. Device verification + the BLOCKER
GATE Firestore deploy are pre-TestFlight founder steps; code work
is done.

#### Sub-step closures with commit hashes

| Sub-step | Deliverable | Commit(s) |
|---|---|---|
| 2.1 | Time-window selector + recommendation + stub recommender | `13c93ef`, `90a5da9` (fix-forward) |
| 2.2 | Multi-step CheckInFlow + Practices index + outcomeClassifier | `daffec5`, `11586f4`, `de992a6` |
| 2.3 | ShiftedResponse component + copy tables | `dabafeb`, `37e5202` |
| 2.4 | NotShiftedResponse + late-night NSDR swap wrapper | `a10b551`, `97db8af` |
| 2.5 | Firestore wiring + caller migrations + Case 4 mini-flow | `bcae85d`, `7ba83b4`, `1629da5`, `4ab5694`, `73aa686`, `00d1d7c`, `02ab01a` (follow-ups), `66c1ae2` (test follow-up) |
| 2.6 | OverwhelmSafetyCard + entrySource plumbing seam | `8680764`, `f6a92fb` |
| 2.7 | First-shift footer + force-quit recovery (re_check) + PHASE_NOTES close | `0eddba8`, `a51064b`, `5e6af98`, this commit |

#### Final baselines

- **Test suites:** 49 (was 35 at Phase 2 entry; +14)
- **Tests:** 821 (was 542 at Phase 2 entry; +279)
- **TS errors:** 180 pre-existing (unchanged across the entire phase)

All 14 new test suites and 279 new tests are green. The pre-existing
181 TS errors held at 180-181 throughout — no Phase 2 work introduced
new errors. (One transient bump to 181 during sub-step 2.7 commit 3
composition was caught at edit time and resolved before the commit
landed; baseline ended at 180.)

#### Locked decisions made during Phase 2 (compiled — beyond what's in any spec)

The following were locked in chat during composition and are
load-bearing for downstream phases. Each captured in code via comment
or PHASE_NOTES sub-step entry, but compiled here for Phase 3+ context.

**Outcome classifier rules (sub-step 2.2):**
- `partial_shift` is **strict**: only the wired→foggy transition
  classifies as partial_shift. No other transition.
- Upward green-zone shifts (steady→clear, steady→alive,
  clear→alive) classify as `'shifted'`, not `'maintenance'`. Same-
  state-green and downward-green = `'maintenance'`. Inferred rule,
  not in `Vara_Core_Loop_v2.md` — codified in
  `services/outcomeClassifier.ts`. (Doc commit: `14f8f83`.)
- `'failed'` is reserved for system failures (audio_error path).
  User-side regressions (negative→negative, green→negative) are
  `'not_shifted'`, NOT `'failed'`.

**ProtocolSession write contract (sub-steps 2.5, 2.7):**
- `dryRun` pattern on `writeProtocolSession`/
  `writeStandardFlowSession` — production callers omit; dev harness
  passes `dryRun: true` to skip Firestore + log payload via
  `logger.log`. Keeps production schema clean of harness pollution.
- Doc ID strategy for `protocolSessions`:
  `${userId}_${sessionStartedAt}` with sessionStartedAt as a
  millisecond integer (Date.now() shape, not ISO string). Idempotent
  under network retries / accidental double-fires of `onComplete`.
  Deviation from Phase 0's "auto-generated IDs" note; the rationale
  (multiple sessions per user per day) is met by sub-millisecond
  uniqueness of sessionStartedAt.
- Fire-and-forget at the call site. CheckInFlow's terminal useEffect
  has a `.catch` that logs `[CheckInFlow] writeStandardFlowSession
  failed (session NOT persisted to protocolSessions)` — the wording
  is deliberate. (TECH_DEBT entry covers Sentry/Crashlytics wiring
  for release-build visibility.)

**First-shift footer (sub-step 2.7):**
- Qualifying outcomes: `{'shifted', 'partial_shift'}`. `'maintenance'`
  excluded — "held the line" isn't a "shift" in user-facing language.
- `firstShiftAt: Timestamp | null` on UserProfile; set by
  `setFirstShiftAtIfNeeded` inside `writeStandardFlowSession`.
- AsyncStorage marker for per-device dismissal. Multi-device users
  may see footer once per device — accepted v1 trade-off.
- Footer placement: directly below the brain-state check-in card in
  both pre-checkin and checked-in dashboard phases. Auto-dismiss on
  first render via useEffect; no tap, no × button.

**Re_check force-quit recovery (sub-step 2.7):**
- 30-min timeout anchored to `sessionEndedAt` (NOT
  sessionStartedAt). Beyond 30 min, the captured stateBefore stops
  being a meaningful comparison anchor — the re-check would measure
  life-happening, not the protocol effect.
- Recovery framing is positive: "Picking up where you left off" /
  "You finished {protocol name} a few minutes ago. Want to record
  how you're feeling now?" Build Guide §3 support over surveillance
  — "we caught you, you don't have to redo," not "you crashed and
  lost data."
- One-shot semantics via `recoveryOfferedAt` on the marker. If the
  user force-quits during recovery_confirm itself, the marker
  survives but `recoveryOfferedAt` is set; next mount silent-clears
  instead of looping. No recursive recovery flow.
- Marker payload extends the locked-spec 7 fields with two more:
  `entrySource` (Phase 5 forward-compat for Overwhelm not-shifted
  copy continuity) and `recoveryOfferedAt` (one-shot mechanism).
- Protocol resolution happens at the screen layer
  (`CheckInFlowScreen.tsx`), NOT in `initFlow`. Reducer's lazy
  initializer can't safely throw on protocol-retired; resolving at
  the screen enables silent fallback to normal flow.

**FlowInit at four discriminated variants:**
- `standard` / `overwhelm_safety_card` / `state_preselected` /
  `recovery`. TECH_DEBT escalated from "consider if a fourth lands"
  to "warranted, Phase 3 territory" — refactor to single config
  object with optional fields. Phase 3 likely adds a fifth
  ('time_preselected' for notification entry); landing the refactor
  before that grows the union to five would be cleaner.

**Recommender extensions and overrides:**
- Stub recommender (`protocolSelector.service`) is **first-match
  deterministic** — Phase 4 owns the real algorithm. No scoring,
  no ranking. Throws in `__DEV__` on no-match (sub-step 2.1
  fix-forward `90a5da9`); contract enforcement, not silent fallback.
- Late-night NSDR override: `wired AND (hour >= 22 OR hour < 4) →
  nsdr-20`. Lives in `services/lateNightNSDRSwap.ts` as a Phase 4
  stub-extension wrapper. Two consumers (NotShiftedResponse for
  copy adaptation; CheckInFlowScreen for navigation routing). Phase
  4 absorbs and deletes the wrapper.

**Surface defaults and routing:**
- Overwhelm Safety Card protocol: `sensory-reset-2` via the
  `OVERWHELM_DEFAULT_PROTOCOL_ID` constant in
  `constants/overwhelmDefaults.ts`. NOT `cyclic-sighing-2`. (Spec
  consistency item: Implementation Plan line 294 needs to drop
  "Cyclic Sighing or" alternative.)
- Case 4 (browse-launched) routing after re-check: Practices index,
  NOT Today. Override of Core Loop v2 §Case 4 spec. Logged in
  SPEC_CONSISTENCY_BACKLOG; rationale is preserving the user's
  exploration context.
- Re-check copy: "How are you now?" alone, no protocol-name
  subtitle. Override of Implementation Plan; SPEC_CONSISTENCY entry.

**Re-check shift-ack copy table sizing (sub-step 2.3 entry):**
- ShiftedResponse `Record<TransitionKey, string>` covers 16
  transitions: 1 partial_shift (wired→foggy), 6 negative→green
  shifts, 3 upward green shifts, 6 maintenance entries (3 same-
  state-green + 3 downward-green). Phase 5 path-specific tables
  multiply by 4 intent paths.

**entrySource plumbing seam (sub-step 2.6):**
- `entrySource` is threaded through CheckInFlow → ResponseStepView →
  NotShiftedResponse but intentionally unused as of end-of-2.7.
  Phase 5 consumes it for Overwhelm-specific not-shifted copy per
  Core Loop v2 §Case 3 lines 296–301.

#### Pre-TestFlight blockers (still pending — founder action)

These are not Claude Code work. Listed here so they don't drift.

- **`firebase deploy --only firestore:rules`** — BLOCKER GATE.
  `protocolSessions` rules block has been pending deploy since
  Phase 0; the new schema's writes silently no-op without it
  (legacy `brainStateCheckIns` keeps working, masking the failure
  at the UX layer). Verify by inspecting a real `protocolSessions`
  doc in Firestore Console after a check-in — not just by absence
  of crashes.
- **NSDR audio production.** Generate via ElevenLabs per
  `Vara_NSDR_Audio_Scripts.md`, upload to Firebase Storage at
  `protocolAudio/nsdr/nsdr_10min_v1.mp3` and
  `protocolAudio/nsdr/nsdr_20min_v1.mp3`. Stub clips currently in
  place are sufficient for code-path verification but not for
  TestFlight beta users.
- **Real device verification (the 2.7 device pass).** Per the
  scenarios in 2.7 entry: standard happy path on iPhone 12/SE/15,
  Overwhelm above-the-fold check, browse-launched producing a
  doc with `stateBefore: null` + `outcome: 'browse_launched'`,
  late-night NSDR override (clock-spoofed), force-quit recovery
  at mid-protocol AND mid-re_check, cold/warm modal mount UX,
  network-failure write surfaces the silent-failure log. Founder
  step; runs after the Firestore deploy.

#### SPEC_CONSISTENCY items still pending

All of the following live in `docs/SPEC_CONSISTENCY_BACKLOG.md` and
are meant to land as a single docs-only commit. None blocks code;
listed here for the docs-update pass that should happen before
Phase 3 to keep specs in sync with shipped code:

- Bellows Breath excluded at v1 (11 protocols, not 12)
- Focused Work Window: 45/90, not 45/60/90 or 25/45/90
- NSDR audio file format: ship MP3, not AAC m4a
- Step transition fade duration: 250ms, not 200ms
- Re-check copy shortened to "How are you now?" alone
- Variant duration alignment with shipped time-window buckets (Cold
  Water Reset 5-min, Bright Light 10/20-min, Brief Movement 5/10-min)
- Outcome classifier: upward green-to-green = 'shifted'
- Overwhelm Safety Card protocol = sensory-reset-2 (drop "Cyclic
  Sighing or" alternative — Implementation Plan line 294)
- Case 4 routing target after re-check = Practices, not Today

---

## Phase 3

### Phase 3 entry checklist — skeleton

**Goal restatement (from `Vara_Implementation_Plan.md` Phase 3):**
Capture the user's intent path during onboarding (down-regulation /
sleep / activation / default), capture their time-of-day stress
patterns, and persist both to the user profile for use by the
algorithm and the copy system.

#### Files anticipated to be touched

- `mobile/src/screens/onboarding/*` — existing Onboarding V2 screens
  + new IntentCaptureScreen, IntentPathScreen, TimeOfDayWiredScreen,
  TimeOfDayFoggyScreen.
- `mobile/src/types/models.ts` — UserProfile additions
  (`intentSelections`, `wiredTimeOfDay`, `foggyTimeOfDay`).
  `intentPath` is already on the type since Phase 0.
- `mobile/src/constants/intentPathContent.ts` (new) — 4 path
  variants (headline, body, starter Learning).
- `mobile/src/services/notifications/notificationScheduler.ts` (or
  equivalent) — wire time-of-day answers into scheduling. Special
  case: sleep path overrides with evening-specific schedule.
- Path resolution logic — separate small service likely sitting
  next to `intentPathContent.ts`.

#### Open questions to surface (do NOT decide now)

These are for the Phase 3 entry conversation, not pre-decisions:

- **Path priority resolution rule** (locked previously in chat,
  document the rule in the Phase 3 entry): when multiple intent
  selections match different paths, resolve by priority `sleep >
  down_regulation > activation > default`. Source: chat decision
  during Implementation Plan review; not in any spec file as of
  2.7 close.
- **Time-of-day question structure** (per Implementation Plan
  lines 357–360): 7-chip "When during your day do you usually
  feel most Wired?" + same chips for "Most Foggy?" Both optional
  ("Not sure yet"). Schedule notifications 30 min before wired
  time-of-day window.
- **Multi-select intent capture mapping** per
  `Vara_Intent_Paths.md` — 7 selectable options mapping to 4
  paths. Pre-decided in spec; the question is implementation
  shape (chip group vs list with checkboxes vs other).
- **Existing-user migration** — TestFlight users who onboarded
  before this work don't have `intentPath` set. Plan says default
  to `'default'` in code when reading a profile without the
  field. Optionally prompt existing users to update their path
  via Settings — nice-to-have, not required for Phase 3.

#### TECH_DEBT items Phase 3 will likely consume

- **FlowInit refactor to single config object** — escalated to
  "warranted" in 2.7. Phase 3's notification-entry surface may
  add a fifth variant ('time_preselected') which is the trigger
  to do the refactor before the union grows further.
- **`useUserProfile` hook extraction** — Phase 2's first-shift
  footer wired a one-field `onSnapshot` subscription directly in
  DashboardScreen. When Phase 3 also needs `intentPath` (and
  potentially the time-of-day fields) at multiple call sites,
  consolidate into a shared hook. Phase 5 will likely extend
  again.

#### SPEC_CONSISTENCY items Phase 3 should address

The Phase 2 close lists nine SPEC_CONSISTENCY items pending a
docs-only commit. Phase 3 entry is a natural moment to land that
commit so the specs are aligned before new path-related content is
written. Three are particularly relevant to Phase 3 itself:

- Implementation Plan line 294 — "Cyclic Sighing or Sensory Reset"
  → "Sensory Reset" alone (Overwhelm protocol selection).
- `Vara_Intent_Paths.md` likely needs cross-check against any
  path-priority rule documented in the spec vs. the chat-locked
  `sleep > down_regulation > activation > default` ordering.
- Any new path-related specs touched during Phase 3 should reference
  Build Guide §intent paths (Section 4) for the canonical path
  definitions.

---

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
