# R1a walk — the text primitive, and Inter renders for the first time

**Slice:** `design/slice-r1a-text-primitive`, merged `4ddabc5`, 2026-09-13.
**Status: OUTSTANDING.** Kyle's attestation at the merge records steps 1–14 as not run.
The merge went ahead on a visual check of the `DevTypography` diagnostic on a physical
device via dev client: primitive rows rendered a different typeface from the System rows,
all four weights distinct. That covers part of step 1 and nothing else.

**Fourteen steps, both matrix devices — iPhone SE (3rd gen) and iPhone 16 Pro Max — at
default and 1.3× Dynamic Type.**

**Required before R2.** Optional for R1b-i's gate.

---

## Why this file exists

The script below was handed over in the R1a build report on 2026-09-12 and was never
written into the repo. The roadmap referenced it only by step number — 4, 10, 11 and 14 are
named in prose, the other ten were nowhere. R1b-i's Step 0 went looking for it in the R1a
row, the R1 AMENDED block, the §13 entries, §18 of the standards and every commit message
on every branch, and could only reconstruct it.

**The fourteen below are the verbatim original**, supplied by Kyle at R1b-i's build prompt
and committed here so the next reader does not have to reconstruct anything. This file
supersedes that reconstruction.

**This is also why the standing rule now exists:** every walked slice commits its walk
script to `docs/walks/<slice>/WALK.md` in its docs commit.

---

## The fourteen steps, verbatim (from the R1a build report, 2026-09-12)

1. Settings → Developer → Dev: Typography. Pass: primitive rows and
   System rows visibly differ at 16 and 48pt; four weights distinct;
   all four font keys resolved; fontError null.

2. Any 16pt body string on Today matches the primitive rows.

3. Cold start: no flash of system-font text; splash hands off ~1s.

4. Paper text: LoginScreen (Button + Input), HabitDetailScreen.
   Button label, input text, placeholder, helper text in Inter.

5. TextInput three shapes: Focus/CaptureTaskSheet, ChatScreen
   multiline, components/Input. Typed text and placeholder Inter.

6. Nested A and B: SignupScreen terms row (A); HabitCategorySelect
   required marker and ProgressUpdateModal suffix (B). A: child
   heavier than parent. B: child matches parent, not gone light.

7. Shape C: ConsolidatedMetricsCard trend tile, 700 and 600 both
   render, distinguishable.

8. Clipping: PlanRecommendation, HabitDetailScreen, SleepScreen,
   ForgotPasswordScreen, EmailVerificationScreen. No clipped
   descender or ascender at either size.

9. Six tightest ratios: HeroSummaryCard:195, WelcomeBackCard:229,
   QuickNavButton:87, PlanRecommendation:537,
   GroupDetailHeader:419, WeeklyHabitGrid:393. Each uncut at 1.3x.

10. Hub rhythm vs pre-change screenshots (0091ce5): PillarFocus,
    PillarEnergy, Today. No card pushed below the fold; no tab label
    wraps; band seam unchanged; Today ≤ 3 cards above the fold.

11. Paywall, both price rows: /month suffix Regular against Bold.

12. Animated.Text: FloatingLabelInput, AnimatedCheckbox,
    StandardSheet. Inter, still animating.

13. Reduce Motion per §18(e) on every surface above, including
    motion R1a did not add.

14. 1.3x ceiling: no fixed-height container clips, no button
    truncates, 65-75 character line length holds at 375pt.

---

## Notes carried from the R1a row and its build entry

- **Step 1 replaced a glyph tell.** An earlier draft asked the walker to identify Inter by
  the foot serif on the digit 1. That was cut: a step a walker can answer wrong with
  confidence is worse than no step. The `__DEV__` side-by-side diagnostic replaces it.
- **Step 10 is BLOCKED and must be reported as not run** until the six pre-change
  screenshots from `0091ce5` exist. See `README.md` in this directory for the exact list.
  `git checkout 0091ce5` still reproduces the before state, so nothing is lost by capturing
  them late.
- **Steps 4 and 11 are the highest-risk unwalked steps**, per the R1 AMENDED block: Paper
  text was a third text surface the R1a row did not name, and the paywall carries the
  `Typography.fontWeight.normal` fix.
- **Step 14 gates the app-wide Dynamic Type cap.** R1a applied `Typography.maxFontScale` to
  every `Text` in the app, where before it was set at 17 journey and weekly sites. A screen
  that used to clip only above 1.3× will now clip **at** 1.3×.
- **Android is out of this matrix and is not covered by any step here.** R1a's synthetic-bold
  guard is asserted by unit tests with `Platform.OS` mocked and is walked on no device. It
  belongs to the `ANDROID` pre-launch row.
