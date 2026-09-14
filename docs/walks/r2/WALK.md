# R2 walk — the bar floats, and sixteen routes have to clear it

**Change under test:** the tab bar becomes an absolutely positioned capsule with
`expo-blur` on iOS; the four glyphs switch filled/outline on focus; the labels render
through the shared text primitive; the sixteen tab-bar-visible route slots take their
bottom inset from `useTabBarInset()`; `Chat` hides the bar.

**Branch:** `design/slice-r2-floating-nav`. Walk the committed branch, not the working
tree.

**Report every step by number: PASS, FAIL, or NOT RUN, with what was observed.** A step
that could not be run is reported as not run, **never as passed**. "Looks fine" is not a
result.

---

## THIS IS NOT A ONE-SITTING WALK, AND THE PLAN SHOULD NOT PRETEND IT IS

| Section | What | Estimate |
|---|---|---|
| **Pre-work** | Six `0091ce5` screenshots; stand up the SE simulator; confirm the BlurView links | **45–60 min** |
| **A** | R2's own gate: §18 (a)–(h), 2 devices × 2 type sizes, 16 routes scrolled fully down, Reduce Transparency, Reduce Motion, the glance test, Chat with the keyboard up | **3.5–4.5 hrs** |
| **B** | R1a's fourteen steps, still not run, 2 devices | **2.5–3.5 hrs** |
| **C** | R1b-i's SE remainder and R1d's five screens | **45–75 min** |
| | **Total** | **~8–10 hours, across at least three sittings** |

**Section A is this slice's gate.** It is what R2 merges on.

**Section B is required before R3** and is a different slice's debt. It can be run on a
different day against the same build, and splitting it off is the honest way to make
this tractable rather than a way of deferring it.

**Section C is opportunistic.** Take it if the SE simulator is already standing.

---

## DEVICES

- **iPhone SE (3rd gen), 375 × 667 pt @2x** — SIMULATOR. `insets.bottom` is **0**. This
  is the binding case for almost everything in Section A.
- **iPhone 14 Plus, 428 × 926 pt @3x, 47pt notch** — PHYSICAL. `insets.bottom` is **34**.
  Covers the large end of §18(d)'s matrix (within 2pt of the 16 Pro Max) but **is not a
  matrix device**, and its notch proxies neither entry.

Every step at **default and 1.3× Dynamic Type** unless it says otherwise. Record which
device and which type size produced each result.

---

# SECTION A — R2's own walk. THE GATE.

### A0. The BlurView actually links — **DO THIS FIRST**

**Do:** Open any tab on the 14 Plus with Reduce Transparency OFF. Look at the bar.

**Pass:** the bar renders as a capsule with *something* behind it — see A0b for what
"something" means here.

**FAIL if:** the capsule is fully transparent with content showing through unblurred and
untinted. **A mislinked `BlurView` renders as an empty `View` and throws nothing**, so
this failure is silent and would be misread as "the blur is subtle". `expo-blur` has been
a dependency since `c1d7ebb` (2026-04-19) and is autolinked from `package.json`, so it
should already be in the dev client — but it has never been imported until this slice, so
this is the first time anything would notice.

### A0b. The capsule reads as an object, without reading as dramatic glass

**Do:** Compare the bar against the Mist White ground on Today, Journey and Learn.
**Scroll content under it** — a static screenshot is not the test; the failure mode this
step exists to catch only shows while things move behind the bar.

**Pass:** the bar reads as a slightly warm, **separated** capsule with a visible edge.
**It should NOT read as dramatic frosted glass** — a light-tint blur over `#FAFAF6` is
never going to be theatrical, and it should not be.

**FAIL if** the capsule dissolves into the page while scrolling, or if its fill is
indistinguishable from a card.

> **RUN ONCE AND FAILED — 2026-09-14, iPhone 14 Plus (Kyle). Tuned; re-walk against the
> values below.**
>
> The blur **linked and was working**: content was visibly blurred behind the capsule at
> its bottom edge, which is what A0 establishes and it passed. But the bar **read flat**.
> `Colors.tabBarTranslucent` at **0.55** over a Mist White ground is very nearly that
> ground, and is the same value as the cards, so the capsule had no separation and
> dissolved into the page when scrolling. **The fill was doing the work the blur is for.**
>
> **Two changes, one commit:** fill **0.55 → 0.35**, and the translucent capsule **gains
> the `divider` hairline the Reduce Transparency fallback already had** — both states now
> carry it, because a lower-alpha fill needs an edge more than a high-alpha one does.
>
> **`BlurTokens.tabBarIntensity` stays at 40, and the next lever is the SHADOW, not the
> intensity.** Blurring a near-white ground returns near-white. Raising the intensity is
> the wrong knob for a separation problem and will look like it did nothing.

**Also record, for R3:** what the bar looks like over today's Mist White grounds is the
*before* for the row that puts environmental artwork underneath it. The blur has little
to blur until then.

### A1. The `getTabBarHeight` finding, confirmed on hardware — **STEP 1 PER THE ROW**

Run this **against `main` at `831827e`** (before this branch), not against the branch.

**Do:** On the **14 Plus**, open Today. Look at the bottom of the tab bar: where do the
labels sit relative to the bottom edge of the screen and the home indicator?

**Pass:** the labels sit roughly **5pt from the screen edge, inside the home-indicator
region** — a 62pt bar with 5pt below the labels, not 62 + 34.

**FAIL if** there is a ~34pt gap below the labels. That would mean §2's reading of
`@react-navigation/bottom-tabs@7.9.0` is wrong and the capsule's geometry needs
re-deriving before anything else in this walk means much.

**On the SE this step proves nothing** — `insets.bottom` is 0, so both readings predict
the same picture. Run it for completeness and record it as **non-discriminating**.

### A2. §18(a) Surface type — four tab roots

**Do:** Today, Journey, Learn, `CommunityMain`.

**Pass:** each matches §2.8's table — Today IMMERSIVE (Mist White today; the artwork is
R3's), Journey and Learn ATMOSPHERIC, `CommunityMain` FOCUS — and no element of another
treatment is present.

**The bar is chrome and is not a surface treatment.** Record that explicitly, so a later
reader does not conclude that glass made anything IMMERSIVE.

### A3. §18(b) No doubled artwork — Today first and specifically

**Pass:** one kind of art on screen.

R2 adds none. **This is the pre-R3 baseline reading**, and recording it now is what makes
R3's check a comparison rather than an opinion.

### A4. §18(c) Safe areas — all four edges, both devices

**Pass:** nothing clipped, overlapped or unreachable at any edge.

The bottom edge is the one R2 moves. **On the SE, `insets.bottom` is 0 and
`Layout.tabBar.minBottomOffset` (12) is the only thing holding the capsule off the screen
edge — this is the binding case for that token.** If 12 reads mean, say so with a number.

### A5. §18(d) Floating bar clearance — **SIXTEEN SUB-STEPS**

**Do:** each route below, **scrolled fully to the bottom**, on **both devices**, at
**both type sizes**.

**Pass, per route:** the last item is fully visible and fully tappable, clear of the
capsule.

Run in this order — worst first, so a systemic failure surfaces in the first three rather
than the last three:

| # | Route | What it had before R2 |
|---|---|---|
| 1 | `UserProfile` | **nothing at all** — no padding, no bottom edge, no margin |
| 2 | `ChallengeDetail` | no `contentContainerStyle`; relied on which child was last |
| 3 | `Chat` | see A11 — the bar is hidden here |
| 4 | `PillarPractices` (journey map) | 32 |
| 5 | `PillarLearn` | 32 |
| 6 | `CommunityMain` | 32 |
| 7 | `People` | 32 |
| 8 | `Conversations` | list had `flexGrow` only — **and check the FAB, A5b** |
| 9 | `ReportReason` | uniform 24 |
| 10 | `GroupDetail` | 32 **plus** a second inset from `SafeAreaView` — check it is not now doubled or halved |
| 11 | `ReportDetail` | a raw `34` — **and check the sticky action block** |
| 12 | `Home` (Today) | 48; the only one that already satisfied §6.2 |
| 13 | `Groups` | 64 — **two lists**, search results and groups; check both |
| 14 | `Challenges` | 64 |
| 15 | `ReportConfirmation` | no scroll — **occlusion check only**, see below |
| 16 | `Community` | the navigator; nothing to check |

**All sixteen, or §6.2's retirement is unverified.** A route not reached is reported NOT
RUN with the reason.

**`ReportConfirmation` is deliberately different:** it has no scroll region and takes no
inset, by decision recorded in the file. The check is that its centred content and its
button are **not occluded** by the capsule — occlusion by eye, not clearance by padding.

### A5b. The two bottom-anchored controls

**`Conversations` FAB.** *Pass:* fully visible and tappable, clear of the capsule, on
both devices. It sat at `bottom: 24` before R2 and would have been **wholly behind** the
bar on the 14 Plus. It is the only real collision in the sixteen.

**`ReportDetail` sticky actions.** *Pass:* the submit button clears the capsule. It
hardcoded `34` before R2 — right on a 14 Plus, wrong on the SE. **The SE is the
discriminating device here.**

### A6. §18(e) Reduce Motion

**Do:** On. Every animation on every touched surface — **not only what R2 added**; a
slice that restyles a screen inherits whatever already moves on it, and 26 animated files
ship without the hook (§17).

**Pass:** tab switch is an instant content swap, no transition (§12.2). Nothing on the
bar moves.

**FAIL if** the bar slides, fades or animates in any way on a tab switch or on entering
or leaving `Chat`.

### A7. §18(f) Reduce Transparency — **NEVER WALKED ONCE SINCE v2.0**

Two halves, and they fail independently. **Run both.**

**A7a — toggled while foregrounded.** Turn Reduce Transparency ON with the app open and
on a tab root. *Pass:* the bar becomes the opaque fallback **without needing a restart**.
This is the `reduceTransparencyChanged` listener.

**A7b — cold start with it already on.** Kill the app, launch it. *Pass:* the bar is
opaque from the first frame it is legible. This is the initial `isReduceTransparency-
Enabled()` read.

**Pass condition for the fallback itself (both halves):** White fill, with a **`divider`
hairline all the way around the capsule** — not top-only, not a degraded accident, not a
transparent bar. **Record whether a full hairline on a 30pt radius reads right**; §12.2
now specifies it and R2's Step 0 flagged the geometry as an open question.

**Since A0b, the hairline is in BOTH states**, so this step also checks that the opaque
bar and the translucent one carry the *same* edge — same token, same width, same radius.
If the border looks different between them, that is a finding: they are attached at
different layers for a mechanical reason (the library's `absoluteFill` background wrapper
would cover a border on the bar itself), and a visible difference means the workaround is
not matching the real thing.

### A8. §18(g) Text contrast — the tab labels

**Do:** Measure the 12pt Teal active label and the Muted Sage Gray inactive label against
the bar, **with and without Increase Contrast**, on **both scale factors**.

**Pass:** Teal at body size needs composite luminance **≥ 0.576**.

Over Mist White this passes comfortably. **Record the measurement anyway** — it is the
baseline R3 compares against once artwork sits under the blur, and R2 cannot measure that
case because the asset does not exist yet.

### A9. §18(h) No numeric progress

**Pass:** no badge, count, dot, or indicator on the bar, on any tab, in any state.

Includes the active state: it is carried by **glyph fill and tint only**, never by a dot,
underline, or pill behind the selected tab.

### A10. The active/inactive glance test — **INHERITED FROM R1b-i STEP 11**

**A10a — the original condition.** At a glance, **without reading labels**, on **both**
devices: are the active and inactive tabs distinguishable? *Pass:* yes.

**A10b — the harder question R1b-i could not ask.** Squint, or photograph the bar and
desaturate it. **Is the active tab distinguishable by SHAPE ALONE, with hue removed?**

- *Pass:* → the `#6F7F77` inactive-icon fallback token is **closed as superseded** and
  R2's structural fix is confirmed. Record it that way explicitly.
- *Fail:* → build the token. R2 owns it.

**Check `sprout` / `sprout-outline` specifically.** It is the one glyph pair that changed,
and a sprout is a thinner drawing than a leaf; if any pair reads weakly at 24pt this is
the one.

### A11. `Chat`, with the keyboard up

**Do:** Open a conversation. Focus the composer. Type. Both devices.

**Pass, four things:**
1. **The tab bar is GONE** on Chat — not floating over the composer, not peeking.
2. The composer is fully visible and the send button tappable with the keyboard raised.
3. With the keyboard **down**, the composer clears the home indicator (it takes
   `insets.bottom` now; before R2 the opaque bar covered the indicator for it).
4. The `InputAccessoryView` "Done" bar does not collide with anything.

**Then check the bar comes back:** navigate back to `Conversations`. *Pass:* the capsule
returns, instantly, with no slide (A6 covers the Reduce Motion case).

**`keyboardVerticalOffset` is the open question here.** It is hardcoded to 90, which
assumes a 47pt notch plus a ~44pt header — Kyle's 14 Plus. On the SE that is roughly 26pt
too much. **Report what the gap above the keyboard actually looks like on the SE.** If it
reads wrong, it becomes its own edit rather than a guess folded into a navigation
restyle; it is booked to TECH_DEBT either way.

### A12. 1.3× Dynamic Type on the bar itself

**Do:** All four labels at 1.3×, both devices.

**Pass:** no label truncates, no label collides with its neighbour, no glyph is clipped.

**The labels are in Inter for the first time**, and Inter's metrics are not the system
font's — the tab labels were outside R1a's blast radius and move here. They keep
`numberOfLines={1}`, so **the failure mode is truncation, not wrap**, and **"Community"
at 375pt is the binding case.**

### A13. Android — **NOT RUN**

Record as NOT RUN and route to the `ANDROID` pre-launch row. R2 adds two items to it: the
opaque fallback is Android's only path and ships unseen, and the tab label is a second
synthetic-bold site outside the text primitive.

---

# SECTION B — R1a's fourteen steps. REQUIRED BEFORE R3.

### FIRST ACTION OF THIS SECTION, BEFORE ANY OTHER STEP

**Capture the six `0091ce5` before-screenshots.** Per `docs/walks/r1a/README.md` the
status is **NOT CAPTURED**; it is a human action CC cannot do. `git checkout 0091ce5`
still reproduces the before state.

Six files, default Dynamic Type, scrolled to top:
`before-today-se.png`, `before-today-16promax.png`, `before-pillarfocus-se.png`,
`before-pillarfocus-16promax.png`, `before-pillarenergy-se.png`,
`before-pillarenergy-16promax.png`.

**Without them, step 10 is unrunnable and is reported NOT RUN.** A before-and-after step
run after the after has shipped compares nothing.

### The fourteen steps, verbatim from `docs/walks/r1a/WALK.md`

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

### Carried notes

- **Steps 4 and 11 are the highest-risk unwalked steps** per the R1 AMENDED block.
- **Step 14 gates the app-wide Dynamic Type cap.** R1a applied `maxFontScale` to every
  `Text`, so a screen that used to clip above 1.3× now clips **at** it.
- **Step 10's "no tab label wraps" clause now overlaps A12**, and A12 is the more
  specific check — R2 is the row that changed tab-label metrics, and step 10 was written
  before that was true. Run both; cross-reference rather than reporting one twice.
- **Step 1 uses R1a's existing `__DEV__` Dev: Typography harness.** That is inherited.
  R2 adds no `__DEV__` surface of its own.
- **Android is out of this matrix** and is not covered by any step here.

---

# SECTION C — Still open from R1b-i and R1d. OPPORTUNISTIC.

### C1. R1b-i steps 7, 10, 11 on the SE at 375pt

Passed on the 14 Plus only; §18(d) names these as width-sensitive and the small end was
never covered. Step 7 = unchecked-checkbox border. Step 10 = placeholders.

**Step 11 is A10's subject.** Run it once, as A10, on both devices, and cross-reference
here. Do not run it twice.

### C2. R1b-i steps 13 (Focus hub), 14–17, 19, 20

R1b-i's own record: *"Steps 19 and 14–17 have the weakest reasons … they roll forward to
R2's walk rather than counting as closed."* 14–17 are dark-ground checks — teal nav
headers, teal cards and chips, black backdrop, user imagery — that a static sweep cannot
reach.

### C3. R1d's five `Spacing['4xl']` screens — **CHECKED, NONE BECAME REACHABLE**

`MasterclassDetail`, `SleepDetail`, `Movement`, `MovementDetail`, `BreathworkDetail` are
all pushed `AppStack` routes. **None is among R2's sixteen**, and R2 registers nothing and
relights nothing.

**Report C3 as: checked, none became reachable, all five remain outstanding.** Do not
re-run them under R2's banner.

### C4. R1d step 3 on the SE, if the simulator is already standing

R1d's step 3 is explicitly *"THE STEP THAT WOULD PROVE THE FIX"* and was not run. It costs
minutes if the SE is up — **provided `MasterclassDetail` has content on the walk
account**. If it does not, report **NOT RUN, NO CONTENT** and do not read step 1's result
across.

---

## WHAT THE SUITES ALREADY COVER, SO THE WALK DOES NOT RE-CHECK IT

`src/navigation/__tests__/tabBarGuard.test.ts` pins, in source: no badge; every tab
branches its glyph on `focused` and every pair is filled/`-outline`; the geometry comes
from `Layout.tabBar` and not from literals; `position: 'absolute'`;
`tabBarHideOnKeyboard` absent; the Reduce Motion config is really zero; Chat is hidden
from the tab and not from the stack screen; and the legacy navigator keeps its pre-R2
literals.

**None of that is evidence about what renders.** It proves the source has the shape
§12.2 requires. Whether the capsule clears the home indicator, whether the blur links,
and whether outline reads as distinct from filled at a glance are A4, A0 and A10, and the
suite is not a substitute for any of them.
