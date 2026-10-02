# ROUTINE-REMINDER-OFFLINE-RESILIENCE - a scheduled routine reminder survives a return to Vara while offline - device walk

**Row:** ROUTINE-REMINDER-OFFLINE-RESILIENCE. A failed or timed-out routine refresh never makes the scheduled routine reminders less correct than they were before it began. Routine reminders are reconciled only after a successful server read, bounded at 10 seconds; on failure, timeout or no OS permission they are left as they are. Sign-out, account deletion and account switching still cancel the departing user's reminders.
**Build:** branch `journey/routine-reminder-offline-resilience`: `87a8e5b` (the before-state evidence, C1), `6dd5e12` (the code and tests, C2) and the docs commit that carries this line (C3). **Walk the C3 commit, the tip of the branch.** It runs the same code as C2. A commit cannot carry its own hash: `git rev-parse HEAD` on the branch gives it, and it is recorded in the hand-off. The other hashes are in the roadmap's §13 entry for this slice.
**Device:** iPhone 14 Plus, dev client, default Dynamic Type. No new dev-client build is needed: the change is JavaScript only.
**Walker:** Kyle. **Status: NOT YET WALKED.**

---

## Part 0 - Before-state evidence

Kyle's captures, taken on `main` at `f090e07`, and the code-level evidence, committed unchanged in `before/` as C1. **They are unchanging evidence. After-state evidence is added alongside them, never over them.**

- `01-routine-reminder-set.png`: Vara's Time screen, subtitle Routines you've built, with the status bar at 8:14, a Camera back-link at the top left, and the cellular and Wi-Fi icons visible. The Morning tab is selected (Evening, Sunday and Custom beside it). The routine card is titled The Essentials with a bell chip reading 8:17 PM, the Checklist mode selected, and four activities: Hydration 1 min, Stretching 3 min, Intention Setting 3 min, Breakfast 3 min. Below them: Add an activity, 10 min total, 4 activities, and the button Begin at your own pace.
- `02-lock-screen-offline-after-time.png`: the iPhone lock screen at 8:17, with the airplane-mode icon visible in the status bar and no Wi-Fi or cellular icon, and the line 48% Charged · 26m to 80%. **It shows one Vara notification**, marked now: title Your morning routine is ready, body The Essentials · 10 min.
- `03-regression-test-on-main.txt`: this slice's regression test run against unmodified production code at `f090e07`, failing: a routine reminder was pending, the app returned to the foreground, the routine read rejected, and afterwards the reminder was no longer pending (`Received has value: undefined`).

**What the images do and do not show.** Image 02 shows the routine reminder delivered at 8:17 with airplane mode on. The images do not show what was done between them: whether Vara was foregrounded while offline before 8:17, or whether airplane mode was turned on before or after a return to Vara. No statement from Kyle about this run accompanies the images. How a delivery is possible on `main` is set out in the roadmap's §13 entry for this slice. The failing regression test (03) is the code-level before evidence.

---

## Part 1 - Read first

**Conditions.** Kyle walks it on his iPhone 14 Plus at default Dynamic Type, between 8 AM and 9 PM with Focus off and notifications allowed for Vara.

**"Offline"** means airplane mode on and Wi-Fi off.

**"Leave and return"** means: go to the home screen, open Vara again, wait about 15 seconds, go back to the home screen.

**Do not force-quit Vara while offline;** the dev client needs a connection to reload.

**Notes for the walk.** None of these change a step or a pass condition.
- While Vara is open, a notification shows as an in-app toast, not a banner. Each firing step ends with the phone locked.
- The 15-second wait covers the routine read's 10-second bound.

---

## Part 2 - The walk

Report every step as **PASS**, **FAIL** or **NOT RUN**, with what you saw.

**W0.** Record the build hash, the iOS version, and that notifications are allowed for Vara.

**W1. Offline survival.** Online, set a routine reminder about 6 minutes ahead and save. Go to the home screen. Go offline. Leave and return, then lock.
- **PASS:** the routine reminder fires at the set time.

**W2. Recovery.** Reconnect. Open Vara and change the reminder to about 4 minutes ahead and save. Leave and return, then lock.
- **PASS:** exactly one reminder fires, at the new time.

**W3. Removed stays removed.** Online, set a reminder about 5 minutes ahead and save. Then edit the routine, tap Remove reminder and save. Go offline. Leave and return, then lock.
- **PASS:** nothing fires. Reconnect afterwards.

**W4. Sign-out while offline.** Online, set a reminder about 5 minutes ahead and save. Go offline. Sign out. Lock.
- **PASS:** nothing fires. Reconnect and sign back in afterwards.

**W5. Account switch, online.** As account one, set a reminder about 5 minutes ahead and save. Sign out. Sign in as the second test account. Leave and return, then lock.
- **PASS:** nothing fires. Sign back in as account one afterwards.

**W6. Permission off, then on.** Online, set a reminder about 6 minutes ahead and save. In iOS Settings turn notifications off for Vara. Open Vara, leave and return. In iOS Settings turn notifications back on for Vara, without opening Vara again. Lock.
- **PASS:** the reminder fires at the set time.

**W7. The daily rhythm offline.** Online, in Settings, Notifications, set the daily reminder about 4 minutes ahead. Go offline. Leave and return, then lock.
- **PASS:** the daily rhythm reminder fires. Reconnect afterwards.

**Not walked, with reasons:**
- A read that hangs past the timeout, a late completion, and an attempt superseded mid-reconcile: not inducible on demand. Automated tests only.
- Account deletion: destructive, and it cannot run offline. Automated tests only.
- An offline cold start: the dev client cannot load its bundle offline. Automated tests only.
- Reduce Transparency and larger text sizes: NOT RUN, deferred by Kyle 2026-09-29 until after the initial generally available release.

---

## Part 3 - Results

Not yet walked.

| Step | Result | What was seen |
|---|---|---|
| W0 | NOT YET WALKED | |
| W1 | NOT YET WALKED | |
| W2 | NOT YET WALKED | |
| W3 | NOT YET WALKED | |
| W4 | NOT YET WALKED | |
| W5 | NOT YET WALKED | |
| W6 | NOT YET WALKED | |
| W7 | NOT YET WALKED | |
