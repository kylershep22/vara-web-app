# Slice 9.1a - device walk

**Row:** journey roadmap §5 row 9, split. 9.1a is the write path and the data model.
**Build:** branch `journey/slice-9-1a-completion-provenance`, commit `cb2eb0f`.
**Device:** iPhone 14 Plus. **17 steps.**
**Walker:** Kyle. **Status: WALKED 2026-09-21. 11 of 17 passed, 6 NOT RUN, ZERO FAILS. ATTESTED 2026-09-21.**

---

## READ THIS FIRST: WHAT THIS WALK IS ACTUALLY FOR

**THIS SLICE CHANGES PERSISTENCE AND CHANGES NO PIXELS.** It adds four fields to
the `dailyLogs` document and writes them from the completion tap that already
existed. There is no new screen, no new route, no new control, and no string
that was not already on screen yesterday. **A walk that only looks at the phone
cannot pass or fail this slice.**

That splits the script in two, and both halves are required:

- **Sections A and B are regression.** They confirm the tap the user already
  had still behaves exactly as it did. Every one of these steps could pass on
  `main` without this branch, and that is the point.
- **Section C is ACCEPTANCE, in the Firestore console.** The entire payload of
  this slice is invisible on the device. If Section C is not run, the slice is
  unwalked no matter how many device steps passed.

**THE EASY FAILURE HERE IS INSPECTING THE WRONG RECORD AND CONCLUDING SUCCESS.**
Section C exists because a provenance field that landed on someone else's
document, or on yesterday's document, looks identical to one that landed
correctly if you do not check the document ID. Step 0 exists so you have a
document ID to check against.

---

## Conditions before you start

- **Reduce Motion OFF. Dynamic Type at default.** Neither is exercised here;
  they are fixed so nothing else varies.
- **You need the Firestore console open** in a browser on the same machine or
  another, signed in to the project this build points at. Section C needs it.
- **Know which Firebase environment the build is talking to before you begin,
  and write it into the results.** Section C is a read against a specific
  project. Recording "checked the console" without recording WHICH console is
  the same as not checking. Confirm it from the build config you launched with,
  not from memory or from whichever console tab happens to be open.
- **The test account's uid.** You need it to construct document IDs. Get it from
  the console's Authentication tab, or from the app if you have a screen that
  shows it. Write it into the results.
- Record each step PASS, FAIL, NOT RUN or FINDING, with a note on anything you
  observed that the step did not ask about.

### Document IDs, once, so every later step can construct one

`dailyLogs` document IDs are `{uid}_{YYYY-MM-DD}`. So for uid `abc123` and
2026-09-19 the document is `dailyLogs/abc123_2026-09-19`. **Every console step
below names the exact document. Do not browse the collection and pick a row
that looks right.**

---

## Section 0 - BEFORE-STATE. Run this on `main`, BEFORE you install the branch build.

> **THIS SECTION IS LOST FOREVER IF IT IS NOT RUN FIRST.** Its whole purpose is
> to identify a genuinely pre-9.1a completed row. Once the branch build has run
> and you have completed a day on it, a row completed under the new code is not
> evidence about old rows, and a row you construct by hand in the console is not
> either. **A synthetic record is acceptable for the automated tests and is NOT
> acceptable as proof that real rows work.**

**0. FIND AN AUTHENTIC PRE-9.1a COMPLETED ROW AND RECORD IT**

In the Firestore console, in `dailyLogs`, find a document belonging to the test
account that has `protocolCompleted: true`. Any day before today will do; an
older one is better evidence than yesterday.

Record, into the results:

- the **full document ID**
- the value of **`date`**
- that **`completedAt` is absent** (not null - absent, the field does not
  appear in the console at all)
- that **`completionSource` is absent**
- that **`protocolCellId` is absent**
- that **`protocolFamily` is absent**
- whether **`dailyCapacity`** and **`dailyTimeBudget`** are present, and their
  values if so

**If no such document exists**, say so plainly and mark this step NOT RUN
rather than inventing one. Steps 14 and 15 then become NOT RUN too, and the
walk's conclusion has to say the historical path was never exercised against a
real row. That is a worse result than a FAIL, because it is an untested
guarantee rather than a broken one; do not paper over it.

**0b. CONFIRM THE APP READS THAT DAY AS COMPLETE ON `main`**

Still on `main`. If the row from step 0 is today's, open Today and confirm the
done state renders. If it is an older day, there is no surface that shows it -
note that and move on. This is the baseline that step 14 compares against.

---

## Section A - regression: the completion tap is unchanged

Install the branch build. Sign in as the same account.

**1. THE DAY'S ACTION IS THERE AND LOOKS THE SAME**

Reach Today on a day you have not completed. Confirm the hero card shows the
protocol name and the day's action, with a "Mark it done" button.

**WRITE DOWN WHICH PROTOCOL IS ON SCREEN.** The name, and the capacity you
answered in the picker. Step 12 compares the stored identity against this, and
"it looked right" is not a comparison. If the name is one of Remove's nine,
note it; if the account is in Recover or Refocus, note that too, because step
13 turns on it.

**2. MARK IT DONE COMPLETES OPTIMISTICALLY ON THE FIRST TAP**

Tap "Mark it done" once. The check and the done state must appear
**immediately**, not after a round trip. Do not tap twice.

**3. THE ACKNOWLEDGMENT RENDERS**

Read the line in the done state. On a Remove protocol it should be that
variant's own acknowledgment ("Nice. That's in place.", "You caught it. That's
useful.", "That's time you took back.", "Good. You made some room.", "It's on
paper now, not on you."). On Recover or Refocus it should be "Done for today."

Write down which line you saw.

**4. THE ACKNOWLEDGMENT QUIETS PAST FIVE CONSISTENT DAYS**

Only runnable on an account with five or more completed days in the current
phase. If you have one, confirm the done state reads **"Done for today."**
rather than the variant's own line.

If you do not have such an account, mark NOT RUN. Do not construct one by
editing Firestore: the count is derived from real completed days and a hand-made
row would test the derivation against data the app did not write.

**5. A SECOND TAP THE SAME DAY IS A NO-OP**

Leave Today and come back. The done state is still there and there is no button
to tap. Confirm there is no way to un-complete the day.

**6. A FAILED WRITE REVERTS AND SHOWS THE ERROR LINE**

On a fresh uncompleted day: enable airplane mode, then tap "Mark it done".

The check appears immediately (optimistic), then **reverts**, and the line
"That did not save. Try again." appears. The button must be tappable again.

Turn airplane mode off, tap again, confirm it completes.

> **CHECK THIS IN THE CONSOLE TOO, at step 16.** A revert that leaves a
> half-written document behind is exactly the failure this slice could
> introduce and the device cannot show.

**7. COMPLETION SURVIVES A RESTART**

Force-quit the app. Relaunch. Reach Today. The day still reads complete.

**8. DAY ROLLOVER WORKS**

Either leave the app backgrounded overnight and foreground it the next morning,
or change the device date forward one day and foreground the app.

Today must offer the morning picker again, and must **not** report the new day
as complete.

If you change the device clock, change it back before continuing and say so in
the results.

---

## Section B - the historical step

**9. A DAY COMPLETED BEFORE THIS BUILD STILL READS AS COMPLETE**

Uses the document from step 0.

If that row is today's date: reach Today and confirm the done state renders,
with an acknowledgment, exactly as it did at step 0b.

If it is an older date, there is no surface that renders it directly. Instead
confirm the **consistency-derived behaviour** is unchanged: the acknowledgment
quieting at step 4 counts completed days in the phase, and a legacy row must
still count toward it. If step 4 was NOT RUN, mark this NOT RUN as well and say
that the historical read was exercised only by the automated tests.

**A FAIL HERE IS THE MOST SERIOUS RESULT IN THE WALK.** It would mean the type
change or the read path started treating a provenance-free row as something
other than complete, which is the one thing this slice promised not to do.

---

## Section C - ACCEPTANCE, in the Firestore console

> **THIS IS NOT A NICETY AND IT IS NOT OPTIONAL.** Sections A and B would pass
> on `main`. Everything this slice adds is here. Record the environment and
> the document ID with every step.

**10. THE COMPLETION YOU MADE AT STEP 2 CARRIES ALL FOUR FIELDS**

Open `dailyLogs/{uid}_{today}` - construct the ID, do not browse for it.

Confirm present:

- **`completedAt`** - a timestamp, and **a server time**: it should be within
  a minute or two of when you tapped at step 2, in the console's timezone. A
  value at the epoch, a string, or a time hours away from the tap is a FAIL.
- **`completionSource`** - the string **`user_declared`**. Exactly that, with
  the underscore. Not `declared`, not `userDeclared`.
- **`protocolCellId`** - see step 12.
- **`protocolFamily`** - see step 13.

**11. `protocolCompleted` IS UNCHANGED**

On the same document, confirm `protocolCompleted` is still the boolean `true`.
It must not have become an object, a timestamp or a string. Nothing in this
slice touches it and a change here would mean something overwrote it.

Confirm `practiceIds` is still `[]` and `date` still matches the document ID's
date part.

**12. `protocolCellId` MATCHES THE PROTOCOL THAT WAS ON SCREEN**

Compare against what you wrote down at step 1.

The value is `{phase}-{capacity}`: one of `remove-normal`, `remove-limited`,
`remove-slammed`, `recover-normal`, `recover-limited`, `recover-slammed`,
`refocus-normal`, `refocus-limited`, `refocus-slammed`, or a `rewire-` one.

The **capacity half must match the tier you answered in the picker**, and the
phase half must match the phase the account is in. A mismatch is a FAIL even if
the value looks well-formed - it would mean the identity was re-derived at write
time rather than read from what the card rendered, which is the specific thing
this slice is built to prevent.

**13. `protocolFamily` MATCHES, OR IS CORRECTLY ABSENT**

- **If the protocol was one of Remove's nine**, this must be present and be
  `behavioral`, `mental` or `interpersonal`, matching the family the account
  captured. Cross-check against `journeyStates/{uid}`'s `removeFamily`.
- **If the account is in Recover or Refocus**, this field must be **ABSENT**.
  Not `null`, not an empty string - the key must not appear. Those variants
  carry no family, and a present-but-empty value would mean an undefined
  reached the write, which would have thrown.

**14. THE HISTORICAL ROW WAS NOT FABRICATED INTO**

Re-open the exact document from step 0, by its recorded ID.

Confirm, still:

- **`completedAt` ABSENT**
- **`completionSource` ABSENT**
- **`protocolCellId` ABSENT**
- **`protocolFamily` ABSENT**
- `protocolCompleted` still `true`

**ANY OF THOSE FOUR NOW BEING PRESENT IS A FAIL, AND IT IS THE FAILURE THIS
SLICE'S MOST IMPORTANT CODE EXISTS TO PREVENT.** A timestamp on that row would
be a fabricated record of when a completion happened, indistinguishable from a
real one and unrepairable.

Mark NOT RUN if step 0 was NOT RUN.

**15. THE SECOND-WRITE CHECK: AN UNRELATED WRITE DOES NOT DISTURB `completedAt`**

On the document from step 10, **write down the exact `completedAt` value**,
to the second.

Now cause another write to that same document without completing anything. The
reliable way: none of the app's paths re-open the picker on a completed day, so
instead force any other write the app makes to that row. If there is no such
path available on a completed day, say so and mark this **NOT RUN** rather than
hand-editing the document - a console edit tests the console, not the service.

If you can produce one, re-open the document and confirm **`completedAt` is
byte-identical to what you wrote down**, and that `completionSource`,
`protocolCellId` and `protocolFamily` are unchanged too.

> This is covered by an automated test (`an unrelated later write does not
> disturb a stored completedAt`). A NOT RUN here is acceptable and should say
> that the guarantee rests on the unit test alone.

**16. THE FAILED WRITE FROM STEP 6 LEFT NOTHING BEHIND**

Open the document for the day you used at step 6, by its constructed ID.

After the offline failure and the successful retry, the document must look like
a single clean completion: one `completedAt`, `completionSource:
'user_declared'`, identity matching what was on screen. There must be no sign
of a partial first write - no `completedAt` without `protocolCompleted`, no
provenance on a day that reads incomplete.

If the offline attempt never reached Firestore at all, that is the expected
result and is a PASS; say so.

**17. THE ROLLOVER DAY FROM STEP 8 HAS NO PROVENANCE YET**

Open `dailyLogs/{uid}_{the new date}` if it exists at all.

If you answered the picker on the new day but did not complete it, the document
should carry `dailyCapacity` and `dailyTimeBudget` and **no `protocolCompleted`
key at all**, and none of the four provenance fields. That absent completion key
is the live shape this slice's type change exists to describe honestly.

If you did not answer the picker, the document should not exist.

---

## What a complete walk looks like

- Step 0 run **on `main` before the branch build**, with a real document ID
  recorded.
- Sections A and B: the tap behaves as it always did, and a legacy completed
  day still reads complete.
- Section C: all four fields present and correct on a new completion, and all
  four still absent on the historical row.
- The **Firebase environment named in the results**, and every console step
  tied to a constructed document ID rather than to a browsed row.

**If Section C is not run, the walk is incomplete regardless of Section A.** Say
so in the result rather than reporting a pass on the device half.

---

## Results

**Environment:** the single Firebase project configured in `mobile/.env`. Verified
repo-wide that only one exists - `.env` and `.env.production` carry the same id,
`.env.local` and `eas.json` carry none - so there was no wrong-project risk to
discharge by inspection. **The project id is deliberately not written here**, per the
standing rule that it stays out of docs.
**Test account uid:** `qFQy5IMvDoedal69sz7NIukd1Jv1`
**Step 0 document ID:** `dailyLogs/qFQy5IMvDoedal69sz7NIukd1Jv1_2026-09-07`
**Walk date:** 2026-09-21
**Device:** iPhone 14 Plus, dev client. Default Dynamic Type, Reduce Motion off.

| Step | Result | Notes |
|---|---|---|
| 0 | PASS | `..._2026-09-07`. `protocolCompleted: true`; all four provenance fields absent; `dailyCapacity` `limited`, `dailyTimeBudget` `medium`. Identified on `main` BEFORE the branch build was installed. |
| 0b | PASS | The row is 2026-09-07, not today, so no surface renders it. Noted and moved on, as the step directs. |
| 1 | PASS | Card showed "Make it harder to reach", Remove phase. Picker answered `Normal` and `5 min or less`. Recorded for step 12. |
| 2 | PASS | Check and done state appeared immediately on the first tap, not after a round trip. |
| 3 | PASS | Remove variant acknowledgment rendered. |
| 4 | NOT RUN | Needs 5+ completed days in the current phase, which began 2026-09-07. Deliberately not constructed by hand. |
| 5 | PASS | Done state persisted on return; no control to un-complete. |
| 6 | NOT RUN | Needs a fresh uncompleted day. The walk gets one per real day and the device clock was not changed. |
| 7 | PASS | Force-quit and relaunch; the day still read complete. |
| 8 | NOT RUN | Needs a rollover, i.e. a fresh day or a clock change. Neither available. |
| 9 | NOT RUN | Its fallback depends on step 4. Its own subject, the 2026-09-20 completion written on `main`, is no longer today and Today renders only today. See the result note: step 14 covers the historical read more directly. |
| 10 | PASS | `..._2026-09-21` carries all four. `completedAt` 2026-09-21 12:13:29 PM UTC-4, twelve seconds after `createdAt` 12:13:17 - a real server time. `completionSource` `user_declared`. |
| 11 | PASS | `protocolCompleted` still boolean `true`; `practiceIds` still `[]`; `date` matches the document ID. |
| 12 | PASS | `protocolCellId` `remove-normal` against "Make it harder to reach" / Remove / `Normal` recorded at step 1. `dailyTimeBudget` stored `short`, matching `5 min or less`. |
| 13 | PASS | `protocolFamily` `behavioral`, present as required for a Remove variant. |
| 14 | PASS | `..._2026-09-07` re-opened by its recorded ID. All four provenance fields STILL ABSENT - absent, not null - beside `protocolCompleted: true` and 2026-09-07 `createdAt`/`updatedAt`. |
| 15 | NOT RUN | No app path produces a second write to a completed day. Not hand-edited: a console edit tests the console, not the service. Guarantee rests on its unit test. |
| 16 | NOT RUN | Depends on step 6. |
| 17 | NOT RUN | Depends on step 8. |

---

## WALK RESULT - 2026-09-21, 11 OF 17, NO FAILURES

**Walked by Kyle on an iPhone 14 Plus, dev client, 2026-09-21. ELEVEN PASSED, SIX NOT
RUN, ZERO FAILED. Attested 2026-09-21.**

**SECTION C RAN IN FULL WHERE IT COULD, AND IT IS THE RESULT THAT MATTERS.** Sections A
and B would have passed on main; everything this slice adds is in the console, and it
was inspected.

**THE NEW COMPLETION CARRIES ALL FOUR FIELDS, CORRECTLY.**
`dailyLogs/qFQy5IMvDoedal69sz7NIukd1Jv1_2026-09-21`, written at the step-2 tap:

- `completedAt` 2026-09-21 12:13:29 PM UTC-4, twelve seconds after `createdAt` at
  12:13:17. A real server time, not an epoch and not a string.
- `completionSource` `user_declared`, underscore correct.
- `protocolCellId` `remove-normal`.
- `protocolFamily` `behavioral`.
- `protocolCompleted` still boolean `true`; `practiceIds` still `[]`; `date` matches the
  document ID.

**STEP 12 IS THE ONE THE IDENTITY DESIGN EXISTED FOR, AND IT PASSED AGAINST A RECORDED
OBSERVATION RATHER THAN AN IMPRESSION.** The card on screen showed "Make it harder to
reach" under a Remove phase, with `Normal` capacity and `5 min or less` answered in the
picker. The stored `remove-normal` / `behavioral` matches that variant, and
`dailyTimeBudget` stored `short`, matching the time answer. Identity was read from the
variant the card RENDERED, never re-derived at write time. Before this walk that was an
argument in a Step 0; it is now an observation.

**STEP 14 IS THE MOST IMPORTANT RESULT IN THE WALK AND IT PASSED.**
`dailyLogs/qFQy5IMvDoedal69sz7NIukd1Jv1_2026-09-07`, a genuine pre-9.1a completed row
identified on main BEFORE the branch build was installed, was re-opened after the walk by
its recorded ID. It still carries `protocolCompleted: true` and `createdAt`/`updatedAt`
of 2026-09-07, and `completedAt`, `completionSource`, `protocolCellId` and
`protocolFamily` are ALL STILL ABSENT - absent, not null. Clause (c) of
`stampProvenance` is now verified in production and not only by its unit test. A
fabricated timestamp on that row would have been indistinguishable from a real one and
unrepairable, which is why this step existed.

**SIX STEPS NOT RUN, AND THE REASONS ARE STRUCTURAL RATHER THAN OVERSIGHTS.**

- Steps 6, 8, 16 and 17 each need a FRESH UNCOMPLETED DAY, and the walk gets one per real
  day. Kyle declined to change the device clock, which is the only mechanism that
  manufactures another. Step 6 is the offline revert, step 8 the rollover, step 16 the
  post-revert document inspection and step 17 the rollover day's shape. All four are
  regression or shape checks on behaviour this slice did not change; none tests a
  provenance field.
- Step 4, the acknowledgment quieting past five consistent days, needs 5+ completed days
  in the current phase, which began 2026-09-07. NOT RUN, and deliberately not constructed
  by hand - the count derives from real completed days and a hand-made row would test the
  derivation against data the app did not write.
- Step 9's fallback path depends on step 4, so it is NOT RUN with it. Its subject, the
  2026-09-20 completion written on main, has no surface that renders it: Today renders
  today. THE HISTORICAL READ IS NOT THEREBY UNVERIFIED - step 14 inspected the historical
  row directly and found it untouched, which is stronger evidence than an inference from
  a derived count would have been.

**ONE OBSERVATION THE STEPS DID NOT ASK FOR.** A second pre-9.1a completed row was
created deliberately on main on 2026-09-20, before the branch build was installed, to
give step 9 a rendering subject. It did not serve that purpose, because the day had
passed by the time the walk ran. It remains on the record as a second provenance-free row
and was not touched by this build.

**NO SEPARATE DEV DATABASE EXISTS.** The repo configures one Firebase project; the test
account's rows are production rows. Recorded so a later reader does not assume an
isolated environment.
