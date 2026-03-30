# Web-Mobile Parity Roadmap

**Date:** 2026-03-30
**Status:** Active
**Source of Truth:** Mobile app

## Goal

Align the web app's user-facing features with the mobile app. The mobile app is the source of truth for what features exist and how they work. The web app retains its Admin dashboard as a web-only feature.

## Phases

### Phase 1: Dashboard V2 Alignment -- COMPLETE
Replace the web's V1 dashboard with the mobile's V2 paradigm:
- Brain State Check-in (replaces Morning Check-in)
- Today's Protocol Card (driven by brain state)
- Daily Reflection (appears after all habits completed)
- Weekly Habits Tracker
- Week Insight Card with link to Insights
- Brain State Week Trend (7-day dots + summary)
- Remove: Quick Actions Row, 4-3-2-1 Card, AI Daily Plan Card, Wellness Score Card, Brain Health Education Card

### Phase 2: Identity-Based Habits
Upgrade web habits to match mobile's richer model:
- Who you're becoming (identity statement)
- Three versions: Full, Quick, Just Show Up
- Reflection on completion (satisfaction, difficulty, value alignment)
- Bounce-back system (Never Miss Twice)
- Implementation intention (When/Where plan)
- Category badges aligned with mobile

### Phase 3: Routines System
New feature for web:
- Morning/Evening/Bedtime/Custom routine types
- Routine editor with drag-to-reorder activities
- Active Routine Player (checklist and timed modes)
- Reminder integration

### Phase 4: Onboarding V2
Streamline web onboarding to match mobile's 3-step flow:
- Welcome screen
- Brain state check-in
- Protocol selection
- Remove: Insight, Activity, Confirmation, Profile, Set Goal steps

### Phase 5: Settings & Notifications Parity
- Quiet Hours (start/end time)
- Notification categories (Daily Rhythm, Insights & Learning, Social, Milestones)
- Completion sound selector
- Muted accounts management

### Phase 6: AI Chat Alignment
- Move from dedicated /ai page to floating action button + modal
- Context-aware chat (current screen, habits, brain state)
- Remove: Mood Check-in tab, Micro Coaching tab, AI Reflections tab (fold into chat context)

### Phase 7: Community Parity
- Add post types (update, win, reflection, ask)
- Add report flow (reason → detail → confirmation)
- Add mute user functionality
- Add community orientation card for new users

### Phase 8: Library & Insights Polish
- Align Insights visualizations (habit heatmap, at-a-glance sparklines)
- Add Discover hub as library entry point
- Add Podcast section
- Ensure Masterclass alignment

## Web Pages to Remove

These web-only pages have no mobile equivalent and should be removed:
- `/brain-health` — Brain Health Dashboard (brain state check-in moves to dashboard)
- `/mental-resilience` — Mental Resilience page
- `/fuel-recovery` — Fuel & Recovery page
- `/sleep` — Sleep Recovery standalone page (sleep content stays in Library)
- `/reflections` — Reflections page (journal covers this)

## Web Pages to Keep (Web-Only)

- `/admin` — Admin Dashboard (all tabs: Overview, Analytics, Users, Moderation, Challenges)

## Notes

- Each phase gets its own spec and implementation plan
- Phases are independent and can be built/shipped incrementally
- Web navigation (sidebar) stays as-is since web ≠ mobile nav patterns
- Web maintains responsive design (not trying to look like the mobile app)
