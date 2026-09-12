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
| 1 | **[DONE 2026-09-01, main at `ff8939e`]** Journey types, state, rules *(marker added 2026-09-10: the row carried no status at all, though §13's Sept 1 entry records slices 0-2 merged)* | `PhaseKey`, `DestinationKey`, `PhaseHistoryEntry`, `JourneyState` in `types/models.ts`; `journeyState.service.ts` (get/create/advance/skip/adjust/recordOffer); `firestore.rules` for `journeyStates` (owner read/write, shape-validated) + rules tests; `deleteAccount` list updated; derivations `deriveConsistentDays`, `deriveCalendarDays`, `deriveAdjustDue` as pure functions with tests. | rules tests pass; **[Kyle-gated]** rules deploy | No |
| 2 | **[DONE 2026-09-01, main at `ff8939e`]** Resolver + PhaseContext + migration branch *(marker added 2026-09-10 with row 1's; JOURNEY_IA shipped ON at this merge)* | `resolveJourney`; `useJourneyLanding` replacing `useWeeklyLanding` behind `JOURNEY_IA`; `useTodayCard(uid, phaseContext)`; `DashboardScreen` gate swap; migration branch wiring (route screen reuse deferred to slice 4; interim: write state and land on Today). | Step-0 confirms the four scalar reads are the only seam; STOP if more found | Yes: fresh account, legacy account |
| 3 | **[SPLIT into 3a, 3b, 3c-i and 3c-ii; never shipped under this number — see the AMENDED 2026-09-05 block below]** Matrix rekey + re-tag + outcome-pick retirement *(marker added 2026-09-10: the row carried no status. It is NOT covered by §13's Sept 1 entry, which records slices 0-2 only; all four successor rows are merged, so no work is outstanding here)* | §3.2 in full; `PHASE_DISPLAY` shape with placeholder strings; retire §3.6 items; `WeeklyCycle` write-set reduced per §3.4; analytics events rekeyed (`journey_*` replaces `weekly_open`; `weekly_close` survives renamed `weekly_reset`). | **[Content-gated]** re-tag mapping + at least one `remove` variant per capacity tier, authored as mark-done protocols with why-card text; STOP if unauthored cells would leave any (phase, capacity) empty | Yes: full daily loop across two phases |
| 3a | **[DONE `be58b97`, 2026-09-02]** Engine re-key + re-tag + shim removal *(row added 2026-09-05 to match §13)* | The engine speaks `PhaseKey` natively. Jen's three behavioral Remove protocols; retag confirmed (12 rows, zero edits); `legacyOutcomeFor` removed. Retired with the slice: `applyQuickWin`, `countWeeklyCyclesForOutcome`, week-number plumbing, `reshapeParity`. | Content gate met before merge (Remove protocols authored) | Done: real-content walk, all three tiers |
| 3b | **[DONE `7f07413`, 2026-09-04]** Weekly write-set reduction + `WeeklyOpenScreen` retirement + rollover *(row added 2026-09-05 to match §13)* | §3.4 write-set reduced to live-reader fields; `WeeklyOpenScreen`, `OpenYourWeekCard` and `weekly_open` deleted; expiry creates the next cycle in a create-on-absence transaction keyed `<uid>_<weekStart>`. Resolves §9 open item 8. | — | Done |
| 3c-i | **[DONE `701f2b4`, 2026-09-03]** Remove capture + families + crisis pre-check *(row added 2026-09-05 to match §13)* | Five-path Remove capture; three-family protocol model with family-aware serving and six Jen-approved mental/interpersonal protocols; acknowledgment rotation; client-side crisis pre-check with `SupportScreen`. | Crisis pre-check promoted to a precondition of this slice | Done: two defects caught on the walk |
| 3c-ii | **[DONE `74ff373`, merged `80ed0f7`, 2026-09-06]** Remove replacement pick + routine seed *(row added 2026-09-05; the slice was split in the §13 Sept 2 entry and never got a row here)* **"routine seed" is not what shipped — see the AMENDED 2026-09-06 block below.** | Curated replacement menus per time slot, one selection only, flow ends on a neutral confirmation; routine seed from the pick. **NO REMINDER SCOPE** — no notification infrastructure, no time picker, no nudge copy. | Content DELIVERED (`Content Pack v1 §replacement-menus` + `§decisions-3`). STOP if the menu appears to need a reminder to be useful; that is the signal the scope split was wrong, not licence to build it | Yes |
| 4 | **[SPLIT 2026-09-07 into 4a and 4b; see the AMENDED block below]** Onboarding: destination + route | A1 copy reframe on step 2; **new** route screen (A2) at step 3 (open item 1); Capacity step copy loses "this week"; terminal write creates `journeyStates` and the first weekly cycle without outcome; `activeOutcome` → `destination`; write order preserved (`completeOnboarding` last). Migration branch now shows A2. | **[Content-gated]** A1/A2 strings, 16 `short` strings | Yes: full arc + migration |
| 4a | **[DONE `ea58022`, merged `d317c4d`, 2026-09-07]** Onboarding destination + route, everything but the outcome | A1 at step 2 (`§A1`, subtitle dropped); **new** A2 route screen at step 3 with the route strip (`§A2`, `§short-labels`); capacity step asks the daily question; terminal writes `journeyStates` + `userPrivate.capacitySeed`, `completeOnboarding` last; `capacitySeed` re-homed off the cycle; migration branch shows A2 once. **The first cycle keeps writing `outcome` exactly as before.** | No content gate; no §9 item | Done 2026-09-07: four destination arcs, migration path with two relaunches, Firestore shape verified |
| 4b | **[DONE `29116cc`, 2026-09-07; walk not applicable, see entry]** Weekly-cycle outcome retirement *(row added 2026-09-07; split out of row 4 at slice 4a's Step 0. Marker reworded 2026-09-10: it read "walk pending", which read as an outstanding action. Kyle walked the slice on 2026-09-07 — legacy and fresh accounts, both rollovers. The one path that stays unwalked is the flag-off path, and §13's 4b entry records it as structurally unwalkable: it needs `JOURNEY_IA` OFF on a post-4b account, a state no user is in)* | `WeeklyCycle.outcome` and `CreateWeeklyCycleInput.outcome` become optional (`types/models.ts`, `weeklyCycle.service.ts`); guard both render sites (`TodayHeroCard.tsx:180`, `CloseWeekEntry.tsx:61`); **the 3b rollover at `weeklyCycle.service.ts:251` must carry absence forward instead of defaulting to `'focus'`**; retire `outcomeForDestination` (`journey/destinationBridge.ts`), which exists only for the cycle write. | Fence explicitly INCLUDES the daily-loop render sites and the weekly rollover; that is the point of the row | Yes |
| 5 | **[SPLIT 2026-09-09 into 5a, 5b and 5c; the `supportingPracticeIds` authoring is REMOVED from the slice, not deferred inside it; see the AMENDED block below]** Practices → journey map + Start here container | B1: `JourneyMapScreen` replaces `PracticesHubScreen` config launcher (same stateless shape); card states from `journeyStates`; phase detail pages re-house Focus hub (refocus), Energy/Stress/Routines/Sleep (recover); `StartHereRow` container over `VideoPlayerModal` with collapsed/expanded state persisted per surface; `explainerPath` data field. | **[Content-gated]** 16 `title` + 16 `gloss` strings; recover internal structure (detail page only; map ships without it) | Yes |
| 5a | **[DONE `ec943be`, 2026-09-09]** Journey map + the phase-path component *(row added 2026-09-09 with the split)* | `JourneyMapScreen` replaces `PracticesHubScreen` at `ROUTES.PillarPractices`; four phase rows carrying `title` + `gloss` from `PHASE_DISPLAY` (both already populated, held unrendered since 4a); card states derived from `journeyStates` (`phaseKey` / `history` / `skipped`), never stored; the phase-path component built ONCE here and adopted by `RouteStrip` in the same slice (4a known gap 2). Every destination the four hub cards reach today keeps a working entry point. Tab label, screen title and intro UNCHANGED. | No content gate, no §9 item, no build rule. Map state labels are in-house copy: named owner, sentinel increments | Yes |
| 5b | **[SHIPPED as 5b-i, `8cc461c`, 2026-09-09; remainder DISPERSED, see the 2026-09-09 block; the re-house clause below is SUPERSEDED]** Phase detail pages ×4 *(row added 2026-09-09 with the split)* | `refocus` re-houses the Focus hub; `recover` re-houses Energy, Stress Recovery and Routines under the `§recover-lanes` destination weighting; `remove` renders the 3c-ii stored intention, which is real user state on day one; **`rewire` ships as an explicit, scoped stub** — decided now, not discovered at Step 0. **Sleep is NOT re-housed** (see the AMENDED block below). | Page chrome is in-house copy. The catalog-to-grid bridge stays empty and is not this slice's problem | Yes |
| 5b-i | **[DONE `8cc461c`, 2026-09-09]** Phase explanation pages *(row added 2026-09-09 at the close)* | Four phase detail pages on one route (`ROUTES.JourneyPhase`, params `phase` + `destination`), reachable from every journey map row: destination `title` + `gloss`, one state-agnostic body per phase, a state eyebrow, back to the map. `PhasePath` gains an optional `onPressPhase`; A2 passes none and stays inert. Remove page renders the 3c-ii stored intention through an absent-safe resolver. **NOT a practice browser**, and the four destination cards STAY ON THE MAP. | No content gate, no §9 item. Five page strings drafted in-house then rewritten and approved by Kyle on device | Done 2026-09-09: four pages, two destinations, three seeded states, both remove-page paths |
| 5c | **[DONE `55a403a`, 2026-09-10]** Start here container *(row added 2026-09-09 with the split)* **Shipped with a NULL path, not the placeholder path this row and §6 item 9 specify — see the Sept 10 §13 entry and the §6 item 9 amendment.** | `StartHereRow` over `VideoPlayerModal`, collapsed/expanded state persisted per surface, `explainerPath` as a data field with a placeholder path (§6 item 9). Practices surface only; slice 7 mounts the Today instance. **Free-floating**: touches neither `PHASE_DISPLAY` nor `journeyStates`. | Videos are data, not a gate. `VideoPlayerModal` and `useVideoSource` are §3.5-unchanged and are wrapped, never edited | Yes |
| 6 | **[DONE `a19b54b`, 2026-09-10]** Weekly reset repurpose *(branch commits `ef26118` and rider `f0bac71`. Marked DONE at the merge; the prior **[Next]** note is kept below because its gate correction is still the record of what this row was and was not blocked on.* *Written at slice 5c's close; row 5 was complete and 6 was the next unshipped row.* **NOT content-gated — the §Content-gated tag in this row's Gates cell below is superseded.** *C1 was delivered in Content Pack v1 (`§C1`) and the 2026-09-05 amendment removed the gate; the engine contract is resolved at `§decisions-1`. Its one remaining gate is **§9 item 4**, ContinuityCard ship-or-retire — a DECISION, not content. Correction made 2026-09-10: the marking note first written at 5c's close called this row content-gated, which was wrong on both the amendment and the pack.)* | C1: `WeeklyCloseScreen` → one felt read + note; drop ratings and adjustment; write `phaseRead`, `phaseKeyAtRead`; `ContinuityCard` disposition per open item 4. | **[Content-gated]** C1 strings | Yes |
| 7 | **[PARTLY SHIPPED as 7a, `b1f5919`, 2026-09-10; 7b is adjustment]** Offers + Today additions *(SPLIT 2026-09-10 at 7a's merge; see the row below and the §13 entry. The row's scope is left unedited in the §3.4 style: 7a took the advancement screen, the offer surfacing rules, the Today journey line, the Today Start here row and the `journey_advance_*` events; 7b takes the C2 adjust screen and the `journey_adjust_*` events. The prior **[Next]** note is kept below because its ungating record still covers both halves.* *Marked 2026-09-10 at slice 6's merge. Ungated: §9 items 2, 3, 5 and 6 were all discharged in the 2026-09-10 resolutions block and B2/C2 arrived early in Content Pack v1. Build the `§decisions-4` conditional C2 body, never the pack's own section 5 version.* **Inherits three things from slice 6 rather than discovering them:** *the read is present-tense about the live week; `deriveAdjustDue` gets its first production caller here and `getWeeklyCyclesSince` its first ever; and `phaseKeyAtRead` exists so a read can be attributed to the phase it was given about. Slice 7 also owns the first real walk of `StartHereRow`'s first-open transition and of a mounted video.)* | B2 advancement screen (two copy variants: threshold-met, ceiling-met); C2 adjust screen with per-phase alternatives; offer surfacing rules (Today card day-of, then map; 3-day persistence per open item 3); Today journey line (D1); Today Start here collapsed row; `journey_advance_offered / _accepted / _declined / _skipped`, `journey_adjust_*` events. | **[Content-gated]** B2 ×2, C2 alternatives ×4 phases | Yes |
| 7b | **[DONE `82e398e`, merged `810dfa8`, 2026-09-11; walked steps A-G and attested before the merge]** Adjustment: C2, the re-arm and the cap *(row added 2026-09-10 at 7a's merge; scope left unedited below, and it shipped as written with three Step-0 amendments recorded in the §13 entry)* | C2 adjust screen on the `§decisions-4` conditional body, NEVER the pack's own section 5 version; per-phase alternatives ×4 mapped through `PHASE_ORDER` (the pack names them by ordinal, not by key); `deriveAdjustDue` gets its first production caller and `getWeeklyCyclesSince` its first ever; **§9 R5's re-arm**, which is a BEHAVIOUR CHANGE to `deriveAdjustDue` and not just a caller — today `adjustDeclinedAt` suppresses for the rest of the phase, and re-arm needs the decline instant used as a floor on which reads count; the **two-offer cap** as a named constant carrying its beta-tunable status in its comment, never a literal inside the derivation; the journey-page door for a capped user; `journey_adjust_*` events. **7a built the `adjust` branch of `journeyActionFor` and left it unreachable behind a literal `'hidden'`** — 7b changes one expression, not a signature, and the capture > adjust > advance ordering is already pinned by test. | No content gate: `§C2` and `§decisions-4` are delivered and §9 R5 is resolved. **Two strings the pack does not supply** and Step 0 must settle: the C2 DECLINE label (§3.1 and §8 both gloss it "keep going as is"; the pack has nothing) and whether R5's "still" names a SECOND-OFFER copy variant Jen has not written. Also unsettled: whether the adjust card uses R3's exposure model at all, which R3 scopes to advancement only | Yes |
| 7d | **[DONE `051b673`, merged `2807511`, 2026-09-11; walked and attested before the merge, six checks plus the offline check; branch `journey/slice-7d-exposure-gate`, pushed]** Advancement exposure gate: spend on the RENDERED slot *(row added 2026-09-11 from the 7b walk)* | `recordAdvanceExposure` fires on `placement === 'today'`, which is eligibility, not on the slot actually being occupied. Observed twice on device during the 7b walk: `advanceOfferedAt` stamped while the CAPTURE card held the slot, and again behind C2. R3's budget counts "occasions the user could actually have seen it" (`constants/journey.ts`), so a budget that drains behind another card is counting the wrong event. **Scope:** get `journeyActionFor`'s answer to `useAdvanceOffer` so the gate reads the rendered slot, and keep the gate-before-write ordering 7a made load bearing. **Step 0 REQUIRED:** this inverts the data flow between `DashboardScreen` and the hook, and the obvious fix (compute the slot inside the hook) would put the precedence rule in two places. **Also settle:** whether exposures already spent behind another card should be forgiven on existing accounts, or left as a one-time undercount. | None | Yes |
| 7e | **[DONE `20d0441`, merged `c6d03ee`, 2026-09-12; walked steps 1-6 and attested before the merge. Shipped as written, with ONE premise in this row corrected at Step 0: the coverage claim below is wrong, and the residual it hid is row 7f.]** Journey read-boundary guard: a malformed `journeyStates` row must not take Home down *(row added 2026-09-11 from the 7b walk)* | `resolveJourney` reads `phaseKey` and `destination` unvalidated (`:378-379`) and `JourneyLine` double-indexes `PHASE_DISPLAY[phaseKey][destination]` (`:63`, `:74`), so a key outside the union throws and an ErrorBoundary takes Home before any journey surface renders. **Reproduced on `main`** with a console-typed `"remove "` (trailing space), so it is pre-existing and not a 7b regression. A client cannot write such a row — `validJourney` gates `phaseKey` on create and update — so the producers are Admin-SDK writes: the console, the cohort reset script, or rows predating the rule. **Scope:** validate both fields in rung (a) against `PHASE_ORDER` and `DESTINATION_KEYS`, fall through to `'legacy'` on failure per the resolver's existing any-failure policy, and `logger.warn` with `uidDigest` and never the raw uid. One branch covers `JourneyLine`, `JourneyMapScreen` and `PhasePath`, which all read the same document. **Sequenced after 7d** because 7d corrupts a live metric every day it stands while this needs a malformed row to bite. | None | Yes: a seeded malformed row |
| 7f | **[Next]** Read-boundary guard for the two journey SCREENS: a malformed `destination` must not take Practices down *(row added 2026-09-11 from slice 7e's Step 0)* | **7e guarded the resolver and therefore Today, and nothing else.** `JourneyMapScreen.tsx:194` and `JourneyPhaseScreen.tsx:107` call `getJourneyState` directly and never pass through `resolveJourney`, so 7e's branch cannot reach them — the §13 7b entry's claim that one branch covered all three surfaces is corrected in a dated block there. **The residual is one field, not two:** a bad `phaseKey` is already harmless on these screens, because `derivePhaseStates` returns all-`'ahead'` for an unrecognised key (`phaseStates.ts:60-62`) and `PhasePath` indexes `PHASE_DISPLAY` from `PHASE_ORDER` rather than from the document. A bad `destination` still throws at `PhasePath.tsx:148,150` and at `JourneyPhaseScreen.tsx:129`. **Step 0 DECIDES THE SHAPE and it is a real fork, not a formality:** (1) route both screens' reads through a shared validating accessor, which puts one policy in one place and makes the resolver's guard a caller of it rather than a copy — but touches two screens' read callbacks and the service boundary; or (2) guard `PhasePath` and the phase page at the render, which is smaller and is the third and fourth copy of the same check. **Note for whoever takes it:** these screens fail SOFTER than Today did — the map's read already has its own try/catch (`:193-200`) and the page's does too (`:106-113`), so what is unguarded is the render, not the read. **CARRIED INTO THIS ROW FROM 7e SO THEY ARE NOT LOST (Kyle, 2026-09-11):** (i) **`toIsoDate` returns the STRING `"NaN-NaN-NaN"` on an Invalid Date.** `{ seconds: NaN }` passes the `typeof === 'number'` check in both timestamp readers, `toIsoDate` uses `getFullYear`/`getMonth`/`getDate` rather than `toISOString` (`weekStart.ts:45-49`), and the result is truthy, so it does NOT take the empty-string path that suppresses the consistency read. As the adjust re-arm floor it sorts above every real ISO date (`'N'` is 0x4E, `'2'` is 0x32), so `weekStart > armedFromIso` is false for every week and **the adjustment offer becomes permanently unfireable for that document, with no log line.** **Fix: return `''` on an invalid date, plus a test.** (ii) **`history` has no array check at `phaseStates.ts:79`** — `state.history.filter` throws for any phase past the first when the field is not a list. (iii) **WALK-FIXTURE NOTE, and it is a limit rather than a finding:** no code path writes `destination: 'stress'` and `firestore.rules:987` refuses it, but **whether a live row carries one was never checked against production data.** The 7e answer was established from the write paths only. Anyone seeding this walk should not read that as "the collection is clean". | None | Yes: the same seeded malformed row as 7e, with `destination` broken instead of `phaseKey` |
| 7c | Honour the recorded adjustment *(row added 2026-09-10 at 7b's close)* | Consume `journeyStates.adjustChoice` in the protocol serving path. 7b RECORDS the user's choice among the twelve in-phase alternatives and does not act on it: nothing outside `journeyState.service.ts` reads the field, and the C2 confirmation ("We'll work it this way for now") is worded for exactly that state. This row closes the gap. **Step 0 REQUIRED** and it is not a formality: the twelve alternatives mean four different things to the engine (shrink the protocol, swap the approach at the same target, re-target, re-slot, re-cue, re-narrow), and what `selectProtocol` can currently express of that is unestablished. Settle what the engine already supports before anything writes a second selection input. **Also settle:** whether a recorded choice persists across a phase change (today `CLEARED_OFFERS` nulls it, which is right while nothing consumes it and may not be once something does), and whether choosing re-arms the weekly read the way a decline does. **Carried from 7b:** the door's write has NO in-flight guard (`onChoose` in `JourneyPhaseScreen.tsx` sets no pending state), which is harmless while the write settles and leaves the page silent when it does not; 7c is already in this code and is where that pending state belongs. | Engine capability, per Step 0 | Yes |
| 8 | **Moments of joy** | `moments/{uid}_{ts}` collection (rules, deleteAccount), one-tap entry sheet from D1 below-fold row, single-line input, no list surface on Today; feeds nothing until Insights ships. | rules; **[Content-gated]** copy | Yes |
| 9 | **Behavioral protocol screen + remind-later** | The Daily Action Launcher behavioral screen (protocol, why, mark done, remind me later) for `remove` protocols; one-off later-today notification (`scheduleLocalNotification` DATE trigger), `scheduledAt` on `DailyLog`, third card state, cancellation bookkeeping; OS-settings redirect after denial. | Completion semantics decision (mockup v1 E1 open item) | Yes |

> **AMENDED 2026-09-11 (7b walk). TWO DEFECT ROWS ADDED, AND TABLE ORDER IS EXECUTION ORDER
> WHERE IT DISAGREES WITH THE LETTERS.**
>
> Rows **7d** and **7e** were added after slice 7b's device walk and sit ABOVE 7c in the
> table. The letters record when a row was ADDED; the table order records the sequence the
> rows run in, and here they disagree on purpose.
>
> **7c WAS NOT RENUMBERED, deliberately.** Slice 7b's shipped code cites it by name in four
> files — `types/models.ts`, `services/firebase/journeyState.service.ts`,
> `constants/journeyCopy.ts` and `screens/journey/JourneyPhaseScreen.tsx` — and renumbering a
> row that merged code already points at is the doc-symbol swap that costs an afternoon later.
>
> **EXECUTION ORDER: 7b merge → 7d → 7e → 7c → 8.** Kyle set 7d immediately after the 7b
> merge, before 7e and before slice 8, and **CONFIRMED the full sequence including 7c's
> position on 2026-09-11.** It is settled, not inferred.
>
> **7c's `[Next]` marker is cleared by this block**, since 7d now holds that position.
>
> **THE 7a POST-MERGE EXPOSURE-BUDGET OBSERVATION IS VOID UNTIL 7d LANDS.** The §13 7a entry
> books a three-calendar-day observation for 2026-09-11 to 09-13; it would be measuring a
> counter that increments on the wrong event. Do not run it and do not record a result
> against it until the gate is fixed.
>
> > **AMENDED 2026-09-11 (7d walked). THE OBSERVATION IS REBOOKED, NOT DISCHARGED, AND THE
> > DATES ABOVE ARE DEAD.** The block above is left unedited in the §3.4 style. The window
> > reopens on 7d's merge and not on its walk: three real calendar days, counted from the
> > merge, **on a FRESH account**.
> >
> > **7d MERGED AS `2807511` ON 2026-09-11, so the window is 2026-09-11 to 2026-09-13.**
> > Dated here rather than left as "from the merge", because an obligation with no start
> > date is one nobody can tell is overdue.
> >
> > **The fresh account is the substance, not the convenience.** `CLEARED_OFFERS` only heals
> > an inflated `advanceExposures` at a phase boundary, so any account that opened Today
> > before 7d merged carries a counter already spent behind cards it never drew. Observing
> > one of those measures the old defect with the new code and reads as a pass.
> >
> > **Nothing may be recorded against the 7a entry's 09-11 to 09-13 window.** It expired
> > unrun, on purpose.
> >
> > **AMENDED 2026-09-11 (slice 7e's Step 0). A THIRD DEFECT ROW, 7f, AND THE ORDER IS
> > NOW 7e -> 7f -> 7c -> 8.** The blocks above are left unedited.
> >
> > 7f exists because **7e's own scope fence was narrower than row 7e claimed its fix
> > would be.** The row said one branch in the resolver would cover `JourneyLine`,
> > `JourneyMapScreen` and `PhasePath`; the two screens read `journeyStates` directly
> > and never pass through `resolveJourney`, so it covers the first only. 7e is built
> > and committed as written, and 7f is the rest of the same defect rather than a new
> > one.
> >
> > **7f SITS DIRECTLY AFTER 7e AND BEFORE 7c**, on the same reasoning that put 7e after
> > 7d: it needs a malformed document to bite, and it is already reproducible with the
> > seed the 7e walk uses. Do not let it drift behind 7c, which is a feature row — the
> > two halves of one crash should not be separated by a slice that changes behaviour.
> >
> > **7c's position is unchanged from Kyle's 2026-09-11 confirmation.** Inserting 7f
> > does not renumber or re-argue anything below it.

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
- **Advancement recognizes; it never grants permission.** Recognize -> offer -> preserve
  choice. Never achieve -> unlock -> reward, and never enumerate what the next phase contains.
  Vara may recognize what the user has been doing; it must never imply they earned permission
  to continue. **This supersedes the trailing clause of the no-counter tripwire above, "The
  advancement screen names practices"** — that clause is left unedited; it is this same
  question decided the other way, before the register was settled. *(Kyle, 2026-09-10;
  standing rule for every advancement state, not slice 7's alone. Full reasoning at §9 R2.)*

> **STANDING PRINCIPLE — ADDED 2026-09-10 (Kyle). ASK ONLY FOR INFORMATION THAT CHANGES HOW
> VARA HELPS NEXT.**
>
> Capacity changes today's practice, so ask it. Available time changes today's practice, so
> ask it. A weekly not-moving read changes the approach, so ask it. A continuity count changes
> nothing Vara serves, so do not show it. Confirmation that the user really did the thing does
> not improve Vara's next action, so believe the tap. Whether they tapped "Do it now" is
> useful interaction state and is not evidence of completion.
>
> This is the durable form of the rule the brand docs have been applying case by case: it
> decides new feature ideas in advance rather than requiring a values argument each time. Vara
> can know a great deal internally while staying light to use.
>
> *Decided alongside the §9 resolutions of the same date, and generalized from them: §9 R4
> (the continuity count) and §9 R7 (completion is declared, never verified) are this principle
> applied to two surfaces. New surfaces are decided against the principle, not against those
> two precedents.*

---

## 9. Open items carried (decide before the slice that needs them)

| # | Item | Needed by | Lean |
|---|---|---|---|
| 1 | Route screen position: step 3 (after destination) vs Jen's step 5 | Slice 4 | **RESOLVED 2026-09-05: step 3.** Content Pack v1 part one, section 3, decision 1 |
| 2 | Ceiling-met advancement copy register | Slice 7 | Honest, no practices named, door open → **RESOLVED 2026-09-10** (lean held and sharpened), block **R2** |
| 3 | Advancement card persistence on Today | Slice 7 | 3 days, then map only → **RESOLVED 2026-09-10: lean REJECTED** (exposures, not elapsed days), block **R3** |
| 4 | Continuity: ship (floor question survives in C1) or retire | Slice 6 | Retire for beta; revisit with data → **RESOLVED 2026-09-10: retire** (lean held), block **R4** |
| 5 | Adjust counter re-arm after "keep going as is" | Slice 7 | Re-arm; copy acknowledges the prior choice → **RESOLVED 2026-09-10: re-arm, but the copy clause is REJECTED**, block **R5** |
| 6 | Today journey line: `short` string vs a stage word | Slice 7 | `short` → **RESOLVED 2026-09-10: `short`** (lean held), block **R6** |
| 7 | Evening-protocol completion semantics (commit-time vs follow-through) | Slice 9 | Commit-time → **RESOLVED 2026-09-10: lean REJECTED**, user-declared or naturally completed, block **R7** |
| 8 | `WeeklyOpenScreen`: collapse to weekStart+confirm, or retire and create cycles on rollover | **RESOLVED Sept 1: retire; rollover creation is a slice 3b requirement** (under JOURNEY_IA the weekly open is unreachable, so expired weeks must self-renew or the weekly reset ritual dies) | — |
| 9 | "Steadier days" vs "Routines" as the destination label | Slice 4 | **RESOLVED 2026-09-05: "Steadier days".** Content Pack v1 part one, section 3, decision 2. Governs the DESTINATION label only; the Practices hub card is a separate string |

> **RESOLVED 2026-09-10 (Kyle). ITEMS 2, 3, 4, 5, 6 AND 7 ARE ALL DECIDED. §9 CARRIES NO OPEN
> ITEM.** The item text and the Lean column above are left unedited in the §3.4 style. **The
> Lean is what was thought before the decision, not what was decided** — three of these six
> leans were rejected in whole or in part, and the rows say which. Cite these as **§9 R2**
> through **§9 R7**. The gate sweep at the end of this block is part of the resolution.

**R2 — Ceiling-met advancement copy register: RECOGNIZE -> OFFER -> PRESERVE CHOICE.**

> Never **achieve -> unlock -> reward**. The card recognizes what the user has been doing,
> offers what is next, and leaves the choice visibly theirs.
>
> **DO NOT ENUMERATE WHAT THE NEXT PHASE CONTAINS.** It reveals itself after the user chooses
> to look. Enumeration is what turns the card promotional: a list of contents is a pitch, and
> a pitch has to be sold. Withholding it keeps the offer honest — the user is choosing to
> look, not accepting a described package.
>
> **STANDING RULE FOR ALL FUTURE ADVANCEMENT STATES, NOT SLICE 7's ALONE: Vara may recognize
> what the user has been doing; it must never imply they earned permission to continue.**
> Every practice is runnable always (§8), so permission was never Vara's to grant, and copy
> that implies otherwise invents a lock the product does not have. Carried into §8 as a
> tripwire so it decides the next advancement surface without this block being re-read.
>
> **THIS OVERTURNS A STANDING §8 CLAUSE, WHICH IS WHY IT IS CALLED OUT RATHER THAN ASSUMED.**
> §8's no-counter tripwire ends "**The advancement screen names practices**". It does not.
> That clause was written when the register was undecided and naming practices looked like the
> honest alternative to a number; the decision above is that **a list of contents is a pitch**
> whether or not the items are practices. The §8 line is left unedited in the §3.4 style and
> superseded by the new tripwire added there on the same date. The lean recorded in the table
> ("no practices named") always pointed this way — the tripwire was the outlier, not the lean.

**R3 — Advancement card persistence on Today: 3 ELIGIBLE TODAY EXPOSURES, max one per calendar day, hard cap 7 calendar days, then map only.**

> **THE LEAN'S UNIT IS REJECTED.** It read "3 days, then map only". **Calendar days alone are
> a poor proxy for whether the offer was seen:** a user who does not open the app for two days
> has not been shown anything, and a time-only rule spends the offer on days they were absent.
> Persistence is therefore counted in **exposures the user could actually have seen**.
>
> - **3 eligible Today exposures**, **maximum one per calendar day**.
> - **Hard cap 7 calendar days**, after which it demotes to the map whether or not three
>   exposures were spent. The cap exists so a rare opener cannot carry a stale offer for a
>   month.
> - **Dismiss** ("Keep working here") removes it **immediately**. **Accept** resolves it.
>   **Ignoring it consumes one exposure** — that is what an exposure is for.
> - After demotion: **no badge, no "you haven't responded" language, no re-promotion.** The
>   map is where the offer lives after that, not a quieter place to keep asking.

> **AMENDED 2026-09-11 (slice 7d). AN EXPOSURE IS THE CARD DRAWING, NOT THE OFFER
> QUALIFYING — AND THE SLOT IS FLICKER-FREE BY RULE.** R3 above is left unedited in the
> §3.4 style; it always meant this, and until 7d the code did not.
>
> **"Occasions the user could actually have seen it" is measured at the RENDERED SLOT.**
> Today has one journey-action slot and `journeyActionFor` decides who occupies it: capture
> beats adjust beats advance. Being *eligible* for that slot is not being *in* it. Until 7d
> the exposure was spent on eligibility, so the budget drained behind the capture card and
> behind C2 and a user could meet the offer already demoted to the map, never having seen it.
>
> **STANDING RULE, NOT SLICE 7d's ALONE: no offer may spend a budget, stamp a
> qualification, or emit an analytics row on a frame it did not draw on.** It binds every
> future offer that joins this slot, and it is the general form of the defect — the adjust
> door had the identical bug for a different reason and cost more (§13, 7d).
>
> **AND THE SLOT NEVER SWAPS.** Home withholds the whole journey-action slot until every
> input has answered, including the asynchronous weekly read, so exactly one card draws and
> it draws once. A card that appears and is replaced under the user's eyes is a load-stagger,
> which **§18 Interaction bars outright** — so the swap was never merely cosmetic, and
> "it is only one frame" is not an argument for reintroducing it. **The gate belongs on the
> INPUT side**, at the one `journeyActionFor` call site. Not in the JSX, which would make the
> priority readable off the markup that `journeyActionFor` exists to keep it out of; and not
> as a pending value inside `journeyActionFor`, which would give a precedence function a
> loading state. **Anything new that feeds the slot must answer before the slot resolves,
> not after.**

**R4 — Continuity: RETIRE FOR BETA. `ContinuityCard` does not ship, and there is no replacement Today metric.**

> **A visible count of consistent days is functionally a streak whatever it is called.** It
> teaches "can I keep this number going" alongside "did today help", and **those two
> incentives eventually conflict** — on the day they do, the number wins and the practice
> loses. §8 already says **no counter, ever, anywhere**; this is that rule applied to the one
> counter that had an argument for it.
>
> **NO REPLACEMENT TODAY METRIC.** The opacity concern the card was answering is **real** — a
> user should be able to tell that something is happening — and it is solved
> **qualitatively**: the app noticing out loud, and the journey visibly progressing. Not with
> another number wearing a different name.
>
> **REVERSIBLE, AND THAT IS PART OF THE DECISION.** If beta users miss it, reinstating is a
> small slice. Retiring it now means beta measures the product **without** the counter, which
> is the condition there is no data on; shipping it means never learning whether it was
> needed.
>
> **Consequence for §3.4, left unedited there:** its conditional "`floorMet` survives **only
> if** continuity ships" now resolves to **`floorMet` does not survive**. That is the
> conditional discharging as written, not a new decision.
>
> **Consequence for slice 6:** its last gate is discharged and the row's "`ContinuityCard`
> disposition per open item 4" reads **retire**. The transitional ContinuityCard suppression
> shipped with 3c-i (§13, Sept 3, "transitional until 3b/slice 6") stops being transitional.

**R5 — Adjust counter re-arm after a decline: RE-ARM, capped at two proactive offers.**

> After "keep going as is" the counter **re-arms**: **two further consecutive `not_moving`
> reads offer again.** A decline answers this week, not the practice.
>
> **THE LEAN'S COPY CLAUSE IS REJECTED.** It read "copy acknowledges the prior choice". The
> copy carries the continuity with the word **"still"** and nothing more. **No narration of
> the prior choice** — "you chose to keep going last time" **reads as a case file**, and being
> quoted back to yourself is the opposite of the peer posture §8 requires of a decline.
>
> **CAP PROACTIVE OFFERS AT TWO.** After a second decline Vara **stops surfacing** the adjust
> offer on Today. "Try a different approach" **stays available from the journey page**: the
> door is open, Vara just stops knocking.
>
> **THE CAP IS A BETA-TUNABLE, NOT A LAW.** The trigger is a genuinely stuck user, and whether
> two is the right number is **a thing to watch rather than settle now**. Build it as a named
> constant with the tunable status in its comment, not as a literal inside the derivation.

**R6 — Today journey line: the approved `short` field, styled as a quiet eyebrow.**

> D1's journey line renders **`short`** (`Content Pack v1 §short-labels`, 16 strings, approved
> on delivery 2026-09-06). `PhaseDisplayCopy` (`constants/journey.ts`) already documents the
> field as the route strip **and the Today journey line**, so this is the field arriving where
> it was specified.
>
> **STAGE WORDS ARE REJECTED.** "Stretch 2", "Stage B" are **implementation concepts wearing
> UX clothes**: they mean nothing without a legend, and a legend on Today is a second thing to
> read before the daily action. §8's framework-words tripwire is the same instinct one level
> down.
>
> **STYLE: A QUIET EYEBROW.** A small label line above the `short`, **in the same pattern the
> phase pages already use for their state word** (5b-i's state eyebrow) — reuse, not a new
> idiom. **Never a card and never a CTA competing with the daily action:** §8's three-card
> ceiling holds and the journey line is a text row.

**R7 — Evening-protocol completion semantics: USER-DECLARED OR NATURALLY COMPLETED.**

> **THE LEAN IS REJECTED.** It read "commit-time", which would mark the protocol done when the
> user taps "Do it now". **"Do it now" and "Done" describe different events, and a control
> must not claim an outcome it did not produce.**
>
> The rule:
> - Tapping **"Do it now"** opens the action and **keeps the user on the surface**.
> - The user taps **"Mark it done"** when they have done it.
> - A **Vara-guided practice completing in the player** is **natural completion**.
> - **Starting, committing or scheduling is NOT completion.**
> - **Vara NEVER follows up to verify.** Believe the tap.
>
> **CONSEQUENCE FOR SLICE 9's STEP 0, written here so it is designed rather than inherited:
> committed and completed become DISTINCT STATES and the model must carry both.** Row 9's
> `scheduledAt` and third card state land **on top of** that distinction, not beside it. Step 0
> establishes what today's `DailyLog` actually stores before anything writes a second state;
> collapsing the two back into one field is the failure this resolution exists to prevent.

> **GATE SWEEP, 2026-09-10. NOTHING IN §5 OR §9 IS DECISION-GATED AFTER THIS BLOCK.**
>
> **§9:** all nine items are resolved — 1 and 9 by Content Pack v1 (2026-09-05), 8 by slice 3b
> (2026-09-04), and 2, 3, 4, 5, 6, 7 here. No item is carried.
>
> **§5:** **slice 6's** single remaining gate was item 4 — discharged, and row 6's marking note
> named it as the last one. **Slice 7's** gates were items 2, 3, 5 and 6 — all four discharged;
> the 2026-09-05 pack block's "**Remaining gates are decision-only:** §9 items 2, 3, 5, 6" is
> left unedited above and is **superseded here**, as is its "Slice 6 is decision-gated on that
> one item". **Slice 9's** Gates cell reads "Completion semantics decision (mockup v1 E1 open
> item)" — that is item 7, discharged. Rows 0-5c are shipped and carry no gate.
>
> **WHAT REMAINS ANYWHERE IN §5 IS CONTENT, NOT DECISIONS**, and none of it blocks the next
> row: **slice 8** copy (Moments of joy) is still content-gated on Jen; the
> `supportingPracticeIds` table is Jen's clinical judgment and its slice is gated on the table
> arriving (2026-09-09 amendment, item 1), which is not a §5 row; and the tab-label /
> map-screen-title question is routed to Jen with the four destination labels (2026-09-09
> amendment, item 4, and §13's 4b open note), affecting no built row. **Slice 6 and slice 7 are
> both fully unblocked.**

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

> **ANNOTATED 2026-09-10 (slice 6). `weeklyCycles.closeNote` IS AN INPUT TO THE TWO INSIGHTS
> ITEMS ABOVE, and this note exists so it is not mistaken for dead data.**
>
> The weekly reset writes a free-text note that **nothing in the app reads**, deliberately
> (Kyle, 2026-09-10). It is **user reflection destined for Insights**, not telemetry: it is
> permanently barred from the analytics payload by `types/analyticsEvents.ts`, which is the
> content firewall's single most-stated rule. The field has been written since the weekly
> close shipped and has never had a reader.
>
> **THE DEPENDENCY IS RECORDED IN BOTH DIRECTIONS ON PURPOSE.** The reset's own comments say
> the note is for Insights; without this half, whoever builds **Insights data view** or the
> **reframe layer** would reasonably scope it from `dailyLogs` and phase history alone,
> because those are the collections the journey model talks about. Stored weekly notes are
> the qualitative half, they accumulate one per user per week from now, and they are the
> highest-value qualitative data in the product (spec 8.3).
>
> **CONSEQUENCE FOR THE RESET'S COPY, which is not Insights' problem but is caused by it:**
> `noteQuestion` and `notePlaceholder` must not promise a return that has not shipped. Today
> they ask and say nothing about where the answer goes, which is honest while nothing reads
> it. The day Insights reads these, that copy is revisited **as part of that slice**.

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

**Sept 10, 2026 — slice 6 merged (`a19b54b`). The weekly close becomes the weekly felt
read.** Branch commits `ef26118` (the slice) and `f0bac71` (the close-language rider).
- Figures at close: jest **3223 / 214** · tsc **149** · sentinel **148** · lint errors
  **1102**. Rules **191 pass / 2 skip** and functions **53 / 4** carried forward UNRUN:
  neither `firestore.rules` nor `functions/` appears in either diff. **Gate keys attested by
  Kyle on 2026-09-10.**
- **SHIPPED: five questions became one.** `WeeklyCloseScreen` asks Jen's C1 question, flavoured
  by the user's destination (`Content Pack v1 §C1`), with three answers and an optional note,
  and writes `phaseRead` + `phaseKeyAtRead`. Retired with their surfaces: the three 1-to-5
  ratings, the floor question, and the four adjustment options. `ContinuityCard` and its whole
  chain removed — the card, `weeklyContinuity.ts`, `computeContinuity`, `WeeklyRecord`, the
  engine barrel export, the three copy strings, `useTodayCard`'s continuity read and its
  `isClosed` dep. `floorMet` left the screen, `CloseWeeklyCycleInput` and the write, which is
  §3.4's conditional discharging as written.
- **`same` -> `unclear` IS A SEMANTIC CHANGE, NOT A RENAME, AND THE CHECK IS ANSWERED.**
  `derive.ts:162-166` asked for production verification rather than a repo inference, on the
  grounds that surviving `same` values could not be silently relabeled. **Kyle ran it: a
  collection-group query on `weeklyCycles` filtered `phaseRead != null` returned ZERO
  documents.** Nothing had ever written the field, in the repo or in production, so the
  re-spec carried no migration and rewrote nothing a user had said. `PhaseRead` is now
  `'moving' | 'not_moving' | 'unclear'`. `deriveAdjustDue` needed **no logic change**: the
  `every` already required two literal `not_moving` values, so `unclear` broke a run by
  construction before it had a name.
- **THE READ IS PRESENT-TENSE ABOUT THE LIVE WEEK, AND THAT IS A DECISION.** Rollover creates
  the next cycle before Home renders (slice 3b), so `getLatestWeeklyCycle` always returns the
  week the user is IN rather than the one that just ended. Jen's §C1 copy is written in that
  tense and reads correctly against it. Recorded on the screen and on the service so **slice 7
  does not re-derive it**, and so `phaseKeyAtRead` is unambiguous about which week's phase it
  names.
- **NO-PHASE BEHAVIOUR, and the rejected alternative is the more useful half.** With no phase
  the reset renders the note without a question and writes `closeNote` + `closeCompletedAt`
  only. That is a **DEFINED value, not a degraded one**: `derive.ts:109-112` already specifies
  absence as "not answered", breaking an adjustment run exactly as a `moving` read would, and
  silence is not a complaint. **Rejected: a destination-neutral fifth question.** It would put
  in-house copy on the one screen whose entire content is Jen's four, and it would risk a
  `phaseRead` with no `phaseKeyAtRead` — the exact hazard `models.ts:601-607` names.
- **ROUTE PARAMS OVER A SCREEN-LEVEL READ, decided on the flag-off path.** `JOURNEY_IA` off
  does not delete `journeyStates` documents, so a `getJourneyState` call on the reset screen
  **would answer even with the flag off** — precisely the read the flag exists to gate.
  Params also keep one resolution per session: `phase` is null on **three live paths**, not
  only flag-off (rung (d) with no derivable destination, and any thrown resolve), and a screen
  read could succeed where Home's failed, leaving two surfaces disagreeing about the same user
  in the same session.
- **THE CONFIRMATION RENDERS.** Jen's line holds for **1500ms** — the house number, reused
  from `OnboardingConfirmationScreen` and `AnimatedCheckbox` rather than invented — between
  the awaited write and the navigate, **invariant by answer** as the pack instructs.
  **Backgrounding costs nothing as a property of ORDERING rather than of handling:** the write
  commits before the confirmation renders, so JS suspending and resuming changes only when the
  user arrives on Home, not whether their week closed. No `AppState` wiring, because there is
  no outcome for it to change. Replacing the form also removes the save control, so a second
  write is unreachable.
- **`closeNote` IS WRITTEN AND READ BY NOTHING, DELIBERATELY** (Kyle, 2026-09-10). It is user
  reflection destined for **Insights** (§11), not telemetry, and it is permanently barred from
  the analytics payload. **Its copy must not promise a return that has not shipped.** §11 is
  annotated in the other direction on the same date, so Insights is not scoped from `dailyLogs`
  and phase history alone and the stored notes are not later mistaken for dead data.
- **NOTHING READS `phaseRead` IN PRODUCTION EITHER.** `deriveAdjustDue` has no production
  caller until slice 7, and neither does `getWeeklyCyclesSince`, the query written in slice 1
  to feed it. **A write with no reader, stated so it is not read as a gap.**
- **CLOSE-LANGUAGE PASS (Kyle, 2026-09-10), in the rider.** The screen no longer closes
  anything: against a present-tense read, "close your week" taught the wrong mental model by
  framing a forward-looking check-in as a filing action on something finished, and "save"
  foregrounded data persistence rather than what the user came to do. Navigator title
  `'Close your week'` -> `CLOSE_COPY.screenTitle` `'Weekly reset'`, **moved out of
  `AppNavigator.tsx` into `copy.ts`** because user-facing copy does not live in the navigator
  — as a hardcoded literal it had sat outside the sentinel's reach for the whole life of the
  screen. Heading `'Your week'` -> `'Check in on your week'`. CTA `'Save and close the week'`
  -> `'Finish'`.
- **THE "RESET" COLLISION IS CONSIDERED AND ACCEPTED, NOT AN OVERSIGHT.** The word already
  carries practice meaning in this app — small resets, the guided reset, Jen's Recover lanes
  — where it means a thing you DO in a few minutes. This is a weekly instrument, met once a
  week from Home, in a stack header, with no practice in sight. The contexts are far enough
  apart that the collision is acceptable. Recorded at the string itself so **a future reader
  re-argues it rather than "fixing" it**.
- **CAUGHT OUTSIDE THE BRIEF:** `'Your week'` was an **exact duplicate of the Insights route's
  navigator title** (`AppNavigator.tsx:647`), so two different screens announced themselves
  with the same three words. Both of this screen's strings have moved off it. **Insights is
  untouched and flagged** rather than edited from inside this slice's fence.
- **SENTINEL 167 -> 152 -> 148.** The slice's -15 is **deletion with surface** (the 3b case,
  no owner named, because nobody signed those off — the questions stopped being asked):
  seven rating keys, five floor keys and two adjustment keys in `screens/weekly/copy.ts`, plus
  the single marker in `dailyPicker.copy.ts` covering all three continuity strings.
  `ADJUSTMENT_LABELS`' four entries also went and **cost nothing**, having never carried
  markers. The rider's -4 is **replacement by the owner** (the 5b-i case, not an approval:
  Kyle wrote the words that ship after rejecting all four) for `heading`, `save`,
  `noteQuestion` and `required`, **plus one free relocation** — `screenTitle` was unmarked
  before and after, so the pin did not move, **but the two absences mean opposite things**:
  unmarked before because it sat where nobody had looked, unmarked after because Kyle approved
  it. The gate's coverage grew by one string while the number stood still.
- **`noteQuestion` AND `required` WERE REWRITTEN TWICE IN ONE DAY ACROSS TWO COMMITS**, and
  only the second rewrite is in the -4. The slice itself substituted draft for draft (the
  originals presupposed the retired floor question), which has no arithmetic. **Anyone
  reconstructing the copy from `ef26118` alone reads two strings that do not ship.**
- **CONTRACT MISS, SELF-REPORTED AND BACKFILLED.** The slice-6 commit moved the pin 167 -> 152
  and named its fifteen strings and their case **in the commit message**, which the contract
  requires, but did not write the ledger entry in `copyDraftSentinel.test.ts` that every prior
  pin change has. The rider wrote both entries and **marked the 152 one as late**. Both halves
  are the mechanism: a commit message is found only by someone who already knows to look.
- **TWO BUILD TRAPS WORTH KEEPING, both caught on this slice:**
  - **An expect-error directive written as PROSE inside a line comment is still parsed as a
    directive.** An explanatory note about a *removed* directive became an unused one and
    failed the build. Spell the name out rather than writing it literally when documenting it.
  - **`renderReset(undefined)` triggers the DEFAULT PARAMETER.** All four no-phase tests were
    silently rendering WITH a phase and asserting against the wrong screen — the
    vacuous-green shape, and it was caught by inspection rather than by the suite. Fixed with
    a separate `renderNoPhase()` helper and the trap recorded in the file.
- **WALK (Kyle's, 2026-09-10). Gate keys attested.** Full reset flow across two destinations,
  all three answers, the confirmation and its edges (background during the hold, back during
  the hold, offline save then retry), and a Firestore field check: `phaseRead` and
  `phaseKeyAtRead` both present, `phaseKeyAtRead` matching the phase the map shows, **no
  `floorMet` written**. Home confirmed with **no continuity count** anywhere below the fold.
  Copy re-checked against the rider's new strings **after** the rider landed.
- **INHERITED WALK DEBT, THREE OF FOUR CLEARED.** The Guide pill migration (`87bcef6`), the
  onboarding circumplex rehost (PR #27, `01e42d7`) and the dashboard completion acknowledgment
  (`0185197`) were all walked and passed, closing debt that had been carried since before 5a.
- **STILL OUTSTANDING, AND THIS IS THE SECOND WALK IT HAS BEEN DEFERRED THROUGH: 5c's
  first-open transition for `StartHereRow` was NOT observed.** `constants/startHere.ts` was
  still null at walk time, so there was nothing to open. It needs a **test-clip run**: marker
  absent, gloss present, tap, gloss vanishes, marker persists across relaunch. **Slice 7 mounts
  the Today instance and is the first slice that both mounts a real video and can validate this
  path; its walk carries the burden or the item is dead.**
- **LINT ERRORS ENTER THE PINS AT 1102**, unchanged from baseline and not introduced by this
  slice. **First appearance of the figure here, and its provenance is UNEXAMINED:** it is a
  standing count nobody has triaged, not a clean bill. Recorded so the next slice compares
  against it rather than discovering it, and so a later reader does not read a flat 1102 as
  evidence the tree is lint-clean.


**Sept 10, 2026 — slice 7a merged (`b1f5919`). The advancement offer, end to end.** Branch
commits `c18ba4e` (the slice) and `d532ba3` (the copy rider). **Slice 7 is SPLIT: 7a is
advancement, the Today journey-action slot, the journey line and the Start here Today mount;
7b is adjustment.**
- Figures at close: jest **3318 / 218** · tsc **149** · sentinel **150** (151 at the slice,
  -1 on the rider) · lint errors **1102**, unchanged. Rules **191 pass / 2 skip** and
  functions **53 / 4** carried forward UNRUN: neither `firestore.rules` nor `functions/`
  appears in either diff. **Gate keys attested by Kyle on 2026-09-10.**
- **SHIPPED:** eligibility split from placement; exposure state on `journeyStates` behind a
  day gate; ONE journey-action slot on Today; B2 as preview-before-commit; the Today journey
  line; `StartHereRow` mounted on Today. The Today path ships **null**, so the row renders
  nothing for any user until a video exists — unchanged from 5c, and `START_HERE_PATHS.today`
  was reverted to null before the merge after the walk ran against a test clip.
- **THE SPLIT, AND THE SEAM IT CLOSED.** `deriveAdvanceDue` answers eligibility and nothing
  else. Placement moved to `journey/offerPlacement.ts`, which takes eligibility plus exposure
  state and returns `'today' | 'journey' | 'hidden'`. **The decline short-circuit MOVED OUT of
  `deriveAdvanceDue`**, where a decline made eligibility false — and a false there would have
  hidden the offer from the MAP as well as from Today, contradicting §9 R3's "then map only".
  The function's own comment had labelled that suppression **a placeholder whose final policy
  was slice 7**; this is that policy, and the placeholder turned out to be wrong rather than
  merely incomplete.
- **EXPOSURE STATE ON `journeyStates`:** `advanceExposures`, `advanceFirstOfferedOn`,
  `advanceLastExposedOn`. All three added to `CLEARED_OFFERS`, which is spread at **all four**
  phase transitions from one const, so the reset is the whole of the work rather than the
  first quarter of it. `ALL_OFFER_FIELDS` in the service suite grew **four to seven**, so an
  eighth field added without a reset is a red build.
  - **`advanceFirstOfferedOn` EXISTS BECAUSE `advanceOfferedAt` SLIDES.** The latter records
    the LAST offer shown and is rewritten on every exposure, so a seven-day cap anchored to it
    could never fire. Pinned by a test asserting the anchor **does NOT move** on a later
    exposure.
- **DAY-GATE ORDERING, PROVEN RATHER THAN ASSERTED.** `shouldRecordExposure` is a pure
  predicate over data the render already held, and `recordAdvanceExposure` is unreachable
  except behind it. The re-resolve that follows every write carries the freshly written date,
  so the next pass returns false. **Three tests pin what a single-render write count would
  miss**, because a write-then-gate implementation also writes once on the first render: a
  second same-day render records nothing more; four focuses in one day spend exactly one
  exposure; the next calendar day spends the next and **carries** the anchor rather than
  re-stamping it.
- **THE `advanceExposures` / NO-COUNTER TENSION, RESOLVED DELIBERATELY AND RECORDED AT THE
  FIELD.** §8 bans counters a user READS, and this is never rendered, never in copy, never an
  analytics dimension. This model's ban is on counters that DUPLICATE something derivable, its
  stated risk being drift — and this one is irreducible: the only other thing that would record
  a card being on screen is the analytics event log, which is `allow read: if false` **even for
  the owning account**. Both rules are cited at the declaration in `types/models.ts` so the
  distinction reads as one that was made rather than one that was missed. The service header's
  "it never writes a tally" was corrected in the same slice rather than left false.
- **`journeyActionFor`: ONE PURE FUNCTION, `capture` > `adjust` > `advance` > null**, tested at
  every boundary, never a nested ternary in `DashboardScreen`. **`RemoveCaptureCard` COUNTS
  against the ceiling** — if it looks like a card it occupies attention like one. Resulting
  primary stack: hero, journey-action card, `CloseWeekEntry`.
  - **C2 BEATS B2**, and this is the decision that costs something: a user can satisfy the
    behavioural advancement threshold while having twice said "not really yet", and offering to
    move forward then contradicts what they explicitly told us. **What the user TELLS us beats
    what we INFER from taps.** Advancement stays eligible internally; it is simply not the right
    proactive offer. **7a builds the adjust branch and leaves it unreachable**, pinned by an
    ordering test; 7b makes it reachable.
  - **CAPTURE BEATS BOTH:** a user who has not named what they are working on should not be
    offered advancement away from it.
  - Returns null when `phaseKey` is null, **which is also the flag-off, no-uid, unresolved and
    floor-gated encoding**. The `JOURNEY_IA &&` term did NOT move into the function; it was
    redundant, and that is named in the commit so it does not read as a dropped guard.
- **PREVIEW IS DERIVED, NOT PASSED — A REFINEMENT OF DECISION 4, AND THE MOST CONSEQUENTIAL
  CALL IN THE SLICE.** Decision 4's wording said "opens the next phase's detail page in preview
  mode"; its substance was preview-before-commit with no mutation until "Start this". Deriving
  the condition — this page's phase is `PHASE_ORDER[idx + 1]` **and** `advanceOfferedAt` is
  non-null — preserves the substance entirely and buys the thing a route param could not:
  **R3's demoted surface exists with NO change to `JourneyMapScreen`.** The map already opens
  every row including the AHEAD ones (§8, "AHEAD opens"), so the door was already there.
  Today and the map now reach the same page under the same condition: **one behaviour to test,
  not two.**
  - **REJECTED: shipping a placement value that resolves to silence.** Step 0 found that
    `'journey'` had no renderer inside the fence and named three ways out; deferring the
    demoted surface to 7b was the one turned down, because an offer that demotes to nowhere is
    the shape of bug this project keeps catching late.
  - **`advanceOfferedAt` non-null IS the proof eligibility already fired**, which is exact
    rather than convenient. Recomputing eligibility on that screen would need `consistentDays`
    and therefore a `dailyLogs` read it has never done.
  - **PREVIEW EYEBROW SUPPRESSED** (Kyle): the state word answers "where am I" and the preview
    answers "shall I go here". "Ahead" above an invitation to start that phase **makes the page
    argue with itself**. Suppressed rather than replaced, and the reasoning is recorded at the
    suppression rather than only the fact.
- **THE JOURNEY LINE SITS ABOVE THE HERO** — the order is "where am I / what should I do
  today" — with a **REQUIRED** label. Several of Jen's approved `short` strings are
  imperative-shaped, and "Clear what's keeping you on" standing alone above the hero reads as
  TODAY'S INSTRUCTION rather than as journey context. **Confirmed on device.** The label is a
  required prop rather than an optional one because there is no correct rendering without it.
  - **`JOURNEY_LINE_LABEL` AND `PHASE_STATE_LABELS.current` ARE DELIBERATELY NOT COLLAPSED**
    despite both holding "Where you are" (Kyle, rider). They answer different questions on
    different surfaces: one labels a ROW among four on a map, where its job is to distinguish
    that row from Complete, Ahead and Skipped; the other labels a SINGLE LINE on Today, where
    there is nothing to distinguish it from. The map's four labels have to work as a **set**,
    so it is the likelier of the two to be revised, and collapsing would let that revision
    silently change the Today line. **Two constants sharing a value is cheaper than one
    constant serving two meanings.** Recorded at **BOTH** declarations so whoever notices the
    duplication finds the reason rather than "fixing" it.
- **`StartHereRow` COLLAPSE LEGIBILITY — 5c's INHERITED DESIGN ITEM, DISCHARGED.** **No
  "watched" affordance** (Kyle): the marker records that the row was OPENED, not watched, and
  `VideoPlayerModal` exposes no completion callback, so a checkmark or a "watched" pill would
  claim more than the data supports. Instead the collapsed row is a visibly different
  **WEIGHT** rather than merely a line shorter — tighter padding, a smaller label off semibold,
  a dimmed play affordance — while keeping its 48pt target and staying a row on both surfaces.
  **Walked and confirmed perceptible.**
- **COPY: SENTINEL 148 -> 151 -> 150.** Two new drafts on the slice (`JOURNEY_LINE_LABEL`,
  `TODAY_START_HERE_GLOSS`) plus **a third CC declared as a deviation rather than absorbing**:
  `ADVANCE_PREVIEW_COPY.failed`, because the commit control needs an error state for §18 and
  the alternatives were importing a dashboard card's private, Jen-owned `saveFailed` into a
  journey screen or duplicating it under the wrong owner. **The third was approved on the rider
  after being read in the failure state it occupies** (walk section I: airplane mode, "Start
  this", the line under the two controls) — an approval, not a clearance, and not the 5b-i
  replacement case, because Kyle did not rewrite the words.
  - Kyle's **"Keep going here"**, **"Start this"** and **"Not yet"** land FLAT on the
    `PHASE_PAGE_BODIES` precedent. Jen's B2 titles, bodies and primary land flat under the
    pack rule.
  - **"Keep going here" RETIRES THREE WORDINGS AND MOVES THE PIN BY ZERO:** the pack's "Keep
    working here" (B2 variant one) and "Stay here" (B2 variant two), plus §8's "stay a while
    longer". None carried a marker — two were pack strings and one is in a document, not in
    `src` — so there is no arithmetic. **Named in the commit so nobody re-derives the retired
    pair from the pack later and reads the divergence as a transcription error.**
  - **STILL DRAFTED, BOTH KYLE'S:** `JOURNEY_LINE_LABEL`, which reads correctly on device but
    was never read against alternatives, and `TODAY_START_HERE_GLOSS`, which sat under a test
    clip rather than under Jen's video. Neither was walked in a state that would settle it.
- **OUT OF SCOPE, REPORTED RATHER THAN ABSORBED.** `jest.setup.js` gains mocks for `expo`,
  `expo-video` and AsyncStorage: mounting `StartHereRow` on Home put `VideoPlayerModal`'s
  imports on a screen for the first time and broke four `DashboardScreen` suites with exactly
  the expo-modules-core EventEmitter failure that file already documents for `expo-image`.
  Mocked globally rather than per suite, so Home's Today mount stays visible to screen-level
  tests. Separately, **`recordAdvanceOffered` is DELETED** — uncalled its whole life and a
  strict subset of `recordAdvanceExposure`; shipping both leaves a coin flip for whoever picks
  next.
- **TEST-RESIDUE CATCH, AND IT IS THE VACUOUS-GREEN SHAPE AGAIN.** The four new
  `DashboardScreen` describes inherited mock state from the preceding block instead of priming
  it, and **TWO OF THEM PASSED ON THE RESIDUE** — they would have passed with the code wrong.
  One crashed, which is the only reason it was noticed. Priming extracted to `primeHome()` and
  called by every describe. Caught while writing tests rather than by the suite, which is the
  recurring lesson rather than a new one.
- **WALK (Kyle's, 2026-09-10). Gate keys attested.** `StartHereRow`'s first-open transition
  against a test clip — **THE THIRD-WALK DELIVERABLE, NOW DISCHARGED**: marker absent, gloss
  present, tap, gloss vanishes, the weight perceptibly different, the marker persisting across
  a relaunch, and a second account on the same device getting its own expanded row. Then the
  journey line above the hero with its label on an imperative-shaped `short`; the
  ceiling-variant advancement card naming nothing about what was done; the preview with its
  eyebrow suppressed and nothing mutated until "Start this"; dismiss; "Not yet"; the one-slot
  precedence against the capture card; and an offline commit failure with its retry.
- **NOT WALKED, NAMED SO IT IS NOT ASSUMED: the CONSISTENCY-door variant of the B2 copy.**
  Seeding it needs one field plus **eight** `dailyLogs` rows, where the ceiling door needs one
  field; the ceiling run proves the card mechanism and the variant selection is pinned by
  tests. **A trap for whoever does seed it:** if the `dailyLogs` composite index
  (`userId ASC, date ASC`) is not deployed, the consistency read throws, `useTodayCard` catches
  it and sets `consistentDays` to **0**, and the door never opens no matter how many rows
  exist. The index is declared in `firestore.indexes.json`; whether it is deployed is Kyle's
  checklist. The tell is `[useTodayCard] consistency read failed:` on device, which is
  `logger.error` and therefore not `__DEV__`-gated.
- **POST-MERGE OBLIGATION — walk section E, the exposure budget.** It needs **three real
  calendar days** and cannot be honestly walked by changing the device clock. Observe over
  **2026-09-11 to 09-13** on a seeded account: day 1 the card appears and repeated Home visits
  spend exactly ONE exposure; days 2 and 3 reach three; day 4 the card is gone from Today and
  the map route still offers it. **Record the result in this entry when observed. Until then
  the budget is test-pinned and device-unobserved**, and that is the honest description rather
  than a gap.

### 2026-09-11 - slice 7e, the journey read boundary (`20d0441`, docs `bcd48f7` + `9331767`, merged `c6d03ee` on 2026-09-12; branch `journey/slice-7e-read-boundary`, pushed; walked steps 1-6 and attested before the merge)

**WHAT SHIPPED.** `resolveJourney` validates the two keys the surfaces INDEX BY
before it builds a `PhaseContext` from them, and falls through to `'legacy'`
when either is outside its union.

- **A. The boundary, at rung (a) and ahead of every other read off the
  document.** `hasRenderableKeys` checks `phaseKey` against `PHASE_ORDER` and
  `destination` against `DESTINATION_KEYS`, never against a local list: a second
  copy of either vocabulary here would admit a fifth phase the display table
  would then refuse, which is this defect again wearing a new coat. A document
  that fails resolves to `'legacy'`, which is this resolver's standing answer to
  any failure, and warns ONCE on `uidDigest(uid)`.
- **B. It does not repair the document.** A read path that wrote would erase the
  evidence of a data problem something upstream produced, and would do it from
  the one code path that runs on every launch. The warning is the point.
- **C. `JourneyLine` renders nothing rather than throwing** when the cell is
  missing. Defence in depth and labelled as such in the file: the resolver is
  what stops an unrecognised key reaching a surface at all.

**MUTATION-CHECKED BEFORE ANY CLAIM OF GREEN.** Reverting either guard - the
resolver branch to a constant `true`, the component's `?.` to the bare double
index - fails **20 tests** across the two suites.

---

**PROCESS NOTE, AND IT IS A DEVIATION FROM THE WORKFLOW RATHER THAN A NOTE ON
ONE.** `mobile/CLAUDE.md` says *"Read-only Step-0 diagnostic before any build
pass. Report findings before changing anything."* The brief said the same thing
twice: *"Then a read-only Step 0. Report before building."*

**Step 0 was not reported as a separate gate.** The diagnostic was genuinely
read-only and genuinely ran first - no file was edited until it finished - but
the report and the finished build landed in the SAME TURN, so Kyle read the
findings with the commit already made. A gate that reports after the work is not
a gate; it is a preamble.

**WHAT IT COST HERE, STATED PLAINLY RATHER THAN MINIMISED.** Step 0 found that
the row's coverage claim was wrong (the dated block on the 7b entry below), and
that finding is exactly the kind that should have reached Kyle BEFORE a line was
written, because the honest response to it might have been to rescope the slice
rather than to build the fenced half and log the rest. It did not change what
was built, and that is luck rather than process.

**ONE SUBSTANTIVE QUESTION WAS SKIPPED ENTIRELY**, and it is answered in the
block below: the brief's Step 0 (a) asked which OTHER fields read at rung (a)
can crash a downstream consumer, naming `enteredAt` and `history`. The report
covered `phaseKey` and `destination` and gave the rest a table row each without
tracing their consumers. Answered now, and the answer turns out to be
reassuring, which is not the same as the answer having been known.

---

**THE SKIPPED QUESTION, ANSWERED: WHICH OTHER RUNG-(a) FIELDS CAN CRASH A
CONSUMER.** Traced to a consumer for each, not inferred from the field's type.

**THE GENERAL SHAPE FIRST, because it is what makes the rest short.** The whole
ladder runs inside one `try` (`resolveJourney.ts:409`, catch at `:539`), so a
field that throws WHILE BEING READ is already safe: the catch logs and returns
`'legacy'`. The dangerous class is narrower and was never written down before
this slice - **a value that reads cleanly, passes through `PhaseContext`, and is
then used as an INDEX during a render.** Render-time throws are what an
ErrorBoundary answers by taking the screen. That is exactly `phaseKey` and
`destination`, and exactly nothing else at this rung.

| Field read at rung (a) | Consumer traced to | Can it crash? |
|---|---|---|
| `phaseKey` | `JourneyLine.tsx` `PHASE_DISPLAY[phaseKey][destination].short`, in render (`:63` and `:74` as the defect stood on `main`; `:71` after this slice) | **YES.** The defect. Guarded by this slice. |
| `destination` | same two lines, inner index | **YES.** The defect. Guarded by this slice. |
| `enteredAt`, via `enteredAtIsoOf` | `useTodayCard.ts:409` `getDailyLogsSince(uid, enteredAtIso)`; `adjustArmedFromIsoOf` | **No, and see the silent-failure note below.** |
| `history` | **NOT READ AT THIS RUNG AT ALL.** Zero occurrences of the word in `resolveJourney.ts`; it is not a `PhaseContext` field. | Not applicable here. Its crash path is on the two screens, and is row 7f. |
| `removeCapturedAt` | coerced `!!` into `hasRemoveCapture`; read by `journeyAction.ts` as a boolean | No. |
| `removeFamily` | `selectProtocol.ts:169` -> `orderForFamily`, which COMPARES (`v.family === family`, `:134`) and never indexes | No. |
| `advanceDeclinedAt`, `adjustOfferedAt` | coerced `!!` | No. |
| `advanceExposures`, `advanceFirstOfferedOn`, `advanceLastExposedOn`, `adjustDeclines` | `offerPlacement.ts` comparisons and arithmetic | No. Absent-safe with `?? 0` / `?? null`. |
| `updatedAt`, via `revisionOf` | a dependency-array primitive in `useTodayCard` | No. Tolerant of three shapes, falls to `0`. |
| `capacitySeed` | `selectProtocol.ts:159` `PROTOCOL_MATRIX[phase][capacity]` - an INDEX | No, **and not because it is safe**: it is read off `userPrivate`/`weeklyCycles`, NOT off this document, so no malformed `journeyStates` row can reach it. A malformed `capacitySeed` is a real and unguarded index, on a different document, and is NOT in this slice's fence. Named here so it is not mistaken for covered. |

**NOTHING NEEDS THE SAME TREATMENT, SO THE SLICE DOES NOT WIDEN.** No STOP.

**ONE THING FOUND THAT IS NOT A CRASH AND IS WORTH KNOWING.** `{ seconds: NaN }`
in `enteredAt` passes `typeof === 'number'`, makes an Invalid Date, and
`toIsoDate` (`weekStart.ts:45-49`) uses `getFullYear`/`getMonth`/`getDate`
rather than `toISOString`, so it returns the STRING `"NaN-NaN-NaN"` instead of
throwing. That string is truthy, so it does not take the empty-string path that
suppresses the consistency read. It then sorts ABOVE every real ISO date (`'N'`
is 0x4E, `'2'` is 0x32), so as the adjust re-arm floor it makes
`weekStart > armedFromIso` false for every week and the adjustment offer can
never fire. **Silent, permanent for that document, and invisible to the user and
to Sentry.** Not a crash, not in this fence, and logged here rather than fixed
because it wants a decision about whether the timestamp readers should reject an
invalid date rather than render one.

---

**A SECOND PREMISE IN ROW 7e IS WRONG, AND IT NARROWS THE PRODUCER LIST.** The
row names three producers of a malformed row: *"the console, the beta cohort
reset script, or a row predating the rule."*

**The cohort reset script cannot be one.** `scripts/migrations/beta-cohort-reset/migrate.js`
contains **zero occurrences of the string `journey`**: `journeyStates` is not in
`PURGE_COLLECTIONS` (`:119`), not in `RESET_USER_DOC`, and not written anywhere
in the file. It neither produces nor repairs a journey document.

**That is itself a finding, in the other direction.** The script flips
`hasCompletedOnboarding` to false and purges the behavioural collections, but
**leaves `journeyStates/{uid}` standing**, so a reset account re-onboards and
`createJourneyState` overwrites it with `setDoc` and no merge - which is the
correct outcome, and it is correct by accident rather than by design. **Recorded
here and NOT yet carried into `scripts/migrations/beta-cohort-reset/README.md`**,
so nobody reads this line as meaning the reset's own open delete-list decisions
have been updated. The question belongs there; it is not this slice's to settle.

**The producer list that survives is: the Firebase console, and rows predating
the rule.** Both are Admin-SDK-shaped, which is what makes this a boundary guard
rather than a hunt for a bad writer.

**AND THE RULE IS STRONGER THAN THE ROW SAYS.** Row 7e says `validJourney`
*"gates `phaseKey` on create and update"*. It gates **both** keys:
`firestore.rules:987-988` requires `data.destination in ['focus', 'calm',
'routines', 'energy']` AND `data.phaseKey in ['remove', 'recover', 'rewire',
'refocus']`. So the client-side impossibility argument covers `destination` too,
and neither key can reach the document from the app.

---

**IS ANY LIVE DOCUMENT CARRYING `destination: 'stress'`? NO - established from
the write paths, not from the console.** `'stress'` is the one near-miss worth
chasing: it is a real key in the WEEKLY vocabulary and reads `'calm'` in this
one, so a document carrying it looks correct to a human reading a console.

- **`destination` is written exactly ONCE per document and never updated.**
  `createJourneyState` (`journeyState.service.ts:127`) is the only line in the
  service that writes the field; no advance, skip, step-back or adjust touches
  it. Grep for `destination` in that file returns the type, that one write, and
  a comment.
- **There are exactly two callers, and both can only produce a DestinationKey.**
  `resolveJourney.ts` passes the output of `destinationForOutcome`, whose whole
  body is `outcome === 'stress' ? 'calm' : outcome`
  (`destinationBridge.ts:28`), so the migration rungs CONVERT rather than
  copy. `OnboardingV3DoneScreen.tsx:152` passes the onboarding context's
  `destination`, which the picker renders from `DESTINATION_KEYS` itself
  (`OnboardingV3DestinationScreen.tsx:57`).
- **It has been that way since the field existed.** Slice 4a's commit `ea58022`
  shows the terminal already writing a `DestinationKey` to `journeyStates` and
  using `outcomeForDestination` only for the weekly cycle's own `outcome` field,
  which is the OPPOSITE direction. 4b then deleted `outcomeForDestination`
  entirely. **No version of this code has ever written an OutcomeKey into
  `journeyStates.destination`.**
- **And the rules would have refused it anyway**, on create and on update, per
  `firestore.rules:987` above.

**SO THE RESOLVER MUST REFUSE `'stress'` RATHER THAN BRIDGE IT**, and a test now
pins that (`'an OutcomeKey in the destination field is not bridged, it is
refused'`). Bridging at rung (a) would silently rewrite a stored journey's
destination on every read, for a value no writer produces.

**THE HONEST LIMIT OF THIS ANSWER.** It establishes that no CODE PATH produces
such a row. It cannot establish what is in the production collection, because
that needs a read against live data and this slice reads and writes nothing
there. A console-typed row is exactly the case the guard exists for, and the
guard does not care which key is wrong.

---

**SECTION 18: NOTHING VISIBLE CHANGES.** On a well-formed document every surface
is byte-identical - the sixteen-cell test pins that the valid pairs still
resolve and still render. On a malformed one the user gets the legacy weekly
landing (`useJourneyLanding.ts:193-202` -> `DashboardScreen.tsx:146-148`: the
hero served off the week, with no journey line and no journey-action slot),
which is a surface Today already has on every legacy-path launch, instead of an
ErrorBoundary. No token, type, radius, elevation, icon, component, copy,
pressable, target, role, label or animation change; `useReducedMotion` is not in
scope.

**COPY.** None. No string added, removed or reworded. Sentinel unchanged at
**150**. The one new string is a `logger.warn` message, which is a log line and
not user-facing copy.

**MANIFEST: NO CHANGE.** No new collection and no new document. **This slice
adds no write at all** - it is a read path that got a guard. `journeyStates` is
already on the manifest at `functions/src/lib/accountDeletion.js:86`. Verified by
reading the manifest, not assumed from the previous entry.

**BASELINES AT `20d0441`: tsc 149 (unchanged, and zero `error TS` lines in
either touched file), jest 3444 / 221 suites (from 3422; +22 tests, no new suite
file), sentinel 150 (unchanged), lint 1101 errors / 1350 warnings (both
unchanged).** Rules 191/2 and functions 53/4 carried unrun: `firestore.rules`
and `functions/` are untouched by this slice.

**THE WALK (Kyle, device). PASSED, STEPS 1 THROUGH 6.** The seeded malformed
row: `phaseKey` set to `"remove "` with a trailing space in the console, cold
open, Today on the weekly landing with no crash; then restored, cold open, the
journey surfaces back. **The warn lines were present and correct**, carrying an
8-character digest and no raw uid, which is the half of this slice a test can
assert but only a device can show reaching a real log.

**A trap for whoever walks it again:** if you break `destination` rather than
`phaseKey`, the Practices tab still crashes while the row is broken. That is row
7f, not a regression of this slice.

**ATTESTATIONS (Kyle, 2026-09-11):**

- **Suites green at the figures above: tsc 149 / jest 3444 of 221 / sentinel 150. ATTESTED.**
- **Device walk passed, steps 1 through 6, warn line observed with an 8-character digest and no raw uid: ATTESTED, 2026-09-11.**

*(Recorded verbatim as Kyle wrote them. The attestations are dated 2026-09-11;
the merge below landed on 2026-09-12. The two dates are both correct and are
left as they are rather than reconciled, because an attestation is dated when it
is given.)*

---

### 2026-09-11 - slice 7d, the exposure gate (`051b673`, docs `ed750bc` + `99670be`, merged `2807511`; branch `journey/slice-7d-exposure-gate`, pushed; walked and attested before the merge)

**WHAT SHIPPED.** Both offer writes are gated on the RENDERED slot instead of on
eligibility, and Today's journey-action slot no longer swaps one card for
another.

- **A. The advancement exposure.** `recordAdvanceExposure` fired on
  `placeAdvanceOffer` returning `'today'`, which is eligibility for the slot;
  `journeyActionFor` decides who occupies it, later and separately. The gate now
  reads that answer. `shouldRecordExposure` keeps the day half and its first
  argument became a plain boolean.
- **B. The adjust door, which had the identical bug and cost more.**
  `recordAdjustOffered` stamps `adjustOfferedAt`, and that field is the phase
  page's qualification key: `JourneyPhaseScreen.tsx:173-175` states it is
  non-null *"if and only if the adjustment offer has occupied Today at least
  once in this phase."* Stamped on eligibility, that biconditional was false in
  one direction. A user in `remove` with no capture and two consecutive
  `not_moving` reads had "Try a different approach" waiting on the phase page
  having never been asked anything. Same gate, same slice.
- **C. The first-frame race, closed on the INPUT side.** `journeyActionFor` is
  computed only once `useAdjustOffer` reports its weekly read settled, and is
  null otherwise. That is the frame-1 loading gate (no phase, no action)
  extended to the second async read on the screen. `journeyActionFor` is
  untouched - no pending value, no fourth input, no new branch - and so is the
  JSX. **Both cards now draw once, correctly, with no swap**, which is the
  visible half of the same defect and a §18 load-stagger in its own right.

**THE BRIEF'S FIRST SHAPE DOES NOT COMPILE, AND THAT RESHAPED THE SLICE.** The
plan was to pass `journeyActionFor`'s answer into `useAdvanceOffer` as an input.
It is a render-order cycle: `journeyActionFor` takes `advancePlacement` and
`adjustPlacement` as inputs (`journeyAction.ts:66-67`), and those are the two
hooks' own outputs, so its answer cannot be an argument to the hook it is
computed from. **The fix is to move the WRITE below the answer rather than the
answer above the write.** Each hook keeps its placement and its user actions and
gives up its effect; `useAdvanceExposure` and `useAdjustDoorStamp` sit below the
call site, take the action, and return void. They live in the files of the
offers they belong to, so the reasoning stays with its subject. The alternative
that was rejected on sight - computing the slot inside each hook - would put the
precedence rule in three places.

**THE `settled` FLAG WAS WRONG FIRST, AND THE TEST SET CAUGHT IT BEFORE THE
DEVICE DID.** The obvious implementation is a write-once boolean. It sets itself
during the FIRST render: `phase` is still null, so `enteredAtIso` is the empty
string, so the read effect bails - and a bail is a legitimate answer, so the flag
goes true and stays true for the whole session. It then released the slot on
exactly the frame it exists to withhold, which is to say it was worse than
nothing: it looked like a fix and restored the defect. **Two of 7d's own new
tests failed on it**, one at the hook and one at the screen, before any build
reached a phone. It is now keyed to `(uid, enteredAtIso)`, the pair that decides
which read runs: `revisionToken` and `todayIso` re-run the effect without
changing the key, so a write to the journey document never blanks the slot,
while a phase change correctly withholds it for one read.

**Worth stating plainly, because it is the argument for writing the tests
first:** the walk could not have found this. The bad flag produces correct
behaviour on every warm open and fails only on the first render of a cold start
with a slow read - the exact frame a human cannot reliably catch, which is why
the original defect survived 7a and 7b on device.

**THE THIRD VACUOUS-GREEN INSTANCE, AND IT IS WHY THE SUITE NEVER SAW ANY OF
THIS.** `DashboardScreen.journeyLanding.test.tsx` mocked `weeklyCycle.service`
and `analyticsEvents.service` and did NOT mock `journeyState.service`. With the
suite's own `db: null` mock, the real module loads, `requireDb()` throws
(`ensureDb.ts:20-26`), both slot writes reject, and every `.catch` swallows it -
correctly, because no offer write may cost the user their screen. **So a Home
that spent an exposure behind the capture card and a Home that spent none were
indistinguishable to that file**, through two slices and every full suite run.

What makes this shape specifically dangerous is that the swallowing is correct
production behaviour: no thrown error, no console noise, no unhandled rejection.
The environment looks healthy while proving nothing. Same family as the rules
harness note (`reference_rules_test_harness`) and as 7b's `getWeeklyCyclesSince`
query-contract gap.

**THE SWEEP IS NOT DONE, AND THIS IS THE FLAG.** The mock is added to that ONE
file. Every other screen suite that stubs `config/firebase` to a null `db` and
leaves a write-owning service unmocked has the same hole, and nobody has counted
them. Logged to `docs/TEST_INFRASTRUCTURE_BACKLOG.md` with the shape of the
sweep: find the suites mocking `db: null`, list the service modules they import
transitively, flag the unmocked writers. **Not a slice; a harness capability, on
the same footing as the round-trip query case 7b logged.**

**WHERE THE TESTS LIVE, AND WHY BOTH LEVELS.** The hook suites prove each hook
honours the action it is handed; only Home decides what that action is, and only
Home runs the async read that produced the race. Neither level is sufficient
alone. **Both harnesses run the REAL `journeyActionFor` between the hooks**
rather than stubbing the action, because a stub would let them pass against a
precedence function changed underneath them - which is this slice's entire
subject. **Mutation-checked before the walk:** reverting either gate to ignore
the slot fails **19 tests** across the three suites, so none of the new green is
accidental.

**`shouldRecordExposure` TAKES A BOOLEAN NOW.** Its header claimed placement was
passed in so that *"the card is on Today"* and *"today has not been spent"* were
one decision at one call site, and the first half of that sentence was never
true. The caller proves the slot; the function still owns the day. A
`JourneyAction` parameter would have closed an import cycle with
`journeyAction.ts`, which imports `OfferPlacement` from that module, and Metro
0.83 does not forgive those.

---

**THE 7b DEVICE OBSERVATION HAD TWO POSSIBLE CAUSES, NOT ONE (Kyle, 7d walk).**

`captureDismissed` is component state in `DashboardScreen` and is **never
persisted** - by 3c-i's design, and `journeyAction.ts:63` says so at the input.
So the 7b walk's evidence, `advanceOfferedAt` stamped at 13:30:39 with the
capture card on screen at 13:41, is consistent with **two** mechanisms:

1. **The eligibility gate** - the exposure fired while the capture card held the
   slot. This is the defect, and it is the one 7d fixes.
2. **A dismissal and a relaunch** - the capture card was dismissed at some point
   before 13:30, advance legitimately took the slot and drew, and a later
   relaunch reset `captureDismissed` to false and brought the capture card back
   by 13:41. Under this reading the stamp was correct when it happened.

**THIS DOES NOT WEAKEN THE DEFECT AND IT DOES CORRECT THE 7b ENTRY'S
EVIDENTIARY CLAIM.** The 7b entry called the observation "OBSERVED TWICE ON
DEVICE, not inferred". The behaviour was real and is now pinned by tests at both
levels that reproduce it deterministically with no dismissal anywhere - the
defect never depended on that observation being unambiguous. But **the
observation itself was ambiguous**, and recording it as clean evidence was
wrong. The tests are the evidence; the device sighting is what prompted looking.

**IT ALSO CONSTRAINS THE WALK.** Check 1 is only valid if the capture card is
**never dismissed** during it, because a dismissal lets advance into the slot
legitimately and the check then proves nothing. Written into
`docs/seed-walk-account.md` §5 as the trap it is, alongside the fact that
`removeCapturedAt` is the single field the capture gate reads
(`resolveJourney.ts:384`).

---

**THE WALK (Kyle, device, 2026-09-11). ALL SIX CHECKS PASSED, PLUS THE OFFLINE
CHECK.**

| # | What it proves | Result |
|---|---|---|
| 1 | No exposure while the capture card holds the slot | PASS |
| 2 | No exposure while C2 holds the slot | PASS |
| 3 | Cold open, both due: slot empty, then ONE card, **no swap** | PASS |
| 4 | Exactly one exposure on a day advancement draws, across four tab switches and two backgroundings | PASS |
| 5 | Door NOT unlocked while capture holds the slot | PASS |
| 6 | `adjustOfferedAt` stamps only when C2 draws | PASS |

**THE OFFLINE CHECK PASSED (Kyle's observation).** Airplane mode, cold open on
an ADVANCE-DUE account: **the advancement card drew within a few seconds.**

**WHETHER THE READ REJECTED OR RESOLVED FROM CACHE WAS NOT OBSERVED, so the
catch branch is not evidenced by this walk.** What the walk establishes is the
user-visible outcome - the slot was not withheld, and an account offline at
launch still got its card. It does not establish WHICH path produced that, and
the two are different states of the settled contract: a rejection exercises the
`.catch` and the second `.then` in `useAdjustOffer`, while a cache hit
exercises the ordinary resolve path with an empty or stale row set. **The
rejection path is pinned by unit test only** - `'SETTLES ON A FAILED READ, so
one dropped request does not blank the slot'` in `useAdjustOffer.test.ts`, and
`'a FAILED weekly read still releases the slot'` at the screen. That is a real
assertion and it is not a device observation; do not let a later reader promote
it into one on the strength of this line.

*(Written this way deliberately at Kyle's correction, 2026-09-11. The first
draft of this paragraph asserted the rejection mechanism, which nobody watched
happen. It is the same error the `captureDismissed` block below corrects in
7b's entry, made once more in the entry that corrects it - a plausible
mechanism narrated as an observation. Record what was seen.)*

**A read that HANGS rather than rejecting is a third case and is covered by
neither the walk nor a test:** it leaves the slot empty until it settles, which
is the same class as the phase read that already gates the whole Today block
above it. Logged to the offline-resilience row in
`docs/Vara_Today_IA_Restructure_Roadmap_v2.md`.

---

**EXPOSURES ALREADY SPENT BEHIND ANOTHER CARD ARE LEFT AS THEY ARE**, per §5 row
7d's open question. **No migration and no script.** `CLEARED_OFFERS`
(`journeyState.service.ts:92-103`) zeroes `advanceExposures`,
`advanceFirstOfferedOn` and `advanceLastExposedOn` and nulls `adjustOfferedAt`
on every phase change, so the overcount is **bounded to whatever phase each
account is standing in now and heals at its next phase boundary** with nothing
written and nobody touching a document. Forgiving it would mean Admin-SDK writes
to live `journeyStates` rows, which is a slice of its own and costs more than a
bounded one-phase undercount against a beta cohort this size.

**The healing is also why the 7a observation needs a fresh account**: an
existing account carries its inflated counter until it changes phase, so
observing one would measure the old defect with the new code.

**BOTH ANALYTICS EVENTS CHANGE MEANING AT THIS MERGE, AND THE TYPES SAY SO.**
`journey_advance_offered` and `journey_adjust_offered` share their gates with the
two writes, so their row counts were counting the wrong occasions too. Both type
comments now carry the caveat: **rows written before 7d and rows written after
it are not comparable**, and any accept-rate cut crossing the merge is measuring
two different denominators.

**COPY.** None. No string added, removed or reworded. Sentinel unchanged at
**150**.

**MANIFEST: NO CHANGE.** No new collection and no new document. The slice writes
to `journeyStates` and reads `weeklyCycles`; both are already on the manifest at
`functions/src/lib/accountDeletion.js:86` and `:92`. **Verified by reading the
manifest, not assumed from a previous entry.**

**SECTION 18.** One surface change, and it is a timing change rather than a
visual one: the journey-action slot stays empty for the duration of one weekly
read on a cold open instead of drawing the advancement card and swapping it for
C2. No token, type, radius, elevation or icon change; no new component; no copy;
no new pressable, so no new target, role or label; no animation, so
`useReducedMotion` is not in scope. The empty state is the slot's existing
absence - nothing renders, not a placeholder and not a spinner - which is what
Home already shows while the phase resolves, and the three-card ceiling is
untouched. **The swap this removes was itself a §18 Interaction violation**, a
load-stagger, which is why it is recorded as an amendment to §9 R3 rather than
as a nicety.

**DOCS ADDED.** `docs/seed-walk-account.md` (`99670be`) - the field-level recipe
for seeding a journey walk account: the five seeding rules, the three document ID
formats, the `journeyStates` and `weeklyCycles` field tables with console types,
the two seed shapes, and the capture-outstanding recipe. Written so the next walk
does not re-derive them from a script that has scrolled away.

**BASELINES AT `99670be`, re-run after the walk: tsc 149 (unchanged from
`1b21cad`), jest 221 suites / 3422 (from 3400; +22 tests, no new suite file),
sentinel 150 (unchanged), lint 1101 errors unchanged / 1350 warnings (+6 `any` in
the new test mock shims, matching the convention already in those files).** Rules
191/2 and functions 53/4 carried unrun: this slice touches neither, and
`firestore.rules` is untouched.

**THE 7a POST-MERGE OBSERVATION OBLIGATION IS INHERITED AND REBOOKED, NOT
DISCHARGED.** Three real calendar days on a **fresh** account, counted from
**7d's merge** rather than from its walk. 7d merged as `2807511` on 2026-09-11,
so **the window is 2026-09-11 to 2026-09-13**. The §5 amendment block carries the
same dates so it is not missed by someone reading the board instead of the log. **Nothing may be recorded
against the 7a entry's original 2026-09-11 to 09-13 window**; it expired unrun,
on purpose.

**ATTESTATIONS (Kyle, 2026-09-11):**

- **Suites green at the figures above:** tsc 149 / jest 3422 of 221 / sentinel 150. ATTESTED.
- **Device walk passed, six checks plus the offline check:** ATTESTED, 2026-09-11.

---

### 2026-09-11 — slice 7b, the adjustment offer (`82e398e`, merged `810dfa8`; branch `journey/slice-7b-adjustment`, pushed)

**WHAT SHIPPED.** C2 reaches Today. `deriveAdjustDue` gets its first production caller and
`getWeeklyCyclesSince` its first caller of any kind. 7a built the `adjust` branch of
`journeyActionFor` behind a literal `'hidden'` at the only call site; 7b changed that one
expression and touched neither the signature, the branch, nor the capture > adjust > advance
ordering, which is what the 7a plan was for.

The card, the re-arm, the two-offer cap, the phase-page door, `journey_adjust_*`, and
`adjustChoice` / `adjustChosenAt` / `adjustDeclines` on `journeyStates`. No new collection and
no rules change: `validJourney` is not an exhaustive field allowlist, the same reason
`advanceExposures` needed no rules edit in 7a. No `orderBy` added to `getWeeklyCyclesSince`;
the weeklyCycles composite index stays deferred.

**THE CHOICE IS RECORDED, NOT HONOURED.** `adjustChoice` is written by the phase page and read
by nothing; consuming it is row 7c. The C2 confirmation is worded for exactly that state and
must not be rewritten into a claim that today's practice has already changed until 7c lands.

**THREE THINGS STEP 0 CAUGHT, read-only, before anything was built:**

1. **The re-arm floor compares against `weekStart`, not `weekEnd`.** The brief said `weekEnd`;
   the arithmetic said otherwise. The offer can only be on Today when the NEWEST read is
   `not_moving`, and the newest read always belongs to the LIVE week, whose `weekEnd` is today
   or later by definition (`isWithinWeek`). So at decline instant D the triggering week has
   `weekEnd >= D`, a `weekEnd` floor KEEPS it, and the same two reads re-trigger on the next
   render — the exact failure the re-arm exists to prevent. Its `weekStart` is on or before D,
   so a strict `weekStart >` floor excludes it. `weekStart` is also non-optional where
   `weekEnd` is, so the floor never needs `resolveWeekEnd`'s fallback.
2. **The ordering disagreement was LIVE, not hypothetical.** `deriveAdjustDue` sorted by
   `(a.weekEnd ?? '')`, landing a row with no stored `weekEnd` at the OLDEST end as the empty
   string; `getWeeklyCyclesSince` sorts the same rows by `resolveWeekEnd(weekStart, weekEnd)`,
   which resolves that row to `weekStart + 6` and can place it LAST. `weekEnd` became a stored
   field partway through, so such rows exist. Two definitions of "newest", one documented as
   the authority and the other silently winning. The re-sort is deleted, the service is the
   single authority, and a test pins it with a legacy row a re-sort would hide.
3. **Nothing tracked "declined twice".** `adjustDeclinedAt` is one instant, overwritten by the
   second decline and indistinguishable from the first, so R5's cap had nothing to read.
   `adjustDeclines` is the field that counts.

**COPY.** Sentinel unchanged at **150**, and the arithmetic is written into
`copyDraftSentinel.test.ts` so a later audit finds the reason rather than a gap.

**THIRTY-TWO strings landed.** Counted off the declarations: `ADJUST_COPY` has eight keys, and
`ADJUST_ALTERNATIVES` has four phases of three options carrying a label and a body each, which
is twenty-four. *(Corrected 2026-09-11: this paragraph first said twenty-nine and then
partitioned it into groups summing to thirty-one, so the headline and its own breakdown
disagreed. Both were wrong.)* The partition is five ways rather than three because ownership
and ROUTE TO ZERO are different questions:

| | Strings | What they are |
|---|---:|---|
| Pack `§5`, Jen, flat | **26** | the C2 title, the C2 confirmation, and 12 alternative labels + 12 bodies |
| Pack `§decisions-4`, Jen, flat | **1** | `bodyFirst`, the final C2 body, verbatim |
| Kyle, authored flat | **3** | `primary`, `alternativesIntro`, `failed` |
| Kyle, replacement by owner | **1** | `decline` |
| Kyle, new draft cleared by owner sign-off | **1** | `bodySecond` |
| **Total** | **32** | |

`§C2`'s own body was NOT built; it is struck through in the pack and a test asserts its
absence. The replacement: `decline` = "Keep going for now" retires the "keep going as is" gloss
§3.1 and §8 both use for this control. `primary` = "Try a different approach" is a prose-to-copy
promotion from §9 R5, on the reading `PHASE_STATE_LABELS` took of §1's prose.

**`.bodySecond` IS RECLASSIFIED (2026-09-11) FROM "replacement by owner" TO NEW IN-HOUSE
DRAFT.** Replacement-by-owner needs a wording that already existed to supersede, and the pack
has no second-offer body at all; superseding an absence supersedes nothing. It counts **+1 as a
new drafted string on a C2 surface, then −1 on Kyle's owner sign-off in the same commit**. The
net is the same zero by a route that is not the same: C2 body copy is **Jen's**, so an owner
sign-off here is the **weaker** of the two warrants the sentinel contract recognises, and the
string is **PENDING JEN REVIEW**. One word from her approved first body is the strongest thing
that can be said for it, and is not the same as her having written it.

---

**WALK-CAUGHT, DEFERRED — the 7a exposure-on-eligibility defect. ROW 7d, and it is next.**

`recordAdvanceExposure` fires on `placement === 'today'`, which is ELIGIBILITY, not on the
rendered slot. `useAdvanceOffer.ts:120-137` gates on `shouldRecordExposure(placement, …)`;
`placement` comes from `placeAdvanceOffer` (`offerPlacement.ts`), whose five inputs contain
nothing about the capture card, the adjust card or `journeyActionFor`. The slot is decided
later and separately, at `DashboardScreen.tsx:200-211`.

**OBSERVED TWICE ON DEVICE, not inferred:** once with `advanceOfferedAt` stamped at 13:30:39
while the capture card held the slot at 13:41, and once behind C2. The budget drains behind a
card the user cannot see.

> **AMENDED 2026-09-11 (slice 7d walk, Kyle). "NOT INFERRED" OVERSTATES WHAT THE 13:30:39
> SIGHTING PROVED.** The paragraph above is left unedited in the §3.4 style. **The defect is
> real and is unaffected by this** - 7d pins it deterministically with tests at the hook and
> at the screen, in a harness where nothing is ever dismissed. What changes is the status of
> the EVIDENCE, not the conclusion.
>
> `captureDismissed` is component state in `DashboardScreen` and is **never persisted**
> (3c-i's design; `journeyAction.ts:63` says so at the input). So a stamp at 13:30:39 with
> the capture card on screen at 13:41 is consistent with **two** mechanisms: the eligibility
> gate firing behind the capture card, **or** the card having been dismissed before 13:30,
> advance legitimately taking the slot and drawing, and a relaunch resetting
> `captureDismissed` and bringing the capture card back by 13:41. Under the second reading
> the stamp was correct when it happened.
>
> **The device sighting is what prompted looking; the tests are what establish the defect.**
> Full argument in the §13 slice-7d entry. It also constrains the walk: check 1 of 7d's
> script is only valid if the capture card is never dismissed during it.

This contradicts R3 as `constants/journey.ts` states it at `ADVANCE_MAX_TODAY_EXPOSURES`:
*"This counts occasions the user could actually have seen it."* A user with an outstanding
capture can spend all three exposures and a slice of the seven-day cap without the card
drawing once, and then meet it already demoted to the map.

**7b WIDENS IT.** Adjust now also outranks advance, so the budget drains behind C2 too, and
7b's async weekly read guarantees a first frame on which `adjustOffer.placement` is `'hidden'`
(cycles unloaded) while `advanceOffer.placement` is already `'today'`. The exposure is spent on
that frame even when C2 wins the slot a render later.

**THE 7a POST-MERGE OBSERVATION OBLIGATION IS VOID UNTIL 7d LANDS.** The three-calendar-day
exposure-budget observation booked for 2026-09-11 to 09-13 in the 7a entry would be measuring a
counter that increments on the wrong event. Do not run it and do not record a result against it
until the gate is fixed; a pass recorded now would certify the defect.

Deferred rather than folded in: it is 7a's code, it needs `journeyActionFor`'s answer to reach
`useAdvanceOffer` (inverting today's data flow between screen and hook), and that is a Step 0.

---

**WALK-CAUGHT, DEFERRED — the pre-existing read-boundary defect. ROW 7e, after 7d.**

`resolveJourney.ts:378-379` reads `phaseKey: existing.phaseKey` and
`destination: existing.destination` straight off the Firestore document with no validation and
no fallback. `useJourneyLanding` passes the result through untouched.
`JourneyLine.tsx:63` and `:74` then DOUBLE-INDEX: `PHASE_DISPLAY[phaseKey][destination].short`.
A `phaseKey` outside the four keys makes the outer lookup `undefined` and the inner computed
access throws; Home is taken down by an ErrorBoundary before any journey surface renders.

**REPRODUCED ON main** with a console-typed `"remove "` — a trailing space. Not a 7b
regression: `JourneyLine.tsx` is byte-identical to main, the `resolveJourney.ts` diff has ZERO
removed lines, and neither file contains `Object.keys`/`entries`/`assign` on either branch.

**A CLIENT CANNOT PRODUCE THE DOCUMENT.** `validJourney` requires a valid `phaseKey` on create
AND update, and both in-app writers go through `createJourneyState`. Admin SDK writes bypass
rules, so the producers are the console, the beta cohort reset script, or a row predating the
rule. That is why this is a guard and not a hunt for a bad writer.

The guard belongs in `resolveJourney`, not in the component: a component defending itself moves
the blast radius, and the resolver already has the policy — *any failure resolves to
`'legacy'`*, so Home falls back to the weekly landing. `JourneyMapScreen` reads `journeyStates`
directly and `PhasePath` derives from it, so one branch in the resolver covers all three
surfaces. Sequenced AFTER 7d because 7d is a live metric corrupting itself every day it stands,
while this needs a malformed document to bite.

> **AMENDED 2026-09-11 (slice 7e Step 0). THE COVERAGE CLAIM ABOVE IS WRONG, AND THE
> SENTENCE THAT CARRIES IT IS THE ONE THAT SEQUENCED THE WORK.** The paragraph above is
> left unedited in the §3.4 style; this block is the correction.
>
> **THE CLAIM.** *"`JourneyMapScreen` reads `journeyStates` directly and `PhasePath`
> derives from it, so one branch in the resolver covers all three surfaces."* The first
> half is true and is exactly why the second half does not follow. **A screen that reads
> the document directly does not pass through the resolver at all**, so a branch in the
> resolver cannot cover it.
>
> **THE TWO SCREENS BYPASS `resolveJourney` ENTIRELY**, verified by reading the call
> sites rather than by inheriting the claim:
>
> - `JourneyMapScreen.tsx:194` — `return await getJourneyState(uid);` inside its own
>   `read` callback, run from a `useFocusEffect`.
> - `JourneyPhaseScreen.tsx:107` — the same call, in the same shape.
>
> Neither file IMPORTS `resolveJourney` or `useJourneyLanding`. `JourneyMapScreen`
> names `resolveJourney` once, in a comment at `:54`, which is a citation and not an
> edge. The resolver's guard reaches `JourneyLine` and the rest of Today, and nothing
> else.
>
> **WHAT IS ACTUALLY COVERED AFTER 7e, PER FIELD AND PER SURFACE:**
>
> | | bad `phaseKey` | bad `destination` |
> |---|---|---|
> | Today / `JourneyLine` | SAFE (7e resolver guard, plus the component's own) | SAFE (same branch) |
> | Practices / `JourneyMapScreen` + `PhasePath` | **already safe before 7e** — `derivePhaseStates` returns all-`'ahead'` for an unrecognised key (`phaseStates.ts:60-62`), and `PhasePath` indexes `PHASE_DISPLAY` from `PHASE_ORDER` and never from the document (`PhasePath.tsx:147-148`) | **STILL CRASHES.** `PHASE_DISPLAY[phase][destination]` then `cell.short` (`PhasePath.tsx:148,150`) |
> | `JourneyPhaseScreen` | safe for the same reason | **STILL CRASHES** at `:129`, on the route param the map hands it |
>
> **SO THE RESIDUAL IS NARROWER THAN THE ORIGINAL DEFECT AND IS REAL: a malformed
> `destination` still takes the Practices tab down.** It was not folded into 7e, which
> was fenced to `resolveJourney` and `JourneyLine`. It is **row 7f** in §5.
>
> **THE UNDERLYING LESSON, WHICH IS NOT ABOUT THESE THREE FILES.** The claim was written
> from the true observation that all three surfaces read the SAME DOCUMENT, and it
> silently substituted "same document" for "same code path". A guard lives on a path,
> not on a collection. Two more files in this repo read `journeyStates` directly, and
> nothing about a fix in the resolver reaches either of them.

---

**LOGGED — the query-contract gap.** No test anywhere asserts that a document written with a
given field set is FOUND by `getWeeklyCyclesSince`. Every unit test hands `deriveAdjustDue` an
array, and the hook suite mocks the service. The query filters on the **`userId` field**
(`weeklyCycle.service.ts:642`), not the document path, so a seeded row with the right id and no
`userId` field is invisible and the offer silently never fires. This is the
`reference_rules_test_harness` vacuous-green shape in a new place: the assertions are real and
the thing they assert is not the thing that breaks. Logged to the rules harness backlog
(`docs/TEST_INFRASTRUCTURE_BACKLOG.md`) rather than fixed here, because it is a harness
capability and not a slice.

**LOGGED TO ROW 7c — two door refinements from the walk:**

- **The door should arrive EXPANDED when reached from the Today card.** Today the card's
  primary reads "Try a different approach", the user taps it, and the phase page presents a
  control with the SAME LABEL that they have to tap again. Two taps, one label, one intention.
  Shut-by-default is right when the page is reached from the map, where the door is an aside on
  an explanation; it is wrong when the user has just answered an offer. The page cannot
  currently tell the two arrivals apart, which is the actual work.
- **No in-flight guard on the choice write.** `onChoose` guards on `chosen` so a completed
  choice cannot be re-made, but nothing marks the tap while the promise is settling. Harmless
  when the write settles; when it does not, the page shows three tappable options and no
  acknowledgment. 7c is already in that code and is where the pending state belongs.

---

**WINDOW RULE: OPTION (ii), THE READS-ONLY WINDOW** (Step-0 amendment 4, 2026-09-10). Cycles
with no `phaseRead` are removed BEFORE the two most recent are taken, so an unanswered week
does not occupy a slot. This reverses the rule `derive.ts` used to state — that absence "breaks
a run exactly as a 'moving' read would". Silence still never accumulates and still never counts
against the user; it is simply not a read. `unclear` IS a read and still breaks the run, so
uncertainty and absence are now deliberately distinguishable where they used to be identical.

**THE BLANK-LIVE-CYCLE CASE IS REAL, AND NOT ONLY A ROLLOVER ARTEFACT (walk, 2026-09-11).** The
weekly read is reachable on Today MID-WEEK, not only at the turn of the week, so a live cycle
can sit unanswered for days while the user opens the app repeatedly. Under the old rule that
blank live cycle displaced one of the two reads and withdrew a due offer from a user who had
not been asked anything yet — every day, not just on rollover morning. The rollover argument
was the one written down at Step 0; this is the larger case it was a special instance of.

---

**WALK SCRIPT CORRECTIONS (2026-09-11).** The script handed over at 7b's close was wrong in
four ways. Corrected here so the next seeded walk does not rediscover them:

1. **Capture must be satisfied first.** Capture outranks adjust in `journeyActionFor`, so a
   seeded account with an outstanding Remove capture serves the capture card and C2 never
   appears however correct the weekly rows are. Complete the capture on device before
   expecting the adjust card at all.
2. **Cycle document IDs are `{uid}_{weekStart}`**, per `weeklyCycleDocId`. A console-seeded row
   with an auto-ID is still found (the query filters on the `userId` FIELD), but it will not
   dedup against the row rollover writes for the same week, and the account ends up with two
   cycles covering one week.
3. **Week start is the user's CHOSEN day, not an arbitrary date.** On the walk account that is
   **Monday**. Seeded `weekStart` values that do not fall on the user's start day produce
   cycles that `planWeek` will never line up with, and the live week rolls over beside them.
4. **Seeded absent fields must be typed null, not empty string.** `adjustDeclinedAt: ""` is not
   `null`: `timestampToIso` returns null for it so the floor happens to survive, but
   `adjustChoice: ""` and similar empty strings read as present-and-empty to any `??` or
   truthiness check downstream. Write real nulls.

---

**FIGURES**, re-run on `82e398e` after the walk, working tree clean:

- tsc **149** (baseline 149, unchanged)
- jest **3400 / 221 suites** (baseline 3400 / 221, unchanged)
- copy-draft sentinel **150** (baseline 150, unchanged)
- lint 1101 errors / 1344 warnings. Rules **191/2** and functions **53/4** carried unrun: this
  slice changes neither, and `firestore.rules` is untouched.

**ATTESTATIONS (Kyle, 2026-09-11):**

- **Suites green at the figures above:** tsc 149 / jest 3400 of 221 / sentinel 150. ATTESTED.
- **Device walk passed, steps A through G:** ATTESTED, 2026-09-11.

---

*Living document. Owner: Kyle. Update as slices close; do not edit §1–§4 during the freeze.*
