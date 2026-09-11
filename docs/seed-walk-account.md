# Seeding a journey walk account

**What this is.** The field-level recipe for putting a real account into a state
a device walk can exercise: an advancement offer that is due, an adjustment
offer that is due, and a Remove capture that is outstanding or satisfied on
purpose.

**Written 2026-09-11**, at slice 7d's close, from the seeding rules the 7b walk
corrected and the ones 7d needed. It is a companion to the walk scripts, not a
replacement for one: a script says what to look at, this says how to get the
account there.

**Every claim here cites the code that reads the field.** Where the two
disagree, the code is right and this file is stale — say so rather than working
around it.

---

## 1. The five rules that make a seeded row count

The first four were learned the hard way on the 7b walk, where a seeded account
looked correct in the console and produced no offer. The fifth came out of 7b's
query-contract gap.

1. **Capture must be satisfied before any check that expects the adjustment
   card.** Capture outranks adjust in `journeyActionFor`
   (`mobile/src/journey/journeyAction.ts:76-85`), so an account with an
   outstanding Remove capture serves the capture card and C2 never appears
   however correct the weekly rows are. Complete the capture on device, or seed
   `removeCapturedAt`, before expecting C2 at all. See §5 for the inverse.

2. **Cycle document IDs are `{uid}_{weekStart}`**
   (`weeklyCycle.service.ts:215-217`). A console-seeded row with an auto-ID is
   still *found* — the query filters on the `userId` FIELD, not the document
   path — but it will not dedup against the row rollover writes for the same
   week, and the account ends up with two cycles covering one week.

3. **`weekStart` must fall on the account's CHOSEN start day**, not an
   arbitrary date. On the current walk account that is **Monday**. Seeded
   `weekStart` values that miss the start day produce cycles `planWeek` never
   lines up with, and the live week rolls over beside them.

4. **Absent fields are typed `null`, never the empty string.**
   `adjustDeclinedAt: ""` is not `null`: `timestampToIso` happens to return null
   for it so the floor survives, but `adjustChoice: ""` and its siblings read as
   present-and-empty to every `??` and truthiness check downstream. Write real
   nulls, or omit the field.

5. **Every seeded cycle needs a real `userId` field.**
   `getWeeklyCyclesSince` filters `where('userId', '==', userId)`
   (`weeklyCycle.service.ts:637-639`), which reads the FIELD. A row with the
   right document ID and no `userId` field is invisible to the query, the
   adjustment offer silently never fires, and nothing anywhere reports an error.

---

## 2. Document IDs

| Collection | ID format | Source |
|---|---|---|
| `journeyStates` | `{uid}` — one document per user | `journeyState.service.ts:56` and every `doc(requireDb(), JOURNEY_STATES, userId)` call |
| `weeklyCycles` | `{uid}_{weekStart}` | `weeklyCycleDocId`, `weeklyCycle.service.ts:215-217` |
| `dailyLogs` | `{uid}_{date}` | `dailyLogDocId`, `dailyLog.service.ts:51-53` |

`weekStart` and `date` are ISO `YYYY-MM-DD`.

**`journeyStates.id` is not the authority on ownership; the document path is.**
`getJourneyState` sets `id` from its argument, so a stored field that disagrees
still reads back correctly (`journeyState.service.ts:106-112`). Seed it to match
anyway.

---

## 3. `journeyStates/{uid}` fields

Types are as the Firestore console names them. **Optional** means absent on
documents written before the slice that added it, and every reader treats
absence as the zero answer — so leaving a field out is a valid seed, and is
different from seeding an empty string.

### Identity and phase

| Field | Type | Notes |
|---|---|---|
| `id` | string | The uid. Path wins if they disagree |
| `userId` | string | The uid |
| `destination` | string | `DestinationKey`. One of the four route keys |
| `phaseKey` | string | `PhaseKey`. **Must be a valid key** — `validJourney` gates it on create and update, and a value outside the union takes Home down until slice 7e lands its guard |
| `enteredAt` | timestamp | When the current phase began. **Drives three separate derivations** — see below |
| `history` | array | `PhaseHistoryEntry[]`. Empty array on a fresh journey |
| `skipped` | array | `PhaseKey[]`. Empty array on a fresh journey |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | Feeds `revisionToken`; Home re-resolves when it moves |

`enteredAt` is read three ways and they are easy to conflate:

- **The consistency door** counts `dailyLogs` with `protocolCompleted === true`
  and `date >= enteredAtIso`, inclusive (`derive.ts:37-41`).
- **The calendar ceiling** counts whole days from `enteredAt` to today
  (`deriveCalendarDays`).
- **The adjustment window** floors at `enteredAt` too — see `adjustArmedFromIso`
  below.

### Advancement offer (slice 7a, re-gated in 7d)

| Field | Type | Notes |
|---|---|---|
| `advanceOfferedAt` | timestamp \| null | The LAST exposure. Slides forward with each one |
| `advanceDeclinedAt` | timestamp \| null | Non-null demotes the offer to the map permanently for this phase |
| `advanceExposures` | number | Optional-safe: read as `?? 0`. At `ADVANCE_MAX_TODAY_EXPOSURES` (3) the offer demotes |
| `advanceFirstOfferedOn` | string \| null | ISO date. Anchors the seven-day cap. **Not** `advanceOfferedAt`, which slides |
| `advanceLastExposedOn` | string \| null | ISO date. THE DAY GATE: equal to today means today is spent |

### Adjustment offer (slice 7b, re-gated in 7d)

| Field | Type | Notes |
|---|---|---|
| `adjustOfferedAt` | timestamp \| null | **The phase page's door key.** Non-null renders "Try a different approach" for the rest of the phase (`JourneyPhaseScreen.tsx:194`) |
| `adjustDeclinedAt` | timestamp \| null | A re-arm FLOOR, not a suppression. See `adjustArmedFromIso` |
| `adjustDeclines` | number | Optional-safe: `?? 0`. At `ADJUST_MAX_PROACTIVE_OFFERS` (2) the card stops; the door stays |
| `adjustChoice` | string \| null | Optional. `AdjustChoiceId`. Recorded, not yet honoured — that is row 7c |
| `adjustChosenAt` | timestamp \| null | Optional. Also a re-arm floor |

**`adjustArmedFromIso` is derived, not stored, and it is the MAXIMUM of three
dates**: the phase entry, `adjustDeclinedAt`, and `adjustChosenAt`
(`resolveJourney.ts:290-298`). Two consequences for seeding:

- The floor is **never earlier than `enteredAt`**, even with both timestamps
  null.
- `deriveAdjustDue` keeps a cycle only when `cycle.weekStart > armedFromIso`,
  **strictly greater** (`derive.ts:271-280`). A cycle whose `weekStart` equals
  the phase entry date is excluded and does not occupy a window slot.

### Remove capture (slice 3c-i) and replacement (3c-ii)

| Field | Type | Notes |
|---|---|---|
| `removeFamily` | string \| null | Optional. `RemoveFamily` |
| `removeTargetChip` | string \| null | Optional. A curated id, never display text |
| `removeTargetText` | string \| null | Optional. The user's own words. Never interpolate into generated copy |
| `removeTiming` | string \| null | Optional. `RemoveTiming` |
| **`removeCapturedAt`** | **timestamp \| null** | **Optional. THE GATE. See §5** |
| `removeReplacementId` | string \| null | Optional |
| `removeReplacementSlot` | string \| null | Optional. `ReplacementSlot` |
| `removeReplacementAt` | timestamp \| null | Optional. The gate for the replacement, on the same contract |

The other four capture fields can each legitimately be null after a real
capture: the chips path writes no text, the free-text path writes no chip, and
two of the five routes skip the timing question outright (`models.ts:1012-1023`).
**Gate on `removeCapturedAt` and nothing else.**

---

## 4. `weeklyCycles/{uid}_{weekStart}` fields

Only the fields a journey walk touches are annotated; the rest are the weekly
loop's and can be left as the app wrote them.

| Field | Type | Notes |
|---|---|---|
| `id` | string | `{uid}_{weekStart}` |
| **`userId`** | **string** | **Required by the query. Rule 5** |
| `weekStart` | string | ISO date, on the account's start day. Rule 3 |
| `weekEnd` | string | Optional. Became a stored field partway through; absent rows resolve to `weekStart + 6` via `resolveWeekEnd` (`utils/weekStart.ts:135-140`) |
| **`phaseRead`** | **string** | **`'moving'` \| `'not_moving'` \| `'unclear'`. Absent means NOT A READ** |
| **`phaseKeyAtRead`** | **string** | **`PhaseKey`. Must EQUAL the current `phaseKey` or the row is filtered out** |
| `capacityInitial` | string | `CapacityTier` |
| `capacityCurrent` | string | Optional |
| `outcome` | string | Optional. Legacy; journey-model cycles carry none |
| `protocolId` | string | Optional |
| `closeCompletedAt` | timestamp | Optional |
| `ratingFocus` / `ratingRecovery` / `ratingEnergy` | number | Optional |
| `closeNote` | string | Optional. An Insights input, not dead data |
| `adjustmentSelected` | string | Optional |
| `floorMet` | boolean | Optional |
| `createdAt` / `updatedAt` | timestamp | |

**Three filters run before the two most recent rows are taken**, all in
`deriveAdjustDue` (`derive.ts:271-283`), and all three must hold:

1. `phaseRead` is present — **a week with no read is not a read, and does not
   displace anything.** An unanswered live cycle used to occupy a slot and
   withdraw a due offer; the reads-only window ended that.
2. `phaseKeyAtRead === phaseKey` — the read must be about the stretch the user
   is standing in.
3. `weekStart > armedFromIso` — strictly after the floor.

Then the **last two** of what survives must both be `'not_moving'`
(`ADJUST_CONSECUTIVE_NOT_MOVING = 2`).

**Do not re-sort the rows you seed and do not reason about "newest" yourself.**
The service orders by `resolveWeekEnd`, and that ordering is the contract;
`deriveAdjustDue` consumes it and sorts nothing.

---

## 5. Making the capture outstanding on a walked account

**The derivation is one field.** `resolveJourney.ts:384` reads:

```
hasRemoveCapture: !!existing.removeCapturedAt
```

`existing` is the `journeyStates/{uid}` document. `journeyActionFor` then serves
the capture card when **all three** of these hold
(`journeyAction.ts:76-82`):

| Condition | Where it lives | How to set it |
|---|---|---|
| `phaseKey === 'remove'` | `journeyStates.phaseKey` | Phase-scoped by design: a user in `recover` with no capture is never chased for one |
| `!hasRemoveCapture` | `journeyStates.removeCapturedAt` | **Set it to `null`, or delete the field** |
| `!captureDismissed` | Component state in `DashboardScreen` | Session-only, never persisted. **Relaunch the app** and it is false again |

**So: null `removeCapturedAt`, confirm `phaseKey` is `remove`, and relaunch.**

Leave the other four capture fields as they are. They are not read by this gate,
and clearing them models a state the app cannot produce. If you want the
account to look like it never captured at all, null all five — but nothing
depends on it.

**The dismissal is the one that catches people.** `captureDismissed` is React
state, so dismissing the card during a walk hides it for that session only and
lets adjust through. That is a real state, not a bug — just do not mistake it
for the seed having failed.

---

## 6. Two seed shapes

### ADVANCE-DUE

`journeyStates/{uid}`:

| Field | Value |
|---|---|
| `enteredAt` | **15 or more days ago** — opens the ceiling door with no daily logs needed |
| `advanceExposures` | `0` |
| `advanceOfferedAt` | `null` |
| `advanceFirstOfferedOn` | `null` |
| `advanceLastExposedOn` | `null` |
| `advanceDeclinedAt` | `null` |

Either threshold suffices and never both (`deriveAdvanceDoor`): the **ceiling**
door needs `ADVANCE_CALENDAR_CEILING_DAYS` (14) days in phase, the
**consistency** door needs `ADVANCE_MIN_CONSISTENT_DAYS` (8) `dailyLogs` with
`protocolCompleted === true` and `date >= enteredAtIso`. **The ceiling route is
one field; prefer it** unless the walk is specifically about the consistency
copy variant.

### ADJUST-DUE

Everything in ADVANCE-DUE, plus:

| Field | Value |
|---|---|
| `adjustOfferedAt` | `null` |
| `adjustDeclinedAt` | `null` |
| `adjustDeclines` | `0` |
| `adjustChoice` / `adjustChosenAt` | `null` or absent |
| `removeCapturedAt` | **a real timestamp** — capture outranks adjust (rule 1) |

Plus **two `weeklyCycles` rows**, consecutive weeks, each:

- ID `{uid}_{weekStart}`, `weekStart` on the account's start day (Monday)
- `userId` set to the uid
- `weekStart` **strictly after** the phase entry date
- `phaseRead: 'not_moving'`
- `phaseKeyAtRead` equal to the current `phaseKey`

They must be the **two most recent** surviving rows. A newer cycle carrying a
`'moving'` or `'unclear'` read breaks the run; a newer cycle with **no**
`phaseRead` does not, and that is deliberate — silence is not a read.

---

## 7. Resetting between checks

Most walks re-run the same surface several times. By hand, on
`journeyStates/{uid}`:

- **To re-offer advancement:** `advanceExposures` to `0`; `advanceOfferedAt`,
  `advanceFirstOfferedOn`, `advanceLastExposedOn`, `advanceDeclinedAt` to
  `null`.
- **To re-offer adjustment:** `adjustOfferedAt`, `adjustDeclinedAt` to `null`;
  `adjustDeclines` to `0`. Nulling `adjustDeclinedAt` matters more than it
  looks — it is the re-arm floor, so leaving it set excludes every cycle at or
  before it.
- **To re-lock the phase page door:** `adjustOfferedAt` to `null`. It is the
  only thing `JourneyPhaseScreen` reads for this.

A **phase change** resets all of it for free: `CLEARED_OFFERS`
(`journeyState.service.ts:92-103`) nulls both offer timestamps, both decline
timestamps, the choice pair, and zeroes `advanceExposures` and `adjustDeclines`.
If a walk has finished with a phase, advancing is cheaper than editing ten
fields.

**Home re-resolves on every focus and keys off `updatedAt`.** A console edit
that does not move `updatedAt` still lands, because a relaunch re-reads
regardless — but backgrounding and foregrounding is the reliable way to see an
edit take effect without a cold start.
