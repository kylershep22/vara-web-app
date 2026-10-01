# ROUTINE-REMINDER-TIME-PICKER - the reminder time is picked, not typed - device walk

**Row:** ROUTINE-REMINDER-TIME-PICKER. The routine editor's free-text reminder field becomes a tappable row that opens the shared time picker. Done commits, Cancel discards, and a set reminder can be removed. Scheduling, permission, cancellation, sign-out and alert behaviour are unchanged from ROUTINE-REMINDERS.
**Build:** branch `journey/routine-reminder-time-picker`: `ff6bfc7` (the before-state captures, C1), `4a4cb23` (the code and tests, C2), `b74e006` (the docs, C3), `bf8f225` (the fixes before the walk, C4) and the docs commit that carries this line (C5). **Walk the C5 commit, the tip of the branch, not `b74e006`.** It runs the same code as C4. A commit cannot carry its own hash: `git rev-parse HEAD` on the branch gives it, and it is recorded in the hand-off. The other hashes are in the roadmap's §13 entry for this slice.
**Device:** iPhone 14 Plus, dev client, default Dynamic Type. No new dev-client build is needed: the date-time picker package is already installed, and the fixes are JavaScript only.
**Walker:** Kyle. **Status: NOT YET WALKED.**

---

## Part 0 - Before-state evidence

Kyle's captures, taken on `main` at `50c3622` and committed unchanged in `before/` as C1. **They are unchanging evidence. After-state evidence is added alongside them, never over them.**

- `01-editor-empty-field.png`: the routine editor with no reminder, showing the label Reminder Time (Optional), an empty reminder field displaying the grey 08:00 placeholder, and the helper line Optional. For example, 7:30 AM or 7:30 PM.
- `02-editor-field-with-time.png`: the routine editor with 7:30 PM typed into the reminder field, before saving.
- `03-routine-badge.png`: the Time screen showing a routine with a reminder badge reading 7:30 PM.

---

## Part 1 - Read first

**Conditions.** Walk on the iPhone 14 Plus at default Dynamic Type, with Vara notifications allowed and General notifications off. Walk between 8 AM and 9 PM with Focus off.

**Reaching the routine.** Reach the routine through Today's routine card or the Time screen, then the routine's Edit. Habit screens are not part of this walk.

**For the firing steps, background Vara.** While Vara is open, a reminder shows as an in-app toast, not a banner.

---

## Part 2 - The walk

Report every step as **PASS**, **FAIL** or **NOT RUN**, with what you saw.

**W0.** Record the build hash, the iOS version, and whether notifications are allowed for Vara.

**W1.** Edit a routine that has no reminder.
- **PASS:** the section reads **Reminder (optional)**, the row reads **Add a reminder**, there is no helper line, and no **Remove reminder** action is shown.

**W2.** Note the current time, then tap the row.
- **PASS:** the sheet opens fully above the tab bar, with Done, Cancel and the whole wheel reachable, and the wheel shows the next quarter hour strictly after now.
- Scroll to a different time and tap **Cancel**. **PASS:** the row still reads **Add a reminder**.
- Tap **Update Routine**. **PASS:** no alert, and no badge on the routine.

**W3.** Open the row, choose a time 4 minutes from now, tap **Done**.
- **PASS:** the row shows that time, for example 2:14 PM, and **Remove reminder** appears.
- Tap **Update Routine**. **PASS:** **Reminder set** appears, naming the same time.
- Tap **OK**. **PASS:** the badge shows the same time in the same format.
- Background the app. **PASS:** the reminder fires at that time.

**W4.** Edit the routine and tap the row.
- **PASS:** the wheel opens at the stored time.
- Scroll to a different time and tap **Cancel**. **PASS:** the row still shows the stored time.
- Tap **Update Routine**. **PASS:** no alert.

**W5.** Edit the routine, open the row, choose a different time, tap **Done**, then tap the editor's own **Cancel**. Reopen the routine.
- **PASS:** the row still shows the time saved in W3.

**W6.** Open the row, choose a time 3 minutes from now, **Done**, **Update Routine**, **OK**. Edit again and tap **Remove reminder**.
- **PASS:** the row reads **Add a reminder**.
- Tap **Update Routine**. **PASS:** no alert and the badge disappears.
- Background the app. **PASS:** nothing fires.

**W7.** Quarter-hour checks on a routine with no reminder:
- **a.** Tap the row when the clock reads exactly a quarter hour (for example 2:15). **PASS:** the wheel shows the next quarter hour (2:30). **Cancel**.
- **b.** Tap the row one minute before a quarter hour (for example 2:14) and leave the sheet open until the clock passes it. **PASS:** the wheel does not move. **Cancel**.

**Not walked, with reasons:**
- **Screen reader labels (R-3):** NOT RUN. Accessibility-setting verification is deferred by Kyle (2026-09-29) until after the initial generally available release. Covered by automated tests.
- **Legacy malformed values and legacy display normalisation (R-6, R-7):** the picker cannot create either through the app. Covered by automated tests.
- **The defensive invalid-time outcome:** not reachable from the UI. Covered by automated tests.
- **Android:** NOT RUN; Kyle walks on iPhone. Covered by the shared picker's automated tests.
- **Scheduling, permission, cancellation and sign-out behaviour:** unchanged from ROUTINE-REMINDERS, walked there at e22eaa8.

---

## Part 3 - Results

| Step | Result | What was seen |
|---|---|---|
| W0 | NOT YET WALKED | |
| W1 | NOT YET WALKED | |
| W2 | NOT YET WALKED | |
| W3 | NOT YET WALKED | |
| W4 | NOT YET WALKED | |
| W5 | NOT YET WALKED | |
| W6 | NOT YET WALKED | |
| W7a | NOT YET WALKED | |
| W7b | NOT YET WALKED | |
