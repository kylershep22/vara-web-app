# Vara Tech Debt Backlog

Items found during phased work that don't block the current phase.
Phase 6 polish sweep is the working list.

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

## BrainStateCheckin.tsx — no test file (paired with the cleanup entry above)

`mobile/src/components/dashboard/BrainStateCheckin.tsx` has no test
file. Surfaced during the Observation 4 fix verification: the search
for tests asserting on the auto-collapse behavior turned up zero
results because the component has no test coverage at all. Shipped
through sub-step 2.5's substantial rewrite (the caller migration
that reshaped the component into a CheckInFlow navigator) and
sub-step 2.7's Change-button fix without coverage either time.

The gap is paired with the cleanup entry directly above. Adding tests
to the current component would have negative ROI — the component is
queued for architectural cleanup that eliminates the phase state
entirely, which means any tests written against the current shape
would be deleted by the refactor.

**Resolution shape (paired with the cleanup work):** when the
"eliminate phase state" refactor lands, the resulting stateless chip
picker ships with tests covering at minimum:

- Chip tap dispatches `navigation.navigate('CheckInFlow', ...)` with
  the correct `state_preselected` payload.
- The Change-from-collapsed behavior reaches the expanded picker
  state without reverting (the regression guard for the Observation
  4 bug class).
- Props reactivity to `currentCheckIn` changes — both the truthy →
  truthy state-change case and the truthy → null reset case.

Tracking the gap separately from the cleanup so the test work is
visible as a deliverable of the refactor, not an optional add-on
that gets deferred again.

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
