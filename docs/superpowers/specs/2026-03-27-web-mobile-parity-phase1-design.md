# Web-Mobile Parity Phase 1 - Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Phase 1 of 3 - Core experience parity

---

## Overview

Bring the Vara wellness web app to feature parity with the mobile app. The mobile app is the source of truth. The web's Admin Dashboard is the only web-exclusive feature that stays.

Phase 1 covers the screens users touch daily: Dashboard, Habits, Goals, Tasks, Journal, Focus, Brain Health, Insights, and supporting systems (Wellness Score, Correlation Engine, Celebrations).

### Design Principles

- Mobile is the source of truth for features, copy, and data models
- Web adapts layouts for larger screens (2-column grids, single-page forms) but delivers identical functionality
- Same Firestore collections and document patterns - data entered on either platform shows on both
- No em dashes in user-facing copy
- Plain language, no scientific jargon (matching mobile's rewritten copy)
- Admin Dashboard stays untouched

---

## 1. Dashboard Rebuild

**Route:** `/dashboard`

Replace the current web dashboard entirely with a card-based layout matching mobile.

**Layout:** 2-column responsive grid on desktop (1280px+), single column below. Cards flow left-to-right, top-to-bottom.

**Cards (in order, matching mobile):**

| Card | Description | Data Source |
|------|------------|-------------|
| Welcome Back | Shows after 48+ hrs away. "Why habits can be hard" expandable section. Same copy pool as mobile. | `localStorage` last open timestamp |
| Morning Check-In | Energy (1-5) + Mood (1-5) inline form. | `morningCheckIns/{userId}_{date}` |
| Weekly Habits Tracker | 7-day grid with completion dots for up to 5 habits. Click to toggle. | `habits` + `habits/{id}/completions` |
| Next Best Action | Single intelligent recommendation based on wellness score pillars and time of day. | Computed from wellness data |
| Quick Actions Row | Journal + Focus shortcut buttons. | Static navigation |
| 4-3-2-1 Daily Practice | Expandable card for daily practice tracking. | `fourThreeTwoOne/{userId}_{date}` |
| Week Insight | Template-driven correlation insight + "See your full week story" link to Insights. | Correlation engine output |
| Brain Health Education | Daily rotating fact + "Try this" tip from `brainInsightsCopy.ts`. | Static copy, day-of-year rotation |
| AI Daily Plan | Generate/view personalized daily plan. | `/api/generate-daily-plan` |
| Wellness Score | Circular gauge (0-100), opt-in flow, pillar breakdown modal. | `dailyWellnessScores` |
| Brain Health Insight Strip | Single-line rotating insight. | Static copy from `brainInsightsCopy.ts` |

**Removed from current dashboard:**
- 4 stat cards row
- Eisenhower matrix task section
- Community highlights section

---

## 2. Habits Page

**Route:** `/habits` (replaces habits portion of `/goals-habits`)

### List View
- Active habits as cards: name, category badge, consistency indicator, today's completion toggle
- Subtitle: "Build consistency, one day at a time"
- Today's date banner
- "Add Habit" button
- Empty state: leaf icon + "Your habits live here" + "Start with one small thing that feels manageable."

### Creation Form (single-page with collapsible sections)
All mobile wizard data captured in one scrollable form:

| Section | Fields | Required |
|---------|--------|----------|
| Action | Habit name, frequency (daily/weekly/custom), category | Yes |
| Identity | Identity statement ("I am someone who...") | No |
| Intention | Why this matters, optional value alignment | No |
| Trigger | Time of day, cue description, brain state window hint | No |
| Scaling | Starting small version, full version, progression | No |
| Review | Summary before save | Auto |

### Completion Flow
Click completion toggle opens a modal:
- Reflection prompt: Smooth / Okay / Hard today
- Optional mood/note capture
- "Did you know?" micro-insight at bottom (from `brainInsightsCopy.ts`, category-matched)
- Affirming copy: "Captured." / "Showing up is the work." / "Hard days count the most."

### Detail View
Click habit card opens detail panel:
- Total completions, active days this week
- Consistency rhythm visualization (30-day dot pattern, not streak counter)
- Identity section
- Brain health insight note
- Edit/delete actions

### Removed
- AI-based habit suggestions panel
- Neurochemical tag lists
- Global habit calendar

---

## 3. Goals Page

**Route:** `/goals` (replaces goals portion of `/goals-habits`)

### Keep
- Goal creation: title, focus area, timeframe, brain pillar selection
- Progress tracking with percentage
- Filter by All/Active/Done

### Add
- Auto-generated milestones with celebration animation on completion
- Hover-reveal quick-update buttons (+5%, +10%)
- Empty state: leaf icon + "A fresh space for your goals" + "Add a goal whenever you're ready - no rush."
- Retry button on error state

### Remove
- Goal calendar view
- Goal-to-habit linking UI

---

## 4. Tasks Page

**Route:** `/tasks` (new standalone page)

### Change
- Replace Eisenhower 4-quadrant layout with simple list
- Filter chips: To Do / Done / All
- Priority badges (Low/Medium/High) on cards
- Inline completion toggle (checkbox)
- Modal for create/edit (title, description, priority)
- Empty state matching mobile

### Remove
- Eisenhower matrix layout
- Quick-add widget (was on dashboard)

---

## 5. Journal Page

**Route:** `/journal`

### Keep
- Entry creation with content, mood selector (5 levels), tags
- Search and filter by mood/tags
- Entries grouped by date
- AI weekly summary

### Add
- AI prompt suggestions ("Inspire Me" button calling `/api/journal-prompt`)
- Gentle Encouragement card when no recent entries
- 5-level mood matching mobile: Great / Good / Okay / Low / Difficult

### Change
- Replace rich text editor with plain text input (matching mobile's simpler approach)

### Remove
- Reflections tab (standalone Reflections page removed in Phase 3, tab removed now)
- Voice-to-text button

---

## 6. Focus Page

**Route:** `/focus`

### Tab Structure
Two tabs: **Pomodoro** | **Routines**

### Pomodoro Tab
**Keep:** Timer with circular progress, play/pause/reset, session logging
**Add:**
- Duration presets matching mobile: 10, 15, 25, 45, 60, 90 min
- Ambient sound selector
- Break prompt after completion
- Brain health tip card
- Task label input

### Routines Tab
**Build new (matching mobile):**
- Time-of-day selector: Morning / Evening / Bedtime / Custom
- Routine card with activity list and durations
- Create/edit routine with activity library
- Drag-to-reorder activities
- Routine player: step-through UI with timer (web-adapted, not full-screen overlay)
- Checklist vs. Timed mode toggle
- "Begin at your own pace" CTA
- Gentle reminder scheduling
- Routine templates for empty state

### Remove
- Focus Session History tab (insights covers analytics)
- Binaural Beats / Focus Music tab

---

## 7. Brain Health Dashboard

**Route:** `/brain-health`

Replace current placeholder with interactive widgets matching mobile:

| Widget | Description | Data |
|--------|-------------|------|
| AI Brain Insight | Daily AI-generated insight (2-3 sentences) | `/api/ai-chat` with brain metrics |
| Brain Readiness | Rate sleep/hydration/stress (1-5), computes 0-100 score | `brainMetrics/{userId}_{date}` |
| Focus Window | Optimal focus time based on circadian rhythm | Time-of-day computation |
| Neuroplasticity Tracker | Count of novel activities/learning experiences | `brainMetrics` |
| AMCC Challenge | "Do one hard thing" daily with type selection and reflection | `brainMetrics` |
| Nervous System Tools | Physiological sigh + panoramic vision with built-in timers | Session tracking |
| Weekly Brain Metrics | Chart of weekly brain health trends | Aggregated `brainMetrics` |

Brain health vocabulary toggle from settings affects this page (scientific terms vs. plain language).

---

## 8. Insights Page

**Route:** `/insights`

### Change
Replace 8-tab layout with single scrollable page matching mobile:

**Components (top to bottom):**
1. Time frame selector: Week / Month / Quarter / Year / All-time
2. AI Weekly Narrative (calls `/api/weekly-narrative`, cached 7 days)
3. Hero Summary card (key stats overview)
4. Sparkline Trend cards (habits, journal, focus minutes)
5. Ring Progress card (goals completion)
6. Habit Heatmap (30-day view)
7. Weekly Bar Chart (daily completions)
8. Consolidated metrics

### Add
- Correlation engine integration (ported from mobile)
- AI narrative with template fallback for offline

### Remove
- Wheel of Life tab
- Brain Health Hub tab (separate page now)
- AI Insights tab (replaced by inline narrative)
- Sleep Analytics tab (covered by Brain Health)
- 8-tab structure entirely

---

## 9. Celebrations System

### Keep
- QuietFinish (all habits completed, calm acknowledgment)
- GoalMilestoneCheckmark (visual celebration)
- AnimatedCheckbox (habit completion animation)
- StreakMilestoneModal (update copy below)

### Change - StreakMilestoneModal
- Trigger on total engagement days (7, 30, 60, 100), NOT consecutive streaks
- Never display the count to the user
- Rotate copy matching mobile:
  - "You've been taking care of yourself."
  - "Showing up, even briefly, is worth something."
  - "Whatever brought you back, it counts."
  - "You're building something that matters."
- Body: "Keep going at whatever pace works for you."

### Remove
- ConfettiOverlay (replaced by QuietFinish for calmer brand tone)

---

## 10. Wellness Score

**Build new (not currently on web):**

- Circular SVG gauge (0-100), color-coded (red < 40, amber 40-69, teal 70+)
- Opt-in card on dashboard (user chooses to enable)
- Pillar breakdown modal: Foundation (40%), Consistency (30%), Mind (20%), Growth (10%)
- Refresh button
- Trend indicator (up/down/stable arrow)
- Same 4-pillar weighted formula as mobile's `wellnessScore.service.ts`
- Reads from same Firestore collections

---

## 11. Correlation Engine (Web Port)

Port mobile's correlation engine to web:

- Copy `computeCorrelations()` function (pure TypeScript, no RN dependencies)
- Copy `selectWeekInsight()` template logic
- Copy `brainInsightsCopy.ts`, `lapseEducation.ts`, `weekInsightTemplates.ts` to `src/constants/`
- Build `useWeeklyCorrelations` hook adapted for web (same Firestore queries, localStorage cache instead of AsyncStorage)
- Feeds Week Insight dashboard card and AI narrative on Insights page

---

## 12. Navigation & Routing

### New Sidebar Structure

```
Home
  Dashboard

Track
  Habits
  Goals
  Tasks

Focus
  Pomodoro & Routines
  Brain Health

Discover
  Breathwork
  Sleep
  Movement
  Masterclass

Community
  Feed
  People

Journal

Insights

---
AI Companion
Profile
Settings
Admin (if eligible)
```

### Route Changes

| Old Route | New Route | Action |
|-----------|-----------|--------|
| `/goals-habits` | `/habits` + `/goals` | Split |
| `/tasks` | `/tasks` | New standalone |
| `/focus` | `/focus` | Restructure tabs |
| `/brain-health` | `/brain-health` | Rebuild |
| `/library` | `/discover` | Rename |
| `/library/breathwork` | `/discover/breathwork` | Rename |
| `/library/sleep` | `/discover/sleep` | Rename |
| `/library/movement` | `/discover/movement` | Rename |
| `/masterclass` | `/discover/masterclass` | Move under discover |
| `/insights` | `/insights` | Simplify |
| `/admin` | `/admin` | **No change** |

### Routes removed in Phase 1
- `/goals-habits` (replaced by `/habits` + `/goals`)

### Routes removed in Phase 3
- `/mental-resilience`
- `/fuel-recovery`
- `/reflections`

---

## 13. Copy Constants

Copy these files from `mobile/src/constants/` to `src/constants/`:
- `brainInsightsCopy.ts` (insight strip messages, education card items, completion insights)
- `lapseEducation.ts` (lapse education messages)
- `weekInsightTemplates.ts` (week insight template selection)

All user-facing copy must follow mobile's rules:
- No em dashes
- No scientific jargon
- Plain language, written like a friend

---

## Technical Considerations

### Shared Firestore Schema
Web and mobile read/write the same collections. No schema changes needed. Key collections:
- `habits`, `habits/{id}/completions/{date}`
- `goals`
- `tasks`
- `journalEntries`
- `morningCheckIns` (doc ID: `{userId}_{date}`)
- `brainMetrics` (doc ID: `{userId}_{date}`)
- `dailyWellnessScores`
- `focusSessions`
- `fourThreeTwoOne`

### Backend Endpoints
All existing endpoints work for web (same API). No backend changes needed for Phase 1:
- `/api/generate-daily-plan`
- `/api/journal-prompt`
- `/api/journal-summary`
- `/api/ai-chat`
- `/api/weekly-narrative`
- `/api/week-recap-suggestions`
- `/api/openai` (suggestions)

### Web Tech Stack
- React 19, Tailwind CSS, Firebase SDK, React Router v7
- Charts: Recharts (already used)
- No new dependencies expected beyond what's already installed

---

## Out of Scope (Phase 1)

- Admin Dashboard (stays as-is)
- Onboarding expansion (Phase 2)
- Removing web-only features (Phase 3: Mental Resilience, Fuel & Recovery, Reflections, Wheel of Life, Nutrition, Wellness Vault, Binaural Beats)
- Push notifications (web doesn't support these natively)
- Haptic feedback (web doesn't support this)
- Mobile-specific gestures (swipe, pull-to-refresh)
- Community pages (already at parity)
- Profile/Settings pages (mostly at parity, minor alignment in Phase 2)
- Discover/Library content pages (structure rename in routing, content stays as-is)

---

## Phase 2 & 3 Summary (for roadmap)

### Phase 2: Content & Education Parity
- Expand web onboarding to capture same data as mobile's 11-screen flow (as multi-step web form)
- Verify all brain health education copy is consistent
- Align notification preference UI with mobile's settings layout
- Sync profile/settings fields to match mobile

### Phase 3: Consolidation & Removal
- Remove Mental Resilience page (5 tabs, components, services)
- Remove Fuel & Recovery page (6 tabs, components, services)
- Remove standalone Reflections page
- Remove Wheel of Life from Insights
- Remove Nutrition, Wellness Vault, Binaural Beats, Stress Management
- Clean up sidebar, routes, imports, dead code
- Firestore data stays intact (features removed from UI only)
