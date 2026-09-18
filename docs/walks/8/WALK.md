# Slice 8 - device walk

**Row:** journey roadmap §5 row 8, Good moments.
**Branch:** `journey/slice-8-good-moments`, built 2026-09-18, code at `2185d83`.
**Walker:** Kyle. **Status:** NOT RUN.

---

## What this walk is checking

A new row below the fold on Today, a new bottom sheet, and one new Firestore
collection. Nothing existing changes appearance or behaviour.

**THE FIRST STEP IS THE ONE THAT MATTERS.** The slice's only real decision was
placing the row in Today's unconditional content block rather than inside the
journey block, which is gated on
`weeklyLanding.target === 'today' && (cycle || phase)`. Step 1 is the only thing
that can confirm that on a device, and it is the reason the account requirement
below is the opposite of every other journey walk's.

| | Surface | What is new |
|---|---|---|
| 1 | Today, below the fold | `GoodMomentRow` - "Add a good moment" |
| 2 | The sheet | `GoodMomentSheet` - prompt, one field, Save, Cancel |
| 3 | Firestore | `moments/{autoId}` - `{ userId, text, createdAt }` |

## Conditions

**Device: iPhone 14 Plus.** There is no iPhone SE in this setup and no
simulator, so no step below needs either (§18(d), 2026-09-14).

**Account for steps 1-13: a FRESH account.** One with **no live weekly cycle
and no `journeyStates/{uid}` document**. This is deliberate and it is the
inverse of 7n's requirement: the whole point of step 1 is that the row appears
for a user who has no journey at all. **If the only account available is a
journeyed one, step 1 cannot be run and must be recorded as NOT RUN rather than
passed** - a journeyed account would show the row under either placement, which
is exactly the ambiguity this step exists to remove.

**Step 14 uses a journeyed account** and is the only step that does.

**Network:** steps 1-11 online. Step 12 needs airplane mode.

**Reference:** the branch is committed before the walk, per the workflow rule.

---

## Steps

### Placement and affordance

**1. On a FRESH account, open Today and scroll to the bottom.**
Expected: below the routine content and above the Insights look-back row, a
single line reading **"Add a good moment"** with a teal outlined plus icon to
its left.
Also expected, and this is the half that makes the step mean something:
**no Today hero card, no "Set today" prompt, no Start here row and no close-week
entry anywhere on the screen** - the journey block is absent on this account.
The Good moments row is present anyway.

**2. Same screen. Does the row read as something you can tap?**
Expected: yes, and say which cue carried it. The label is Evergreen Teal and
semibold, not Charcoal; the plus icon sits to its left. It should not read as a
section heading.
*Why this step exists: TODAY-CARD-AFFORDANCES is an open row about the inverse
defect one screen up - a protocol title that reads as a control and is not one.
An action that reads as a heading is the same defect in the other direction.*

**3. Tap the row.**
Expected: a sheet rises from the bottom of the screen. Rounded top corners, a
short grey handle bar centred at the top, a white surface, the screen behind
dimmed. The keyboard appears and the field is focused.
Expected copy: **"What was one good moment from today?"** above an empty
single-line field. Below it, a teal **Save** and, under that, a quieter
**Cancel**.

**4. Look at the field before typing.**
Expected: it is **empty**. No placeholder text, no greyed suggestion, no hint
underneath. Also: **no character counter anywhere**, and no text mentioning a
limit.

### Save enablement

**5. Look at the Save button before typing anything.**
Expected: dimmed - a pale sage fill with grey text rather than teal with white
text. Tapping it does nothing at all: the sheet does not close, no message
appears.

**6. Type three spaces. Nothing else.**
Expected: Save is **still** dimmed. Tapping it still does nothing.

**7. Type a real word after the spaces.**
Expected: Save becomes live - teal fill, white text - as soon as the first
non-space character lands.

**8. Delete back to empty.**
Expected: Save returns to dimmed **immediately**, on the keystroke that empties
the field, not after a pause. Now delete to only-spaces and confirm it stays
dimmed.

### The 200-character cap

**9. Type past 200 characters.** Hold a key down or type quickly until the field
stops accepting.
Expected: the field simply stops taking characters at 200. **No counter
appears, no warning, no colour change, no message, and no haptic.** Nothing
tells the user a limit was reached except that typing stops.

**10. Paste a long block of text.** Copy something well over 200 characters
from another app - Notes or Safari - clear the field, and paste it in.
Expected: the field accepts the paste and **truncates it to 200 characters**.
Expected NOT to happen: the paste being rejected outright, the field staying
empty, or an error appearing.
*Record the actual behaviour even if it matches. This is the one behaviour in
the slice that is asserted by React Native's own `maxLength` rather than by our
code, and it has not been seen on a device.*

### Success

**11. Clear the field, type a short real sentence, tap Save.**
Expected, in this order:
- the word **"Saved."** appears in teal inside the sheet, just above the Save
  button, where an error would appear;
- the sheet stays open for **about a second and a quarter** - long enough to
  read the word, clearly shorter than a two-second pause;
- the sheet then closes **by itself**, sliding down the way it came up. You do
  not tap anything.
Expected NOT to happen: a toast at the top or bottom of the screen; the sheet
snapping shut; the row on Today changing in any way afterwards.

**11b. Look at the row again after the sheet has closed.**
Expected: **identical to step 1.** Same label, same colour, same weight, no
tick, no count, no "added" state, nothing.

**11c. Tap the row again and save a second moment the same day.**
Expected: it works exactly as it did the first time, and the row is still
unchanged afterwards.

### Failure and retry

**12. Turn on airplane mode. Open the sheet, type a sentence, tap Save.**
Expected:
- **"Couldn't save that. Try again."** appears in coral inside the sheet, in
  the same place "Saved." appeared;
- the sheet **stays open**;
- **the text you typed is still in the field**, unchanged and still editable;
- no toast, no alert, no dialog.

**13. Still in the same sheet: turn airplane mode off, wait for signal, and tap
Save again without retyping.**
Expected: the same text saves. "Saved." appears, the sheet closes itself.
*This is the whole point of leaving the text in place - the retry is in place,
not a retype.*

### Dismissal

**14. Open the sheet, type something, and dismiss it three separate times - one
route each. Do not save.**
- **14a. Tap Cancel.**
- **14b. Tap the dimmed area above the sheet.**
- **14c. Swipe the sheet down** from the handle bar at the top.

Expected for all three: the sheet closes. **No "Discard changes?" dialog, no
confirmation of any kind, no toast.** Then reopen the sheet each time and
confirm **the field is empty** - the abandoned text is gone, not restored.

### Dynamic Type

**15. Settings > Accessibility > Display & Text Size > Larger Text. Move the
slider up to about 1.3x. Return to Today.**
Check each of these and say which, if any, truncate, wrap badly, overlap or
push a control off screen:
- the row label "Add a good moment";
- the sheet prompt "What was one good moment from today?";
- the **Save** label;
- the **Cancel** label;
- **"Saved."** (save a moment at this size to see it);
- **"Couldn't save that. Try again."** (airplane mode again, at this size).
Expected: all six legible and complete. The prompt is the longest string and is
the most likely to wrap to two lines - **wrapping is fine, clipping is not.**
Also confirm the Save button is still reachable above the keyboard at this size.

### VoiceOver

**16. Settings > Accessibility > VoiceOver on. Return to Today and swipe to the
row.**
Expected: it announces as a **button**, reads **"Add a good moment"**, and
offers a hint about opening a sheet to write one. It should not announce as
static text.

**17. Open the sheet with VoiceOver still on, before typing anything, and move
focus to Save.**
Expected: it announces **"Save"** and announces as **dimmed** or
**unavailable**. It should not announce as an ordinary available button.

**18. Type a word, then move focus back to Save.**
Expected: it now announces as an ordinary available button. Activate it and
confirm **"Saved."** is announced without needing to go looking for it.

**19. With VoiceOver still on, move focus to Cancel.**
Expected: announces as a button reading **"Cancel"**. Activating it closes the
sheet.

### Reduce Motion

**20. Settings > Accessibility > Motion > Reduce Motion ON. Return to Today and
open the sheet.**
Expected: the sheet **fades in** rather than sliding up from the bottom.
Then: **swipe down on it anyway.** Expected: it still dismisses. The sheet does
not follow your finger as you drag - that part is deliberately switched off -
but releasing a downward swipe still closes it.
Then save a moment at this setting and confirm "Saved." and the self-close still
behave as in step 11.

### One journeyed-account check

**21. Sign in to a JOURNEYED account** - one with a live week and a phase, so
the Today hero and the Start here row are both on screen. Scroll to the bottom.
Expected: the Good moments row is there too, **unchanged from step 1**, sitting
below the routine content. The journey block above it is unaffected: the hero,
the journey line, Start here and the close-week entry all look exactly as they
did before this slice.

---

## Result

**NOT RUN.**

Record per step: PASS, FAIL or NOT RUN, with a note on anything that differed
from the expectation even where it still passed. Step 10's actual paste
behaviour should be written down whatever it turns out to be.

## Attestation

Not yet given.
