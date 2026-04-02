# Web-Mobile Parity Audit

**Last Updated:** 2026-04-01
**Mobile = source of truth** | Admin-only web features excluded

> **Note:** Previous version (2026-03-31) was inaccurate — it was written before all 8 phase branches were merged to main. Many features listed as "Missing" were actually built. This version reflects the **verified current state** of both codebases.

---

## Legend

- **Parity** — feature exists on both platforms with equivalent functionality
- **Partial** — feature exists on web but is missing significant mobile capabilities
- **Missing** — feature exists on mobile but not on web
- **Web-only** — exists on web but not mobile (may be intentional or legacy)
- **Unwired** — component exists on web but is not routed/accessible

---

## 1. Authentication & Onboarding

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Email/password login | Yes | Yes | Parity |
| Signup | Yes | Yes | Parity |
| Forgot password | Yes | Yes | Parity |
| Email verification screen | Yes | Handled via AuthAction | Parity (different UX, same function) |
| Onboarding (6-step) | Yes | Yes | Parity |
| Onboarding: Personalized Entry screen | Yes | No | **Missing** — low priority, web goes straight to confirmation |

---

## 2. Dashboard

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Greeting + date | Yes | Yes | Parity |
| Brain State Check-in | Yes | Yes | Parity |
| Today's Protocol Card | Yes | Yes | Parity |
| Daily Reflection Card | Yes | Yes | Parity |
| Weekly Habits Tracker | Yes | Yes | Parity |
| Week Insight Card | Yes | Yes | Parity |
| Morning Check-in (energy + mood) | Yes | Yes | Parity |
| 4-3-2-1 Daily Practice | Yes | Yes | Parity |
| Wellness Score Card + Breakdown | Yes | Yes | Parity |
| AI Daily Plan Card | Yes | Yes | Parity |
| Next Best Action Card | Yes | Yes | Parity |
| Quick Actions Row | Yes | Yes | Parity |
| Welcome Back Card | Yes | Yes | Parity |
| Brain Health Insight Strip | Yes | Yes | Parity |
| Brain Health Education Card | Yes | Yes | Parity |
| Notification Opt-In Card | Yes | No | **Missing** — web has no push notification infra, low priority |

---

## 3. Habits

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Habit CRUD | Yes | Yes | Parity |
| Identity-based creation wizard | Yes | Yes | Parity |
| Scaling versions (full/quick/just-show-up) | Yes | Yes | Parity |
| Completion reflections | Yes | Yes | Parity |
| Connection-category reflections | Yes | Yes | Parity |
| Intention system | Yes | Yes | Parity |
| Cognitive reserve flags | Yes | Yes | Parity |
| Streak tracking | Yes | Yes | Parity |
| Habit Detail Screen (view/edit/history) | Yes | No | **Missing** — mobile has dedicated detail screen with edit, delete, intention edit, insights |
| Bounce-back system ("never miss twice") | Yes | No | **Missing** — `missedYesterday`, `consecutiveMisses` tracking + messaging |
| Version tracking on completion | Yes | No | **Partial** — mobile tracks which scaling version was completed |

---

## 4. Goals

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Goal CRUD | Yes | Yes | Parity |
| Goal creation wizard | Yes | Yes | Parity |
| Progress tracking | Yes | Yes | Parity |
| Milestone system | Yes | Yes | Partial — mobile has milestone suggestions from templates |

---

## 5. Tasks

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Task CRUD | Yes | Yes | Parity |
| Priority levels | Yes | Yes | Parity |
| Due dates | Yes | Yes | Parity |
| Task Detail Screen | Yes | No | **Missing** — mobile has dedicated detail screen; web uses inline editing |

---

## 6. Journal

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Entry creation | Yes | Yes | Parity |
| Mood tracking | Yes | Yes | Parity |
| Tag system | Yes | Yes | Parity |
| AI prompts | Yes | Yes | Parity |
| Weekly summaries | Yes | Yes | Parity |
| Rich text editor | No | Yes | Web-only (Tiptap) |

---

## 7. Focus & Routines

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Pomodoro timer | Yes | Yes | Parity |
| Routine CRUD | Yes | Yes | Parity |
| Routine Player (checklist + timed) | Yes | Yes | Parity |
| Session logging | Yes | Yes | Parity |
| Ambient sound selector | Yes | Yes | Partial — web has binaural beats library, mobile has ambient sounds in timer |
| Duration presets (25/45/60+) | Yes | No | **Missing** — mobile has shortcut chips |
| Break prompts | Yes | No | **Missing** |
| Activity selection in timer | Yes | No | **Missing** — mobile selects what you're focusing on |

---

## 8. Community

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Feed with posts | Yes | Yes | Parity |
| Post types (update/win/reflection/ask) | Yes | Yes | Parity |
| Post type filtering | Yes | Yes | Parity |
| Likes and comments | Yes | Yes | Parity |
| Groups (public/private) | Yes | Yes | Parity |
| People search/discovery | Yes | Yes | Parity |
| Direct messaging | Yes | Yes | Parity |
| Connection requests | Yes | Yes | Parity |
| Report flow (3-stage) | Yes | Yes | Parity |
| Mute user from post | Yes | Yes | Parity |
| Community orientation card | Yes | Yes | Parity |
| Post creation with images | Yes | Yes | Parity |
| Edit post | Yes | No | **Missing** — mobile has EditPostModal |
| Suggested connections | Yes | No | **Missing** — mobile suggests connections with reasons |
| Mutual connections display | Yes | No | **Missing** |
| Group prompts (weekly) | Yes | No | **Missing** — mobile has SetPromptModal |
| Invite members modal | Yes | No | **Missing** — mobile has invite flow for groups/challenges |
| Challenge leaderboards | Yes | Partial | **Partial** — web has challenge pages but leaderboard/check-in UI is limited |
| Quick status card | Yes | No | **Missing** — mobile has quick status update card |

---

## 9. AI Features

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| AI Chat FAB + modal | Yes | Yes | Parity |
| Context-aware (page, habits, brain state) | Yes | Yes | Parity |
| Quick prompts | Yes | Yes | Parity |
| AI Daily Plan generation | Yes | Yes | Parity |
| AI Next Best Action | Yes | Yes | Parity |
| AI Brain Insights | Yes | Yes | Parity (in BrainHealth page) |

---

## 10. Discover / Library

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Discover hub | Yes | Yes | Parity |
| Breathwork library | Yes | Yes | Parity |
| Sleep library | Yes | Yes | Parity |
| Movement library | Yes | Yes | Parity |
| Masterclass | Yes | Yes | Parity |
| Content detail screens | Yes | No | **Missing** — mobile has BreathworkDetail, SleepDetail, MovementDetail, MasterclassDetail |
| Favorites/bookmarking | Yes | No | **Missing** — mobile has useSleepFavorites |
| Podcast integration | Yes | No | **Missing** — mobile has PodcastEpisodeScreen |

---

## 11. Insights & Analytics

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Overview dashboard | Yes | Yes | Parity |
| Habit analytics | Yes | Yes | Parity |
| Habit heatmap | Yes | Yes | Parity |
| Sparkline trend cards | Yes | Yes | Parity |
| Goal progress | Yes | Yes | Parity |
| Focus analytics | Yes | Yes | Parity |
| Sleep analytics | Yes | Yes | Parity |
| Wheel of Life | Yes | Yes | Parity |
| AI insights tab | Yes | Yes | Parity |
| Narrative recap | Yes | Yes | Parity |
| Insight chips on narrative | Yes | No | **Missing** — mobile has tappable chips linking to correlation cards |
| CorrelationCard widget | Yes | No | **Missing** — mobile has primary/secondary animated bar comparison cards |
| BrainStateDistribution widget | Yes | No | **Missing** — mobile has brain state bar chart with period comparison |
| WeekOverWeekSummary widget | Yes | No | **Missing** — mobile has 3-metric summary with delta indicators |
| Strongest days on heatmap | Yes | No | **Missing** — mobile shows strongest days insight line below heatmap |

---

## 12. Settings & Notifications

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Notification preferences (V2) | Yes | Yes | Parity |
| Quiet hours | Yes | Yes | Parity |
| Category toggles | Yes | Yes | Parity |
| Completion sound selector | Yes | Yes | Parity |
| Muted accounts | Yes | Yes | Parity |
| Profile editing | Yes | Yes | Parity |
| Privacy settings | Yes | Yes | Parity |

---

## 13. Profile

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| View own profile | Yes | Yes | Parity |
| Edit profile | Yes | Yes | Parity |
| View other user profiles | Yes | Yes | Parity |
| Profile stats | Yes | Yes | Parity |
| Profile groups display | Yes | Yes | Parity |

---

## 14. Brain Health (Dedicated System)

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Brain State Check-in | Yes | Yes | Parity |
| Brain State Protocols | Yes | Yes | Parity |
| Brain Readiness Widget | Yes | Yes | **Unwired** — `BrainReadinessWidget.jsx` built, page not routed |
| Focus Window Indicator | Yes | Yes | **Unwired** — `FocusWindowIndicator.jsx` built, page not routed |
| AMCC Challenge | Yes | Yes | **Unwired** — `AMCCChallengeCard.jsx` built, page not routed |
| Nervous System Tools | Yes | Yes | **Unwired** — `NervousSystemTools.jsx` built, page not routed |
| Neuroplasticity Tracker | Yes | Yes | **Unwired** — `NeuroplasticityTracker.jsx` built, page not routed |
| Weekly Brain Metrics Chart | Yes | Yes | **Unwired** — `WeeklyBrainMetricsChart.jsx` built, page not routed |
| AI Brain Insight Card | Yes | Yes | **Unwired** — `AIBrainInsightCard.jsx` built, page not routed |
| Dedicated Brain Health page | Yes | Yes | **Unwired** — `BrainHealth.jsx` fully built with all 7 widgets, just needs route in App.js |

---

## 15. Progressive Feature Unlock

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| 5 brain pillar unlock paths | Yes | No | **Missing** — entire progressive unlock system |
| Day 1/7/14 feature tiers | Yes | No | **Missing** |
| FeatureGate component | Yes | Partial | `UnlockToast.jsx` and `SoftRevealCard.jsx` exist but unused |
| Feature discovery cards | Yes | No | **Missing** |

---

## 16. Subscription / Monetization

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Paywall screen | Yes (disabled) | No | **Missing** (disabled on mobile too — defer) |
| Redeem code | Yes | No | **Missing** |
| Subscription management | Yes | Partial | Settings shows section but no purchase flow |

---

## 17. Infrastructure & UX

| Feature | Mobile | Web | Status |
|---------|--------|-----|--------|
| Celebration animations | Yes | Yes | Parity |
| Offline support with queue | Yes | No | **Missing** |
| Push notifications | Yes | No | **Missing** — web has no push infra |
| Reduced motion support | Yes | No | **Missing** |
| Network status indicator | Yes | No | **Missing** |

---

## Summary: Verified Gap Counts (2026-04-01)

| Status | Count |
|--------|-------|
| **Parity** | ~70 features |
| **Partial** | ~4 features |
| **Unwired (built, needs routing)** | ~8 features |
| **Missing from web** | ~22 features |

---

## Remaining Work — Prioritized

### Phase A: Wire Existing (trivial, < 1 hour total)

1. Add `/brain-health` route to `App.js` — page and all 7 widgets already built

### Phase B: High-Impact Gaps

2. **Content detail pages** — Breathwork, Sleep, Movement, Masterclass detail screens with player/timer
3. **Insight widgets V2** — Port CorrelationCard, BrainStateDistribution, WeekOverWeekSummary, insight chips, strongest days to web
4. **Habit Detail page** — Dedicated view/edit/history/insights screen
5. **Edit post** — Add EditPostModal to community feed
6. **Suggested connections** — Connection suggestions with reasons on People page

### Phase C: Medium-Impact Gaps

7. **Focus enhancements** — Duration presets, break prompts, activity selection
8. **Challenge leaderboards** — Full check-in + ranking UI
9. **Community additions** — Group prompts, invite members, mutual connections, quick status
10. **Library favorites** — Bookmarking/favorites for content items
11. **Bounce-back habit system** — "Never miss twice" tracking
12. **Habit version tracking** — Track which scaling version was completed

### Phase D: Low Priority / Defer

13. Progressive feature unlock system
14. Podcast integration
15. Task detail screen (web inline editing is adequate)
16. Onboarding personalized entry
17. Subscription/paywall (disabled on mobile too)
18. Offline support, push notifications, reduced motion, network indicator
