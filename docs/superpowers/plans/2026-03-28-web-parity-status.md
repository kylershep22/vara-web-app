# Web-Mobile Parity - Status & Next Steps

**Date:** 2026-03-28
**Branch:** feature/admin-dashboard

---

## Phase 1: COMPLETE (29/29 tasks)

All core experience parity work is done. The web app now matches mobile for:

- **Dashboard** - 11-card layout matching mobile (Welcome Back, Morning Check-In, Weekly Habits, Next Best Action, Quick Actions, 4-3-2-1, Week Insight, Brain Health Education, AI Daily Plan, Wellness Score, Insight Strip)
- **Habits** - Standalone page with sectioned creation form, completion modal (reflection + "Did you know?"), detail panel with consistency rhythm
- **Goals** - Standalone page with progress tracking, milestones, brain pillar badges
- **Tasks** - Standalone page with priority badges, simple list (Eisenhower matrix removed)
- **Journal** - Simplified to plain text, AI prompts, mood selector, weekly summary (rich text editor, reflections tab, voice input removed)
- **Focus** - 2-tab layout (Pomodoro + Routines), routine player with checklist/timed modes
- **Brain Health** - 7 interactive widgets replacing placeholder
- **Insights** - Single scrollable page with AI narrative (8-tab layout removed)
- **Celebrations** - Aligned with mobile's gentle brand (ConfettiOverlay removed, QuietFinish/StreakMilestone updated)
- **Navigation** - Sidebar restructured to match mobile (Habits/Goals/Tasks split, Discover section)
- **Data Layer** - Correlation engine, wellness score, weekly correlations hook all ported

### Files Created (~40 new)
- `src/constants/brainInsightsCopy.js`, `lapseEducation.js`, `weekInsightTemplates.js`
- `src/services/correlationEngine.service.js` + tests
- `src/services/wellnessScore.service.js`
- `src/hooks/useWeeklyCorrelations.js`, `useDashboardV2.js`
- 11 dashboard card components in `src/components/dashboard/`
- 4 habit components in `src/components/habits/`
- 2 focus components in `src/components/focus/`
- 7 brain health widgets in `src/components/brain/`
- 1 insights component in `src/components/insights/`
- `src/pages/Habits.jsx`, `Goals.jsx`, `Tasks.jsx`

### Files Deleted
- `src/components/dashboard/StatCard.jsx`, `CommunityHighlights.jsx`, `HabitTrackerWeekly.jsx`
- `src/components/tasks/TaskSection.jsx`, `TaskQuickAdd.jsx`
- `src/components/celebrations/ConfettiOverlay.jsx`
- `src/utils/confetti.js`
- `src/hooks/useDashboard.js`
- `canvas-confetti` dependency removed

### Key Fixes Applied During Phase 1
- Fixed broken `src/setupTests.js` (Firebase emulator setup was blocking all web tests)
- Fixed UTC date bug in `BrainReadinessWidget.jsx` (was using `toISOString()` instead of local timezone)
- Removed all user-facing em dashes from new code
- Verified no PII sent to OpenAI in weekly narrative endpoint

---

## Phase 2: NOT STARTED - Content & Education Parity

**Scope:**
- Expand web onboarding to capture same data as mobile's 11-screen flow
- Notification preference UI alignment with mobile settings
- Profile/Settings field sync

**Note:** User is planning mobile app changes that may affect what needs to happen here. Wait for mobile changes to stabilize before planning Phase 2.

---

## Phase 3: NOT STARTED - Consolidation & Removal

**Scope (user confirmed: remove these web-only features):**
- Mental Resilience page (5 tabs: Gratitude, Mindfulness, Emotional Check-In, Cognitive Reframing, Resilience Tracker)
- Fuel & Recovery page (6 tabs: Sleep, Breathwork, Stress Management, Movement, Nutrition, Wellness Vault)
- Standalone Reflections page
- Wheel of Life from old Insights (already removed from new Insights page)
- Nutrition, Wellness Vault, Binaural Beats/Focus Music sections
- Route cleanup, sidebar cleanup, dead import removal
- Firestore data stays intact (UI removal only)

**Note:** User may want to adjust this scope based on upcoming mobile changes. These pages still function at their old routes - nothing is broken, they're just no longer in the sidebar navigation.

---

## Important Context for Future Sessions

- **Mobile is source of truth** - Any feature on mobile should exist on web (except push notifications, haptics, and other native-only capabilities)
- **Admin Dashboard stays** - `/admin` route and all admin components are web-only and must not be touched
- **Old routes still work** - `/goals-habits`, `/mental-resilience`, `/fuel-recovery`, `/reflections`, `/library/*` all still function. New routes (`/habits`, `/goals`, `/tasks`, `/discover/*`) are active alongside them.
- **Legacy redirects in place** - `/library/breathwork` -> `/discover/breathwork`, etc.
- **SectionCard.jsx kept** - Still used by Settings and Admin pages
- **3 pre-existing test failures** - `profiles.service.test.js` and `PaywallScreen.test.js` fail due to Firebase auth mock issues (not caused by our work)
- **User is planning mobile app changes** - Phase 2 and 3 scope may need adjustment based on those changes
