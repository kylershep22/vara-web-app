# Slice 7n - device walk

**Row:** journey roadmap §5 row 7n, the Journey rename.
**Branch:** `journey/slice-7n-rename`, built 2026-09-14.
**Walker:** Kyle. **Status:** OUTSTANDING.

---

## What this walk is checking

Five user-visible strings changed. The walk confirms all five in place, and
confirms the six that deliberately did NOT change, which is the second half of
the row's walk condition: *"no surface says Practices where it means the tab,
and none says Journey where it means the library."*

| | Site | Was | Now |
|---|---|---|---|
| 1 | `AppNavigator.tsx:613` | `tabBarLabel: 'Practices'` | `'Journey'` |
| 2 | `JourneyMapScreen.tsx:240` | the map H1, `Practices` | `Your journey` |
| 3 | `AppNavigator.tsx:973` | `headerBackTitle` on `PillarFocus` | `'Journey'` |
| 4 | `AppNavigator.tsx:1054` | `headerBackTitle` on `PillarStressRecovery` | `'Journey'` |
| 5 | `AppNavigator.tsx:1171` | `headerBackTitle` on `JourneyPhase` | `'Journey'` |

## Conditions

**Device: iPhone 14 Plus. Default Dynamic Type.**

**Account: MUST be a journeyed account** - one with a `journeyStates/{uid}`
document carrying a recognised `phaseKey` and `destination`. Steps 5 and 6 are
gated on it and cannot run without it. Ruled by Kyle at Step 0 review,
2026-09-14.

**Reference:** the branch is committed before the walk, per the workflow rule.

---

## Steps

**1. Launch to `Main`. Read the bottom tab bar without navigating.**
PASS: four labels read **Home / Journey / Learn / Community**. The second tab
reads **"Journey"**. No tab reads "Practices".

**2. Same screen: check the label fits.**
PASS: "Journey" renders in full on one line. Not truncated, not ellipsised, not
wrapped.
*Note: "Journey" is 7 characters against "Practices" at 9, at the same
`fontSize: 12, fontWeight: '600'`. The rename makes the label NARROWER, so it
cannot introduce a truncation risk at 375pt and the SE carries no new exposure
from this row. This step is a sanity check, not a risk.*

**3. Tap the Journey tab. Read the H1 at the top of the map.**
PASS: title reads **"Your journey"**, on one line, above the Start here row.
Not "Practices".

**4. On the map, read the four cards and the intro line.**
PASS: **unchanged** - "Pick a place to start.", then "Focus & Time", "Energy",
"Routines", "Stress Recovery" with their four descriptors.
*7n changes none of these. This step proves the rename did not bleed into the
library-sense strings, which is the walk condition's second half and the half
no test covers.*

**5. On the map, confirm the phase path drew. Tap any row.**
PASS: rows are visible and a phase page opens.
**GATE - DATA, NOT ROUTE.** `PhasePath` renders only under
`{!loading && journey}` (`JourneyMapScreen.tsx:268`), and `journey` comes from
`getRenderableJourneyState`, which returns null for an absent `journeyStates`
document and for one with an unrecognised `phaseKey` or `destination`.
**If no rows draw: STOP. Record steps 5 and 6 as NOT RUN - data gate unmet - and
re-run on a journeyed account.** Do not pass them by inspection.

**6. On the phase page, read the back control in the native header.**
PASS: back label reads **"Journey"**. Not "Practices".

**7. Back to the map. Tap the "Focus & Time" card. Read the back control.**
PASS: back label reads **"Journey"**.

**8. Back to the map. Tap the "Stress Recovery" card. Read the back control.**
PASS: back label reads **"Journey"**.

**9. Back to the map. Tap Learn, then Home, then Journey again.**
PASS: the tab label is stable across switches and the map title is stable on
remount.

**10. From Home, open the check-in and reach the recommendation; tap "See other
options".**
PASS: the pushed screen's title still reads **"Other options"**. It is not a
rename target and must not have moved.
*Best-effort. This screen has its own data gate - the engine must produce a
recommendation with a slot. If it does not appear, record as NOT RUN. It is
confirmatory, not a pass condition for the rename.*

**11. Reduce Motion ON (Settings > Accessibility > Motion). Repeat steps 1, 3
and 6.**
PASS: identical strings.
*Expected, and here is the argument: 7n edits four string values and one JSX
text child. The three `headerBackTitle` sites sit in `stackOpts({...})` objects
that also carry `animation: 'slide_from_right'`, but that key is adjacent, not
modified. No `Animated`, no `Reanimated`, no `LayoutAnimation` and no
`useReducedMotion` call site is in the diff. **No animation touched.** The step
runs anyway, because that is an argument and the walk is evidence.*

---

## Coverage this walk does and does not give

**All five renamed strings are walkable on a journeyed account** - steps 1, 3,
6, 7, 8.

**On an un-journeyed account, string 5 (`JourneyPhase`'s back label) is
unconfirmable** and must be listed as such rather than counted as done. Its gate
is DATA, not a route: the route is live, wired and correct, and the screen
becomes reachable the moment the document exists. Nothing needs relighting.

**Not covered:** the iPhone SE. It carries no new exposure from this row (step
2's note), and its outstanding item is R1d's bottom-padding defect, which 7n
neither fixes nor worsens.

---

## Result

*To be completed by Kyle at the walk.*

| Step | Result | Note |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
