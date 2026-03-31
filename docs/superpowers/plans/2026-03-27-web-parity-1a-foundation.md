# Web-Mobile Parity Phase 1A: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the foundation for web-mobile parity by porting copy constants, the correlation engine, wellness score service, and restructuring navigation/routing to match mobile's information architecture.

**Architecture:** Copy mobile's pure-TypeScript services (correlation engine, templates, copy constants) directly to the web `src/` directory, adapting only the caching layer (localStorage instead of AsyncStorage) and Firestore imports (web SDK instead of React Native Firebase). Restructure the sidebar and routes to match mobile's simpler navigation.

**Tech Stack:** React 19, React Router v7, Firebase web SDK, Tailwind CSS, localStorage

**Spec:** `docs/superpowers/specs/2026-03-27-web-mobile-parity-phase1-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/constants/brainInsightsCopy.js` | Plain-language brain health copy (insight strip, education card, completion insights) |
| `src/constants/lapseEducation.js` | Lapse recovery copy pool |
| `src/constants/weekInsightTemplates.js` | Week insight template selection logic |
| `src/services/correlationEngine.service.js` | Correlation computation (port from mobile) |
| `src/services/__tests__/correlationEngine.service.test.js` | Correlation engine tests |
| `src/hooks/useWeeklyCorrelations.js` | Data aggregation hook for web (localStorage cache) |
| `src/services/wellnessScore.service.js` | Wellness score calculation (port from mobile) |

### Modified Files

| File | Change |
|------|--------|
| `src/App.js` | Add new routes (`/habits`, `/goals`, `/tasks`), rename library routes to `/discover/*` |
| `src/components/layout/SidebarLayout.jsx` | Restructure navigation sections to match mobile |

---

## Task 1: Port Copy Constants from Mobile to Web

**Files:**
- Create: `src/constants/brainInsightsCopy.js`
- Create: `src/constants/lapseEducation.js`
- Create: `src/constants/weekInsightTemplates.js`

These are direct ports of the mobile TypeScript files to plain JavaScript (the web app uses .js, not .ts).

- [ ] **Step 1: Read the mobile source files**

Read these three files to get the exact content:
- `mobile/src/constants/brainInsightsCopy.ts`
- `mobile/src/constants/lapseEducation.ts`
- `mobile/src/constants/weekInsightTemplates.ts`

- [ ] **Step 2: Create brainInsightsCopy.js**

Copy the mobile file content to `src/constants/brainInsightsCopy.js`. Changes from mobile:
- Remove all TypeScript type annotations (`: string`, `: Record<string, string[]>`, etc.)
- Remove the `type` import from correlationEngine
- Keep all exported constants and functions identical: `INSIGHT_STRIP_MESSAGES`, `EDUCATION_CARD_ITEMS`, `COMPLETION_INSIGHTS`, `getCompletionInsight()`

- [ ] **Step 3: Create lapseEducation.js**

Copy to `src/constants/lapseEducation.js`. Remove TypeScript annotations.
Exports: `LAPSE_EDUCATION_MESSAGES`, `getLapseMessage()`

- [ ] **Step 4: Create weekInsightTemplates.js**

Copy to `src/constants/weekInsightTemplates.js`. Changes:
- Remove TypeScript type annotations and the `interface InsightTemplate` definition
- Remove the `import type { WeeklyCorrelations }` line
- Keep `selectWeekInsight()` and `formatDayName()` functions identical

- [ ] **Step 5: Commit**

```bash
git add src/constants/brainInsightsCopy.js src/constants/lapseEducation.js src/constants/weekInsightTemplates.js
git commit -m "feat(web): port plain-language copy constants from mobile"
```

---

## Task 2: Port Correlation Engine to Web

**Files:**
- Create: `src/services/correlationEngine.service.js`
- Create: `src/services/__tests__/correlationEngine.service.test.js`

- [ ] **Step 1: Read the mobile correlation engine**

Read `mobile/src/services/correlationEngine.service.ts` in full.

- [ ] **Step 2: Create the test file**

Create `src/services/__tests__/correlationEngine.service.test.js`. Port the mobile tests from `mobile/src/services/__tests__/correlationEngine.service.test.ts`:
- Remove TypeScript type annotations (`type DailyDataPoint`, `type WeeklyCorrelations`, `: Partial<DailyDataPoint>`)
- Keep all 7 test cases identical
- Import from `../correlationEngine.service` (no .ts extension)

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd C:/Users/kyler/wellness-app && npx react-scripts test --watchAll=false --testPathPattern="src/services/__tests__/correlationEngine"`
Expected: FAIL - cannot find module

- [ ] **Step 4: Create the correlation engine service**

Create `src/services/correlationEngine.service.js`. Port from mobile:
- Remove all TypeScript: `interface` blocks, type annotations (`: number`, `: string`, `| null`), `export interface`, `export type`
- Keep all functions identical: `avg()`, `dayScore()`, `getDayFactors()`, `computeCorrelations()`
- Use JSDoc comments for documentation instead of TypeScript types

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd C:/Users/kyler/wellness-app && npx react-scripts test --watchAll=false --testPathPattern="src/services/__tests__/correlationEngine"`
Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/correlationEngine.service.js src/services/__tests__/correlationEngine.service.test.js
git commit -m "feat(web): port correlation engine service with tests"
```

---

## Task 3: Create Web Correlation Data Hook

**Files:**
- Create: `src/hooks/useWeeklyCorrelations.js`

This is the web equivalent of mobile's `useWeeklyCorrelations.ts`, using web Firebase SDK imports and localStorage instead of AsyncStorage.

- [ ] **Step 1: Read the mobile hook for reference**

Read `mobile/src/hooks/useWeeklyCorrelations.ts` in full.

- [ ] **Step 2: Read the web Firebase and auth patterns**

Read `src/firebase.js` to confirm exports: `db` from Firestore.
Read `src/context/AuthContext.jsx` to confirm: `useAuth()` returns `{ user }`.
Read `src/services/db/habits.service.js` to see how habits are queried on web (the web may not have `getHabitCompletions` - check).

- [ ] **Step 3: Create the hook**

Create `src/hooks/useWeeklyCorrelations.js` with these adaptations from mobile:

**Imports:** Use web Firebase SDK:
```javascript
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { computeCorrelations } from '../services/correlationEngine.service';
```

**Cache:** Use `localStorage` instead of `AsyncStorage`:
```javascript
const CACHE_KEY = 'vara_weekly_correlations';
// Read: JSON.parse(localStorage.getItem(CACHE_KEY))
// Write: localStorage.setItem(CACHE_KEY, JSON.stringify({ date, data }))
```

**Data fetchers:** Same Firestore queries as mobile but using web SDK. The five fetchers:
1. `fetchMorningCheckIns(uid, dates)` - doc IDs: `{uid}_{date}` in `morningCheckIns`
2. `fetchBrainMetrics(uid, dates)` - doc IDs: `{uid}_{date}` in `brainMetrics`
3. `fetchJournalEntries(uid, start, end)` - query `journalEntries` by userId + createdAt range
4. `fetchFocusSessions(uid, start, end)` - query `focusSessions` by userId, filter by startedAt
5. `fetchHabitsAndCompletions(uid, dates)` - query active habits, then for each habit get completions subcollection

**Hook signature:**
```javascript
export function useWeeklyCorrelations() {
  // Returns: { correlations: object|null, loading: boolean }
}
```

**Key difference from mobile:** Web's habits service may not have `getHabitCompletions`. If not, query `habits/{habitId}/completions` directly using `getDocs(collection(db, 'habits', habitId, 'completions'))`.

All fetchers should catch errors gracefully and return empty results.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWeeklyCorrelations.js
git commit -m "feat(web): add useWeeklyCorrelations hook with localStorage caching"
```

---

## Task 4: Port Wellness Score Service to Web

**Files:**
- Create: `src/services/wellnessScore.service.js`

- [ ] **Step 1: Read the mobile wellness score service**

Read `mobile/src/services/firebase/wellnessScore.service.ts` in full to understand the 4-pillar calculation.

- [ ] **Step 2: Create the web wellness score service**

Create `src/services/wellnessScore.service.js`. Port from mobile with these changes:
- Remove TypeScript annotations
- Use web Firebase SDK imports: `import { db } from '../firebase'`
- Use `import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'`
- Keep the 4-pillar weighted formula identical:
  - Foundation (40%): sleep quality (20%), hydration (10%), stress (10%)
  - Consistency (30%): habit compliance (15%), 4-3-2-1 practice (10%), streak bonus (5%)
  - Mind (20%): mood (10%), journal activity (5%), nervous system regulation (5%)
  - Growth (10%): AMCC challenge (5%), connection (5%)

Key functions to port:
- `calculateWellnessScore(userId)` - Computes current score from all data sources
- `getWellnessScore(userId)` - Fetches today's cached score from `dailyWellnessScores/{userId}_{date}`
- `saveWellnessScore(userId, score, pillars)` - Saves to Firestore
- `getMorningCheckIn(userId)` - Fetches from `morningCheckIns/{userId}_{date}`
- `saveMorningCheckIn(userId, energyLevel, mood, note)` - Saves to `morningCheckIns/{userId}_{date}`

Document ID patterns must match mobile exactly so data syncs:
- `morningCheckIns/{userId}_{YYYY-MM-DD}`
- `dailyWellnessScores/{userId}_{YYYY-MM-DD}`
- `brainMetrics/{userId}_{YYYY-MM-DD}`

- [ ] **Step 3: Commit**

```bash
git add src/services/wellnessScore.service.js
git commit -m "feat(web): port wellness score service from mobile"
```

---

## Task 5: Restructure Sidebar Navigation

**Files:**
- Modify: `src/components/layout/SidebarLayout.jsx`

- [ ] **Step 1: Read the current sidebar**

Read `src/components/layout/SidebarLayout.jsx` in full. Identify the navigation items array/structure and how sections are defined.

- [ ] **Step 2: Replace the navigation sections**

Find the navigation configuration (the arrays/objects that define sidebar items and sections). Replace with the new structure matching mobile:

**New sections:**

```javascript
const navigationSections = [
  {
    title: 'Home',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  {
    title: 'Track',
    items: [
      { label: 'Habits', path: '/habits', icon: 'ClipboardCheck' },
      { label: 'Goals', path: '/goals', icon: 'Target' },
      { label: 'Tasks', path: '/tasks', icon: 'ListTodo' },
    ],
  },
  {
    title: 'Focus',
    items: [
      { label: 'Pomodoro & Routines', path: '/focus', icon: 'Timer' },
      { label: 'Brain Health', path: '/brain-health', icon: 'Brain' },
    ],
  },
  {
    title: 'Discover',
    items: [
      { label: 'Breathwork', path: '/discover/breathwork', icon: 'Wind' },
      { label: 'Sleep', path: '/discover/sleep', icon: 'Moon' },
      { label: 'Movement', path: '/discover/movement', icon: 'Activity' },
      { label: 'Masterclass', path: '/discover/masterclass', icon: 'GraduationCap' },
    ],
  },
  {
    title: 'Community',
    items: [
      { label: 'Feed', path: '/community', icon: 'Users' },
      { label: 'People', path: '/community/people', icon: 'UserSearch' },
    ],
  },
];

const standaloneItems = [
  { label: 'Journal', path: '/journal', icon: 'BookOpen' },
  { label: 'Insights', path: '/insights', icon: 'Lightbulb' },
];

// Bottom items stay the same:
// AI Companion, Profile, Settings, Admin (if eligible)
```

**Removed from sidebar:**
- "Goals & Habits" combined link (replaced by separate Habits + Goals)
- "Mental Resilience" link
- "Fuel & Recovery" link
- "Library" parent link (individual category pages listed under Discover)

**Keep sidebar behavior** (collapse/expand, mobile overlay, active highlighting) unchanged. Only the navigation items change.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/SidebarLayout.jsx
git commit -m "refactor(web): restructure sidebar navigation to match mobile"
```

---

## Task 6: Update Routes in App.js

**Files:**
- Modify: `src/App.js`

- [ ] **Step 1: Read the current App.js**

Read `src/App.js` in full.

- [ ] **Step 2: Add new routes**

Add these new routes inside the protected routes section (inside `SidebarLayout`):

```jsx
{/* New standalone pages (Phase 1A routes - pages built in Phase 1C) */}
<Route path="/habits" element={<ProtectedRoute><ErrorBoundary level="feature"><GoalsHabits defaultTab="habits" /></ErrorBoundary></ProtectedRoute>} />
<Route path="/goals" element={<ProtectedRoute><ErrorBoundary level="feature"><GoalsHabits defaultTab="goals" /></ErrorBoundary></ProtectedRoute>} />
<Route path="/tasks" element={<ProtectedRoute><ErrorBoundary level="feature"><GoalsHabits defaultTab="tasks" /></ErrorBoundary></ProtectedRoute>} />
```

Note: For now, `/habits` and `/goals` point to the existing `GoalsHabits` component with a `defaultTab` prop. Plan 1C will replace these with dedicated page components. If `GoalsHabits` doesn't accept a `defaultTab` prop, just render it for now - the proper pages come later.

- [ ] **Step 3: Rename library routes to discover**

Add new discover routes (keeping old library routes as redirects for bookmarks):

```jsx
{/* Discover routes (renamed from /library) */}
<Route path="/discover/breathwork" element={<ProtectedRoute><ErrorBoundary level="feature"><Breathwork /></ErrorBoundary></ProtectedRoute>} />
<Route path="/discover/sleep" element={<ProtectedRoute><ErrorBoundary level="feature"><Sleep /></ErrorBoundary></ProtectedRoute>} />
<Route path="/discover/movement" element={<ProtectedRoute><ErrorBoundary level="feature"><Movement /></ErrorBoundary></ProtectedRoute>} />
<Route path="/discover/masterclass" element={<ProtectedRoute><ErrorBoundary level="feature"><Masterclass /></ErrorBoundary></ProtectedRoute>} />

{/* Legacy redirects */}
<Route path="/library/breathwork" element={<Navigate to="/discover/breathwork" replace />} />
<Route path="/library/sleep" element={<Navigate to="/discover/sleep" replace />} />
<Route path="/library/movement" element={<Navigate to="/discover/movement" replace />} />
<Route path="/library" element={<Navigate to="/discover/breathwork" replace />} />
```

Add `Navigate` to the react-router-dom import if not already there.

- [ ] **Step 4: Keep existing routes intact**

Do NOT remove the existing `/goals-habits`, `/mental-resilience`, `/fuel-recovery`, or `/reflections` routes yet. They'll be removed in later phases. The old pages continue to work alongside the new routes.

Keep the `/admin` route completely untouched.

- [ ] **Step 5: Commit**

```bash
git add src/App.js
git commit -m "feat(web): add new routes for habits, goals, tasks, and discover"
```

---

## Task 7: Verify and Test Foundation

- [ ] **Step 1: Run correlation engine tests**

```bash
cd C:/Users/kyler/wellness-app && npx react-scripts test --watchAll=false --testPathPattern="src/services/__tests__/correlationEngine"
```
Expected: All 7 tests PASS

- [ ] **Step 2: Run the web app to verify no build errors**

```bash
cd C:/Users/kyler/wellness-app && npm start
```
Expected: App compiles without errors. Navigate to `/dashboard` - should still render the existing dashboard. Navigate to `/discover/breathwork` - should show the breathwork page. Sidebar should show the new navigation structure.

- [ ] **Step 3: Verify legacy routes still work**

Navigate to `/goals-habits` - should still render.
Navigate to `/library/breathwork` - should redirect to `/discover/breathwork`.
Navigate to `/admin` - should still render the admin dashboard (if admin user).

- [ ] **Step 4: Scan new files for em dashes**

```bash
grep -r '—' src/constants/brainInsightsCopy.js src/constants/lapseEducation.js src/constants/weekInsightTemplates.js src/services/correlationEngine.service.js src/services/wellnessScore.service.js src/hooks/useWeeklyCorrelations.js
```
Expected: No matches.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore(web): verify foundation build and test pass"
```

---

## Execution Summary

| Task | What It Delivers | Files |
|------|-----------------|-------|
| 1 | Copy constants for brain insights, lapse education, week templates | 3 new JS files in constants/ |
| 2 | Correlation engine with passing tests | 1 service + 1 test file |
| 3 | Data aggregation hook with localStorage caching | 1 new hook |
| 4 | Wellness score calculation service | 1 new service |
| 5 | Sidebar navigation matching mobile | 1 modified layout |
| 6 | Routes for habits, goals, tasks, discover | 1 modified App.js |
| 7 | Verification pass | Build + test confirmation |

**After this plan completes:** The web app has the same data services and navigation structure as mobile, but the actual page rebuilds happen in Plans 1B (Dashboard), 1C (Page Rebuilds), and 1D (Celebrations & Polish).
