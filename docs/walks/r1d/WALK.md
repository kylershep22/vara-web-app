# R1d walk — the token misses, and the five screens that could not be walked

**Slice:** `design/slice-r1d-token-reconciliation`
**Change under test:** six token misses fixed — five `Spacing['4xl']` sites that resolved to
`undefined` and one `Typography.fontSize['5xl'] + 16` that resolved to `NaN`.
**Written:** 2026-09-13, in the slice's docs commit, per the standing rule that a walked slice
commits its walk script.

---

## RESULT — walked 2026-09-14 (Kyle)

**iPhone 14 Plus**, dev client, default Dynamic Type. **SE: NOT WALKABLE IN THIS SETUP**
(amended 2026-09-14 - there is no SE device and no SE simulator here; Windows, and an iOS
simulator needs a Mac). This line read "SE simulator not run" until then, which invited a
run that cannot happen. See §18(d) for the condition, the mitigation and what it leaves
unverified.

**PASSED: step 6** — the Journal search empty state. Searched `zzzz`; the glyph renders at a
normal size, in proportion with the surrounding text. **It could not render at all before this
slice**, because `fontSize` was `NaN`.

**NOT RUN: steps 1, 2, 3** — `MasterclassDetail`, and **not for the reason this script
predicted.** See below.

**NOT RUN: steps 4, 5** — `SleepDetail`, `Movement`, `MovementDetail`, `BreathworkDetail`.
Routes dark, exactly as recorded.

### NET: five of five `Spacing['4xl']` screens are outstanding

**One of the six token-miss fixes was seen by eyes. Five were not.** All five `Spacing['4xl']`
screens are held by tsc and by code reading alone — four because their routes are dark, and the
fifth because it has no content to open. That is the honest state of this slice's visual
verification and it does not improve by being restated.

### `MasterclassDetail` IS NOT CONTENT-FREE BECAUSE ITS ROUTE IS DARK, AND THIS SCRIPT HAD IT WRONG

The route is live, wired and correct. Energy hub → "Learn" reaches `MasterclassScreen`, which
renders **the podcast list**. The masterclass list is a separate section of that same screen,
guarded by `masterclasses.length > 0` (`MasterclassScreen.tsx:177`), and `masterclasses` comes
from Firestore via `useMasterclasses` → `listMasterclasses`. **The collection has no documents**,
so the section does not render, so there is no card to tap and no way to reach the detail screen.

**This is a content gate, not a route gate, and the distinction matters in both directions.**
Nothing needs relighting and no navigator needs a row: the moment a masterclass document exists,
the screen is reachable and steps 1 to 3 run as written. Conversely, marking it DARK in standards
2.8 alongside the other four would be wrong — the mechanism is entirely different and a later
reader would go looking for a missing `navigate()` call that is not missing.

**Step 0 called this screen REACHABLE and it was checked the wrong way.** The check was static —
`MasterclassScreen.tsx:186` navigates to `MasterclassDetail`, therefore reachable. That proves a
navigator exists, not that a user can arrive. `mobile/docs/inventory/CC_Inventory_2026-08-15.md`
records it as REACHABLE "from `MasterclassScreen`" on the same static basis. **A route-level
reachability audit cannot see an empty collection**, and this is the second time in one slice
that a static read of the navigator produced a walk plan that could not be executed.

**Steps 1 to 3 are gated on masterclass content landing, not on a route being relit.**

---

## SCOPE, AND WHY IT IS ONE SCREEN AND NOT FIVE

The R1d row's walk cell reads *"The five `Spacing['4xl']` screens on both matrix devices."*
**None of the five could be reached by a user.** Four have dark routes; the fifth, written below
as reachable, turned out to be gated on content that does not exist. The RESULT section above
corrects this table's first row.

| screen | route | reachable at HEAD? |
|---|---|---|
| `MasterclassDetailScreen` | `MasterclassDetail` | **ROUTE YES, IN PRACTICE NO** — the route is live, but the `masterclasses` collection is empty so no card renders to tap. Corrected at the walk, 2026-09-14; this row said YES |
| `SleepDetailScreen` | `SleepDetail` | **NO** — zero `navigate()` callers anywhere in `src/` |
| `MovementScreen` | `Movement` | **NO** — zero `navigate()` callers |
| `MovementDetailScreen` | `MovementDetail` | **NO** — only from `Movement`, itself unreached |
| `BreathworkTimer` (in `BreathworkDetailScreen`) | `BreathworkDetail` | **NO** — only from `Breathwork`, itself unreached |

All four are `Stack.Screen`s on `AppStack` with real `options`, so they read as live to anyone
grepping the navigator. **The one apparent escape hatch is also dead:**
`utils/getNudgeSuggestion.ts:64` names `ROUTES.Breathwork`, its result is computed in
`useDashboard.ts:591`, and **no component renders a `NudgeSuggestion`** — so the nudge cannot
deliver anyone there either.

**Kyle's ruling, 2026-09-13: walk `MasterclassDetail` only, no dev route.** Steps 4 and 5 below
are recorded as deferred rather than passed. **At the walk, steps 1 to 3 joined them**, for a
different reason - see RESULT. A fix verified by reading is not a fix verified, and
saying so is the alternative to a walk that covers one screen and claims five.

## THE DEVICE THAT MATTERS HERE IS THE SE

All four `discover` screens wrap in `SafeAreaView edges={['bottom']}`, so the home-indicator
inset was always applied and the missing token was the breathing room **on top of** it.

- **iPhone 14 Plus:** 34pt bottom inset. A missing `paddingBottom` read as merely tight.
- **iPhone SE (3rd gen):** home button, **0pt bottom inset**. The last item sat flush against the
  physical screen edge.

**The defect is worst on the device §18(d) says is walked on simulator, and a 14 Plus-only walk
under-reports it by design.** Per §18(d), the 14 Plus covers the large end within 2pt of the
16 Pro Max; the SE end is the binding case for bottom clearance and is not proxied by it.

---

## STEPS

### 1. `MasterclassDetail`, 14 Plus, default Dynamic Type - **NOT RUN, NO CONTENT**

Energy tab → "Learn" → any masterclass. Scroll fully to the bottom.

**PASS:** roughly **64pt of clear space** below the last element, above the home-indicator inset.
Compare against `MasterclassScreen`, its parent list, which uses a raw `100`: the detail should
read as slightly less generous than the list, **never tighter**.

**FAIL:** the last element sits against the inset, or the gap reads smaller than the list's.

### 2. `MasterclassDetail`, 14 Plus, 1.3× Dynamic Type — **NOT RUN, NO CONTENT**

Settings → Display → Larger Text at the ceiling. Same route, scroll fully down.

**PASS:** the gap is unchanged — 64 is a fixed token and does not scale. The last line of body
copy does not collide with the bottom edge and nothing is clipped.

**Note:** the padding not scaling is correct, not a defect. What is being checked is that the
re-flowed content still clears it.

### 3. `MasterclassDetail`, SE simulator, default and 1.3× — **NOT WALKABLE IN THIS SETUP. THE STEP THAT WOULD PROVE THE FIX**

iPhone SE (3rd gen) simulator, 375 × 667 @2x.

**PASS:** with a 0pt safe-area inset, the 64pt **is** the entire bottom gap. The last element
clears the physical screen edge by that margin at both type sizes.

Step 1 only proves the fix did not regress the generous case. This is the one that proves it.

**AMENDED 2026-09-14: there is no SE simulator in this setup and there is not going to be
one until the toolchain changes**, so this step is **NOT WALKABLE**, which is a stronger
statement than not run and is why it is worth the edit. **The fix it would prove is still
unproven.** Do not read step 1's
pass as covering it — the whole finding is that the 14 Plus hides this.

### 4. `SleepDetail`, `Movement`, `MovementDetail` — **DEFERRED, ROUTE DARK**

Not reachable: registered on `AppStack`, no navigator, no `navigate()` caller. Walked at IA Step
4, or whenever the route is relit — per standards 2.8, *"a dark route that is ever relit gets a
row here first."*

Pass condition when it runs: as step 1, plus for `Movement` specifically confirm the FlatList's
bottom gap moved **16 → 64**. It is the one of the five that rendered a non-zero value before the
fix, because `paddingBottom: undefined` fell back to its own `paddingVertical: Spacing.base`.

### 5. `BreathworkDetail` → timer active — **DEFERRED, ROUTE DARK**

Not reachable, same reason. Pass condition when it runs: start a session; the breathing circle
gains **64pt above and below**. Then run the session to completion and compare the timer state
against `completionSection` on the same screen — **they should sit at the same vertical weight**,
since that sibling is the reading the value was chosen from.

### 6. Journal empty state, 14 Plus, default and 1.3× — **PASSED 2026-09-14, default type**

Journal tab → type a search string that matches nothing (or select a tag filter with no entries).

**PASS:** the 📔 glyph renders at **48pt**, sized like `RoutinesTab`'s empty-state emoji, with
the "No entries found" title below it.

**FAIL:** the glyph is missing, renders at an unrelated size, or the layout below it is displaced.

**What this is testing.** Before this slice the style read `fontSize: NaN`
(`Typography.fontSize['5xl'] + 16`, and `'5xl'` is not a key). **This is the one step in the walk
where the "before" is genuinely undefined behaviour rather than a known value**, so what the
screen looked like yesterday is not a useful comparison — check it against `RoutinesTab`'s empty
state instead.

**Not the same screen as the unfiltered empty state**, which is the separate `JournalEmptyState`
component and is untouched by this slice.

**RESULT: PASSED, 2026-09-14, iPhone 14 Plus, default type (Kyle).** Searched `zzzz`. The glyph
renders at a normal size, in proportion with the surrounding text. **1.3x was not run** and the
step stands open at that size; nothing suggests a problem there, since the value is a fixed token
and the surrounding text is what re-flows, but it was not looked at and this records that rather
than folding it into the pass.

---

## NO RENDERED CHANGE — STATED PER ITEM, WITH THE REASON

The other three items get no step because they move nothing on screen.

- **Item 1, the dealias.** 29 of 34 keys are byte-identical primitives or differ only in rgba
  whitespace, at ten style-value sites that React Native parses identically; 2 more had zero
  consumers and were deleted; the 3 that could not be aliased without moving a pixel stayed
  declarations for exactly that reason. Held by tsc and by
  `constants/__tests__/designTokenAliases.test.ts`, which was mutation-tested against the
  historical drift.
- **Item 3, `MIN_TOUCH_TARGET`.** 48 → 48 at all 142 lines, every one a `minHeight`, `height`,
  `width` or `minWidth`, plus one arithmetic use whose inputs are unchanged. Held by tsc.
- **Item 4, `accessibility.ts`.** Zero consumers for all seventeen exports, so the deletion
  removes dead code only. Held by tsc — a missed importer is a compile error, not a silent
  screen-reader regression.
- **Item 5, the allowlist lift.** Test-only.

---

## BASELINES AT THE BRANCH

tsc **141** (from 147) · jest **3595 of 227** (from 3551 of 225) · sentinel **149**, unchanged ·
lint **994 errors / 1358 warnings** (from 995; see below).
