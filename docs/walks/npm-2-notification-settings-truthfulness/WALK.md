# NPM-2 NOTIFICATION-SETTINGS-TRUTHFULNESS: device walk

Branch `journey/npm-2-notification-settings-truthfulness`. Kyle walks; results are recorded by Kyle
only. The before-state evidence is in `before/` beside this file.

## Conditions

iPhone 14 Plus, iOS 26.3, default Dynamic Type, between 8 AM and 9 PM, Focus off, dev client
running this branch. Every relaunch is online. A notification shows as an in-app toast while Vara is
open, so every firing step ends with the phone locked. A2 is the second test account. Air means
airplane mode with Wi-Fi off. The walk runs against the head of this branch after commit 7, not 3b97b0b.

## Console reference (from the code)

- **Preferences document:** `notificationPreferences/{uid}`, in the `notificationPreferences`
  collection, document ID = the account's Firebase Auth uid.
  - `allNotificationsEnabled`: boolean. This is General notifications.
  - `dailyRhythm.enabled`: boolean. Legacy; no longer decides anything on the phone.
  - `dailyRhythm.reminderTime`: a map `{ hour: number, minute: number }` (whole numbers, 24-hour
    local time, hour 0 to 23, minute 0 to 59), or null for no time.
  - `socialConnection.directMessages`, `socialConnection.connectionRequests`: boolean.
- **Push tokens:** `userPrivate/{uid}`.
  - `expoPushToken`: string, with `pushTokenUpdatedAt`: timestamp.
  - `fcmToken`: string, with `fcmTokenUpdatedAt`: timestamp (saved on sign-in when permission is
    already granted).

## Main account

**1. Settings.** Settings shows Device notifications with Allowed and no action. There is no Push
Notifications switch. Notification Preferences is present.
Watch the Device notifications row as each screen opens. If it appears with a noticeable jump, stop the walk and report it.

Result:

**2. Notifications layout.** Present: the Device notifications row, General notifications with its
subtitle, Daily reminder, the Community header, Direct messages, Connection requests. Absent: the
Daily Reminder switch, Community Activity, Insights, Milestones, Completion Sound, Quiet Hours.

Result:

**3. Picker.** Tap Daily reminder. The sheet opens at the stored time. Scroll, then Cancel: the time
is unchanged. Open again, set a time 2 to 3 minutes ahead, Done: the row shows it at once. Lock the
phone: the reminder fires at that time.

Result:

**4. Air, in session.** With Notifications open, turn on Air. Set the time 3 minutes ahead, Done: it
shows at once, and Saving... appears after about half a second and stays. Lock the phone: the
reminder fires while offline. Return: the new time and Saving... are still shown. Turn Air off:
Saving... clears and the console shows the new time (`dailyRhythm.reminderTime` on
`notificationPreferences/{main uid}`).

Result:

5. Air, General. Turn on Air. Set the time 2 to 3 minutes ahead, Done. Turn General off. Lock the phone until that time has passed: nothing fires. Then set the time 2 to 3 minutes ahead again and turn General on. Lock the phone: it fires. Turn Air off: the console shows General true and the new time.

Result:

**6. Restart.** Turn on Air. Set the time to T, at least 6 minutes ahead. Wait until Saving...
shows. Force-quit Vara. Turn Air off. Relaunch. Notifications shows T. The console shows T
(`dailyRhythm.reminderTime`). Lock the phone: the reminder fires at T.

Result:

**7. Stored enabled false.** Leave Vara in the background. In the console, on
`notificationPreferences/{main uid}`, set:
- `allNotificationsEnabled` (boolean) to true;
- `dailyRhythm.enabled` (boolean) to false;
- `dailyRhythm.reminderTime` (map) to `hour` (number) and `minute` (number) 3 minutes ahead, 24-hour
  local time.

Return to Vara without opening Settings, then lock the phone: the reminder fires.

Result:

**8. Permission denied.** Turn notifications off for the app in iOS Settings and return. The row
reads Off in your device settings with Open Settings, on both screens. General is unchanged. Tap the
row: iOS Settings opens. Turn notifications on and return: the row reads Allowed.

Result:

## Second account

**9. Setup.** In the console, on `notificationPreferences/{A2 uid}`, set:
- `allNotificationsEnabled` (boolean) to false;
- `dailyRhythm.reminderTime` to null (type null): the whole field cleared, not a map with empty parts.

Sign out of the main account and sign in as A2.

Result:

**10. Recovery.**
- Daily reminder shows Add a time with the normal subtitle.
- Tap it: the sheet opens at 8:00 PM. Cancel: still Add a time.
- Open again, set a time 2 to 3 minutes ahead, Done:
  - the row shows the time;
  - the subtitle reads "Turn on General notifications to get this reminder.";
  - General is still off.
- Lock the phone: nothing fires.
- Set the time 2 to 3 minutes ahead again and turn General on. Lock the phone: it fires.

Result:

**11. Failure alert, A2 only.**
- With Notifications open, delete the document `notificationPreferences/{A2 uid}` in the console.
- Toggle General: the alert reads "Couldn't save" / "Your change wasn't saved. Please try again." /
  OK. After OK, General shows its previous value.
- The screen keeps its values and does not crash.
- To restore: go back, then reopen Notifications. Its first load finds the document gone on the
  server and recreates the defaults: `allNotificationsEnabled` false, `dailyRhythm.enabled` true,
  `dailyRhythm.reminderTime` null. Confirm in the console that `notificationPreferences/{A2 uid}`
  exists again.

Result:

**12. Account switch.**
- Sign out of A2 and sign in to the main account.
- Turn on Air. Change the time to X and wait for Saving....
- Sign out while still offline. Turn Air off. Sign in as A2.
- **PASS:** A2 shows its own values, and A2's console document `notificationPreferences/{A2 uid}` is
  unchanged.
- Then sign out and sign in to the main account in the same session, and record what its time
  shows. Recorded as observed; either outcome is acceptable (Kyle's Decision 13).

Result:

Observed for the main account's time:

## Reinstall

**13. Not yet asked.**
- Delete the dev client, reinstall the latest iOS development build from the Builds page on
  expo.dev, start it and sign in to the main account.
- Settings shows Not allowed yet with Allow notifications.
- Tap it: the iOS prompt appears. Allow: the row reads Allowed.
- In the console, the main account's push token fields on `userPrivate/{main uid}` are updated
  (`expoPushToken`, `pushTokenUpdatedAt`).

Result:

**14. Journal.** Write and save a journal entry. The notification opt-in screen does not open.

Result:

## Not run, recorded with the reason

VoiceOver, larger Dynamic Type and Reduce Transparency are NOT RUN, deferred by Kyle on 2026-09-29
until after the first generally available release; automated label coverage is the evidence.

## Unverified on device, tests only

- The first-load unavailable state ("Couldn't load notification settings." with Try again).
- The offline cold start, owned by the standalone-build check (OFFLINE-COLD-START-DEVICE-CHECK).
- A replayed write rejected while Settings is closed.
- The journal persistence failure alert.
