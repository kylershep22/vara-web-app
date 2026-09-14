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

## RESULT — SECTION A WALKED IN FULL, 2026-09-14 (Kyle)

**iPhone 14 Plus, dev client, default Dynamic Type unless the step says otherwise.**
One device. **Large end only.**

**It is not a matrix device.** §18(d)'s matrix is the iPhone SE (3rd gen) at 375 x 667 @2x
and the iPhone 16 Pro Max at 430 x 932 @3x. The 14 Plus is 428 x 926 @3x with a 47pt
notch: within 2pt of the Pro Max, so the large end is effectively covered for every
width-sensitive assertion, and **only @3x was walked** where §18(g) wants both scale
factors.

**PASSED:** A0 · A0b (closed at `f77a8e2`, third run) · A1 · A2 · A3 · A4 · A5 · A6 · A7 ·
A8 · A9 · A10 · A10b · A11 · A12.

**NOT RUN:** A13 (Android, definitionally so on an iPhone, and **not owed** - see A13) · **every SE step, NOT WALKABLE in this setup** ·
**A5b, not separately reported — see the note under A5b.**

**SECTION B (R1a's fourteen) and SECTION C: NOT RUN.** Section B is required before R3.

### The SE half of the matrix is NOT WALKABLE, which is not the same as not run

**There is no SE device and no SE simulator in this setup** (Windows; an iOS simulator
needs a Mac). Settled and recorded in §18(d) on 2026-09-14, along with the mitigation:
**small-end risk is monitored through beta and support feedback until one exists.**

**Every SE step in this script reads "not walkable in this setup", never "not run."** The
two mean different things to whoever reads the record next: "not run" invites someone to
go and run it; "not walkable" says the gap needs a machine before it needs a walker.

> **HOW THIS WAS RECORDED AT THE WALK, AND WHY THE CORRECTION IS WORTH KEEPING.** The
> result cited a 2026-09-14 addendum. **No such addendum was in the repository** - a
> search of `docs/` and `mobile/` found nothing - and §18(d) still said, in terms, *"the
> SE end is walked on simulator"*, so the record and the standard disagreed. It was
> flagged rather than passed through, and §18(d) was amended. **The outcome did not
> change: the SE steps were not walked either way.** What changed is that the reason is
> now written down somewhere a reader can find it.

**WHAT THE SE WOULD HAVE BOUND, and each of these is a KNOWN GAP rather than an assumed
pass.** Enumerated in §18(d) too, so it survives this file:

- **`Layout.tabBar.minBottomOffset` at a 0pt inset.** On a home-indicator device the
  capsule is lifted by `insets.bottom` (34pt) and the 12pt floor never engages. On the SE
  it is the only thing holding the bar off the screen edge. **The one value it exists for
  has never been exercised.**
- **A5 at 667pt.** The SE is the shortest as well as the narrowest; bottom clearance
  scrolled fully down is a function of both.
- **A8's @2x half.** §18(g) wants both scale factors; only @3x was walked.
- **`ChatScreen`'s `keyboardVerticalOffset`.** 90 assumes a 47pt notch; on a 20pt status
  bar it is about 26pt too much. Its TECH_DEBT item cannot close without the device.
- **A12's "Community" at 375pt, the binding truncation case.** Labels are
  `numberOfLines={1}`, the bar is 53pt narrower, and the labels are in Inter as of R2.
  **Passing at 428pt does not clear it**, at default type or at 1.3x.

**None of the five is a thing a user reports clearly** - a trapped last row, a clipped
label and a composer sitting 26pt high all read as "it looks a bit off". The mitigation is
real and it is not a substitute. **Whoever acquires a Mac or an SE runs these five first.**

### A NUMBERING MISMATCH, RECONCILED RATHER THAN QUIETLY RENUMBERED

The report transposed two labels against this script. **Nothing is missing — both were
walked** — but the record has to be unambiguous about which observation belongs to which
assertion, so it is reconciled here and the results below are filed by SUBSTANCE:

| Reported as | Substance | This script's step |
|---|---|---|
| A4 | sixteen routes scrolled fully down, last item clear | **A5** (§18(d)) |
| A5 | safe areas clean | **A4** (§18(c)) |
| A13 | the sprout reads correctly in both states | **A10**, an added observation. This script's A13 is Android |

---

## THIS IS NOT A ONE-SITTING WALK, AND THE PLAN SHOULD NOT PRETEND IT IS

| Section | What | Estimate |
|---|---|---|
| **Pre-work** | Six `0091ce5` screenshots; confirm the BlurView links. (**No SE simulator to stand up** - see below) | **30–45 min** |
| **A** | R2's own gate: §18 (a)–(h), 2 devices × 2 type sizes, 16 routes scrolled fully down, Reduce Transparency, Reduce Motion, the glance test, Chat with the keyboard up | **3.5–4.5 hrs** |
| **B** | R1a's fourteen steps, still not run, 2 devices | **2.5–3.5 hrs** |
| **C** | R1b-i's SE remainder and R1d's five screens | **45–75 min** |
| | **Total** | **~8–10 hours, across at least three sittings** |

**Section A is this slice's gate.** It is what R2 merges on.

**Section B is required before R3** and is a different slice's debt. It can be run on a
different day against the same build, and splitting it off is the honest way to make
this tractable rather than a way of deferring it.

**Section C is opportunistic**, and **its SE steps are not walkable in this setup** - see the SE note below. What remains of it is the 14 Plus work.

---

## DEVICES

- **iPhone SE (3rd gen), 375 × 667 pt @2x** — **NOT WALKABLE IN THIS SETUP.** No device,
  no simulator (Windows; an iOS simulator needs a Mac). `insets.bottom` is **0** there,
  which is what makes it the binding case for almost everything in Section A — and why
  its absence is a recorded gap rather than a scheduling problem. §18(d), 2026-09-14.
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

**RESULT: PASSED, 2026-09-14, iPhone 14 Plus (Kyle), on the third run.** Three tuning
rounds; the full sequence is below, because which lever did the work is the useful part.

**Do:** Compare the bar against the Mist White ground on Today, Journey and Learn.
**Scroll content under it** — a static screenshot is not the test; the failure mode this
step exists to catch only shows while things move behind the bar.

**Pass:** the bar reads as a slightly warm, **separated** capsule with a visible edge.
**It should NOT read as dramatic frosted glass** — a light-tint blur over `#FAFAF6` is
never going to be theatrical, and it should not be.

**FAIL if** the capsule dissolves into the page while scrolling, or if its fill is
indistinguishable from a card.

#### What was observed, in order

> **RUN 1 — FAILED.** The blur **linked and was working**: content was visibly blurred
> behind the capsule at its bottom edge, which is what A0 establishes, and A0 passed. But
> the bar **read flat**. `Colors.tabBarTranslucent` at **0.55** over a Mist White ground
> is very nearly that ground, and is the same value as the cards, so the capsule had no
> separation and dissolved into the page when scrolling. **The fill was doing the work the
> blur is for.**
>
> Fixed in `c8f2fba`: fill **0.55 → 0.35**, and the translucent capsule **gained the
> `divider` hairline the Reduce Transparency fallback already had** — both states now
> carry it, because a lower-alpha fill needs an edge more than a high-alpha one does.

> **RUN 2 — FAILED, closer.** Better after the fill and the hairline, still not enough
> separation.
>
> Fixed in `bbfc136`: **`Layout.shadow.floating` replaces `Layout.shadow.lg`** —
> `0 8px 24px rgba(0,0,0,0.12)` against `0 4px 16px rgba(0,0,0,0.08)`. A new token named
> for its role, because `lg` is tuned for sheets and modals — things that sit IN the page
> flow — and this bar has content passing underneath it.

> **RUN 3 — PASSED. Tuning closed.** The capsule reads as a **distinct floating object
> with content scrolling behind it**, checked on Today and on a **Community photo post**.
> The photo is the harder case and is why the pass means something: it is the one ground
> in the app today that is neither near-white nor flat.
>
> **TUNING ENDS AT:** `tabBarTranslucent` **Mist White at 0.35** · **`divider` hairline in
> both states** · **`Layout.shadow.floating`**. Three levers, in §12.2's stated order.
> **`BlurTokens.tabBarIntensity` never moved from 40**, which was the point of the order:
> blurring a near-white ground returns near-white, and the intensity would have looked
> like it did nothing.

#### Two things this step closed besides the tuning

**THE STRUCTURAL QUESTION — CLOSED.** Run 3 was asked to compare the capsule's shadow with
Reduce Transparency **off** against **on**, because in the translucent state the library
sets the bar's `backgroundColor` to `transparent`, and iOS derives a layer's shadow from
its rendered content when there is no opaque background to cast from. A shadow present
opaque and absent translucent would have been a **restructuring** job, not a number to
raise — and raising the opacity would not have helped while over-darkening the opaque
state. **Reported comparable in both: the translucent state casts properly.** Recorded
because the next person to put a shadow on a view whose background the library controls
will ask the same question.

**THE PREPARED FOURTH LEVER — CLOSED AS UNNEEDED, NEVER APPLIED.** `tabBarTranslucent`
was to move from Mist White to **White at about 0.5**, so the bar read brighter than the
page rather than equal to it. It was held back so the shadow could be judged on its own,
and the shadow closed the gap. **The bar stays Mist White, which is worth more than the
change would have been:** §4.1's derived-alpha rule holds, the translucency is Mist
White's own RGB with the alpha doing all the work, and there is no hue shift against the
ground to re-check when R3 changes what the ground is.

#### What this does NOT settle

**Every value here was tuned against MIST WHITE GROUNDS**, because that is all four tab
roots today — three runs against the only grounds that exist. **R3 puts environmental
artwork under Today**, and the same settings will read differently over it: a bar tuned to
pop against near-white may read **heavy** over watercolour, and a shadow sized for a flat
pale ground is the first thing that will show.

**R3 re-walks A0b with the artwork beneath the bar and is entitled to move these values
back.** What the bar looks like over today's Mist White grounds is the *before* for that
comparison, and Run 3's observation is that record.

### A1. The `getTabBarHeight` finding, confirmed on hardware — **STEP 1 PER THE ROW**

**PASSED, 2026-09-14, 14 Plus.** Confirmed in both directions: on `main` the labels sat above the home indicator, and on the branch the capsule clears it. **The Step-0 reading of `@react-navigation/bottom-tabs@7.9.0` is confirmed on hardware and stops being library reading.** **Not walkable on the SE**, where it would be non-discriminating anyway (`insets.bottom` is 0, so both readings predict the same picture).

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

**PASSED, 2026-09-14, 14 Plus.** All four match §2.8's table.

**Do:** Today, Journey, Learn, `CommunityMain`.

**Pass:** each matches §2.8's table — Today IMMERSIVE (Mist White today; the artwork is
R3's), Journey and Learn ATMOSPHERIC, `CommunityMain` FOCUS — and no element of another
treatment is present.

**The bar is chrome and is not a surface treatment.** Record that explicitly, so a later
reader does not conclude that glass made anything IMMERSIVE.

### A3. §18(b) No doubled artwork — Today first and specifically

**PASSED, 2026-09-14, 14 Plus.** One kind of art. **This is the pre-R3 baseline reading**, and it is what R3's check compares against.

**Pass:** one kind of art on screen.

R2 adds none. **This is the pre-R3 baseline reading**, and recording it now is what makes
R3's check a comparison rather than an opinion.

### A4. §18(c) Safe areas — all four edges, both devices

**PASSED, 2026-09-14, 14 Plus** (reported as "A5 safe areas clean"; see the numbering reconciliation above). **The SE is NOT WALKABLE in this setup, and it is the binding case for this step** — `insets.bottom` is 0 there, so `Layout.tabBar.minBottomOffset` (12) is the only thing holding the capsule off the screen edge, and the 14 Plus's 34pt inset cannot exercise it.

**Pass:** nothing clipped, overlapped or unreachable at any edge.

The bottom edge is the one R2 moves. **On the SE, `insets.bottom` is 0 and
`Layout.tabBar.minBottomOffset` (12) is the only thing holding the capsule off the screen
edge — this is the binding case for that token.** If 12 reads mean, say so with a number.

### A5. §18(d) Floating bar clearance — **SIXTEEN SUB-STEPS**

**PASSED, 2026-09-14, 14 Plus** (reported as "A4 all sixteen routes scrolled fully to the bottom, last item clear of the capsule on each"). **All sixteen, each scrolled fully down.** **§6.2's retirement of the fixed 48 is verified for these routes on the large end.** **NOT WALKABLE on the SE**, which at 667pt is the shorter viewport and the second half of this assertion.

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

**NOT SEPARATELY REPORTED, 2026-09-14, and flagged rather than assumed.** A5 reports all sixteen routes scrolled fully down with the last item clear, which covers the scroll content on `Conversations` and `ReportDetail` — but **neither of these two controls is a "last item"**. The `Conversations` FAB is absolutely positioned and was **the one hard collision Step 0 identified** (at `bottom: 24` it sits wholly behind the capsule on this device); `ReportDetail`'s sticky action block hardcoded `34`. Both were changed by `6e9a590` and both are plausibly fine, **but plausibly fine is what this walk exists to replace.** One look at each on the next sitting closes it.

**`Conversations` FAB.** *Pass:* fully visible and tappable, clear of the capsule, on
both devices. It sat at `bottom: 24` before R2 and would have been **wholly behind** the
bar on the 14 Plus. It is the only real collision in the sixteen.

**`ReportDetail` sticky actions.** *Pass:* the submit button clears the capsule. It
hardcoded `34` before R2 — right on a 14 Plus, wrong on the SE. **The SE is the
discriminating device here.**

### A6. §18(e) Reduce Motion

**PASSED, 2026-09-14, 14 Plus.** Tab switches instant, **no bar slide entering or leaving Chat** — which is the case `REDUCED_MOTION_VISIBILITY` guards and `display: 'none'` makes instant anyway.

**Do:** On. Every animation on every touched surface — **not only what R2 added**; a
slice that restyles a screen inherits whatever already moves on it, and 26 animated files
ship without the hook (§17).

**Pass:** tab switch is an instant content swap, no transition (§12.2). Nothing on the
bar moves.

**FAIL if** the bar slides, fades or animates in any way on a tab switch or on entering
or leaving `Chat`.

### A7. §18(f) Reduce Transparency — **NEVER WALKED ONCE SINCE v2.0**

**PASSED, 2026-09-14, 14 Plus. BOTH HALVES, AND THE FIRST TIME THIS ASSERTION HAS EVER BEEN RUN.** Opaque White with the `divider` hairline all the way round; **toggled live** (the `reduceTransparencyChanged` listener) **and cold-started** (the initial `isReduceTransparencyEnabled()` read). **Both states' edges match**, which was the added check from A0b: the layered hairline in the translucent state renders the same as the real border in the opaque one. A promise standing unverified since v2.0 is now verified.

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

**PASSED, 2026-09-14, 14 Plus.** Labels crisp; **the contrast baseline over Mist White is recorded**, which is the point of running it now — it is what R3 compares against once artwork sits under the blur. @3x only; §18(g) wants both scale factors, and **the @2x half is not walkable in this setup** - it goes with the SE.

**Do:** Measure the 12pt Teal active label and the Muted Sage Gray inactive label against
the bar, **with and without Increase Contrast**, on **both scale factors**.

**Pass:** Teal at body size needs composite luminance **≥ 0.576**.

Over Mist White this passes comfortably. **Record the measurement anyway** — it is the
baseline R3 compares against once artwork sits under the blur, and R2 cannot measure that
case because the asset does not exist yet.

### A9. §18(h) No numeric progress

**PASSED, 2026-09-14, 14 Plus.** No badges, counts or dots, in any state.

**Pass:** no badge, count, dot, or indicator on the bar, on any tab, in any state.

Includes the active state: it is carried by **glyph fill and tint only**, never by a dot,
underline, or pill behind the selected tab.

### A10. The active/inactive glance test — **INHERITED FROM R1b-i STEP 11**

**PASSED, 2026-09-14, 14 Plus — BOTH HALVES.** A10a: the active tab is distinguishable at a glance on every tab. **A10b: distinguishable IN GRAYSCALE, by shape alone.**

> **THE `#6F7F77` FALLBACK TOKEN IS CLOSED AS SUPERSEDED.** Held in reserve since R1b-i's step 11, which passed on hue and label and recorded the pass as weaker than before. The filled/outline glyph switch is the structural fix R2 said it would be, and A10b is the measurement that closes it: with hue removed entirely the states still read apart. **It is not built and will not be.**

**Added observation, reported as "A13":** the `sprout` / `sprout-outline` pair reads correctly in both states. That was the one glyph R2 changed, and a sprout is a thinner drawing than a leaf, so it was the pair most at risk at 24pt.

**A10a — the original condition.** At a glance, **without reading labels**, on **both**
devices: are the active and inactive tabs distinguishable? *Pass:* yes.

**A10b — the harder question R1b-i could not ask.** Squint, or photograph the bar and
desaturate it. **Is the active tab distinguishable by SHAPE ALONE, with hue removed?**

- *Pass:* → the `#6F7F77` inactive-icon fallback token is **closed as superseded** and
  R2's structural fix is confirmed. Record it that way explicitly.
- *Fail:* → build the token. R2 owns it.

**RESOLVED: PASS, in Grayscale, 2026-09-14. The token is closed and is not built.**

**Check `sprout` / `sprout-outline` specifically.** It is the one glyph pair that changed,
and a sprout is a thinner drawing than a leaf; if any pair reads weakly at 24pt this is
the one.

### A11. `Chat`, with the keyboard up

**PASSED, 2026-09-14, 14 Plus.** Composer fully visible with the keyboard up, **no bar beneath it** — the hide is coming from the Community tab, which is the whole point of that correction, since the obvious implementation would have been inert.

**`keyboardVerticalOffset` is NOT closed by this pass.** 90 assumes this exact device. The discriminating case is the SE, which is **not walkable in this setup**, so the TECH_DEBT item stands and cannot close without a device.

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
too much. **The SE reading is not obtainable in this setup**, so this stays open. If it
reads wrong, it becomes its own edit rather than a guess folded into a navigation
restyle; it is booked to TECH_DEBT either way.

### A12. 1.3× Dynamic Type on the bar itself

**PASSED, 2026-09-14, 14 Plus.** All four labels on one line at 1.3x, none truncated. **"Community" at 375pt is the binding case and is NOT WALKABLE in this setup** — that is the SE, where the bar is 53pt narrower. Passing at 428pt does not clear it.

**Do:** All four labels at 1.3×, both devices.

**Pass:** no label truncates, no label collides with its neighbour, no glyph is clipped.

**The labels are in Inter for the first time**, and Inter's metrics are not the system
font's — the tab labels were outside R1a's blast radius and move here. They keep
`numberOfLines={1}`, so **the failure mode is truncation, not wrap**, and **"Community"
at 375pt is the binding case.**

### A13. Android — **NOT RUN, AND NOT OWED**

**NOT RUN, 2026-09-14, as expected — this was an iPhone walk.**

**It is also not work owed before R3.** The `ANDROID` row was reclassified on 2026-09-14
from PRE-LAUNCH to **NOT SCHEDULED**: there is no Android build and none is planned inside
the R-series, so no row here waits on it. It stays as the **ledger** of Android behaviour
nothing has ever seen, which is why the items below are recorded rather than dropped.

**R2 puts TWO items on that ledger:**

1. **The opaque tab bar is Android's only path and ships unseen.** `expo-blur` is iOS-only
   per §12.2, so every Android user gets the fallback branch — White, the `divider`
   hairline, and the elevation below. No jest test and no §18 assertion can reach it,
   because 18(f)'s matrix is two iPhones.
2. **`Layout.shadow.floating`'s `elevation: 12`.** Set by reasoning alone, to match an iOS
   intent that was tuned across three walk runs. It **overrides React Navigation's own
   `elevation: 8`**, so it is what ships; and Android elevation on a 30pt-radius view
   clips to the shape and can read as a hard band rather than a soft cast.

> **A THIRD ITEM WAS PROPOSED AT STEP 0 AND RETIRED BEFORE IT REACHED THE LEDGER** — the
> tab label as a second synthetic-bold site outside the text primitive. **Ruling 4 removed
> it:** labels go through the shared primitive rather than a hand-written `fontFamily`
> plus a hand-written `Platform` weight strip, so they inherit R1a's guard instead of
> duplicating it. There is one synthetic-bold site on that row, not two, and it is still
> R1a's. Recorded here so nobody adds it back from R2's Step 0.

**The report used this number for a different observation** (the sprout reading correctly
in both states), which is filed under A10. See the numbering reconciliation at the top.

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

### C1. R1b-i steps 7, 10, 11 on the SE at 375pt — **NOT WALKABLE IN THIS SETUP**

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

### C4. R1d step 3 on the SE — **NOT WALKABLE IN THIS SETUP**

R1d's step 3 is explicitly *"THE STEP THAT WOULD PROVE THE FIX"* and was not run. **It
still cannot be**: there is no SE in this setup. R1d's bottom-padding fix therefore
remains unproven on the device that would prove it, which is recorded in `r1d/WALK.md` and
in §18(d) rather than carried here as a task someone could pick up.

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
