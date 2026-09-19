# R1b-i walk — Muted Sage Gray stops failing AA

**Slice:** `design/slice-r1b-i-helper-gray`
**Change under test:** `#6F7F77` → `#56655D`, all four palette declarations, plus 35 raw
literals pointed at the token.
**Written:** 2026-09-13, in the slice's docs commit, per the standing rule that a walked
slice commits its walk script.

---

## RESULT — walked 2026-09-13 (Kyle)

**iPhone 14 Plus**, dev client, default Dynamic Type. One device, not both.

**It is not a matrix device.** §18(d)'s matrix is the iPhone SE (3rd gen) at 375 × 667 @2x and
the iPhone 16 Pro Max at 430 × 932 @3x. The 14 Plus is **428 × 926 @3x with a 47pt notch**.

- **Large end: effectively covered.** At 428pt it is within 2pt of the Pro Max, so the
  width-sensitive steps — 7, 10, 11, 12 — hold for that end of the matrix.
- **Small end: not covered at all.** The SE is 53pt narrower, 259pt shorter, and @2x. It is the
  binding case for horizontal layout and for bottom clearance scrolled fully down.
- **Only @3x was walked**, where §18(g) wants both scale factors because a raster asset resolves
  differently at each — which is what step 13 checks.
- **The top inset is the one place it is its own case, not a proxy:** 47pt sits between the SE's
  20pt and the Pro Max's 59pt, and it is why debt item (f) reproduced here.

**The SE half of the matrix is open and rolls forward to R2's walk.**

> **AMENDED 2026-09-14: IT IS NOT WALKABLE, NOT MERELY UNWALKED.** There is no SE device
> and no SE simulator in this setup (Windows; an iOS simulator needs a Mac). Every SE step
> in this script reads **"not walkable in this setup"** rather than "not run" - the second
> invites someone to go and run it, and the first says the gap needs a machine before it
> needs a walker. It did not roll forward to R2's walk and it did not close there;
> §18(d) now records the condition and the mitigation (beta and support feedback), and
> names what stays unverified at the small end.

**PASSED:** 1, 2, 3, 4 · 5 · 6 · 7 · 10 · 11 · 12 · 13 (Today and Energy) · 18 (chevrons and
menus).

**NOT RUN:** 8 · 9 (no pending request on the account) · 13 on the Focus hub · 14, 15, 16, 17
(the Step 0 static sweep cleared all *declared* grounds) · 19 (the slice adds no animation) ·
20 (a hex value does not change layout) · the second matrix device.

**Qualifications worth carrying:**

- **Step 11 passed but the distinction is weaker than before**, via hue and label. That is the
  risk the AMENDED block predicted. **The fallback token is NOT built** — the pass condition was
  distinguishability and it was met — and R2 fixes it structurally when it restyles the bar.
- **Step 13** also surfaced a teal eyebrow over the Today artwork. Pre-existing §4.5 item; R3
  removes the band from Today, so it resolves there.
- **Step 18** produced debt item (e): the People empty-state glyph reads heavy. Measured after
  the walk it is 64px, not 48.
- **Steps 19 and 14–17 have the weakest reasons.** §18(e) is explicit that Reduce Motion covers
  every animation on a touched surface, not only the ones a slice added; and 14–17 exist
  precisely to reach what a static sweep cannot (raster artwork, user imagery, call-site
  grounds). Not re-argued, not blocking, but **they roll forward to R2's walk** rather than
  counting as closed.

**Seven debt items logged**, none fixed here: (a) and (c) extend standards §17 rows; (b), (d),
(e), (f), (g) are `docs/DESIGN_BACKLOG.md` items 7–11.

**Step 18's subject became its own row.** DURATION-PRESETS, in §5 before R3.

---

## How to run this

Both matrix devices — **iPhone SE (3rd gen), 375 × 667 pt @2x** and **iPhone 16 Pro Max,
430 × 932 pt @3x** — at **default and 1.3× Dynamic Type**, unless a step says otherwise.

**Report every step by number: pass, fail, or not run, with what was observed.** A step
that could not be run is reported as not run, never as passed. "Looks fine" is not a
result for any step here.

Contrast figures below are computed, not guessed, and are stated so you do not have to
re-measure them. Measure only where a step tells you to.

| Ground | old `#6F7F77` | new `#56655D` |
|---|---|---|
| White | 4.22:1 fail | **6.15:1 pass** |
| Mist White | 4.03:1 fail | **5.88:1 pass** |
| Dew Sage | 3.16:1 fail | **4.61:1 pass** |
| `dewSageLight` over White | 3.67:1 fail | **5.34:1 pass** |
| Evergreen Teal | 1.79:1 fail | **1.23:1 worse** |

---

## SECTION A — R1b-i. Required for this slice's gate.

### 1. Helper text on White
**Where:** Today, any dashboard card subtitle (the 14pt line under a card title).
**Do:** Read it.
**Pass:** Legibly darker than before, and no string has gained enough weight to read as
body copy. Contrast is 6.15:1 by construction — this is a legibility and hierarchy check,
not a measurement.

### 2. Helper text on Mist White
**Where:** Settings page ground; Help & Support section captions.
**Do:** Read them.
**Pass:** As step 1. 5.88:1.

### 3. Helper text on a Dew Sage wash
**Where:** Focus hub card; Breathwork list rows; Sleep list rows; Plan.
**Do:** Read the meta row sitting on the sage ground.
**Pass:** As step 1. **4.61:1, the tightest of the four** — if anything here looks off,
this is the one worth measuring.

### 4. Helper text on `dewSageLight`
**Where:** icon containers, inactive pills, tag chips — Community filters, Select chips.
**Do:** Read the label inside the tinted pill.
**Pass:** 5.34:1. No pill label is lost against its own container.

### 5. FILL — `removeButton`
**Where:** Focus → a block → Edit → "Block it" sheet → Remove.
**Do:** Look at the filled button.
**Pass:** The fill is **visibly darker** than before and the White 16pt semibold label is
clean at 6.15:1. **It must still not read as an error or coral control** — destructive
actions are Charcoal-labelled and never coral (non-negotiables, 4.4).

### 6. FILL — `clearButton`
**Where:** Today → capture a task → Capture sheet → Clear.
**Do and pass:** As step 5.

### 7. BORDER — unchecked checkbox
**Where:** Focus → Focus Rhythms.
**Do:** Look at an unchecked box beside a checked one.
**Pass:** The 1.5px unchecked border is heavier but **still reads as empty**. FAIL if an
unchecked box now reads as selected or emphasised. A solid border gains about 46% contrast
in this change, more than text does, because a hairline is all edge.

### 8. BORDER — input outline
**Where:** Journey → remove-capture → Clarify.
**Do:** Look at the textarea outline, empty and focused.
**Pass:** Heavier, not boxy, and not error-like. The placeholder inside still reads as a
placeholder, not as entered text.

### 9. BORDER — pending outline
**Where:** Community → People → a person with a pending "Say hello".
**Do:** Compare pending against available.
**Pass:** The `opacity: 0.6` pending state still reads as pending and stays distinct from
the teal available state.

### 10. PLACEHOLDERS
**Where:** all 14 — Community search, Groups search, Conversations search, Comment modal,
Challenges search, People search, Breathwork search, Add Block, Capture Task, Clarify,
Onboarding V3 Why, Onboarding V3 Floor, Floor Commitment, Weekly Close.
**Do:** Tap into each. Look before typing.
**Pass:** In all 14 the placeholder is still distinguishable from entered text at a glance.
**This is the category most at risk from darkening** — a placeholder that reads as a filled
field is a worse defect than the contrast it fixes.

### 11. Active vs inactive tab
**Do:** At a glance, without reading labels, on both devices.
**Pass:** The active and inactive tabs are distinguishable.
**FAIL if not distinguishable.**
**Fallback if fail:** the inactive icon tint gets its own token at `#6F7F77` (which passes
the 3:1 non-text floor); labels stay on `#56655D`; recorded as a new row for R2.

> **CLOSED 2026-09-14 AT R2's WALK, STEP A10b. THE FALLBACK WAS NEVER BUILT AND WILL NOT
> BE.** This step passed here on hue and label, and the pass was recorded as weaker than
> before - which is why the fallback was held. R2 restyled the bar and made active and
> inactive differ by **glyph** (filled vs outline) rather than by tint alone, and A10b
> re-ran this same judgement **in Grayscale, with hue removed entirely**: still
> distinguishable, by shape. A separate inactive-icon tint is no longer the fix for a
> problem that no longer depends on tint.

> Context for the walker: the tab bar reads `Colors.textSecondary`, which moved with the
> other three declarations in this slice, so the inactive state **did** darken. The risk is
> that it darkened toward the active teal.

### 12. Two-grey check
**Where:** the 17 files that previously held two spellings of the colour. At minimum:
Community tab root, Settings, Conversations, Plan, Journey → Phase path, Today →
Welcome-back card.
**Pass:** **No two greys are visible on any of the 17.** Option B makes this a positive
check: all four declarations moved together, so any two-grey sighting is a miss and must be
named with its screen.

### 13. DARK GROUND — hero band art
**Where:** Today, Focus hub, Energy hub.
**Do:** Scroll to top. Look at the band's **lower seam**, where the mist scrim thins and
the raster artwork shows through.
**Pass:** **No grey string sits over the artwork.** If one does, measure it at the darkest
pixel it covers and report the number. Pass is "none present", or "present and ≥4.5:1
measured".
**Why this is a walk step and not a grep:** the band is a raster asset. Its luminance is
arbitrary and no static analysis can pair text with it.

### 14. DARK GROUND — teal nav headers
**Where:** every Community stack screen (Feed, Groups, Group Detail, Challenges, Challenge
Detail, People, User Profile, Conversations, Chat), plus Profile and Settings.
**Do:** Look at the teal header bar.
**Pass:** "none present" — no grey text in the header.

### 15. DARK GROUND — teal cards and chips
**Where:** Community orientation card (Community first-run); Onboarding → Values with a
card selected; Group → invite → permission picker, selected; any 4-3-2-1 modal; the Focus
Window modal.
**Do:** Look inside each teal region.
**Pass:** "none present".
**Why it is still a step:** static analysis says all five are clear. This step exists to
catch what grep cannot see, and **a finding here is a new row, not a fix inside R1b-i.**

### 16. DARK GROUND — black backdrop
**Where:** Conversations → open any sheet.
**Do:** Look at the dimmed area behind the sheet.
**Pass:** "none present" — no grey text over the 0.3 black.

### 17. DARK GROUND — user imagery
**Where:** Community → a post with a photo; a group with a cover image; a user profile with
an avatar.
**Do:** Look for any grey caption sitting over imagery.
**Pass:** "none present", or measured.

### 18. DARK GROUND — the known one, `DurationPresets`
**Where:** Focus → Pomodoro → start a timer, then look at the duration row.
**Do:** Read the **selected** duration chip while the timer is running.
**Pass:** REPORT ONLY. **This one is already known to fail and is not R1b-i's to fix.**
`presetTextDisabled` is applied after `presetTextSelected`, so the selected chip renders
grey on the teal fill at `opacity: 0.5`: **1.28:1 before this slice, 1.11:1 after.** Confirm
it on device and say how bad it looks; it is booked as its own row.

### 19. ICON WEIGHT
**Where:** Focus hub and Energy hub chevrons; Community dots-menus; Conversations
empty-state 48px glyph.
**Do:** Look at the icons.
**Pass:** Darker, but no icon has gained enough weight to compete with the screen's teal
primary action. One primary action per screen still reads.

### 20. §18(e) REDUCE MOTION
**Do:** Settings → Accessibility → Reduce Motion ON. Re-run steps 1, 5, 6, 13.
**Pass:** Nothing moves that 9.4 says should not — **including animation this slice did not
add.** 26 animated files ship without the hook, and a slice that restyles a screen inherits
whatever already moves on it.

### 1.3× Dynamic Type
Re-run steps 1–4, 7, 8, 10 at xxxLarge.
**Pass:** No clipping, and no grey string that was legible at default becomes illegible or
truncated.

---

## SECTION B — R1a's outstanding steps

**Optional for R1b-i's gate. REQUIRED before R2.**

R1a merged at `4ddabc5` with its §18 walk unrun; Kyle's attestation records steps 1–14 as
outstanding. The script is **`docs/walks/r1a/WALK.md`**, verbatim from the R1a build report.

Step 10 there cannot be run until the six pre-change screenshots exist; see
`docs/walks/r1a/README.md`. Report it as not run until they do.

**Amended 2026-09-19.** Two clauses above are spent. "REQUIRED before R2" became required
before R3 when R2 merged at `2467f6b` on 2026-09-14. "The six pre-change screenshots" is
three: the walk is scoped large end only, the 14 Plus stands in for the 16 Pro Max per
standards §18(d), and the three SE captures are a standing gap. Section B is owned by board
row `R1A-SECTION-B-WALK`.
