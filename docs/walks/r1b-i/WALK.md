# R1b-i walk — Muted Sage Gray stops failing AA

**Slice:** `design/slice-r1b-i-helper-gray`
**Change under test:** `#6F7F77` → `#56655D`, all four palette declarations, plus 35 raw
literals pointed at the token.
**Written:** 2026-09-13, in the slice's docs commit, per the standing rule that a walked
slice commits its walk script.

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
