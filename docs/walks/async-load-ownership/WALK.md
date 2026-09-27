**THIS WALK IS REGRESSION ONLY. A CLEAN RESULT IS NEVER ACCEPTANCE OF THE FIX.**

# ASYNC-LOAD-OWNERSHIP - device walk

**Row:** a superseded Today load must not mutate state belonging to the run that
replaced it. Blocks 9.1b, which blocks R3.
**Build:** branch `fix/async-load-ownership`.
**Walker:** Kyle. **Status: NOT WALKED.**

---

## READ THIS FIRST: THE DEFECT IS NOT REPRODUCIBLE BY HAND

The defect needs two loads of the Today card in flight at once, with the OLDER one
resolving LAST. That is an ordering of network responses. A walk cannot choose it,
cannot hold one read open while another settles, and cannot tell whether it happened.
The cross-date variant also needs the calendar date to move under a running app,
which means a clock change, and you do not change the device clock.

**So this walk cannot pass or fail the fix.** The evidence is automated:

- **The red tests.** Six supersession cases went red on `main` before the fix,
  each for the defect's own reason (the headline case: expected `recover-normal`,
  received `remove-normal`). They hold the old run's read open with a deferred
  promise and release it after the new run has committed.
- **The mutation battery.** Reverting to the shared flag, removing the catch guard,
  removing the consistent-days guards, tying `markDone` or `confirmPick` to the
  load's run, and dropping the mount flag's re-set under StrictMode each turned the
  targeted tests red.

**What this walk IS for:** the fix split one flag into two. The load now owns a
per-run flag; `markDone` and `confirmPick` now answer to a separate mount flag. The
realistic risk is on the second half: a callback that stops clearing its own
spinner, which would leave the CTA or the sheet stuck for good. Every step below
could pass on `main`, and that is the point.

### What this walk CANNOT show, stated so the results do not overclaim

1. **The race itself.** Out-of-order resolution cannot be provoked on demand.
2. **That the fix closes it.** A walk can never demonstrate the absence of a race.
3. **The stale-rejection case.** It needs an OLD read to fail after a NEW read has
   succeeded.
4. **The cross-date case.** Needs a clock change.
5. **The StrictMode half.** StrictMode's double-mount only happens in the test
   harness and in dev builds that wrap the root in it. The test covers it.
6. **The same-date journey-revision defect.** A completion tapped against a
   protocol rendered under a journey identity that has since changed. **That is the
   NEXT row and is untouched here.** If you see the hero briefly show the previous
   phase's action after a journey write, it is NOT a finding for this walk.

---

## Conditions before you start

- **Reduce Motion OFF. Dynamic Type at default.** Neither is exercised.
- A signed-in, onboarded account with a live journey phase.
- Record each step PASS, FAIL, NOT RUN or FINDING, with a note on anything you
  observed that the step did not ask about.

---

## SECTION A - THE PICK. `confirmPick` still clears its own spinner.

**A1. The prompt is offered.**
Use a day that has not been answered yet. Open the app to Today.
**Expect:** the card reads **"Where are you starting from today?"** with
**"Set today's capacity"**.

**A2. The pick confirms and the spinner clears.**
Tap **"Set today's capacity"**, choose any answer, tap **"Confirm"**.
**Expect:** the sheet closes, and the hero shows the day's action with a
full-strength **"Mark it done"**. No spinner is left behind anywhere.
*A sheet that never closes, or a confirm that spins forever, is a FAIL. That is the
mount flag not answering.*

---

## SECTION B - COMPLETION. `markDone` still clears `saving`.

**B1. Completion lands.**
Tap **"Mark it done"**.
**Expect:** the done-state (a check and a line of acknowledgment) arrives
effectively immediately. No lingering spinner, no error.

**B2. A failed or delayed write gives the control back.**
This needs a day that is picked and **not** completed. Use a fresh account day, or
walk it on the next day. Turn on **Airplane Mode**, tap **"Mark it done"**, wait
about ten seconds, then turn Airplane Mode off and wait about another ten.

**Expect, one of two outcomes, and both are PASS:**
- **The write fails.** The check reverts, **"That did not save. Try again."**
  appears, and **"Mark it done"** is full-strength and tappable again. Tap it with
  the network back and it completes.
- **The write is held until the network returns, then lands.** The done-state
  stays, and nothing is left dimmed or spinning once you are back online.

**FAIL:** a button that stays dim and un-tappable after the network returns, or a
check that stays with no write behind it (force-quit and reopen: if the day shows
not done while the card had shown done, and no error ever appeared, record it).
*Record which of the two outcomes you got. Offline Firestore behaviour decides it,
not this slice.*

---

## SECTION C - A RELOAD. The hero updates after a journey write.

**C0. Get into a state where a journey write is available.**
Any one of these, whichever the account qualifies for:
- an **advancement** offer on Today (advance to the next phase)
- an **adjustment** offer on Today, then choose a different approach on the page it
  opens
- a **Remove capture**, if the account is in Remove and has not captured

If the account qualifies for none of them, record Section C as **NOT RUN** with the
reason. Do not seed an account for this walk.

**C1. Make the write, return to Today.**
Complete whichever you picked in C0, then come back to Today.
**Expect:** the hero shows the action for the NEW state: a phase advance shows the
new phase's action, an adjustment shows the chosen approach, a capture shows an
action from the captured family. The journey line above the hero agrees with it.
It may take a moment to settle.

**C2. The card is still actionable.**
If the new day's action is not yet done, tap **"Mark it done"**.
**Expect:** it completes as in B1.

**C3. Leave and return.**
Switch to another tab and back to Today, twice.
**Expect:** the hero holds the new state each time and does not flip back to the
previous one.

---

## Recording the results

Write results into this file under a `## Results` heading, with the date, the
device, and PASS / FAIL / NOT RUN / FINDING per step. For B2, write which of its two
outcomes you got.

---

## Results

*(not yet walked)*
