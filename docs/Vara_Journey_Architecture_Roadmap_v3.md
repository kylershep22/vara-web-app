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

> **AMENDED 2026-09-06 (sentinel rule reconciliation). THE SENTENCE ABOVE IS HALF THE RULE.**
> It was written before the Content Pack existed and reads as though every display string
> increments the copy-draft sentinel. The pack's own rule (Content Pack v1, "How to use this
> file") says the opposite for pack strings. Both are correct, and **the SOURCE of a string
> decides which applies**:
>
> - **Delivered by a content pack** (Jen's, approved on delivery): lands **flat**. No
>   `COPY: draft` marker, no owner comment, **the sentinel does not increment**. It is
>   approved content, and the sentinel counts drafted strings.
> - **Drafted in-house** (anyone filling a gap the pack did not cover): carries the
>   `COPY: draft` marker **and a named owner**, and **the sentinel increments** by one per
>   string.
>
> So a single commit can land twenty-two pack strings at a flat sentinel and one in-house
> string that moves it by one. Slice 3c-ii is the worked example: Jen's replacement menus
> landed flat on the branch, and the one string that was not hers (`'Got it'`, owner Kyle)
> took the sentinel 173 -> 174 as a draft, then back to **173** when Kyle approved it on
> device and the follow-up commit cleared the marker. See the §13 Sept 6 3c-ii entry.
> **A flat sentinel across a copy-bearing slice is not by itself evidence of anything.**
> Here it is the sum of a +1 and a -1 on the same string. Check where the strings came
> from and read the notes above `EXPECTED_SENTINELS`, not the pinned number alone.

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
| 0 | **[DONE 2026-09-01]** Prep: split and rescue *(marker corrected 2026-09-06: the row still carried **[Next]** long after §13's Sept 1 entry recorded slices 0-2 merged, main at `ff8939e`)* | Move `dailyLogDocId`, `upsertDailyLog`, `getDailyLog`, `hasPickedToday`, `DailyLogInput` from `weeklyCycle.service.ts` into `dailyLog.service.ts`. Move `CAPACITY_LABELS/GLOSSES`, `TIME_LABELS/GLOSSES`, `PICKER_COPY` from `screens/weekly/copy.ts` into `components/dashboard/dailyPicker.copy.ts`. Update imports. **Zero behavior change.** | jest green; import graph shows no daily→weekly edge | No (no runtime change) |
| 1 | **Journey types, state, rules** | `PhaseKey`, `DestinationKey`, `PhaseHistoryEntry`, `JourneyState` in `types/models.ts`; `journeyState.service.ts` (get/create/advance/skip/adjust/recordOffer); `firestore.rules` for `journeyStates` (owner read/write, shape-validated) + rules tests; `deleteAccount` list updated; derivations `deriveConsistentDays`, `deriveCalendarDays`, `deriveAdjustDue` as pure functions with tests. | rules tests pass; **[Kyle-gated]** rules deploy | No |
| 2 | **Resolver + PhaseContext + migration branch** | `resolveJourney`; `useJourneyLanding` replacing `useWeeklyLanding` behind `JOURNEY_IA`; `useTodayCard(uid, phaseContext)`; `DashboardScreen` gate swap; migration branch wiring (route screen reuse deferred to slice 4; interim: write state and land on Today). | Step-0 confirms the four scalar reads are the only seam; STOP if more found | Yes: fresh account, legacy account |
| 3 | **Matrix rekey + re-tag + outcome-pick retirement** | §3.2 in full; `PHASE_DISPLAY` shape with placeholder strings; retire §3.6 items; `WeeklyCycle` write-set reduced per §3.4; analytics events rekeyed (`journey_*` replaces `weekly_open`; `weekly_close` survives renamed `weekly_reset`). | **[Content-gated]** re-tag mapping + at least one `remove` variant per capacity tier, authored as mark-done protocols with why-card text; STOP if unauthored cells would leave any (phase, capacity) empty | Yes: full daily loop across two phases |
| 3a | **[DONE `be58b97`, 2026-09-02]** Engine re-key + re-tag + shim removal *(row added 2026-09-05 to match §13)* | The engine speaks `PhaseKey` natively. Jen's three behavioral Remove protocols; retag confirmed (12 rows, zero edits); `legacyOutcomeFor` removed. Retired with the slice: `applyQuickWin`, `countWeeklyCyclesForOutcome`, week-number plumbing, `reshapeParity`. | Content gate met before merge (Remove protocols authored) | Done: real-content walk, all three tiers |
| 3b | **[DONE `7f07413`, 2026-09-04]** Weekly write-set reduction + `WeeklyOpenScreen` retirement + rollover *(row added 2026-09-05 to match §13)* | §3.4 write-set reduced to live-reader fields; `WeeklyOpenScreen`, `OpenYourWeekCard` and `weekly_open` deleted; expiry creates the next cycle in a create-on-absence transaction keyed `<uid>_<weekStart>`. Resolves §9 open item 8. | — | Done |
| 3c-i | **[DONE `701f2b4`, 2026-09-03]** Remove capture + families + crisis pre-check *(row added 2026-09-05 to match §13)* | Five-path Remove capture; three-family protocol model with family-aware serving and six Jen-approved mental/interpersonal protocols; acknowledgment rotation; client-side crisis pre-check with `SupportScreen`. | Crisis pre-check promoted to a precondition of this slice | Done: two defects caught on the walk |
| 3c-ii | **[DONE `74ff373`, merged `80ed0f7`, 2026-09-06]** Remove replacement pick + routine seed *(row added 2026-09-05; the slice was split in the §13 Sept 2 entry and never got a row here)* **"routine seed" is not what shipped — see the AMENDED 2026-09-06 block below.** | Curated replacement menus per time slot, one selection only, flow ends on a neutral confirmation; routine seed from the pick. **NO REMINDER SCOPE** — no notification infrastructure, no time picker, no nudge copy. | Content DELIVERED (`Content Pack v1 §replacement-menus` + `§decisions-3`). STOP if the menu appears to need a reminder to be useful; that is the signal the scope split was wrong, not licence to build it | Yes |
| 4 | **[SPLIT 2026-09-07 into 4a and 4b; see the AMENDED block below]** Onboarding: destination + route | A1 copy reframe on step 2; **new** route screen (A2) at step 3 (open item 1); Capacity step copy loses "this week"; terminal write creates `journeyStates` and the first weekly cycle without outcome; `activeOutcome` → `destination`; write order preserved (`completeOnboarding` last). Migration branch now shows A2. | **[Content-gated]** A1/A2 strings, 16 `short` strings | Yes: full arc + migration |
| 4a | **[DONE `ea58022`, merged `d317c4d`, 2026-09-07]** Onboarding destination + route, everything but the outcome | A1 at step 2 (`§A1`, subtitle dropped); **new** A2 route screen at step 3 with the route strip (`§A2`, `§short-labels`); capacity step asks the daily question; terminal writes `journeyStates` + `userPrivate.capacitySeed`, `completeOnboarding` last; `capacitySeed` re-homed off the cycle; migration branch shows A2 once. **The first cycle keeps writing `outcome` exactly as before.** | No content gate; no §9 item | Done 2026-09-07: four destination arcs, migration path with two relaunches, Firestore shape verified |
| 4b | **[DONE, 2026-09-07; walk pending]** Weekly-cycle outcome retirement *(row added 2026-09-07; split out of row 4 at slice 4a's Step 0)* | `WeeklyCycle.outcome` and `CreateWeeklyCycleInput.outcome` become optional (`types/models.ts`, `weeklyCycle.service.ts`); guard both render sites (`TodayHeroCard.tsx:180`, `CloseWeekEntry.tsx:61`); **the 3b rollover at `weeklyCycle.service.ts:251` must carry absence forward instead of defaulting to `'focus'`**; retire `outcomeForDestination` (`journey/destinationBridge.ts`), which exists only for the cycle write. | Fence explicitly INCLUDES the daily-loop render sites and the weekly rollover; that is the point of the row | Yes |
| 5 | **[SPLIT 2026-09-09 into 5a, 5b and 5c; the `supportingPracticeIds` authoring is REMOVED from the slice, not deferred inside it; see the AMENDED block below]** Practices → journey map + Start here container | B1: `JourneyMapScreen` replaces `PracticesHubScreen` config launcher (same stateless shape); card states from `journeyStates`; phase detail pages re-house Focus hub (refocus), Energy/Stress/Routines/Sleep (recover); `StartHereRow` container over `VideoPlayerModal` with collapsed/expanded state persisted per surface; `explainerPath` data field. | **[Content-gated]** 16 `title` + 16 `gloss` strings; recover internal structure (detail page only; map ships without it) | Yes |
| 5a | **[DONE `ec943be`, 2026-09-09]** Journey map + the phase-path component *(row added 2026-09-09 with the split)* | `JourneyMapScreen` replaces `PracticesHubScreen` at `ROUTES.PillarPractices`; four phase rows carrying `title` + `gloss` from `PHASE_DISPLAY` (both already populated, held unrendered since 4a); card states derived from `journeyStates` (`phaseKey` / `history` / `skipped`), never stored; the phase-path component built ONCE here and adopted by `RouteStrip` in the same slice (4a known gap 2). Every destination the four hub cards reach today keeps a working entry point. Tab label, screen title and intro UNCHANGED. | No content gate, no §9 item, no build rule. Map state labels are in-house copy: named owner, sentinel increments | Yes |
| 5b | **[SHIPPED as 5b-i, `8cc461c`, 2026-09-09; remainder DISPERSED, see the 2026-09-09 block; the re-house clause below is SUPERSEDED]** Phase detail pages ×4 *(row added 2026-09-09 with the split)* | `refocus` re-houses the Focus hub; `recover` re-houses Energy, Stress Recovery and Routines under the `§recover-lanes` destination weighting; `remove` renders the 3c-ii stored intention, which is real user state on day one; **`rewire` ships as an explicit, scoped stub** — decided now, not discovered at Step 0. **Sleep is NOT re-housed** (see the AMENDED block below). | Page chrome is in-house copy. The catalog-to-grid bridge stays empty and is not this slice's problem | Yes |
| 5b-i | **[DONE `8cc461c`, 2026-09-09]** Phase explanation pages *(row added 2026-09-09 at the close)* | Four phase detail pages on one route (`ROUTES.JourneyPhase`, params `phase` + `destination`), reachable from every journey map row: destination `title` + `gloss`, one state-agnostic body per phase, a state eyebrow, back to the map. `PhasePath` gains an optional `onPressPhase`; A2 passes none and stays inert. Remove page renders the 3c-ii stored intention through an absent-safe resolver. **NOT a practice browser**, and the four destination cards STAY ON THE MAP. | No content gate, no §9 item. Five page strings drafted in-house then rewritten and approved by Kyle on device | Done 2026-09-09: four pages, two destinations, three seeded states, both remove-page paths |
| 5c | **[DONE `55a403a`, 2026-09-10]** Start here container *(row added 2026-09-09 with the split)* **Shipped with a NULL path, not the placeholder path this row and §6 item 9 specify — see the Sept 10 §13 entry and the §6 item 9 amendment.** | `StartHereRow` over `VideoPlayerModal`, collapsed/expanded state persisted per surface, `explainerPath` as a data field with a placeholder path (§6 item 9). Practices surface only; slice 7 mounts the Today instance. **Free-floating**: touches neither `PHASE_DISPLAY` nor `journeyStates`. | Videos are data, not a gate. `VideoPlayerModal` and `useVideoSource` are §3.5-unchanged and are wrapped, never edited | Yes |
| 6 | **[Next]** Weekly reset repurpose *(marked 2026-09-10 at slice 5c's close; row 5 is complete and 6 is the next unshipped row.* **NOT content-gated — the §Content-gated tag in this row's Gates cell below is superseded.** *C1 was delivered in Content Pack v1 (`§C1`) and the 2026-09-05 amendment removed the gate; the engine contract is resolved at `§decisions-1`. Its one remaining gate is **§9 item 4**, ContinuityCard ship-or-retire — a DECISION, not content. Correction made 2026-09-10: the marking note first written at 5c's close called this row content-gated, which was wrong on both the amendment and the pack.)* | C1: `WeeklyCloseScreen` → one felt read + note; drop ratings and adjustment; write `phaseRead`, `phaseKeyAtRead`; `ContinuityCard` disposition per open item 4. | **[Content-gated]** C1 strings | Yes |
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
> - **Slice 4 — PARTLY DELIVERED. ~~NO LONGER CONTENT-GATED~~ — see the correction below.**
>   A1 (`§A1`) and A2 (`§A2`) are delivered. Two §9 open items are resolved by the pack
>   itself: **item 1** route screen sits at **step 3** (pack part one, section 3, decision 1),
>   and **item 9** the destination label is **"Steadier days"**, not "Routines" (decision 2).
>   ~~Slice 4 now has no open gate.~~
>
>   > **CORRECTED 2026-09-06. THIS BULLET CLAIMED THE 16 `short` STRINGS WERE DELIVERED.
>   > THEY WERE NOT, AND THEY STILL ARE NOT.** `§display-strings` delivers **`Title` and
>   > `Gloss` only** — 32 strings, not 48. The pack says so in its own header ("slice 5
>   > display strings (16 title + 16 gloss)") and its section is titled "Slice 5 display
>   > strings"; the word `short` appears nowhere in the pack as a display string. The
>   > mis-statement came from this block, not from Jen.
>   >
>   > `short` is slice 4's field, not slice 5's: `PhaseDisplayCopy` (`constants/journey.ts:60-71`)
>   > documents it as **the route strip and the Today journey line**, and the route strip is
>   > A2, the screen slice 4 builds. `PHASE_DISPLAY` is still a throwing proxy, so there is
>   > nothing to render. §6 item 3 always said this correctly: "The 48 display strings
>   > (**slices 4-5**)".
>   >
>   > ~~**Slice 4 REMAINS CONTENT-GATED on the 16 `short` strings**, which have been
>   > requested from Jen.~~ Its other gate is clear: A1, A2 and both §9 items are settled.
>   > ~~If the strings do not arrive in time, the slice **splits** — destination/route/
>   > write-order first, the route strip's `short` line second — rather than shipping
>   > in-house placeholders on the screen whose whole job is the bait-and-switch
>   > mitigation.~~ The split contingency is moot; the strings arrived.
>   >
>   > **RESOLVED 2026-09-06, later the same day. THE GAP IS CLOSED AND SLICE 4 IS
>   > UNGATED.** Jen delivered the 16 `short` labels as `Content Pack v1 §short-labels`
>   > (pack part three, section 8), approved on delivery, landing flat under the pack's
>   > sentinel rule like the rest of her copy. `PHASE_DISPLAY` can now be populated in
>   > full: 16 × `title` + 16 × `gloss` from `§display-strings`, 16 × `short` from
>   > `§short-labels`, which is the 48 §3.3 specifies. **Slice 4 has no content gate and no
>   > open §9 item.** §6 item 3 is satisfied.
>   >
>   > Two things the slice still has to carry, neither of them a gate: the **capacity-step
>   > reframe** (§5's row says the step loses "this week"; the live string is
>   > `screens/onboarding/v3/copy.ts:74`) is **not pack-covered** and will be in-house copy
>   > with an owner and a sentinel increment, and **§9 item 6** — whether the Today journey
>   > line uses `short` or a stage word — is a **slice 7** decision that this delivery does
>   > not settle, so slice 4 may use `short` on the route strip without presuming the
>   > Today answer.
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

> **AMENDED 2026-09-07 (slice 4a closed). ROW 4 SPLIT, AND THE REASON IS A DEFECT
> NOBODY HAD LOOKED FOR.** Row 4 is left unedited in the §3.4 style. Its scope shipped
> as **4a** except for one clause, "the first weekly cycle without outcome", which became
> **4b**.
>
> **THE FINDING, recorded here so it is never re-derived.** `ensureCurrentWeeklyCycle`
> (`weeklyCycle.service.ts:251`) writes `outcome: latest?.outcome ?? DEFAULT_ROLLOVER_OUTCOME`,
> and that default is **`'focus'`** (`:74`). So a first cycle written WITHOUT an outcome does
> not stay without one: seven days later the 3b rollover invents `'focus'` for the user and
> `TodayHeroCard` renders it as though they had chosen it. A user who picked **Calm** at
> onboarding would be shown **"Focus / Normal"** on their hero in week two, with no error
> and no log line. **Stopping the onboarding write alone does not remove the outcome axis;
> it makes the axis lie.** That is the same failure class the §3.4 amendment names about
> the capacity seed, arriving from the other side.
>
> Two further blockers found with it, both cheap on their own and neither sufficient alone:
> `WeeklyCycle.outcome` is **required** (`types/models.ts:503`), against §3.4's claim that
> the write-set fields are optional on the type; and both readers index
> `OUTCOME_LABELS[cycle.outcome]` with no guard on the field
> (`TodayHeroCard.tsx:180`, `CloseWeekEntry.tsx:61`), so an absent outcome renders a bare
> leading slash rather than failing.
>
> **4b owns all three together.** Splitting them across slices is what would leave the
> window open. 4b's fence deliberately includes the daily-loop render sites and the weekly
> rollover, which is exactly why it could not be smuggled into an onboarding slice.

> **AMENDED 2026-09-06 (slice 3c-ii closed). "ROUTINE SEED" IN THE 3c-ii ROW WAS
> ASPIRATIONAL AND DID NOT SHIP.** The row above is left unedited in the §3.4 style.
> What shipped is a **slot-anchored intention**: three absent-safe fields on
> `journeyStates` (`removeReplacementId` / `removeReplacementSlot` / `removeReplacementAt`),
> a commitment record and nothing more. **No routine is created, and none should be read
> into the row's wording.**
>
> The routines path was examined and rejected on two independent grounds (full reasoning in
> the §13 entry): seeding through `createRoutine` calls `deactivateRoutinesOfType` and would
> **silently deactivate a routine the user wrote themselves**, and the non-destructive
> variant would require inventing duration, icon and colour content nobody has authored.
> Jen's replacement options are single actions, not multi-step sequences, so the routine
> shape was wrong for the content as well as risky for the user's data.
>
> **Any future promotion of a stored intention into an actual routine is a deliberate slice
> with authored content and an explicit user action. It is never a default and never a
> migration.**
>
> **Board status, superseding the 2026-09-05 note above** (left unedited; it was true on its
> date): rows 3a, 3b, 3c-i and 3c-ii are **all merged**. **Slice 4 is the next slice**, and
> per the correction inside the pack block it is still gated on the 16 `short` strings.

> **AMENDED 2026-09-09 (decisions taken before the 5a brief; Kyle). ROW 5 SPLITS INTO
> 5a / 5b / 5c, AND ONE PIECE OF ITS SCOPE LEAVES THE BUILD ENTIRELY.** Row 5 is left
> unedited above in the §3.4 style; rows 5a, 5b and 5c carry what actually ships. Nothing
> here was learned at a Step 0 — all five were decided off a read-only board review, which
> is why none of them is written as a discovery.
>
> **1. `supportingPracticeIds` AUTHORING IS OUT OF SLICE 5. NOT DEFERRED WITHIN IT, OUT OF
> IT.** This supersedes the 2026-09-05 pack block above (left unedited; it was true on its
> date), which reads "Slice 5 owns that authoring."
>
> **Why it is not engineering's to do:** which runnable practice supports which daily
> protocol is a **CLINICAL JUDGMENT**, not a wiring decision. It belongs to Jen, arrives as
> a delivered table, and is built as its own small slice against that table. An engineer
> choosing the pairings is the same failure the content gates exist to prevent — unauthored
> content entering the app through an engineering decision — and it is the exact reasoning
> that rejected the 3c-ii routine seed.
>
> **What that means for the field: nothing changes, and the nothing is the point.**
> `supportingPracticeIds: []` on every variant, the bridge stays empty, the daily serve
> continues to launch nothing, and **that state is DOCUMENTED AND ACCEPTED rather than
> outstanding**. Anyone who finds the array empty has found the recorded state, not a gap to
> close. The `protocolMatrix.ts` comment is amended in the same breath as this block, so the
> code no longer names slice 5 as the owner.
>
> **`§decisions-2`'s two-systems rule still stands and is unaffected**: the runnable practice
> catalog and the daily protocol grid share no id space, and no Recover surface may reference
> a runnable-practice ID by title match. That rule survives the authoring leaving; it is what
> makes the empty array safe rather than merely empty.
>
> **CONSEQUENCE WORTH STATING PLAINLY: the 5a/5b/5c arc now has NO gate of any kind.** No
> content gate, no §9 item, no build rule. This was the only one it could have carried.
>
> **2. SLEEP IS DROPPED FROM THE RE-HOUSE LIST. A DELIBERATE DROP, NOT AN OMISSION.** Row 5
> names "Energy/Stress/Routines/**Sleep** (recover)". Sleep is not re-housed, and the
> reasoning is recorded here so it is never re-derived as something 5b forgot.
>
> Sleep is **not one of the four Practices hub cards**, so there is nothing to re-house from
> the launcher. The Sleep Library screen exists and is registered
> (`AppNavigator.tsx:689-699`) but has **no live entry point**: its only two referents in
> `src/` are `constants/brainInsightsCopy.ts:34`, a copy constant, and
> `constants/featureDiscovery.ts:369`, one of the five known-dead featureDiscovery
> `navigationTarget`s that are inert because `ComingUpSection` is unmounted. Re-housing it
> would mean **giving a dark screen its first entry point inside a slice about the journey
> map**, which is a product decision wearing a re-house's clothes.
>
> The screen is left registered and byte-untouched. If Sleep should be reachable, that is its
> own decision with its own surface and its own walk, never a rider on slice 5.
>
> **3. REWIRE'S DETAIL PAGE IS AN EXPLICIT STUB IN 5b, SCOPED NOW.** Rewire is the one phase
> with no content behind it: its matrix cells are placeholders and unreachable (§13, Sept 2),
> and the pack explicitly does not deliver them ("the rewire placeholders in
> `protocolMatrix.ts` are still placeholders"). The page ships **honest, calm and scoped** —
> it says what the phase is for and does not pretend to content that nobody has authored, and
> it does not read as an error or as a locked door (§8: "Locked" does not exist in the UI
> vocabulary).
>
> **This is the row's own logic applied one level down.** The row already lets the map ship
> without recover's interior. A stub page under a live map card is the same trade, and
> deciding it here means 5b's Step 0 finds a scoped stub rather than an unauthored phase.
>
> **4. TAB LABEL AND MAP SCREEN TITLE: OPEN, AND ROUTED TO JEN** alongside the 4b hero-label
> question (§13, slice 4b, OPEN NOTE FOR JEN — the four destination labels are revised
> together or not at all). **5a ships today's labels UNCHANGED**: tab `Practices`
> (`AppNavigator.tsx:582`), screen title `Practices` and intro `Pick a place to start.`
> (`PracticesHubScreen.tsx:210,213`), all carrying their existing `COPY: draft` markers and
> their existing owner, so the sentinel does not move for them.
>
> **Why unchanged rather than redrafted:** the screen whose name IS the tab is the worst
> place to ship an in-house replacement nobody approved, and a label invented in 5a would
> have to be un-invented when Jen answers. Carrying a drafted string forward is cheap;
> replacing an approved-looking one is not.
>
> **NOT A DECISION, A PREDICTION FOR 5a's BRIEF:** the four card labels and four descriptors
> on `PracticesHubScreen` (eight drafted strings, `PracticesHubScreen.tsx:152-201`) go
> wherever the launcher goes. If 5a deletes them with the surface, that is 3b's
> delete-with-surface case and the sentinel drops by eight with no owner named; if 5b's
> detail pages carry them, it does not move. **Predict which in the brief.** The pillar-hub
> HOLD in the guidelines doc (§7 has no slot for Stress Recovery) means they may not be
> rewritten either way.
>
> **5. THE SPLIT, AND THE ORDER IT RUNS IN.** 5a → 5b, because 5b's pages are reached from
> 5a's map and a detail page with no parent is the `FocusHubScreen` unreachable-surface shape
> again (`AppNavigator.tsx:533`: registered nowhere because nothing navigated to it). **5c
> free-floats** — it touches neither `PHASE_DISPLAY` nor `journeyStates` and can land before,
> between or after the other two.
>
> **THE PHASE-PATH COMPONENT BELONGS TO 5a AND IS ADOPTED BY `RouteStrip` IN THE SAME
> SLICE**, per 4a's known gap 2. Scoped once for two surfaces: building it twice is how the
> route strip and the map end up disagreeing about what a phase looks like, and the second
> build is always the one that never happens.
>
> **6. DO NOT INHERIT "STATELESS" AS A FENCE.** Row 5's parenthetical says `JourneyMapScreen`
> replaces the launcher with the "same stateless shape", and the same row says "card states
> from `journeyStates`". The parenthetical describes the **config-array idiom**, not the data
> posture. `PracticesHubScreen.tsx:3-5` says of itself "It holds no state, reads no data";
> the map cannot, because DONE / WHERE YOU ARE / AHEAD / SKIPPED are read from
> `journeyStates`. The row stays unedited; the brief must not fence 5a out of reading.
>
> **7. ADDED 2026-09-09 AT THE 5b-i CLOSE. ROW 5b IS SHIPPED, AND THERE IS NO 5b-ii.**
> The row was split into 5b-i and 5b-ii while the 5b brief was being written: 5b-i the four
> pages, 5b-ii "the pages get their own content". **5b-i shipped and the remainder did not
> survive contact with the decisions above.** It was not cancelled and it was not deferred;
> its three pieces went to three different places, and each one is now somewhere with an
> owner. Recorded here so nobody re-derives 5b-ii as a slice that went missing.
>
> - **The remove page's stored intention SHIPPED IN 5b-i.** It was the largest piece of the
>   proposed remainder and it turned out to cost one absent-safe resolver and one lead-in
>   line, so it went in with the pages rather than waiting for a slice of its own. See the
>   Sept 9 5b-i entry.
> - **The recover page's lane structure WAS REMOVED BY DECISION 1 ABOVE**, not postponed.
>   Downshift / Refill / Re-anchor stay serving-side and are never page structure, so there
>   is no lane work left to schedule. The question that made it look like a slice — how the
>   lanes map onto Energy's Regulate / Rest / Fuel — was answered by deciding they do not
>   map at all.
> - **The daily-protocol to supporting-practice integration LEFT SLICE 5 ENTIRELY** on
>   2026-09-09 (item 1 above). It is Jen's `supportingPracticeIds` table, delivered as
>   content, built as its own small slice against that table, and gated on the table
>   arriving. It was never 5b-ii's to hold.
>
> **WHAT THIS LEAVES.** 5c is the only unshipped piece of row 5 and is therefore next. The
> open IA question the 5b-i entry logs — where the practice catalog ultimately lives — is a
> genuine open question and is **not** a hidden 5b-ii: it is an IA decision with no slice
> attached, and attaching one is a product call rather than a scheduling gap.

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
6. **C1 weekly reset copy** (slice 6). *(DELIVERED — Content Pack v1 `§C1`: four destination-flavoured questions, three answer options, the confirmation line. The 2026-09-05 §5 amendment removed slice 6's content gate on the strength of it. Annotated 2026-09-10; this item is closed.)*
7. ★ **B2 advancement copy, two variants** (slice 7): threshold-met (names what held) and
   ceiling-met (nothing to name; door open regardless).
8. ★ **C2 adjust alternatives, 2–3 per phase** (slice 7): constrained choice inside the phase.
9. **Start here videos ×2** (Today: what drives results and why the order; Practices: how the map
   works). Containers ship in slice 5 with a placeholder path; videos are data.
   *(AMENDED 2026-09-10 at slice 5c's close: the container shipped with a **null** path, not a
   placeholder one. Decision 1 makes a null path and a path that fails to resolve the same
   outcome — nothing renders — so a dead placeholder would look identical while firing a
   Storage round trip and an ungated `logger.error` on every Practices mount, for every user,
   until the file exists. The day a file lands in the bucket the only change is the string in
   `constants/startHere.ts`. Practices carries a null path too, so **neither video is on screen
   for anyone yet** and this item is still fully open.)*
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

**Sept 6, 2026 — deleteAccount sweep merged (d3cbd06). Full-spectrum deletion,
Firestore and Cloud Storage.** Branch commits 36a8844, 9f2cb0f.
- Figures at merge: functions **53 / 4**, from 25 / 3. jest **3080 / 206** · tsc **149**
  · sentinel **173** all carried — no mobile suite was touched; the diff is functions/
  and firebase.json only. Rules 191 pass / 2 skip likewise carried: firestore.rules is
  not in the diff and the sweep needs no rules change, because Admin SDK writes bypass
  rules and every added query is a single-field equality or array-contains.
- SCOPE CORRECTION to this log's own Sept 1 entry, which named seven missed
  collections. Step 0's rules-plus-service enumeration found **26 deletion targets**.
  Five had never appeared on any list: `dailyReflections`, `analyticsEvents`,
  `notificationPreferences`, `memberships`, `hiddenPosts`. Beyond those, three shapes
  nobody had looked for at all — owner fields not called userId (`posts.authorId`,
  `mutedUsers.muterId`, `postReports.reporterId`, both sides of all three invite
  collections, `connections` by requesterId/addresseeId/a/b); five subcollections whose
  PARENT the old code deleted (Firestore does not cascade, so those rows were stranded
  permanently: `users/{uid}/goals`, `/moderationHistory`, `rateLimits/{uid}/requests`,
  `notificationLog/{uid}/**`, `habits|routines/*/completions`); and the
  **`posts.authorId` hole** — the mobile client stamps both fields but the web client
  stamps authorId only, so a userId-only sweep left every web-authored post standing.
- `analyticsEvents` CLOSES A 3c-i FLAG. The uid-keyed `safety_precheck_shown` events
  recorded there and flagged inferred-sensitive in the 3c-i entry are now deleted with
  the account. The content firewall keeps payloads free of user text; the uid stamp was
  always the personal data, and it no longer outlives the account.
- **MANIFEST-AS-TRUTH.** The exported manifest in `functions/src/lib/accountDeletion.js`
  is the authoritative collection list — not §3.7's "tracked 18", not the Sept 1 note.
  §3.7 is left unedited because §1–§4 are frozen. The manifest test fails if a named
  collection is dropped (verified by mutation, on both the Firestore and Storage lists).
  **STANDING INSTRUCTION: any slice that adds a collection updates the manifest in the
  same slice.** Nothing else in the repo notices a miss — no error, no log, just
  personal data that outlives the account. **Re-run the full Step 0 enumeration when
  slice 8's `moments` lands**; it did not exist at this slice's Step 0 and was confirmed
  absent from rules and code.
- STORAGE EXTENSION (9f2cb0f). Five per-user path patterns, all from storage.rules and
  every upload call site in mobile/src and web src. Four put the uid first and delete by
  prefix (`users/`, `avatars/`, `posts/`, `communityPosts/`).
  `groupPosts/{groupId}/{uid}/` does not — the groupId sits between the prefix and the
  owner, so `groupPosts/{uid}/` matches nothing and looks clean, while `groupPosts/`
  would take out every group's attachments. Swept by delimiter-listing the groups and
  deleting under each, so cost tracks the number of groups rather than the size of the
  forum. `bucket` is a REQUIRED positional on deleteAccountCompletely: the only safe
  default is delete-nothing, and that default must never be silent. A DECOY TEST pins
  that a uid appearing in an object NAME is not ownership — it seeds
  `protocolAudio/{uid}.mp3` and asserts it survives, alongside sleep-audio and
  focus-video. One account deletion must not be able to empty the content library.
- LEGACY AUTO-ID `weeklyCycles` COVERED, and cited so it is not re-litigated:
  `functions/src/__tests__/deleteAccountSweep.test.js:315-337` seeds via `.add()`
  alongside a `<uid>_<weekStart>` row, asserts both are deleted, and reads the auto-ID
  document back by its own ref rather than by the sweep's own query. The
  `expect(legacy.id).not.toContain(uid)` pin is what stops the test drifting into
  seeding a deterministic ID and still passing. Same legacy-ID boundary the 3b entry
  proves for the read paths.
- MECHANISM. Batches of 500, re-running the SAME query after each commit rather than
  cursor-paging — a cursor pages forward while the collection shrinks underneath it.
  `recursiveDelete` for the six uid-keyed document trees, because a plain document
  delete strands subcollections. Idempotent throughout: every operation is
  delete-what-matches or delete-this-path, and an absent Storage prefix is
  indistinguishable from an already-swept one. Steps are independent and failures are
  collected, so one broken collection cannot pin the fifty after it. **Data first, Auth
  LAST, and only after a clean pass — the retry is the recovery path.** Do not close any
  downstream window by moving the Auth delete earlier; that trades a log line for an
  unrecoverable partial deletion. `timeoutSeconds` 120 to 540.
- Harness change future slices inherit: `npm test` in functions/ now wraps jest in
  `firebase emulators:exec --only firestore,auth,storage`, and firebase.json gains a
  storage emulator port. The sweep suite THROWS rather than skips when an emulator host
  variable is absent — a skipped deletion test reads as a clean run, and this file's
  whole job is deleting users.
- WALKS (Kyle's, 2026-09-06). Full seeded walk — every collection on the manifest, both
  Storage shapes, and a hand-made auto-ID `weeklyCycles` document — verified to zero on
  device. Deployed-artifact walk on a light throwaway account verified the same day
  post-deploy. Deploy was unscoped; `api:deleteAccount` reported a successful update.
- ACCEPTED RESIDUALS (Kyle, 2026-09-06, both per recommendation):
  1. Comments and likes the user left inside OTHER users' post documents persist. They
     are array elements on `posts` with no query that reaches them, they carry a display
     name only, and persistence is the industry norm. The pre-launch privacy pass should
     consider a policy clause covering it.
  2. Groups and challenges the deleted user OWNED survive ownerless. Arguably correct —
     a group belongs to its members, and deleting it would destroy their content. The
     uid is removed from every `members` array. Ownership transfer is a future Community
     item.
  Not decisions, recorded for completeness: other-party rows naming the deleted uid are
  left by design (`directMessages` sent TO them, `postReports.reportedUserId`,
  `mutedUsers.mutedUserId`, moderation records), and RevenueCat is platform-side.
- **WALK-CAUGHT DEFECT — QUEUED, not this slice.** Post-deletion the client attempted to
  recreate a user document (`userPrivate.service.ts`, missing-or-insufficient-permissions
  error): an auth/profile-ensure effect observed the half-deleted window — auth context
  still alive, documents already gone. Rules rejected it and there was **no
  resurrection**; the fail-closed rules were the backstop, which is the only reason this
  is a defect and not a data bug. The window is a design consequence of Auth-last, so the
  fix belongs on the client: **the in-app deletion flow signs out and tears down
  listeners before invoking deleteAccount.**
  `mobile/src/hooks/useAccountActions.ts:71-72` calls the function first and signs out
  after, which is the ordering that leaves the window open — that is why a window
  exists, NOT which subscriber woke up inside it. Step 0 when picked up, read-only:
  **cite the effect that fired the write.** A sign-out-first change that merely silences
  the log is not proof.
- PRE-LAUNCH ITEMS ADDED:
  - `functions.config()` is past its announced March 2026 shutdown and deploys are
    succeeding on lag. **Migrate to dotenv before the next deploy cycle** — the next
    deploy is not guaranteed to be as lucky as this one.
  - `firebase-functions` package upgrade, which carries breaking changes; the emulator
    suite added by this slice is the net that makes it walkable. CLI update queued with
    it.

**Sept 6, 2026 — slice 3c-ii merged (80ed0f7). Remove replacement pick, slot-anchored.**
Branch commit 74ff373. Closes the last of the four slices that slice 3 was split into;
**slice 4 is now next.**
- Figures at close: jest **3132 / 208** · tsc **149** · sentinel **173**. Rules
  **191 / 2** and functions **53 / 4** are CARRIED UNRUN and labelled so: neither
  `firestore.rules` nor anything under `functions/` is in the diff, so there was nothing
  for either suite to react to. Carried-unrun is not the same claim as measured-green, and
  the next slice's Step 0 should treat them as inherited rather than verified here.
- **SENTINEL: THE MERGE MESSAGE SAYS 174 AND THE CLOSED STATE IS 173. BOTH ARE RIGHT.**
  The branch landed `REPLACEMENT_COPY.confirmedPrimary` (`'Got it'`) as a DRAFT, +1, which
  is the figure `80ed0f7` records. Kyle then **approved it on device on 2026-09-06 during
  the walk itself**, and the marker was cleared in a follow-up commit on main, -1. The pin
  is back at **173**. Read `80ed0f7`'s 174 as **branch state, not closed state**; the
  slice closes flat.
- That flat close is a trap for the next Step 0, so it is spelled out here: **173 before
  the slice and 173 after does not mean no copy moved.** A draft landed and was approved
  one commit later, and the 3b set that last parked on 173 is a different set of strings
  entirely. The two entries in `copyDraftSentinel.test.ts` above `EXPECTED_SENTINELS`
  carry the +1 and the -1 separately for exactly this reason; do not collapse them.
- Owner Kyle, because it is a UI button label rather than efficacy-adjacent copy, and
  reviewed in place — in the confirmed state it dismisses — rather than off a list. Every
  other string the slice added is Jen's and landed FLAT from the start, no markers and no
  increment, per the pack's sentinel rule: the menu title, the eighteen option labels and
  the three neutral confirmations. This is the first commit where both rules applied at
  once, and §3.3 now carries the reconciliation.
- WHY AN IN-HOUSE STRING WAS NEEDED AT ALL, since the pack covered the flow: the label on
  the control that dismisses the confirmation has **no word in the pack**. In Jen's
  original that position belonged to the deferred reminder step, which went to slice 9
  with the rest of `§decisions-3`. Removing the reminder left the position without a
  label. The tension with UI Standards section 18 (buttons name the action, this one
  acknowledges) is recorded at the string
  (`screens/journey/removeCapture/copy.ts:157-177`) and was **resolved in favour of
  shipping it** at the approval. The absence of a marker there now means it was weighed,
  not that it was never questioned; revising the string reopens the section 18 tension.
- SHIPPED: a replacement pick screen for **time-anchored behavioral captures**. Jen's
  slot-matched menus verbatim from `Content Pack v1 §replacement-menus`. Single select,
  six options per slot, and a slot-matched neutral confirmation to end the flow.
  Non-behavioral captures and `timing = varies` keep the existing scaffolds and **never
  see a menu** — there is no slot to match, and a menu without a slot would be a generic
  list of suggestions, which is not what the content is.
- **DESIGN DECISION (Kyle, 2026-09-06): THE REPLACEMENT IS A SLOT-ANCHORED INTENTION, NOT
  A ROUTINE.** Stored as three absent-safe fields on `journeyStates` —
  `removeReplacementId`, `removeReplacementSlot`, `removeReplacementAt`. **The routines
  path was rejected, on two grounds that are independent of each other:**
  1. Seeding through `createRoutine` calls `deactivateRoutinesOfType`, so creating the
     seed would **silently deactivate a routine the user had authored themselves**. A
     capture flow that quietly turns off the user's own work is a data-loss defect
     wearing a feature's clothes, and it would have been invisible until they went
     looking for the routine.
  2. The non-destructive variant avoids that but requires **inventing duration, icon and
     colour content that nobody has authored**. That is unauthored content entering the
     app through an engineering decision, which is the thing the content gates exist to
     stop.
  Independently of both: **Jen's options are single actions, not multi-step sequences.**
  The routine shape was wrong for the content even before the two mechanics above.
- **ROADMAP CORRECTION.** "Routine seed" in the §5 3c-ii row was aspirational and never
  shipped under that meaning. The row is annotated in place, §3.4 style, rather than
  rewritten. **Any future promotion of a stored intention into an actual routine is a
  deliberate slice with authored content and an explicit user action — never a default,
  never a migration.**
- **MANIFEST STATEMENT — the first exercise of the deleteAccount sweep's standing rule.**
  This slice writes to `journeyStates` and to nothing else. `journeyStates` is already on
  the manifest at `functions/src/lib/accountDeletion.js:86`. **Verified by reading the
  manifest, not assumed from the sweep's Sept 6 entry.** No new collection, so no manifest
  change. Recording the check even when the answer is "no change" is the point of the
  rule: the failure mode it guards against is a slice that never asked.
- RULES: unchanged, and correctly so. The three new fields are accepted absent-safe by
  the existing `journeyStates` block (`firestore.rules:986-996`), which validates named
  fields and **has no `hasOnly` clause**, so an unlisted field is permitted rather than
  rejected. Had the block been written as an allowlist this slice would have needed a
  rules change and a deploy; it was not, so it did not.
- **SLOT INFERENCE, the one place the flow does not ask.** The sleep path never puts the
  timing question to the user; its evening slot is **derived from the sleep sub-answer**.
  Everywhere else in the capture the slot is user-stated. Flagged here because an inferred
  slot is a different kind of value from a stated one and a later reader should not assume
  uniformity. Walked.
- COMPLETION reuses the 3c-i parent-pop pattern with the `completedRef` latch. **No
  capture screen survives on the stack.** Walked, including system back and the
  swipe-back refusal.
- WALKS (Kyle's, 2026-09-06), all steps: morning and evening paths; `varies` and
  non-behavioral confirmed to show **no menu**; the Firestore field shape; the `routines`
  collection **byte-untouched before and after** (the direct check on the rejected design,
  rather than trusting that the code path is absent); offline retry **writes once**;
  VoiceOver across the six-row menu; xxxLarge text.
- SURFACING: **invisible today.** Nothing renders the stored intention until slice 5's
  phase detail page, which as a result now has **real user state to render on day one**
  rather than an empty shell. The ambient reminder that would make the intention feel
  live belongs to **slice 9**, per pack `§decisions-3`. The gap between storing the
  commitment and showing it back is real and is one slice wide by design, the same shape
  as 3b's dead-questions window.

**Sept 7, 2026 — slice 4a merged (d317c4d). Onboarding asks for a destination, and
explains the detour.** Branch commit ea58022. Row 4 split at this slice's Step 0; 4b
carries what was left out.
- Figures at merge: jest **3163 / 211** (from 3132 / 208) · tsc **149**, unchanged ·
  sentinel **173 -> 165**. Rules **191 / 2** and functions **53 / 4** carried unrun and
  labelled so: neither `firestore.rules` nor anything under `functions/` is in the diff.
- **SENTINEL -8, AND IT IS A FOURTH CASE.** Not an approval, not a new draft, not 3b's
  deletion-with-surface: eight drafted strings were **superseded by approved pack
  content**. The screens still exist and the questions are still asked; Jen's copy answers
  them now. Seven from `OUTCOME_COPY` and `OUTCOME_BLURBS`, plus `CAPACITY_COPY.title`,
  which is a CONSOLIDATION onto the existing daily string rather than a supersession.
  **Eight removals, zero additions.**
- **NO OWNER IS NAMED**, for the reason the 3b entry gives: nobody signed these off, and
  calling it an approval would report eight unreviewed strings as reviewed. What happened
  is that Jen wrote better ones. The 22 strings the slice ADDED are all hers, from Content
  Pack v1 sections A1, A2 and short-labels, and landed flat per the pack header.
- **THE PREDICTED ARITHMETIC AND THE MEASURED ONE DISAGREE, AND THE MEASURED ONE IS
  RIGHT.** The slice brief predicted **-7**: seven supersessions plus the capacity-title
  consolidation, less a **+1** for the redrafted capacity subtitle. The measured figure is
  **-8**, and the difference is entirely that subtitle. It replaced a string that was
  **already drafted** (`pending Jen`), so it is a **substitution with an owner change**
  (Jen -> Kyle), not a new draft: the marker moved, the count did not. Recorded because
  the predicted total (165) happened to match the measured total (165) by two errors
  cancelling, and a later reader reconstructing the delta from the prediction would get
  the wrong model of what the fourth case counts.
- **THE SHIM AT `resolveJourney.ts:195` WAS RE-HOMED, NOT DELETED, AND THAT IS A
  DECISION.** `capacitySeed` now comes from `userPrivate.capacitySeed`, written at the
  onboarding terminal, which is what §4 always specified. The old read off
  `weeklyCycles.capacityInitial` **survives as a LAZY fallback**.
  **Why it survives:** every existing beta account has no `capacitySeed` and never will,
  because re-homing only writes one at onboarding and they do not re-onboard. Deleting
  the read outright would therefore have pinned **all of them** to `'normal'` on their
  next launch, silently and with no error. That is the §3.4 amendment's failure arriving
  from the READ side rather than the write side, and it is the same correct-looking bug.
  The fallback narrows the shim to the accounts that need it instead of removing it out
  from under them.
  **Pinned by a test asserting the cycle is NOT read when a seed exists**, which is what
  stops the fallback quietly becoming eager: without that assertion the read could return
  and cost every journey user a Firestore read per resolve for a value never used. As
  shipped, rung (a) costs one read FEWER than before this slice. The two pre-existing seed
  tests MOVED rather than being deleted; two more joined them.
- **THE ARC-INSERTION TRAP, AND IT WAS WORSE THAN THE WARNING SAID.** `routes.ts:11-16`
  warns that `V3_ORDER` drives the stack order and the step numbers but NOT the navigate
  chain, so inserting a screen means repointing the one before it: **three edits**. It was
  **four**. `OnboardingV3ColdOpenScreen.tsx:25` also named the route literally
  (`V3_ROUTES.Outcome`), two files away from the rename. **tsc caught that one; no test
  would have**, because the arc would still have had ten correctly numbered steps.
  The suite added here pins the **ARC, not the registration**: it presses the CTA on step 2
  and asserts it lands on A2. **Mutation-verified** by repointing step 2 at Why, which
  fails one test and only one. A registration or `V3_ORDER` assertion passes on exactly
  that broken arc, which is the vacuous-green shape this repo has been caught by before.
- `PHASE_DISPLAY`'s throwing proxy is GONE and **all 48 strings are populated**. Slice 4a
  renders only the **16 `short`**, on the A2 route strip; `title` and `gloss` are populated
  and **held unrendered until slice 5**, the same pattern as 3a holding Jen's `whyItWorks`
  rather than sweeping it as dead code. Populating all three lengths at once was chosen
  over a partial fill because a second partial pass is how two halves of one delivery
  drift.
- **FIVE CELLS HAVE `short` IDENTICAL TO `title`, BY DESIGN** (focus/recover, calm/rewire,
  routines/recover, energy/remove, energy/recover). The test **pins those five as expected
  duplicates** rather than asserting distinctness. A distinctness test would fail
  correctly and would then be "fixed" by editing one of Jen's strings, which is the
  outcome the pin exists to prevent.
- Two structural moves the slice made rather than worked around, both for the
  screens-must-not-import-from-components rule: `CAPACITY_QUESTION` promoted to
  `constants/capacityCopy.ts` (one string, two surfaces, marker travelled with it,
  sentinel flat for it), and A2's copy to a new `constants/journeyCopy.ts` because Home
  renders it too. The vocabulary bridge also moved, to `journey/destinationBridge.ts`: it
  is two pure functions, and importing them from `resolveJourney` dragged Firestore and
  expo-constants into a screen test.
- **A2 FIRES ONCE, AND NOTHING STORES THAT.** `resolveJourney` reports `migratedFrom` only
  on the resolve that CREATES `journeyStates`; every later launch takes rung (a) and
  reports nothing. The document existing IS the guard, so there is no seen-flag to write,
  nothing to clean up, and no way for a failed write to strand a user behind the screen.
  Pinned on both sides: first resolve reports it, second does not.
- `OUTCOME_LABELS` SURVIVES. Onboarding stopped being one of its readers; `TodayHeroCard`
  and `CloseWeekEntry` still label `cycle.outcome` with it. `OUTCOME_BLURBS` is deleted.
  `activeOutcome` is no longer WRITTEN but the field is not retired: `resolveJourney` still
  reads it as the migration branch's second fallback, and every pre-slice account has a
  real value there.
- MANIFEST: **no new collection.** Writes reach `userPrivate`, `weeklyCycles`,
  `journeyStates` and `users`; all four are already on the manifest, `journeyStates` at
  `functions/src/lib/accountDeletion.js:86`, verified by reading it rather than trusting
  the 3c-ii entry. **`UserPrivate` gaining a field is not a new collection** and needs no
  manifest change: the sweep deletes documents, not fields.
- RULES: unchanged and none needed. `firestore.rules:742-745` gates `userPrivate` on the
  document ID with **no shape validation and no `hasOnly`**, so the new `capacitySeed`
  field is accepted as written. Had that block been an allowlist, this slice would have
  needed a rules change and a deploy.
- **WALK (Kyle's, 2026-09-07), all four destination arcs.** Destination-specific A2 bodies
  and strips confirmed on each. Firestore verified after finishing an arc: `capacitySeed`
  on `userPrivate`, `destination` + `phaseKey: 'remove'` on `journeyStates`, and the first
  weekly cycle **still writing `outcome`** as intended. The asymmetric pair checked
  directly: **"Switch off more easily" writes `stress`, not `calm`**. Migration path walked
  on a beta account with weekly history, **through two relaunches, with A2 appearing
  exactly once**. Regression pass clean on the daily picker, the Home hero and the close
  entry.
- **KNOWN GAPS, both dispositioned by Kyle on 2026-09-07 and neither fixed here:**
  1. **`maxFontSizeMultiplier` is absent from `OnboardingScaffold`** and therefore from all
     ten arc screens. It exists in **exactly one file app-wide**
     (`DailyPickerSheet.tsx:194`), so this is not a regression this slice introduced and
     not a gap it could close alone: the fix belongs to the scaffold, where it changes
     every arc screen at once. **Queued with the a11y / font-scaling batch.**
  2. **A2's phase strip renders as four small bulleted rows, and it should read as a
     PATH.** The screen's whole job is to make the user understand and want the sequence,
     and a bulleted list undersells it. Not a correctness defect; a design one. **Queued as
     an onboarding/journey-visual item, and to be scoped ONCE for two surfaces**: slice 5's
     journey map wants the same component, and building it twice is how the route and the
     map end up disagreeing about what a phase looks like.
- **4b RATIONALE, RESTATED HERE SO IT IS NEVER RE-DERIVED.** The first weekly cycle still
  writes an `outcome` because `ensureCurrentWeeklyCycle` writes
  `outcome: latest?.outcome ?? DEFAULT_ROLLOVER_OUTCOME` (`weeklyCycle.service.ts:251`) and
  that default is **`'focus'`** (`:74`). An outcome-less cycle therefore **does not stay
  outcome-less**: seven days later the 3b rollover invents one. A user who picked **Calm**
  would be shown **"Focus / Normal"** on their hero in week two, **with no error and no log
  line**. Stopping the onboarding write alone does not remove the outcome axis, it makes
  the axis lie. **4b's fence covers all three together** — the optional type
  (`types/models.ts:503` and `CreateWeeklyCycleInput`), both render sites
  (`TodayHeroCard.tsx:180`, `CloseWeekEntry.tsx:61`), and the rollover branch at
  `weeklyCycle.service.ts:251` carrying absence forward instead of defaulting. Splitting
  them across slices is what would leave the window open.

**Sept 7, 2026 — slice 4b merged (29116cc). The weekly cycle stops carrying an
outcome.** Branch commits 5fe20e2 plus the approval rider 21d71d8. Closes the clause
split out of row 4 at slice 4a's Step 0.
- Figures at close: jest **3179 / 211** (from 3163 / 211) · tsc **149**, unchanged ·
  sentinel **165**. Rules **191 / 2** and functions **53 / 4** carried unrun: neither
  `firestore.rules` nor anything under `functions/` is in the diff.
- **SENTINEL: 168 AT THE BRANCH, 165 AT THE CLOSE, AND BOTH ARE RIGHT.** `5fe20e2` landed
  `'Focus'`, `'Calm'` and `'Energy'` in `DESTINATION_SUMMARY_LABELS` as drafts, +3, owner
  Kyle. **Kyle approved all three on device on 2026-09-07 during the walk**, read in the
  summary line they occupy rather than off a list, and the rider `21d71d8` cleared the
  markers, -3. `routines` was never part of either move: it reads "Steadier days",
  approved via pack part one section 3 decision 2, and carried no marker at any point. The
  map landed three-drafted-one-approved and is now **fully approved**; that oddity is
  closed rather than left standing.
- The flat pin across the slice is a **+3 and a -3 on the same three strings**, one commit
  apart. Unlike the 3b/3c-ii pair that both parked on 173 with different sets, this is
  literally the same three: a reader diffing pinned numbers alone would see no movement
  across slice 4b and would be wrong twice.
- SHIPPED: `WeeklyCycle.outcome` and `CreateWeeklyCycleInput.outcome` are **optional**,
  which **executes §3.4 as written rather than amending it** — that section always said
  the write-set fields stay optional so legacy documents parse, and for this one it had
  never actually been done. New cycles write **no outcome**. The rollover **carries
  absence forward** and `DEFAULT_ROLLOVER_OUTCOME` is **deleted**. Both render sites branch
  **outcome -> destination -> neither**.
- **PRECEDENCE, AND IT IS LOAD-BEARING: A STORED OUTCOME WINS OVER A DESTINATION WHERE
  BOTH EXIST.** A migrated beta account has both, and the week it already ran keeps the
  label it ran under. Relabelling it would rewrite the user's own history, quietly, on a
  surface they use to remember what they did.
- **THE TWO UNIONS ARE NEVER CROSSED.** `OUTCOME_LABELS` is keyed
  `focus | stress | routines | energy`; `DESTINATION_SUMMARY_LABELS` is keyed
  `focus | calm | routines | energy`. Three keys are spelled identically and one is not,
  which is exactly what makes reusing one map for the other look safe in review. Pinned by
  a test asserting that `calm` renders **"Calm"** and **never** `OUTCOME_LABELS.stress`.
- **ABSENCE IS NEVER SUBSTITUTED.** No "Unknown", no default label. The hero's summary line
  opens on the capacity with **no separator**; the close entry **omits the detail line**
  and the acknowledgment stands alone. Substituting a value on a render path is the
  rollover defect moved later in the pipeline, and it would be no more visible there. The
  close-entry test also asserts the CARD survives, so "the label disappeared" cannot pass
  as "the whole card disappeared".
- **THE DEFAULT IS GONE, AND THAT IS THE WHOLE SLICE.** `DEFAULT_ROLLOVER_OUTCOME`
  (`'focus'`) is deleted; the rollover writes
  `...(latest?.outcome ? { outcome: latest.outcome } : {})`. A legacy cycle propagates its
  outcome indefinitely; a journey-era cycle propagates nothing. **Mutation-verified**:
  restoring the `??` default fails two tests, one asserting on the **value** and not only
  the key, so a restored default cannot pass by writing something else.
- **`DEFAULT_ROLLOVER_CAPACITY` IS DELIBERATELY KEPT.** Capacity is still required on every
  cycle and every reader expects a tier. A comment and a test both record why, because
  **"we deleted one default" is precisely the reasoning that would delete the other**.
- **FENCE CALL AT `useTodayCard.ts:265`.** The slice fence said STOP if absence handling
  needed the daily capacity loop. A **one-line absence guard** was made instead of
  stopping, on the grounds that it is a call-site guard rather than a change to protocol
  serving, and that the type change does not compile without it.
  **The consequence is recorded rather than smoothed over:** the flag-off path derives the
  phase from `cycle.outcome`, so **with `JOURNEY_IA` flipped OFF, an account onboarded
  after 4b has no daily action.** The flag ships ON, so nobody is in that state — but
  **the revert lever is now partial**: reverting would leave post-4b accounts without a
  daily action. The alternative was defaulting a phase, which serves content chosen from
  an outcome the user never picked, silently; serving nothing is visibly wrong, serving
  the wrong thing is not. **Not walkable** without flipping the flag on a post-4b account,
  which is why it is written down here instead.
- **TEST-FIXTURE NOTE WORTH KEEPING.** The first attempt at an outcome-less fixture used a
  cast, which **compiled against a type that still required the field** and would have
  hidden the one thing these tests exist to prove. The fixtures **omit `outcome` by
  destructuring** instead, so the omission itself type-checks.
- `outcomeForDestination` is RETIRED with its only caller, and its file carries a note not
  to reintroduce it: anything that appears to need an OutcomeKey from a DestinationKey is
  reaching for the retired axis. `destinationForOutcome` survives — it reads a legacy field
  to derive a live one and is not its round-trip partner.
- `CreateWeeklyCycleInput.outcome` is **optional and no longer supplied by anyone**. Kept
  rather than deleted so the function still mirrors the model field it writes, and written
  only when present: omitted, never nulled, because Firestore rejects `undefined` and a
  stored null would claim the week had no outcome rather than that the field does not
  apply. **If it still has no supplier by the time the JOURNEY_IA flag is removed, delete
  it** rather than leaving a parameter nothing sets.
- MANIFEST: **no new collection, and no collection changed.** The slice writes to
  `weeklyCycles`, already on the manifest, and **removes a field from an existing swept
  write**. The sweep deletes documents, not fields, so nothing there moves.
- RULES: **absent-safe, no change needed.** The `weeklyCycles` block validates ownership
  only, with no shape validation and no required-field list, so a document written without
  `outcome` is accepted exactly as one written with it.
- **WALK (Kyle's, 2026-09-07).** Legacy account: renders its outcome and **propagates it
  through a forced rollover**. Fresh account: **no `outcome` key at all** on the first
  cycle, the hero reads **Calm and not Stress**, and a forced rollover produces a
  **still-outcome-less** cycle with the destination label holding. Edge case and
  regression pass both clean.
- **OPEN NOTE FOR JEN, non-blocking.** The hero now labels weeks by destination:
  "Focus / Normal", "Calm / Normal", **"Steadier days / Normal"**. Three terse nouns and
  one phrase. Whether the short three should move to the register of the fourth, or the
  fourth to theirs, is **her call** — the four are revised together or not at all, which
  is recorded at the map.

**Sept 9, 2026 — slice 5a merged (ec943be). The Practices tab stops being a launcher
and becomes the journey map.** Branch commits 7cc57a2 plus the approval rider b9db7f4,
atop the docs split 1c33ceb. First of the three slices row 5 was split into.
- Figures at close: jest **3203 / 213** (from 3179 / 211) · tsc **149**, unchanged ·
  sentinel **165** (169 at the slice, **-4 on the rider**). Rules **191 / 2** and
  functions **53 / 4** are CARRIED UNRUN and labelled so: neither `firestore.rules` nor
  anything under `functions/` is in the diff. Suites +2: three added
  (`phaseStates`, `PhasePath`, `JourneyMapScreen`), one deleted with its screen
  (`PracticesHubScreen.test.tsx`).
- SHIPPED: `JourneyMapScreen` replaces `PracticesHubScreen` at `ROUTES.PillarPractices`.
  Four phase rows in destination language rendering `title` + `gloss` from
  `PHASE_DISPLAY` — the half populated and held unrendered since 4a — with row states
  derived from `journeyStates`. A shared `PhasePath` component draws the four as a
  connected path and is **adopted by `RouteStrip` in the same slice**, which closes 4a's
  known gap 2: **A2 now reads as a path rather than four bullets.** No copy changed on
  A2 and no screen did either.
- **THE ADOPTION PROOF IS THAT `RouteStrip.test.tsx` IS BYTE-UNCHANGED AND GREEN.**
  Neither A2 surface was touched: `OnboardingV3RouteScreen` and `MigrationRouteScreen`
  both render `RouteExplainerBody`, which renders the strip, and the strip became a thin
  call on the shared component behind identical props and identical testIDs. A rewritten
  strip suite would have proved nothing about whether behaviour held; leaving it alone is
  the assertion.
- **STATE DERIVATION: POSITION DECIDES FIRST, HISTORY ONLY BREAKS THE TIE.** Recorded
  here because it is easy to re-derive wrongly and the wrong version looks right.
  `stepBackToPhase` closes the departed phase with exitReason `'adjusted_back'` and moves
  the user BACKWARDS (`journeyState.service.ts:199-220`), so **a phase can carry a
  history entry while sitting AHEAD of where the user now is.** History-first would draw
  a completed check against a phase they are about to meet again. The rule is: current
  wins; anything after current is AHEAD whatever its history; anything before current is
  SKIPPED if its LAST closure says so and DONE otherwise. Pinned by its own test.
- **`skipped[]` IS DELIBERATELY NOT READ**, though the model carries it
  (`types/models.ts:818`). It is append-only and nothing clears it, so a phase jumped
  over, stepped back into and then genuinely completed would read SKIPPED forever. The
  last history entry for a phase is the current truth about it; the array is the record
  that it was once jumped. Both are correct about different questions and the map asks
  the first. A test pins that the two agree in every state the service can actually
  produce.
- **NOTHING IN THE APP PRODUCES DONE, SKIPPED OR `adjusted_back` TODAY.** `advancePhase`,
  `skipToPhase` and `stepBackToPhase` have no callers outside the service and its own
  suite; slice 7 owns the offers. Every real account is at `remove` with an empty history,
  so three of the four states are unreachable by using the app. All four are pinned by
  fixtures, and the walk exercised them by console-seeding `journeyStates`. That is the
  method to reuse when slice 7 makes them reachable for real.
- **THE FOUR DESTINATION CARDS WERE CARRIED ONTO THE MAP, NOT DELETED**, below a divider
  under the path. Step 0 found that `PracticesHubScreen` was the ONLY navigator to
  `ROUTES.PillarFocus` and `ROUTES.PillarStressRecovery` in the whole app: deleting the
  cards with the launcher would have taken both screens dark, which is the exact IA
  step-2 failure whose repair this slice's suite repoints. **5b moves them onto the phase
  detail pages**, and the same suite is what fails if one is dropped on the way.
- **MAP ROWS DO NOT NAVIGATE, AND A TEST HOLDS THAT SHUT.** There is no detail page to
  open in 5a, so rows carry no chevron, no button role and no handler; nothing invites a
  tap that would do nothing. The test fails if an affordance arrives without a
  destination, so **5b cannot add one without the other**.
- **THE NINE CARRIED STRINGS, AND WHY THEY ARE A FOURTH-AND-A-HALF CASE.** Four card
  labels, four descriptors and the `'Pick a place to start.'` intro moved verbatim into
  the new file with their markers and their pending-Jen owner. Nobody approved them,
  nobody redrafted them, and their surface did not stop existing — it was replaced by one
  that still renders them. So this is neither 3b's deletion-with-surface nor 4a's
  supersession-by-pack: **a MOVE is sentinel-neutral by definition.** The file path in the
  per-file listing changes and the number does not. The note above `EXPECTED_SENTINELS`
  says so, because nine drafts appearing under a new path otherwise read as nine new ones.
  This resolves the prediction the 2026-09-09 amendment asked the brief to make: they
  carried.
- **SENTINEL ACROSS THE SLICE: +4, -4, AND NINE RELOCATED.** The four map state labels
  (`'Where you are'`, `'Done'`, `'Ahead'`, `'Skipped'` in `PHASE_STATE_LABELS`) landed
  drafted, owner Kyle, taking the pin to 169; Kyle approved all four **on device during
  the walk, read on the map rows they occupy rather than off a list**, and the rider
  `b9db7f4` cleared the markers on the branch before the merge, -4.
  **THE PIN READS 165 AT 4a's CLOSE AND 165 HERE, ON A DIFFERENT SET.** Do not collapse
  this with the 4b case above it: 4b was a +3 and a -3 on three IDENTICAL strings one
  commit apart. This is four strings drafted and approved, plus nine relocated with no
  count change at all. A reader diffing the pinned number across 5a sees no movement and
  would be wrong three times.
- **TEST FINDING WORTH KEEPING: THE FRAMEWORK-WORD ASSERTION CANNOT BE A REGEX ON THE
  MAP.** `PHASE_DISPLAY.recover.energy.gloss` reads "Find the things that help you recover
  when you're running low." (`constants/journey.ts:168`) — the ordinary English verb
  inside Jen's approved copy, not the framework key leaking into the UI. A word-boundary
  regex fails on it, and **the only way to make it pass would be to edit one of her
  strings**, which is the outcome these pins exist to prevent. Both new suites assert
  EXACT match on the phase name standing alone, which is what section 8 actually bans.
  `RouteStrip` keeps its regex and stays green because `short` never contains one of the
  four.
- MANIFEST: **no new collection, and nothing written at all.** The slice's only Firestore
  contact is a READ (`getJourneyState`). `journeyStates` is already on the manifest at
  `functions/src/lib/accountDeletion.js:86`, **verified by reading it** rather than
  inherited from the 4a entry. Recording the check when the answer is "no change" is the
  point of the standing rule.
- RULES: unchanged and none needed. The slice reads `journeyStates` and writes nothing.
- **DEFERRED WITH REASONING, both 5b calls, neither an oversight:**
  1. **`useReducedMotion` is not wired.** The path is static — no entrance, no fill, no
     stagger — so there is nothing to gate, and a hook whose value nothing reads is
     coverage theatre rather than coverage. Stated in the component header: a revision
     that animates anything gates it then.
  2. **No Guide pill**, and this one CHANGED STATUS rather than staying settled. The
     launcher had none because a doorway is not a surface to describe, and the standing
     note said "revisit when the hub has content of its own". It now does. It is still
     left off because the pill is outside 5a's fence and because what the Guide may say
     about a user's journey is an open section 7 deliverable, not a wiring choice.
- **WALK (Kyle's, 2026-09-09), all steps.** Map in the `remove` state; all four cards
  reaching their destinations with working back paths; all three seeded states including
  the `adjusted_back` case that proves position-first; on-focus refresh after changing
  the phase underneath the app; an account with no `journeyStates` document rendering the
  cards and no path; A2 re-walked on BOTH the onboarding and migration paths; VoiceOver
  and xxxLarge text on both surfaces.
- **OPEN FOR JEN, non-blocking.** `'Done'` is the only one of the four state labels that
  could read as achievement rather than description, which is a register the rest of the
  map avoids. A flatter word is a one-string change if she wants it.
  *(ANSWERED 2026-09-09 in slice 5b-i: it reads **"Complete"**. Kyle's call, an approved
  string replacing an approved string, so the sentinel does not move for it. Annotated
  here rather than rewritten, and the arithmetic is recorded at the pin.)*

**Sept 9, 2026 — slice 5b-i merged (8cc461c). Four phase pages that explain the journey
rather than sell a toolkit.** Branch commits af8df3d and 3fe00a0, plus the copy rider that
follows this entry on main. First of the two slices row 5b was split into.
- Figures at close: jest **3226 / 214** (from 3203 / 213) · tsc **149**, unchanged ·
  sentinel **165** (170 at the merge, **-5 on the rider**). Rules **191 / 2** and functions
  **53 / 4** CARRIED UNRUN and labelled so: neither `firestore.rules` nor anything under
  `functions/` is in the diff.
- SHIPPED: four phase detail pages on ONE route (`ROUTES.JourneyPhase`, params `phase` +
  `destination`), reachable from every row of the journey map. `PhasePath` gained an
  optional `onPressPhase`; A2 stays inert because `RouteStrip` passes nothing, so neither
  onboarding screen nor `RouteExplainerBody` was touched.
- **A PHASE PAGE IS AN EXPLANATION, NOT A PRACTICE BROWSER** (Kyle, with Jen consulted,
  2026-09-09). Each page carries the destination's title and gloss from `PHASE_DISPLAY`,
  one body, a state eyebrow and a back path. No destination cards, no category cards, no
  practice lists.
- **THE LANES STAY SERVING-SIDE ONLY.** Downshift / Refill / Re-anchor never appear as page
  structure and are never mapped onto Energy's Regulate / Rest / Fuel. **Re-anchor having
  no Energy counterpart is EVIDENCE THE TWO TAXONOMIES ARE SEPARATE, not a prompt to invent
  a fourth category.** `§recover-lanes` answers "what should Vara favour for this user
  today", which is a serving question; it does not answer "what categories does this page
  show", which is the question nobody asked. A page offering three doors would have
  reintroduced the toolkit architecture that deleting the 5a launcher removed, one level
  down and out of sight.
- **CONSEQUENCE, LOGGED AS OPEN RATHER THAN SETTLED: the four destination cards stay on the
  map**, below the divider, unchanged. **Row 5b's re-house clause is superseded.** Every
  destination is reachable exactly as it was. **WHERE THE PRACTICE CATALOG ULTIMATELY LIVES
  IS AN OPEN IA QUESTION and this slice does not answer it** — it declines to answer it in
  a slice about explanations, which is different from answering it by leaving things where
  they are.
- **REVERSAL, RECORDED EXPLICITLY BECAUSE THE 5a ENTRY PREDICTED OTHERWISE.** 5a predicted
  the card block would die in 5b and take its nine drafted strings with it, a -9. **It did
  not.** The cards stay, so `'Pick a place to start.'` and the eight card strings are
  untouched and still pending Jen. The prediction is **deferred, not executed**; do not go
  looking for the -9 in this slice. Annotated at the map, in its suite, and at the pin.
- **NO PER-ROW PRESS OPT-OUT. Every row opens, including the ones AHEAD.** A path where
  only the current and completed rows led somewhere would draw the locked door the model
  does not have. This is section 8 applied to INTERACTION rather than only to copy: "Locked
  does not exist in the UI vocabulary" is not satisfied by avoiding the word while shipping
  the affordance.
- **`enteredAt` / `exitedAt` ARE DELIBERATELY NOT RENDERED.** Every history entry carries
  both, so a page could say how long a phase took. **A duration is a count wearing a date's
  clothes**, and section 8 bans the count.
- **`removeTargetText` IS ECHOED NOWHERE.** The remove page renders the resolved
  replacement label and nothing else, through a new absent-safe `labelForReplacement`
  (`screens/journey/removeCapture/routing.ts`) that returns null for a slot or id it cannot
  resolve. **Walked: a broken id makes the section VANISH ENTIRELY** — no empty row, no raw
  id, no stand-in for a choice the app can no longer name. The field's single echo point
  stays at the capture confirmation, where the user is looking at what they just typed.
- **NO GUIDE PILL, and the map's header no longer calls it an open question.** The Guide's
  stance, its data-access position and its crisis path are an open product deliverable; a
  pill on a surface that displays a user's journey creates expectations the product cannot
  yet honour. **No `context.screen` value is wired anywhere "ready for later"**, because an
  unused vocabulary entry is how the decision gets made by whoever types the next one.
- `'Done'` BECAME `'Complete'` (Kyle, 2026-09-09): an approved string replacing an approved
  string, **sentinel-neutral**, no arithmetic. It closes the open item the 5a entry left
  for Jen, which is annotated in place above.
- **THE 5a PAIRING PIN DID ITS JOB.** Map rows were pinned non-pressable precisely so the
  affordance and the destination had to arrive together, and they did. **Three 5a tests
  changed:** "no row is pressable in this slice" became "no row is pressable WITHOUT a
  handler" and gained an inverse; the map's four-card count is now scoped with `within` to
  the destinations block, because it used to count every `TouchableOpacity` on the screen
  and went to eight the moment rows became buttons; and **`RouteStrip.test.tsx` LOST ITS
  BYTE-UNCHANGED PROPERTY** by gaining one assertion. That property was 5a's adoption
  proof and has served it. A2's inertness is now asserted through what A2 actually renders,
  which is the stronger statement.
- **WALK-CAUGHT DEFECT — QUEUED, NOT THIS SLICE. A MALFORMED `history` FIELD BREAKS
  TODAY.** A `journeyStates` document whose `history` is an array containing a **string
  rather than a map** makes Today fail to load, with `Cannot convert undefined value to
  object` attributed to `useTodayCard`. Absent documents are handled everywhere; malformed
  ones are not. Produced by console seeding during this walk, but the same shape could
  arrive from a partial write or a future slice writing the field wrong.
  - **THE REPORT AND THE READ-ONLY CHECK DISAGREE, AND THEY ARE KEPT SEPARATE SO THE NEXT
    STEP 0 STARTS FROM THE DISAGREEMENT rather than re-deriving it.** `useTodayCard` **does
    not read `history` at all** — it consumes `PhaseContext` (`phaseKey`, `destination`,
    `removeFamily`, `enteredAtIso`, `capacitySeed`, `revisionToken`), and `resolveJourney`
    does not read it either. **The only reader in the app is `derivePhaseStates`**
    (`journey/phaseStates.ts:79`), where the shape is assumed twice in one line:
    `state.history.filter(...)` assumes an array and `entry.phaseKey` assumes each element
    is a map.
  - **ON THE EXACT SHAPE SEEDED, THAT LINE DOES NOT THROW.** `['a string'].filter` is fine,
    `entry.phaseKey` is `undefined`, the match set is empty and the phase resolves to
    `'done'` — **a wrong state word that looks correct, which is arguably worse than the
    exception.** The case that throws there is `history` absent or not an array, and it
    throws `filter is not a function`, which is not the reported message. **NOT
    REPRODUCED**, and none of this contradicts the observation: it says the reported
    LOCATION is not a reader of the field.
  - **SCOPE IT AS "THE READ BOUNDARY TRUSTS THE DOCUMENT", NOT "ONE FIELD IS NOT PARSED".**
    `getJourneyState` (`services/firebase/journeyState.service.ts:69`) spreads `snap.data()`
    through with no validation of any field, and the `journeyStates` rules block validates
    named fields with **no `hasOnly`**, so a wrongly typed field is accepted on write. Every
    journey read so far is hardened against ABSENCE and none against MALFORMATION.
  - **TWO CANDIDATE FIXES, FRAMED AND NOT CHOSEN.** (1) Defensive parsing inside
    `derivePhaseStates`: cheap, local, makes the derivation total, and silently absorbs bad
    data, which is how a wrong state word ships looking right. (2) A guard at
    `getJourneyState`: covers every present and future reader instead of each defending
    itself, but forces a product question first — **what IS a document with an unusable
    field: absent, partial, or an error?** That is a question about what Today shows, not
    about parsing. The second is the likely answer and the first is the likely temptation.
- **WALK (Kyle's, 2026-09-09), all steps.** All four pages across two destinations; the
  seeded Complete, Skipped and `adjusted_back` states, the last confirming a stepped-back
  phase reads Ahead and not Complete; on-focus refresh with the phase changed underneath
  the app; the remove page with a stored intention, with a retired id, and with no pick at
  all; a free-text account confirming no echo of the user's own words; A2 unchanged on both
  the onboarding and migration paths; VoiceOver and xxxLarge text on both the map and a
  page.
- **COPY RIDER, and it is not an approval.** Kyle **rewrote** all four phase-page bodies
  and the replacement lead-in on device during the walk and approved his own wording; the
  markers were cleared and the pin went 170 to 165 in a follow-up commit on main.
  **THE STRINGS ON DEVICE AT 8cc461c ARE NOT THE STRINGS THAT SHIP.** Anyone reconstructing
  this slice's copy from the merge commit will read five strings that were replaced hours
  later. Arithmetically a replacement behaves exactly like an approval, -1 per string,
  which is why the note at the pin says so out loud: the number cannot tell "approved five
  strings" from "rewrote five strings after rejecting them", and those are different facts
  about how much review the copy has had.

**Sept 10, 2026 — slice 5c merged (`55a403a`). Start here container; row 5 is complete.**
Branch commits `c381e07` (the slice) and `fe59c19` (a stub entry for the walk finding, now
absorbed into this one and deleted — both are not kept).
- Figures at close: jest **3259 / 217** · tsc **149** · sentinel **167** (+2, both DRAFTED,
  owner Kyle). Rules **191 pass / 2 skip** and functions **53 / 4** are carried forward
  UNRUN: neither `firestore.rules` nor `functions/` appears in the diff.
- **SHIPPED: `StartHereRow` over `VideoPlayerModal`,** mounted on the journey map below the
  title and above the path, where it holds ONE position across all three of that screen's
  states — loading, journey-absent and drawn. Under the path it would slide down the moment
  the `journeyStates` read landed, which is a layout shift on the calmest surface in the app
  for no gain. `VideoPlayerModal` and `useVideoSource` are byte-unchanged (§3.5), wrapped and
  never edited. **Built keyed by SURFACE from the first commit**, not Practices-only: slice 7
  mounts Today by passing a different key and its own gloss. Building it for one surface is
  how slice 7 ends up writing a second one, and the second build is the one that never happens.
- **DECISION 1, AND IT IS THE DECISIVE CALL IN THE SLICE: NO VIDEO MEANS NO ROW.** The
  container resolves the path on mount and renders NOTHING when it is null or fails to
  resolve — no row, no placeholder, no disabled affordance, no message. Absence and failure
  are the same outcome deliberately. **Both paths ship null, which is a departure from §6
  item 9's "placeholder path" and §6 item 9 is amended to record it.** A dead placeholder
  renders identically, because resolution fails and decision 1 treats failure as absence —
  what it ALSO does is fire a Storage round trip and an ungated `logger.error` on every
  Practices mount, for every user, until the file exists. A recurring error line about a file
  nobody has uploaded reads as a defect to the next person in the device logs.
- **THE RESOLVE GATE, WORTH KEEPING BECAUSE IT GENERALISES.** `useVideoSource` returns
  `{ url: null, loading: false }` on its very first render, before its own effect has run, so
  **"still resolving" and "resolved to nothing" are not distinguishable from the loading
  flag.** The row keys on `url` and never on `loading`, which answers both with nothing — the
  correct answer to each — and is why there is no flash. **Second gate:** the collapse marker
  is `boolean | null` with null meaning UNDECIDED rather than not-collapsed, so a
  maybe-collapsed marker cannot render an expanded row that collapses a frame later. Nothing
  renders until both answers are in.
- **ONE TAP, NOT TWO.** The row IS the button, and opening the video is what collapses it.
  There is no expand control, no chevron, and no second tap between a user and the thing the
  row offers; §18 wants one primary action, and a row whose first tap only revealed a second
  tap would fail that on a surface already carrying four destination cards. **The write
  happens on the way IN**, so a user who opens the video and kills the app has still opened it.
- **PERSISTENCE.** AsyncStorage, `@vara/startHereOpenedAt:{surface}:{userId}`, **uid-scoped
  from the first commit**, `logger.warn`-swallowed on both read and write per the
  `firstShiftFooterMarker` precedent (a failed read costs an expanded row, a failed write
  costs one more expansion; neither is fatal to the render). **A single key-construction site,
  not exported to production code** — read and write cannot drift apart.
  `hooks/useNotificationOptInCards.ts:27` remains keyed with no uid in it; that is recorded as
  a separate queued defect, deliberately **not copied and not fixed here**.
- **NO RULES CHANGE AND NO DEPLOY.** Paths stay under `focus-video/`, which
  `storage.rules:137-141` already opens to any signed-in user. A test asserts that any
  non-null path carries that prefix, so a future move to a better-named folder has to go
  through rules first rather than silently 403 every playback — the trap `coaching-auido` in
  the same file is still sitting in. The folder being named for the slice that created it
  rather than for what it holds is naming debt: recorded, queued, not paid here.
- **TWO STRINGS LEFT AT DRAFT DELIBERATELY, owner Kyle:** `'Start here'` and
  `'A short video on how this works.'` They **cannot be disposed of the way the 5b-i bodies
  were.** Kyle approves copy by reading it on the page it occupies, and neither string is on
  screen for any user until a video exists. Expect them to sit at draft across more than one
  slice; that is the correct state, not an oversight, and the sentinel carrying them at 167
  is the honest number.
- **WALK STATUS, STATED PLAINLY SO IT IS NOT LATER MISTAKEN FOR WALKED BEHAVIOUR.** The
  shipped state is INVISIBLE — both paths null — so **there was nothing to walk at merge.**
  Against a test clip the row was exercised and behaved: the collapsed state, on-tap open,
  persistence across relaunch, second-account uid scoping, and both the failed-path and
  null-path renders. **The FIRST-OPEN TRANSITION — marker absent, tap, gloss vanishes, marker
  written — was NOT observed on device.** Every observation was made on an account that
  already carried a marker. **Slice 7 is the first slice that both mounts a real video and
  validates that path, and its walk carries that burden.**
- **WALK-CAUGHT NON-DEFECT, RECORDED WITH ITS DIAGNOSIS BECAUSE THE INVESTIGATION IS THE
  USEFUL ARTEFACT.** The row appeared not to collapse: still expanded after closing the
  player and after a force-quit, which reads exactly like a marker that never persists. A
  temporary instrumented run settled it the other way. The mount effect read
  `marker=<present>` and set `collapsed` true on arrival, and every tap reported
  `collapsed=true willWrite=false`, under a **stable per-instance id — no remount, and no
  dep-change re-fire.** **The mechanism was correct; the account was already collapsed.**
- **WHAT THE RUN ACTUALLY EXPOSED, AND IT GOES TO SLICE 7 AS A DESIGN ITEM: the collapsed and
  expanded states are not visually distinguishable on device.** The gloss line disappearing
  was the only difference, and it did not register as a state change **to the person who
  specified the feature.** Framed as **revisiting a deliberate decision, not fixing an
  oversight**: `StartHereRow`'s own header argues the collapse is a de-emphasis rather than a
  state the user drives, and this is the evidence that de-emphasis-by-subtraction is too
  quiet to read as anything at all. **Constraint inherited by whoever answers it:** Today's
  three-card ceiling (§8) means the distinction has to fit inside a row's height, so
  "make it a card" is not available.
- **FOOTNOTE, since it was queried during this slice and resolved.** The tsc baseline is
  **149**; every §13 tsc figure has been correct since the Sept 1 entry. **158** was accurate
  as of Aug 15 and died with the `chore/legacy-removal` sweep, which deleted ten dead source
  files between the Aug 30 TB-3 pin and `ff8939e`. The stale figure lived only in CC's memory
  index, now corrected. Nothing in this document needed changing.

*Living document. Owner: Kyle. Update as slices close; do not edit §1–§4 during the freeze.*
