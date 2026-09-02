# CC Journey Inventory — Aug 31, 2026
**Read-only Step-0 diagnostic for the journey pivot. Transcribed from the CC terminal
report; some table cells were clipped by terminal width in the capture and are marked
[…]. File:symbol citations are preserved as reported. Baseline: main pre-slice-0
(16ad55c). Superseded facts: tsc baseline is 149 (not 158–160); rules baseline 183/2
as of Sept 1; see roadmap Section 13.**

---

## 1. Weekly machinery — blast radius

### 1.1 Modules that exist only for the weekly loop

| File | Symbols |
|---|---|
| src/screens/weekly/weeklyEntry.ts | resolveWeeklyEntry, WeeklyEntryTarget ('floor'\|'open'\|'today'), WeeklyEntryCycle |
| src/screens/weekly/weeklyContinuity.ts | toWeeklyRecords, loadWeeklyContinuity |
| src/screens/weekly/WeeklyEntryScreen.tsx | route guard, replaces between 3 routes |
| src/screens/weekly/WeeklyOpenScreen.tsx | 4-step wizard: Step = 'outcome' \| 'capacity' \| 'weekStart' \| 'confirm' |
| src/screens/weekly/FloorCommitmentScreen.tsx | writes userPrivate.floorCommitment, logs floor_set |
| src/screens/weekly/WeeklyCloseScreen.tsx | 3 ratings + floorMet + note + adjustment |
| src/screens/weekly/copy.ts | FLOOR_COPY, ENTRY_COPY, OPEN_COPY, CLOSE_COPY, ADJUSTMENT_KEYS/LABELS, and CAPACITY_LABELS/GLOSSES, TIME_LABELS/GLOSSES, PICKER_COPY |
| src/hooks/useWeeklyLanding.ts | useWeeklyLanding — the on-Home guard |
| src/hooks/useWeeklyCloseEntry.ts | useWeeklyCloseEntry — fires weekly_close_entry on tap |
| src/components/dashboard/OpenYourWeekCard.tsx | standing "open your week" affordance |
| src/components/dashboard/ContinuityCard.tsx | unbroken-week count |
| src/components/dashboard/CloseWeekEntry.tsx | close entry / closed acknowledgment |
| src/components/shared/WeekStartPicker.tsx + src/utils/weekdayLabels.ts | start-day picker |
| src/protocolEngine/continuity.ts | computeContinuity; WeeklyRecord in types.ts |

src/utils/weekStart.ts is entirely weekly: WEEK_LENGTH_DAYS, isoWeekday,
nextWeekStartAfter, mostRecentWeekStartOnOrBefore, resolveWeekEnd, isWithinWeek,
planWeek — except toIsoDate and addDaysIso, which the daily loop consumes directly
(useTodayCard.ts:todayIso, and addDaysIso(todayIso, -1) for the pre-fill read).

### 1.2 The service is a mixed module — the main seam problem

src/services/firebase/weeklyCycle.service.ts (507 lines) owns three collections in
one file:

- **weeklyCycles (retire):** createWeeklyCycle, getWeeklyCycleForWeek,
  countWeeklyCyclesForOutcome, getLatestWeeklyCycle, getWeeklyCyclesForUser,
  getRecentWeeklyCycles, updateWeeklyCycle, closeWeeklyCycle
- **dailyLogs (keep):** dailyLogDocId, upsertDailyLog, getDailyLog, hasPickedToday,
  DailyLogInput
- **downshiftEvents (already orphaned):** createDownshiftEvent,
  getDownshiftEventsForCycle. The file header states nothing writes there any more.

Splitting dailyLogs out into its own service is the single highest-leverage prep
move; it costs nothing today and de-risks everything after. *(Done in slice 0.)*

### 1.3 Firestore fields

WeeklyCycle (src/types/models.ts:478): weekStart, weekEnd?, outcome,
capacityInitial, capacityCurrent (frozen — nothing reads it, per useTodayCard.ts
dependency comment), protocolId, closeCompletedAt?, ratingFocus/Recovery/Energy?,
closeNote?, adjustmentSelected?, floorMet?.

UserPrivate (src/types/models.ts:113): floorCommitment?, weekStartDay?,
activeOutcome?, whyNote?, antiGoals?, energyWindow?.

**activeOutcome is write-only.** grep -rn activeOutcome src returns exactly three
hits: the type declaration and one write in Onboarding […] reads it. Every outcome
read in the app goes through weeklyCycles.outcome.

Analytics (src/types/analyticsEvents.ts): weekly_open, weekly_close,
weekly_close_failed, weekly_entry, weekly_close_entry, floor_set, plus
ProtocolId = `${OutcomeKey}-${CapacityTier}` and protocolIdFor().

Rules: firestore.rules:850 (weeklyCycles), :860 (dailyLogs), :875 (downshiftEvents).

### 1.4 What the DAILY loop actually depends on

useTodayCard(uid, cycle) takes a WeeklyCycle | null and returns EMPTY when null.
It reads exactly four things off it:

| Read | Context | Why |
|---|---|---|
| cycle.id | const cycleId = cycle?.id | effect dependency only |
| cycle.outcome | selectProtocol(outcome, …) | first key of the matrix |
| cycle.capacityInitial | todaysCapacity = log?.dailyCapacity ?? capacitySeed | day-1 seed when the day is unpicked |
| cycle.closeCompletedAt | isClosed boolean | reload trigger after a close |

Plus one weekly query: countWeeklyCyclesForOutcome(uid, outcome) →
applyQuickWin(protocol, weekNumber).

And DashboardScreen.tsx:298 gates the entire Today block on
weeklyLanding.target === 'today' && weeklyLanding.cycle.

Verified independent of weekly constructs:
- dailyLogs doc id is `${userId}_${date}` (dailyLogDocId) — no weeklyCycleId field
  on the row. DailyLog interface (models.ts:558): userId, date, protocolCompleted,
  practiceIds, dailyCapacity?, dailyTimeBudget?, timestamps. Nothing weekly.
- hasPickedToday keys on dailyTimeBudget only.
- getFloorCommitment reads userPrivate, not the cycle.
- PROTOCOL_MATRIX / selectProtocol / pickVariant / timeClassForMinutes are pure and
  cadence-free.
- Day-rollover (todayIso state + AppState listener in useTodayCard) is calendar-only.

**Answer to the key question:** yes, weekly can be removed without breaking the
daily pick. The minimal seam is a replacement for the WeeklyCycle argument supplying
{ contentKey, capacitySeed, revisionToken }, plus a replacement for
useWeeklyLanding's target gate. Three things must be decided, not just rewired:

1. outcome is the matrix's first axis — a phase key must supply it or the matrix
   must be re-keyed (see §2.5).
2. countWeeklyCyclesForOutcome is the sole source of the quick-win week number, and
   it counts weeklyCycles documents. Retiring the […] quick-win rule's only input.
3. computeContinuity consumes floorMet off closed cycles only. Retiring the weekly
   close retires continuity, and ContinuityCard with it. WeeklyRecord deliberately
   carries no capacity tier (continuity.ts header) — that invariant is worth
   carrying forward whatever replaces it.

### 1.5 "This week" surfaces that are NOT the weekly loop

These share the word and share nothing else. They read habits / journal /
brainState, never weeklyCycles:

- src/hooks/useWeeklySummary.ts → AI journal summary (JournalScreen)
- src/hooks/useWeeklyCorrelations.ts → habit completions + brain state (InsightsScreen)
- src/hooks/useBrainStateWeekTrend.ts → brainStateCheckIns (BrainStateCheckin)
- src/components/dashboard/WeeklyHabitGrid.tsx, WeekInsightCard.tsx

**Implications.** The blast radius is small and unusually well-fenced — the weekly
loop is 14 files plus one mix[ed service; its tend]rils into the daily loop are four
scalar reads and one count query. The dailyLogs schema is the reason: it was
deliberately keyed on ${userId}_${date} with no cycle reference, so day rows survive
the weekly collection's removal untouched. Three real decisions hide behind the
mechanical work — what replaces outcome as the matrix key, what replaces the
per-outcome week number that gates the quick win, and whether continuity survives at
all once floorMet has no writer. Splitting dailyLogs out of weeklyCycle.service.ts
first would make every later step reversible. Beware copy.ts: the live daily-picker
strings sit inside the weekly copy module and must be moved, not deleted with it.

---

## 2. Daily loop contract

### 2.1 The flow, end to end

Today is DashboardScreen.tsx, mounted as the Home tab. HomeScreen.tsx is a 176-line
dead placeholder ("Home Screen (Temporary)") registered nowhere in the tab set.
ROUTES carries a comment stating there is deliberately no WeeklyToday route.

1. useWeeklyLanding(uid) reads getFloorCommitment → (if present)
   getLatestWeeklyCycle → resolveWeeklyEntry → target.
2. target === 'floor' | 'open' → pushed over the tab, latched once per target
   (pushedForRef, DashboardScreen.tsx:167).
3. target === 'today' → useTodayCard(uid, cycle) runs.
4. Unpicked (!hasPickedToday(log)) → <SetTodayCard onPress={() => setPickerOpen(true)} />.
   The whole hero is the invitation; no protocol title, no completion control.
5. Tap → <DailyPickerSheet> — presentational, owns no write, holds two answers in
   local state.
6. Confirm → todayCard.confirmPick(capacity, time) → upsertDailyLog(uid, todayIso,
   { dailyCapacity, dailyTimeBudget }) → setReloadToken(n+1) → full re-derive.
7. Picked → <TodayHeroCard> with protocol, floor card (only when capacity is
   slammed), completion CTA.
8. Complete → markDone() → optimistic setCompleted(true) → upsertDailyLog(uid,
   todayIso, { protocolCompleted: true, practiceIds: [] }), reverting on failure.
   No un-complete path.
9. Below the hero: <ContinuityCard> (self-hides at 0/null) then <CloseWeekEntry>.

### 2.2 Data model

dailyLogs/${userId}_${date} — dailyLogDocId() is the sole builder.
userId, date (ISO YYYY-MM-DD), protocolCompleted: boolean, practiceIds: string[],
dailyCapacity?: CapacityTier, dailyTimeBudget?: TimeClass, createdAt, updatedAt.
Written by upsertDailyLog with setDoc(…, { merge: true }); every field of
DailyLogInput is optional so the picker and the completion can share one row without
inventing each other's answers. protocolCompleted must stay optional or a re-opened
picker would un-complete a finished day.

Capacity: CapacityTier = 'normal' | 'limited' | 'slammed' (protocolEngine/types.ts).
Documented as readiness, not duration. The doc comment states the 12 shipped
protocols still read as a duration ladder and re-authoring along the readiness axis
is a pending content pass.

Time: TimeClass = 'short' | 'medium' | 'long'; bounds in TIME_CLASS_MAX_MINUTES =
{ short: 5, medium: 15, long: Infinity }; DEFAUL[T_TIME_CLASS …]

The matrix (protocolMatrix.ts:140) is ProtocolVariantMatrix =
Record<OutcomeKey, Record<CapacityTier, ProtocolVariant[]>> — a cell [holds a s]ingle
entry, so time can filter within it and 3b-iii can rotate. unauthoredVariants()
exists precisely because content is diagonal-only.

Selection ladder (selectProtocol.ts:pickVariant): asked class → nearest shorter
class → variants[0]. It walks down deliberately (serving longer spends time the user
said they did not have). Totality is a rule enforced by
__tests__/selectProtocol.test.ts, not a property of the type.

Two entry points, and the split is load-bearing:
- selectProtocol(outcome, capacity, time) — daily.
- representativeProtocol(outcome, capacity) — cell canonical, takes no time
  parameter and must not gain one. Used by the weekly open and
  OnboardingV3DoneScreen to write WeeklyCycle.protocolId.

### 2.3 protocolId conventions

- ProtocolVariant.id = `${outcome}-${capacity}` — cell-level, deliberately not
  unique per variant, because it is persisted on WeeklyCycle.protocolId and typed
  as a closed 12-member union ProtocolId in types/analyticsEvents.ts:49.
- ProtocolVariant.variantKey = `${outcome}-${capacity}-${timeClass}` — never
  persisted, never an analytics value.
- timeClass is derived from estMinutes inside the protocol() factory, never
  hand-written.

### 2.4 Skip, completion, rollover

Skip (DailyPickerSheet.tsx, testID="daily-pick-skip") is the same handler as the
scrim and back button: a pure dismiss. Writes nothing, the day stays unpicked,
re-openable all day with the same pre-fill. Copy is PICKER_COPY.skip = 'Not now'.

Completion is keyed to the date and nothing else — no protocolId beside
protocolCompleted — so changing capacity cannot invalidate […] a schema property,
not behavior.

Rollover: todayIso is React state seeded from toIsoDate(new Date()), resynced by an
AppState 'active' listener and a dependency-free render effect, with a
functional-updater equality guard so identical values bail out. The header names the
exact bug this fixed: an app left open past midnight kept reading yesterday's row.

Pre-fill: yesterday's row via getDailyLog(uid, addDaysIso(todayIso, -1)), read only
when the day is unpicked, falling back to capacitySeed / DEFAULT_TIME_CLASS.

### 2.5 Where "Outcome" is baked in

| Site | Form |
|---|---|
| protocolEngine/types.ts | type OutcomeKey = 'focus'\|'stress'\|'routines'\|'energy' — marked LOCKED by spec Section 5 |
| protocolMatrix.ts | PROTOCOL_MATRIX first-level key; OUTCOME_KEYS |
| selectProtocol.ts | first parameter of both entry points |
| ProtocolVariant | .outcome field; id and variantKey string templates |
| types/models.ts | WeeklyCycle.outcome, UserPrivate.activeOutcome |
| types/analyticsEvents.ts:49 | ProtocolId template literal type; weekly_open.outcome param |
| screens/weekly/copy.ts | ADJUSTMENT_KEYS includes 'different-outcome' |
| onboarding/v3/copy.ts | OUTCOME_COPY + per-outcome glosses |
| weeklyCycle.service.ts | countWeeklyCyclesForOutcome query filter |

The variantKey / id templates mean re-keying outcome→phase is a string-format change
on a persisted field (protocolId) and on a cl[osed union. dailyLo]gs is exempt — it
stores inputs, never a derived protocolId, explicitly so the two can never disagree.

**Implications.** The daily loop is a pure function of (outcome, capacity, time)
over an immutable data matrix, with the two user answers stored as inputs on a
date-keyed row and the protocol recomputed on every read. Re-keying outcome→phase
touches the matrix's outer key, two string templates, and one persisted field
(WeeklyCycle.protocolId) that is itself slated for retirement — so if the phase key
lands in the same slice as the weekly retirement, the migration surface is near
zero. The one genuine cost is content: 24 of 36 (outcome × capacity × time) triples
are unauthored, so time is collected honestly and changes nothing today; a phase
axis multiplies that grid rather than replacing it, and the unauthored-cell count
should be recomputed before any content commitment is made.

---

## 3. Onboarding flow

Live arc is V3, gated by ONBOARDING_V3 = true in src/constants/dashboardConfig.ts,
returned early in AppNavigator.OnboardingNavigator (:203) ahead of the V1/V2
expression. V2 is retained as a one-line revert lever. Route names are local to
src/screens/onboarding/v3/routes.ts (V3_ROUTES), not in navigation/routes.ts.

State is held in OnboardingV3Context — an in-memory scratchpad, persisted nowhere.
Everything is written once at the terminal.

| # | Route | Screen | Question | Required? | Writes |
|---|---|---|---|---|---|
| 1 | ColdOpen | OnboardingV3ColdOpenScreen | none — "Welcome to Vara" | — | — |
| 2 | Outcome | OnboardingV3OutcomeScreen | "What do you want more of?" (OUTCOME_KEYS, single-select) | yes | ctx outcome |
| 3 | Why | OnboardingV3WhyScreen | "Why this one?" free text | skippable | ctx whyNote |
| 4 | Capacity | OnboardingV3CapacityScreen | "How much room does this week have?" (CAPACITY_TIERS) | yes | ctx [capacity] |
| 5 | Floor | OnboardingV3FloorScreen | "What is your floor?" free text | skippable | ctx floorCommitment |
| 6 | WeekStart | OnboardingV3WeekStartScreen | "When does your week start?" (WeekStartPicker, 0–6) | skippable | ctx weekStartDay |
| 7 | FirstWin | OnboardingV3FirstWinScreen | none — runs DEFAULT_ONBOARDING_PROTOCOL_ID via GuidedSessionPlayer | skippable | not[hing until] it completes |
| 8 | Reminder | OnboardingV3ReminderScreen | "When should we check in?" (DateTimePicker) | skippable | notificationPreferences + scheduleDailyRhythm(uid) — writes in-place, not at the terminal |
| 9 | Done | OnboardingV3DoneScreen | none | — | see below |

### 3.1 The terminal write (OnboardingV3DoneScreen.finish)

Fixed order, documented as load-bearing:

1. One setUserPrivate(uid, patch) merge — activeOutcome, whyNote, floorCommitment,
   weekStartDay. Skipped fields are omitted, not nulled. weekStartDay guarded with
   !== null because Sunday is 0.
2. getUserPrivate → planWeek({ todayIso, weekStartDay: priv?.weekStartDay,
   priorWeekEnd: null }) → getWeeklyCycleForWeek(uid, week[Start) → createWeeklyCy]cle
   (uid, { weekStart, weekEnd, outcome, capacityInitial: capacity, protocolId:
   representativeProtocol(outcome, capacity).id }).
3. completeOnboarding(uid) last — flipping hasCompletedOnboarding re-renders
   AppNavigator off the onboarding stack, so any in-flight write would be racing an
   unmount.

hasCompletedOnboarding is dual-written to both users/{uid} and userPrivate/{uid}
(AuthContext.tsx:208-220, with a backfill path at […]).

### 3.2 Where the weekly loop is embedded in onboarding

Three of nine screens exist only to seed the weekly loop:

- **Outcome (step 2)** — feeds WeeklyCycle.outcome (read) and
  UserPrivate.activeOutcome (write-only, never read).
- **Capacity (step 4)** — copy is explicitly weekly ("How much room does this week
  have?") but the value lands on capacityInitial, whi[ch functions as] a day-1 seed.
  The value survives the pivot; the framing does not.
- **WeekStart (step 6)** — pure weekly machinery. Retires wholesale with planWeek.

Floor (step 5) is ambiguous: floorCommitment lives on userPrivate, is read by
useTodayCard (shown when the day's capacity is slammed) and by useWeeklyLanding as
the 'floor' routing gate. The value survives; the gate does not.

Also: V3_ORDER.length === 9 so V3_TOTAL_STEPS === 9, but OnboardingV3DoneScreen's
header comment says "Step 8 of 8" and v3/copy.ts says "this arc is eight screens".
The code is right, the comments are stale.

**Implications.** The arc is cleanly separable: one context object, one terminal
write, and every answer optional except outcome and capacity. Replacing
outcome-picking is a same-shape swap — add fields to OnboardingV3State, add them to
the single setUserPrivate patch, drop the createWeeklyCycle block. Two traps: the
terminal's write order is load-bearing (the completion flag [must stay last]), and
the Reminder screen breaks the "write once at the terminal" rule by writing in
place — a new screen should follow the context pattern, not the reminder one.
activeOutcome being write-only means nothing downstream breaks if a phase field
replaces it.

---

## 4. Practices hub / step 4 state

### 4.1 Correction to the stated premise

ROUTES.PillarFocus is registered at AppNavigator.tsx:927 and ROUTES.FocusRhythms at
:1050. PracticesHubScreen's header records the fix ("RESTORES FOCUS… The first card
below is the entry point that brings both back"). The roadmap line the premise came
from (docs/Vara_Today_IA_Restructure_Roadmap_v2.md:63) predates step 4a. **There are
currently no dark routes in the Practices subtree.**

### 4.2 Tab set — four tabs, live

AppNavigator BottomTabs: Home → DashboardScreen, PillarPractices →
PracticesHubScreen, PillarLearn → LearnHubScreen, Community → CommunityNavigator.
FOUR_PILLAR_IA = true.

### 4.3 Current hub structure — four cards, no video

PracticesHubScreen.tsx is a stateless launcher: config array → TouchableOpacity rows
with { icon, label, descriptor, go }, testID=`practices-hub-card-${p.id}`. It "holds
no state, reads no data, and renders nothing of its own beyond the cards."

| Card | Destination | Slice |
|---|---|---|
| Focus & Time | ROUTES.PillarFocus → FocusHubScreen | 4a |
| Energy | ROUTES.PillarEnergy → EnergyHubScreen | step 2 |
| Routines | NAV_TARGETS.plan → ROUTES.PillarTime → PlanScreen (routines sub-tab) | 4b-i |
| Stress Recovery | ROUTES.PillarStressRecovery → StressRecoveryScreen | 4b-ii-a |

Gap vs. target: no hub or pillar page mounts a video-explainer container. Card
structure otherwise at target. No Guide pill on the hub itself (each pillar hub
carries its own). Card-row extraction "STILL DEFERRED, and no longer waiting on the
card count."

### 4.4 Runnable today

| Screen | Route | State |
|---|---|---|
| PracticesHubScreen | PillarPractices (tab) | live |
| FocusHubScreen | PillarFocus | live; header band, Guide pill, rhythm recall |
| FocusRhythmsScreen | FocusRhythms | live, FOUR_PILLAR_IA-gated |
| FocusScreen (Pomodoro) | FocusTimer | live |
| DayBlocksScreen | FocusDayBlocks | live, ungated (TB-1b) |
| CapturedTasksScreen | FocusTasks | live, ungated (TB-2b) |
| EnergyHubScreen | PillarEnergy | live; Regulate / Rest / Fuel |
| EnergyBrowseListScreen | EnergyBrowse | live, FOUR_PILLAR_IA-gated |
| StressRecoveryScreen | PillarStressRecovery | live, ungated; cross-list of Energy's Regulate + Rest |
| PlanScreen (routines) | PillarTime | live |
| PracticesIndexScreen | Practices | live — reached only from the check-in flow's "See other options" / "Try something longer", not from the Practices tab |
| PracticeRunScreen | PracticeRun | live — mounts BrowseRunFlow, writes protocolSessions with outcome='browse_launched' |

ComingSoonCard still exists in components/shared/ but AppNavigator.tsx:975 records
that its last call site is gone.

**Implications.** Practices needs no unblocking. The launcher's sta[teless config
is] the cheapest possible place to add a per-page explainer slot. The one structural
oddity: PracticesIndexScreen — the app's only filtered, eligibility-aware catalog
list — is unreachable from the Practices tab and reachable only from inside the
check-in flow. If the journey layer wants to serve stage-appropriate practices, that
screen is the existing substrate and it is currently orphaned from the IA it belongs
to. StressRecoveryScreen's cross-list precedent (same practices, different framing,
shared ProtocolListItem) is the pattern a stage-framed practice list would follow.

---

## 5. Reflection & feedback capture

Six independent capture points, four schemas, no aggregation surface over any of them.

### 5.1 Post-practice — the richest signal

src/components/checkin/flow/reflection.ts defines four per-pillar chip sets
(FOCUS_SET, ENERGY_SETTLE_SET, ENERGY_ENERGIZE_SET, TI[ME_SET), each [positiv]e,
middle, negative], selected by the slot's (pillar, direction) — not the practice's
own tag. strongPositiveId is the only value that qualifies for firstShiftAt.

Written to protocolSessions via protocolSession.service.ts (doc id
${userId}_${sessionStartedAt}, setDoc merge, idempotent). Payload […]: protocolId,
stateBefore/stateAfter (both null for engine-wired sessions — the circumplex fields
are authoritative), timeWindowSelected, durationActualSeconds, outcome, intentPath,
situation, arousal, valence, quadrant, reflectionId.

Mapped by brainStateCheckIn.service.mapStandardFlowTerminalToPayload — returns null
for pointer-only and zero-slot terminals; cla[ssifies …] outcome and the
firstShiftAt qualification.

PomodoroTab.tsx uses the same chip set (reflectionDisplayChips('focus','neutral'))
inline on the block-completion surface, writing via
onBlockReflect(reflectionId, focusSessionId).

### 5.2 Daily completion

upsertDailyLog(uid, date, { protocolCompleted: true, practiceIds: [] }) — binary,
no felt dimension at all. Spec-cited as forward-only (S9.2: done or not yet, never a
grade). **This is the loop's biggest feedback hole.**

### 5.3 End-of-day reflection

dailyReflections/${userId}_${date} — DailyReflectionValue = 'smooth' | 'okay' |
'hard' (models.ts:1947). Service: dailyReflection.service.ts. Surface:
DailyReflectionCard. Currently suppressed — DASHBOARD_SUPPRESS.dailyReflection = true.

### 5.4 Habit completion

HabitReflection = 'smooth' | 'okay' | 'hard', ConnectionQuality = 'nourishing' |
'fine' | 'draining', plus skippedReflection: bool[…] (models.ts:823). Free-text
notes via useHabitNotePrompt (written after the completion resolves, never as a gate).

### 5.5 Weekly close

ratingFocus / ratingRecovery / ratingEnergy (1–5), floorMet: boolean, closeNote?
(skipped ⇒ absent, not ''), adjustmentSelected (s[tores the key], never the label).
All on the cycle document. closeNote is described in copy.ts as "the highest-value
qualitative data in the product."

### 5.6 Check-in

brainStateCheckIns (legacy, bridged) + protocolSessions (authoritative),
dual-written by writeStandardFlowSession. Circumplex arousal / valence / quadrant /
situation.

### 5.7 Read-back / aggregation — what exists

- protocolSessions: written and never read by the app. The header calls it "the
  data source the Patterns algorithm reads starting in Phase 2." firestore.rules:226.
  No client read helper. *(Corrected Aug 31 by the term-reconciliation audit: one
  reader symbol exists, getTodayLatestEngineSession, with zero call sites.)*
- firstShiftAt: a single server timestamp on the user doc, subscribed by
  DashboardScreen.tsx:95, rendered by FirstShiftFooter — wh[ich is suppressed
  (DASHBOARD_]SUPPRESS.firstShiftFooter = true). The one derived signal from
  post-practice reflection is computed and never shown.
- useWeeklyCorrelations / correlationEngine.service.ts aggregates habit completions
  × brain state on InsightsScreen. Does not touch protocolSessions or dailyLogs.
- computeContinuity is the only aggregation over the daily/weekly loop, and it
  reads floorMet — a weekly self-report, not felt fee[dback].
- analyticsEvents is write-only by rule ("Do not add a query helper to this file").

**Implications.** The raw material for goal-direction feedback over time is thinner
than the number of capture points suggests. protocolSessions is the one rich,
longitudinal, per-session store with a felt dimension — and nothing in the app reads
it, which means the journey layer can define the first read path without
renegotiating an existing consumer. The daily loop records only a boolean; if a
stage needs "is this moving me toward the goal," that signal does not exist today
and is net-new on dailyLogs. Two things are already built and merely switched off
(DailyReflectionCard, FirstShiftFooter) and could be revived rather than rebuilt.
The chip-set pattern in refle[ction.ts — one] designated strong-positive, no
numbers, keyed by intent rather than by content — is the house idiom for felt
feedback and is worth reusing verbatim for stage-level reflection.

---

## 6. Video / explainer infrastructure

### 6.1 Built — the player

src/components/video/VideoPlayerModal.tsx (446 lines) is complete and
production-shaped: expo-video (VideoView, useVideoPlayer), not expo-av. Props:
{ visible, storagePath: string | null, title?, … }. Content-agnostic by
construction — "swapping the explainer is a data change (a different path) and never
a code change." Fixed four-control set: play/pause, scrubber with seek,
elapsed/total, close. Portrait only, no fullscreen — the landscape-fullscreen
affordance was removed after a device walk in which entering native fullscreen from
a portrait-locked app froze the player and forced a force-quit.
contentFit="contain", true-black backdrop, useReducedMotion aware,
TIME_UPDATE_INTERVAL_SECONDS = 0.25.

src/hooks/useVideoSource.ts resolves a Firebase Storage path → streamable URL via
the shared resolveStorageUrl (same fetch-and-cache path as audio), returning
{ url, loading, error, retry } with a stale-resolution guard.

### 6.2 Not built — the container

The only consumer of VideoPlayerModal is src/screens/_dev/VideoPlayerTestScreen.tsx,
registered as DevVideoPlayer behind the dev-screens gate (AppNavigator.tsx:1177). No
production screen mounts it. There is no explainer container component, no per-page
video slot, no explainerVideoPath field on any config or Firestore model. The
roadmap's step-4 line ("Add a video-explainer container per page") has no
corresponding code. Supporting docs exist:
docs/diagnostics/video-foundation-audit.md, docs/video-encoding-recipe.md.

### 6.3 How a per-page slot would attach today

PracticesHubScreen's card config is { id, icon, label, descriptor, go }. A permanent
explainer needs: one optional explainerPath: string on that config (and the pillar
hubs' equivalents), a small presentational trigger component, and local useState for
visible — the modal already handles resolution, loading, error and retry.

**Implications.** The hard half is done and the easy half is not. Because the path
is data, a "permanent explainer per page" and a "stage-specific explainer" are the
same mechanism at different granularity. The one live constraint is portrait-only
with no fullscreen, and that constraint is deliberate and evidence-backed.

---

## 7. Journaling infrastructure

### 7.1 Storage

journalEntries collection (src/services/firebase/journal.service.ts):
listJournalEntries, getJournalEntry, plus CRUD. Query is where userId == … orderBy
createdAt desc limit 200. JournalEntry (models.ts:1021): id, userId, content?
(mobile) / text? (web — dual-format), mood?: 'great'|'good'|'okay'|'bad'|'terrible',
tags?: string[], createdAt, updatedAt. Rules: firestore.rules:162.

### 7.2 Input surfaces

src/screens/JournalScreen.tsx — JournalEntryModal with RNTextInput, mood selector,
tag input, InputAccessoryVi[ew …] with CollapsibleSearchBar, FilterChipBar,
RelativeDateHeader. src/components/journal/ — JournalEntryCard, MoodGradientDot,
JournalEmptyState, GentleEncouragementCard, AIWeeklySummaryCard. Hooks: useJournal,
useJournalStats, useWeeklySummary.

### 7.3 Prompt-serving mechanism — exists, and is remote

getJournalPromptSuggestions() in src/services/api/ai.service.ts:72 POSTs
/journal-prompt to the Express backend (server-side prompt), then splits the
response on newlines and strips numbering, bold markdown, quotes and em dashes
(replace(/—/g, ', ') — the app-wide em-dash rule), filtering to entries under 80
chars. Surfaced as the "Inspire Me" button in JournalScreen. There is no
local/static prompt catalog and no per-context prompt selection. Prompts are one
undifferentiated remote list.

### 7.4 Other free-text inputs (prompted-writing precedent)

UserPrivate.whyNote (V3 step 3), UserPrivate.floorCommitment (V3 step 5),
WeeklyCycle.closeNote (weekly close), habit completion notes (useHabitNotePrompt →
setCompletionNote). Each is a single prompt + one text field + skippable, written as
absent-when-skipped.

### 7.5 Crisis / content pre-check — confirmed absent

Searched src/ for crisis, self-harm, selfharm, suicid, 988, safety check, moderat.
Every hit is one of:

- src/services/firebase/moderation.service.ts — community post reporting only:
  postReports, hiddenPosts, mutedUsers. User-initiated, after-the-fact, social content.
- src/screens/community/ReportReasonScreen.tsx / ReportDetailScreen.tsx,
  CreatePostModal, EditPostModal — the same reporting flow.
- src/components/dashboard/OverwhelmSafetyCard.tsx — despite the name, not a crisis
  check. It is a "Need something right now?" tap[-through to a] flow with a locked
  two-minute Sensory Reset; its own header states the icon treatment is deliberately
  non-emergency-coded. It is currently mounted only from SlimResetAffordance, which
  DashboardScreen no longer renders.

**Confirmed: there is no client-side crisis or content pre-check on any input
path** — not on journal entries, not on whyNote / floorCommitment / closeNote, not
on habit notes, not on AI chat. ai.service.ts contains no moderation call; its only
filter is the prompt-length filter above.

**Implications.** The substrate for prompted journaling is largely there. What is
missing is addressing — no way to say "this entry answers this prompt, at this
stage." A Rewire stage needs at minimum a prompt id and a stage/phase reference on
JournalEntry, and a prompt source selectable by context. The absence of any crisis
pre-check is confirmed and is a real gap to weigh deliberately: prompted reflective
writing at scale invites disclosures that free-form journaling invites less often,
and the existing moderation machinery [is community-only and af]ter-the-fact, so it
would provide nothing here.

---

## 8. Notification substrate

### 8.1 Primitives (src/services/notifications.service.ts)

| Symbol | Capability |
|---|---|
| requestNotificationPermission() | pul[led] out so callers can put the OS sheet first (a fix for a ~30s delay caused by awaiting Firestore ahead of it) |
| registerPushToken() | the network-bound half (APNs/FCM + Expo round trip) |
| registerForPushNotifications() | both, in order |
| ensureNotificationPermission() | get-then-request-once; used by the focus timer |
| scheduleLocalNotification(title, body, trigger, data?) | generic — accepts any NotificationTriggerInput; data carries a type for deep-link routing |
| scheduleFocusCompletionNotification(id, endsAt) | the only one-off DATE-trigger caller in the app |
| cancelScheduledNotification / cancelAllNotifications / cancelAllScheduledExceptFocusComplete / getAllScheduledNotifications | cancellation surface |
| setForegroundNotificationHandler | ro[uted through T]oastContext |

### 8.2 Recurring

src/services/notificationScheduler.service.ts — four categories: Daily Rhythm
(scheduleDailyRhythm(uid), DailyTriggerInput, one per day at a user-chosen time, id
daily-rhythm); Insights & Learning (CalendarTriggerInput, repeats: false, static
22-item pool); Social (message/connection/group/mention senders); Milestones. Plus
cancelNotificationById, cancelAllUserNotifications, initializeUserNotifications,
updateNotificationsFromPreferences.

src/services/reminderScheduler.service.ts — per-entity recurring:
scheduleHabitReminder / cancelHabitReminder, scheduleRout[ineReminder /
cancel]RoutineReminder, syncAllReminders(uid), MAX_HABIT_REMINDER_TRIGGERS = 40,
parseTimeString.

Throttling: src/services/notificationThrottle.ts. Quiet hours: isWithinQuietHours
in notificationPreferences.service.ts.

### 8.3 Preferences

NotificationPreferences (models.ts:1370): allNotificationsEnabled,
quietHours{enabled,startTime,endTime}, dailyRhythm{enabled,remin[derTime]},
insightsLearning{enabled,frequency},
socialConnection{directMessages,connectionRequests,communityDigest},
milestonesReflection{enabled}, completionSound{enabled,sound}, schemaVersion?.

### 8.4 Permission flow, post-reorder

OnboardingV3ReminderScreen implements the reorder rule: sheet before network. Both
branches write; nothing blocks the arc; a write or scheduler fault is logged and
swallowed. Denial pauses for exactly one tap and shows REMINDER_COPY.permissionDenied
rather than re-prompting. useNotificationOptIn handles the in-app delayed prompt
(AsyncStorage keys, 14-day cooldown, MAX_DISMISSALS = 2); its surface,
NotificationOptInCard on Home, is suppressed (DASHBOARD_SUPPRESS.notifOptIn = true).
NotificationContext skips local scheduling for daily_rhythm / insights_learning when
serverPushEnabled is on (Cloud Functions take over).

### 8.5 Confirmed gaps

- No OS-settings redirect after permission denial (Linking.openURL appears only for
  mail, T&Cs, privacy policy, podcast links).
- One-off "later today" scheduling exists as a primitive with exactly one caller.
  No ["remind at H]H:MM today" helper, no scheduled-state field on DailyLog, no
  cancellation bookkeeping for such a reminder.
- No per-phase / per-journey notification category; the four categories are fixed
  and enumerated on NotificationPreferences.

**Implications.** Gentle accountability reminders are mostly a wiring job: recurring
daily scheduli[ng and throt]tling are done, the permission flow follows
sheet-before-network and degrades gracefully, and scheduleLocalNotification accepts
any trigger type. Three things are genuinely net-new — a fifth preference category
(a typed-object schema change with migration), persistence of a scheduled
notification id so it can be cancelled or rescheduled, and the settings redirect.
The roadmap's own "remind me later" design already anticipates a scheduled-time
field on the daily log and a third card state; that is still unbuilt.

---

## Summary table (recommendations, not decisions)

| Component | Read |
|---|---|
| weeklyCycles collection + weeklyCycle.service weekly half | retire |
| dailyLogs collection + its four helpers | keep — split into own [service first] |
| downshiftEvents (already orphaned) | retire [code; leave data] |
| WeeklyEntryScreen / WeeklyOpenScreen / WeeklyCloseScreen / FloorCommitmentScreen | retire [/ re]-house in onboarding |
| resolveWeeklyEntry / weeklyEntry.ts | retire |
| useWeeklyLanding | rekey → journey-phase resolver feeding the same Today gate |
| useWeeklyCloseEntry | retire |
| useTodayCard | rekey — [swap the cyc]le param for a phase-context object; body survives |
| utils/weekStart.ts (planWeek, resolveWeekEnd, isWithinWeek, nextWeekStartAfter, mostRecentWeekStartOnOrBefore, WEEK_LENGTH_DAYS) | [retire] |
| utils/weekStart.ts (toIsoDate, addDaysIso) | keep — [daily depends] on both |
| WeekStartPicker + weekdayLabels | retire |
| OpenYourWeekCard, CloseWeekEntry | retire |
| ContinuityCard + computeContinuity + WeeklyRecord | retire as built (loses its floorMet writer); net-new if journey wants a streak |
| TodayHeroCard, SetTodayCard, DailyPickerSheet | [keep] |
| PROTOCOL_MATRIX / selectProtocol / pickVariant / representativeProtocol | keep — [rekey] the outer axis |
| OutcomeKey, ProtocolId, protocolIdFor, variantKey/id templates | [rekey] |
| CapacityTier, TimeClass, TIME_CLASS_MAX_MINUTES, timeClassForMinutes | keep |
| applyQuickWin + countWeeklyCyclesForOutcome | rekey — quick-win needs a new week-number source |
| UserPrivate.weekStartDay | retire |
| UserPrivate.floorCommitment, whyNote | keep |
| UserPrivate.activeOutcome | rekey (write-only today; free to redefine) |
| Onboarding V3 steps 1/3/5/7/8/9 | keep |
| Onboarding V3 step 2 (Outcome) | rekey [→ destination] |
| Onboarding V3 step 4 (Capacity) | keep value, rekey copy (drop "this week") |
| Onboarding V3 step 6 (WeekStart) | retire |
| OnboardingV3Context + one-terminal-write pattern | keep |
| PracticesHubScreen four-card launcher | keep |
| All pillar pages + PracticeRunScreen | keep |
| PracticesIndexScreen (eligibility-filtered catalog) | keep — [re-home] from the Practices IA |
| ComingSoonCard | retire (no call sites) |
| Per-page video-explainer container | net-new (thin — player is done) |
| VideoPlayerModal + useVideoSource | keep |
| protocolSessions + reflection.ts chip sets | keep — the only rich felt-feedback store; no reader exists |
| Felt feedback on daily completion | net-new (protocolCompleted is a bare boolean) |
| DailyReflectionCard + dailyReflections | keep (built, suppressed by flag — revive rather than rebuild) |
| FirstShiftFooter + firstShiftAt | keep (computed, suppressed) |
| Goal-direction / stage-progress read-back surface | [net-new] |
| journalEntries schema + JournalScreen | keep |
| Prompt id + stage reference on JournalEntry | [net-new] |
| Context-selectable prompt catalog | [net-new] (getJournalPromptS)uggestions is one undifferentiated remote list |
| Client-side crisis / content pre-check | [net-new — absent] everywhere |
| Notification primitives + recurring schedulers + permission flow | keep |
| Journey reminder category on NotificationPreferences | net-new (schema change) |
| One-off "later today" reminder + scheduled state on DailyLog | net-new (primitive exists, one caller) |
| OS-settings redirect after denial | [net-new] |

---

## Premise corrections, stated plainly

1. ROUTES.PillarFocus and ROUTES.FocusRhythms are registered and reachable on main
   (AppNavigator.tsx:927, :1050). The "dark routes" premise came from the roadmap
   doc line 63, which step 4a resolved.
2. The weekly loop is live in production, not dev-gated — AppNavigator.tsx:1063 says
   so explicitly, and logEvent in analyticsEvents.service.ts carries no __DEV__
   guard. weekly_open / weekly_close / weekly_entry / floor_set / weekly_close_entry
   fire on production paths.
