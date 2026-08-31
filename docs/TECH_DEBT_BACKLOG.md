# Vara Tech Debt Backlog

Items found during phased work that don't block the current phase.
Phase 6 polish sweep is the working list.

---

## Analytics semantics for `brainState` consumers (round 15 audit)

`useWeeklyCorrelations` (`mobile/src/hooks/useWeeklyCorrelations.ts:85-201`)
and `useBrainStateWeekTrend` (`mobile/src/hooks/useBrainStateWeekTrend.ts`)
read each day's `brainStateCheckIns/{uid}_{date}.brainState` field as
the day's "brain state" for analytics. After round 15's fix
(`writeStandardFlowSession` now writes the user's most-recent
attestation: stateAfter for V2-completed days, stateBefore for V1
or abandoned days), these consumers see mixed semantics across days:

- V2-completed days: post-protocol attestation (the round-15 contract).
- V2-abandoned days: pre-protocol attestation (only state available).
- V1 days: pre-protocol attestation (chip pick).

**Why this is debt:** the analytic intent is ambiguous. Two valid
interpretations:

1. **Most-current-state (the round-15 fix delivers this).** Per-day
   "brain state" = what state the user was ultimately in that day.
   Post-protocol attestations reflect the user's interventions.
   Aligns with dashboard intent. Aligns with Vara's brand premise
   that protocols change state.

2. **Pre-protocol baseline.** Per-day "brain state" = what state
   the user arrived in. Useful for detecting environmental triggers
   (sleep quality, day-of-week patterns, time-of-day effects)
   independent of interventions.

**Direction:** if a future analytic use case requires pre-protocol
baseline, that should be served by a richer schema — multiple
attestations per day with timestamps — not by reviving an
`initialBrainState` field on `brainStateCheckIns`. The single-
brainState-per-day shape conflates concerns; multiple-attestation
data is the principled fix.

**Phase 5+** alongside Patterns migration off the legacy
collection. Phase 5's recommender and analytics work has the right
scope to pick the data shape; round 15's fix preserves the
dashboard-correct semantics until then.

**Acceptance:** decide whether useWeeklyCorrelations +
useBrainStateWeekTrend should keep reading `brainState` (most-recent
attestation, current behavior post-round-15) or migrate to a
separate per-attestation history shape. If migration: the legacy
`brainStateCheckIns` collection retires alongside Patterns moving
to read from `protocolSessions` directly (see "useDashboard.ts:
brainStateCheckIn read pattern is one-shot, not a real-time
listener" entry below for the related dashboard-side migration).

---

## `saveBrainStateCheckIn` V1-era stateChanged → protocolCompleted reset (round 15 audit)

`saveBrainStateCheckIn` at `mobile/src/services/firebase/brainStateCheckIn.service.ts:152-159`
resets `protocolCompleted: false` whenever the incoming `brainState`
differs from the doc's existing `brainState` value. The logic was
designed for V1: user manually changes their state on the chip
picker → reset protocolCompleted because the prior protocol no
longer applies to the new state.

**In V2 with re-check, brainState change is the EXPECTED outcome
of running a protocol** — the user's pre-protocol state (Wired)
becomes their post-protocol state (Steady). Round 15's fix made
the legacy doc's `brainState` reflect the post-re-check value,
which means `saveBrainStateCheckIn` now sees stateChanged=true on
every successful flow_complete write. The reset to `false` is
incorrect for this case — but it's currently masked because
`writeBrainStateCheckInDoc` calls `markProtocolCompleted`
immediately after `saveBrainStateCheckIn`, re-setting
`protocolCompleted: true`.

**Net result:** correct end state. `protocolCompleted` is true
after both calls.

**Brief race window:** if a dashboard read fires between
`saveBrainStateCheckIn`'s `updateDoc` and
`markProtocolCompleted`'s `updateDoc`, the dashboard sees
`protocolCompleted: false`. Microseconds; not user-observable in
practice. Acceptable.

**Why this is debt anyway:** the V1-era logic doesn't match V2
semantics. The reset is dead-code-via-immediate-overwrite, which
is a bad pattern — a future refactor could split the helpers in a
way that breaks the immediate overwrite, exposing the latent bug.

**Direction:** address in Phase 5+ legacy-collection retirement.
When `brainStateCheckIns` retires (dashboard reads from
`protocolSessions` directly), the stateChanged logic deletes
naturally. Until then, the immediate-overwrite masking is the
acceptable bridge.

---

## Overwhelm path: replace hardcoded `stateBefore: 'wired'` with post-protocol re-check capture

**Where:** `mobile/src/components/checkin/flow/reducer.ts:76-84` —
`initFlow` for `entrySource: 'overwhelm_safety_card'` hardcodes
`stateBefore: 'wired'`. The user never attests to Wired; it's a
system assumption embedded at flow init.

**Why this is debt:** The hardcoded value is a known-incorrect proxy
for any user whose actual pre-overwhelm state isn't Wired. It
compromises:

1. **`classifyOutcome` correctness.** The classifier produces the
   protocolSession's `outcome` based on `(stateBefore, stateAfter)`.
   For an overwhelm session where the user was actually Foggy and
   the re-check returns Steady, the system writes
   `wired→steady = 'shifted'` when the truth is `foggy→steady = 'shifted'`.
   Both classify the same in this case, but the cell-by-cell
   matrix has divergent classifications elsewhere — e.g. a user who
   was actually Steady runs overwhelm and re-checks Foggy: the
   system writes `wired→foggy = 'partial_shift'` (a positive
   transition) when the truth is `steady→foggy = 'not_shifted'` (a
   regression). False-positive shift counts in Patterns.

2. **Round 14 sensory reset cancel state-revert** — necessitated the
   special-case branch in `writeStandardFlowSession` that skips
   `writeBrainStateCheckInDoc` for `entrySource === 'overwhelm_safety_card'`.
   The branch is a workaround, not a fix at the root cause: the
   root cause is that the system has no captured stateBefore for
   overwhelm sessions, so it shouldn't be writing one to the
   attestation collection.

**Direction (Option C from round 14 investigation):** Replace the
hardcoded `stateBefore: 'wired'` with a post-protocol capture
pattern. Sketch:

- Overwhelm flow's terminal write payload sets `stateBefore: null`
  (similar to BrowseRunFlow's true-browse path which writes
  `stateBefore: null` on its `outcome: 'browse_launched'` sessions).
- `mapStandardFlowTerminalToPayload`'s schema invariant
  ("standard flow's TerminalFlowState always has a non-null
  stateBefore") relaxes for overwhelm. Either widen the type
  (`BrainState | null`) for overwhelm variants only, or introduce
  a separate terminal type for overwhelm.
- `classifyOutcome` either (a) accepts null stateBefore and returns
  a dedicated outcome (`'overwhelm_completed'`?) for the null case,
  or (b) overwhelm sessions skip classification entirely and write
  a hardcoded outcome.
- Re-check captures `stateAfter` as today; the user's pre-protocol
  state is simply not asserted by the system.

**Acceptance criteria:**
- Overwhelm sessions write a user-attested or null `stateBefore` to
  `protocolSessions` — never the system-guessed `'wired'`.
- The round-14 `entrySource !== 'overwhelm_safety_card'` branch in
  `writeStandardFlowSession` becomes deletable (the legacy doc write
  guard is no longer needed because there's no incorrect stateBefore
  to write).
- `classifyOutcome` correctness restored for the overwhelm path:
  no false-positive `'shifted'` / `'partial_shift'` outcomes for
  users whose actual pre-overwhelm state isn't Wired.

**Touches:** `reducer.ts` initFlow, `types.ts` FlowState union,
`mapStandardFlowTerminalToPayload`, possibly `outcomeClassifier.ts`,
all overwhelm-flow tests. Non-trivial — schema-level change.

**Why not now:** Sub-step 2.7 sensory reset cancel symptom is
fixed by the round-14 special-case branch. Schema-level redesign
is Phase 4+ scope, alongside the broader recommender / classifier
work that overwhelm shares with the standard flow. The round-14
branch is the bridge.

---

## Pre-existing TypeScript errors (181 total as of Phase 1 sub-step 1)

`npx tsc --noEmit` reports 181 errors across roughly 60 files. None are
introduced by Phase 0 or Phase 1 work — they predate the redesign branch.
Run tsc fresh at Phase 6 entry to get a live list before triaging.

### Top error codes by frequency

| Code | Count | Meaning | Common pattern |
|---|---|---|---|
| TS2322 | 45 | Type not assignable | Lucide icon names typed too strictly; string literals don't match closed unions |
| TS2769 | 40 | No overload matches | `Firestore \| null` passed where `Firestore` is required (e.g. `NeuroplasticityTracker.tsx`) |
| TS2339 | 33 | Property does not exist | Stale property references (e.g. `radius.thin` not in current token set) |
| TS7053 | 14 | Index expression is not of type 'number' | Implicit-any indexing |
| TS2345 | 13 | Argument type not assignable | Often the same Firestore-null shape as TS2769 |
| TS2353 | 11 | Object literal extra properties | Stale prop names on shared components |
| TS2304 | 5 | Cannot find name | Typically removed-but-still-imported symbols |
| TS18047 | 4 | Possibly null | Same Firestore-null shape, narrowed differently |
| TS2820 | 3 | Did you mean...? | Lucide icon typos (`'lung'` → `'lungs'`) |
| TS2551, TS2367 | 3 each | Property/comparison typos | Renamed fields not propagated |
| Others | 4 | TS7006, TS7016, TS2741, TS2430, TS2305, TS1117 | Long tail |

### High-confidence sweep candidates

These cluster around three root causes. Fixing each root fixes most of the
errors in the cluster:

1. **Firestore null narrowing.** `getFirestore()` typed as
   `Firestore | null` but call sites assume non-null. Add a single
   non-null assertion at the boundary (or a typed wrapper) in
   `src/config/firebase.ts` and the cluster collapses. Affects most
   TS2769 / TS2345 / TS18047 errors.
2. **Lucide icon name drift.** Several components reference icon names
   that aren't in the installed lucide version's literal-union type.
   Sweep with a search for the offending names and pick the closest valid
   icon. Affects TS2322 / TS2820 errors.
3. **Stale design tokens.** Components reference tokens like
   `radius.thin` that don't exist in the current
   `src/constants/spacing.ts`. Either add the token (if it's a
   semantically-needed alias) or rewrite the call site. Affects
   TS2339 errors.

### Working list (top files by error count)

Run during Phase 6:

```bash
npx tsc --noEmit 2>&1 | grep -E "^src/" | \
  sed -E 's/^(src\/[^(]+).*$/\1/' | sort | uniq -c | sort -rn
```

The current top-of-list (April 2026) starts with the brain/, dashboard/,
community/, and library/ component clusters.

### Discipline

Do **not** fix these ad-hoc during Phases 1–5 unless one actively blocks
work. Touching them during in-flight phase work risks merge churn and
distracts from phase deliverables. Phase 6 is the sweep window.

---

## Accessibility — known shortfalls

### "End early" destructive button: WCAG AA contrast shortfall

**Where:** `EndEarlyConfirmModal` modal CTA + `PlayerTransport` End early
button label. Style is `Soft Coral (#D97A6E)` on `Mist White (#FAFAF6)`,
`fontSize.base = 16` / `fontWeight.medium = '500'`.

**Measured contrast:** 2.884 : 1 (computed via the WCAG 2.1 sRGB
linearization formula).

**WCAG AA target for normal text:** 4.5:1. The destructive label is
classified as normal text per WCAG (large text requires ≥18.66px AND
weight ≥700; 16px/500 qualifies for neither relaxation).

**Why it hasn't been fixed:** Founder directive during sub-step 4.3
sign-off was "don't change the color" to preserve brand fidelity for
Soft Coral as the destructive signal. Bumping the weight to Bold (700)
wouldn't help — size is the binding constraint for the WCAG large-text
rule, not weight. The shortfall is a brand-vs-AA tradeoff that's been
explicitly accepted.

**Phase 6 paths to consider:**
- A slightly darker brand-coral variant (target ≥4.5:1 against Mist
  White; would need Vara_Color_System update).
- Bumping the destructive label to a larger size (≥18.66px) and bold
  weight together — qualifies for the 3:1 large-text rule, which the
  current pair would still narrowly fail, so this likely also requires
  a darker variant.
- A bordered destructive button with the high-contrast color carried
  by the border + a darker text color (visual: still feels like Soft
  Coral, label itself uses a higher-contrast token).
- Accept the AA shortfall and document it in the public a11y
  conformance statement.

Surface to the design system review during Phase 6.

---

## Observability — `logger` is `console.*` in production

**Where:** `mobile/src/utils/logger.ts` — `logger.log/warn/error/debug` are
thin wrappers around `console.*`. The `error` method has a TODO comment
referencing `crashReporting.recordError` that's not wired up.

**Implication:** in TestFlight and App Store builds, `logger.warn`
produces output only to the device console — invisible to the founder
or any remote monitoring. Surfaced during Phase 1 sub-step 4.3.3 sign-off
because the GuidedSessionPlayer's recovery flow logs warnings on
parent-rejection, parent-timeout, and a few other graceful-degradation
paths. If a Phase 2 Firestore write hangs the recovery acknowledgment,
no one finds out unless the user happens to be tethered to a Mac.

**Phase 6 paths to consider:**
- Wire Sentry / Crashlytics / Bugsnag for structured remote logging
  (the `recordError` TODO is the existing scaffold).
- Add a lightweight in-app debug panel that reads from a recent-warnings
  ring buffer (low cost, dev-only, gives founder visibility).
- Decide which warnings warrant remote vs. local-only (recovery
  rejections probably want remote; routine debug noise local-only).

**Higher-stakes caller surfaced sub-step 2.7 entry:**
`writeStandardFlowSession`'s `.catch` handler in `CheckInFlow.tsx` (sub-
step 2.5 follow-up `02ab01a`) logs "session NOT persisted to
protocolSessions" via `logger.error`. The fire-and-forget pattern means
this is the only signal that data integrity broke; in release builds
the message is invisible. Wire remote logging before TestFlight grows
past the founder's internal testing — otherwise write failures
silently lose state-transition data that Patterns depends on.

---

## Sentry was a dead dependency on this branch through Phase 2

State observed at the time of removal: `sentry-expo@7.0.1` was installed
in `mobile/package.json` but never initialized. The `Sentry.init` call
in `mobile/src/services/crashReporting.service.ts` is commented out
(lines 28-59), and the file's "ACTIVATION STEPS" docstring (lines
6-13) documents the migration path that was never executed.
`AuthContext.tsx` imports no-op stubs from the file
(`setUserId`, `setUserAttributes`, `clearUser`) — they early-return
on the file's permanently-false `isInitialized` flag.

The dep removal surfaced as a build blocker at Phase 2 → Phase 3
transition: `sentry-expo@7.0.1` pins `@sentry/react-native@5.5.0`,
which has an RCT-Folly resolution incompatible with React Native
0.81. Removing the dep unblocked the EAS build; the retrospective
state (Sentry installed but not wired) is captured here so the
forward path is clear.

Resolution shape when wiring the logger remote-sink (see existing
"Observability — `logger` is `console.*` in production" entry above):
follow the activation steps in `crashReporting.service.ts`. Install
`@sentry/react-native` at the current stable, add the
`@sentry/react-native/expo` config plugin to `app.json`, uncomment
and update the `Sentry.init` call, configure DSN via env var. The
scaffolding in `crashReporting.service.ts` is intact and ready —
the file structure, the no-op stubs called from `AuthContext`, and
the activation-steps docstring all assume this future wiring path.

Cross-reference: this entry is retrospective (what was installed but
never used through Phase 2). The logger remote-sink entry is
forward-looking (the wiring work needed before TestFlight grows
past internal testing). When that wiring lands, both entries can be
closed together.

---

## FlowInit discriminated union — refactor warranted (escalated 2.7)

**Sub-step 2.7 update — fourth variant landed.** `FlowInit` now has
four discriminated variants:

- `{ entrySource: 'standard' }`
- `{ entrySource: 'overwhelm_safety_card'; protocol; nowMs }`
- `{ entrySource: 'state_preselected'; stateBefore }`
- `{ entrySource: 'recovery'; recoveredPayload: { protocol, stateBefore, timeWindow, sessionStartedAt, sessionEndedAt, durationActualSeconds, intentPath, entrySource } }`

The original entry (sub-step 2.5) noted "consider refactoring if a
fourth lands." That condition is met. Refactor is now **warranted,
not just suggested** — Phase 3 territory (alongside the
useUserProfile hook extraction).

Refactor target: single config object with optional fields, plus
runtime validation of required-field combos:

```typescript
interface FlowInit {
  entrySource: FlowEntrySource | 'recovery';
  stateBefore?: BrainState;
  protocol?: Protocol;
  nowMs?: number;
  recoveredPayload?: { ... };
}
```

Trade-off: loses type-level enforcement that overwhelm entries
must have a protocol AND that recovery entries must have a payload.
Gains: easier to extend; less union proliferation; cleaner
`buildFlowInit` switch.

Phase 3 likely adds a fifth variant ('time_preselected' for
notification entry); landing the refactor before that grows the
union to five would be cleaner than after.

Don't refactor in 2.7 — polish-tier sub-step, not architecture.

---

## Engagement event 'brainStateCheckInsCompleted' no longer fires

Sub-step 2.5's caller migration removed `handleBrainStateCheckIn`
from `useDashboard.ts`, which was the only call site for
`trackEngagement('brainStateCheckInsCompleted')`. Chip taps on the
dashboard now navigate to CheckInFlow without firing the
engagement event.

If downstream analytics depend on this event (cohort metrics,
notification trigger eligibility, etc.), they need either:

1. **Wire from CheckInFlow.onComplete** (Phase 5/6 telemetry pass)
   — fire the event when the flow reaches a non-abandoned terminal.
   Caveat: Overwhelm flow and BrowseRunFlow also produce sessions
   that arguably count toward the same engagement metric; decide
   whether to fold them in.
2. **Read from `protocolSessions` directly** — query for the user's
   session count instead of relying on the counter event. More
   accurate (single source of truth) but more expensive at read time.

Out of scope per Phase 2 telemetry-deferral, but worth flagging if
someone is actively watching the metric — the count will appear to
flatline starting whenever the migrated dashboard ships.

---

## Banned-language regex-guard test across all copy tables

`mobile/src/components/checkin/flow/__tests__/notShiftedCopy.test.ts`
(landed sub-step 2.4) uses a regex-negative
(`/sleep|bedtime|wind down/`) on the late-night hint to catch drift
during minor edits — so a future "improvement" that re-adds sleep
framing fails the test instead of shipping silently.

The pattern is sound but currently single-purpose. Generalize into a
shared `bannedLanguageGuard.test.ts` that scans **all** copy tables
(shifted, not_shifted, future Phase 5 path tables) for banned
patterns from Build Guide §Copy rules and Voice & Tone Rules:

- `/amazing/i`, `/awesome/i`, `/way to go/i`, `/you did it/i`
  (celebration creep)
- `/no excuses/i`, `/just need discipline/i`, `/if you really wanted/i`
  (shame)
- `/life-changing/i`, `/guaranteed/i`, `/fix your brain/i`,
  `/unlock/i` (hype)
- `/treats anxiety/i`, `/clinically proven/i`, `/cure/i` (medical
  claims)
- `/don't miss out/i`, `/act now/i`, `/last chance/i` (urgency)
- `/streak/i`, `/badge/i`, `/leaderboard/i` (gamification)

Each existing copy table exports its strings; the guard test imports
them all and runs the regex sweep. Catches regressions across the
full copy surface in a single test file. ~50 lines of test code, no
production code change.

Phase 6 polish — best timed after Phase 5 finishes populating the
intent-path-specific copy tables, so the guard covers everything
in scope.

---

## Late-night NSDR swap — device clock skew detection

`services/lateNightNSDRSwap.ts` (Phase 2 sub-step 2.4) reads
`new Date().getHours()` to decide whether to route a Wired user's
"Try something longer" tap to NSDR-20 instead of the Practices
index. Device-local-hour is the source of truth for v1.

Failure modes that v1 doesn't handle:
- **Misconfigured device clock.** Rare. User's device set to wrong
  time. The swap fires (or doesn't fire) at the wrong hour relative
  to their actual local time.
- **Device-time vs server-time drift.** Server has the canonical
  time; we only ever ask the device. No cross-check.

Future versions may want to detect a >30 min skew between device-
time and server-time and either warn the user or fall back to a
server-side hour. Phase 4 at the earliest (alongside the recommender
absorbing this wrapper).

Why not now: spoofing is self-harm only (the user's losing the
benefit of a tailored recommendation, not harming anyone else).
Misconfigured clocks are rare. Skew detection adds a network
dependency to a previously offline-capable surface, which is a
real cost.

---

## CRLF normalization warnings — fix before Android development

Every `git add` of files edited on Windows surfaces:

```
warning: in the working copy of '<path>', LF will be replaced by CRLF
the next time Git touches it
```

Cosmetic noise in Phase 2 (iOS-only on macOS dev means it's invisible
to most contributors) but becomes painful when Android development
starts. Per the Implementation Plan, Android lands at Google Play
submission later in the cycle — Windows machines doing Android work
will trip the warning on every commit and risk silent line-ending
mismatches in CI diffs.

**Fix:** add `.gitattributes` at repo root with
`* text=auto eol=lf`. 5-minute change. One follow-up
`git add --renormalize .` to rewrite the index.

**Why not now:** scope creep against Phase 2 charter, and the fix is
genuinely invisible on macOS until Android work begins. Land before
the first Windows-side Android session.

---

## Path aliases for imports — Phase 6 polish

Considered during Phase 2 sub-step 2.2 composition. Currently no
`paths` in `mobile/tsconfig.json` and no `babel-plugin-module-resolver`
config — every import is relative. Sub-step 2.2's deeper folder
nesting (`components/checkin/flow/`) makes relative paths fragile
(`../../../services/outcomeClassifier`).

**Phase 6 path:** introduce `@services/*`, `@components/*`,
`@constants/*`, `@hooks/*`, `@types/*`, `@utils/*` aliases via
`tsconfig.json.compilerOptions.paths` + the corresponding
`babel-plugin-module-resolver` config + Jest's
`moduleNameMapper`. Sweep the existing tree in one pass.

Not done now: scope creep against the 2.2 charter, and the sweep
touches every file. Cleanest at Phase 6 alongside the broader
import/test-config consolidation.

---

## Phase 1 acceptable, post-launch consolidation

### Consolidate End early modal — currently two instances

`EndEarlyConfirmModal` is mounted in two places:
- Inside `PlayerTransport.tsx` — owned by transport, opened by the
  transport's End early button.
- Inside `GuidedSessionPlayer.tsx` — owned by the player, opened by the
  header X button.

Both render identical UI and both ultimately dispatch
`END_EARLY` (with potentially different `reason` values — transport may
fire `audio_error` in error state, header X always fires `user_exit`).

**Why two instances:** PlayerTransport's modal ownership was signed off
during sub-step 4.3.2 with explicit YAGNI framing. Adding the header X
in 4.3.3 needed the same confirmation pattern but couldn't reach into
PlayerTransport's modal without lifting state up. Two instances was
cheaper than the refactor and the in-tree behavior is correct (only one
modal can be visible at any given moment due to local visibility state).

**Drift risk:** if copy or styling on the modal changes, both instances
must be touched. The component is shared but the *invocations* aren't.
A future writer who tweaks the modal in PlayerTransport without noticing
the header X path will produce visible inconsistency.

**Phase 6 path:** lift modal state up to GuidedSessionPlayer. Both
PlayerTransport's End early button and the header X open the same modal.
Transport calls `onEndEarlyRequested()` (signal, not confirmation);
player owns visibility and the dispatched-reason mapping. Single source
of truth for the modal's behavior.

---

## Test suite flakiness — investigate before public launch

`npx jest --forceExit` shows occasional flakiness — observed once
during a single sweep at sub-step 2.7 close (1 failed / 820 passed
on the first run; subsequent 11 consecutive runs all clean at 821/
821). Could not reproduce; the failing test name was not captured.

Most likely source is the reanimated/timers `force exit Jest` warning
present in every run since Phase 1 sub-step 4.3.4 — the GuidedSession
Player tests use Reanimated 4 shared values + setTimeout for breath
pacing + setInterval for the reduce-motion countdown. Open handles
that survive the suite force-exit can produce sporadic state pollution
in subsequent runs.

The `--forceExit` flag itself masks the underlying issue — a clean
test suite shouldn't need it. Tracing the leak with
`--detectOpenHandles` would surface the actual culprit (likely an
unflushed timer or unfinished animation frame).

Worth investigating before public launch — flaky tests erode CI signal
trust. A team that learns to ignore "1 failed" in CI eventually misses
real regressions.

**Phase 6 paths to consider:**
- Run `--detectOpenHandles` on the player suite, fix the named leaks,
  drop `--forceExit` from the test script.
- Add `jest.useFakeTimers()` at the top of suites that don't already
  use fake timers (the recovery integration tests in CheckInFlow.test
  use real timers + waitFor, which is a known race source).
- If the leak is fundamentally Reanimated/Expo SDK 54 related, file
  upstream or document the workaround.

---

## Email verification screen — visible re-renders ("jumping") every few seconds

Observed during sub-step 2.7 device smoke pass: the email verification
screen exhibits visible re-renders / flicker every few seconds while
the user is waiting on the verification email. Functionally harmless
(verification works, navigation transitions correctly when
`emailVerified` flips), but visually jarring.

**Where:** `mobile/src/screens/auth/EmailVerificationScreen.tsx`
lines 45-68. The screen runs `setInterval(checkVerification, 2000)`
(line 55) which calls `refreshUser()` from AuthContext every 2
seconds — `auth.currentUser.reload()` plus a `refreshCounter` bump.
Cadence chosen for "faster detection" per the inline comment. An
AppState `change` listener (lines 58-62) fires the same check on
foreground returns. Each tick triggers a render at minimum on the
context consumers.

**Why it's not a Phase 2 issue:** the polling pattern predates this
branch's redesign; no Phase 2 commit touched this file. Pre-existing
behavior surfaced by the smoke pass.

**Phase 6 paths to consider:**
- Drop the polling cadence (5s or 10s instead of 2s) — slower
  detection, less flicker.
- Replace the interval with an AppState-only check; users who verify
  in-app without backgrounding are rare (Mail link typically
  backgrounds the app).
- Memoize the rendered tree so refreshes that don't change
  `emailVerified` don't re-render visible text.
- Investigate whether `AuthContext.refreshUser` mutates state on
  no-op refreshes (a refresh that finds no change shouldn't bump
  `refreshCounter`).

Phase 6 polish.

**Round 5 device verification (May 2026):** confirmed the visual
jumpy/refresh behavior is still present and user-visible during
onboarding. No regression — the polling cadence pre-dates this
branch. Founder noted it as friction during round 5 testing;
keeping the entry as-is, no escalation needed.

---

## Firebase verification email occasionally fails to deliver on first send

Observed during sub-step 2.7 device smoke pass: the initial verification
email did not arrive; tapping Resend on `EmailVerificationScreen`
delivered the email successfully. Pre-existing Firebase Auth email
delivery behavior, not a Phase 2 regression.

**Current copy state** (`EmailVerificationScreen.tsx`):
- Instruction card (lines 187-191): "Tap the link in the email to
  verify your account. It may take a moment to arrive." Soft —
  doesn't tell the user what to do if it doesn't.
- Bottom help (lines 232-238): "Didn't receive anything? Check your
  spam folder or try a different email." Covers spam; omits Resend
  as an explicit path even though the Resend button is on-screen.
- Resend button is visible (lines 204-223) but no copy points users
  at it as the first remediation.

**Phase 6 paths to consider:**
- Copy hardening: extend the bottom help to three paths — "Check
  your spam folder, tap Resend if it's been more than 30 seconds,
  or try a different email." Names the on-screen Resend explicitly.
- Surface a "Send again" prompt automatically at 30s if the user
  hasn't yet acted.
- Investigate whether Firebase Auth's email delivery has a known
  flake rate worth absorbing into copy, or whether it's a project-
  level config issue (SPF / DKIM / sender domain alignment).

Phase 6 polish — UX hygiene, not a code fix. Copy hardening is part
of the work, since current copy partially covers spam but not
Resend.

---

## BrainStateCheckin.tsx — internal phase state duplicates dashboard control flow

`mobile/src/components/dashboard/BrainStateCheckin.tsx` maintains an
internal `'expanded' | 'collapsed'` phase state that duplicates control
flow already managed by `DashboardScreen` (the `showCheckInOverAnchor`
state at the call site, lines 322-336) and `DashboardAnchor` (which
owns its own collapsed-summary view via scroll-driven and manual
toggle states).

After sub-step 2.5's caller migration removed the 'captured' phase and
reduced `BrainStateCheckin`'s role to "chip picker that navigates to
CheckInFlow on selection," the phase machinery is structural overhead
with no remaining purpose:

- The `phase` state's only meaningful value transition is `expanded` ↔
  `collapsed` driven by user taps on the in-component Change button.
- That Change button only exists in collapsed view, which only renders
  when `currentCheckIn` is truthy, which only happens in the
  post-checkin dashboard phase, which is exactly when DashboardScreen
  has already swapped to a different surface (DashboardAnchor) — and
  only swaps back to BrainStateCheckin when the parent's
  `showCheckInOverAnchor` is set true.
- The two layers of "should this be expanded or collapsed" answer the
  same question with two sources of truth, which is how the
  Observation 4 dead-end bug emerged in the first place
  (V1 useEffect actively fighting the Change handler).

**Refactor candidate:** eliminate `phase` state from
`BrainStateCheckin`. Let `DashboardScreen` own the
expanded-vs-collapsed decision (via `showCheckInOverAnchor` and any
related state). `BrainStateCheckin` becomes a stateless chip picker
that always renders the expanded chip rows when mounted; the parent
decides whether to mount it at all.

`handleChangePress` and `BrainStateCollapsedView`'s collapsed-view
codepath move out of `BrainStateCheckin` (or `BrainStateCollapsedView`
becomes a separate dashboard component owned directly by
`DashboardScreen`).

**Why not now:** mid-device-verification with two other open Phase 2
bugs; discipline calls for narrow fixes between rebuilds. The
Observation 4 minimum patch closes the dead-end without touching
architecture. Phase 6 polish — or whenever the next substantive
dashboard work happens — is the right window.

---

## Untested components touched by sub-step 2.7 fixes

Four components were modified across the sub-step 2.7 device
verification fixes (commits `30d16de`, `808d0d5`) without test
coverage. The gaps surfaced during fix verification — searches for
tests asserting on the broken behavior consistently returned zero
results because none of these components have test files at all:

- **`mobile/src/components/dashboard/BrainStateCheckin.tsx`** —
  shipped through sub-step 2.5's caller migration and sub-step 2.7's
  Change-button fix (Observation 4) without coverage either time.
- **`mobile/src/screens/onboarding/OnboardingV2ProtocolScreen.tsx`** —
  rewritten in sub-step 2.7 (Observation 3) from the V1 self-attest
  pattern (TodaysProtocolCard mount) to mounting CheckInFlow with
  `state_preselected` entry. The handleComplete handler that ignores
  `userChosenNextStep` and unconditionally calls completeOnboarding
  is the contract that wants test coverage.
- **`mobile/src/components/dashboard/TodaysProtocolCard.tsx`** —
  stripped to informational-only in sub-step 2.7 (Observation 3).
  Removed `completed` / `onMarkCompleted` / `startExpanded` props.
  Now stateless; the testable surface is "renders header, description,
  completion check given a Protocol."
- **`mobile/src/hooks/useDashboard.ts`** — `handleMarkProtocolCompleted`
  removed in sub-step 2.7 (Observation 3). The remaining hook surface
  is large and would benefit from testing irrespective of this fix —
  flagged here as "touched without coverage" for completeness, not as
  a sub-step 2.7 specific gap.

Adding tests to most of these now has negative ROI — `BrainStateCheckin`
is queued for the architectural cleanup that eliminates its phase
state (see "BrainStateCheckin.tsx — internal phase state duplicates
dashboard control flow" entry above), and the resulting stateless
component would discard any tests written against the current shape.
`TodaysProtocolCard` is now small enough that its surface is
essentially the type signature; minimal test value. `useDashboard` is
a separate untested-large-hook concern.

**Resolution shape:**

The architectural cleanup work for `BrainStateCheckin` should ship
with tests covering:
- Chip tap dispatches `navigation.navigate('CheckInFlow', ...)` with
  the correct `state_preselected` payload.
- The Change-from-collapsed behavior reaches the expanded picker
  state without reverting (the regression guard for the Observation
  4 bug class).
- Props reactivity to `currentCheckIn` changes — both the truthy →
  truthy state-change case and the truthy → null reset case.

`OnboardingV2ProtocolScreen` should ship with at minimum:
- handleComplete fires completeOnboarding for both terminal variants
  (`abandoned` and `flow_complete`).
- handleComplete fires completeOnboarding regardless of
  userChosenNextStep (the regression guard for the Observation 3 bug
  class — onboarding doesn't fork on the response screen's button).
- The notification permission request precedes completeOnboarding
  and the await resolves on both Allow and Deny.

`TodaysProtocolCard` and `useDashboard` are each separate hygiene
concerns better addressed in their own focused passes.

Tracking these gaps so post-refactor / hygiene-pass work makes the
test coverage explicit deliverables, not optional add-ons that get
deferred again.

---

## Onboarding crosses V1→V2 mid-flow after sub-step 2.7 fix

The Observation 3 fix migrates `OnboardingV2ProtocolScreen` to mount
`CheckInFlow` (the V2 multi-step pattern) but preserves
`OnboardingV2CheckInScreen`'s direct-`saveBrainStateCheckIn` shape
(the V1 single-tap pattern). Different reasons:

- **Protocol screen migrated by necessity** — the V1 self-attest UI
  was data-corrupting (no protocolSessions write, no re-check, no
  state transition captured). Migration restores Build Guide §1
  measurement.
- **Check-in screen preserved by intent** — the V2 multi-step
  CheckInFlow with state_pick → time_pick → recommendation would
  over-complicate the first-time user experience. The decision is
  documented inline in `OnboardingV2CheckInScreen.tsx` lines 6-12.

Net result: onboarding's first protocol experience now crosses the
V1→V2 boundary mid-flow. The user does V1 single-tap state-pick on
one screen, then drops into the multi-step CheckInFlow with
time_pick → recommendation → player → re_check → response on the
next.

**Watch during device verification** for whether the transition feels
jarring. Specific cues:

- Visual continuity: the V1 chip-row screen has a different layout
  than the V2 time_pick screen.
- Pacing: V1 has the 2.2s "Captured." beat before navigating; V2's
  time_pick mounts immediately after CheckInFlow's reducer initializes.
- User mental model: "I just picked my state, now there's MORE
  picking?" might feel like a regression.

If the founder reports the boundary feels jarring during the next
device verification:

**Phase 3 candidate** — migrate `OnboardingV2CheckInScreen` to use
`CheckInFlow`'s standard entry (state_pick is the first step), passing
brainState via the flow's normal state_selected dispatch instead of
pre-populating it. Eliminates the dual-screen onboarding entirely;
onboarding becomes "drop the user into CheckInFlow with a brief intro
modal first." Significant UX shift — needs design review, not just an
implementation flip.

If the boundary feels seamless: leave both screens as they are. The
hybrid is intentional and the device test result confirms it works.

---

## ONBOARDING_V2 flag + V1 onboarding screens that would re-introduce data-integrity issues

`ONBOARDING_V2` flag in `mobile/src/constants/dashboardConfig.ts:7`
is currently `true`. The `false` branch in `AppNavigator.tsx`
(lines 144-152) renders 11 V1 onboarding screens:

`OnboardingWelcomeScreen`, `OnboardingCheckInScreen`,
`OnboardingInsightScreen`, `OnboardingActivityScreen`,
`OnboardingValuesScreen`, `OnboardingPersonalizedEntryScreen`,
`OnboardingConfirmationScreen`, `OnboardingFirstWinScreen`,
`OnboardingFocusScreen`, `OnboardingQuickStartScreen`,
`OnboardingTourScreen`.

Several of these still use V1 patterns directly
(`saveBrainStateCheckIn` direct calls, V1 self-attest UIs that don't
mount the player). If the flag flipped to `false`, the same
data-integrity issues that Observation 3 surfaced would re-emerge —
no protocolSessions writes from onboarding, legacy `protocolCompleted`
flag set without the user having actually run a protocol, no
state-transition measurement.

**Two paths:**

(a) **Commit to V2.** Remove the flag. Delete the 11 V1 screens.
    Simplify `AppNavigator.tsx` to render `OnboardingNavigator`'s
    V2-only screen list unconditionally. Lower long-term maintenance
    cost; closes the rollback escape hatch.

(b) **Formalize as emergency-rollback-only.** Document the flag's
    contract explicitly (in `dashboardConfig.ts` or a dedicated doc):
    when it's flipped, what known V1 issues re-surface, what the
    rollback procedure is. Add a regression test that the V1 branch
    mounts correctly should it ever be flipped (so the rollback
    actually works when needed).

**Also flagged in the same audit:** `MorningCheckIn.tsx` is exported
from `components/dashboard/index.ts` but has zero JSX usages anywhere
in the tree. The only referent is `NextBestActionCard`'s
`onMorningCheckIn` prop name, which `DashboardScreen.tsx:451` passes
as `() => {}` (no-op). Pure dead code, candidate for removal in the
same cleanup pass.

Phase 6 polish or whenever onboarding work happens next. The decision
between (a) and (b) needs a product call (is the rollback escape hatch
worth keeping?), not just an engineering preference.

---

## protocolSessions doc captures stateAfter correctly but userChosenNextStep records auto_dismissed not the user's actual response choice

Surfaced during sub-step 2.7 round-2 device verification of
Observation 8 (founder Firestore Console check). The
`protocolSessions` doc for a verified end-to-end CheckInFlow run had:

- `stateBefore: "wired"` ✓ (initial chip-tap selection)
- `stateAfter: "steady"` ✓ (re-check selection)
- `outcome: "shifted"` ✓ (correctly classified per upward-green rule)
- `durationActualSeconds: 184` ✓ (user ended Box Breathing 5min early)
- `protocolId: "box-breathing-2"` ✓
- `intentPath: "default"` ✓ (Phase 3 not shipped)
- `userChosenNextStep: "auto_dismissed"` ✗ — should reflect the
  user's tap on the response screen (try_longer, rest_later, or a
  dismissed variant), not the auto-dismissed default

Root cause (hypothesized — not investigated end-to-end yet):
`CheckInFlow.tsx:120-144` writes the session in a useEffect that
fires on terminal-state entry. The flow's terminal state
(`flow_complete` or `abandoned`) is reached via the reducer's
`next_step_chosen` action — which fires from the response screen's
button taps. The terminal write captures the state at terminal-entry
time. Whatever `userChosenNextStep` value the reducer sets at that
moment is what gets written.

The "auto_dismissed" default suggests one of:

- The reducer initializes `userChosenNextStep` to `"auto_dismissed"`
  on the response screen's mount, and the terminal write fires
  before the user's tap updates it. The user's tap then transitions
  to `flow_complete` with the correct value, but the write has
  already fired. (Most likely.)
- Or the response screen's button taps don't actually update
  `userChosenNextStep` in the path that leads to terminal — there's
  a wiring gap between `next_step_chosen` action and the terminal
  state's payload.

**Why this is non-blocking for Phase 2:**

State transition data (`stateBefore` / `stateAfter` / `outcome`) is
captured correctly. That's the load-bearing measurement per Build
Guide §1 — the atomic unit of value. Patterns reads
`outcome` and the state pair to compute first-shift, transition
counts, etc. None of those consumers read `userChosenNextStep`.
`userChosenNextStep` is informational (used by
`CheckInFlowScreen`'s post-flow navigation routing — but that
routing happens BEFORE the write, in `handleComplete`, so it reads
the live `terminal.userChosenNextStep` not the persisted value).

**Phase 5 is the right window to fix this.** Phase 5 owns response
capture (per Vara_Implementation_Plan.md) — the response screen's
copy, button semantics, and downstream consumers (e.g., engagement
tracking, intent-path-aware copy) are Phase 5 work. Whoever lands
that work needs to verify the write captures the user's actual
choice, not the auto-dismissed default. If the reducer init is the
cause, the fix shape is delaying the terminal write until the
user's tap settles — or moving the write into the
`next_step_chosen` action's reducer transition rather than the
useEffect's terminal observer.

Track for Phase 5 entry; don't fix in Phase 2. Round-2 founder
verification confirmed the write infrastructure works end-to-end,
which is what Phase 2 needed to prove.

---

## useDashboard.ts: brainStateCheckIn read pattern is one-shot, not a real-time listener

Surfaced during sub-step 2.7 round 4 device verification of
Observation 11 (dashboard reverts to chip picker after re-check).
The round 3 fix (commit `89c88a9`) swapped the brain-state read
from a mount-only `useEffect` to a `useFocusEffect`, and the round
4 fix (Obs 11 — `CheckInFlow.tsx`) added a `Promise.all([write,
setTimeout(1500)])` await before `onComplete` to close the
write-not-flushed-before-read race window.

The `useFocusEffect` + 1500ms floor combination is sufficient for
Phase 2 close, but the underlying read pattern remains a one-shot
`getTodayBrainStateCheckIn` call (`hooks/useDashboard.ts:300-315`)
rather than a real-time `onSnapshot` listener. This is the same
shape that produced the original race; future writes that feed the
dashboard (Phase 3 onboarding, Phase 5 patterns surfaces) could
re-introduce a similar race if the timing assumptions change.

The codebase already uses `onSnapshot` for the user's
`firstShiftAt` field in `DashboardScreen.tsx` — same screen, same
collection-shape. Migrating `brainStateCheckIn` to the same pattern
would:

- Eliminate the focus-tied refetch entirely (real-time updates
  push state changes to the dashboard the moment they land).
- Remove the need for the 1500ms minimum-display floor (it would
  still be welcome as UX, but not load-bearing for correctness).
- Avoid future re-introduction of similar races as the dashboard
  read graph grows.

**Phase 4 or 5 work.** Not blocking 2.7 closure.

---

## Light Movement: optional Flow / guided-yoga modality

Sub-step 2.7 round 4 (Obs 10) shipped a two-option modality picker
for the brief-movement family — Walk and Stretch. A third option
("Flow" / guided yoga) was intentionally excluded. Reasoning: we
don't currently provide the guidance content, so we don't surface
the option. Offering an unguided "Flow" pick would reproduce the
exact "thrust into unguided activity" problem the picker was
introduced to solve.

Adding Flow is a Phase 4+ consideration that requires:

- Script content (a 5-minute and 10-minute guided flow sequence
  matching the catalog's existing variant durations).
- Player support for guided cue playback during a movement step
  (audio overlay, timed prompts, or both — depends on whether the
  guidance is voice-driven or text-on-screen).
- Voice/tone calibration for movement cues (the existing
  Vara_NSDR_Audio_Scripts.md pattern is a starting reference for
  format, not content).
- A decision on whether the picker becomes 3-option (Walk / Stretch
  / Flow) or whether Flow surfaces as a separate protocol family
  with its own catalog entries.

Track for Phase 4 entry. Until then, Walk and Stretch are the
shipping options.

---

## Selector logic — closest-match deterministic sort (Layer 1 of round 3)

Round 3 Layer 1 replaced the alphabetical-id tie-break in
`mobile/src/services/protocolSelector.service.ts` with an ascending
`|p.timeWindow - chosenWindow|` sort, alphabetical id as the
tie-break. The change fixes the time-budget mismatch surfaced
during testing (Foggy + 20 min was returning a 10-min protocol
because `m` < `n`).

**This is a one-dimensional heuristic, not a scoring function.** It
prefers protocols whose `timeWindow` is closest to the user's
chosen window, with no awareness of:

- Evidence tier (an unproven 20-min protocol beats a Tier 1
  10-min one even though the 10-min has stronger evidence).
- Recency (no fatigue avoidance — same protocol can be
  recommended repeatedly).
- User preference / history (no personalization).
- State-specificity weighting (a generic protocol that lists 5
  states ties with a state-specific one).
- Closest-under vs closest-over symmetry (the `<= chosenWindow`
  filter means no over-shoot is possible, but the heuristic
  treats all under-shoots as linearly worse — a 5-min for a
  20-min budget might be a better fit than a 4-min for a 5-min
  budget if the user actually has 20 minutes free).

**Phase 4 owns the real recommender.** When that work lands, the
closest-match sort gets replaced by a multi-feature scoring
function. Possible feature set:

```ts
score(protocol, request) =
  evidenceWeight(protocol.evidenceTier) +
  recencyPenalty(protocol.id, request.userId) +
  stateSpecificityWeight(protocol, request.state) +
  durationFitScore(protocol.timeWindow, request.timeWindow) +
  preferenceWeight(protocol, request.userPreferences)
```

**Why Layer 1 lands now and not at Phase 4:** the alphabetical
tie-break produces user-visible mismatches in the round-3 testing
window (recommended duration ≠ stated budget). Closest-match is
a strict improvement over alphabetical without preempting the
Phase 4 scoring system — Phase 4 will replace the entire sort
function regardless of what the tie-break currently does.

**Test coverage:**
`mobile/src/services/__tests__/protocolSelector.service.test.ts`
adds three regression tests for the closest-match behavior plus
two existing-case updates (Steady+5 → coherence-breathing-5;
Clear+45 → focused-work-45 — both shifts are intentional and
correct under the new sort).

**Doc cross-reference:**
`docs/SPEC_CONSISTENCY_BACKLOG.md` "protocolSelector tie-break uses
alphabetical ID sort" entry has been updated to note Layer 1's
partial fix.

---

## React Navigation default back button on Practices screen — root cause unidentified

**Reported:** Founder device verification on build #1.0.83
(`PracticesIndexScreen` registered at `AppNavigator.tsx:744-754`
with `headerShown: true`, `standardHeaderOptions`, `animation:
'slide_from_right'`). Tapping the system-default header back button
did nothing — the screen did not pop, no visual feedback fired.

**Diagnostic results (rounds 1–3):**

- `canGoBack()` returned `true` on both mount and focus → navigate /
  push semantics are not the problem; the back target exists.
- A custom `TouchableOpacity` `headerLeft` override added in the
  working tree fired its `onPress` correctly in the dev build and
  popped the stack. Visual feedback (opacity dim) worked.
- Round 3 added `headerLeft RENDER` and root `onTouchStart` traces;
  all fired as expected in dev.

**Outcome A confirmed in dev: the override works.** The shipped fix
(round-3 production fix on `PracticesIndexScreen.tsx`) keeps the
custom override with a chevron icon and design-system styling.

**What we did NOT learn:** why the SYSTEM-DEFAULT React Navigation
back button failed in #1.0.83. The dev verification ran with our
override compiled in, so it proved the override works — it did not
isolate the original root cause. We routed around the bug; we did
not diagnose it.

**Hypotheses to investigate (in priority order):**

1. **Stack-header chrome interaction with `slide_from_right`
   animation.** The Practices screen ships with `animation:
   'slide_from_right'`. Other screens in the same stack with
   different animations (`slide_from_bottom`) may not exhibit the
   issue. Worth grepping for stack screens with
   `slide_from_right` + `headerShown: true` and probing each.
2. **`headerShadowVisible: false` + `standardHeaderOptions`
   interaction.** The Practices screen also sets
   `headerShadowVisible: false`. Combined with the
   `Colors.mistWhite` header background and zero shadow, the
   header may be visually present but have a hit region issue
   (transparent bg + RN's default header touch handling).
3. **iOS-specific React Navigation native-stack issue.** Tested
   only on iOS (founder's primary device). The default chevron's
   hit region on `@react-navigation/native-stack` 7.8.6 may have
   a known quirk under specific style combinations.
4. **Stale-build artifact.** Less likely but possible: the user
   was on a build whose JS bundle had drifted from native shell
   in some way, and the issue was a one-off install rather than
   a true bug. Hard to falsify retroactively.

**Investigation when this comes up next:**

- Check whether other stack screens with `slide_from_right` +
  `headerShown: true` (e.g. `HabitDetailScreen` at line 700,
  `DevBreathPacer` test harness, etc.) reproduce the same bug
  on a fresh #1.0.83-equivalent build.
- If the bug is reproducible elsewhere, the override pattern from
  `PracticesIndexScreen` should be lifted to a shared helper or —
  preferably — the root cause should be fixed via header style
  adjustment rather than per-screen overrides.
- File a minimal repro upstream to `@react-navigation/native-stack`
  if the bug is verifiable in a stripped-down example.

**Why this matters:** the Practices override is currently a
per-screen workaround. If the same issue affects other stack
screens, every affected screen needs its own override (drift risk
+ duplicated touch handling code). Root cause identification lets
us fix it once.

**Doc cross-reference:** `docs/PHASE_NOTES.md` "Sub-step 2.7 round
5 — Task 3 (Obs 12b)" describes the override; this entry is the
companion that names the unfixed underlying issue.

---

## Dashboard stale-state symptom — round 5 → round 7 investigation arc

**Status: RESOLVED in round 7 commit.** Originally closed as "not
reproducible" in round 5; the conclusion was over-generalized.
Round 7 device verification (against build #1.0.85, post-Bug B fix)
re-surfaced the symptom on the BrowseRunFlow path. Investigation
identified a write-coverage gap and the fix shipped in the same
round-7 commit.

### Original report (round 4)

New test user, Foggy → 10 → Light Movement → Walk → re-check →
dashboard showed chip picker instead of the post-re-check summary.

### Round 5 investigation (instrumentation pass)

Hypothesized Bug A as a cold-start race between
`writeStandardFlowSession` and the dashboard's `useFocusEffect`
refetch beyond the 1500ms floor. Cold-start dashboard read
latencies measured:

- 267ms — returning visit, `result= present` ✓
- 516ms / 1202ms / 1256ms — first dashboard load, new user

**Round 5 mistake — over-generalization.** The instrumentation pass
exercised the standard CheckInFlow path only. At that time
BrowseRunFlow returned to Practices (round 5's locked Case 4
decision), so even if the legacy-write gap existed there, the
symptom couldn't surface — the user wasn't ON the dashboard after
BrowseRunFlow completion. We over-generalized "not reproducible
on the standard path" to "not reproducible anywhere" and closed
the bug.

### Round 7 device verification (post-Bug B routing change)

Round 6's Bug B fix routed BrowseRunFlow with `CheckInFlowContext`
to dashboard via `popToTop()`. Round 7 verification reproduced the
original Bug A symptom on this newly-reachable path.

**Actual root cause (identified round 7):** BrowseRunFlow's
terminal effect called `writeProtocolSession` only — it did NOT
write to the legacy `brainStateCheckIns` collection that the
dashboard reads via `useDashboard.ts:305 → getTodayBrainStateCheckIn`.
The dashboard saw null after BrowseRunFlow returned and flipped
back to the chip picker.

### Round 7 fix

`writeStandardFlowSession`'s post-`writeProtocolSession`
orchestration (legacy `saveBrainStateCheckIn` + conditional
`markProtocolCompleted` + `setFirstShiftAtIfNeeded`) extracted
into a new exported helper:
`writeBrainStateCheckInLegacyEffects(userId, stateBefore,
isFlowComplete, outcome, options)`. BrowseRunFlow's terminal
calls this helper when `CheckInFlowContext` is present, wrapped
in a `Promise.all` with a 1500ms display floor — the same race-
prevention shape that closed the original Obs 11.

When context is absent (true browse — no production entry today),
the helper is NOT called. Preserves the isolated browse-path
semantics for any future standalone Practices entry.

### Discipline lesson — "not reproducible on path X" ≠ "not reproducible"

When investigating a reported symptom, the hypothesis space MUST
include the path where the symptom was originally reported.
Round 5 tested the standard CheckInFlow path and concluded "not
reproducible" — but the original report came from a path that has
since been changed by an unrelated fix (Bug B routing change).

**Rule for future investigations:** if a symptom is reported on a
path that has since been changed (routing, write logic, etc.),
re-test that specific path post-change rather than concluding from
a different path's behavior. The change may have moved the symptom
into reach (round 7's case) or fixed it incidentally — either way,
the original-path re-test is the load-bearing data point.

### Diagnostic instrumentation cost (when re-needed)

~30 lines across `CheckInFlow.tsx` (`writeStandardFlowSession`
START/END logs around the Promise.all), `BrowseRunFlow.tsx`
(matching START/END for the BrowseRunFlow path), and
`useDashboard.ts` (`useFocusEffect` FIRED + `dashboardRead`
START/END/result logs). Tag with `[DIAG-OBSA]` for grep-and-remove.
Round 5's diagnostic added → removed across a single investigation
cycle; check git history for the diff template.

---

## Brain state selection latency on dashboard chip picker

Round 5 device verification (May 2026): multi-second delay between
the user tapping a brain-state chip and the selection registering
visually/functionally. The dashboard chip picker is the user's
first interaction at every daily check-in; latency at this surface
is high-friction at a high-frequency moment.

**Hypothesis (not investigated):** the chip-tap handler may be
performing a synchronous Firestore write (or awaiting one) before
firing the navigation transition to CheckInFlow. The visual
feedback the user expects ("the chip I tapped lights up
immediately") happens after the write resolves rather than on
the tap event.

**Investigation path:**

- Trace the chip onPress handler in
  `mobile/src/components/dashboard/BrainStateCheckin.tsx` (or its
  current equivalent — verify path).
- Identify whether `saveBrainStateCheckIn` (or the new
  `writeStandardFlowSession` pre-write) fires synchronously
  before the navigation.
- If so, restructure: fire navigation immediately on tap, defer
  the write to background. The CheckInFlow itself owns the
  authoritative write at terminal — a pre-tap write is redundant
  and adds latency for no correctness benefit.

**UX shape of the fix:**

- Tap fires a haptic + visual confirmation (chip selected state)
  in the same render frame as the press event.
- Navigation transition kicks off in parallel.
- Any "register the tap" data write (analytics, partial-state
  capture) happens fire-and-forget in background.

**Phase 6 candidate**, or sooner if device testing surfaces this
as blocking. Not a correctness bug — UX polish only.

---

## Recovery system architectural gap

Round 5 device verification (May 2026): founder force-quit during
a running cyclic-sighing timer and expected a recovery prompt on
next app open within the 30-minute window. No prompt fired.

**Investigation finding (round 5, see Bug D):** the recovery
mechanism is structurally correct per the current spec but the
spec's implicit contract diverges from user expectation. The
marker is written to AsyncStorage **only on entry to the re_check
step** (i.e., after the protocol's timer completes naturally and
before the user picks state-after). Force-quits during three
common interruption points produce no recoverable marker:

| Force-quit point | Marker written? | Recovery fires? |
|---|---|---|
| Modality picker (pre-timer) | No | No (correct — nothing started) |
| **Running timer** (user's case) | **No** | **No** (counter to expectation) |
| `re_check` (timer done, before state pick) | Yes | Yes |

The locked decision on the round-1 fix (sub-step 2.7) was to
write the marker on `re_check` entry to preserve the captured
data integrity (sessionStartedAt, sessionEndedAt, and the
inferred `stateBefore` are all known at that moment). Writing
earlier would either require pre-emptive Firestore session-start
writes or a more complex marker schema that handles
"unfinished-running" state as a first-class case.

**Phase 4 design considerations:**

- **When to write the marker.** Options: protocol-start (first
  step mounts), first step completes, post-session-doc-write,
  re_check entry (current). Earlier writes give better recovery
  coverage but more chance of stale markers from intentional
  quits. Later writes give cleaner intent signal but miss the
  most common interruption point.
- **One-shot guard logic for multiple potential trigger points.**
  Currently `recoveryOfferedAt` is a single field. If the marker
  is written at multiple points, the guard may need to track
  which surface the recovery was offered from.
- **False-positive risk.** Users who *intentionally* force-quit
  don't want forced resumption. Recovery should be offered, not
  imposed. The current "Yes, check in" / "No, dismiss" prompt
  shape is right; the issue is just *when it can fire*.
- **UX shape.** "You have an unfinished session from X minutes
  ago — resume or skip?" The 30-minute window already prevents
  stale prompts. Surface treatment matters: don't hijack
  navigation, don't block the dashboard.
- **Coverage matrix for Phase 4.** Once the design lands, run
  the marker-write logic against each of the four force-quit
  points (modality picker, running timer, re_check, response)
  and confirm the expected behavior for each.

**Defer to Phase 4 design phase.** Round 5 does not expand
recovery scope. The current behavior (re_check-only marker) is
captured as a known limitation, not a bug.

**Doc cross-reference:** The recovery_confirm step in
`mobile/src/components/checkin/flow/reducer.ts` and the marker
writer in `mobile/src/utils/flowSessionMarker.ts:166-191` are the
key sites Phase 4 will refactor.

---

## `motion.ts` cites the Build Guide by line number, now shifted (Aug 2026 doc restructure)

`mobile/src/constants/motion.ts:3` reads "Build Guide §UI motion
(Vara_Build_Guide.md, lines 188-191) defines...". Two problems:

- The file moved to `docs/archive/Vara_Build_Guide_SUPERSEDED.md` and is
  quarantined, so the path in the comment no longer resolves.
- The 8-line supersession header shifted every line by +8, so the cited
  range 188-191 now points 8 lines early.

The motion VALUES are not in question and nothing is broken at runtime.
This is a stale citation that will mislead the next reader.

**Fix when `motion.ts` is next touched:** repoint the citation to whichever
current doc owns motion ranges (likely `mobile/Vara_Mobile_UI_Standards.md`),
or quote the range inline so it stops depending on another file’s line
numbers. Do not open the file solely for this.

---

## `Colors.brainPillars` renders the retired five-pillar model

The five-pillar model (Growth / Energy / Focus / Resilience / Connection) is
retired, superseded by the four-tab IA. Its tokens and consumers are still
in the tree:

- `mobile/src/constants/colors.ts:94` — the `brainPillars` token block.
- `mobile/src/components/shared/BrainPillarBadge.tsx:53-54`
- `mobile/src/components/shared/BrainPillarInfoModal.tsx:34,54,74,94,114`
- `mobile/src/screens/GoalsScreen.tsx:92,117` — a `brainPillars` form field.

The documentation for these tokens was removed from
`mobile/docs/DESIGN_SYSTEM.md` in the Aug 2026 doc-precedence slice, so the
tokens are now live but undocumented — the worst of both states. (That file has
since retired into `mobile/Vara_Mobile_UI_Standards.md`; its section 4.1 is the
current palette and does not carry `brainPillars` either, so the gap stands.)

**Needed, in order:** (1) a reachability check against the CC inventory
(`mobile/docs/inventory/CC_Inventory_2026-08-15.md`) to establish whether
BrainPillarBadge and BrainPillarInfoModal are BUILT AND REACHABLE or BUILT
BUT DARK; (2) if dark, a removal slice for components + tokens + the
GoalsScreen field; (3) if reachable, a decision from Kyle on what those
surfaces should say instead, since the vocabulary they render is retired.

Do not delete piecemeal. `GoalsScreen`’s `brainPillars` field may be
persisted on existing goal documents; removing the write path is not the
same as migrating the data.

---

## [RESOLVED 2026-08-30] `StreakMilestoneModal` / `MomentOfRecognitionModal` has no render site

`mobile/src/components/celebrations/StreakMilestoneModal.tsx` exports a modal
aliased `MomentOfRecognitionModal` by two barrels
(`components/celebrations/index.ts:7`, `components/index.ts:89`) and covered by
`components/celebrations/__tests__/StreakMilestoneModal.test.tsx`. **No screen or
component imports it.** Verified by import graph, not filename grep, during the
guard-hardening slice (2026-08-30).

**RESOLVED:** component deleted `6aa636b` (merged to main in `fea23e2`); the
DESIGN_SYSTEM.md section that listed MomentOfRecognition under Approved Patterns
retired with that file in this slice. Both halves of the entry are gone, so the
UNDER REVIEW flag on its day-count thresholds is moot. The successor rule lives
in `mobile/Vara_Mobile_UI_Standards.md` section 10.10, which names day-count
milestone modals as retired and not to be rebuilt.

The only surviving mentions of the name are string fixtures inside
`src/__tests__/brandCompliance.test.ts`, which exercise the module-specifier
detector. They are test data, not a render site, and are correct as they stand.

**Action in a future cleanup slice:** remove the component, its test, and both
barrel exports, unless a render site is planned. Any future milestone
acknowledgment is a fresh design decision against Voice & Tone v2.2 section 3.3,
not a revival of this component.

**Also:** if it is kept rather than removed, rename the file
`StreakMilestoneModal.tsx` to `MomentOfRecognitionModal.tsx`. The filename is the
only place "Streak" survives, and it is the reason the brand guard has to skip
import/export specifier lines at all.

---

## Five-pillar removal: refined reachability

Supersedes the single open question in the `Colors.brainPillars` item above. The
guard-hardening Step-0 pass resolved it into three different answers:

- `src/screens/GoalsScreen.tsx` — **DARK.** Registered in no navigator
  (`mobile/docs/inventory/CC_Inventory_2026-08-15.md` section 1d, line 185).
- `src/components/shared/BrainPillarBadge.tsx` — **DARK by inheritance.** Its only
  render site is `GoalsScreen.tsx:534`.
- `src/components/shared/BrainPillarInfoModal.tsx` — **MOUNTED ON A REACHABLE
  SCREEN, PERMANENTLY INVISIBLE.** Rendered at `HabitsScreen.tsx:198`, and
  `HabitsScreen` is reachable content (inventory line 164: `PlanScreen` mounts it
  as a child component; `PillarTime` is REACHABLE at line 146). But
  `setPillarInfoVisible(true)` is never called anywhere in the tree:
  `useState(false)` at `useHabitsScreen.ts:50`, and the only invocation is
  `setPillarInfoVisible(false)` in the modal's own `onDismiss`
  (`HabitsScreen.tsx:200`). The `visible` prop is a constant `false`.

This is a fourth state the inventory's three-way scheme does not name: shipped,
mounted, unopenable. It is worse than dark for removal purposes, because it reads
as live to anyone opening `HabitsScreen`.

**The removal slice has three targets. Take the modal first** — it is the one
that looks live and is not.

---

## `OnboardingTourScreen` confetti identifiers

`src/screens/onboarding/OnboardingTourScreen.tsx` holds `showConfetti`,
`setShowConfetti`, and `handleConfettiComplete` (lines 81, 115, 116, 119, 120,
200, 201). The confetti itself is long gone: the screen renders `<QuietFinish>`.
Only the identifier names survive.

The screen is DARK (inventory section 1d, line 189: registered nowhere), and the
brand-compliance guard waives it by allowlist rather than failing on identifiers.

**Action:** rename the three identifiers to match what the screen actually does
(`showAcknowledgment` / `setShowAcknowledgment` / `handleAcknowledgmentComplete`)
whenever this screen is next touched, then drop its allowlist entry. Not worth a
dedicated slice; it is a dark screen.

---

## Root `npm test` is red on main

`npm test` from the repo root runs `react-scripts test` against the **web** app:
7 suites / 21 tests, of which **3 suites and 2 tests fail** (`src/App.test.js`,
`src/services/db/__tests__/profiles.service.test.js`,
`src/services/db/__tests__/errors.service.test.js`). Cause is Firebase auth
initialization without env vars (`src/firebase.js:23`, `getAuth`). Real exit code
is 1. Verified 2026-08-30.

It does not run the mobile suite, and mobile's `npm test` does not run these. The
two are disjoint, and this is the same class of trap as the root-`tsc`
placeholder documented in `mobile/CLAUDE.md`.

**Action:** in the next slice that touches the repo root, either fix these three
suites or formally skip them, and add this approved line to the root `CLAUDE.md`
under "Working on the web app" (approved 2026-08-30, parked here because the
guard-hardening slice fence excluded docs other than this backlog):

> `npm test` here runs `react-scripts test` against the **web** app only and is
> currently **red on main** (3 suites fail on Firebase auth init without env
> vars). It does not run the mobile suite; that is `npm test` from `mobile/`. Do
> not read a root test failure as a mobile regression, or a mobile pass as web
> coverage.

---

## [SUPERSEDED 2026-08-30 - see "CORRECTION 1" at the end of this file] `wellnessScore.service.ts` implements a banned concept, not just banned copy

`mobile/src/services/firebase/wellnessScore.service.ts` computes a scored wellness
metric with weighted components, including a `streakBonus` (`:427`) and the
user-facing label `'Streaks: Build consistency'` (`:432`).

Scores and denominators are banned outright, so this is not a string fix. The
whole service is the violation. `WellnessScoreCard`
(`components/dashboard/WellnessScoreCard.tsx`) has **0 render sites** — exported
from two barrels, rendered nowhere — and the service has no consumers outside its
own barrel.

**Action:** delete the service, the card, and their barrel exports in the
legacy-removal slice. Until then the brand guard allowlists the service.

---

## [SUPERSEDED 2026-08-30 - see "CORRECTION 2" at the end of this file] `featureDiscovery.ts` + `ComingUpSection` — retired streak-gated unlock mechanic

`mobile/src/constants/featureDiscovery.ts` describes a feature-unlock mechanic
gated on habit streaks, with four user-facing strings that violate the no-streaks
rule (`:204`, `:395`, `:397`, `:535`). Its only consumer,
`components/discovery/ComingUpSection.tsx`, has **0 render sites** (inventory line
268), which is also what makes the 5 dead `navigationTarget` values in that file
inert (inventory line 1226).

Rewording the strings is the wrong fix. The mechanic itself is retired.

**Action:** delete `featureDiscovery.ts`, `ComingUpSection.tsx`, and the discovery
components rendered only inside it (`FeaturePreviewBottomSheet`,
`NewlyAvailableCard`, `SoftRevealCard`). Note `UnlockToast` is **not** in that
set — `ToastContext.tsx:163` renders it. Legacy-removal slice. Until then the
brand guard allowlists the constants file.

---

# Legacy-removal slice (2026-08-30) — outcomes

Branch `chore/legacy-removal` off `4805c8e`. Archive tag
`legacy-removal-pre-2026-08` points at the branch point and is pushed: every
deleted file is one checkout away with
`git checkout legacy-removal-pre-2026-08 -- <path>`.

**Two of the six entries below asserted a deletability this slice disproved.
They are CORRECTED, not marked resolved.** A backlog entry claiming a live file
is dead is worse than no entry.

## RESOLVED

| Item | Commit |
|---|---|
| `BrainPillarInfoModal` — mounted on reachable `HabitsScreen`, `visible` permanently false | `e921eeb` |
| `GoalsScreen` — dark, in no navigator | `1f4c31a` |
| `BrainPillarBadge` — sole render site was GoalsScreen | `d7cd23d` |
| `Colors.brainPillars` tokens | `8904e16` |
| `StreakMilestoneModal` + test + both barrel exports | `6aa636b` |
| `WellnessScoreCard` (card only — see correction below) | `e88c8c8` |
| `ComingUpSection` + `FeaturePreviewBottomSheet` + `SoftRevealCard` + `NewlyAvailableCard` | `e7e766d` |
| `OnboardingTourScreen` confetti identifiers renamed; allowlist entry retired | `81d57cb` |

The `BrainPillar` **type** (`types/models.ts:641`) and `Goal.brainPillars`
(`:662`) were deliberately left alone: the type is used by ~30 files including
the persisted `selectedPillar` user-doc field, and both are data shape rather
than client code.

## CORRECTION 1 — `wellnessScore.service.ts` is LIVE, not dead

The earlier entry said the service had "no consumers outside its own barrel"
and should be deleted with the card. **That was wrong.** Only the card was dead.

`hooks/useDashboard.ts` imports five of its functions through the
`services/firebase` barrel and calls them on every dashboard mount:
`:255` `getWellnessScoreEnabled`, `:331` `getTodayWellnessScore`,
`:335` `calculateWellnessScore`, `:473` `refreshWellnessScore`.

Also live and previously unlisted: `components/dashboard/WellnessScoreBreakdown.tsx`
and `WellnessScoreOptInCard.tsx`, plus `saveMorningCheckIn` / `getMorningCheckIn`
— an unrelated live feature sharing the same file, exported from the firebase
barrel at `:199-200`.

**Why the earlier check missed it: barrel imports defeat filename greps.** The
consumer imports symbols from `'../services/firebase'`, never the file path.
Verify consumers at the SYMBOL level, not the path level.

**Still true and still a violation:** a scored wellness metric with a
`streakBonus` (`:427`) runs on every dashboard mount today. Scores and
denominators are banned outright.

**De-wiring project, in order:**
1. Sever the four `useDashboard` call sites.
2. Extract `saveMorningCheckIn` / `getMorningCheckIn` into their own service —
   they are a live, unrelated feature and must survive.
3. Delete the score machinery: the service remainder, `WellnessScoreBreakdown`,
   `WellnessScoreOptInCard`, `DailyWellnessScore` (`models.ts:1967`).

Collections `dailyWellnessScores` (written `:844`) and the `wellnessScoreEnabled`
user-doc field (`models.ts:245`) become **orphaned data pending a cleanup
decision**. Firestore data is not touched by client-code removal.

## CORRECTION 2 — `constants/featureDiscovery.ts` is LIVE, not deletable

The earlier entry said to delete the constants file along with
`ComingUpSection`. **The surfaces were dead; the provider is not.**

`components/discovery/UnlockToast.tsx:25` imports `UNLOCK_TOAST_CONTENT` from
it, and UnlockToast is on a live path: `ToastContext.tsx:163` renders it and
`App.tsx:119` mounts `<ToastProvider>`. Also live: `hooks/useFeatureDiscovery.ts:44`,
`services/firebase/featureDiscovery.service.ts:59` (which writes the
`featureDiscovery` map on user docs), the `constants/index.ts:120` re-export,
`types/featureDiscovery.ts` (used by `ToastContext.tsx:21`), and the
`userMigrationRead` path with two migration tests.

The dead surfaces were deleted in `e7e766d`. The file stays.

**Open follow-up — content-level prune.** Four user-facing strings in
`featureDiscovery.ts` violate the no-streaks rule and now describe surfaces that
no longer exist: `:204` "Build a habit tracking streak", `:395` "Advanced streak
and consistency insights", `:397` "Opens once you've built a solid habit
tracking streak.", `:535` "Build your habit streak first". They are dead weight
inside a live file. Removing them edits a live file's content, so it belongs in
a copy-level pass, not a deletion slice. The brand-guard allowlist entry for
this file now records exactly this state.

## Guard allowlist, after this slice

`brandCompliance` is down to 5 entries. `OnboardingTourScreen` was removed
(`81d57cb`) because the rename made it unnecessary. The `featureDiscovery` and
`wellnessScore.service` reasons were rewritten in `e7e766d` — both previously
asserted the deletability disproved above.

---

# UI Standards v2.0 slice (2026-08-30) — token findings

Surfaced by the read-only Step-0 verification for the UI Standards v2.0
doc slice. None of these are runtime bugs; all three are token-layer
inconsistencies found while checking the doc's claims against source.

## `BAND_STRONG_SCRIM` is a design token living in a component file

`mobile/src/components/shared/ScreenHeader.tsx:58` declares
`export const BAND_STRONG_SCRIM = [0, 0.05, 0.82, 1] as const` — the
approved gradient stop positions for the launch hero bands. It is
re-exported through `src/components/shared/index.ts:21` and consumed by
three screens: `DashboardScreen.tsx:26`, `Energy/EnergyHubScreen.tsx:22`,
`Focus/FocusHubScreen.tsx:23`.

It is a shared, named, approved visual constant used across three hubs,
which makes it a token by every other standard in this repo. It sits in a
component file only because it was introduced alongside the hero-band work.
Anyone looking for it under `src/constants/` will not find it, and the UI
Standards doc's token tables are the place people will look.

Note it is a gradient **locations** array, not a color, so it does not
belong in `ColorTokens`. It has no obvious home in the current
`designTokens.ts` groupings.

**Fix when the hero-band surfaces are next touched:** move it to
`designTokens.ts` (likely a new gradient/scrim grouping), keep a re-export
from `ScreenHeader.tsx` for one cycle so the three consumers do not need to
change in the same commit, then repoint them. Do not open these files
solely for this.

---

## The entire `Layout.community` block is dead, and one key pre-empts a radius token

`mobile/src/constants/spacing.ts:118-126` defines a `community` block with
six keys: `postCardRadius: 12`, `buttonRadius: 20`,
`postAuthorAvatarSize: 40`, `commentAvatarSize: 32`,
`postContentPadding: 16`, `actionButtonHeight: 48`.

**All six have zero consumers in `src/`.** The community screens were built
against the general scale instead. Four of the six also duplicate an
existing general token exactly (`12` = `borderRadius.lg`, `40`/`32` =
`avatarSize.md`/`sm`, `16` = `Spacing.base`, `48` = `buttonHeight.md`).

The one that matters for the token scale is `buttonRadius: 20`. When
`borderRadius['2xl'] = 20` lands, the repo will hold two unrelated
definitions of a 20pt radius, one of them dead — exactly the drift the
scale exists to prevent.

**Fix:** delete the `community` block outright rather than consolidating it.
Nothing imports it, so this is a pure removal with no consumer changes.
Deferred out of the v2.0 doc slice because that slice is scoped to `.md`
files plus additive token work, and a deletion is neither. Verify the
zero-consumer finding still holds at the time of removal.

---

## Two incompatible `letterSpacing` conventions, neither documented

The repo stores letter spacing in two different units, and nothing marks
which is which:

- `Typography.letterSpacing` (`typography.ts:60-65`) is in **absolute
  points** — `tighter: -0.5`, `tight: -0.25`, `normal: 0`, `wide: 0.5`.
  These are assigned directly to a React Native `letterSpacing` style,
  which is correct: RN's `letterSpacing` is absolute, not an em multiplier.
- `TypographyTokens.letterSpacingTimer` (`designTokens.ts:77`) is `-0.02`,
  an **em multiplier**, and must be multiplied by the font size at the call
  site to become points.

`letterSpacingTimer` is used correctly today. Both consumers do the
conversion: `PomodoroTab.tsx:414` and `ActiveRoutinePlayer.tsx:719` each
write `letterSpacingTimer * <fontSize>`. This entry is **not** reporting a
rendering bug — it is reporting that the correctness depends entirely on
every future call site remembering an unwritten rule.

The failure mode is quiet and one-directional: assigning `letterSpacingTimer`
straight to a style yields -0.02pt, which is visually indistinguishable from
zero, so it renders as "no tracking" rather than as anything obviously wrong.
The same trap catches anyone transcribing an `em` value out of the UI
Standards doc into a points-based field.

`TypographyTokens.letterSpacingCaps: 0.04` (`designTokens.ts:78`) has **zero
consumers**, so its unit has never been exercised either way.

**Fix when `designTokens.ts` is next touched:** either convert the em tokens
to points to match the dominant convention, or rename them to carry the unit
(`letterSpacingTimerEm`) and comment the multiply-at-call-site requirement.
Renaming is the cheaper, safer option — it makes the two call sites
self-checking. Do not open the file solely for this.
