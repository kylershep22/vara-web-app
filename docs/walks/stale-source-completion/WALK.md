# STALE-SOURCE-COMPLETION - device walk

**Row:** a protocol stays completable after the variant that produced it has changed. Before 9.1b, which blocks R3.
**Build:** branch `fix/stale-source-completion`, `fcc82e6` + `150c284`.
**Device:** iPhone 14 Plus. **Three sections, plus one optional.**
**Walker:** Kyle. **Status: NOT WALKED.**

---

## READ THIS FIRST: UNLIKE THE LAST TWO ROWS, THIS DEFECT IS REACHABLE BY HAND

ROLLOVER-SAFETY needed midnight and ASYNC-LOAD-OWNERSHIP needed two loads to
overlap, so neither could be provoked. **This one can.** A phase advance puts
Home into the window every time. On `main` before this branch:

- you return to Today after starting the next phase;
- the journey line names the **new** phase;
- the card still shows the **previous** phase's action, with a live
  **"Mark it done"**;
- tapping it wrote the previous phase's `protocolCellId` onto today, and today
  counts toward the NEW phase.

**With this branch, in that same moment, "Mark it done" is dimmed and
un-tappable** until the new phase's action loads, then comes back at full
strength.

### You are racing a load, so not reproducing it proves nothing

The window lasts as long as the card's reload: two or three Firestore reads,
typically well under a second on good wifi. **If you tap and the card has
already moved on, that is not a PASS of the fix and not a refutation of the
defect. It is a missed window.** Record it as such and try again on a fresh
account-day.

**A throttled network widens the window.** Settings > Developer > Network Link
Conditioner (3G or Very Bad Network) makes it seconds rather than a flicker.
Use it if you can; it is the difference between watching the window and
guessing at it.

### There are TWO windows, and this branch closes only the second

Your eyes can tell them apart. **Read the journey line at the moment you tap.**

| What the journey line says when you tap | Window | This branch |
|---|---|---|
| The **old** phase (Remove), and the card is Remove's | **W0.** Home has not re-read the journey yet | **Not fixed. Ledgered.** The line and the card agree, and nothing on the device knows the phase moved. A tap here still writes Remove's cell id. **That is not a FAIL of this row.** |
| The **new** phase (Recover), and the card is still Remove's | **W1.** The re-read landed and the card has not caught up | **Fixed.** The button must be dimmed and a tap must do nothing. |

W0 is short. Home re-reads the journey as soon as it regains focus, so it lasts
one round trip after you arrive.

### What this walk CANNOT show

1. **That the window is closed on every device and network.** A walk can show
   the guard firing; it cannot show a race absent.
2. **The defensive half.** `markDone` refuses on the same flag even if a tap
   gets past the UI. Nothing on a device can dispatch a tap past a disabled
   control, so that half is covered by the automated suite only.
3. **The cross-device path.** Two devices on one account can put a stale
   capacity or time under a rendered card. That is CROSS-CLIENT-STATE-FRESHNESS,
   a separate ledger row, and it is not exercised here.

### An accepted limitation, recorded so it is not reported as a finding

**The previous phase's action text stays on screen during the window.** Only the
button changes. This is the same accepted limitation ROLLOVER-SAFETY recorded:
replacing the card body needs a skeleton the component does not have, and that
is out of scope. **Remove's text over a dimmed button, with the journey line
already saying Recover, is the fixed state**, not a failure.

---

## Conditions before you start

- **Reduce Motion OFF. Dynamic Type at default.**
- **Two accounts, each in Remove, with today picked and NOT completed, and the
  advance offer live on Today.** "Live" means the Today card offers the next
  phase. The offer must already have been shown at least once, because that is
  what makes "Start this" appear on the next phase's page (`advanceOfferedAt`).
- **For account 1, Section A must be the FIRST time Today is opened today.** The
  offer exposure is written at most once a day (gated on
  `advanceLastExposedOn`), and it is the write Section A depends on. If Today
  has already been opened today, A2 has nothing to catch and passes vacuously.
  The exposure budget is also finite (slice 7d: the card leaves Today after its
  third exposure day), so the account needs budget left.
- **Advancing is one-way and completing is once per day.** Each route uses up
  an account-day. Account 1 runs Sections A and B; account 2 runs Section C. A
  missed window needs a re-seeded account or tomorrow.
- **Firebase console open on `dailyLogs` and `journeyStates`** for the checks.
- Record each step as PASS, FAIL, NOT RUN, MISSED WINDOW or FINDING, and write
  down **what the journey line said at every tap**.

---

## SECTION A - THE OVER-TIGHT GUARD. Account 1. THE MOST IMPORTANT SECTION.

**This is the most likely way this fix breaks something.** Opening Today with
an offer on screen writes to the journey document (the offer exposure). That
write changes the journey's revision. The next time Home comes back into focus
it re-reads the journey, sees the new revision, and reloads the card. **Nothing
about the day's protocol has changed**, so the button must stay live. A guard
keyed on the revision instead of the protocol's inputs would dim it here, on an
ordinary visit, every day.

**A0. Note the journey's revision BEFORE opening Today.**
In the console, open `journeyStates/{uid}` for account 1 and note `updatedAt`
and `advanceLastExposedOn`. `advanceLastExposedOn` must NOT be today. If it is,
Today has already been opened today and this section cannot run on this
account-day. Record NOT RUN.

**A1. The card is live with the offer showing.**
Open the app to Today on account 1. **Do not tap "Mark it done" anywhere in this
section.**
**Expect:** the advance offer is on Today, and the hero shows Remove's action
with a solid, full-strength **"Mark it done"**.
*If the button is dimmed here, STOP and report.*

**A1b. Confirm the write happened. This is what makes A2 mean anything.**
Refresh `journeyStates/{uid}` in the console.
**Expect:** `advanceLastExposedOn` is now today, and `updatedAt` has moved since
A0. If neither changed, no revision was written and A2 would prove nothing:
record A2 as NOT RUN (vacuous) rather than PASS.

**A2. Leave and return. The button must NOT dim.**
Switch to another tab, then back to Today. Do this **three times**. Watch only
the button. **The first return is the one that matters:** it is the one that
reads the new revision and reloads the card. The other two confirm it stays
settled.
**Expect:** it stays full strength throughout. No dim, however brief. The
journey line still says Remove.
*Any dimming here is a FAIL, and it is the failure this step exists to catch.*

**A3. Do the same with the network throttled, if you can.**
Turn on Network Link Conditioner, then repeat A2 once.
**Expect:** the same. **Note that this repeat is WEAKER than A2's first return:**
no new revision has been written since then, so the card does not reload at all.
The throttled case only bites on a revision-bearing return. If you want it at
full strength, throttle BEFORE A2 instead and record that you did.
Turn the conditioner back **off** before Section B unless you are using it there
deliberately.

---

## SECTION B - ROUTE A, THROUGH TODAY'S OFFER CARD. Account 1, continuing.

**B1. Open the next phase.**
Tap the advance offer on Today.
**Expect:** the Recover page opens, with **"Start this"**.

**B2. Start it, and be ready.**
Put your thumb over where "Mark it done" will be. Tap **"Start this"**.
**Expect:** the page closes and you are back on Today.

**B3. Tap "Mark it done" the instant Today appears.**
Tap it straight away. **Before you do anything else, write down:**
- what the journey line said when you tapped (Remove or Recover);
- whether the button looked dimmed;
- what action text the card showed;
- what happened: done, nothing, or a flicker.

**Expect, by window:**
- journey line **Recover**, card still Remove's: the button is **dimmed** and the
  tap **does nothing**. **This is the fix working.** Wait for the card to change
  to Recover's action and the button to come back full strength, then continue.
- journey line **Remove**: you were in W0. Whatever happens is the ledgered
  behaviour. Record it and continue.
- the card already shows Recover's action: **MISSED WINDOW.** Record and continue.

**B4. The card settles, and the tap works.**
Once the card shows Recover's action at full strength, tap **"Mark it done"** if
the day is not already done.
**Expect:** it completes normally: the check and the done line. **This is the
tripwire for a guard that latched.** If the button stays dim once Recover's
action is showing, that is a FAIL.

**B5. The console: the row carries the phase it was completed under.**
Open `dailyLogs/{uid}_{today}` for account 1.
**Expect:**
- `protocolCompleted: true`
- `protocolCellId` **starts with `recover-`**
- **no `protocolFamily` field at all** (Recover protocols have none)
- `completedAt` is present

Then `journeyStates/{uid}`: `phaseKey` is `recover`, and the last `history`
entry's `exitedAt` is **earlier** than the day's `completedAt`.

**If `protocolCellId` starts with `remove-` and `protocolFamily` is present,**
go back to your B3 note:
- you tapped with the line saying **Recover**: **FAIL.** W1 is open.
- you tapped with the line saying **Remove**: W0, ledgered. Record it as a
  FINDING against the W0 row, not a FAIL of this one.
- you do not know: **FINDING.** Record it as indeterminate. Do not mark it
  either way.

---

## SECTION C - ROUTE B, THROUGH THE JOURNEY MAP. Account 2.

The same defect by the other road. Here the advance happens while Today is out
of sight, so you arrive on Today by tapping its tab rather than by the page
closing.

**C1.** On account 2, open Today once so the offer is shown, then confirm the
hero has a full-strength **"Mark it done"**. Do not tap it.

**C2.** Go to the **Journey** tab, tap the **Recover** row, and tap **"Start this"**.
**Expect:** back on the journey map.

**C3.** Put your thumb over the **Today** tab. Tap it, then tap **"Mark it done"**
the instant the card appears. Write down the same four things as B3.
**Expect:** as B3, by window.

**C4.** As B4: once Recover's action is showing, the button is live and a tap
completes.

**C5.** As B5, against account 2's rows. Same interpretation rule.

---

## SECTION D - OPTIONAL. A day already done stays done across an advance.

**Needs a third account-day: in Remove, advance offer live, and today ALREADY
COMPLETED.** NOT RUN is an acceptable result here. The distinction is covered in
the automated suite.

**D1.** Confirm Today shows the done state (the check and the line).

**D2.** Advance through the offer card as in B1 and B2, and watch the hero as
Today returns.
**Expect:** the **done state stays up** the whole time. It must never turn into a
dimmed "Mark it done", even for a moment.
*That flash is exactly what a date-style treatment would have produced here, and
is why this fix dims the button only. If you see it, FAIL.*

---

## Recording the results

Write results into this file under a `## Results` heading, with the date, the
device, the network condition for each section, and one of PASS / FAIL /
NOT RUN / MISSED WINDOW / FINDING per step. **For B3 and C3, the four observations
are the result**, not a pass/fail.

---

## Results

*Not walked.*
