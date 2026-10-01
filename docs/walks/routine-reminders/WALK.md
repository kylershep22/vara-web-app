# ROUTINE-REMINDERS - a routine reminder either works or says honestly that it cannot - device walk

**Row:** ROUTINE-REMINDERS. A routine reminder depends only on the user setting one, a valid time and OS notification permission. It is independent of the General notifications control. Every save says honestly what happened to the reminder, and no routine reminder survives loss of the owning user session.
**Build:** branch `journey/routine-reminders`: `0a37989` (the before-state captures, C1), the code and tests commit (C2) and the docs commit that carries this script (C3). **Walk the C3 commit**, which runs the same code as C2. The hashes are recorded in the roadmap's §13 entry for this slice.
**Device:** iPhone 14 Plus, dev client, default Dynamic Type.
**Walker:** Kyle. **Status: NOT YET WALKED.**

---

## Part 0 - Before-state evidence

Kyle's captures, taken on `main` at `cff2e98` and committed unchanged in `before/` as C1. **They are unchanging evidence. After-state evidence is added alongside them, never over them.**

- `01-notification-settings.png`: Notification settings on cff2e98, showing the All Notifications row with the subtitle Master toggle for all notifications.
- `02-editor-reminder-field.png`: The routine editor on cff2e98, showing the 08:00 field and the helper line Set a daily reminder time (HH:MM format).
- `03-save-valid-alert.png`: After saving the valid value 08:00 on cff2e98, a generic alert titled Success with the body Routine updated successfully! and an OK button. The badge behind it reads 08:00.
- `04-save-invalid-alert.png`: The routine editor on cff2e98 with the invalid value 730 entered, captured before tapping Update Routine. The alert after this save was not captured on the device.
  - **Command evidence for what the edit save path shows for any value on cff2e98:** `git show cff2e98:mobile/src/components/routines/RoutineEditor.tsx`. Line 147 writes `reminderTime: reminderTime.trim() || null`, so 730 is stored as typed. Lines 151 to 158 call `scheduleRoutineReminder`, which returns silently on an unparseable time. Line 159 then shows `Alert.alert('Success', 'Routine updated successfully!')` unconditionally. On cff2e98 the edit save path shows that same Success alert for every value, valid or not.
- `05-invalid-time-rendered.png`: The Time screen on cff2e98 after saving 730, showing The Essentials with a reminder badge reading 730. The invalid value was accepted, saved and displayed.
- `06-signed-out-reminder-fires.png`: **absent. The sign-out before evidence was not captured.**

**Kyle's before-state observation (Kyle, 2026-10-01):** the reminder field is free text and gives no format validation or format feedback; it saves the value as entered.

---

## Part 1 - Read first

**Quiet Hours do not touch routine reminders.** Kyle's device has Quiet Hours on from 9:00 PM to 8:00 AM. A read-only check before the code commit found nothing in the app that suppresses, delays or reschedules a routine reminder for Quiet Hours or any other notification preference:
- **Scheduling** (`mobile/src/services/reminderScheduler.service.ts`, `scheduleRoutineReminder`): reads only the routine, the parsed time and the OS permission status. It reads no preference.
- **Quiet Hours** (`mobile/src/services/notificationScheduler.service.ts` lines 108 to 121, `sendThrottledNotification`): the only reader of `isWithinQuietHours` and the 4-hour throttle, and it is used only by the social and milestone senders.
- **The foreground handler** (`mobile/src/services/notifications.service.ts` lines 43 to 69): reads no preference. It shows a reminder that arrives while Vara is open as an in-app toast instead of a banner, for every notification type.
- **The General notifications control:** on `cff2e98` it did suppress routine reminders, through the early exit in `syncAllReminders`. This slice removes that by ruling R-A.

**So walk the firing steps (W5 to W8, W11 to W13) at any time of day.** iOS Focus modes are OS controls and stay authoritative (ruling R4). Turn any Focus mode off for the walk, or a reminder may be held by iOS rather than by Vara.

**For the firing steps, background Vara.** While Vara is open, a reminder shows as an in-app toast, not a banner.

**Reaching routines.** Start from Today: tap the routine card's link to the Time screen, then the routine's Edit. Habit screens are not part of this walk.

**Typing times.** The field accepts `7:30 PM`, `7:30pm` or `19:30`. "4 minutes from now" means the clock time 4 minutes ahead, typed in one of those forms.

---

## Part 2 - The walk

Report every step as **PASS**, **FAIL** or **NOT RUN**, with what you saw.

**W0.** Record the build hash, the iOS version, and the current notification permission for Vara.

**W1.** Settings, then Notifications.
- **PASS:** the label reads **General notifications** and the subtitle reads exactly **Controls Vara’s general reminders and updates. Routine reminders are managed within each routine.**
- Turn General notifications **off** and leave it off for the whole walk.

**W2.** Delete Vara and reinstall the dev client, so permission is undetermined. Sign in. Open the routine for editing, change only its name, save.
- **PASS:** the editor closes with no alert.

**W3.** Enter **7:30 PM** and save.
- **PASS:** **Allow reminders?** appears and no OS prompt appears.
- Tap **Not now**. **PASS:** the editor closes.
- Reopen the routine and save without changing anything. **PASS:** **Allow reminders?** appears again.
- Tap **Not now**.

**W4.** Set the reminder to 4 minutes from now and save. Tap **Allow notifications**.
- **PASS:** the OS prompt appears. Allow it.
- **PASS:** **Reminder set** appears, naming that time in the 7:30 PM style. Tap **OK**.

**W5.** Background the app.
- **PASS:** the reminder fires at that time, with General notifications still off.
- Tap it and record where it lands.

**W6.** Set the reminder to 3 minutes from now and save. Then, before it fires, change it to 6 minutes from now and save.
- **PASS:** nothing fires at the first time, and exactly one reminder fires at the second.

**W7.** Set the reminder to 4 minutes from now and save. Then change only the routine name and save.
- **PASS:** no alert on the rename, and exactly one reminder fires at the set time.

**W8.** Set the reminder to 3 minutes from now and save. Then clear the field and save.
- **PASS:** no alert, the badge disappears, and nothing fires.

**W9.** Enter **730** and save.
- **PASS:** **Check the reminder time** appears, with no OS prompt. The badge shows no time, and the reopened field is empty.

**W10.** In iOS Settings, turn off notifications for Vara. Back in Vara, set the reminder to 3 minutes from now and save.
- **PASS:** **Notifications are off** appears.
- Tap **Open Settings**. **PASS:** Vara's page in iOS Settings opens.
- Return to Vara, reopen the routine and save without changing anything. **PASS:** no alert.
- Turn notifications for Vara back on.

**W11.** Set the reminder to 3 minutes from now, save, then delete the routine. Background the app.
- **PASS:** nothing fires.

**W12.** Create a new routine with a reminder 3 minutes from now.
- **PASS:** **Reminder set** appears.
- Sign out and background the app. **PASS:** nothing fires.

**W13.** Account switch. This needs a second Vara account. Signed in as account one, set a reminder 4 minutes from now. Sign out, sign in as account two, background the app.
- **PASS:** nothing fires.
- If no second account is available, record **NOT RUN** with that reason.

---

## Part 3 - Not walked, with reasons

- **Automated tests only.** These paths are not walked:
  - OS prompt denial;
  - a permission-request exception;
  - deactivation through a failed load;
  - account deletion.
  Deletion is destructive to Kyle's account, and a failed load cannot be induced on demand.
- **Cold start with no signed-in user:** automated tests only. That is a device signed out on an older build, which still holds routine reminders and starts with no auth transition (amendment `a0a2eb9`).
- **The daily rhythm:** owned by NOTIFICATION-PREFERENCES-MODEL.
- **Reduce Transparency and larger text sizes:** NOT RUN, deferred by Kyle 2026-09-29 until after the initial generally available release.

---

## Part 4 - Results

| Step | Result | Observed |
|---|---|---|
| W0 | NOT YET WALKED | |
| W1 | NOT YET WALKED | |
| W2 | NOT YET WALKED | |
| W3 | NOT YET WALKED | |
| W4 | NOT YET WALKED | |
| W5 | NOT YET WALKED | |
| W6 | NOT YET WALKED | |
| W7 | NOT YET WALKED | |
| W8 | NOT YET WALKED | |
| W9 | NOT YET WALKED | |
| W10 | NOT YET WALKED | |
| W11 | NOT YET WALKED | |
| W12 | NOT YET WALKED | |
| W13 | NOT YET WALKED | |
