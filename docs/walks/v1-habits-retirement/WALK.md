# V1-HABITS-RETIREMENT - habits leave V1 - device walk

**Row:** V1-HABITS-RETIREMENT. Habits leave V1, and PlanScreen becomes routines only. Habit reminders stop being scheduled, and the feature-discovery unlock toasts are switched off.
**Build:** branch `journey/v1-habits-retirement`, made of `da24261` (before-state captures), `f0d339c` (the retirement), `da57386` (the guard suite) and the commit that carries this file.
**Device:** iPhone 14 Plus, dev client.
**Walker:** Kyle. **Status: WALKED 2026-09-29, ZERO FAILs, results as Kyle gave them in Part 4. G NOT RUN. 1.3 times Dynamic Type NOT RUN.**
**Time:** about 15 minutes. Use the account from the before-state captures.

**Acceptance invariant** (Kyle, 2026-09-29):

> After V1-HABITS-RETIREMENT, the V1 mobile experience neither exposes, creates, advertises, navigates to, nor continues scheduling Habits. Existing stored Habit data remains preserved but dormant.

**Before-state captures.** These are Kyle's four screenshots in `before/`, taken 2026-09-29 on `main` at `e9c8e61` and described in `before/README.md`:
- `01-journey.png`
- `02-planscreen.png`
- `03-today.png`
- `04-help-faq.png`

`05-paywall.png` and `06-settings-chip.png` were not taken. The captures are unchanging evidence. **After-state evidence is added alongside them, never over them.**

---

## Part 1 - The fence

**Do not open any habit screen, and do not create a habit.** None should exist to open. If a way into one appears, that is a **FAIL**, recorded by sight alone. Do not tap it.

**Do not start a purchase.** If the paywall appears, read it and leave it without tapping a plan or a purchase button.

---

## Part 2 - The walk

Report every step as **PASS**, **FAIL** or **NOT RUN**, with what you saw. A step that cannot be reached on this setup is **NOT WALKABLE IN THIS SETUP**, never "not run".

Walk at **default Dynamic Type only**.

### A. Cold launch into Today

1. Force-quit the app and reopen it. It opens onto Today.
   - **PASS:** Today matches `before/03-today.png`: the greeting, the date, Where you are, the day's card, the draining card, Close out this week and Add a good moment. No unlock toast appears within a few seconds of Today settling.
   - **FAIL:** Today differs from the before capture in any element, or an unlock toast appears.

### B. The Journey tab, then the Routines card

1. Tap the **Journey** tab, scroll to **Pick a place to start.**, and tap the **Routines** card.
   - **PASS:** the screen shows:
     - the title Time, with the subtitle **"Routines you've built"**
     - the Guide pill
     - **no Habits and Routines tab switch**
     - **no Add a habit**
     - **no date banner**
     - **no All, Active or Complete filters**
     - **the Morning, Evening, Sunday and Custom chips, still there**, and tapping each one still switches the routine list
     - the routines list, or its empty state and templates, as in `before/02-planscreen.png` below the chips
   - **FAIL:** any habit control or label appears, or the chips are missing or no longer switch the list.
2. Start a routine, then close the player.
   - **PASS:** the player opens and closes as before, and you return to the same screen.
3. Go back to the Journey tab.

### C. Settings, then Help and Support

1. Open **Settings** with the cog on Today, then **Help & Support**.
   - **PASS:** under FREQUENTLY ASKED QUESTIONS there is no "How do I track my habits?" entry. The list starts at "How does the AI coaching work?". Compare with `before/04-help-faq.png`.
   - **FAIL:** the habits entry is still there.
2. The **Habit Tracking** chip: `06-settings-chip.png` was not taken, so there is no before state to compare with. Record **NOT RUN, no before capture**. If a "Currently available:" list happens to show on Settings, record whether any chip names habits. A chip that names habits is a **FAIL**.

### D. The paywall bullet

1. Only if the paywall is reachable **without starting a purchase**, read its feature list.
   - **PASS:** the bullet reads **"Create routines and capture reflections"**, and no bullet names habits.
   - If it is not reachable on this account without starting a purchase, record **NOT WALKABLE IN THIS SETUP**.

### E. Relaunch twice

1. Force-quit and reopen the app. Wait a few seconds on Today.
2. Do it once more.
   - **PASS:** no unlock toast either time, and Today is unchanged from step A.
   - **FAIL:** an unlock toast appears on either launch.

### F. Sight sweep

1. Look over **Home**, the **Journey** tab, **Learn**, **Community**, **Settings**, and **Help and Support**. Identify controls by their label only; do not tap them to find out where they go.
   - **PASS:** no label names habits or links to them.
   - **FAIL:** any label that does.
   - **Known, not a new finding:** the day's card can show the journey's **Routines** phase label, for example "Routines / Normal". It is the journey's destination name, not a habit surface.

### G. Conditional: a stale habit reminder

1. Only if a habit reminder scheduled before this build arrives, or is tapped from the notification list. **Do not create a habit to produce one.**
   - **PASS:** tapping it lands on **Home** or does nothing, never on the Time screen and never on a habit screen, and nothing crashes. If it arrives while the app is open, nothing is displayed.
   - **FAIL:** it opens the Time screen or any habit screen, or the app crashes.
   - If none occurs during the walk, record **NOT RUN, no stale habit reminder occurred**. A stale local reminder is also cleared the next time the app comes to the foreground, so this is expected to be rare.

### 1.3 times Dynamic Type

**NOT RUN**, under Kyle's approved accessibility-settings deferral of 2026-09-29.

---

## Part 3 - Not in this walk

- **Server functions.** `sendHabitReminders` is outside mobile code scope. It is an operational launch gate on Kyle's check in the Firebase console.
- **Insights.** Owned by INSIGHTS-V1, including the conditional Insights push route in `useNotifications.ts`.
- **RoutineCard on Today.** Owned by ROUTINES-RESTORE.
- **Styling.** Nothing was restyled.

---

## Part 4 - Results

### Results, recorded 2026-09-29 as Kyle gave them

**After-state evidence, taken during the walk at `8046d1f`:** `after/01-planscreen.png` (10:33) and `after/02-paywall.png` (10:27), described in `after/README.md`. The `before/` captures are unchanged.

**On the evidence.** Kyle first sent the before captures by mistake. The after captures replaced them in the record before any result was written.

- A. Pass
- B. Pass
- c. Pass
- D. Pass
- E. Pass
- F. Pass
- G. I saw no reminders

**Classification.**
- **A to F: PASS.** Kyle's lower-case "c" is recorded as he gave it; it is step C.
- **G: NOT RUN, no stale habit reminder occurred.**
- **1.3 times Dynamic Type: NOT RUN**, under Kyle's approved accessibility-settings deferral of 2026-09-29.

**On B.** `after/01-planscreen.png` shows the subtitle "Routines you've built", no tab switch, and the Morning, Evening, Sunday and Custom chips.

**On D.** `after/02-paywall.png` shows the bullet "Create routines and capture reflections".

### Observations, not step results

- **The paywall advertises Insights.** It also shows "A gentle look back at your patterns", while Insights is unreachable. This is ledger row **PAYWALL-INSIGHTS-CLAIM**.
- **The paywall underlines three links:** "Terms of Use", "Privacy Policy" and "Have a code?". This is ledger row **PAYWALL-UNDERLINES**.

Both are visible in `after/02-paywall.png`.
