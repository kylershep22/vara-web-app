# R3a - Today on its environmental ground - device walk

**Row:** R3a, the immersive ground, the surface tier and the opacity token.
**Build:** branch `journey/r3a-immersive-ground`, `c04e5e0` (the ground) + `b4ae125` (the token and the surfaces) + the commit that carries this file (secondary text, Reduce Transparency).
**Device:** iPhone 14 Plus, dev client.
**Walker:** Kyle. **Status: WALKED, results recorded 2026-09-29 in Part 6. Zero FAILs. Increase Contrast ON (G1 to G4), E1, F1, F2, BAR2 and A3 NOT RUN; the Increase Contrast and Reduce Transparency deferrals are Kyle's ruling. Three items NOT WALKABLE IN THIS SETUP.**
**Time:** about 40 minutes. You need a journey account whose day is picked and not yet done, and whose week is open.

**Before-state captures.** Kyle's three before-state screenshots, taken at `1c2567d` (before any R3a code), go in this directory as immutable evidence. Nothing under `src/` changed between `1c2567d` and the start of this branch, so they are valid as the before state. **After-state evidence is added alongside them, never over them.**

---

## Part 1 - What you are testing, in plain terms

Today no longer has a watercolour band at the top. Instead, **one painting fills the whole screen behind everything**, and it stays still while the content scrolls over it. The art runs up behind the clock and the notch; the content stops at the notch line.

Every line of text now sits on a **soft white surface**, White at 72% opacity, so the painting shows faintly through it. The number was **measured against this exact painting, not chosen by eye**: it is the lowest opacity at which teal text stays readable over the darkest part of the art any text can scroll across.

**One line of text is deliberately left bare: the greeting.** Everything else has a surface. The Settings cog is an icon, not text, so it has no surface either; it was measured at 5.2:1 or better against the art where it sits.

**Secondary text (the date, the closed-week note, the look-back subtitle, the loading message) is now dark charcoal, not grey-green.** The grey-green could not reach readable contrast on the surface over the darkest art, and the ruling was to change the colour rather than make the surface more opaque.

**The cards themselves (today's card, the offer cards, the insight, routine and habit cards) are unchanged in this slice.** They are still solid white with their old corners. Reshaping them onto the painting is R3b.

**With Reduce Transparency on, every surface turns solid white.** That is new in this slice.

---

## Part 2 - Known before you start

- **The error banner's coral text is roughly 3:1 against its surface.** That is below the 4.5:1 floor, and **it was just as low on the old page**. It is a known pre-existing failure carried into this walk, not an R3a defect. Record what you see if the banner appears; do not fail R3a on it.
- **The darkest region any text can pass over is behind the floating bar.** In the painting's coordinates it is x 27pt, y 875pt; on the 14 Plus that is about **27pt from the left edge and 870pt down**, which is inside the bar's footprint (the bottom 94pt). Text only reaches it while scrolling under the bar. Step G2 covers both the spot itself and the lowest point just above the bar.
- **The migration screen is expected to look like onboarding**, on a plain pale ground with no painting. That is a recorded, temporary exception that expires at R5, not a defect.

---

## Part 3 - The walk

Report every step as **PASS**, **FAIL** or **NOT RUN**, with what you saw. A step that cannot be reached on this setup is **NOT WALKABLE IN THIS SETUP**, never "not run".

### B. No doubled artwork (18(b)) - Today first

1. Open Today and look at the top of the screen without scrolling.
   - **PASS:** one painting fills the whole screen. There is **no watercolour band** under the greeting, and no second image anywhere in view.
   - **FAIL:** any band, strip or second painting; or a hard edge where one image meets another.
2. Scroll down slowly to the bottom, then back up.
   - **PASS:** the painting stays still; only the content moves. At no scroll position do two images show at once.

### A. The screen runs one treatment (18(a))

1. Today, loaded: **PASS** if it is the immersive treatment throughout (painting behind, text on surfaces, the greeting bare). **FAIL** if any part of the screen shows the old flat pale page behind content.
2. **The loading state.** Force-quit the app and reopen it straight onto Today. Watch the first second.
   - **PASS:** the painting appears behind the loading spinner, and the "vara" wordmark and the loading message sit on a small white surface. There is **no full pale screen** before the painting.
   - **FAIL:** a full-screen pale flash before the art; or the loading text sitting bare on the painting.
   - The loading state may be too quick to see. If you cannot catch it, record **NOT RUN, too fast to observe**, not PASS.
3. **The migration screen.** This needs an account that has weekly history and no journey yet, opened for the first time since the journey model shipped.
   - **PASS:** the "your route" explanation appears on a plain pale ground, **with no painting**, exactly like onboarding. That is the recorded exception.
   - If no such account can be seeded, record **NOT RUN, no migrating account**.

### C. Safe areas at the top (18(c))

1. Look at the very top of Today at rest.
   - **PASS:** the painting runs up behind the clock, battery and notch. The clock and battery are readable over it. The greeting and the Guide pill start below the notch, fully clear of it.
   - **FAIL:** a pale strip behind the notch; or any content under the clock or notch.
2. Scroll up so the content moves toward the top.
   - **PASS:** content disappears at the notch line. **No text ever passes under the clock.** The painting stays visible behind the notch.
3. **Pull to refresh.** Pull down from the top and hold.
   - **PASS:** the refresh spinner is fully visible, below the notch, and readable over the painting.
   - **FAIL:** the spinner is hidden or clipped behind the notch or the clock.

### D. Bottom clearance (18(d))

1. Scroll Today fully to the bottom.
   - **PASS:** the last row ("Look back") sits fully above the floating bar, with a visible gap, and is tappable.
   - **FAIL:** any part of it trapped behind the bar.

### G. Text contrast against the actual painting (18(g))

**Do G1 to G4 twice: first with Increase Contrast OFF, then again with it ON** (Settings > Accessibility > Display & Text Size > Increase Contrast). The app does not change its own colours under Increase Contrast, so the two passes should look the same. Record whether they do.

1. **The greeting, the one bare line.** Read it at rest, then scroll so it moves up toward the notch.
   - **PASS:** comfortably readable at every position, including against the brightest and busiest part of the sky. (Measured at 4.5:1 or better over its whole region; this checks the measurement.)
   - This result is **provisional**: R3b will change the greeting to a larger display style and it must be re-checked then.
2. **The darkest spot.** Scroll slowly so a text surface (the close-week entry or the Look back row) moves down across the **bottom-left** of the screen, about 27pt from the left edge.
   - First, stop it at the **lowest point where its text is still fully above the floating bar**. **PASS** if the text on the surface is comfortably readable there.
   - Then keep it moving down **under the bar** at the bottom-left, around 870pt down. **Record** how the text reads through the bar at that spot. That is the measured darkest point. It is behind the bar at rest, so this is an observation rather than a pass or fail.
3. **Every surface.** Check each one reads clearly: the date line, the journey line ("where you are"), the close-week entry (open, and closed if you can close the week), the "good moment" row, the Look back row.
   - **PASS:** all readable, with the charcoal secondary text clearly legible.
4. **The Settings cog.** **PASS** if the cog stands out clearly against the painting behind it.

The @2x half of this assertion is **NOT WALKABLE IN THIS SETUP** (see Part 5).

### E. Reduce Motion (18(e))

Turn on Reduce Motion (Settings > Accessibility > Motion).

1. Open and use Today: pull to refresh, open the day's picker or the protocol sheet, open the Guide.
   - **PASS:** nothing on the touched surface animates in a way the standards forbid; the painting never moves, and sheets open without decorative motion.
   - Record anything that still moves.

### F. Reduce Transparency (18(f))

Turn on Reduce Transparency (Settings > Accessibility > Display & Text Size).

1. **With Today already open**, flip the setting and come back to the app **without closing it**.
   - **PASS:** every text surface on Today turns **solid white** (the painting no longer shows through them). The floating bar turns solid white with a thin hairline edge.
   - This also checks the change is picked up live. **FAIL** if the surfaces only change after the app is restarted.
2. Turn it off again. **PASS:** the surfaces go back to translucent.

### BAR. The floating bar over the painting (the A0b re-walk)

The bar was tuned against pale pages. Standards 12.2 says R3 re-checks it over artwork and may move the values back.

1. On Today, scroll so content passes under the bar, with Reduce Transparency OFF.
   - **PASS:** the bar reads as a distinct object floating over the painting. It does not look heavy, muddy or grey against the art, and its shadow is not the first thing you notice.
   - Record anything that suggests re-tuning the fill, the hairline or the shadow. **Do not treat that as a fail of R3a**; it is the re-walk's finding.
2. Repeat with Reduce Transparency ON. **PASS:** the solid white bar with its hairline, clearly separate from the painting.

### GUIDE. The Guide pill

This folds in the Guide pill migration walk, which merged without one.

1. **Today:** the pill is docked top-right, left of the Settings cog, over the painting. **PASS** if it is clearly visible, reads as a button, and opens the Guide as a bottom sheet (not a full screen). Close it.
2. **Focus hub** and **Energy hub** (from the Journey tab): **PASS** if the pill is present top-right on each and opens the Guide.
3. **Journey tab** and **Learn tab:** **PASS** if there is **no pill**. It is absent there by decision.
4. **In a session** (start any practice from Focus or Energy): **PASS** if there is no pill while the session runs.

### J. Two judgements for Kyle (not pass or fail)

1. **Does the surface treatment read as translucent over the painting, or as a solid card?** Describe it in a sentence. There is no right answer; it feeds R3b.
2. **Does the secondary text still read as secondary now that it is charcoal?** Look at the date line under the greeting and the Look back subtitle. Record whether the hierarchy still reads (greeting, then primary text, then secondary), or whether everything now reads at the same weight.

---

## Part 4 - Not in this walk

- **No habit-related screen**, anywhere. Habits are not an accessible part of the app and will not ship at launch. That includes the Plan hub's habits tab.
- **The cards' shape and styling.** Card corners, padding and shadow on the painting are R3b's.

---

## Part 5 - Not walkable in this setup

- **The SE half of the matrix.** No SE device or simulator; the toolchain is Windows.
- **The @2x half of 18(g).** The painting resolves differently at @2x, and only @3x can be walked here.
- **18(d) at 667pt**, the SE's height: bottom clearance fully scrolled on the shortest phone.

These are recorded known gaps, not passes.

---

## Part 6 - Results

*To be filled in at the walk. One line per step: the step number, PASS / FAIL / NOT RUN / NOT WALKABLE IN THIS SETUP, and what was seen. Increase Contrast OFF and ON recorded separately for G1 to G4.*

### Results, recorded 2026-09-29 as Kyle gave them

**Before-state evidence, taken at `1c2567d`:** `before-top.png` (top of Today), `before-mid.png` (mid-scroll) and `before-bottom.png` (bottom), in this directory.

**B. No doubled artwork (18(b))**
- **B1 PASS.**
- **B2 PASS.**

**A. One treatment (18(a))**
- **A1 PASS.**
- **A2 PASS.** The painting was present on the initial load screen, with the spinner and text on an off-white surface. No full pale screen.
- **A3 NOT RUN, no migrating account.** No seedable migrating account. Kyle's assessment is that no real user will have this experience.

**C. Safe areas at the top (18(c))**
- **C1 PASS.**
- **C2 PASS.**
- **C3 PASS.**

**D. Bottom clearance (18(d))**
- **D1 PASS.**

**G. Text contrast against the painting (18(g)), Increase Contrast OFF**
- **G1 PASS.** Provisional until R3b's `displayLg` greeting, as the step says.
- **G2, first half (lowest point fully above the bar): PASS.**
- **G2, second half (under the bar at the bottom-left): OBSERVATION.** Text passing under the nav bar is not readable. That is expected, and it is why this half is recorded as an observation rather than a pass.
- **G3 PASS.**
- **G4 PASS.**

**G. Increase Contrast ON**
- **G1 to G4 NOT RUN, deferred by Kyle's ruling.** His reason: these settings are not a launch-blocking concern at this stage. Recorded as a deferral, not as a failure and not as a pass.

**E. Reduce Motion (18(e))**
- **E1 NOT RUN.** As Kyle stated it; no reason given.

**F. Reduce Transparency (18(f))**
- **F1 NOT RUN, deferred by Kyle's ruling.**
- **F2 NOT RUN, deferred by Kyle's ruling.**
- His reason for both: these settings are not a launch-blocking concern at this stage. Recorded as deferrals, not as failures and not as passes. The Reduce Transparency branch is covered by tests only (`DashboardScreen.structure.test.tsx`, at mount and on a live toggle).

**BAR. The floating bar over the painting (A0b re-walk)**
- **BAR1 PASS.**
- **BAR2 NOT RUN.** It requires Reduce Transparency on, which falls under the F deferral.

**GUIDE. The Guide pill**
- **GUIDE 1 PASS.**
- **GUIDE 2 PASS.**
- **GUIDE 3 PASS.**
- **GUIDE 4 PASS.**

**Extra checks, beyond the script**
- **Journey and Learn show no painting: PASS.**
- **The Start here row on Journey: NOT OBSERVABLE, not passed.** It renders nothing there, because no path resolves to content.

**J. Kyle's judgements (not pass or fail)**
- **J1:** yes, the treatment reads as translucent.
- **J2:** yes, secondary text still reads as secondary.

**Not walkable in this setup (Part 5), recorded as gaps, not passes**
- The SE half of the matrix.
- The @2x half of 18(g).
- 18(d) at 667pt.
