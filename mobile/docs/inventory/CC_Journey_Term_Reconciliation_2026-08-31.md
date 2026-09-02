# CC Journey Term Reconciliation — Aug 31, 2026
**Read-only audit mapping the construct names in Jen's Journey Architecture document
(Aug 31) to repo symbols on main. Transcribed from the CC terminal report; cells
clipped by terminal width in the capture are marked […]. Purpose: both Claude
instances (Jen's spec-side, Kyle's repo-side) read this as the shared "what exists
on main" baseline.**

---

## Term-by-term audit

| Term | Status | Evidence / nearest analog |
|---|---|---|
| Onboarding V4 | **Absent** | Zero hits for V4/version 4 across *.ts/*.tsx/*.md repo-wide. No branch (local or origin/*) contains "v4". No flag. Live ladder is ONBOARDING_V2 = true / ONBOARDING_V3 = true (src/constants/dashboardConfig.ts:7,22), V3 taking precedence in AppNavigator.tsx:202. Nearest analog: the V3 arc (src/screens/onboarding/v3/). |
| Foundation Week | **Absent** | Zero hits for foundation.?week / foundationWeek in code or docs. Nearest analog: the first weekly cycle's stub week in src/screens/weekly/ (WeeklyOpenScreen.tsx + FloorCommitmentScreen.tsx) — a floor commitment, not a named onboarding week. |
| Weekly Reset | **Absent as a named construct; partial as a mechanic** | No WeeklyReset symbol anywhere. The weekly loop that exists is open / close: src/screens/weekly/WeeklyOpenScreen.tsx, WeeklyCloseScreen.tsx, weeklyEntry.ts, weeklyContinuity.ts:loadWeeklyContinuity. The only "reset" symbols in the app are an unrelated 2-minute regulation affordance: src/components/dashboard/SlimResetAffordance.tsx, OverwhelmSafetyCard.tsx. |
| Screens "C2" and "C5" | **Absent** | No C2/C5 identifier in src/ or docs/. Spec-level labels with no repo counterpart. (The one "C2" in project memory is a copy-workstream label on the Journal rewrite, not a screen id — do not treat it as a match.) |
| the return protocol | **Absent** | No returnProtocol / return.?protocol / re-entry / lapse symbol. Nearest analogs, both weaker: weeklyContinuity.ts (counts an unbroken run, breaks on first missed floorMet — measures return, does not drive one), and RecoveryConfirmStepView.tsx:17 ("Session restored" / "Welcome back") which restores an interrupted session, not a returning user. |
| the step-down | **Absent by name; partial as behavior** | No stepDown/step-down symbol. Nearest analog: the mandatory-lead degrade ladder in src/engine/resolve.ts:145-160: widen to any practice of the direction within budget → relax the budget cap and serve the shortest → drop. Unnamed, internal to resolve, not a surf[ace]. |
| the regulation cue | **Absent by name; partial as content** | No regulationCue symbol. regulate exists only as a browse category on protocols (src/constants/brainStateProtocols.ts:32,204,257,302,513 browseCategory: 'regulate'; label at src/screens/Energy/EnergyBrowseListScreen.tsx:32). Nearest cu[e affordances: SlimReset]Affordance.tsx ("Need a reset right now?") and OverwhelmSafetyCard.tsx. Neither is a parameterized cue. |
| the after-check | **Absent by name; partial as data** | No afterCheck/after-check symbol. The mechanic exists as stateAfter: src/components/checkin/flow/browseRunReducer.ts:106-107 (stateAfter, classifyOutcome(ctx.state, action.stateAfter)), BrowseRunFlow.tsx:306-307, and the onboarding re-check screen src/screens/onboarding/OnboardingRecheckScreen.tsx. Named "re-check", not "after-check". |
| min_effective_minutes | **Absent** | Zero hits for min_effective_minutes, minEffectiveMinutes, or min.?effective. Nearest analog: the budget/length classing in src/engine/lengthClass.ts + the budgetClass argument threaded through resolve.ts:135. That is a ceiling (what fits the time), not a [floor]. |
| practice substitution | **Absent — and explicitly rejected in code** | src/engine/resolve.ts:140-142 reads: *"Offered slot that can'[t be filled: d]o NOT substitute."* For mandatory leads the code degrades within the same direction (see step-down row) rather than substituting across. This is a deliberate design position in the repo, not a gap. |
| the observation library | **Absent** | Zero hits for observation.?library / observationLibrary. Every Observation hit in src/ is a code-comment reference to numbered QA findings from sub-step 2.7 (e.g. useDashboard.ts:283), not a construct. No such service in src/services/firebase/ (nearest by shape: journal.service.ts, dailyReflection.service.ts). |
| reframe layer in Insights, 15-session evidence bar | **Absent** | No reframe symbol in src/components/insights/* or src/screens/InsightsScreen.tsx. No 15-session gate: no MIN_SESSIONS, EVIDENCE_*, or evidenceBar anywhere; the only "15" in a threshold context is wellnessScore.service.ts:654 (contribution < 15, unrelated). Insights today is HeroSummaryCard / NarrativeRecap / CorrelationInsightCard / SparklineTrendCard / HabitHeatmap / EmptyStateCard. The one "reframe" in the codebase is an engine message (engine/__tests__/resolve.test.ts:404), not an Insights layer. |
| any reader of protocolSessions | **Expectation NOT confirmed — one reader exists, uncalled** | src/services/firebase/protocolSession.service.ts:156 getTodayLatestEngineSession runs a real query/getDocs against collection(db, 'protocolSessions') (:162-169). It has zero call sites — the only two other occurrences of its name in src/ are its own definition and it[s export. No behavior-alter]ing consuming reader, but the "no reader" claim is false at symbol level. Every other reference is a write (writeProtocolSession, callers in BrowseRunFlow.tsx:153, FocusScreen.tsx:152, OnboardingRecheckScreen.tsx:99, brainStateCheckIn.service.ts:664) or a comment. |
| OUTCOME_LABELS as a (phase, destination) lookup | **Partial — exists, but single-key, not a pair** | src/screens/weekly/copy.ts:60-65: a flat as const object keyed by the four OutcomeKey members (focus/stress/routines/energy) → display strings. Consumers index it with one key: TodayHeroCard.tsx:135, CloseWeekEntry.tsx:60. The key union is src/protocolEngine/types.ts:31 + protocolMatrix.ts:264 OUTCOME_KEYS. There is no phase dimension and no destination dimension — the proposed (phase, destination) lookup would be a new shape, not an extension. Sibling copy maps ([CAPACIT]Y_LABELS, CAPACITY_GLOSSES, TIME_LABELS, TIME_GLOSSES) follow the same single-key pattern. |

---

## Focus subtree gating

FocusTimer, FocusDayBlocks, and FocusTasks are gated by **nothing at the navigator
level** — not even FOUR_PILLAR_IA. All th[ree are registered uncondition]ally in
AppNavigator.tsx (:641, :962, :982), outside the only two `{FOUR_PILLAR_IA && (`
blocks in the file (:1026 EnergyBrowse, :1048 FocusRhythms). FocusRhythms is
flag-gated; those three are not. routes.ts:82-92 states the rationale explicitly —
their only parents exist solely in the four-tab IA, so the gate would be dead code.
Reachability, not a flag, is the control.

None of the four Focus screens (FocusHubScreen, FocusScreen, DayBlocksScreen,
CapturedTasksScreen) contains any subscription, entitlement, paywall, or
featureUnlock check.

One gate does sit above them, app-wide rather than Focus-specific:
AppNavigator.tsx:1439-1443 renders <PaywallNavigator /> instead of the whole
authenticated stack when subscriptionStatus?.canAccessApp is falsy. That reaches
Focus the same way it reaches every other screen.

---

## Spec-only terms

Nine of the thirteen terms appear to be **spec-only** — present in Jen's document
with no repo counterpart at all: Onboarding V4, Foundation Week, Weekly Reset (as a
named construct), C2 / C5, the return protocol, the observation library,
min_effective_minutes, the reframe layer with a 15-session evidence bar, and
practice substitution.

Three more are spec names over mechanics that exist under different names and should
not be read as either present or absent without translation: the step-down → the
unnamed degrade ladder in resolve.ts; the after-check → stateAfter / "re-check";
the regulation cue → the regulate browse category plus two reset affordances.
OUTC[OME_LABELS is the right sh]ape one dimension short of the proposal.

**Two findings cut against stated expectations and are worth flagging to Jen
directly:** practice substitution is not me[rely absent — the engine] rejects it in
a code comment, so a spec that assumes substitution contradicts a live design
decision; and protocolSessions does have a reader symbol
(getTodayLatestEngineSession), currently uncalled, so "no readers" holds for
behavior but not for the codebase. Nothing here speaks to deploy state.
