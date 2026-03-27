# Web-Mobile Parity Phase 1D: Celebrations & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the web celebration system with mobile's gentler brand, remove legacy dashboard components, clean up dead imports, and run final integration testing across all Phase 1 work.

**Architecture:** Update existing celebration components to match mobile's copy and behavior. Remove the ConfettiOverlay. Clean up dead code from replaced pages. Final em dash scan and cross-platform data verification.

**Tech Stack:** React 19, Tailwind CSS, Firestore

**Spec:** `docs/superpowers/specs/2026-03-27-web-mobile-parity-phase1-design.md` (Section 9 + cleanup)

**Depends on:** Plans 1A, 1B, and 1C must be completed first.

---

## File Structure

### Modified Files

| File | Change |
|------|--------|
| `src/components/celebrations/StreakMilestoneModal.jsx` | Update triggers, copy, remove streak count display |
| `src/components/celebrations/QuietFinish.jsx` | Update copy to match mobile rotation |
| `src/components/celebrations/index.js` | Remove ConfettiOverlay export |

### Deleted Files

| File | Reason |
|------|--------|
| `src/components/celebrations/ConfettiOverlay.jsx` | Replaced by QuietFinish for calmer brand |
| `src/components/dashboard/StatCard.jsx` | Replaced by new dashboard cards |
| `src/components/dashboard/SectionCard.jsx` | No longer used in new dashboard |
| `src/components/dashboard/CommunityHighlights.jsx` | Removed from dashboard |
| `src/components/tasks/TaskSection.jsx` | Eisenhower quadrant layout removed |
| `src/components/tasks/TaskQuickAdd.jsx` | Quick-add removed from dashboard |

---

## Task 1: Update StreakMilestoneModal

**Files:**
- Modify: `src/components/celebrations/StreakMilestoneModal.jsx`

- [ ] **Step 1: Read the current file**

Read `src/components/celebrations/StreakMilestoneModal.jsx` (94 lines). Note: current triggers are at consecutive streaks (3, 7, 14, 30, 60, 100) and it displays the streak count.

- [ ] **Step 2: Update to match mobile**

Changes:
1. **Trigger on total engagement days** (7, 30, 60, 100), NOT consecutive streaks
2. **Never display the day count** to the user
3. **Remove built-in confetti** (the component currently triggers 20 confetti pieces)
4. **Update copy** to rotate between these headings:
   - "You've been taking care of yourself."
   - "Showing up, even briefly, is worth something."
   - "Whatever brought you back, it counts."
   - "You're building something that matters."
5. **Body text:** "Keep going at whatever pace works for you."
6. **Remove milestone-specific icons/colors** - use a single calm design (teal background, leaf or heart icon)

The parent component that renders this modal needs to change its trigger logic from "consecutive streak" to "total engagement days." Check where `StreakMilestoneModal` is rendered (likely in Dashboard or HabitsScreen) and update the trigger condition.

- [ ] **Step 3: Commit**

```bash
git add src/components/celebrations/StreakMilestoneModal.jsx
git commit -m "refactor(web): update streak modal to engagement-day triggers with mobile copy"
```

---

## Task 2: Update QuietFinish Copy

**Files:**
- Modify: `src/components/celebrations/QuietFinish.jsx`

- [ ] **Step 1: Read the current file and mobile equivalent**

Read `src/components/celebrations/QuietFinish.jsx` (36 lines) and `mobile/src/components/celebrations/QuietFinish.tsx`.

- [ ] **Step 2: Update copy to match mobile's rotation**

The mobile QuietFinish rotates between 5 messages:
1. "Done for today. Well done."
2. "You showed up. That matters."
3. "A good day. Rest easy."
4. "Taken care of. Nicely."
5. "That's all for today."

Update the web component to use the same rotation pool. Select randomly on mount (matching mobile's pattern). Auto-dismiss after 2.5 seconds. Calm styling: sage background, checkmark icon, soft charcoal text.

- [ ] **Step 3: Commit**

```bash
git add src/components/celebrations/QuietFinish.jsx
git commit -m "refactor(web): update QuietFinish copy to match mobile rotation"
```

---

## Task 3: Remove ConfettiOverlay

**Files:**
- Delete: `src/components/celebrations/ConfettiOverlay.jsx`
- Modify: `src/components/celebrations/index.js`

- [ ] **Step 1: Find all imports of ConfettiOverlay**

Search the codebase for all files that import ConfettiOverlay:
```bash
grep -r "ConfettiOverlay" src/ --include="*.jsx" --include="*.js" -l
```

- [ ] **Step 2: Remove ConfettiOverlay from celebrations index**

Edit `src/components/celebrations/index.js` to remove the ConfettiOverlay export.

- [ ] **Step 3: Remove ConfettiOverlay imports from all consuming files**

For each file found in Step 1, remove the import and any JSX rendering of `<ConfettiOverlay>`. If the component was the only reason for a state variable (like `showConfetti`), remove that state too.

- [ ] **Step 4: Delete ConfettiOverlay.jsx**

Delete `src/components/celebrations/ConfettiOverlay.jsx`.

- [ ] **Step 5: Check if canvas-confetti can be removed from package.json**

Search for any other usage of `canvas-confetti`:
```bash
grep -r "canvas-confetti\|confetti" src/ --include="*.jsx" --include="*.js" -l
```

If ConfettiOverlay was the only consumer, remove `canvas-confetti` from package.json dependencies:
```bash
npm uninstall canvas-confetti
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(web): remove ConfettiOverlay for calmer brand tone"
```

---

## Task 4: Remove Dead Dashboard Components

**Files:**
- Delete: `src/components/dashboard/StatCard.jsx`
- Delete: `src/components/dashboard/SectionCard.jsx`
- Delete: `src/components/dashboard/CommunityHighlights.jsx`
- Delete: `src/components/tasks/TaskSection.jsx`
- Delete: `src/components/tasks/TaskQuickAdd.jsx`

- [ ] **Step 1: Verify these components are no longer imported**

For each file, search for imports:
```bash
grep -r "StatCard\|SectionCard\|CommunityHighlights\|TaskSection\|TaskQuickAdd" src/ --include="*.jsx" --include="*.js" -l
```

If any are still imported somewhere (e.g., GoalsHabits.jsx which hasn't been removed yet), do NOT delete them yet. Only delete components that have zero imports remaining.

- [ ] **Step 2: Delete confirmed dead components**

Delete each file that has no remaining imports.

- [ ] **Step 3: Remove the old useDashboard.js if no longer imported**

Check if the old `src/hooks/useDashboard.js` is still imported anywhere:
```bash
grep -r "useDashboard[^V]" src/ --include="*.jsx" --include="*.js" -l
```

If only the new `useDashboardV2` is used, delete `useDashboard.js`. If the old GoalsHabits page still uses it, keep it for now (it'll be cleaned up when GoalsHabits is removed in Phase 3).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(web): remove dead dashboard components replaced in Phase 1"
```

---

## Task 5: Cross-Platform Data Verification

- [ ] **Step 1: Verify Firestore document patterns match**

Confirm the web writes documents with the same ID patterns as mobile:
- Morning check-ins: `morningCheckIns/{userId}_{YYYY-MM-DD}`
- Brain metrics: `brainMetrics/{userId}_{YYYY-MM-DD}`
- Wellness scores: `dailyWellnessScores/{userId}_{YYYY-MM-DD}`
- Habit completions: `habits/{habitId}/completions/{YYYY-MM-DD}`

Read the relevant web service files and verify the document ID construction matches mobile exactly. Date format must be `YYYY-MM-DD` using local timezone (not UTC).

- [ ] **Step 2: Verify no PII in weekly narrative requests**

Check `src/components/insights/WeeklyNarrativeCard.jsx` (or wherever the API call is made). Confirm the request body sent to `/api/weekly-narrative` contains only anonymized aggregate numbers - no userId, names, habit titles, journal content.

- [ ] **Step 3: Commit verification notes**

```bash
git commit --allow-empty -m "chore(web): verify cross-platform Firestore patterns and PII compliance"
```

---

## Task 6: Final Em Dash Scan and Build Verification

- [ ] **Step 1: Scan ALL new and modified files for em dashes**

```bash
grep -r '—\|\\u2014' src/pages/Habits.jsx src/pages/Goals.jsx src/pages/Tasks.jsx src/pages/Dashboard.jsx src/pages/Journal.jsx src/pages/Focus.jsx src/pages/BrainHealth.jsx src/pages/Insights.jsx src/components/dashboard/ src/components/habits/ src/components/focus/ src/components/brain/ src/components/insights/ src/components/celebrations/ src/constants/brainInsightsCopy.js src/constants/lapseEducation.js src/constants/weekInsightTemplates.js src/services/correlationEngine.service.js src/services/wellnessScore.service.js src/hooks/
```
Expected: No matches in user-facing text (code comments are fine).

- [ ] **Step 2: Run the full test suite**

```bash
cd C:/Users/kyler/wellness-app && npx react-scripts test --watchAll=false
```
Expected: All tests pass.

- [ ] **Step 3: Build for production**

```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Manual smoke test**

Navigate through all rebuilt pages in the browser:
1. `/dashboard` - All cards render
2. `/habits` - List, creation, completion flow
3. `/goals` - List, creation, progress
4. `/tasks` - List, filter, creation
5. `/journal` - Entries, AI prompts, mood
6. `/focus` - Pomodoro timer, Routines tab
7. `/brain-health` - All 7 widgets
8. `/insights` - Single-page layout, AI narrative
9. `/admin` - Still works, untouched
10. `/community` - Still works, untouched

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore(web): final Phase 1 verification - build passing, em dashes clean"
```

---

## Execution Summary

| Task | What It Delivers | Files |
|------|-----------------|-------|
| 1 | Streak modal aligned with mobile's gentle approach | 1 modified |
| 2 | QuietFinish copy matching mobile | 1 modified |
| 3 | ConfettiOverlay removed | 1 deleted + imports cleaned |
| 4 | Dead dashboard components removed | 5+ deleted |
| 5 | Cross-platform data verification | Documentation |
| 6 | Final em dash scan + build + smoke test | Verification |

**After this plan completes:** Phase 1 of web-mobile parity is done. The web app matches mobile's core experience for Dashboard, Habits, Goals, Tasks, Journal, Focus, Brain Health, Insights, Celebrations, Wellness Score, and Correlation Engine. Phase 2 (onboarding + education) and Phase 3 (removal of web-only features) can proceed independently.
