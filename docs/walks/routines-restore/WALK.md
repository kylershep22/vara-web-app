# ROUTINES-RESTORE - the routine card returns to Today - device walk

**Row:** ROUTINES-RESTORE. RoutineCard returns to Today without "Check habits", below the good moments, on R3a's immersive surface, subordinate to the day's protocol, and reading completions on the local day.
**Build:** branch `journey/routines-restore`, made of `d074e20` (before-state captures), `b6c25cd` (the restore), `55b4205` (the contracts and the hook suite), `3959ef0` (this walk script) and the fix commit "fix(today): the routine card keeps the row gap below the good moments", which carries the finding and this Part 4 entry. **Walk the fix commit.**
**Device:** iPhone 14 Plus, dev client.
**Walker:** Kyle. **Status: FIRST WALK 2026-09-30 STOPPED AT STEP B, FAIL, FIXED. THE FULL WALK RE-RUNS ON THE FIX COMMIT.**
**Time:** about 15 minutes. Use the account from the before-state captures, which has no routines.

**Before-state captures.** These are Kyle's two screenshots in `before/`, taken 2026-09-30 on `main` at `6653b7c` and described in `before/README.md`:
- `01-today-bottom.png`: Today ending at Add a good moment, with no routine card
- `02-routines.png`: the Time screen, Morning selected, templates only

The captures are unchanging evidence. **After-state evidence is added alongside them, never over them.**

---

## Part 1 - The fence

**Do not set, change or test a reminder.** Leave the reminder time field in the routine editor empty and do not tap "Set a gentle reminder". Reminders are the ROUTINE-REMINDERS slice.

**Do not change the day's protocol.** Do not set today's capacity, mark the day's card done, or name what is draining you. The walk only reads the top of Today.

**Create at most one routine**, from a Morning template, as step C says.

---

## Part 2 - The walk

Report every step as **PASS**, **FAIL** or **NOT RUN**, with what you saw. A step that cannot be reached on this setup is **NOT WALKABLE IN THIS SETUP**, never "not run".

Walk at **default Dynamic Type only**.

### A. Cold launch

1. Force-quit the app and reopen it. It opens onto Today.
   - **PASS:**
     - no error banner
     - the top of Today matches `before/01-today-bottom.png`
     - the routine card never shows anything false while Today settles. This account has no routines, so the empty state ("When you set a routine, it'll show up here.") appearing once, after the routines are known, is correct.
   - **FAIL:** an error banner appears, anything above Add a good moment differs from the before capture, or the card shows a routine or a Begin that this account does not have.

### B. The empty card, below the fold

1. Scroll to the end of Today.
   - **PASS:**
     - a card headed **"Today's routine"** sits **after Add a good moment**, reading "When you set a routine, it'll show up here." and **Create a routine**
     - it is visually quieter than the day's protocol card: no filled button, and the same translucent surface as the Add a good moment row, not a solid white card
     - **Create a routine is a text link**, not a filled button
   - **FAIL:** the card sits above Add a good moment, carries a filled button, or reads as louder than the day's protocol.
2. Tap **Create a routine**.
   - **PASS:** it lands on the **Time** screen, subtitle "Routines you've built", with **Morning** selected, as in `before/02-routines.png`.
   - **FAIL:** it lands anywhere else, or nothing happens.

### C. Apply one template

1. On the Time screen, with Morning selected, tap **The Essentials**. **This writes one routine document** (`routines`: your user id, name "The Essentials", type morning, its four activities, active true, reminderTime null, mode checklist).
   - **PASS:** the Time screen now shows The Essentials instead of the templates.
2. Go back to Today and scroll to the end.
   - **PASS:** the card shows **"Today's routine"**, **"The Essentials"**, its minutes (**10 min**) and **Begin ›** as a text link. At no point does it show the empty state again or a completed state.
   - **FAIL:** anything else.

### D. Begin, then close

1. Tap **Begin ›**.
   - **PASS:** the routine player opens **over Today**, not on another screen.
2. Close the player without finishing.
   - **PASS:** you are back on Today, and the card still shows The Essentials, 10 min and Begin ›.

### E. Finish, then Adjust this routine

The player offers Edit only on its completion screen, so it is walked here. Finishing **writes one completion document** (`routines/{id}/completions/` keyed by today's local date).

1. Tap **Begin ›** and complete every item in the checklist.
   - **PASS:** the player shows **"Routine complete"**, with **Done** and **Adjust this routine**.
2. Tap **Adjust this routine**.
   - **PASS:** the player closes and you land on the **Time** screen.
   - **FAIL:** it lands anywhere else, or the player stays open over it.
3. Go back to Today and scroll to the end.
   - **PASS:**
     - the card shows **"Today's routine"** and **"All done for today."**
     - **no action** of any kind on the card
     - **no minutes line**
     - **no Check habits**
   - **FAIL:** Begin comes back, a minutes line or empty row shows, or any action appears.

### F. Relaunch

1. Force-quit and reopen the app. Scroll to the end of Today.
   - **PASS:** the card still shows "All done for today." with no action, and nothing above Add a good moment has changed since step A. No error banner.
   - **FAIL:** the card shows Begin for The Essentials, or an error banner appears.
2. **Optional, on any later day, after 8pm local:** finish The Essentials that day, then relaunch.
   - **PASS:** it still shows as done. This is the local-day completion fix; before this build the card read a UTC date and showed a routine finished that evening as not done.

### G. Accessibility settings

- **Reduce Transparency:** **NOT RUN**, under Kyle's approved accessibility-settings deferral of 2026-09-29.
- **1.3 times Dynamic Type:** **NOT RUN**, under the same deferral.

---

## Part 3 - Not in this walk

- **Reminders.** Owned by ROUTINE-REMINDERS, including the dead PlanScreen opt-in and the editor's reminder field.
- **Card geometry and tap-target size.** Owned by R3b, which also owns the card's typography hierarchy, spacing and final visual treatment.
- **Edit landing on Morning for a non-morning routine.** The Time screen ignores the routines param and always opens on Morning. Owned by the later PlanScreen and Routines pass.
- **The player's own styling and copy**, including its completion screen and its Done button. The player is unchanged at `6653b7c`.

---

## Part 4 - Results

Results are recorded here as Kyle gives them.

### First walk, 2026-09-30: step B FAIL

**Step B: FAIL.** On the device, the routine card's top edge touched and overlapped the bottom edge of the Add a good moment row, with no gap between them. Evidence: `findings/01-overlap.png`, Kyle's capture.

**Cause.** The card had no top margin, and nothing above it supplied one. At `33847ca` the card sat above the good-moments row, and its own bottom margin made the gap; restored below that row, the two surfaces met edge to edge. No negative margin or offset was involved.

**Fix.** The card takes the calm remainder's row gap, `Spacing.sm`, the same top margin the good-moments row carries. No other geometry, padding, radius, type or shadow changed. It is pinned by the structure suite's row-gap test.

**No other step result from the first walk is recorded.** The full walk, A to F, re-runs on the fix commit.
