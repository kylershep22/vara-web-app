# 9.1b - the Remove protocol sheet - device walk

**Row:** 9.1b, the Remove behavioural screen. **The last row blocking R3.**
**Build:** branch `journey/slice-9-1b-behavioural-sheet` (commit hash in the build log).
**Device:** iPhone 14 Plus, dev client. **Seven sections.**
**Walker:** Kyle. **Status: NOT WALKED.**
**Time:** about 30 minutes with a seeded Remove account.

---

## Part 1 - What you are testing, in plain terms

**This is the first thing in this sequence a user can see.** Remove's nine
protocols have carried a written "why it works" explanation since slice 3a.
Jen wrote and reviewed all nine, and **nobody has ever seen one on a screen.**
This slice is the first surface that shows them.

On Home, the day's card now opens. Tap the top of the card (the heading and
the sentence describing today's action) and a sheet slides up with the full
protocol: its name, what to do, and why it can help. The sheet has the same
**"Mark it done"** as the card, and a quiet **"Back to Today"** underneath.

**The sheet shows what you opened, and keeps showing it.** If something changes
while it is open (the day turns over, or your plan moves on), the sheet does not
quietly swap in a different protocol. Two of those cases cannot be walked on a
device; Part 4 names them.

---

## Part 2 - What you will see on the screen

### The card, with its new entry

For a **Remove** protocol only (the first phase of every journey), the card's
top area has a small grey **chevron (>)** at its right edge, level with the
heading. The heading and the action sentence are one tap target. **The teal
"Mark it done" button is unchanged and is still the only button.**

Protocols in later phases (Recover, Refocus) have **no chevron** and do not
open. That is Remove-only by ruling, not a bug.

### The sheet

| Where | What it says | Whose words |
|---|---|---|
| Title | **Today's action** | drafted, pending Kyle |
| Under the title | the protocol's name, e.g. **Make it harder to reach** | Jen, authored |
| First heading | **What to do** | drafted, pending Kyle |
| Under it | the same action sentence as the card | Jen, authored |
| Second heading | **Why it can help** | drafted, **pending Jen** |
| Under it | the "why it works" paragraph | Jen, authored, **never seen before** |
| Button | **Mark it done** | approved |
| Quiet link | **Back to Today** | drafted, pending Kyle |

A fifth drafted string, **"Your plan for today has updated. Head back to Today
to see what's next."**, only appears in a case this walk cannot reach (Part 4).

---

## Part 3 - The walk

**Account:** a journey account in its **Remove** phase that has **answered
today's picker and not yet completed today**. Note the destination and today's
protocol name before you start.

### A. The entry reads as tappable and does not compete with the button

1. Open Home. Look at the day's card without touching it.
   - **PASS:** the chevron is visible and reads as "this opens". The teal
     button still reads as the one action. Nothing about the card looks like it
     has two buttons.
   - **FAIL:** no chevron; or the top of the card looks like a second button;
     or the layout has shifted compared with yesterday's build.

### B. The sheet shows the protocol, including why it can help

1. Tap the heading or the action sentence.
   - **PASS:** the sheet opens and shows everything in the table above. **Read
     the "why it can help" paragraph in full and note anything that reads
     wrongly on a phone.** This is its first time on a screen.
   - **FAIL:** nothing opens; or the sheet opens empty; or any row of the table
     is missing.
2. Tap **Back to Today**. The sheet closes and the card is unchanged.
3. Open it again, then close it by **tapping the dimmed area above the sheet**.
   Same result.

### C. Completing from the sheet lands on the card underneath

1. Open the sheet and tap **Mark it done**.
   - **PASS:** the button is replaced at once by a small check and an
     acknowledgment line (e.g. "Nice. That's in place."). This is the card's own
     acknowledgment, not a new one.
2. Tap **Back to Today**.
   - **PASS:** the card underneath **already shows the check and the same line,
     with no pull-to-refresh.**
   - **FAIL:** the card still shows "Mark it done" until you refresh.
3. Pull to refresh, or leave the tab and come back. The card still shows done.
4. Open the sheet again. It shows done, with no button.

### D. A failed write does not leave a false "done"

**Use a second Remove account, or tomorrow's day on this one.** The same day
cannot be un-completed.

1. Open the sheet. Turn on **Airplane Mode**. Tap **Mark it done**.
2. Record **which** of these you see. Both are acceptable, and they mean
   different things:
   - **(i)** the check appears, then within a few seconds is replaced by
     **"That did not save. Try again."** in soft coral, with the button back.
     That is the revert path working.
   - **(ii)** the check appears and stays. Firestore may be holding the write to
     send later rather than failing it. Turn Airplane Mode off, wait ten
     seconds, pull to refresh: **PASS** if the card still shows done (the write
     landed).
   - **FAIL (either way):** a check that is still showing after you are back
     online and have refreshed, while the card shows "Mark it done"; or an
     error with the check still showing beside it.

### E. Large text: the body fits or scrolls

1. Settings > Accessibility > Display & Text Size > Larger Text: move the
   slider to about **130%** (two notches above default). Return to the app.
2. Open the sheet.
   - **PASS:** the "why it can help" paragraph and both headings are fully
     readable, either on screen or by scrolling the sheet's body. **The button
     and "Back to Today" stay pinned at the bottom** and are never pushed off.
   - **FAIL:** text is cut off with no way to scroll to it; or the button is
     hidden.
3. Set text size back.

### F. VoiceOver

1. Turn on VoiceOver. On Home, swipe to the card's top area.
   - **PASS:** it reads the heading and the action sentence, then **"button"**.
     Record the exact phrasing. Nothing tells the user *what* it opens beyond
     "button"; **say whether that is enough**, because a hint would be a new
     drafted string.
2. Double-tap to open. Swipe through the sheet.
   - **PASS:** title, protocol name, **"What to do, heading"**, the action,
     **"Why it can help, heading"**, the paragraph, **"Mark it done, button"**,
     **"Back to Today, button"**, in that order.
3. Swipe back to the card entry while its day is completed. It is still a
   button and still opens.

### G. Backgrounding does not lose the sheet

1. Open the sheet on an account whose day is not done. Scroll the body a
   little.
2. Swipe to the home screen. Wait at least **one minute**. Return to the app.
   - **PASS:** the sheet is still open, showing the same protocol, and "Mark it
     done" still works.
   - **FAIL:** the sheet has closed, or shows a different protocol, or its
     button has gone faded and stayed faded.

---

## Part 4 - What this walk cannot show

These are covered by tests against the real Today hook
(`usePinnedProtocol.test.ts`) and the Home screen
(`DashboardScreen.protocolSheet.test.tsx`), and **are unverified on a device.**

- **Midnight.** A sheet opened on Monday and completed after midnight should
  stay open, keep Monday's protocol, and write **Monday's** row. If Monday was
  already done, it should stay showing done. Walking it needs a device clock
  change across midnight while the app is open, and this walk does not do that.
- **A same-day plan change while the sheet is open.** The sheet should keep its
  content, replace "Mark it done" with the "plan has updated" line, and stay
  open until you close it. Reaching it on a device means racing Home's
  refresh: opening the sheet in the moment after returning from the Remove
  capture or the advancement preview, before Home has caught up. **If you ever
  see "Your plan for today has updated", record what you had just done.**
- **Anything cross-device.** A plan change made on another device that this
  phone has not seen is **outside the guarantee** by ruling. The sheet
  completes the protocol it pinned, provided that protocol is still valid
  against what **this device** knows, and journey state is not re-read at the
  moment of completion. That class is ledgered as CROSS-CLIENT-STATE-FRESHNESS.

---

## Part 5 - Record

| Section | Result | Notes |
|---|---|---|
| A. Entry affordance | | |
| B. Sheet content | | whyItWorks read in full? |
| C. Completion reflects on card | | |
| D. Failed write | | (i) or (ii)? |
| E. 130% text | | |
| F. VoiceOver | | exact entry phrasing; hint needed? |
| G. Backgrounding | | |
