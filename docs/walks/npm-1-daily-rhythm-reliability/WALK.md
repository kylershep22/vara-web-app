# NPM-1 DAILY-RHYTHM-RELIABILITY - a new user's first daily reminder survives a leave-and-return - device walk

**Row:** NPM-1 DAILY-RHYTHM-RELIABILITY. The daily rhythm is decided by a reconcile that reads the user's preferences fresh, on sign-in, on every return to the app, and after the onboarding Reminder step, so a new user's first reminder is no longer cancelled by their first leave-and-return. V1's daily rhythm is local only and reads no remote flag. The notification copy says practice, never routine.
**Build:** branch `journey/npm-1-daily-rhythm-reliability`: `c63f951` (the before-state evidence, C1), `536b6ab` (the code and tests, C2) and the docs commit that carries this line (C3). **Walk the C3 commit, the tip of the branch.** It runs the same code as C2. A commit cannot carry its own hash: `git rev-parse HEAD` on the branch gives it, and it is recorded in the hand-off. The other hashes are in the roadmap's §13 entry for this slice.
**Device:** iPhone 14 Plus, dev client, default Dynamic Type. No new dev-client build is needed: the change is JavaScript only.
**Walker:** Kyle. **Status: WALKED AND ATTESTED by Kyle on 2026-10-01 at `71face5`, iPhone 14 Plus, default Dynamic Type. ALL STEPS PASS.**

---

## Part 0 - Before-state evidence

Kyle's captures, taken on `main` at `5277031`, and the code-level evidence, committed unchanged in `before/` as C1. **They are unchanging evidence. After-state evidence is added alongside them, never over them.**

- `01-onboarding-reminder-time.png`: the V3 onboarding Reminder step, with the status bar at 6:08. The title reads When should we check in?, the subtitle One nudge a day at a time you pick. It is an invitation, not an obligation, and you can turn it off anytime. The time picker shows 8:00 PM. Below it, the floor echo reads We will nudge you toward: Push ups, and the button reads Continue.
- `02-lock-screen-after-reminder-time.png`: the iPhone lock screen on Thu Oct 1 at 6:22, showing one Vara notification marked now: title Good evening, body Your evening routine is ready whenever you are.
- `03-regression-test-on-main.txt`: the NPM-1 first-day regression test run against unmodified production code at `5277031`, failing: after onboarding scheduled the reminder and the user left and returned, the reminder was no longer pending (`Received: undefined`).

**Kyle's statements, attributed to him:**
- He created a new test account and set the onboarding reminder for 6:20 PM.
- The time visible in the picker in screenshot 01 is not the time he finally selected.
- The reminder was delivered.
- The notification that fired said routine, although it is not related to a routine; it was the floor commitment from onboarding.
- He did not state whether he left and returned to the app before the reminder time, or whether the account was on a fresh reinstall.

**Under Kyle's ruling this result is corroborating evidence only:** a delivery means that run did not reproduce, and it does not by itself overturn the code-level finding or the failing regression test. How that reminder could have been delivered on `main` is set out in the roadmap's §13 entry.

---

## Part 1 - Read first

**Conditions.** Kyle walks it on his iPhone 14 Plus at default Dynamic Type, between 8 AM and 9 PM with Focus off.

**"Leave and return"** means: go to the home screen, open Vara again, go back to the home screen.

**Notes for the walk.** None of these change a step or a pass condition.
- While Vara is open, a notification shows as an in-app toast, not a banner. Each firing step ends with the phone locked.
- The Settings time picker is unchanged in this slice: it still saves on every scroll tick, and its Cancel does not undo (NPM-2 fixes it). Stop the wheel on the time you mean, then tap Done.
- The Settings Reminder Time row only appears once a daily reminder time exists. Onboarding sets one, so it is there for every account in this walk.
- Approved daily rhythm text, by the time of day of the reminder:
  - before 12:00: **Good morning** / **Your morning practice is ready when you are.**
  - 12:00 to 4:59 PM: **Your practice is ready** / **Your daily practice is ready when you are.**
  - 5:00 PM and later: **Good evening** / **Your evening practice is ready when you are.**

---

## Part 2 - The walk

Report every step as **PASS**, **FAIL** or **NOT RUN**, with what you saw.

**W0.** Record the build hash, the iOS version, and that the four scheduled jobs are still paused.

**W1. First day.** Delete Vara, reinstall the dev client, create a new account, verify, and complete onboarding. At the Reminder step set a time about 8 minutes ahead and Allow notifications. On Today, leave and return, then lock the phone.
- **PASS:** the reminder arrives at the set time, and its text is the approved body for that time of day with no use of the word routine.

**W2. Cold start and a changed time.** Same account. Force-quit Vara and reopen it. In Settings, Notifications, change the daily reminder time to about 4 minutes ahead. Leave and return, then lock.
- **PASS:** one reminder arrives at the new time, and nothing arrives at the old time.

**W3. General off, then on.** Same account.
- **a.** Set the time about 4 minutes ahead, turn General notifications off, leave and return, lock. **PASS:** nothing arrives.
- **b.** Set the time about 4 minutes ahead, turn General notifications on, leave and return, lock. **PASS:** the reminder arrives without force-quitting.

**W4. Sign-out.** Set the time about 4 minutes ahead, sign out, lock.
- **PASS:** nothing arrives.

**W5. Routine reminders still work.** Signed in, set a routine reminder about 3 minutes ahead, leave and return, lock.
- **PASS:** the routine reminder fires.

**W6. Permission denied, then granted.** Delete Vara, reinstall, create another new account. At the Reminder step set a time about 10 minutes ahead and choose Don't Allow. Finish onboarding. In iOS Settings allow notifications for Vara. Open Vara, then leave and return, and lock.
- **PASS:** the reminder arrives at the set time.

**Which steps need what.**
- **A reinstall and a new account:** W1 and W6. The reinstall resets iOS notification permission to not yet asked; the new account gives a brand-new preferences document and the V3 onboarding arc.
- **The same account, no reinstall:** W2 to W5 reuse W1's account.

**Not walked, with reasons:**
- A failed or offline preference read, overlapping reconciles, the onboarding write retry, and the same-uid guard: not inducible on demand. Automated tests only.
- Insights cancellation: no account with Insights notifications enabled is available. Automated tests only.
- Copy for times of day other than the one walked: automated tests.
- Community pushes: owned by NPM-3a.
- Reduce Transparency and larger text sizes: NOT RUN, deferred by Kyle 2026-09-29 until after the initial generally available release.

---

## Part 3 - Results

Walked and attested by Kyle on 2026-10-01, iPhone 14 Plus, default Dynamic Type.

| Step | Result | What was seen |
|---|---|---|
| W0 | Recorded | Build 71face5; iOS 26.3; the four scheduled jobs confirmed paused. |
| W1 | PASS | |
| W2 | PASS | |
| W3a | PASS | |
| W3b | PASS | |
| W4 | PASS | |
| W5 | PASS | |
| W6 | PASS | |
