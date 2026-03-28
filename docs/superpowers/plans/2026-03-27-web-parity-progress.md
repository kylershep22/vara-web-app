# Web-Mobile Parity Phase 1 - Progress Tracker

**Last Updated:** 2026-03-28
**Branch:** feature/admin-dashboard

---

## Overall Status

| Plan | Status | Tasks | Description |
|------|--------|-------|-------------|
| **1A: Foundation** | COMPLETE | 7/7 | Copy constants, correlation engine, wellness score, sidebar, routing |
| **1B: Dashboard** | COMPLETE | 8/8 | 11 dashboard cards, data hook, page rewrite |
| **1C: Page Rebuilds** | COMPLETE | 8/8 | Habits, Goals, Tasks, Journal, Focus, Brain Health, Insights |
| **1D: Celebrations & Polish** | COMPLETE | 6/6 | Celebration alignment, dead code cleanup, verification |

---

## What's Been Built (1A + 1B)

### Plan 1A: Foundation (Complete)

**New files created:**
- `src/constants/brainInsightsCopy.js` - Plain-language brain health copy
- `src/constants/lapseEducation.js` - Lapse recovery copy pool
- `src/constants/weekInsightTemplates.js` - Week insight template selection
- `src/services/correlationEngine.service.js` - Correlation computation (7 passing tests)
- `src/services/__tests__/correlationEngine.service.test.js` - Correlation engine tests
- `src/hooks/useWeeklyCorrelations.js` - Data aggregation hook (localStorage cache)
- `src/services/wellnessScore.service.js` - 4-pillar wellness score calculation

**Modified files:**
- `src/components/layout/SidebarLayout.jsx` - Restructured navigation (Habits/Goals/Tasks split, Discover section)
- `src/App.js` - Added /habits, /goals, /tasks, /discover/* routes with legacy redirects
- `src/setupTests.js` - Fixed broken Firebase emulator setup that was blocking all web tests

### Plan 1B: Dashboard (Complete)

**New files created (11 card components):**
- `src/components/dashboard/WelcomeBackCard.jsx` - Return-after-absence with lapse education
- `src/components/dashboard/MorningCheckInCard.jsx` - Energy + mood daily check-in
- `src/components/dashboard/WeeklyHabitsCard.jsx` - 7-day habit completion grid
- `src/components/dashboard/NextBestActionCard.jsx` - Intelligent single recommendation
- `src/components/dashboard/QuickActionsRow.jsx` - Journal + Focus shortcuts
- `src/components/dashboard/FourThreeTwoOneCard.jsx` - 4-3-2-1 daily practice
- `src/components/dashboard/WeekInsightCard.jsx` - Correlation-driven insight teaser
- `src/components/dashboard/BrainHealthEducationCard.jsx` - Daily rotating brain fact + tip
- `src/components/dashboard/AIDailyPlanCard.jsx` - AI-generated daily plan
- `src/components/dashboard/WellnessScoreCard.jsx` - SVG circular gauge (0-100)
- `src/components/dashboard/WellnessScoreBreakdown.jsx` - Pillar breakdown modal
- `src/components/dashboard/BrainHealthInsightStrip.jsx` - Single-line rotating insight

**New hook:**
- `src/hooks/useDashboardV2.js` - Aggregates data for all 11 cards

**Rewritten:**
- `src/pages/Dashboard.jsx` - Full rewrite from stat-card layout to mobile-matching card grid (138 lines vs old 336+)

---

## What's Next (1C + 1D)

### Plan 1C: Page Rebuilds (8 tasks)
Plan file: `docs/superpowers/plans/2026-03-27-web-parity-1c-page-rebuilds.md`

1. **Habits page** - New standalone page with sectioned creation form, completion modal with reflection + "Did you know?", detail panel with consistency rhythm, 5 new components
2. **Goals page** - Standalone page with milestones, hover-reveal progress buttons
3. **Tasks page** - Standalone page replacing Eisenhower matrix with simple list + priority badges
4. **Journal rebuild** - Remove rich text editor + reflections tab + voice input, add AI prompts + plain text
5. **Focus rebuild** - Restructure to 2 tabs (Pomodoro + Routines), add routine player
6. **Brain Health dashboard** - Replace placeholder with 7 interactive widgets (8 new components)
7. **Insights rebuild** - Replace 8-tab layout with single scrollable page + AI narrative
8. **Verification** - Build check, em dash scan, route testing

### Plan 1D: Celebrations & Polish (6 tasks)
Plan file: `docs/superpowers/plans/2026-03-27-web-parity-1d-celebrations-polish.md`

1. Update StreakMilestoneModal (engagement days, not streaks; mobile copy)
2. Update QuietFinish copy to match mobile rotation
3. Remove ConfettiOverlay (calmer brand)
4. Remove dead dashboard components (StatCard, SectionCard, TaskSection, etc.)
5. Cross-platform Firestore data verification
6. Final em dash scan + production build check

---

## After Phase 1 Completes

### Phase 2: Content & Education Parity (not yet planned)
- Expand web onboarding to match mobile's 11-screen data collection
- Notification preference UI alignment
- Profile/Settings field sync

### Phase 3: Consolidation & Removal (not yet planned)
- Remove Mental Resilience page (5 tabs)
- Remove Fuel & Recovery page (6 tabs)
- Remove Reflections standalone page
- Remove Wheel of Life, Nutrition, Wellness Vault, Binaural Beats
- Navigation cleanup, dead code removal
- Firestore data stays intact (UI removal only)

---

## Known Issues

- 3 pre-existing web test failures in `profiles.service.test.js` and `PaywallScreen.test.js` due to Firebase auth initialization in test environment. Not caused by our changes. The `setupTests.js` fix we made resolved the correlation engine tests but these other suites have deeper Firebase mock issues.
- Old `/goals-habits` route still exists alongside new `/habits` and `/goals` routes (both currently render the same GoalsHabits component). Will be properly split in Plan 1C Task 1-2.
- `/tasks` route currently shows a placeholder page. Will be built in Plan 1C Task 3.
