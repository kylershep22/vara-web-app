# Slice 8 - device walk

**Row:** journey roadmap §5 row 8, Good moments.
**Build:** branch `journey/slice-8-good-moments`.
**Device:** iPhone 14 Plus. No SE, no simulator. **23 steps.**
**Walker:** Kyle. **Status: WALKED 2026-09-18. 20 of 23 walked, 1 FAIL, 2 NOT RUN.**

> **THIS SCRIPT REPLACED AN EARLIER 21-STEP VERSION WHOLESALE, AND THE REASON IS
> IN STEP 1.** The first script demanded a "fresh" account with no weekly cycle
> and no `journeyStates` document, and expected the journey block to be absent
> on it. **That state is not reachable in production**: a fresh account with a
> floor commitment rolls a cycle over the moment it lands on Today, and one
> without a floor commitment is pushed to the floor screen instead. Step 1 as
> written could never have passed, and a FAIL against it would have been a fault
> in the script rather than in the build. The replacement asks for a failed
> weekly read instead, which is the state the placement decision actually
> protects.

---

## Conditions before you start

- Any normal account that lands on Today. A "fresh" account is **NOT** required
  and the earlier script was wrong to ask for one.
- Firestore rules must be deployed from this branch. Undeployed rules produce a
  permissions denial on every save.
- Reduce Motion OFF. Dynamic Type at default. Both change later.
- Copy a block of text longer than 200 characters to the clipboard before you
  begin. Step 13 needs it.
- Record each step PASS, FAIL, NOT RUN or FINDING, with a note on anything
  observed that the step did not ask about.

---

## A. Placement

**1. PLACEMENT UNDER A FAILED WEEKLY READ (two outcomes)**

Launch online and reach Today. Enable airplane mode. Pull down to refresh.

**OUTCOME A**, the journey block disappears and ordinary content remains: scroll
down. The Good moments row must still be present. **PASS.** This is the
production state the placement decision protects, and it is now device-verified
rather than resting on a mock.

**OUTCOME B**, the journey block still renders: Firestore served the read from
its offline cache, so the read did not fail and `target` stayed `'today'`.
Record **NOT RUN** with that reason. Not a FAIL.

Turn airplane mode off before step 2.

**2. THE ROW IS BELOW THE FOLD**

Scroll down past the journey content. The row sits among the ordinary cards:
insight card, weekly habit grid, routine card, lookback card.

Check: it is a ROW, not a card. No background colour, no border, no rounded
corners, no shadow. If it looks like the cards around it, FAIL.

**3. THE ROW READS AS TAPPABLE**

Reads exactly: **Add a good moment**
Teal, semibold, plus-circle outline icon.

Press and hold briefly: a pressed state is visible. Compare it against a nearby
non-interactive line of text. If a stranger could not tell which is a control,
FAIL.

**4. TOUCH TARGET**

Open and dismiss three times, tapping: near the row's top edge, near its bottom
edge, and well to the right of the label. All three open the sheet. A dead zone
anywhere in the row's height is a FAIL.

**5. NO DIGITS ANYWHERE**

No number, count, badge, checkmark or dot on the row or around it.

---

## B. The sheet

**6. THE SHEET APPEARS CORRECTLY**

Rises from the bottom. Top corners rounded, handle bar centred at the top,
dimmed scrim behind, Today visible through it. It does not appear centred on
screen and it does not fade in.

**7. THE PROMPT**

Reads exactly: **What was one good moment from today?**
No helper text beneath. No character guidance.

**8. SAVE IS DISABLED ON OPEN**

Field empty, Save dimmed. Tap it. Nothing happens: no save, no dismissal, no
error, no tooltip, no explanatory copy.

**9. WHITESPACE DOES NOT COUNT**

Type three spaces. Save stays dimmed.

**10. REAL TEXT ENABLES SAVE**

Type one word. Save becomes active immediately, without dismissing the keyboard
or tapping elsewhere.

**11. DELETING BACK DISABLES IT AGAIN**

Delete to empty: Save dims immediately. Three spaces: still dimmed. A word:
active again.

**12. KEYBOARD DOES NOT COVER THE CONTROLS**

With the keyboard up, the field, Save and Cancel are all visible. Nothing is
pushed off the bottom and the sheet is not shoved above the top of the display.

**13. THE 200 CAP, TYPED AND PASTED**

Typed: hold a letter key until the field stops accepting characters. It simply
stops. No counter, no warning, no colour change, nothing shakes.

Pasted: clear the field, paste the long block. It must TRUNCATE to roughly 200
characters. If the paste is refused wholesale and the field stays empty, FAIL.
This is the one behaviour in the slice guaranteed by the framework rather than
by our code.

---

## C. Saving

**14. SUCCESS**

Clear, type a short sentence, tap Save. In order:

- **"Saved."** appears INSIDE the sheet, where an error would appear.
- The sheet closes by itself. You tap nothing.
- It is brief, roughly a second and a quarter. If you find yourself waiting,
  note the feel even if it technically passed.

**15. NOTHING APPEARS AT THE TOP OF THE SCREEN**

During and after step 14, no banner or toast anywhere, least of all at the top.
This row does not use the toast at all.

**16. THE ROW IS UNCHANGED AFTER A SAVE**

Identical label, no count, no tick, no colour or weight change. Reopen the
sheet: the field is EMPTY. It does not show what you just saved and it does not
show a previous entry.

**17. A SECOND SAVE ON THE SAME DAY**

Succeeds the same way. The row is still identical. No limit message, no second
state.

**18. FAILURE (three outcomes)**

Airplane mode ON. Open the sheet, type a sentence, tap Save.

**OUTCOME A:** "Couldn't save that. Try again." shows inline, the sheet STAYS
OPEN, your text is still in the field. Turn airplane mode off and tap Save again
without retyping. It succeeds from the same sheet. **PASS.**

**OUTCOME B**, it hangs: the sheet sits saving and neither settles nor errors.
Firestore queued the write offline rather than rejecting it. Record as a
**FINDING**. Note whether there is any way out of the sheet while it hangs, then
turn airplane mode off and record what happens.

**OUTCOME C**, it reports success offline: the write was queued locally and the
acknowledgment fired anyway. Record as a **FINDING**, turn airplane mode off,
confirm the moment actually arrives.

B and C are real information about the offline path and neither is a defect in
this row. Do not halt the walk on them.

**19. DISMISSAL DISCARDS, THREE ROUTES**

Each time: open, type a sentence, dismiss, reopen, confirm the field is empty.

- **a.** Tap Cancel.
- **b.** Swipe the sheet down.
- **c.** Tap the dimmed area outside the sheet.

On all three: no "Discard changes?" dialog, nothing asks you to confirm, the
text is simply gone.

**20. THE SHEET FOLLOWS YOUR FINGER**

Reduce Motion OFF. Open the sheet. Start on the grey handle bar and drag down
about half an inch, holding your finger down.

Check: the sheet moves with your finger. Release above the dismiss threshold: it
snaps back up and stays open.

This is the positive observable for "the gesture is arriving". Step 22 cannot
serve as a swipe regression check on its own, because `onPanResponderMove`
no-ops under Reduce Motion, so a dead gesture and a working-but-still gesture
look identical there.

---

## D. Accessibility

**21. DYNAMIC TYPE AT 1.3x**

Settings, Accessibility, Display and Text Size, Larger Text. Raise it roughly a
third above default.

Check all six strings:

- Add a good moment
- What was one good moment from today?
- Save
- Cancel
- Saved.
- Couldn't save that. Try again.

For each: nothing truncated with an ellipsis, nothing clipped at a container
edge, nothing overlapping. The row reads as one line or wraps cleanly. Buttons
still look tappable. Open the keyboard and confirm the sheet still fits.

Return to default before step 22.

**22. VOICEOVER**

- Swipe to the row: it announces its label, is identified as a button, and
  speaks a hint.
- Open the sheet, swipe to Save with the field empty: it announces as dimmed or
  unavailable, not as a normal button.
- Type text: Save announces as available.
- Cancel announces as a button.
- Save a moment: "Saved." is announced WITHOUT moving focus to it. Same check on
  the error line if you can reach step 18 outcome A.

**23. REDUCE MOTION**

Settings, Accessibility, Motion, Reduce Motion ON.

- The sheet FADES in rather than sliding up.
- Swipe-to-dismiss still works. Reduced motion must not remove the gesture, only
  the animation.
- "Saved." still appears and the sheet still closes by itself.

Turn Reduce Motion off.

---

## E. The ordinary case

**A NORMAL ACCOUNT, JOURNEY BLOCK PRESENT**

Online, normal launch, journey block rendering. Scroll down: the row is present,
below the journey content, among the ordinary cards. Tap it and save a moment,
confirming the whole path in the state every real user is actually in.

**END OF WALK**

---

## Result, as run 2026-09-18

**Walked by Kyle on an iPhone 14 Plus. 20 of 23 walked. 1 FAIL. 2 NOT RUN.**
**Not rounded to "walked".**

| | Steps | |
|---|---|---|
| **PASSED** | all except those below | 20 of 23 |
| **FAILED** | **19b** | swipe-to-dismiss |
| **NOT RUN** | **1**, **18** | both need a state a dev client cannot reach |

### Step 19b - FAIL. Swipe-to-dismiss is inert.

**Inert in all four finger positions** - the handle bar, the prompt line, the
input field, and below the buttons. **No movement, no dismissal, nothing.** Not
under-responsive: the sheet does not follow the finger, does not snap back, and
does not travel at all.

**19a (Cancel) and 19c (scrim tap) both PASSED**, discarding the text with no
confirmation dialog. **Two of the three dismissal routes work, and they are the
two discoverable ones.**

**DIAGNOSED ON DEVICE WITH AN INSTRUMENTED BUILD, NOT INFERRED.** Eight drags,
vertical and horizontal. Every one produced `1 startCapture` and `2 start`.
**Line `3 moveCapture` never fired, on any drag, in either direction.** The
control line `0 render` appeared throughout, so the instrumentation was live and
the run is valid.

**Touch-down arrives. Move negotiation never happens.** Direction is irrelevant.

Two readings remain and the log cannot separate them. **Both are recorded
because neither can be eliminated without another build cycle, and both point at
the same class of fix:**

- **(a)** Move negotiation is dead for this view inside a Fabric `<Modal>`.
- **(b)** Another view claimed the responder on touch-down and never released
  it, so React Native never re-offered negotiation. With `autoFocus` the keyboard
  is up throughout, and interactive keyboard dismissal is the obvious candidate.

**Both apply equally to `HabitNoteSheet` and `ConversationsScreen:351`, which
share the pattern. Neither belongs in slice 8.** Rowed as
`PANRESPONDER-VERIFICATION`.

**The gesture code is NOT removed.** The `PanResponder`, the handle bar and both
predicates stay exactly as built. This is recorded as non-functional pending a
fix elsewhere, not deleted.

**Step 20 could not be reached**, since it is the positive observable for the
same gesture. It stands for the re-walk.

### Step 1 - NOT RUN

The airplane-mode-and-pull-to-refresh variant above was added **after** the walk,
from the same reasoning that replaced the script: the committed 21-step script
asked for a fresh account and that state is unreachable, and the state that
matters is a failed weekly read.

**It has not been run.** When it is, Outcome A device-verifies the placement and
Outcome B records that Firestore's offline cache served the read.

**Why it matters more than an ordinary unrun step:** the only coverage that
state has today is a jest test using a mocked rejection. That is a mock
asserting a behaviour no device has confirmed - structurally the same shape as
the swipe test, which passed its mutation check and stayed green while the
gesture was dead.

### Step 18 - NOT RUN

The offline failure path. A dev client loads its JS bundle from Metro, so it
cannot launch without network, which is what makes the launch-time offline state
awkward to reach in this setup.

**Recorded as a structural limitation of the setup, in the same class as the SE
matrix, not as an oversight.**

**One observation is outstanding and is deliberately not written up here.** The
inline failure path was seen incidentally during the build window, before the
rules were deployed, when a genuine server rejection produced it. **The walker's
own account of what that looked like has not been supplied**, and it is not
recorded from anyone else's reconstruction. It goes in at the merge docs commit,
in his words, or not at all.

### Outstanding for the re-walk

Steps **19a, 19b, 19c and 23**, plus **20**, once `PANRESPONDER-VERIFICATION`
lands. Step 23 cannot stand alone as the swipe regression check - see step 20's
own note for why.

## Attestation

Not yet given. It is recorded at the merge docs commit, dated the day it is
given.
