# R1a walk — the text primitive, and Inter renders for the first time

**Slice:** `design/slice-r1a-text-primitive`, merged `4ddabc5`, 2026-09-13.
**Status: OUTSTANDING.** Kyle's attestation at the merge records steps 1–14 as not run.
The merge went ahead on a visual check of the `DevTypography` diagnostic on a physical
device via dev client: primitive rows rendered a different typeface from the System rows,
all four weights distinct. That covers part of step 1 and nothing else.

**Fourteen steps, both matrix devices — iPhone SE (3rd gen) and iPhone 16 Pro Max — at
default and 1.3× Dynamic Type.**

**AMENDED 2026-09-19 (Kyle's ruling). SCOPE IS LARGE END ONLY.** The requirement above is
unedited and is what this walk was written to; this block is what it now means. The walk runs
on an iPhone 14 Plus at default and 1.3x Dynamic Type, standing in for the iPhone 16 Pro Max
per standards §18(d). The SE half of all fourteen steps is a standing gap and is reported
**NOT WALKABLE IN THIS SETUP**, never **NOT RUN**. The header's both-devices requirement was
unsatisfiable on any device present, which is why this walk has been deferred four times
rather than run. Step 10's substitution is conservative rather than equivalent: it turns on
viewport height, 926pt against 932pt, so a pass on the 14 Plus implies a pass on the taller
device. Tracked by board row `R1A-SECTION-B-WALK`. This file is the canonical copy of the
fourteen; the duplicate at `docs/walks/r2/WALK.md:512` does not receive amendments.

**Required before R2.** Optional for R1b-i's gate.

**AMENDED 2026-09-19.** R2 merged at `2467f6b` on 2026-09-14, so "required before R2" is
spent. This walk is now required before R3, per R3's gate (b), and is owned by row
`R1A-SECTION-B-WALK`.

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

**Step 14, amended 2026-09-19 (Kyle's ruling). CLAUSE 3 COMES OFF THE DEVICE WALK. CLAUSES 1
AND 2 ARE UNCHANGED AND STILL OWED ON A 14 PLUS.**

**CLAUSES 1 AND 2 STILL REQUIRE A DEVICE.** No fixed-height container clips and no button
truncates at the 1.3x ceiling. What a container does when its text grows is a run-time fact
and no arithmetic substitutes for it. Walked at 1.3x on the iPhone 14 Plus, standing in for
the 16 Pro Max per §18(d); the SE half is a standing gap.

**CLAUSE 3 IS RESOLVED BY DESK CHECK, 2026-09-19.** Not walked, and not reported NOT RUN.
Measured, not estimated. Advance widths were read directly from the shipped
`mobile/assets/fonts/Inter_18pt-*.ttf` (`head` unitsPerEm 2048, `hmtx` advances, format-4
`cmap`), then a greedy word-wrap was run over 8,558 characters of shipped Vara body copy drawn
from `journeyCopy.ts`, `brainInsightsCopy.ts`, `journey.ts`, `lapseEducation.ts` and
`weekInsightTemplates.ts`. Mean advance over that corpus: Inter Regular **0.46485 em**, Inter
Medium **0.47068 em**.

**THE RESULT AT 375pt, 1.3x, FULL-BLEED**, with 343pt available after §6.2's 16pt padding on
both sides. `body` **31.4** characters per line, max 38. `bodySmall` **36.7**, max 45.
`caption` **42.7**, or **44.2** as a ceiling once its +0.5pt tracking is counted. Inside a
standard card every figure drops by 4 to 6.

**THE FINDING IS DEVICE-INDEPENDENT AND THAT IS THE PART WORTH KEEPING.** At the 14 Plus's
396pt available the same measurement gives `body` 41.0 characters; at the 16 Pro Max's 398pt
it gives 41.2. The clause resolves identically at 375, 428 and 430pt. It was never the
small-end-binding check §18.1 describes it as, and it could not have been walked into a
different answer on any device.

**NO STYLE IN THE SCALE REACHES 65 CHARACTERS ON ANY SHIPPED DEVICE.** Reaching 65 in 343pt
would need a rendered size of about 11.35pt, below every entry in §5.2.

**THE RULE AMBIGUITY THIS EXPOSED IS RESOLVED IN THE STANDARDS, NOT HERE.** §5.4's line-length
rule read as a target band was unachievable everywhere; read as a ceiling it holds with room.
Kyle ruled it a CEILING on 2026-09-19 and §5.4:361 is corrected in the same commit as this
block. Against the ceiling reading, clause 3 **PASSES**: every style clears the 75-character
limit by at least 30 characters.

**RESIDUALS, NAMED RATHER THAN IMPLIED.** Kerning (GPOS), CoreText sub-pixel positioning and
hinting are not modelled, all in the direction of marginally more characters per line, on the
order of a percent. `letterSpacing` is 0 for `body`, `bodySmall`, `button` and `h3`;
`caption`'s +0.5pt is applied above. The nearest margin is 30 characters, so no residual moves
the verdict.

---

## Notes carried from the R1a row and its build entry

- **Step 1 replaced a glyph tell.** An earlier draft asked the walker to identify Inter by
  the foot serif on the digit 1. That was cut: a step a walker can answer wrong with
  confidence is worse than no step. The `__DEV__` side-by-side diagnostic replaces it.
- **Step 10 is BLOCKED and must be reported as not run** until the six pre-change
  screenshots from `0091ce5` exist. See `README.md` in this directory for the exact list.
  `git checkout 0091ce5` still reproduces the before state, so nothing is lost by capturing
  them late.

  **AMENDED 2026-09-19. Three, not six.** Under the large-end-only ruling the three 16 Pro Max
  captures become three 14 Plus captures and the three SE captures are a standing gap. Step 10
  remains BLOCKED until the three exist; the SE half of the comparison is not blocked, it is
  absent. See `README.md` in this directory for the current list and filenames.
- **Steps 4 and 11 are the highest-risk unwalked steps**, per the R1 AMENDED block: Paper
  text was a third text surface the R1a row did not name, and the paywall carries the
  `Typography.fontWeight.normal` fix.
- **Step 14 gates the app-wide Dynamic Type cap.** R1a applied `Typography.maxFontScale` to
  every `Text` in the app, where before it was set at 17 journey and weekly sites. A screen
  that used to clip only above 1.3× will now clip **at** 1.3×.
- **Android is out of this matrix and is not covered by any step here.** R1a's synthetic-bold
  guard is asserted by unit tests with `Platform.OS` mocked and is walked on no device. It
  belongs to the `ANDROID` pre-launch row.

## WALK RESULT — 2026-09-19, PARTIAL

**Walked by Kyle on an iPhone 14 Plus, dev client, at default and 1.3x Dynamic Type. This walk
is PARTIAL and the marker says so. Three steps were not run and three named surfaces no longer
exist.**

**WHAT WAS WALKED AND PASSED AT 1.3x.** Step 4 on `LoginScreen`: button label, typed input
text, placeholder and helper text all render Inter. Step 11, both paywall price rows: the price
renders Bold and the `/month` and `/year` suffixes render Regular, visibly distinct. This is the
first time either surface has been seen rendered under the text primitive. Step 8's clipping
check across the reachable screens, step 9's tightest-ratio containers on the surfaces that
still exist, and step 14 clauses 1 and 2: no fixed-height container clipped, no button
truncated.

**ONE APPARENT CLIP WAS CHECKED AND IS NOT ONE.** A paywall capture showed the top of the
heading sliced. Confirmed by Kyle on device as the header passing under the status bar
mid-scroll; the heading is intact at rest. Recorded because step 8's subject is exactly this and
a reader of the captures would otherwise carry the question.

**WHAT WAS EXERCISED AT DEFAULT TYPE, NOT STEP BY STEP.** Today, Journey, Focus, Energy, Time,
Journal and Regulate were opened and read in an earlier sitting the same day. No typography
defect was visible. This informally covers steps 2, 5, 6 and 12; it is recorded as exercised
rather than walked, because the steps were not run individually against their pass conditions.

**THREE STEPS NOT RUN.** Step 1, the `DevTypography` diagnostic. Step 3, cold start and the
system-font flash. Step 13, Reduce Motion. None was attempted; they are **NOT RUN** rather than
not walkable, and a 14 Plus can run all three.

**THREE SUBJECTS ARE MOOT, NOT SKIPPED.** Habits are no longer an accessible part of the app and
will not ship at launch (Kyle, 2026-09-19). That retires `HabitDetailScreen` from step 4 and
from step 8's five-screen list, and `WeeklyHabitGrid` from step 9's six tightest ratios. These
are not gaps in the walk; the surfaces are going away. Step 9 was therefore walked against five
containers, not six.

**THE SE HALF OF ALL FOURTEEN: NOT WALKABLE IN THIS SETUP,** per standards §18(d). Not NOT RUN.

**STEP 14 CLAUSE 3: RESOLVED BY DESK CHECK, 2026-09-19.** Neither walked nor outstanding. See
the step-14 block above.

**ATTESTED BY KYLE, 2026-09-19.** The date is observed, not inherited.
