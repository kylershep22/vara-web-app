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

*(Kyle fills this in. Verbatim, step by step, with the date the walk was
actually run — never the date the row was written.)*
