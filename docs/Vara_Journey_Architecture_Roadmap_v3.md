# Vara — Journey Architecture & Build Roadmap
**Version 3.0 | September 1, 2026 | Source of truth for the journey build**

**Supersedes** `Vara_Today_IA_Restructure_Roadmap_v2.md` on IA, tabs, the Today surface, the
weekly loop, and phase/capacity semantics. Supersedes `Vara_Refactor_Plan.md` §3 (IA), §4 (core
loop first-run), §5 (onboarding quest), and §7 (pillar inventory). Everything either document says
about tokens, voice, guardrails, and engine separation still holds. Where this document and Jen's
*Journey Architecture* (Aug 31) differ, this document reflects the Sept 1 resolutions and is the
build reference; her document remains the framework reference.

Status tags: **[Done]** merged to main · **[Next]** active slice · **[Queued]** specced, not
started · **[Content-gated]** blocked on Jen · **[Kyle-gated]** blocked on a ledger item ·
**[Post-beta]** out of this build.

---

## 1. The model (paste-stable statement)

The onboarding pick becomes the **destination**: `focus | calm | routines | energy`. The journey
is four **phases** in fixed order, `remove | recover | rewire | refocus`, always displayed in the
user's destination language via a `(phase, destination)` lookup; the framework words never appear
in UI. **Every practice is runnable at all times.** Phase state controls what Today serves and what
the map emphasizes; it never blocks a tool.

The **daily capacity loop is untouched** and is the behavior instrument. The **weekly reset
survives**, loses the outcome pick and ratings, and becomes the phase check-in: the felt instrument.

**Advancement** is offered when cumulative consistent days in the phase reach **8**, or **14**
calendar days pass, whichever comes first. Never automatic. Always skippable forward by the user.
**Adjustment** is offered after **two consecutive** weekly reads of "not moving"; constrained choice
inside the phase first, moving on second, staying third.

**No counter is ever visible.** Practices tab is the journey map: vertical stack, destination
titles, visible state labels (DONE / WHERE YOU ARE / AHEAD / SKIPPED), one-line gloss, Start here
collapsing after first play. Today gains a quiet journey line, a collapsing Start here, and moments
of joy below the fold (one tap, never counted back). Reframe layer, Insights data view, referral,
aging photo: post-beta. The daily goal chip (mockup v1) does not exist.

Mockups: `Vara_Journey_Mockups_v2.html` (frames A1, A2, B1, B2, C1, C2, D1).

---

## 2. What the audits established (baseline, not opinion)

From the two CC read-only reports (Aug 31):

- The weekly loop is **14 files plus one mixed service**; the daily loop depends on it through
  **four scalar reads** on `WeeklyCycle` and **one count query** (`countWeeklyCyclesForOutcome`).
- `dailyLogs` is keyed `${userId}_${date}` with **no cycle reference**. It survives untouched.
- `PROTOCOL_MATRIX` is a pure `Record<OutcomeKey, Record<CapacityTier, ProtocolVariant[]>>`;
  re-keying the outer axis touches two string templates and one persisted field
  (`WeeklyCycle.protocolId`) that is itself being dropped.
- `UserPrivate.activeOutcome` is **write-only**. Free to redefine as `destination`.
- Focus screens (`FocusTimer`, `FocusDayBlocks`, `FocusTasks`) are gated by **nothing but the
  paywall**. No work needed to keep them runnable.
- `VideoPlayerModal` + `useVideoSource` are finished and content-agnostic; **no container exists**.
- `protocolSessions` is written by four callers and read by one **uncalled** symbol.
- `DailyReflectionCard` and `FirstShiftFooter` are built and suppressed by flag.
- No client-side crisis pre-check exists on any input path.
- **Nine of thirteen** constructs in Jen's "survives unchanged" list are spec-only. Practice
  substitution is **rejected in code** (`resolve.ts:140`). Both CC reports are to be shared with
  Jen's instance as the "what exists on main" baseline.
- The weekly loop is **live in production** for beta testers. Retirement is a migration.

---

## 3. Data model

### 3.1 New: `journeyStates/{uid}` (one doc per user, new collection)

Separate collection, not a `userPrivate` field: `userPrivate` is mid-migration (slices 3–4
pending) and must not grow during the window.

```
journeyStates/{uid}
  userId             string             // == uid; required so the deleteAccount
                                        // userId== sweep matches; rules validate
                                        // data.userId == {uid} (slice 1 fix)
  destination        DestinationKey     // focus | calm | routines | energy
  phaseKey           PhaseKey           // remove | recover | rewire | refocus
  enteredAt          Timestamp          // current phase entry
  history            PhaseHistoryEntry[] // { phaseKey, enteredAt, exitedAt, exitReason }
                                        // exitReason: advanced | skipped | adjusted_back
  skipped            PhaseKey[]         // phases passed without completing (map shows SKIPPED)
  advanceOfferedAt   Timestamp | null   // last offer shown for current phase
  advanceDeclinedAt  Timestamp | null   // "stay a while longer"
  adjustOfferedAt    Timestamp | null
  adjustDeclinedAt   Timestamp | null   // "keep going as is"
  createdAt, updatedAt
```

**Counters are derived, never stored.** `consistentDays` = count of `dailyLogs` with
`protocolCompleted === true` and `date >= enteredAt`. `calendarDays` = today − `enteredAt`.
`adjustDue` = the two most recent weekly reset docs since `enteredAt` both have
`phaseRead === 'not_moving'`. A stored counter can drift; a derivation cannot.

### 3.2 Rekeyed: the protocol matrix

- `OutcomeKey` retires as a matrix axis. New `PhaseKey` is the outer key.
- New `DestinationKey = 'focus' | 'calm' | 'routines' | 'energy'` (rename `stress → calm`).
- `ProtocolVariant.id` template becomes `${phase}-${capacity}`; `variantKey` becomes
  `${phase}-${capacity}-${timeClass}`. `ProtocolId` union in `analyticsEvents.ts` rekeyed.
- Destination shapes **ordering within a cell**, never membership: `orderForDestination(variants,
  destination)` is a pure function over an optional `destinationWeight` on variants.
- `selectProtocol(phase, capacity, time, destination)`; `representativeProtocol(phase, capacity)`
  keeps no time parameter (unchanged rule).
- `applyQuickWin` and `countWeeklyCyclesForOutcome` **retire**. Early-phase gentleness is a content
  property Jen authors, not an engine rule.
- Content re-tag (data, not rewrite): `focus → refocus`; `stress + energy → recover`;
  `routines` variants → `recover` (routines are recovery infrastructure per Jen §5). `remove` and
  `rewire` are **net-new** cells. Recompute `unauthoredVariants()` after re-tag; that number is the
  content commitment.

### 3.3 Rekeyed: display strings

`OUTCOME_LABELS` (single-key) is replaced by `PHASE_DISPLAY: Record<PhaseKey,
Record<DestinationKey, { title, short, gloss }>>` — 16 combinations × 3 lengths. `title` is the map
card; `short` is the route strip and Today journey line; `gloss` is the one-line under the title.
Single source. All 48 strings are Jen's; the copy sentinel count increments in the same commit.

### 3.4 Changed: `weeklyCycles` → weekly reset record

Collection name stays (no migration). Per-doc: **keep** `weekStart`, `weekEnd`, `closeCompletedAt`,
`closeNote`; **add** `phaseRead: 'moving' | 'same' | 'not_moving'` and `phaseKeyAtRead`; **stop
writing** `outcome`, `capacityInitial`, `capacityCurrent`, `protocolId`, `ratingFocus/Recovery/
Energy`, `adjustmentSelected`. Fields stay optional on the type so legacy docs still parse. The
first weekly cycle is still created at onboarding for cadence; it no longer carries an outcome.
`floorMet` survives **only if** continuity ships (§9 open item 4).

> **AMENDED 2026-09-04 (slice 3b). `outcome` and `capacityInitial` are STILL WRITTEN**
> as of 7f07413, against the stop-writing list above, and `weekStart` stays on the keep
> list unchanged. Retirement of the first two is resequenced behind the resolveJourney
> read removal — see the §13 slice-3b entry. **Do not plan their removal without
> removing the reads at `resolveJourney.ts:195` (the capacity seed on every phase
> resolution) and `:216` (the migration destination) first.** Stopping the writes on
> their own does not fail; it pins every capacity seed to `'normal'`, which is the kind
> of bug that looks correct. Of the rest of the stop-writing list, `capacityCurrent`,
> `protocolId`, `ratingFocus/Recovery/Energy` and `adjustmentSelected` ARE retired and
> no longer written.

> **AMENDED 2026-09-05 (Content Pack v1 `§decisions-1`). `phaseRead`'s MIDDLE STATE CHANGES
> MEANING.** Slice 6's target contract is **`'moving' | 'not_moving' | 'unclear'`**,
> superseding the `'moving' | 'same' | 'not_moving'` written above.
>
> **This is a SEMANTIC change, not a rename.** `same` means the user reports *no change*, a
> substantive read about the journey. `unclear` means the user *cannot tell*, a read about
> their own confidence. One is an answer; the other is the absence of one. Do not treat the
> edit as a spelling fix, and do not read `'same'` as today's spelling of `'unclear'`. The
> neutrality rules attach to `unclear` and were never true of `same`: it must not count
> toward the two-consecutive-`not_moving` run, must not reset a prior `not_moving`, must not
> be read as `moving`, and must not be a negative signal anywhere else. It behaves as an
> unanswered week does.
>
> **Not yet made in code.** `types/models.ts` still ships the old union; changing it is
> slice-6 work. **Slice 6's Step 0 must establish whether any `phaseRead` values are
> STORED before touching the type.** As of 2026-09-05 nothing writes the field anywhere in
> `src/` or `functions/src/` (slice 6 adds the write), so the expected answer is zero and
> the change is a clean re-spec with no migration. Verify that against production rather
> than inferring it from the repo: any surviving `same` values cannot be silently relabeled,
> and their disposition is a product decision. The only reader is `deriveAdjustDue`
> (`journey/derive.ts`), which carries the full note.

### 3.5 Unchanged

`dailyLogs` (schema and helpers). `CapacityTier`, `TimeClass`, `TIME_CLASS_MAX_MINUTES`,
`timeClassForMinutes`. `UserPrivate.floorCommitment`, `whyNote`, `weekStartDay`. `protocolSessions`
writes and `reflection.ts` chip sets. All Focus, Energy, and routine screens. `VideoPlayerModal`.
Notification primitives.

### 3.6 Retired

`WeeklyOpenScreen` outcome and capacity steps (the wizard collapses to weekStart + confirm, or
retires wholly if the first cycle is created at onboarding and subsequent ones on rollover — Step-0
of slice 3 decides). `OpenYourWeekCard` as an outcome pick. `resolveWeeklyEntry`'s `'open'` target.
`applyQuickWin`. `WeeklyCycle.outcome` as a read anywhere. `ADJUSTMENT_KEYS` including
`'different-outcome'`. `ComingSoonCard` (no call sites). `downshiftEvents` code (leave data).

### 3.7 New collections must join the deleteAccount list

`journeyStates` and `moments` (§5, slice 8) are added to the `deleteAccount` cleanup set in the same
slice that creates them. The 18-orphaned-collection gap does not grow by two.

---

## 4. Phase resolver (replaces `useWeeklyLanding`'s gate)

```
resolveJourney(uid) →
  { target: 'today',     phase: PhaseContext }
  { target: 'migrate',   legacy: { latestCycle } }     // beta users with weekly history
  { target: 'onboard' }                                 // no state, no history (should not occur post-onboarding)
```

`PhaseContext = { phaseKey, destination, capacitySeed, revisionToken }` replaces the `WeeklyCycle`
argument to `useTodayCard`. `capacitySeed` comes from `UserPrivate` (the onboarding capacity
answer, re-homed off the cycle). `revisionToken` replaces `cycle.closeCompletedAt` as the reload
trigger.

**Migration branch (required state, not a screen in the mockups).** A beta user opens the app with
`weeklyCycles` history and no `journeyStates` doc. Resolver returns `migrate`; the app shows the
route screen (A2) one time with destination derived from the latest cycle's `outcome`
(`stress → calm`), writes `journeyStates` with `phaseKey: 'remove'`, and proceeds. Legacy cycle docs
are never read again and never deleted. Gate: `JOURNEY_IA` flag, following the
`FOUR_PILLAR_IA` / `ONBOARDING_V3` precedent, so main stays walkable throughout.

---

## 5. Build sequence

Standing discipline applies to every slice: read-only Step-0 → build with scope fence and STOP
gates → commit on branch → device walk (`--tunnel`) on any slice with runtime surface → `--no-ff`
merge with two `-m` flags, no backticks in messages. `npm test` in `functions/` before any functions
deploy. Deploy state lives on Kyle's checklist.

| # | Slice | Scope fence | Gates | Walk |
|---|---|---|---|---|
| 0 | **Prep: split and rescue** **[Next]** | Move `dailyLogDocId`, `upsertDailyLog`, `getDailyLog`, `hasPickedToday`, `DailyLogInput` from `weeklyCycle.service.ts` into `dailyLog.service.ts`. Move `CAPACITY_LABELS/GLOSSES`, `TIME_LABELS/GLOSSES`, `PICKER_COPY` from `screens/weekly/copy.ts` into `components/dashboard/dailyPicker.copy.ts`. Update imports. **Zero behavior change.** | jest green; import graph shows no daily→weekly edge | No (no runtime change) |
| 1 | **Journey types, state, rules** | `PhaseKey`, `DestinationKey`, `PhaseHistoryEntry`, `JourneyState` in `types/models.ts`; `journeyState.service.ts` (get/create/advance/skip/adjust/recordOffer); `firestore.rules` for `journeyStates` (owner read/write, shape-validated) + rules tests; `deleteAccount` list updated; derivations `deriveConsistentDays`, `deriveCalendarDays`, `deriveAdjustDue` as pure functions with tests. | rules tests pass; **[Kyle-gated]** rules deploy | No |
| 2 | **Resolver + PhaseContext + migration branch** | `resolveJourney`; `useJourneyLanding` replacing `useWeeklyLanding` behind `JOURNEY_IA`; `useTodayCard(uid, phaseContext)`; `DashboardScreen` gate swap; migration branch wiring (route screen reuse deferred to slice 4; interim: write state and land on Today). | Step-0 confirms the four scalar reads are the only seam; STOP if more found | Yes: fresh account, legacy account |
| 3 | **Matrix rekey + re-tag + outcome-pick retirement** | §3.2 in full; `PHASE_DISPLAY` shape with placeholder strings; retire §3.6 items; `WeeklyCycle` write-set reduced per §3.4; analytics events rekeyed (`journey_*` replaces `weekly_open`; `weekly_close` survives renamed `weekly_reset`). | **[Content-gated]** re-tag mapping + at least one `remove` variant per capacity tier, authored as mark-done protocols with why-card text; STOP if unauthored cells would leave any (phase, capacity) empty | Yes: full daily loop across two phases |
| 3a | **[DONE `be58b97`, 2026-09-02]** Engine re-key + re-tag + shim removal *(row added 2026-09-05 to match §13)* | The engine speaks `PhaseKey` natively. Jen's three behavioral Remove protocols; retag confirmed (12 rows, zero edits); `legacyOutcomeFor` removed. Retired with the slice: `applyQuickWin`, `countWeeklyCyclesForOutcome`, week-number plumbing, `reshapeParity`. | Content gate met before merge (Remove protocols authored) | Done: real-content walk, all three tiers |
| 3b | **[DONE `7f07413`, 2026-09-04]** Weekly write-set reduction + `WeeklyOpenScreen` retirement + rollover *(row added 2026-09-05 to match §13)* | §3.4 write-set reduced to live-reader fields; `WeeklyOpenScreen`, `OpenYourWeekCard` and `weekly_open` deleted; expiry creates the next cycle in a create-on-absence transaction keyed `<uid>_<weekStart>`. Resolves §9 open item 8. | — | Done |
| 3c-i | **[DONE `701f2b4`, 2026-09-03]** Remove capture + families + crisis pre-check *(row added 2026-09-05 to match §13)* | Five-path Remove capture; three-family protocol model with family-aware serving and six Jen-approved mental/interpersonal protocols; acknowledgment rotation; client-side crisis pre-check with `SupportScreen`. | Crisis pre-check promoted to a precondition of this slice | Done: two defects caught on the walk |
| 3c-ii | **Remove replacement pick + routine seed** *(row added 2026-09-05; the slice was split in the §13 Sept 2 entry and never got a row here)* | Curated replacement menus per time slot, one selection only, flow ends on a neutral confirmation; routine seed from the pick. **NO REMINDER SCOPE** — no notification infrastructure, no time picker, no nudge copy. | Content DELIVERED (`Content Pack v1 §replacement-menus` + `§decisions-3`). STOP if the menu appears to need a reminder to be useful; that is the signal the scope split was wrong, not licence to build it | Yes |
| 4 | **Onboarding: destination + route** | A1 copy reframe on step 2; **new** route screen (A2) at step 3 (open item 1); Capacity step copy loses "this week"; terminal write creates `journeyStates` and the first weekly cycle without outcome; `activeOutcome` → `destination`; write order preserved (`completeOnboarding` last). Migration branch now shows A2. | **[Content-gated]** A1/A2 strings, 16 `short` strings | Yes: full arc + migration |
| 5 | **Practices → journey map + Start here container** | B1: `JourneyMapScreen` replaces `PracticesHubScreen` config launcher (same stateless shape); card states from `journeyStates`; phase detail pages re-house Focus hub (refocus), Energy/Stress/Routines/Sleep (recover); `StartHereRow` container over `VideoPlayerModal` with collapsed/expanded state persisted per surface; `explainerPath` data field. | **[Content-gated]** 16 `title` + 16 `gloss` strings; recover internal structure (detail page only; map ships without it) | Yes |
| 6 | **Weekly reset repurpose** | C1: `WeeklyCloseScreen` → one felt read + note; drop ratings and adjustment; write `phaseRead`, `phaseKeyAtRead`; `ContinuityCard` disposition per open item 4. | **[Content-gated]** C1 strings | Yes |
| 7 | **Offers + Today additions** | B2 advancement screen (two copy variants: threshold-met, ceiling-met); C2 adjust screen with per-phase alternatives; offer surfacing rules (Today card day-of, then map; 3-day persistence per open item 3); Today journey line (D1); Today Start here collapsed row; `journey_advance_offered / _accepted / _declined / _skipped`, `journey_adjust_*` events. | **[Content-gated]** B2 ×2, C2 alternatives ×4 phases | Yes |
| 8 | **Moments of joy** | `moments/{uid}_{ts}` collection (rules, deleteAccount), one-tap entry sheet from D1 below-fold row, single-line input, no list surface on Today; feeds nothing until Insights ships. | rules; **[Content-gated]** copy | Yes |
| 9 | **Behavioral protocol screen + remind-later** | The Daily Action Launcher behavioral screen (protocol, why, mark done, remind me later) for `remove` protocols; one-off later-today notification (`scheduleLocalNotification` DATE trigger), `scheduledAt` on `DailyLog`, third card state, cancellation bookkeeping; OS-settings redirect after denial. | Completion semantics decision (mockup v1 E1 open item) | Yes |

> **AMENDED 2026-09-05 (table reconciled with §13). SLICE 3 SHIPPED AS FOUR SLICES, NOT ONE.**
> Row 3 above is the ORIGINAL scope and is left unedited; it never shipped under that number.
> It was split twice in the §13 build log and the table was never updated, so rows 3a, 3b,
> 3c-i and 3c-ii have been added to match. Three are merged; **3c-ii is the only one still
> open**, and it is the next unblocked slice.
>
> **Merge order was not slice order:** 3a (`be58b97`, Sept 2) → 3c-i (`701f2b4`, Sept 3) →
> 3b (`7f07413`, Sept 4). 3c-i landed between them because the Remove framework closed with
> Jen before the weekly write-set work did. Read the §13 entries in date order, not by label.

> **AMENDED 2026-09-05 (Journey Content Pack v1, Jen, approved on delivery).** The rows
> above are unchanged; their **[Content-gated]** labels are superseded by this block.
> Pack file: `docs/Vara_Journey_Content_Pack_v1.md`. Cite it as `Content Pack v1 §<anchor>`.
> Pack strings are APPROVED and enter the code **without** `COPY: draft` markers — **the
> sentinel does not increment for them.**
>
> - **Slice 4 — NO LONGER CONTENT-GATED.** A1 (`§A1`), A2 (`§A2`) and the 16 `short`
>   strings (`§display-strings`) are delivered. Two §9 open items are resolved by the pack
>   itself: **item 1** route screen sits at **step 3** (pack part one, section 3, decision 1),
>   and **item 9** the destination label is **"Steadier days"**, not "Routines" (decision 2).
>   Slice 4 now has no open gate.
> - **Slice 5 — NO LONGER CONTENT-GATED.** 16 `title` + 16 `gloss` (`§display-strings`) and
>   Recover's internal structure (`§recover-lanes`, three lanes: Downshift / Refill /
>   Re-anchor, destination-weighted, labels never shown to the user) are delivered.
>   **Carries a build rule, not a gate:** the runnable practice catalog and the daily
>   protocol grid are **two separate systems with no shared id space**, and Recover must
>   **not** reference runnable-practice IDs until `supportingPracticeIds` is explicitly
>   authored per variant. Titles that match across the two systems do **not** mean they are
>   connected. See `§decisions-2` and the note at `protocolEngine/protocolMatrix.ts`
>   (`supportingPracticeIds`). Slice 5 owns that authoring.
> - **Slice 6 — NO LONGER CONTENT-GATED.** C1 strings delivered (`§C1`). **Engine contract,
>   now resolved** (`§decisions-1`): `phaseRead` is **`moving | not_moving | unclear`**; only
>   explicit `not_moving` accumulates toward C2; `unclear` is neutral and must neither count
>   toward the run nor reset a prior `not_moving`; and **C1 never gates the advancement
>   offer**. Full note at `journey/derive.ts` (`deriveAdjustDue`). **Still open:** §9 item 4,
>   the ContinuityCard ship-or-retire decision. Slice 6 is decision-gated on that one item.
> - **Slice 7 — NO LONGER CONTENT-GATED.** B2 ×2 (`§B2`) and C2 with per-phase alternatives
>   ×4 (`§C2`) are delivered; both were ★ "not on her list yet" and arrived early. **The C2
>   body in the pack's own section 5 is SUPERSEDED** — build the conditional version in
>   `§decisions-4`, never the original. **Remaining gates are decision-only:** §9 items 2, 3,
>   5, 6.
> - **Slice 9 — SCOPE GREW.** The replacement-flow **reminder step and nudge copy moved here
>   from 3c-ii** (`§decisions-3`): the "Want a nudge when that time comes?" prompt, its
>   Remind me / No reminder options, and the three reminder-presuming confirmations. Slice 9
>   already owns notification behaviour, so this avoids a second notification path that
>   would have to be reconciled later. Build them only as part of slice 9.
>
> **Not delivered by this pack:** slice 8 copy (Moments of joy) is still content-gated, and
> the rewire placeholders in `protocolMatrix.ts` are still placeholders.

**Ordering rationale.** 0 makes everything after it smaller and reversible. 1–2 land the model
behind a flag without touching content. 3 is the content-dependent core and the point of no return
for the outcome axis. 4 follows 3 because onboarding writes the rekeyed shape. 5–7 are the user-
facing surfaces in the order a new user meets them. 8–9 are quality, not structure. Slices 3–7 are
the ones that cannot start until Jen's items land; slices 0–2 can start today.

**Parallel engineering queue, unaffected but interacting:** `userPrivate` migration slices 3–4
(journeyStates rules must be written against the post-flip rules model), `deleteAccount` retention
gap (grows by two collections here), payload logging strip before Sentry reconnection, web signup
fix, a11y and font-scaling slices (the journey map's four titles at Dynamic Type sizes are a test
case). `wellnessScore.service` de-wiring remains queued and is untouched by this build.

---

## 6. Content dependencies (Jen), in build order

Reordered from her Part 12 to match the slice sequence. Items marked ★ are not on her list yet.

1. **Practice re-tag mapping** (slice 3): which existing variants move to `recover` / `refocus`.
2. **Remove protocols** (slice 3): at least one per capacity tier, mark-done shape, with why text.
   Behavioral screen arrives in slice 9; until then these serve on the daily card.
3. **The 48 display strings** (slices 4–5): 16 × `short`, `title`, `gloss`. Alliteration is
   internal; user-facing strings are destination language only.
4. **A1 / A2 copy** (slice 4). A2 is the bait-and-switch mitigation for the whole journey.
5. **Recover's internal structure** (slice 5 detail page). Starting shape: regulate, sleep, fuel,
   movement. Moved to the top of her list; the strings depend on knowing what the phase contains.
6. **C1 weekly reset copy** (slice 6).
7. ★ **B2 advancement copy, two variants** (slice 7): threshold-met (names what held) and
   ceiling-met (nothing to name; door open regardless).
8. ★ **C2 adjust alternatives, 2–3 per phase** (slice 7): constrained choice inside the phase.
9. **Start here videos ×2** (Today: what drives results and why the order; Practices: how the map
   works). Containers ship in slice 5 with a placeholder path; videos are data.
10. **Moments of joy copy** (slice 8).
11. **Rewire prompts** — post slice 9, gated on the crisis pre-check (§7).
12. **Learn deep dives per blocker** — independent of the build; publish as ready.
13. ★ **Confirmed retired:** the 24-cell off-diagonal outcome grid. Do not author.

---

## 7. Kyle's deliverables to Jen

- **The Guide behavior file** (her fourth ask): stance (**assistant, not coach**, in user-facing
  copy; "coach" is reserved for the human practitioner channel), the data-access position (what
  the Guide may read: `journeyStates`, `dailyLogs`, the current phase's content; not journal
  bodies, not `protocolSessions` reflections without explicit opt-in), and the **crisis path**.
- **Crisis pre-check** is confirmed absent on every input path. It is a hard precondition for
  Rewire journaling and for any Guide free-text input. Client-side, before any network call
  (locked decision). Jen owns copy and the resource list; Kyle owns the mechanism and its
  placement in the input pipeline. Sequenced after slice 9, before any Rewire content ships.
- **The two CC reports** as her instance's baseline ("what exists on main"), plus the nine
  spec-only terms and the substitution conflict, stated plainly.

---

## 8. Brand tripwires specific to this build

- **Every practice runnable, always.** "Locked" does not exist in the UI vocabulary. AHEAD opens.
- **No counter, ever, anywhere.** Not the 8, not the 14, not the two weekly reads, not days-in-
  phase, not phases-complete. Derivations stay in code. The advancement screen names practices.
- **Framework words stay internal.** `remove | recover | rewire | refocus` are keys and file names.
  `brandCopyGuard` should flag them in any user-facing string module.
- **State at input, silent after.** The weekly read routes the adjust offer and then disappears.
  It never appears in a summary or is echoed back.
- **Adjust offers lead with fit, never with the person.** "The practice isn't the right fit, not
  that you are."
- **Declining is a peer action.** "Stay a while longer" and "keep going as is" have zero
  friction and generate no follow-up nag; re-offer only on the next threshold or read.
- **Start here collapses.** Today's three-card ceiling: hero, Start here (collapsed row), the
  advancement card when live. The journey line is a text row, not a card.
- **Moments of joy is one tap, optional, never counted.** "Gratitude" appears nowhere.
- **No em dashes in user-facing copy. Coral for genuine errors only. Reduce Motion respected.**

---

## 9. Open items carried (decide before the slice that needs them)

| # | Item | Needed by | Lean |
|---|---|---|---|
| 1 | Route screen position: step 3 (after destination) vs Jen's step 5 | Slice 4 | **RESOLVED 2026-09-05: step 3.** Content Pack v1 part one, section 3, decision 1 |
| 2 | Ceiling-met advancement copy register | Slice 7 | Honest, no practices named, door open |
| 3 | Advancement card persistence on Today | Slice 7 | 3 days, then map only |
| 4 | Continuity: ship (floor question survives in C1) or retire | Slice 6 | Retire for beta; revisit with data |
| 5 | Adjust counter re-arm after "keep going as is" | Slice 7 | Re-arm; copy acknowledges the prior choice |
| 6 | Today journey line: `short` string vs a stage word | Slice 7 | `short` |
| 7 | Evening-protocol completion semantics (commit-time vs follow-through) | Slice 9 | Commit-time |
| 8 | `WeeklyOpenScreen`: collapse to weekStart+confirm, or retire and create cycles on rollover | **RESOLVED Sept 1: retire; rollover creation is a slice 3b requirement** (under JOURNEY_IA the weekly open is unreachable, so expired weeks must self-renew or the weekly reset ritual dies) | — |
| 9 | "Steadier days" vs "Routines" as the destination label | Slice 4 | **RESOLVED 2026-09-05: "Steadier days".** Content Pack v1 part one, section 3, decision 2. Governs the DESTINATION label only; the Practices hub card is a separate string |

---

## 10. Freeze

Per Jen's Part 11, adopted here as build policy: **the architecture in §1–§4 is frozen** until ten
beta users have used it and reported. Anything structural arriving from either founder goes on the
post-beta list (§11) with a round assignment, not into a slice. Copy, content, and bug fixes are
not structural. The test for "structural": does it change §1, §3, or §4? If yes, it waits.

---

## 11. Post-beta list

Reframe layer in Insights (early Rewire touches) · Insights data view · `protocolSessions` read
path · Rewire full phase (gated on crisis pre-check, may land in beta if 9 and the pre-check ship) ·
Referral rewards · Aging photo (declined, recorded so it is not re-raised) · Habit removal (value
moves to Insights) · Calendar sync · Org entitlement resolver · `weeklyEngine` rename pass (now:
`journeyEngine` naming lands with slice 3; residual renames after) · Offline-resilience slice ·
Start-day edit surface · Coach 500 fix · B2B2C coach channel.

---

## 12. Working notes

- Two-track discipline holds. Claude.ai authors slice prompts and reviews every CC report before
  merge. Kyle bridges and holds the ledger.
- Every slice prompt states which §9 items it needs decided and STOPs if they are not.
- Docs to true up once slices 3–5 are walked: Canonical Positioning Brief (tabs, the check-in
  vocabulary, the journey as method not pitch), Messaging Pillars (weights unchanged; pillars are
  acquisition vocabulary, phases are in-app), CLAUDE.md precedence ladder (this doc enters above
  the Today/IA v2 roadmap).

---

## 13. Build log (amendments as slices close)

**Sept 1, 2026 — slices 0–2 merged; main at ff8939e; JOURNEY_IA shipped ON.**
- Baselines: tsc 149 · jest 2953 / 201 · rules 183 pass / 2 skip · functions 25 / 3 ·
  sentinel 189. (Earlier figures in prompts were stale; these are measured.)
- Deploys completed Sept 1: `dailyLogs (userId ASC, date ASC)` index · `journeyStates`
  rules · functions (deleteAccount sweep includes `journeyStates`).
- Slice 1 model fix: `JourneyState.userId` added (see §3.1); without it the
  deleteAccount sweep matches nothing.
- Slice 2 shims, removal schedule: `legacyOutcomeFor` (destination→OutcomeKey) is
  removed in **slice 3a**; the capacitySeed-from-latest-cycle shim is re-homed in
  **slice 4** (slice 2's code comments carry both dates).
- **Slice 3 is split**: **3a** engine re-key + re-tag + shim removal (content-gated on
  Remove protocols before merge); **3b** weekly write-set reduction + `WeeklyOpenScreen`
  retirement + rollover cycle creation (open item 8, resolved).
- Under JOURNEY_IA the weekly open is unreachable by design; between 3a and 3b an
  expired-week beta account has no weekly ritual. Accepted for the window; 3b closes it.
- `deleteAccount` gap is larger than the tracked 18: slice 1 Step-0 found seven more
  behavioral collections absent from the sweep (`dailyLogs`, `weeklyCycles`,
  `downshiftEvents`, `dayBlocks`, `capturedTasks`, `brainStateCheckIns`,
  `protocolSessions`). Own slice before beta; privacy-policy 30-day promise depends on it.
- Walk protocol correction: device walks are Kyle's; every slice ends at "commit, hand
  Kyle the walk script, STOP." CC never reports walk results it did not observe.
- `chore/legacy-removal` verified fully contained in main; deleted.

**Sept 2, 2026 — slice 3a merged (be58b97). Engine speaks PhaseKey natively.**
- Jen's three behavioral Remove protocols live; rewire cells placeholder and
  unreachable until slice 5. Retag confirmed by Jen (12 rows, zero edits);
  real-content walk passed all three tiers.
- Retired with the slice: applyQuickWin, countWeeklyCyclesForOutcome, week-number
  plumbing, reshapeParity (superseded by retagParity). Why-copy on Remove variants
  is held unrendered until the slice 9 behavioral screen.
- Baselines: jest **2953 / 200**, sentinel **189**, tsc 149. *(Measured on be58b97.
  The draft of this entry read 2988 / 203 and sentinel 192; both were wrong and are
  corrected here rather than recorded, because the next slice's Step 0 keys off these.
  Suites went 201 → 200: THREE retired — useTodayCard.weekNumber, quickWin,
  reshapeParity — and TWO added, protocolMatrix.removeCellsAuthored and retagParity.
  The sentinel did not move because it counts DRAFTED strings: Jen's content is
  approved, carries no `COPY: draft` marker, and replaced placeholders that carried
  none either.)*
- Walk finding (Sept 2): DailyPickerSheet's time question has been invisible since
  3b-ii-b — sticky footer over an unaffordanced scroll; JSDOM suites cannot catch
  layout occlusion. Fix slice queued (compress time to a chip row, §5.2 fade on
  EnhancedModal): must land before any cell gains multiple time-length variants.
  Standing note: device walks are the only net for layout-class bugs.
- Remove framework finalized with Jen (three drafts, two rounds): three protocol
  families (behavioral/mental/interpersonal), replace-not-just-remove routing,
  one-move-before-building, curated-strings-only rule (free text never enters
  template copy), crisis pre-check promoted to a 3c-i precondition. Slice 3c split:
  3c-i capture + families + pre-check; 3c-ii replacement pick + routine seed.
- Resolved: advance-offer decline suppresses 7 days, re-offers once, then map-only.
  "It varies" timing routes scaffold-only (no routine seed). Acknowledgment
  rotation with consistency-derived quieting is 3c-i scope.
- Open: helper line (Kyle) — his definition, Jen's decision rule, or the combo.

**Sept 3, 2026 — slice 3c-i merged (701f2b4). Remove capture, safety screen,
family-aware serving.** Branch commits 0816a79, 4b73253, 2c23dd4.
- Baselines: jest **3067 / 206** · tsc **149** · sentinel **192** · rules 191 pass /
  2 skip · functions 25 / 3. *(jest, tsc and sentinel re-measured on 701f2b4 and
  confirmed; rules and functions are carried from the branch, not re-run at merge.)*
- Shipped: five-path Remove capture (chips, sleep sub-question, timing, first move);
  three-family protocol model with family-aware serving and six Jen-approved
  mental/interpersonal protocols; acknowledgment rotation with consistency quieting;
  capture entry card on Today with ContinuityCard suppression (transitional until
  3b/slice 6); client-side crisis pre-check with SupportScreen.
- Safety copy: Jen-reviewed, substantially hers. Integrated version differs from her
  draft in two places: category-promoted ordering with More Support expander (not a
  two-row list), and an always-shown static 911 line (not classifier-conditional).
  Jen confirmed the final set on 2026-09-03, both deltas included. Resource numbers
  and hours verified 2026-09-02; US-only, international pass is a pre-launch item.
- Walk-caught defects (two, both would have shipped green):
  1. Completion called goBack() on the nested stack and recordRemoveCapture had no
     guard; a second completion overwrote a real capture with nulls. Original walk
     account: fields nulled by the second completion, capture re-run on a reset
     account. Fixed 4b73253: parent pop unmounts flow + provider, three-layer write
     guard, saveFailed error path.
  2. Entry card did not release live; resolver effect keyed on [uid, weeklyTarget]
     so refresh-on-focus had nothing to re-run. Fixed 2c23dd4 with an attempt
     counter. Anti-vacuity test pairs release with stays-up-when-outstanding.
- Known limits and follow-ups:
  - Pre-check abuse sensitivity and self_directed_negative scope: CLOSED as
    v1-accepted limitations on Kyle's authority, 2026-09-04. Neither is owed to Jen
    any more. The recorded miss is kept verbatim and is the reopen trigger: "I don't
    feel safe at home right now" did not trigger; served the interpersonal protocol
    and stored the text. If beta surfaces further misses of this shape, this reopens
    and the pattern set goes back to Jen with the accumulated examples.
  - PRE-LAUNCH: revisit pre-check pattern sensitivity before launch. It currently
    matches explicit keywords only, which is what the miss above demonstrates, and
    v1-accepted is not the same as launch-accepted. Tracked here as prose alongside
    the international resource pass rather than in a checklist, because the repo has
    no pre-launch checklist artifact.
  - Pre-check returns first match only; the multi-match ordering rule is implemented
    but unreachable. Follow-up: emit matched set.
  - safety_precheck_shown kept: empty payload, uid-keyed (not anonymous, as the doc
    comment at analyticsEvents.ts:301 claimed — corrected in 490cdf9); flagged
    inferred-sensitive for the international pre-launch pass.
  - FIRST_MOVE_BY_FAMILY strings: APPROVED as-is by Kyle for v1, 2026-09-04. Landed
    Claude-drafted at sentinel 192 (+3); markers cleared on the copy-approvals
    branch. No Jen fast-follow owed.
  - journeyStates has no realtime subscription; safe while this device is the only
    writer. Revisit when a second writer (Guide, server) exists.

**Sept 3, 2026 — daily picker time chips + EnhancedModal grow-to-fit merged
(d24fd41).** Branch commits 490cdf9, 676c1ac.
- Figures at merge: jest **3091 / 207** · tsc **149** · sentinel **195** · rules 191
  pass / 2 skip · functions 25 / 3. *(jest, tsc and sentinel measured on the branch
  tip; the merge tree is byte-identical to it, so they carry. Rules and functions
  carried unrun — no rules or functions file in the diff.)*
- Shipped: time question compressed from three two-line OptionRows to a single
  three-chip row (single-select, pre-filled, presentation only, write path
  unchanged); the scroll fade extracted as a shared ScrollFade component;
  analyticsEvents.ts:301 doc comment corrected — safety_precheck_shown is uid-keyed,
  not the anonymous count the comment claimed.
- Walk-caught defect, app-wide and pre-existing: every EnhancedModal surface had
  rendered at exactly 480pt since the shell was built. modalContainer carried
  maxHeight and minHeight but no height source, and every layer beneath it
  (modalInner, ScrollFadeArea, KeyboardAvoidingView, the ScrollView) is flex:1, so
  nothing reported a height upward; minHeight floored it and maxHeightPercent was
  dead code. On an iPhone 15 that is 56% of the screen, and it left the picker a
  293pt viewport for 422pt of content while its own cap allowed 719. Fixed 676c1ac
  with measured grow-to-fit (useModalHeight): height = min(max(content, 480), cap),
  from onLayout on the header and footer plus onContentSizeChange on the scroll
  view. Short modals do not stretch — flexGrow reports short content as the viewport
  it was padded into, so the sum is the height already held; pinned by test. The
  fade now keys on cap overflow rather than viewport overflow (viewport overflow is
  briefly true while the container is still growing, which is what painted the band
  across the chip row), trailing padding is derived from the fade height so the last
  control scrolls clear of it, and terminal alpha drops 0.85 to 0.7 so a selected
  chip beneath it cannot read as disabled.
- Blast radius, all twelve mount sites (paths under mobile/src): AIConsentModal
  (components/ai/AIConsentModal.tsx:53) · CreateChallengeFromGroupModal
  (components/community/CreateChallengeFromGroupModal.tsx:147) · InviteMembersModal
  (components/community/InviteMembersModal.tsx:270) · DailyPickerSheet
  (components/dashboard/DailyPickerSheet.tsx:97) · HabitCompletionSheet
  (components/HabitCompletionSheet/index.tsx:31) · IntentionEditSheet
  (components/habits/IntentionEditSheet.tsx:101) · SimpleHabitCreateScreen
  (components/habits/SimpleHabitCreateScreen.tsx:191 and :200, two branches of the
  same screen) · WizardContainer (components/habits/wizard/WizardContainer.tsx:163) ·
  ChallengesScreen (screens/community/ChallengesScreen.tsx:544) · AddBlockSheet
  (screens/Focus/AddBlockSheet.tsx:349) · CaptureTaskSheet
  (screens/Focus/CaptureTaskSheet.tsx:153) · HabitDetailScreen
  (screens/HabitDetailScreen.tsx:530).
- Keyboard coverage COMPLETE. Three of the twelve declare hasInputs={false} and
  cannot raise a keyboard: AIConsentModal (:58), DailyPickerSheet (:101),
  HabitCompletionSheet (:36). All nine of the others were re-walked on device
  2026-09-04 and all held: no footer occlusion, no stretched short modals, tall
  modals growing correctly. SimpleHabitCreateScreen covered on both branches
  including the wizard path. (An earlier account of "seven walked" was two errors
  cancelling: AIConsentModal was among the seven and is not keyboard-capable, so
  that pass was six of nine. The re-walk supersedes it.)
- Known limits and follow-ups:
  - Open reflow: one un-animated resize from 480 to the fitted height on first
    paint. Walked and accepted as a settle rather than a jump; no polish queued.
    Sizing from zeroes instead would paint a container shorter than its own floor.
  - Keyboard dismissal is inconsistent across the shell's surfaces. Pre-existing,
    not from this branch: EnhancedModal passes showDoneButton={false} to the scroll
    view (:162) and renders the iOS accessory toolbar only when Platform.OS is ios
    AND showKeyboardToolbar AND hasInputs, so some modals show a Done bar above the
    keyboard and others rely on their footer buttons. One dismissal pattern
    app-wide, queued with the a11y/pressable remediation.
  - The modal inventory shrinks when habit removal lands (§11 post-beta list, "Habit
    removal (value moves to Insights)" — NOT §7, which is Kyle's deliverables to
    Jen). Five of the twelve are habits-owned and go with it: HabitCompletionSheet,
    IntentionEditSheet, SimpleHabitCreateScreen, WizardContainer, HabitDetailScreen.
    That leaves seven mounting surfaces, and four of those five are keyboard-capable,
    so the nine drops to five. Re-read this entry's blast radius at that point.
  - No reopen path after confirm: capacity and time are uneditable until the next
    day, so the pre-fill is unwalkable on device same-day and stands verified by
    test only. A revise-today affordance is a queued product question, deliberately
    not built on this branch.
  - maxHeightPercent caps make no keyboard allowance. Safe on the surfaces walked,
    but a future tall keyboard modal should revisit useModalHeight.
  - The scroll fade has no Mobile UI Standards section. §5.2 is Typography Scale and
    §7.7 does not exist, so it was built to the slice brief's own description. Add a
    section so future fades match this implementation.
  - TIME_CHIP_LABELS ("5 min or less", "10 to 15 min", "15 min or more"): APPROVED
    as-is by Kyle for v1, 2026-09-04. Landed Claude-drafted at sentinel 195 (+3);
    markers cleared on the copy-approvals branch. Note the resulting asymmetry: the
    three TIME_LABELS they were compressed from are still drafted, and those remain
    the accessibility label on each chip, so the string a screen reader announces is
    unapproved while the one painted beside it is approved.
  - Time remains inert by design until Jen's off-diagonal grid.
- Walk-scope lesson: a shared-shell change budgets a regression walk across every
  mounting surface up front. This one changed twelve and was scoped as one.

**Sept 4, 2026 — slice 3b merged (7f07413). Rollover, WeeklyOpenScreen
retirement, dead-field reduction.** Branch commits 9a4600c, 259fa88, atop the
copy-approvals merge 337b518.
- Figures at merge: jest **3080 / 206** · tsc **149** · sentinel **173** · rules 191
  pass / 2 skip · functions 25 / 3. *(rules and functions carried unrun. The weekly
  doc's rules are absent-safe by citation, not by assumption: weeklyCycles at
  firestore.rules:850-857 validates ownership only, with no field allowlist, no
  shape check and no document-ID constraint, so both the reduced field set and the
  deterministic ID are accepted as written. Confirmed on the walk.)*
- Shipped: the weekly write-set reduced to the live-reader fields. capacityCurrent,
  protocolId, the three ratings and adjustmentSelected are no longer written; the
  types keep them optional so legacy documents still parse, and there is no
  migration because absence IS the migration. WeeklyOpenScreen, OpenYourWeekCard and
  the weekly_open event retired as whole-file deletions.
- Rollover: the expiry signal creates the next cycle rather than routing anywhere.
  The document is named `<uid>_<weekStart>` and written inside a create-on-absence
  transaction, so a duplicate is the SAME document rather than a second one.
  Idempotent under a real double-trigger, not a hypothetical: Home's landing effect
  fires more than once per mount, which is why exactly-one is pinned on the service
  rather than on a render count. Survives app relaunch, where an in-memory guard
  would have been forgotten.
- 259fa88 added an existence guard on the post-transaction read-back, with a
  VALUE-ESCAPE test rather than only a throw test. The hazard was never the missing
  exception; it was a cycle with no weekStart reaching Home and being rendered as a
  week, and a rejects-only test would still pass if a refactor logged the problem
  and returned the partial object.
- §3.4 SEQUENCING CORRECTION, annotated in §3.4 itself. `outcome` and
  `capacityInitial` remain written against §3.4's stop-writing list; `weekStart` was
  already on its keep list and is unchanged. The two reads are live at
  resolveJourney.ts:195 (the capacity seed on every phase resolution) and :216 (the
  migration destination), and stopping the writes first would not fail, it would
  pin every capacity seed to 'normal'. Retirement is resequenced behind removing
  those reads, in a future slice coupled to the destination migration.
- LEGACY-ID BOUNDARY, proven and walked. Pre-3b history is auto-ID and every beta
  account has some. Auto-ID documents stay reachable on all query paths; the only
  two reads addressed by document ID are inside ensureCurrentWeeklyCycle, where an
  auto-ID row is structurally invisible. That is safe rather than lucky: the
  planner's weekStart is strictly greater than max(existing weekStarts), via three
  chained guarantees (getLatestWeeklyCycle reduces over the unfiltered userId query
  so legacy rows are counted; planWeek plans strictly forward of priorWeekEnd in
  every branch; resolveWeekEnd's fallback covers rows with no stored weekEnd). The
  deterministic ID therefore names a week no document covers, and an absent read is
  the truth rather than a blind spot being hit. Mixed-ID account walked (step 9):
  both path families coexist.
- Known behaviors:
  - Rollover requires connectivity. Firestore transactions reject rather than
    queueing offline, so an expired week opened with no network renders Home
    without a weekly surface and self-heals on the next online foreground. Walked
    (step 8). Lateral against the old behavior, where the card it replaced was
    equally non-functional offline.
  - DEAD QUESTIONS, one slice wide. WeeklyCloseScreen still ASKS for three ratings
    and an adjustment; this slice stopped storing them, and the answers now reach
    analytics and nothing else. Shipped that way deliberately and documented in the
    screen, the service, the model and the tests, with an explicit instruction not
    to re-add the fields to make the screen feel honest. Slice 6 owns the screen's
    repurpose (§5 row 6, C1-gated) and removes the questions. A rider hiding them
    early was considered and not taken, so the gap is real until slice 6 lands.
  - Nine Jen-authored `whyItWorks` strings retained in protocolMatrix rather than
    swept as dead code, with their nine call-site comments updated to say why: it
    is authored content held for the Practices phase detail pages (§5 row 5), and
    deleting it would mean re-authoring it.
- SENTINEL 186 -> 173, and the third case is now exercised and reasoned into the
  contract. Thirteen strings were deleted WITH THEIR SURFACE (ten from OPEN_COPY,
  three from OpenYourWeekCard) rather than approved or newly drafted. No owner is
  named because nobody signed them off; the screen they lived on stopped existing.
  The contract previously covered only approval and new drafts, and calling this an
  approval would have misreported thirteen unreviewed strings as reviewed.

**Sept 6, 2026 — deleteAccount sweep slice closed on `journey/deleteaccount-sweep`
(36a8844 Firestore, 9f2cb0f Cloud Storage). Walked. NOT MERGED.**
- Figures: functions **53 / 4**, from 25 / 3. jest 3080 / 206 · tsc 149 · sentinel 173 ·
  rules 191 pass / 2 skip all carried unrun — the diff touches functions/, firebase.json
  and nothing under mobile/src or firestore.rules.
- The gap was larger than the Sept 1 entry's seven and larger than §3.7's "tracked 18":
  a rules-plus-service enumeration found **26 Firestore deletion targets** missing.
  Beyond the seven already named — `dailyReflections`, `analyticsEvents`,
  `notificationPreferences`, `memberships`, `hiddenPosts`; owner fields that are not
  called userId (`posts.authorId`, `mutedUsers.muterId`, `postReports.reporterId`, both
  sides of all three invite collections, `connections` by requesterId/addresseeId/a/b);
  and five subcollections whose PARENT the old code deleted, which in Firestore strands
  the children permanently (`users/{uid}/goals`, `/moderationHistory`,
  `rateLimits/{uid}/requests`, `notificationLog/{uid}/**`, `habits|routines/*/completions`).
  **The module manifest in `functions/src/lib/accountDeletion.js` is now the authoritative
  list**, not §3.7 and not the Sept 1 note; §3.7 is unedited because §1–§4 are frozen.
- Cloud Storage was a stated residual at the Firestore commit and is closed by 9f2cb0f.
  Four per-user prefixes delete by prefix (`users/`, `avatars/`, `posts/`,
  `communityPosts/`); `groupPosts/{groupId}/{uid}/` does not, because the groupId sits
  between the prefix and the owner — swept by delimiter-listing the groups instead.
  The bucket's ten admin-authored media prefixes are deliberately absent from both
  manifests and pinned by test: one account deletion must not be able to empty the
  content library.
- Every sweep is a QUERY on an owner field, never an ID reconstruction. `weeklyCycles`
  is `<uid>_<weekStart>` today and auto-ID on every beta account (same legacy-ID
  boundary the 3b entry proves for the read paths); a constructed ID would miss exactly
  the oldest accounts. Pinned by a test that asserts the seeded ID does not contain the
  uid, so it cannot drift into seeding a deterministic ID and still pass.
- Auth deletion stays LAST and happens only after a clean Firestore and Storage pass.
  Steps are independent and failures are collected, so one broken collection cannot pin
  the fifty after it, and a failed run leaves an account that can still sign in and press
  delete again. **The retry is the recovery path** — do not "fix" anything downstream by
  moving the Auth delete earlier.
- Harness change future slices inherit: `npm test` in functions/ now wraps jest in
  `firebase emulators:exec --only firestore,auth,storage`, and firebase.json gains a
  storage emulator port. The sweep suite THROWS rather than skips when an emulator host
  variable is absent — a skipped deletion test reads as a clean run.
- **WALK-CAUGHT DEFECT (Kyle's walk; queued, deliberately NOT built on this branch).**
  Post-deletion the client logged `Error creating user document: Missing or insufficient
  permissions` from `userPrivate.service.ts`. An auth/profile-ensure path observed the
  half-deleted state — auth context still alive, documents already gone — and tried to
  recreate a user document. Rules rejected it and **no data was resurrected; Kyle's walk
  verified the account clean**. The fail-closed rules were the backstop, which is the
  only reason this is a defect and not a data bug.
  - The window is a DESIGN CONSEQUENCE of Auth-last, not an accident, and closing it by
    reordering the function would trade a log line for an unrecoverable partial
    deletion. The fix belongs on the client: **the in-app deletion flow should sign out
    and tear down listeners BEFORE invoking deleteAccount**, so no client effect can
    observe the window at all. `mobile/src/hooks/useAccountActions.ts:71-72` currently
    calls the function first and signs out after, which is the ordering that leaves it
    open. (That call site was read during this slice's Step 0; the effect that actually
    fired the write was NOT identified.)
  - Step 0 when picked up, read-only: **cite the effect that fired the write.** Do not
    accept the useAccountActions ordering as the diagnosis on its own — it explains why
    a window exists, not which subscriber woke up inside it, and a sign-out-first change
    that happens to silence the log is not proof either.
- Known residuals, each needing its own decision, none built:
  - Comments and likes the user left inside OTHER people's post documents are array
    elements on `posts`. Likes are strippable with `likes array-contains uid`; comments
    are reachable only by a full-collection scan.
  - Groups and challenges the user OWNED survive ownerless. The uid is removed from
    every `members` array; deleting the documents would destroy other members' content.
  - Other-party rows naming the deleted uid are left by choice: `directMessages` sent TO
    them, `postReports.reportedUserId`, `mutedUsers.mutedUserId`, moderation records.
  - RevenueCat is platform-side and cannot be reached from here.

*Living document. Owner: Kyle. Update as slices close; do not edit §1–§4 during the freeze.*
