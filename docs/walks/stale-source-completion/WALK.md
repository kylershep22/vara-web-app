# STALE-SOURCE-COMPLETION - device walk

**Row:** a protocol stays completable after the variant that produced it has changed. Before 9.1b, which blocks R3.
**Build:** branch `fix/stale-source-completion`, `fcc82e6` + `150c284`.
**Device:** iPhone 14 Plus, dev client. **Three sections, plus one optional.**
**Walker:** Kyle. **Status: WALKED 2026-09-28, all sections PASS, zero FAILs.**
**Time:** about 30 minutes once the two accounts are seeded.

---

## Part 1 - What you are testing, in plain terms

When you start the next phase of your journey, you come back to Home. For a
moment, Home is out of date. It re-reads your journey, and then it reloads the
day's action for the new phase. **Between those two things there is a gap**:
the line at the top already names your NEW phase, but the card underneath still
shows the OLD phase's action.

**Before this fix**, "Mark it done" was live in that gap. Tapping it recorded
today as done against the OLD phase's action, and that completion then counted
toward the NEW phase's progress.

**With this fix**, "Mark it done" goes faded and does nothing in that gap. Once
the new action loads, it comes back at full strength.

**The risk this fix carries** is the opposite mistake: fading the button when
nothing has changed. That would be a Home screen that randomly stops working,
and Section A exists to catch it.

---

## Part 2 - What you will see on the screen

### The journey line

At the top of Home, above the day's card, there are two small lines of text:

> **Where you are**
> *(the name of your current phase)*

The phase name depends on the account's destination. **Before you start, look
up your two accounts' destinations and write down the two names you are
watching for:**

| Destination | First phase (you start here) | Second phase (you are advancing to this) |
|---|---|---|
| focus | **Clear the distractions** | **Get some headroom back** |
| calm | **Clear what's keeping you on** | **Come down a notch** |
| routines | **Clear what's throwing you off** | **Find your way back** |
| energy | **Clear what's draining you** | **Get some energy back** |

Everywhere below, **OLD NAME** means the left column and **NEW NAME** the right,
for that account.

### The day's card and its button

Below the journey line is the day's card: a heading, one or two sentences
describing today's action, and a teal button reading **"Mark it done"**.

- **Live:** full-colour teal button. Tapping it replaces it with a small check
  and a line such as **"Done for today."** or a phase-specific line like
  "Nice. That's in place."
- **Faded (the fix at work):** the same button at **about 40% opacity**, visibly
  washed out, the same size and in the same place. Nothing below it moves.
  Tapping it does nothing: no check, no flicker, no error.

**The card's action text does NOT change while the button is faded.** You may
see the OLD phase's action text sitting over a faded button while the journey
line already says NEW NAME. **That is the fixed state, not a bug.** Replacing
the text during the reload was out of scope, and ROLLOVER-SAFETY accepted the
same limitation.

### The offer card

When an account is ready to advance, Home shows a card below the day's card
titled **"There's something to build on here."** or **"Ready to try the next
part?"**, with the button **"See what's next"** and the link **"Keep going
here"**.

If Home instead shows **"Let's try a different angle."** (the adjustment
offer), or a card asking you to name what is getting in the way (the Remove
capture), **that card takes the only slot and the advance offer will not
appear.** That account is not usable for this walk until it is fixed.

### The tabs

The tab bar reads **Home · Journey · Learn · Community**. "Home" is the Today
surface. There is no tab called "Today".

---

## Part 3 - The two windows, and why you must record the journey line at every tap

There are two gaps, and this branch closes only the second.

| When you tap, the journey line says | And the card shows | Window | What should happen |
|---|---|---|---|
| **OLD NAME** | the old action | **W0.** Home has not re-read the journey yet | **Not fixed, by decision.** A tap here still records the old phase. It is a separate ledger row (POST-ADVANCE-PROPAGATION). **Not a FAIL of this row.** |
| **NEW NAME** | the old action | **W1.** This row | Button **faded**, tap does **nothing**. A tap that completes here is a **FAIL**. |
| **NEW NAME** | the new action | Settled | Button live, tap completes. Correct. |

**Both gaps are short**, typically well under a second each on good wifi. You
are racing them. **If you arrive and everything has already settled, that is a
MISSED WINDOW**, not a pass and not a failure.

### STRONGLY RECOMMENDED: screen-record the taps

Turn on iOS Screen Recording (Control Centre) before B2 and C2, and stop it
after B4 and C4. **Then you do not have to read the journey line mid-tap.** Play
the recording back frame by frame, and it shows exactly which window your tap
landed in, whether the button was faded, and when the text changed. Attach or
describe the frames in the results.

### Make the gaps longer: throttle the network

- **iPhone Settings > Developer > Network Link Conditioner**, turn **Enable** on,
  and choose **"3G"** (a good first try) or **"Very Bad Network"** (a much longer
  gap, but everything is slow).
- Developer Mode is already on, because the dev client needs it.
- **The dev client loads code from Metro, so throttling makes a reload slow.**
  Load the app fully BEFORE turning the conditioner on, and do not shake-reload
  while it is on.
- **Record which setting was on for every step.**

---

## Part 4 - Setting up the accounts

You need **two accounts**, because each route uses one up: advancing is
one-way, and a day can be completed once. A third is optional, for Section D.

**Each account, in `journeyStates/{uid}`:**

| Field | Needs to be | Why |
|---|---|---|
| `phaseKey` | `remove` | The walk advances Remove to Recover |
| `destination` | any; note it | Tells you which two names to watch for (Part 2) |
| `removeCapturedAt` | **set** (the capture is done) | Otherwise the capture card takes the slot |
| `enteredAt` | **at least 14 days ago** | The simplest way to be eligible (the 14-day ceiling). 8 completed days since entry also works |
| `advanceDeclinedAt` | **absent or null** | A recorded decline suppresses the offer |
| `advanceExposures` / `advanceFirstOfferedOn` | fewer than **3** exposures in the current 7-day window, or never offered | The offer leaves Home after its third exposure day |
| `advanceLastExposedOn` | **not today** | Section A depends on today's first exposure happening in front of you |
| adjust offer | not showing on Home | The adjustment offer outranks the advance offer. If Home shows "Let's try a different angle.", use another account |

**Each account, in `dailyLogs/{uid}_{today}`** (today is your LOCAL date,
`YYYY-MM-DD`): either the doc does not exist yet, or it exists with
`protocolCompleted` absent or `false`. **Easiest: leave it absent and answer
the daily picker in the app.**

**Finding the uid:** Firebase console > Authentication > search by email > copy
the User UID.

**Keep the console open** on two tabs, `journeyStates/{uid}` and
`dailyLogs/{uid}_{today}`, and refresh them when a step asks.

**Conditions:** Reduce Motion OFF. Dynamic Type at default.

---

## SECTION A - THE OVER-TIGHT GUARD. Account 1. THE MOST IMPORTANT SECTION.

**Why it matters most.** The first time Home shows the advance offer each day,
it writes a note to your journey document. The next time you come back to
Home, Home sees the journey document changed and reloads the day's card. **The
day's action has not changed.** If the fix is too eager, this is where it
fades the button on an ordinary visit, every day, for every user. **The button
must stay live.**

**Do not tap "Mark it done" anywhere in Section A.** Account 1's completion is
needed for Section B.

**A0. Before opening the app: confirm today's exposure has not happened.**
In the console, open `journeyStates/{uid}` for account 1 and write down
`updatedAt` and `advanceLastExposedOn`.
**Need:** `advanceLastExposedOn` is **not today's date**.
**If it IS today,** Section A cannot run on this account today. Record A0 to A3
as NOT RUN (exposure already spent) and go to Section B.

**A1. Open Home, and answer the picker if it asks.**
Open the app on account 1. It lands on Home.
- If the card is the daily prompt instead of an action, tap it, choose
  **Normal** and any time, and tap **Confirm**.

**Look for:**
- the journey line: **Where you are / OLD NAME**;
- the day's card with its action text and a **live** "Mark it done";
- the advance offer card below it ("There's something to build on here." or
  "Ready to try the next part?").

**Record:** PASS if all three are there and the button is full strength.
**If the button is faded here, STOP and report.**
**If the advance offer is not there,** the account is not set up (see Part 4).
Record NOT RUN and fix the seed.

**A1b. Confirm the write happened. This is what makes A2 mean anything.**
Refresh `journeyStates/{uid}` in the console.
**Need:** `advanceLastExposedOn` is now **today**, and `updatedAt` is **later**
than what you wrote in A0.
**If neither changed,** no write happened and A2 would test nothing. Record A2
and A3 as NOT RUN (vacuous), not PASS.

**A2. Leave Home and come back. The button must NOT fade.**
Tap **Journey**. Wait two seconds. Tap **Home**. **Watch only the "Mark it done"
button as Home appears.** Do this three times.
- **The first return is the one that matters.** It is the one where Home picks
  up the change from A1 and reloads the card. Returns 2 and 3 only confirm
  nothing has stuck.

**Look for, on every return:** the button at full colour, with not even a
momentary fade. The journey line still says OLD NAME, and the action text is
unchanged.
**Record:** PASS, or **FAIL if you see any fade at all**, even a flicker. A
screen recording of the first return is the best evidence.

**A3. Optional: the same, throttled.**
This is only meaningful as the **first** return after a change. Once A2 has
run, Home has already caught up, so a throttled repeat reloads nothing.
- **To do it properly:** turn the conditioner on (3G) **between A1b and A2**,
  and run A2 throttled instead. Record "A2 run at 3G".
- Otherwise, record A3 as NOT RUN. That is acceptable.

**Turn the conditioner OFF before Section B**, unless you are choosing to run B
throttled; then note it.

---

## SECTION B - ROUTE A, THROUGH HOME'S OFFER CARD. Account 1, continuing.

**B1. Open the next phase's page.**
Start the screen recording now. On Home, tap **"See what's next"** on the
advance offer.
**Look for:** a page for the next phase, headed with NEW NAME's longer title
(for a focus account, "Get some headroom back"), with **"Start this"** and
**"Not yet"** at the bottom.
**If there is no "Start this",** the offer was never recorded; see Part 4.
Record NOT RUN.

**B2. Start it, with your thumb ready.**
Before tapping, **picture where "Mark it done" sits on Home** (the teal button
on the day's card) and rest your thumb near it. Tap **"Start this"**.
**Look for:** the page closes by itself and you are back on Home.

**B3. Tap "Mark it done" the instant Home appears. ONE tap.**
Tap it once, as fast as you can, then **stop and look**. Do not tap again yet.

**Record all four, from memory or from the recording:**
1. **The journey line at the moment of the tap:** OLD NAME or NEW NAME?
2. **The button at the moment of the tap:** full colour or faded?
3. **The card's action text:** the old phase's or the new phase's?
4. **What the tap did:** completed (check appeared), nothing, or a flicker?

**What each combination means:**

| Line | Button | Tap did | Result |
|---|---|---|---|
| NEW NAME | **faded** | nothing | **PASS. The fix caught W1.** Continue to B4 |
| NEW NAME | full colour | completed | **FAIL.** W1 is open. Go to B5 anyway to capture the row |
| OLD NAME | full colour | completed | **W0.** Ledgered, not this row. Record FINDING (W0) and go to B5 |
| NEW NAME, new text | full colour | completed | **MISSED WINDOW.** Everything had settled. Correct behaviour, but it does not test the fix |

**B4. The button comes back, and the tap works.**
If the day is not done yet: watch the card until the **action text changes** to
the new phase's and the button is **full colour** again. Then tap **"Mark it
done"**.
**Look for:** the check and a done line, straight away.
**FAIL if** the new action is showing but the button stays faded, or the tap
does nothing. **That would mean the guard latched on and never let go.**
Stop the screen recording.

**B5. Check the row in the console.**
Refresh `dailyLogs/{uid}_{today}` for account 1.

**Look for, on a correct result:**
- `protocolCompleted`: `true`
- `protocolCellId` **starts with `recover-`**: `recover-normal` if you answered
  Normal, otherwise `recover-limited` or `recover-slammed`
- **no `protocolFamily` field at all**. Recover protocols have none; its
  absence is correct.
- `completionSource`: `user_declared`
- `completedAt`: present

Then refresh `journeyStates/{uid}`:
- `phaseKey`: `recover`
- the **last entry in `history`** has an `exitedAt` **earlier** than the
  `completedAt` on the day's row.

**If `protocolCellId` starts with `remove-` and `protocolFamily` IS present,**
the old phase was recorded. Go back to your B3 line reading:

| The line said at the tap | Result |
|---|---|
| NEW NAME | **FAIL.** W1 is open |
| OLD NAME | W0. **FINDING against POST-ADVANCE-PROPAGATION**, not a FAIL of this row |
| You do not know | **FINDING, indeterminate.** Do not mark it either way. This is why the recording matters |

---

## SECTION C - ROUTE B, THROUGH THE JOURNEY MAP. Account 2.

The same gap, by the other road. This time you start the next phase from the
Journey tab, so you come back to Home by tapping its tab, not by a page
closing.

**C1. Record the offer, without completing.**
Sign in as account 2 and open Home. Answer the picker if it asks (Normal is
fine).
**Look for:** OLD NAME on the journey line, a **live** "Mark it done", and the
advance offer card. **Do not tap "Mark it done".**
The offer appearing is what makes "Start this" available on the map.

**C2. Start the next phase from the map.**
Start the screen recording. Tap the **Journey** tab. Tap the row for **NEW NAME**
(the second phase; its row may be marked as next). On its page, tap
**"Start this"**.
**Look for:** the page closes and you are back on the **Journey map**, not on
Home.

**C3. Tap Home, then "Mark it done", as fast as you can. ONE tap.**
Rest your thumb over the **Home** tab. Tap it, then immediately tap **"Mark it
done"** once. Stop and look.
**Record the same four things as B3.** Use the same interpretation table.

**C4.** As B4: once the new action is showing at full colour, tap and confirm it
completes. Stop the recording.

**C5.** As B5, against account 2's rows, with the same interpretation.

---

## SECTION D - OPTIONAL. A day already done stays done through an advance.

**Needs a third account-day:** in Remove, advance offer live, and **today
ALREADY COMPLETED**, so the card shows the check rather than the button.
**NOT RUN is fine here**; the automated suite covers it.

**D1.** Open Home. **Look for:** the check and done line on the day's card, and
the advance offer below it.

**D2.** Start the screen recording. Tap **"See what's next"**, then **"Start this"**,
and watch the day's card as Home comes back.
**Look for:** the **check and done line stay on screen the whole time.** They
must never turn into a "Mark it done" button, faded or not, even for a frame.
**FAIL if** a faded "Mark it done" flashes where the check was. That is exactly
the mistake the fix was designed not to make: fading is for the button, never
for a finished day.

---

## Recording the results

Write the results under `## Results` below: the date, the device, the network
setting per section, and PASS / FAIL / NOT RUN / MISSED WINDOW / FINDING per
step. **For B3 and C3, the four observations ARE the result.** A missed window
with a clean console row is a legitimate, useful record. Note if a screen
recording exists.

---

## Results

**Walked 2026-09-28, iPhone 14 Plus, by Kyle. All sections PASS, zero FAILs.** Network setting per step and whether a screen recording exists were not reported, and are left blank rather than inferred.

| Step | | Network | Result | Notes |
|---|---|---|---|---|
| A0 | Exposure not yet spent today | | PASS | |
| A1 | Home live with offer showing | | PASS | |
| A1b | Exposure write confirmed | | PASS | Verified as a real exposure, so A2 was not vacuous |
| A2 | Leave and return, button stays live | | PASS | CTA stayed at full strength after the day's first exposure |
| A3 | Throttled first return (optional) | | | Not reported |
| B1 | Next phase page opens | | PASS | |
| B2 | Start this returns to Home | | PASS | |
| B3 | Immediate tap: line / button / text / outcome | | PASS | W1 reached: CTA non-actionable at the tap |
| B4 | Button returns, tap completes | | PASS | |
| B5 | Console row | | PASS | `recover-` cell id, no `protocolFamily` |
| C1 | Offer recorded, not completed | | PASS | |
| C2 | Start this from the map | | PASS | |
| C3 | Immediate tap: line / button / text / outcome | | PASS | W1 reached: CTA non-actionable at the tap |
| C4 | Button returns, tap completes | | PASS | |
| C5 | Console row | | PASS | `recover-` cell id, no `protocolFamily` |
| D1 | Done day with offer (optional) | | PASS | |
| D2 | Done state holds through advance (optional) | | PASS | The done state held across the advance |

## WALK RESULT — 2026-09-28, ALL SECTIONS PASS

**Walked by Kyle on an iPhone 14 Plus, 2026-09-28, one day after the build. Attested the same day.**

**SECTION A IS THE RESULT THAT MATTERS MOST AND IT PASSED.** After the day's first offer exposure, leaving Today and returning left the CTA at full strength. That is the over-tight guard proving it does not fire on an ordinary daily path — and it is precisely what a `sourceKey` stamp would have broken, because `recordAdvanceExposure` fires from Home itself and changes nothing about the served variant. The narrowing from source identity to variant identity is now confirmed on a device as well as by mutation 2.

The step's own console check before and after mattered: the exposure is written once a day, so on a day already spent this step would have passed without testing anything. It was verified as a real exposure.

**THE DEFECT WAS REACHED BY HAND ON BOTH ROUTES,** unlike the two rows before it. Route A through Today's offer card and Route B through the journey map, tapping Mark it done the instant Today appeared. The journey line's state at the moment of the tap was recorded, which is what separates W1 from W0: a W1 tap found the CTA non-actionable, and the console confirmed the row carries a `recover-` cell id with no `protocolFamily`.

**Section D passed:** a day already completed stays done across an advance. That is the half `variantStale` must not break, since it gates the CTA only and does not hide the done state — the distinction that kept it as a separate flag from `staleDate` rather than one unified stamp.

**WHAT THE WALK CANNOT SETTLE.** The walker is racing a load, so a failure to reproduce would have proven nothing either way. W0 remains unfixable by this mechanism and is ledgered. The cross-device freshness path is not reachable on one device at all.
