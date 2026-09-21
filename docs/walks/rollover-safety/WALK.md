# ROLLOVER-SAFETY - device walk

**Row:** daily protocol rollover safety. Blocks 9.1b, which blocks R3.
**Build:** branch `fix/rollover-safety`.
**Device:** iPhone 14 Plus. **9 steps, in two sections.**
**Walker:** Kyle. **Status: WALKED 2026-09-21. 9 of 9 passed, ZERO FAILS. ATTESTED 2026-09-21.**

---

## READ THIS FIRST: THE DEFECT THIS SLICE FIXES IS NOT REPRODUCIBLE BY HAND

**Do not go looking for it. You will not find it, and not finding it proves nothing.**

The defect needs the calendar date to change under a running app, and then a tap
within the next three-to-four Firestore round trips. Reproducing it means either
changing the device clock - which you do not do, established at the 9.1a walk -
or being on the phone at local midnight with yesterday picked and not completed,
and tapping inside a window a few seconds wide.

**So this walk cannot pass or fail the fix.** The correctness evidence is the
automated coverage, which holds the window open with a deferred promise instead
of racing it. What the walk is for is two other things:

- **Section A is REGRESSION.** It confirms the completion tap the user already
  had still behaves exactly as it did. Every step could pass on `main` without
  this branch, and that is the point: the realistic risk in this change is an
  over-tight guard that refuses a legitimate tap, not a missed race.
- **Section B is THE OBSERVATION.** A `revisionToken` bump IS reachable by hand,
  and it puts the card through the same reload the rollover does. It is the only
  way to see the new loading treatment on a real screen.

### What this walk CANNOT show, stated so the results do not overclaim

1. **The window itself.** See above.
2. **That the fix closes it.** A walk can never demonstrate the absence of a race.
3. **The superseded-load defect (path 7).** It needs two loads overlapping a
   network read. It is a separate, already-approved row and is untouched here.
4. **The corrupted row's shape.** The bad write cannot be provoked, so there is
   nothing to inspect in the console. **This walk has no console section.**
5. **The render-time guard under a real rollover.** Section B exercises the same
   code path through a different trigger, which is close but is not the same event.

### Two accepted limitations, recorded so a later reader does not read either as an oversight

- **"The existing loading presentation" is the `saving` treatment.** There is no
  presentation in this app bound to the hook's `loading` field - `DashboardScreen`
  has never read it. The dimmed, disabled control is the existing idiom for "not
  actionable right now" and is reused deliberately rather than a second one being
  invented.
- **Yesterday's action text stays on screen during the window.** Only the
  completion control changes. Replacing the card body would need a skeleton this
  component does not have, and building one was explicitly out of scope. If you
  see the previous day's action briefly after midnight, **that is known and
  accepted**, not a finding.

---

## Conditions before you start

- **Reduce Motion OFF. Dynamic Type at default.** Neither is exercised; they are
  fixed so nothing else varies.
- A signed-in, onboarded account with a live journey phase.
- Record each step PASS, FAIL, NOT RUN or FINDING, with a note on anything you
  observed that the step did not ask about.

---

## SECTION A - REGRESSION. The tap the user already had.

**A1. The day's action is offered.**
Open the app to Today. Answer the daily picker if it is showing.
**Expect:** the hero card shows the day's action and a solid, tappable
**"Mark it done"**. The button is full-strength, not dimmed.
*If it is dimmed here, STOP and report - that is the over-tight guard.*

**A2. Completion lands.**
Tap **"Mark it done"**.
**Expect:** the button is replaced by the done-state - a check and a line of
acknowledgment - effectively immediately. No spinner, no delay, no error.

**A3. The acknowledgment is the variant's own, where it has one.**
Read the line in the done-state.
**Expect:** on a Remove protocol, a line specific to what you did ("Nice. That's
in place.", "You caught it. That's useful.", and so on). On Recover or Refocus,
"Done for today." **Either is correct** - the per-variant line exists only on
Remove's nine. Record which you saw and which protocol was on screen.

**A4. A second tap is a no-op.**
Tap the done-state.
**Expect:** nothing happens. No toggle back, no second write, no flicker.

**A5. Completion survives a restart.**
Force-quit the app and reopen it to Today.
**Expect:** the day is still done. The done-state is showing, not the button.

**A6. Leaving and returning does not disturb it.**
Navigate to another tab, then back to Today. Twice.
**Expect:** the done-state is showing each time, and does not flash through the
button state on the way.

---

## SECTION B - THE OBSERVATION. The card across a reload.

**This is the step Kyle asked for.** A `revisionToken` bump re-arms exactly the
load the rollover re-arms, so it is the only hand-reachable way to see the new
treatment.

**B0. Get the card into its uncompleted state.**
Use a fresh day, or an account whose day is picked and not yet completed.
**You need the button showing, not the done-state**, for B1 to mean anything.

**B1. Trigger a journey write and watch the card.**
Do something that writes to the journey document. Any of these works; pick
whichever is available on the account:
- accept or decline an advancement or adjustment offer on Today
- complete a weekly close
- advance or skip a phase from the journey map

**Watch the hero card across the transition and report what it does.**

**Expect, and this is NOT a failure:** the **"Mark it done"** button may go dim
and un-tappable for a moment while the card reloads, then come back to full
strength. On a slow connection that may last **several seconds**. **A
several-second loading state is expected and is explicitly accepted.**

**These ARE findings, and this is the whole point of the step:**
- the card **flashing** or repeatedly cycling between states
- the card **jumping, resizing or collapsing** - the button should hold its
  height while dimmed, so the layout must not move
- the card **disappearing** and coming back
- content below the card **shifting up or down**
- the button staying dim and never recovering
- anything else that reads as disruptive rather than as a quiet pause

Record what you saw even if it looks fine. "No visible change at all" is a
useful result and should be written down as such.

**B2. The tap works again afterwards.**
Once the card has settled from B1, tap **"Mark it done"**.
**Expect:** it completes normally, exactly as in A2.
*This is the most important step in Section B. If the guard latched on and never
released, this is where it shows.*

**B3. Sanity check on the surrounding surface.**
Look at the rest of Today after B1 and B2.
**Expect:** the journey line, the offer slot, the Good moments row and the close
entry are all unchanged in behaviour. This slice touched one prop on one card and
nothing else on the screen.

---

## Recording the results

Write results into this file under a `## Results` heading, with the date, the
device, and PASS / FAIL / NOT RUN / FINDING per step.

**Section B's observation is a report, not a pass/fail.** Write down what the
card actually did. If it was undisruptive, say so plainly - that is the answer
the step was asked to produce.

---

## Results

**2026-09-21 · Kyle · iPhone 14 Plus, dev client · Dynamic Type default · Reduce Motion off**

| Step | | Result |
|---|---|---|
| A1 | The day's action is offered | **PASS** |
| A2 | Completion lands | **PASS** |
| A3 | The acknowledgment matches the protocol | **PASS** |
| A4 | A second tap is a no-op | **PASS** |
| A5 | Completion survives a restart | **PASS** |
| A6 | Leaving and returning does not disturb it | **PASS** |
| B0 | Get the card into its uncompleted state | **PASS** |
| B1 | Trigger a journey write and watch the card | **PASS** |
| B2 | The tap works again afterwards | **PASS** |
| B3 | Sanity check on the surrounding surface | **PASS** |

**9 of 9 steps passed. Zero failures. Zero not run. Attested 2026-09-21.**

*(Ten rows, nine steps: B0 is setup for B1 and is recorded rather than counted.)*

---

## WALK RESULT — 2026-09-21, 9 OF 9, NO FAILURES

**Walked by Kyle on an iPhone 14 Plus, dev client, 2026-09-21. NINE PASSED, ZERO FAILED, ZERO NOT RUN. Attested 2026-09-21.**

**A1 IS THE RESULT THAT MATTERED MOST AND IT PASSED.** The realistic risk in this change was always the opposite of the bug: a guard tight enough to refuse a legitimate tap. On a normal day with nothing in flight the CTA rendered at full strength, tappable, exactly as before. The guard does not fire when it should not.

**THE COMPLETION PATH IS UNREGRESSED.** A2 completed optimistically on the first tap. A3 rendered the variant's own acknowledgment, "Nice. That's in place.", against the behavioral variant in remove-normal, matching the protocol on screen. A4's second tap was a no-op, A5 survived a restart, A6 held across tab switches without flashing through the button state.

**B1 PRODUCED NO VISIBLE CHANGE AT ALL, AND THAT IS BETTER THAN THE CONTRACT ACCEPTED.** Kyle explicitly accepted, in advance, that the card might sit dimmed and un-tappable for several seconds on every rollover — the cost of deriving staleDate during render rather than from a passive effect. Across a revisionToken bump, which re-arms exactly the load a midnight rollover re-arms, the device showed nothing: no dim, no flash, no cycling, no jump, no resize, no collapse, no shift in the content below. The accepted cost was not charged on this device and this connection. RECORDED AS AN OBSERVATION, NOT A GUARANTEE — a faster path than predicted is not proof that a slower one cannot occur on a cold network.

**B2 PASSED, WHICH IS THE SECOND TRIPWIRE.** After the transition settled, the tap completed normally. The guard releases; it does not latch.

**B3: the rest of Today was undisturbed.** The journey line, the offer slot, the Good moments row and the close entry all behaved as before. This slice passes one prop to one card and touches nothing else on the screen.

**WHAT THIS WALK DID NOT AND COULD NOT SHOW, stated rather than implied.** The window itself, which needs the calendar date to change under a running app plus a tap within the next few seconds. That the fix closes it — no walk can demonstrate the absence of a race. The superseded-load defect, which is a separate approved row and untouched here. A corrupted row, because the bad write cannot be provoked, which is why this walk has no console section at all.

**THE CORRECTNESS EVIDENCE IS THE AUTOMATED COVERAGE, AND IT IS STRONGER THAN THE WALK.** See the §13 entry for the red test and the mutation battery.
