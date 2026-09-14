# Design Backlog

UI/design refinement items deferred from the current sprint. Separate
from `TECH_DEBT_BACKLOG.md` (which tracks code/architecture debt) —
this file is for **visual / interaction / copy refinements** that
need a design pass before implementation.

Items here have either (a) been spec'd at mockup level but deferred
to focus on launch-blockers, or (b) been flagged during device
verification as polish opportunities, or (c) raised architectural
questions that need an investigation before implementation can begin.

Last updated: 2026-09-13

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

---

## 7. Placeholders with no colour fall through to the platform default

**Source:** R1b-i device walk, 2026-09-13 (Kyle, debt item b).

**The note said two Journal strings. It is 34, across 16 files.**
`JournalScreen.tsx:275` ("Write your thoughts or use voice input...")
and `:296` ("Add a tag") set no `placeholderTextColor`, so React
Native falls back to the platform default — on iOS
`rgba(60,60,67,0.3)`, which composites to about `#C1C1C0` over the
Mist White ground and measures **1.72:1**. Well below AA, and not a
token, which is why R1b-i did not touch it.

Counting every input that renders a `placeholder` and never sets
`placeholderTextColor` gives **34 sites in 16 files**:

```
5  screens/community/ChallengesScreen.tsx
5  components/community/CreateChallengeFromGroupModal.tsx
4  components/onboarding/FirstActionCard.tsx
3  screens/JournalScreen.tsx
3  screens/HabitDetailScreen.tsx
3  components/habits/wizard/ScalingStep.tsx
2  components/habits/SimpleHabitCreateScreen.tsx
1  each: ProfileScreen, community/GroupsScreen,
   community/CommunityScreen, habits/wizard/TriggerStep,
   habits/wizard/ReviewStep, habits/wizard/IdentityStep,
   habits/wizard/ActionStep, community/CreatePostModal,
   brain/AMCCChallengeCard
```

**This is why R1b-i's walk step 10 passed and this is still true.**
Step 10 walked five placeholders — Community, Groups and People
search, Capture, Add-a-block — and all five set
`placeholderTextColor={Colors.mutedSageGray}` explicitly. The two
sets do not overlap. 52 sites set it; these 34 do not.

**Scope:** decide whether the shared `TextInput` primitive
(`components/shared/TextInput.tsx`) should default
`placeholderTextColor` to the helper-text token, which would close
all 34 at once, or whether each site sets it. The primitive already
resolves `fontFamily` centrally and its header notes that
`placeholderTextColor` "appears at 51 sites. That is unrelated and
untouched" — this item is the decision that comment defers.

**Priority:** Accessibility. Ahead of cosmetic items; it is an AA
failure on every unlabelled input in the app.

---

## 8. "Clear" and "Remove" are filled buttons where 10.1 says tertiary

**Source:** R1b-i device walk, 2026-09-13 (Kyle, debt item d).

**Citation correction first:** the walk note cites §7.1. There is no
§7.1 — §7 is Iconography and has no subsections. The governing rule
is **§10.1's tertiary clause**: "no fill, Teal text, 40 tall with hit
slop to 48. For skip, cancel, 'Maybe later,' and adjust actions.
Destructive tertiary buttons use Soft Charcoal text, not Coral."

**Two buttons, not one, because they are the same shape:**

- `screens/Focus/CaptureTaskSheet.tsx:339` `clearButton` — a Clear
  action, which is a cancel-family action under 10.1.
- `screens/Focus/AddBlockSheet.tsx:799` `removeButton` — a
  destructive action, which 10.1 routes to tertiary with a Soft
  Charcoal label.

Both are `backgroundColor: Colors.mutedSageGray` with a White 16pt
semibold label and `minHeight: MIN_TOUCH_TARGET`.

**Note the interaction with R1b-i.** That slice darkened both fills
to fix a 4.22:1 White-on-grey label, and walk steps 5 and 6 confirmed
the result reads correctly. **If this item is actioned, the fill R1b-i
fixed stops existing.** The two are not independent: do this one
before spending more effort on the fill.

`blocksBrandGuard.test.ts:83` pins `AddBlockSheet`'s remove button to
`Colors.mutedSageGray` by token name, so it will need updating with
the style — that test exists to keep Soft Coral off routine controls,
and a tertiary Soft Charcoal label still satisfies its intent.

**Priority:** Design decision, then a small change. Bundle with any
Focus-sheet pass.

---

## 9. Empty-state glyphs carry a text colour at display size

**Source:** R1b-i device walk, 2026-09-13 (Kyle, debt item e).
Walk step 18 passed for chevrons and menus and flagged this.

**Measured after the walk: the People glyph is `size={64}`, not the
48 the note records.** `screens/community/PeopleScreen.tsx:465`.

Six empty-state glyphs render at 48 or 64 in a colour chosen for
14pt helper text:

```
screens/community/PeopleScreen.tsx:465          64  mutedSageGray
screens/ConversationsScreen.tsx:368             48  mutedSageGray
components/messaging/EmptyState.tsx:30          48  mutedSageGray
screens/community/MessagesScreen.tsx:277        48  textSecondary
components/brain/WeeklyBrainMetricsChart.tsx:209 48 textSecondary
screens/Time/ActiveRoutinePlayer.tsx:418        48  ColorTokens
                                                    .textSecondary
```

A 64px glyph at the helper-text value is a different decision from a
14pt caption at the same value: the colour was picked to sit quietly
behind body copy, and at display size it reads as weight rather than
as quiet. R1b-i darkened all six together, which is what made it
visible.

**Scope:** an empty-state icon colour — lighter than the helper-text
token, or the same token at a reduced opacity. Non-text contrast
floor is 3:1 (16), which both the old and new values clear, so this
is a hierarchy decision and not an accessibility one.

**Priority:** Cosmetic. Bundle with the empty-state pass.

---

## 10. Add-a-block sheet sits inside the top safe-area inset

**Source:** R1b-i device walk, 2026-09-13 (Kyle, debt item f).

**The note asks to check the SE. The SE is the better case.**

`screens/Focus/AddBlockSheet.tsx:378` passes
`maxHeightPercent={0.98}` where `EnhancedModal` defaults to `0.92`.
The override is deliberate and its reason is in the comment above it:
fitting a sixth row (Remove) below the five without reintroducing a
scroll. The shell caps height at `screenHeight * maxHeightPercent`,
so the top gap is `screenHeight * (1 - maxHeightPercent)`:

| Device | 0.92 top gap | 0.98 top gap | Top inset | At 0.98 |
|---|---|---|---|---|
| iPhone SE (3rd gen), 667pt | 53.4pt | 13.3pt | 20pt status bar | **6.7pt inside** |
| **iPhone 14 Plus, 926pt — WALKED** | 74.1pt | 18.5pt | 47pt notch | **28.5pt inside** |
| iPhone 16 Pro Max, 932pt | 74.6pt | 18.6pt | 59pt Dynamic Island | **40.4pt inside** |

The shell's header adds `paddingTop: Spacing.lg` (24pt), which covers
the SE's 6.7pt overlap and covers neither of the other two.

**The walked device was an iPhone 14 Plus** — a notch device at 47pt,
not a Dynamic Island device at 59pt. It sits between the two matrix
entries, and 28.5pt against 24pt of header padding is exactly why the
title read tight. **The binding case is still the 16 Pro Max at
40.4pt, and it has not been walked**, so the worst instance of this
item is measured rather than observed.

This is a §18(c) safe-area failure with a stated trade-off behind it,
not an oversight. **Any fix has to keep the sixth row reachable** —
returning to 0.92 without addressing content height puts the scroll
back, which is what the override existed to remove. Options: clamp
against `insets.top` rather than a flat percentage, or let the sheet
scroll and keep the cap.

**Priority:** Accessibility / safe areas. Ahead of the cosmetic items.

---

## 11. Two adjacent warm chips on the routine list

**Source:** R1b-i device walk, 2026-09-13 (Kyle, debt item g).

§4.2: warm accents "stay at or under 10 to 15% of the visual field"
and "never sit adjacent to each other." §2.2 is the one-warm-point
rule.

`screens/Time/components/activityColors.ts:38-42` maps **four**
legacy colour names — `orange`, `yellow`, `amber`, `brown` — onto
`ActivityColors.apricot` (Golden Apricot `#F5B971`).
`ActivityListItem.tsx:58-59` renders each activity's icon in that
colour on a 0.15-alpha fill of it. **Two adjacent activities drawn
from any of those four names therefore produce two adjacent warm
chips** on the Time routine list.

The four-to-one collapse is why this is easy to hit rather than rare:
the map was written to get blue and red off the palette, and it
funnelled every warm legacy name into one accent without a rule about
adjacency.

**Scope:** either the list enforces separation (no two warm chips in
sequence), or fewer legacy names map to apricot, or the accent moves
off the icon chip entirely. The neutral fallback in the same map,
`gray: ColorTokens.textSecondary`, moved with R1b-i and is unaffected
by this item.

**Priority:** Cosmetic, Time surface. Bundle with the routine-list
pass.

---

## 12. Four files hardcode rgba values that are now tokens

**Source:** R1d Step 0, 2026-09-13 (old-value sweep, preamble rule b).

R1d made `ColorTokens` an alias of `Colors`, which normalised four
rgba strings that had been written two ways. The sweep for the old
spellings found four files that do not use either token and carry
the literal instead:

```
components/community/PostOverflowSheet.tsx:217  rgba(213, 227, 209, 0.5)
components/events/EventCodeCard.tsx:45          rgba(213, 227, 209, 0.5)
screens/ConversationsScreen.tsx:638             rgba(184, 205, 186, 0.5)
screens/discover/BreathworkScreen.tsx:993       rgba(27, 94, 87, 0.08)
```

Their tokens are `Colors.dewSageLight`, `Colors.textDisabled` and
`Colors.tealLight` respectively. All four render correctly today;
this is not a visual defect.

**Why it is worth a row rather than a drive-by fix.** These are the
exact values R1d just proved can fork silently — same colour, two
spellings, equal on screen and unequal to `===`. A literal copy is
how the `ColorTokens` fork started. The lint rule does not catch
them: `no-restricted-syntax` bars raw **hex**, and these are `rgba()`
function calls, so nothing in the build notices.

**Scope:** point each at its token. Four one-line edits, no rendered
change. Check whether the rgba blind spot in the hex rule is worth
closing at the same time — Step 0 did not survey how many other
rgba literals exist, and that survey is step 0 of this item.

**Priority:** Low, but it grows. Bundle with any pass touching those
files, or with the `colors.ts` internal-alias item under 4.1.

### UPDATE, R2 (2026-09-14): the blind spot is now a fifth value, and the survey is still not done

R2 added `Colors.tabBarTranslucent` = `rgba(250,250,246,0.35)`, the
floating tab bar's warm overlay. It is declared once, in `colors.ts`,
aliased into `ColorTokens`, and pinned by three assertions in
`designTokenAliases.test.ts` — including one that reads `colors.ts` and
requires the literal to appear exactly once, the same mechanism Muted
Sage Gray uses.

**It is correct, and it is also proof that the guard is a test and not a
lint rule.** Had it been inlined into `AppNavigator.tsx`,
`no-restricted-syntax` would not have said a word: the rule bars raw
**hex** and this is an `rgba()` call. The only thing standing between
this value and a silent fork is a hand-written assertion someone
remembered to add.

**The survey named as step 0 of this item has still not been run.** Nobody
has counted how many `rgba()` literals exist across `src/`. Until that
number exists, "four files" in the heading is what one sweep happened to
find, not a census — and every new alpha token added between now and then
widens the gap.

**Scope grows by one line:** when this is taken up, extend
`no-restricted-syntax` to catch `rgba(`/`rgb(` string literals outside the
four exempt palette files, or say in writing why it should not.

---

## 13. Two timer sizes ship and the standards recorded one

**Source:** R1d Step 0, 2026-09-13. Recorded in UI Standards 5.2 and
3.3 at R1d; **deferred to the Focus surface slice, which owns
`PomodoroTab`.**

`ActiveRoutinePlayer` renders its timer at **48**, via
`TypographyTokens.fontTimerPlayer`, an alias of the canonical
`Typography.fontSize.timer`. `PomodoroTab` renders its timer at
**52**, via `TypographyTokens.fontTimerLarge`, which has no canonical
counterpart and is a declaration for that reason.

5.2's Timer row said 48 flat, so a reader sizing a third timer
against the document would have matched one of the two shipping
timers by accident.

**Why R1d did not resolve it.** Collapsing 52 onto 48 is a rendered
change on a live screen, which a substitution slice does not get to
make, and the reverse — promoting 52 into `typography.ts` — is a
scale addition that assumes the answer. Both directions are design
decisions, not de-duplication.

**Scope:** decide whether the Pomodoro timer is deliberately the
larger of the two. If yes, `fontSize.timerLarge` joins
`typography.ts` and 3.3 in the same commit and `fontTimerLarge`
becomes an alias. If no, `PomodoroTab` moves to 48 and the
declaration is deleted. Either way the walk step is the Pomodoro
timer at default and 1.3x type, since 52 and 48 differ most under
scaling.

**Priority:** Focus surface slice. Not cosmetic-only: it is the last
non-alias in `designTokens.ts` that exists because of drift rather
than because the scale lacks a key.
