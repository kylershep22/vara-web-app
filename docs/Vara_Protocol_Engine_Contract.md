# Vara — Protocol Engine Contract

**Version 1.0 | Engine spec for the weekly spine (D1) | Status: pure module built, wired into nothing**

This is the implementation contract for Vara's protocol engine: protocol selection, the week-1 quick-win rule, and the continuity calculation. It formalizes Sections 1, 6, and 7 of `Vara_Reconciled_Product_Spec.md`.

The module is named for what it owns rather than for a cadence, because it holds both: selection is **daily** (capacity and time are daily reads, so the variant served changes day to day), while the quick-win week rule and continuity are genuinely **weekly**.

It is the sibling of `Vara_Engine_Contract.md`, which covers the per-session recommendation engine (situation × state → plan). The two are separate modules and never import each other.

---

## 1. Scope

**In scope:** the outcome and capacity taxonomy, the 4 × 3 protocol matrix, protocol selection, the week-1 quick-win rule, and the continuity-against-floor calculation.

**Out of scope (later slices):** persistence of the weekly record, the weekly open UI, the Today screen, the in-week "This week changed" control, the weekly close, floor-commitment capture, and instrumentation. This module has no persistence, no UI, no Firestore, and no production caller.

**Location:** `mobile/src/protocolEngine/`. Public surface is `mobile/src/protocolEngine/index.ts`. That barrel is deliberately not re-exported from any app barrel while the module is unconsumed.

---

## 2. Purity rules

The module is a pure function of its inputs, matching the discipline of `src/engine`:

- No React, no Firebase, no Firestore.
- No `Date.now()`, no `new Date()`, no system-clock reads of any kind.
- Time is **injected**: `weekNumber` as a parameter, `weekStart` as a field on the record the caller supplies.
- No input is mutated. Functions that change a protocol return a new object.
- Deterministic: the same inputs always return the same output.

Tests import the module directly. No mocks are required to test any of it.

---

## 3. Taxonomy (LOCKED — spec Section 5)

**Outcomes** are exactly four: `focus` | `stress` | `routines` | `energy`.

**Capacity tiers** are exactly three: `normal` | `limited` | `slammed`.

This is the single vocabulary across the weekly open, the Practices filters, and content tags. Do not introduce a second set of category names. Community is a nav tab, never an outcome. "Time" is called "Routines".

---

## 4. Types

```ts
type OutcomeKey   = 'focus' | 'stress' | 'routines' | 'energy';
type CapacityTier = 'normal' | 'limited' | 'slammed';

interface ProtocolVariant {
  id: string;                      // convention: `${outcome}-${capacity}`
  outcome: OutcomeKey;
  capacity: CapacityTier;
  name: string;                    // PLACEHOLDER [Jen]
  dailyAction: string;             // PLACEHOLDER [Jen]
  estMinutes: number;              // PLACEHOLDER [Jen]
  whyItWorks: string;              // PLACEHOLDER [Jen], clinically defensible
  quickWinPracticeId: string;      // reference; practice need not exist yet
  supportingPracticeIds: string[]; // OPTIONAL extras only; may be empty
}

// A protocol resolved for a specific week (Section 7).
interface ResolvedProtocolVariant extends ProtocolVariant {
  quickWinActive: boolean;
}

interface WeeklyRecord {
  weekStart: string;               // injected by the caller
  floorMet: boolean;
}
```

**Naming note.** The matrix entry type is `ProtocolVariant`, deliberately **not** `Protocol`, and no longer `WeeklyProtocol` — the object is one variant entry in a cell (it carries `variantKey` and `timeClass`), and the cadence it is served at lives in the selection call, not in the object. `src/types/models` already exports a `Protocol`, which is a *practice* (a breathwork session, an NSDR track) consumed by `src/engine`. Different concepts, different modules, no shared imports, and now no name collision either. The practice-level `Protocol` is untouched.

---

## 5. Content is data, not logic

All 12 protocols live in `protocolMatrix.ts` as a data structure. Logic reads that data and never branches on it.

**Every user-facing string in that file is a PLACEHOLDER marked `[Jen]`.** The `dailyAction` values are the draft actions from spec 6.2; `name`, `estMinutes`, and `whyItWorks` are build-and-test stand-ins. Jen owns the final content, and it drops into that one file without any code change. **Do not ship placeholder copy.**

`whyItWorks` must stay defensible to a clinical audience. The placeholders are written conservatively for that reason, but they are still placeholders.

Copy rule (product principle 8): no em dashes in user-facing strings. A unit test enforces this across all 12 protocols.

### The matrix (draft actions per spec 6.2)

| Outcome | normal | limited | slammed |
|---|---|---|---|
| **focus** | one 25-min single-task block + a device-free break | one 15-min single-task block | 5 min on one thing, every other tab closed |
| **stress** | 10-min extended exhale + an afternoon device-free break | 5-min extended exhale + a break | 5-min extended exhale |
| **routines** | one 3-step anchor routine, same order daily | a 2-step anchor routine | one anchor cue at the same time daily |
| **energy** | morning light within 30 min of waking + movement + consistent wake time | morning light + consistent wake time | morning light only |

A unit test asserts `estMinutes` never rises as capacity drops, which is product principle 1 ("the system reduces its own demand as capacity drops") expressed as a check on the data.

---

## 6. Selection

```ts
selectProtocol(outcome: OutcomeKey, capacity: CapacityTier): Protocol
```

A pure lookup into the matrix. The matrix is a `Record<OutcomeKey, Record<CapacityTier, ProtocolVariant[]>>`, so every cell exists — but a cell is an ORDERED SET of time variants (reshaped per roadmap 3b-ii-a), not a single protocol, so totality is no longer a property of the type. It is held by the fallback ladder in `selectProtocol.ts` and by the tests over it.

The in-week control (spec Section 7) is expressed as re-calling this with the same outcome and the adjacent tier. This module does not own the tier-stepping or the event logging.

---

## 7. Week-1 quick-win rule (spec 6.3)

```ts
applyQuickWin(protocol: ProtocolVariant, weekNumber: number): ResolvedProtocolVariant
```

Time-to-felt-effect varies enormously: an extended exhale lands in minutes, a routine takes weeks. A user who picks Routines has no felt payoff for two weeks, which is the worst retention curve there is. So **every week-1 protocol appends one same-session physical practice regardless of outcome** (default: the 90-second extended exhale, `quickWinPracticeId` = `'exhale-90s'`). Get the nervous system to prove the app works before the calendar has to.

- **Week 1:** returns the protocol with `quickWinActive: true`.
- **Week 2 and later:** returns the protocol with `quickWinActive: false`.
- **Never mutates** the input, and never writes a `quickWinActive` field onto it.
- **Stateless:** the flag is recomputed from `weekNumber` on every call, so passing an already-resolved protocol back in cannot drift.

When the flag is true, the caller surfaces the practice referenced by `quickWinPracticeId` as an in-session step alongside the daily action.

`weekNumber` is injected by the caller. This module has no notion of what week it is.

### Why a flag and not an appended practice

`supportingPracticeIds` means **optional supporting practices, and nothing else.** The week-1 quick win is a *mandatory same-session step*. Appending the quick win to that list would flatten two different things into one array, and the Today screen has to render them differently, so the distinction is made explicit in the type instead.

`quickWinActive` therefore lives on `ResolvedProtocolVariant`, not on `ProtocolVariant`: the matrix is static content, and this is per-week state. The flag is required rather than optional so there is no third "undefined" case to reason about at call sites.

Tests assert that `supportingPracticeIds` comes back as the **same array reference** in every week, and that a non-empty supporting list is preserved exactly with nothing appended.

Spec 6.3 also says the quick win is dropped from week 2 "unless the user pins it". Pinning is a persistence concern and is **not** in this module.

---

## 8. Continuity — the load-bearing invariant (spec Section 1, D1)

```ts
computeContinuity(records: WeeklyRecord[]): number
```

Returns the run of consecutive weeks, ending at the most recent week, where `floorMet === true`. A week with `floorMet === false` breaks the run. Empty history returns 0.

**Precondition:** `records` are chronological, oldest first. The function counts backwards from the tail and does not sort.

### The invariant

> **Continuity is measured against the user's floor commitment, never against the current capacity tier.**

A `slammed` week with `floorMet === true` counts **identically** to a `normal` week with `floorMet === true`. Raising or lowering capacity changes what the app *offers* that week, but it can never move the line that defines "unbroken".

This is precisely what makes the dynamic in-week re-set (spec Section 7) safe in **both** directions. You cannot upshift yourself into a fresh failure, because the line that counts never moves. Remove this property and the up-tier control becomes a trap, and the whole "adjust any time, either direction" promise collapses.

### How it is protected

1. **`WeeklyRecord` carries no tier field.** This is deliberate. Do not add one.
2. **`computeContinuity` reads only `floorMet`.** Do not add a tier parameter, a tier lookup, or a tier-dependent weighting.
3. **Tests have teeth.** Beyond the mixed-tier and downshift-then-upshift cases, one test attaches a `capacity` property to the records anyway and asserts the count is unchanged. If someone later smuggles a tier onto the record and starts reading it, that test fails.

Product principle 3 ("continuity beats intensity") and spec Section 9 ("slammed weeks counting fully") both depend on this holding.

---

## 9. Public surface

From `mobile/src/protocolEngine`:

| Export | Kind | Purpose |
|---|---|---|
| `OutcomeKey`, `CapacityTier`, `ProtocolVariant`, `ResolvedProtocolVariant`, `WeeklyRecord` | types | Section 4 |
| `ProtocolVariantMatrix` | type | Shape of the matrix |
| `PROTOCOL_MATRIX` | data | The 12 protocols |
| `OUTCOME_KEYS`, `CAPACITY_TIERS` | data | Iteration order |
| `DEFAULT_QUICK_WIN_PRACTICE_ID` | data | `'exhale-90s'` placeholder |
| `allProtocols()` | fn | All 12, flattened |
| `selectProtocol()` | fn | Section 6 |
| `applyQuickWin()`, `QUICK_WIN_WEEK` | fn / const | Section 7 |
| `computeContinuity()` | fn | Section 8 |

---

## 10. What this module does not do

Listed explicitly so the next slice does not assume otherwise:

- Does not decide when a week starts, or what week number it is.
- Does not read, write, or know about Firestore, `userPrivate`, or any store.
- Does not track continuity **per outcome** (spec D3 requires this; the caller partitions its records by outcome and calls `computeContinuity` per partition).
- Does not own the floor commitment text, its capture, or its display.
- Does not step capacity tiers, or emit `downshift_event` / `upshift_event`.
- Does not resolve `quickWinPracticeId` or `supportingPracticeIds` to real catalog practices. They are references, and the referenced practices need not exist yet.
- Does not enforce the softened focus guards (spec 10.2).

---

## 11. LOCKED 2026-09-12 — two standing rules about duration

*Appended, originals above untouched. Both were locked with Jen on 2026-09-12 at
the close of the slice 7i / 7k content batch, and both exist because a plausible
tidy-up would have broken something.*

> **EXTENDED 2026-09-17 (journey slice 7c). THERE ARE NOW THREE RULES, AND THE
> HEADING ABOVE IS LEFT UNEDITED IN THE §3.4 STYLE.** 11.3 is Jen's downward
> capacity search, ruled the same day. It is here rather than in §6 Selection
> because it is a rule ABOUT DURATION and because the first thing a reader does
> on meeting it is ask whether it contradicts 11.2. It does not, and 11.3 says
> why in its own words rather than leaving the reader to work it out.

### 11.1 `estMinutes` IS A ROUTING INPUT, NOT DESCRIPTIVE METADATA

`timeClass` is DERIVED from `estMinutes` and never typed
(`protocolMatrix.ts timeClassForMinutes`; bounds short <= 5, medium <= 15,
long > 15). **Crossing 5 or 15 re-slots a protocol's time class**, which changes
which variants a time answer can reach, and can silently break the destination
matrix by moving a variant out of the set its destination weight assumes.

**NEVER ADJUST `estMinutes` FOR TIDINESS.** Not to round a number, not to make a
column look consistent, not to make a duration match a phrase in the copy. Treat
every change as a routing change and check the class either side of it.

**THE WORKED EXAMPLE, AND IT IS A NEAR-MISS RATHER THAN A HYPOTHETICAL.** In the
same batch that locked this rule, Jen proposed moving **R5** from 6 to 5, reading
the number as descriptive. **6 -> 5 crosses the short boundary**: R5 would have
left `recover.limited`'s medium set, and since the Recover destination matrix
routes Routines/Limited to R5, the weighting delivered that same day would have
been broken by a one-minute edit made for tidiness. **R5 stays at 6**, and the
reason is recorded at the value rather than left to be rediscovered.

This also cuts the other way: the copy no longer states durations at all (slice
7i), so **nothing in the user-facing string will contradict a bad number.** The
routing is the only thing that will notice, and it notices silently.

### 11.2 A COMPLETION PRACTICE MAY BE LONGER THAN THE PROTOCOL'S ESTIMATED MINIMUM, NEVER SHORTER

`estMinutes` is a **minimum**, not a target. A supporting or completion practice
that takes longer than the protocol's stated figure is fine and expected; one
that takes LESS cannot satisfy the protocol it is attached to.

**THE CASE THAT PRODUCED IT: R7.** Its supporting practice is
`extended-exhale-2`, a 2-minute practice, and R7 was typed at 5 minutes - so the
practice that was supposed to satisfy the protocol was shorter than the protocol.
**R7 moved 5 -> 2** (staying `short`, so nothing re-slots). At 2 and 2 they are
equal, which the rule permits.

**THE RULE'S OTHER DIRECTION IS ALSO DELIBERATE.** R9 is typed at 5 with
supporting practices of 10 and 20 minutes (`bright-light-10`, `bright-light-20`),
and **stays at 5**. A light practice that exceeds the protocol's minimum is
intentional, not a mismatch to be corrected.

**Applying 11.2 must not violate 11.1.** Lowering an `estMinutes` to match a
short practice is exactly the edit 11.1 forbids if it crosses a boundary. R7 was
safe because 5 and 2 are both `short`. Check the class before applying this rule,
not after.

### 11.3 ON THE ADJUSTMENT PATH, CAPACITY IS A CEILING: SEARCH DOWNWARD, NEVER UPWARD, NEVER ACROSS MECHANISMS

*Locked with Jen on 2026-09-17, ruling 3, and built in journey slice 7c.*

**THE RULE.** When a user has recorded an in-phase adjustment and the mechanism
they asked for has **no protocol fitting the time they have at the capacity they
stated**, the engine searches **downward** through lower-demand capacity variants
of **the same mechanism** before it will serve anything else. It never searches
upward, and it never crosses to another mechanism to find a shorter protocol.

**Jen's worked example, which the build reproduces exactly and a test pins.** A
user at **Normal** capacity who has asked for *"Help me get something back"*:

| Time they have | Served | Tier it came from |
|---|---|---|
| 20+ minutes | **R3** *Set the morning signal* | normal |
| 10-15 minutes | **R6** *Start with light* | limited |
| 5 minutes or less | **R9** *Get some morning light* | slammed |

**WHY DOWNWARD AND NOT "THE NEXT SHORTEST VARIANT IN THIS CELL".** The cell's
shorter variant belongs to a **different mechanism**. Serving it would answer a
question the user did not ask: they said *"help me come down"* and would be
handed the re-anchor protocol because it happened to be shorter. Crossing
mechanisms is the thing this rule exists to avoid, so it walks the axis on which
the same mechanism reappears - capacity - and gives up rather than crossing.

**CAPACITY IS A CEILING, NOT A MINIMUM.** A Normal-capacity user being served a
`slammed`-tier variant is the rule working, not a defect. What the tier bounds is
how much the day may ASK of them; nothing says a day must ask that much.

**SCOPED TO THE ADJUSTMENT PATH (Kyle, 2026-09-17).** The general version - walk
downward whenever any preferred mechanism has no time-fitting variant, including
the destination path - is a candidate for a later row and is **not** built. The
consequence is stated rather than hidden: the same user, at the same capacity and
the same time answer, is served a **20-minute** protocol with no preference
recorded and a **5-minute** one with a preference recorded.

---

**IT DOES NOT CONTRADICT 11.1, AND IS THE ALTERNATIVE TO THE EDIT 11.1 FORBIDS.**
11.1 bars changing `estMinutes` for tidiness because crossing 5 or 15 re-slots a
variant. This rule **changes no number at all**. The case 11.1 records as a
near-miss - Jen proposing R5 from 6 to 5 - and the case row 7l recorded as
unfixable - R3's 20 minutes being the only thing standing between an Energy user
and a five-minute answer - are both reached here **without moving a duration**,
by finding a shorter variant of the same mechanism one tier down.

**IT DOES NOT CONTRADICT 11.2 EITHER, AND THIS PARAGRAPH EXISTS BECAUSE IT READS
AS THOUGH IT MIGHT.** 11.2's headline is *"...NEVER SHORTER"*, and a rule two
inches below it that says *search DOWNWARD* will be read by somebody as licence
to serve something shorter than the protocol requires. It is not. **The two
govern different pairs:**

- **11.2 governs a supporting or completion practice against the protocol it is
  attached to.** A practice shorter than its protocol's `estMinutes` cannot
  satisfy that protocol. Unchanged, and it still binds the variant the search
  lands on, measured against **that** variant's own minutes.
- **11.3 governs a protocol against the time the USER said they have.** Serving
  a protocol shorter than the available time is not a shortfall; it is the time
  ladder's existing and documented behaviour, stated at `pickVariant`: *"serving
  something longer spends time they said they did not have, while serving
  something shorter simply leaves some back."*

Nothing in 11.3 lets a practice fall below its protocol's minimum. Nothing in
11.2 requires a protocol to consume the user's whole window.

**ONE SECOND-ORDER ITEM, RECORDED BECAUSE IT IS REAL AND IS NOT THE ENGINE'S TO
ANSWER.** R9 is typed at 5 minutes with supporting practices of 10 and 20
(`bright-light-10`, `bright-light-20`), held there deliberately by Jen in slice
7k and expressly permitted by 11.2. A Normal-capacity user with five minutes and
a refill preference now reaches R9 - the protocol fits - and its supporting
practices do not. That is 7l's step-9 overrun observation reappearing one hop
down, it is a content question rather than a routing one, and it goes to Jen with
the rest of slice 7c's findings.

**TERMINATION IS A PROPERTY OF THE CONTENT AND IS GUARDED AS ONE.** The walk ends
because every mechanism holds a `short` variant at `slammed`. Nothing in the rule
guarantees that; `protocolEngine/__tests__/protocolMatrix.mechanisms.test.ts`
does. If a Recover cell ever loses a variant, that suite fails before a user
meets a mechanism the engine cannot resolve.
