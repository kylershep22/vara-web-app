# Slice 7c — device walk

**Branch:** `journey/slice-7c-honour-adjustment`
**Row:** §5 7c, "Honour the recorded adjustment". Walk cell: **Yes**.
**Device:** iPhone 14 Plus, dev client, `--tunnel`.
**Every step runs twice: default Dynamic Type, then 1.3x.**
**SE: NOT WALKABLE IN THIS SETUP.** No SE device. Recorded as outstanding, not
passed by inspection, matching R1b-i, R2, 7l and 7n.

---

## Before you start

**Steps 0 through 0d run on `main`, BEFORE the branch is built onto the phone.**
They are not optional and they cannot be recovered afterwards: every later step
compares against a protocol title recorded here, and once the branch is
installed there is no way back to the unadjusted serve for the same account on
the same day. If they are skipped, steps 6, 11 and 13 have nothing to be
measured against and the walk is worth less than it looks.

**Seeding is required.** Two consecutive weekly cycles with `not_moving` reads
cannot be produced in a sitting. Follow `docs/seed-walk-account.md`, and the four
corrections from 7b's close still apply:

1. **Cycle document IDs are `{uid}_{weekStart}`.** A console-seeded row with an
   auto-ID is still found (the query filters on the `userId` FIELD), but it will
   not dedup against the row rollover writes for the same week.
2. **Week start is the user's CHOSEN day**, which is **Monday** on the walk
   accounts. A `weekStart` that does not fall on it produces cycles `planWeek`
   never lines up with.
3. **Seeded absent fields must be typed `null`, never `""`.** `adjustChoice: ""`
   reads as present-and-empty to a `??` downstream.
4. **`phaseKeyAtRead` must say `recover`** on both seeded cycles. Reads about a
   phase the user has left are excluded by `deriveAdjustDue`, so a `remove` read
   on a recover account silently produces no offer and the walk stalls at step 1
   for a reason that has nothing to do with this slice.
5. **AFTER EVERY CONSOLE EDIT TO `journeyStates`, BACKGROUND THE APP AND BRING IT
   BACK BEFORE THE NEXT STEP.** Added 2026-09-17, from the walk stop below, and
   it is the one correction that cost a real observation.

   `journeyStates` is read **once per Home FOCUS TRANSITION** and not on render,
   not on a write, and not on a daily pick. `useJourneyLanding`'s resolve effect
   depends on `[uid, weeklyTarget, attempt]`; `attempt` moves only through
   `refresh()`, whose only caller is Home's `useFocusEffect`. So `PhaseContext` -
   including `adjustChoice` - is a **snapshot taken at the last focus**.

   **A MODAL IS NOT A NAVIGATION.** The daily picker opens inside Home, so Home
   never loses focus while you use it. Confirming the pick re-derives the day
   from the **cached** context, and a document you edited in the console two
   minutes earlier is invisible to it.

   **It compounds with a second thing worth knowing for any seeded walk:** a
   console write does not set `updatedAt`, and `revisionToken` - which is what
   `useTodayCard`'s `sourceKey` keys on - IS `updatedAt`. So seeding leaves
   `sourceKey` byte-identical. In-app writes are fine; `recordAdjustChoice`
   stamps `updatedAt` and returning from the phase page is a focus transition.
   This is a **seeding hazard, not a defect on the in-app path** - see row
   `JOURNEY-REVISION-TOKEN` in section 5 for the part of it that is a question.

**The capture correction from 7b no longer applies to the producing account.**
Capture outranks adjust, but capture exists only in `remove` and the offer is now
activated only in `recover`, so the two can never contend. It matters at **step
14** instead, where a Remove account is the subject.

**Accounts needed.** The two journeyed accounts from 7l's walk (**Routines** and
**Energy**), both in Recover, plus **one account in Remove** for step 14. If
Kyle's own account is not in Remove, onboard a fresh one; it needs no seeding,
only the two `not_moving` reads to make step 14 non-vacuous.

---

## Before-state, on `main`

| # | Do | Pass condition |
|---|---|---|
| **0** | Routines account, Home. | Record the **hero protocol title** and the **whole summary line verbatim**, including the capacity word. |
| **0b** | Energy account, Home. | Same, recorded verbatim. |
| **0c** | Both accounts, Journey tab → the Recover row. | Record whether the door ("Try a different approach") is present. Kyle confirms with the console that neither document carries an `adjustChoice`. |
| **0d** | The Remove account, Home and Journey tab → its Remove row. | Record whether any adjust surface is present today. |

---

## On the branch

| # | Do | Pass condition |
|---|---|---|
| **1** | Seeded Routines account, Home. | C2 draws in the journey-action slot. First-offer body. **No capture card above it.** |
| **2** | Tap **"Try a different approach"**. | The Recover page opens with the three alternatives **already showing**. There is no second control reading "Try a different approach" to tap. |
| **3** | Go back, then reach the same page from the **Journey tab map row**. | The door is **shut**: one line reading "Try a different approach", options hidden. *If steps 2 and 3 look the same, the refinement did not ship and the step FAILS.* |
| **4** | From step 2's expanded state, tap **"Help me come down"**. | While the write is in flight: the tapped row dims, the other two do not respond to taps. Then the confirmation replaces the options. **No navigation.** |
| **5** | Airplane mode ON, reopen the page, tap an option. | *"That didn't save. Try again when ready."* appears; all three options are on screen **and tappable again**. Airplane mode OFF. |
| **6** | Airplane mode OFF, complete the choice from step 4, return to Home. | The hero title is the **downshift** protocol for that day's capacity and time — **different from step 0's recorded title**. |
| **7** | Same account: answer capacity **Normal** and time **5 minutes or less**. | Hero title is **"Lengthen the exhale"**. *(The downward search: a 2-minute protocol from the slammed tier, served to a Normal answer.)* |
| **8** | On the same screen as step 7, read the summary line. | It reads **"Normal"**. **It must not read "Slammed".** *If it does, the capacity-label fix did not ship.* |
| **9** | Same account, choose **"Help me get something back"**, then answer **Normal** + **10-15 minutes**. | Hero title is **"Start with light"**. *(Jen's worked example, middle case, on a device.)* |
| **10** | Same account, same preference, answer **Normal** + **20+ minutes**. | Hero title is **"Set the morning signal"**. The search does **not** fire; the stated capacity answers. |
| **11** | Routines account, choose **"Help me come down"**, answer **Normal** + **20+ minutes**. | Hero title is **"Downshift, then unplug"**, where step 0 recorded **"Set the morning signal"**. *(The preference outranking destination: Jen's §11 table honoured where the destination path structurally cannot honour it.)* |
| **12** | Energy account: choose **"Help me get re-oriented"**. | The served title moves from the refill protocol to the **re-anchor** one. *(The cross-check that the preference, not the destination, is deciding.)* |
| **13** | An account with **no** recorded preference, at each capacity and time answered. | Every served title is **byte-identical** to its step-0 record. *If anything moved, the parameter is not optional and the 36-cell table has moved.* |
| **14** | The **Remove** account, seeded with two `not_moving` reads in `remove` (`phaseKeyAtRead: 'remove'`) and the capture completed. Home, then Journey tab → its Remove row. | **No C2 card on Today, AND no door on the Remove phase page.** Both halves, or the gate is only half placed. |
| **15** | Same Remove account, Journey tab → the **Recover** row (a phase it has not reached). | No door, for the pre-existing current-phase reason, and the page still renders its title and gloss. |
| **16** | Fully quit and cold-launch on the Routines account. | Step 6's title survives. **No first-frame flash** of the step-0 title. |
| **17** | Advance the Routines account Recover → Rewire. Open Home and the Rewire phase page. | The preference no longer applies and **no door appears**. **Expect `[PLACEHOLDER]` protocol content** — that is correct and is not this step's subject. |

### On step 17

It is the only in-app route out of Recover, and it lands the account on Rewire's
three stand-ins. If Kyle would rather not burn a journeyed account for one
assertion, **record step 17 as NOT RUN** and cite the suite instead:
`journeyState.service.test.ts` pins `adjustChoice` in `CLEARED_OFFERS` and pins
that it is spread at all four phase-changing writes. Recording it as not run is
the honest option; recording it as passed by inspection is not, on the same
footing as the SE steps.

---

## What this walk cannot cover

- **SE.** No device. Outstanding.
- **The other nine alternatives.** Not activated (Jen ruling 1), so there is
  nothing to walk. Their strings are still in the pack and in
  `ADJUST_ALTERNATIVES`, pinned by test.
- **Capture versus C2 for the slot.** Unreachable after ruling 1 — capture
  exists only in `remove`, adjust only in `recover`. The precedence rule is
  covered at the unit level in `journey/__tests__/journeyAction.test.ts`; the
  integration proof is recorded as retired in the two suites that held it.
- **Repetition and recency**, the fifth rank in Jen's priority order. Not built
  in this engine, and slice 7c does not build it.

---

## Result

### Sitting of 2026-09-17 — partial, and it produced a walk stop

**Steps 7 and 8: PASSED, and step 8 passed NON-VACUOUSLY.** iPhone 14 Plus,
branch confirmed at `abde469`. Destination routines, `phaseKey` recover,
`adjustChoice` `help_me_get_something_back`, `adjustChosenAt` set, `enteredAt`
backdated to 2026-09-03. Normal capacity + 5 minutes or less served **"Get some
morning light"** (R9). The preference reached the serve, outranked destination,
and the downward search fired. The summary line read **"Normal"** against a
**slammed-tier** variant, which is the mismatch the `dayCapacity` prop exists for
and the only condition under which step 8 can distinguish the fix from its
absence.

---

**THE WALK STOP, AND ITS DIAGNOSIS. Recorded here rather than only in section 13,
because the correction it produced is a line in this file and a reader who finds
correction 5 should be able to see what it cost.**

**Observed (run A), before the steps above.** Same account, same document, Normal
capacity + 10 to 15 minutes served **"Build a recovery anchor"** (R2), where the
shipped 27-triple table says **"Start with light"** (R6, medium class, no search).
Not a stale bundle: the branch was live for both runs, and step 7 passed on it.

**First trace: no break in the four obvious candidates.** `resolveJourney` sets
`adjustChoice` at both of its two construction sites; `useJourneyLanding` passes
the context through by reference; `phaseSource` does not narrow; `useTodayCard`
reads it and passes it as the sixth argument; `adjustmentPreferenceFor` maps it.
Executed against the branch, `selectProtocol('recover','normal','medium',
'routines', undefined, 'help_me_get_something_back')` returns **"Start with
light"**. R2 is what the engine returns when the choice does **not** arrive.

**Second trace: the time axis was exonerated and the real difference found.** The
picker maps over `TIME_CLASSES` itself and writes the class token, so the 10-15
chip writes `'medium'`, typed `TimeClass` end to end. `pickByMechanism`'s medium
path is structurally identical to its short path. What actually separated the two
runs is this:

| time answer | stale context (choice null) | live context (choice set) |
|---|---|---|
| routines / normal / **short** | Build a recovery anchor | **Get some morning light** |
| routines / normal / **medium** | Build a recovery anchor | **Start with light** |

Run A sits in the left column and run B in the right. **The discriminator is that
R2 is the stale answer at BOTH time answers** - so if run B had also been stale it
would have shown R2, not R9. The preference was live in B and absent in A, proven
by the data rather than inferred.

**Cause: a pre-seed `PhaseContext` snapshot.** The document was edited in the
console while Home was already focused; the picker is a modal inside Home, so no
focus transition occurred; `confirmPick` re-derived the day from the cached
context. Correction 5 above is what stops this happening again.

**CONFIRMED ON DEVICE (Kyle, 2026-09-17).** Relaunched, cleared today's
`dailyLog`, answered Normal + 10-15: served **"Start with light"** (R6). The
diagnosis holds and the engine is not at fault.

**Steps 9, 10 and 11 are runnable after a forced refocus and were NOT run in this
sitting.** Every other step is outstanding.

**Run A is left in the record rather than deleted.** It is the observation that
produced correction 5 and row `JOURNEY-REVISION-TOKEN`, and a results section that
showed only the passes would leave both of them looking like housekeeping.

### Sitting of 2026-09-17 — the serving behaviour, walked in full

iPhone 14 Plus, dev client, branch at **`abde469`**. Kyle's result, recorded step
by step.

**BEFORE-STATE, on `main`.** Steps 0 / 0b / 0c / 0d captured on **two fresh
accounts (Routines and Energy), both in Remove at the time**, plus a Remove
account showing no adjust surface. Recorded, screenshots taken.

**BRANCH, on a Routines account seeded to Recover via Firestore.**

| Step | Result |
|---|---|
| **7** | **PASS.** Normal + 5 min or less, preference `help_me_get_something_back` → **"Get some morning light"** (R9). The downward search fires and the preference outranks destination. |
| **8** | **PASS, non-vacuously.** The summary line reads **"Normal"** against a slammed-tier variant; before `95a1df4` it would have read "Slammed". |
| **9** | **PASS.** Normal + 10-15 → **"Start with light"** (R6). |
| **10** | **PASS.** Normal + 15+ → **"Set the morning signal"** (R3), no search. |
| **11** | **PASS.** Preference `help_me_come_down`, Normal + 15+ → **"Downshift, then unplug"**, where the destination path serves R3. |
| **12** | **PASS**, Energy account, `help_me_get_re_oriented` → the re-anchor mechanism. The choice decides, not the destination. |
| **13** | **PASS.** Preference cleared: every title byte-identical to the recorded no-preference answer at the same capacity and time. See the note below on what that record was. |
| **1.3x Dynamic Type**, steps 7, 8 and 13 | **NOT RUN.** Outstanding, on the same footing as SE below: not passed by inspection, and not filled by the build, which cannot supply a device observation it did not make. See the note under this table. |

**NOT RUN, WITH REASONS.**

- **Steps 1-6** (offer card, door, expanded arrival, in-flight state, failure
  line, and the first post-choice serve): need two seeded weekly cycles with
  `not_moving` reads. **Deferred to the beta cohort, where the sequence occurs
  naturally.** The offer and door flow itself was built and walked at 7b and 7d;
  7c changes only its phase gating.
- **Steps 14-15** (the phase gate: no offer and no door outside Recover): same
  seeding requirement, same deferral.
- **Step 16** (cold-start persistence): **covered incidentally** — every step
  above was run after a relaunch.
- **Step 17** (phase-change clear): **NOT RUN by decision.** The only in-app route
  out of Recover lands the account on Rewire placeholder content and would spend
  one of two Recover walk accounts. `CLEARED_OFFERS` is asserted in four places in
  the suite.
- **SE:** not walkable in this setup.
- **1.3x DYNAMIC TYPE ON STEPS 7, 8 AND 13: NOT RUN.** The standing walk rule is
  default **and** 1.3x on every step. The result was left open in the walk report
  and no observation of it exists, so it is recorded as outstanding rather than
  filled. **It is the one gap in an otherwise fully-walked serving path**, and it
  is the cheapest outstanding item on this file: three screens, one Dynamic Type
  setting, no seeding, no second account. **Close it before the merge rather than
  carrying it into beta with steps 1-6 and 14-15**, which cannot be closed without
  the cohort.

  **WHAT IT WOULD ACTUALLY TEST, so it is not run as a formality.** Step 8 is the
  one that matters most: the summary line is a single row carrying up to three
  segments - destination label, capacity word, and the runs-through clause - and
  1.3x is where a three-segment line on one row starts wrapping or truncating.
  Step 7's hero title and step 13's comparison are ordinary text and are lower
  risk.

---

**THE BEFORE-STATE COULD NOT SERVE STEP 13's COMPARISON AS THIS SCRIPT WROTE IT,
AND THAT IS A SECOND DEFECT IN THE SCRIPT RATHER THAN IN THE RUN.**

Step 13's pass condition above reads *"byte-identical to its step-0 record"*, and
the script assumed the before-state would be captured on **7l's two journeyed
accounts, which were already in Recover**. It was captured on **two fresh accounts
in Remove** instead, and the walk account was then seeded to Recover on the
branch. **A Remove-phase record cannot be a Recover-phase baseline** — measured
against the shipped matrix, a Routines account in Remove serves *"Make it harder
to reach"* at every time answer, where the same account in Recover serves *"Build
a recovery anchor"* at short and medium and *"Set the morning signal"* at long.
The two sets share no title.

**What step 13 was therefore measured against is the no-preference Recover
answer, and that is the comparison that carries the meaning anyway:** the guard
exists to show that adding an optional parameter moved nothing for a user who has
recorded no choice. Those three titles are exactly the `routines` column of the
36-row HEAD table in the §13 entry and of
`protocolEngine/__tests__/noPreferenceServeTable.test.ts`, so the device result
and the suite agree on the same three strings.

**The step is a genuine pass. The script's stated target was unrunnable as
written**, and it is recorded here rather than quietly reinterpreted, on the same
footing as seeding correction 5 above. **If this script is reused, step 0 must
either be captured on an account already in the phase the branch steps run in, or
step 13 must name the no-preference table as its target.**

---

**WHAT THIS SITTING DOES AND DOES NOT ESTABLISH.**

**Established on a device:** the downward search, the preference outranking
destination, the choice deciding over the destination across two accounts, the
capacity label against a cross-tier serve, and the no-preference regression guard.
**That is the whole of the row's engine question**, which is what the row existed
to answer.

**Not established on a device:** that the offer card and the phase-page door
behave correctly under the new phase gate, and that the in-flight state and the
expanded arrival render as built. Those are steps 1-6 and 14-15, they are
deferred to the beta cohort, and **the deferral is a decision with a cost**: the
gate, the pending state and the expanded arrival ship on test evidence alone.

### Sitting of —

*(For the deferred steps, if they are run before beta. Verbatim, step by step,
with the date the walk was actually run — never the date the row was written.)*
