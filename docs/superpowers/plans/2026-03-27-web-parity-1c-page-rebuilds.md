# Web-Mobile Parity Phase 1C: Page Rebuilds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Habits, Goals, Tasks, Journal, Focus, Brain Health, and Insights pages to match mobile's feature set and UX.

**Architecture:** Each page is rebuilt in-place (same route, modified component). Mobile is the source of truth for features and copy. Web adapts layouts for larger screens but delivers identical functionality. Existing Firestore services are reused where possible. New components are created in the appropriate component subdirectories.

**Tech Stack:** React 19, Tailwind CSS (Vara tokens), Firestore, React Router v7, Recharts (charts), lucide-react (icons)

**Spec:** `docs/superpowers/specs/2026-03-27-web-mobile-parity-phase1-design.md` (Sections 2-8)

**Depends on:** Plan 1A (foundation) and Plan 1B (dashboard) must be completed first.

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/pages/Habits.jsx` | Standalone habits page |
| `src/pages/Goals.jsx` | Standalone goals page |
| `src/pages/Tasks.jsx` | Standalone tasks page |
| `src/components/habits/HabitCreationForm.jsx` | Single-page sectioned creation form |
| `src/components/habits/HabitCompletionModal.jsx` | Completion flow with reflection + "Did you know?" |
| `src/components/habits/HabitDetailPanel.jsx` | Habit detail view with consistency rhythm |
| `src/components/habits/ConsistencyRhythm.jsx` | 30-day dot pattern visualization |
| `src/components/focus/RoutinesTab.jsx` | Routines management tab |
| `src/components/focus/RoutinePlayer.jsx` | Step-through routine execution UI |
| `src/components/brain/BrainReadinessWidget.jsx` | Sleep/hydration/stress daily check-in |
| `src/components/brain/FocusWindowIndicator.jsx` | Circadian focus time indicator |
| `src/components/brain/NeuroplasticityTracker.jsx` | Novel activity counter |
| `src/components/brain/AMCCChallengeCard.jsx` | Daily challenge with reflection |
| `src/components/brain/NervousSystemTools.jsx` | Breathing/vision exercises with timers |
| `src/components/brain/WeeklyBrainMetricsChart.jsx` | Weekly brain health trends |
| `src/components/brain/AIBrainInsightCard.jsx` | AI-generated daily brain insight |
| `src/components/insights/WeeklyNarrativeCard.jsx` | AI narrative (replaces 8-tab structure) |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/Journal.jsx` | Remove rich text editor, reflections tab, voice input; add AI prompts, plain text |
| `src/pages/Focus.jsx` | Restructure to 2 tabs (Pomodoro + Routines), add ambient sounds |
| `src/pages/BrainHealth.jsx` | Replace placeholder with 7 interactive widgets |
| `src/pages/Insights.jsx` | Replace 8-tab layout with single scrollable page + AI narrative |

---

## Task 1: Create Habits Page

**Files:**
- Create: `src/pages/Habits.jsx`
- Create: `src/components/habits/HabitCreationForm.jsx`
- Create: `src/components/habits/HabitCompletionModal.jsx`
- Create: `src/components/habits/HabitDetailPanel.jsx`
- Create: `src/components/habits/ConsistencyRhythm.jsx`

- [ ] **Step 1: Read mobile habit screens for reference**

Read:
- `mobile/src/screens/HabitsScreen.tsx` (list view)
- `mobile/src/components/habits/wizard/` (creation steps)
- `mobile/src/components/HabitCompletionSheet/StandardSheet.tsx` (completion flow)
- `mobile/src/components/habits/ConsistencyRhythm.tsx` (30-day visualization)

Also read `src/pages/GoalsHabits.jsx` and `src/components/habits/` to understand existing web patterns.

- [ ] **Step 2: Create ConsistencyRhythm.jsx**

30-day dot pattern visualization. Grid of 7 columns (days of week) x ~5 rows. Completed days = teal dots, missed = light gray dots, today = teal border. Shows an encouraging message based on completion rate:
- 80%+: "You're in a great flow!"
- 50-79%: "Building a solid rhythm."
- Recent activity: "You're building momentum."
- Low/none: "Every journey begins with a single step."

Props: `completions` (array of date strings), `habitId` (string)

- [ ] **Step 3: Create HabitCompletionModal.jsx**

Modal that opens on habit completion toggle. Contains:
- Reflection prompt chips: Smooth / Okay / Hard today
- Optional note text input
- Affirming copy after selection ("Captured." / "Showing up is the work." / "Hard days count the most.")
- "Did you know?" micro-insight at bottom from `getCompletionInsight(habit.category)` (Plan 1A)
- Save button that writes to `habits/{habitId}/completions/{date}`

Props: `habit`, `date`, `onComplete`, `onDismiss`

- [ ] **Step 4: Create HabitCreationForm.jsx**

Single-page form with collapsible sections matching mobile wizard data:

| Section | Fields | Required |
|---------|--------|----------|
| Action | Name, frequency (daily/weekly/custom), category dropdown | Yes |
| Identity | Identity statement text input | No |
| Intention | Why this matters textarea, value alignment dropdown | No |
| Trigger | Time of day, cue description, brain state window hint | No |
| Scaling | Start small text, full version text | No |
| Review | Summary of all filled fields, Save button | Auto |

Each section header is clickable to expand/collapse. Action section starts expanded, others collapsed. Save button calls `createHabit()` from `src/services/db/habits.service.js`.

- [ ] **Step 5: Create HabitDetailPanel.jsx**

Right-panel or modal showing habit details:
- Habit name, category badge
- Total completions count, active days this week
- ConsistencyRhythm component (30-day view)
- Identity statement (if set)
- Brain health insight note (from `brainInsightsCopy.js`)
- Edit and Delete buttons

- [ ] **Step 6: Create Habits.jsx page**

Main page at `/habits`:
- Header: "Habits" title + "Build consistency, one day at a time" subtitle
- Today's date banner
- List of active habits as cards (name, category badge, today's completion toggle)
- Click completion toggle opens HabitCompletionModal
- Click card opens HabitDetailPanel
- "Add Habit" button opens HabitCreationForm (as modal or inline panel)
- Empty state: leaf icon + "Your habits live here" + "Start with one small thing that feels manageable."
- Error state with retry button

Data: Uses existing `useHabits()` hook or queries `habits` collection directly.

- [ ] **Step 7: Update App.js route**

Replace the temporary `/habits` route (from Plan 1A) with the new Habits component:
```jsx
<Route path="/habits" element={<ProtectedRoute><ErrorBoundary level="feature"><Habits /></ErrorBoundary></ProtectedRoute>} />
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/Habits.jsx src/components/habits/HabitCreationForm.jsx src/components/habits/HabitCompletionModal.jsx src/components/habits/HabitDetailPanel.jsx src/components/habits/ConsistencyRhythm.jsx src/App.js
git commit -m "feat(web): add standalone Habits page matching mobile"
```

---

## Task 2: Create Goals Page

**Files:**
- Create: `src/pages/Goals.jsx`

- [ ] **Step 1: Read mobile GoalsScreen for reference**

Read `mobile/src/screens/GoalsScreen.tsx`.

- [ ] **Step 2: Create Goals.jsx**

Standalone page at `/goals`:
- Header: "Goals" + "Track your progress toward your dreams"
- Filter chips: All / Active / Done
- Goal cards with: title, focus area, progress bar, brain pillar badges, status badge
- Hover-reveal quick-update buttons (+5%, +10%)
- Full progress modal on click (percentage input + notes)
- Goal creation modal: title, focus area (4 categories), timeframe dropdown, brain pillar multi-select
- Auto-generated milestones with celebration on completion
- Empty state: leaf icon + "A fresh space for your goals" + "Add a goal whenever you're ready - no rush."
- Error state with retry button

Data: Uses `listGoals()`, `createGoal()`, `updateGoal()` from `src/services/db/goals.service.js`.

- [ ] **Step 3: Update App.js route**

Replace temporary `/goals` route with new Goals component.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Goals.jsx src/App.js
git commit -m "feat(web): add standalone Goals page matching mobile"
```

---

## Task 3: Create Tasks Page

**Files:**
- Create: `src/pages/Tasks.jsx`

- [ ] **Step 1: Read mobile TasksScreen for reference**

Read `mobile/src/screens/TasksScreen.tsx`.

- [ ] **Step 2: Create Tasks.jsx**

Standalone page at `/tasks`:
- Header: "Tasks"
- Filter chips: To Do / Done / All (with counts)
- Task cards with: title, description (truncated), priority badge (Low/Medium/High), checkbox toggle
- Create task modal: title, description textarea, priority selector
- Edit task modal: same fields
- Delete confirmation
- Empty states:
  - "Done" filter: "No completed tasks yet" + "Your completed tasks will appear here"
  - Others: "A clear space for what matters" + "Add tasks whenever something comes to mind."

No Eisenhower matrix. Simple flat list with priority badges.

Data: Queries `tasks` collection with `where('userId', '==', uid)`.

- [ ] **Step 3: Update App.js route**

Replace temporary `/tasks` route with new Tasks component.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Tasks.jsx src/App.js
git commit -m "feat(web): add standalone Tasks page matching mobile"
```

---

## Task 4: Rebuild Journal Page

**Files:**
- Modify: `src/pages/Journal.jsx`

- [ ] **Step 1: Read current Journal.jsx and mobile JournalScreen**

Read both `src/pages/Journal.jsx` (1013 lines) and `mobile/src/screens/JournalScreen.tsx`.

- [ ] **Step 2: Simplify the journal page**

Major changes:
1. **Remove** the Reflections tab (AM/PM reflections)
2. **Remove** the RichTextEditor - replace with a plain `<textarea>` for entry content
3. **Remove** the voice input button and all Speech Recognition code
4. **Keep** mood selector but align to mobile's 5 levels: Great / Good / Okay / Low / Difficult
5. **Keep** tag system
6. **Keep** search and filter by mood/tags
7. **Keep** entries grouped by date
8. **Add** "Inspire Me" button that calls `/api/journal-prompt` and shows 3 AI-generated prompts
9. **Add** Gentle Encouragement card when no recent entries (matching mobile)
10. **Keep** AI weekly summary

The page should go from ~1013 lines to a simpler ~400-500 line implementation. Remove all `journal_entries` collection queries (reflections). Only use `journalEntries` collection.

Remove `RichTextEditor` import and `DOMPurify` import. Remove `stripHtml()` utility. Entry content is now plain text stored in `content` field (not `text` with HTML).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Journal.jsx
git commit -m "refactor(web): simplify journal to plain text, remove reflections and voice input"
```

---

## Task 5: Rebuild Focus Page

**Files:**
- Modify: `src/pages/Focus.jsx`
- Create: `src/components/focus/RoutinesTab.jsx`
- Create: `src/components/focus/RoutinePlayer.jsx`

- [ ] **Step 1: Read current Focus.jsx and mobile focus screens**

Read `src/pages/Focus.jsx` (116 lines), `mobile/src/screens/Focus/RoutinesTab.tsx`, and `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx`.

- [ ] **Step 2: Restructure Focus page to 2 tabs**

Change from 4 tabs to 2:
1. **Pomodoro** - Keep existing PomodoroTimer component. Add:
   - Task label input
   - Duration presets matching mobile: 10, 15, 25, 45, 60, 90 min
   - Ambient sound selector (dropdown with sound options)
   - Break prompt after completion
   - Brain health tip card
2. **Routines** - New tab using RoutinesTab component

Remove: History tab, Focus Music (Binaural Beats) tab.

- [ ] **Step 3: Create RoutinesTab.jsx**

Time-of-day selector: Morning / Evening / Bedtime / Custom buttons.
Active routine card showing:
- Routine name
- Activity list with durations
- "Begin at your own pace" button (opens RoutinePlayer)
- Edit button (opens routine editor)
- Drag-to-reorder activities
- Checklist vs. Timed mode toggle
- Reminder scheduling

Empty state with routine templates if no routine exists for selected time.

Create/edit routine: modal with activity name, duration, and reordering.

Data: Reads/writes `routines` collection in Firestore (same as mobile).

- [ ] **Step 4: Create RoutinePlayer.jsx**

Web-adapted step-through UI (not full-screen overlay like mobile):
- Current activity name and timer
- Progress indicator (step X of Y)
- Next/Skip/Pause controls
- Checklist mode: tap to mark complete, no timer
- Timed mode: countdown timer per activity
- Completion summary

- [ ] **Step 5: Update Focus.jsx**

Replace the 4-tab structure with 2 tabs. Remove imports for FocusSessionHistory and BinauraBeatsLibrary. Add imports for RoutinesTab.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Focus.jsx src/components/focus/RoutinesTab.jsx src/components/focus/RoutinePlayer.jsx
git commit -m "feat(web): rebuild Focus page with Routines tab, remove History and Music tabs"
```

---

## Task 6: Rebuild Brain Health Dashboard

**Files:**
- Modify: `src/pages/BrainHealth.jsx`
- Create: `src/components/brain/BrainReadinessWidget.jsx`
- Create: `src/components/brain/FocusWindowIndicator.jsx`
- Create: `src/components/brain/NeuroplasticityTracker.jsx`
- Create: `src/components/brain/AMCCChallengeCard.jsx`
- Create: `src/components/brain/NervousSystemTools.jsx`
- Create: `src/components/brain/WeeklyBrainMetricsChart.jsx`
- Create: `src/components/brain/AIBrainInsightCard.jsx`

- [ ] **Step 1: Read mobile brain health components**

Read:
- `mobile/src/screens/BrainHealthDashboard.tsx`
- `mobile/src/components/brain/AIBrainInsightCard.tsx`
- Key widget files in `mobile/src/components/brain/`

- [ ] **Step 2: Create BrainReadinessWidget**

Daily check-in: rate sleep quality (1-5), hydration (1-5), stress level (1-5). Computes readiness score (0-100). Saves to `brainMetrics/{userId}_{date}`. Shows current day's values or input form if not yet completed.

- [ ] **Step 3: Create FocusWindowIndicator**

Shows optimal focus time based on circadian rhythm. 4 brain state windows:
- 6am-10am: Creative, receptive
- 10am-2pm: Peak focus
- 2pm-5pm: Declining, good for movement
- 5pm-12am: Reflection, connection

Highlights current window. Plain language descriptions (no jargon).

- [ ] **Step 4: Create NeuroplasticityTracker**

Counter for novel activities/learning experiences. "Log a new experience" button. Shows count for the day and trend for the week. Saves to `brainMetrics` document.

- [ ] **Step 5: Create AMCCChallengeCard**

"Do one hard thing" daily challenge. Type selector: cold exposure, difficult movement, uncomfortable conversation, skill practice. Reflection text input after completion. Streak counter. Saves to `brainMetrics`.

- [ ] **Step 6: Create NervousSystemTools**

Two exercises:
1. Physiological sigh - guided breathing with timer (inhale-inhale-exhale pattern)
2. Panoramic vision - timed exercise (expand visual field)

Each has start/stop button, timer display, and session counter.

- [ ] **Step 7: Create WeeklyBrainMetricsChart**

Bar/line chart using Recharts showing past 7 days of brain readiness scores. X-axis: days, Y-axis: 0-100.

- [ ] **Step 8: Create AIBrainInsightCard**

Calls `/api/ai-chat` with brain metrics context. Shows 2-3 sentence daily insight. Loading state while generating. Caches for the day in localStorage.

- [ ] **Step 9: Rewrite BrainHealth.jsx**

Replace placeholder with scrollable page containing all 7 widgets:
1. AIBrainInsightCard
2. BrainReadinessWidget
3. FocusWindowIndicator
4. NeuroplasticityTracker
5. AMCCChallengeCard
6. NervousSystemTools
7. WeeklyBrainMetricsChart

2-column grid on desktop, single column on mobile. Brain health vocabulary toggle from settings affects terminology on this page.

- [ ] **Step 10: Commit**

```bash
git add src/pages/BrainHealth.jsx src/components/brain/BrainReadinessWidget.jsx src/components/brain/FocusWindowIndicator.jsx src/components/brain/NeuroplasticityTracker.jsx src/components/brain/AMCCChallengeCard.jsx src/components/brain/NervousSystemTools.jsx src/components/brain/WeeklyBrainMetricsChart.jsx src/components/brain/AIBrainInsightCard.jsx
git commit -m "feat(web): rebuild Brain Health page with 7 interactive widgets"
```

---

## Task 7: Rebuild Insights Page

**Files:**
- Modify: `src/pages/Insights.jsx`
- Create: `src/components/insights/WeeklyNarrativeCard.jsx`

- [ ] **Step 1: Read current Insights.jsx and mobile InsightsScreen**

Read `src/pages/Insights.jsx` (78 lines) and `mobile/src/screens/InsightsScreen.tsx`.

- [ ] **Step 2: Create WeeklyNarrativeCard**

AI-generated weekly narrative at top of insights. Uses `useWeeklyCorrelations()` (Plan 1A) to get correlation data. On first visit of the week, calls `/api/weekly-narrative` with anonymized data. Caches response in localStorage for 7 days. Falls back to template text on error.

Shows loading skeleton while generating. Card styling matches other insight cards.

- [ ] **Step 3: Rewrite Insights.jsx**

Replace 8-tab layout with single scrollable page:

1. Time frame selector: Week / Month / Quarter / Year / All-time (chip buttons)
2. WeeklyNarrativeCard (AI narrative, only for "Week" timeframe)
3. Hero summary card (key stats: days active, completions, streaks)
4. Sparkline trend cards (habits, journal, focus) - use Recharts
5. Ring progress card (goals completion percentage) - SVG donut chart
6. Habit heatmap (30-day grid) - custom component
7. Weekly bar chart (daily completions) - Recharts BarChart
8. Consolidated metrics card

Remove: Wheel of Life tab, Brain Health Hub tab, AI Insights tab, Sleep Analytics tab (all removed per spec).

Keep the existing analytics components that align with the new structure (HabitsAnalytics, GoalsProgress, FocusAnalytics). Remove or don't render the ones being cut.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Insights.jsx src/components/insights/WeeklyNarrativeCard.jsx
git commit -m "feat(web): rebuild Insights as single scrollable page with AI narrative"
```

---

## Task 8: Verify All Page Rebuilds

- [ ] **Step 1: Navigate to each rebuilt page and verify rendering**

Test each route in the browser:
- `/habits` - list renders, creation form opens, completion modal works
- `/goals` - list renders, creation modal works, progress update works
- `/tasks` - list renders, filter chips work, creation modal works
- `/journal` - entries load, plain text input works, AI prompts generate, mood selector works
- `/focus` - Pomodoro timer works, Routines tab shows time-of-day selector
- `/brain-health` - All 7 widgets render, check-in saves to Firestore
- `/insights` - Single-page layout, narrative card loads, charts render

- [ ] **Step 2: Verify old routes still work during transition**

- `/goals-habits` - should still render (existing page untouched)
- `/admin` - should still render

- [ ] **Step 3: Scan all new files for em dashes**

```bash
grep -r '—' src/pages/Habits.jsx src/pages/Goals.jsx src/pages/Tasks.jsx src/components/habits/ src/components/focus/RoutinesTab.jsx src/components/focus/RoutinePlayer.jsx src/components/brain/ src/components/insights/WeeklyNarrativeCard.jsx
```
Expected: No matches.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore(web): verify all page rebuilds compile and render"
```

---

## Execution Summary

| Task | What It Delivers | New/Modified Files |
|------|------------------|--------------------|
| 1 | Habits page with creation form, completion modal, detail panel, consistency rhythm | 5 new + 1 modified |
| 2 | Goals standalone page | 1 new + 1 modified |
| 3 | Tasks standalone page | 1 new + 1 modified |
| 4 | Journal simplification | 1 modified |
| 5 | Focus page with Routines tab | 2 new + 1 modified |
| 6 | Brain Health dashboard with 7 widgets | 8 new + 1 modified |
| 7 | Insights page with AI narrative | 1 new + 1 modified |
| 8 | Verification | Build check |
