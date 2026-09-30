# TODAY-LEGACY-REMOVAL - the four legacy cards leave Today - device walk

**Row:** TODAY-LEGACY-REMOVAL. InsightCard, WeeklyHabitGrid, RoutineCard and InsightsLookbackCard leave Today, with their loading, error and caller coupling.
**Build:** branch `journey/today-legacy-removal`, `177125e` (before-state captures) + `4b7662c` (the removal) + `db4386c` (the contracts) + the commit that carries this file.
**Device:** iPhone 14 Plus, dev client.
**Walker:** Kyle. **Status: WALKED 2026-09-29, ZERO FAILs, results as Kyle gave them in Part 4. D NOT WALKABLE IN THIS SETUP.**
**Time:** about 15 minutes. Any account that reaches Today works; the one used for the before-state captures is best, because it showed all four cards.

**Before-state captures.** Kyle's three screenshots in `before/`, taken 2026-09-29 on `main` at `33847ca`: `01-top.png`, `02-mid.png` and `03-bottom.png`, described in `before/README.md`. They are unchanging evidence. **After-state evidence is added alongside them, never over them.**

---

## Part 1 - The fence

**The walk stays on Today and its in-screen sheets.** Do not tap into any habit, routine, Plan or Insights screen.

**Do not tap Add a habit, Create a routine, Begin or Look back if any of them still appears.** Any one of them appearing is a **FAIL**, recorded by sight alone. Tapping it would take the walk out of its fence and prove nothing more.

---

## Part 2 - The walk

Report every step as **PASS**, **FAIL** or **NOT RUN**, with what you saw. A step that cannot be reached on this setup is **NOT WALKABLE IN THIS SETUP**, never "not run".

### A. Cold load

1. Force-quit the app and reopen it straight onto Today. Watch the first second, and compare it with the before state.
   - Today's loading spinner can no longer be triggered by the dashboard's own data: it used to wait for your habits to load, and it no longer does. So **look specifically for partly loaded content flashing**, for example the header and the good-moments row showing before the day's card, or a card appearing and then shifting.
   - **PASS:** Today settles without a visible flash of partial content, or with one no worse than before. Describe what you saw either way.
   - **FAIL:** content visibly jumps, flickers, or shows a half-built screen that the before state did not.
   - If the first frames are too quick to see, record **NOT RUN, too fast to observe**, not PASS.

### B. The four cards are gone

1. Scroll Today slowly from top to bottom.
   - **PASS:** **Add a good moment is the last row.** There is no tip card (no "Small resets add up" or any other tip), no **This week**, no **Today's routine** and no **Look back**.
   - **FAIL:** any of those four appears, in any state.

### C. The Good moments row

1. Tap **Add a good moment**. The sheet opens.
2. Cancel without saving.
   - **PASS:** the sheet opens and closes, and Today is as it was.

### D. The error banner

**NOT WALKABLE IN THIS SETUP**, under OFFLINE-PATHS-UNWALKABLE. The banner appears only when a read fails, and no state that needs the app to run without a network has been walked. What changed is covered by the structure suite: the banner no longer reports habits.

### E. Nothing on Today leads to habits, routines, Plan or Insights

1. List every tappable element on Today by its label, top to bottom. Include the Guide pill, the Settings cog, every button and link on the cards, and the good-moments row.
   - **PASS:** no label names habits, routines, Plan or Insights, and none reads as an entry point to them.
   - **FAIL:** any label that does.
   - **Identify them by label only.** Do not tap any of them to find out where it goes.

### F. The three-surface rule, by eye

1. With Today at rest at the top, name the prominent actionable surfaces above the fold.
   - **PASS:** no more than three compete for attention, normally including the day's card.
   - **Known, not a new finding:** the two filled teal buttons above the fold (the day's card and the draining card) are ledger row **R3B-DAY-ACTION-HIERARCHY**, owned by R3b. Record that you saw them; do not fail this walk on them.

### Observation, not a step

The day's card shows a **Routines** phase label from the journey (for example "Routines / Normal"). Record what you see. It is the journey's name for the destination, **not a routine entry point** and not a FAIL of this walk.

---

## Part 3 - Not in this walk

- **PlanScreen, HabitDetail, Insights and the notifications** (the habit and routine reminders). They belong to V1-LEGACY-RETIREMENT.
- **Card styling.** Nothing on Today was restyled; that is R3b.

---

## Part 4 - Results

### Results, recorded 2026-09-29 as Kyle gave them

**After-state evidence, taken during the walk at `bf10508`:** `after/01-top.png` and `after/02-scrolled.png`, described in `after/README.md`. The `before/` captures are unchanged.

- A. Pass - loading screen was just the blank off white with the spinning wheel and text, no background image
- B. Pass - only 4 cards there now
- C. Pass
- D. Not walkable
- E. Pass - every tapable button worked as expected
- F. Pass - see screenshots from the last message (committed as after/01-top.png and after/02-scrolled.png)

**On B's count.** The four-card count is Kyle's own. The after captures show, below the greeting: Where you are, the day's card, the draining card, Close out this week and Add a good moment.

**On D.** NOT WALKABLE IN THIS SETUP, under OFFLINE-PATHS-UNWALKABLE, as the step states.

### Observations

Neither item is a step result.

1. **Step A's loading screen had no environmental ground.** Before this slice, Today's own cold-load state, which waited on habits, showed R3a's transparent spinner over the painting. That state can no longer fire from `useDashboard`, so the loading screen now seen is the plain off-white one. Recorded in ledger row TODAY-COLD-LOAD-GROUND.
2. **The day's card shows "Routines / Normal · runs through Monday"**, visible in `after/01-top.png` and `after/02-scrolled.png`. This is the journey's phase label, not a routine entry point.
