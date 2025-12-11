# Phase 7: Core Features - IN PROGRESS

**Date Started:** December 9, 2025
**Status:** Building Core Screens
**Estimated Completion:** This is the largest phase (~2-3 weeks of development)

---

## Phase 7 Overview

This phase builds all the main feature screens for the Vara mobile app:

### Screens to Build:
1. ✅ **Dashboard** - Wellness overview (COMPLETE)
2. ⏳ **Goals** - Goal management
3. ⏳ **Habits** - Daily habit tracking
4. ⏳ **Tasks** - To-do list management
5. ⏳ **Journal** - Journaling with AI prompts
6. ⏳ **Profile** - User profile and settings
7. ⏳ **Bottom Tab Navigation** - Mobile navigation

---

## What's Been Built

### ✅ Dashboard Screen (`src/screens/DashboardScreen.tsx`)

**Features:**
- Personalized greeting with user's name
- **Stats cards:**
  - Active goals count
  - Total habit streak (with 🔥 emoji)
  - Pending tasks count
- **Today's Habits section:**
  - Shows active habits (up to 5)
  - Quick check-off button
  - Streak display for each habit
  - "View All" link if more than 5
- **Priority Tasks section:**
  - Shows incomplete tasks (up to 5)
  - Priority badges (high/medium/low)
  - Quick complete button
  - "View All" link if more than 5
- **Goals Progress section:**
  - Shows goals with progress bars
  - Visual progress indicator
  - Completion percentage
  - "View All" link if more than 3
- **Quick Actions:**
  - "Generate Daily Plan with AI" button
  - "Add Journal Entry" button
- **Pull-to-refresh** functionality
- **Real-time updates** via hooks (useGoals, useHabits, useTasks)
- **Empty states** for when no data exists
- **Mobile-optimized layout** (vertical scroll)

**What It Looks Like:**
```
┌─────────────────────────────┐
│ Hello, [Name]!             │
│ Here's your wellness...   │
├─────────────────────────────┤
│ [3]     [🔥15]      [8]    │
│ Active  Streak     Tasks   │
│ Goals                      │
├─────────────────────────────┤
│ Today's Habits        (5)  │
│ ─ Morning Exercise 🔥3 [✓] │
│ ─ Meditation      🔥7  [✓] │
│ ─ Read Book       🔥2  [✓] │
│                            │
│ View All Habits →          │
├─────────────────────────────┤
│ Priority Tasks        (8)  │
│ ─ Review code     [HIGH] [✓]│
│ ─ Call dentist  [MEDIUM][✓]│
│                            │
│ View All Tasks →           │
├─────────────────────────────┤
│ Goals Progress   (2/5)     │
│ Get Fit          [████░] 80%│
│ Learn Spanish    [██░░░] 40%│
│                            │
│ View All Goals →           │
├─────────────────────────────┤
│ [Generate Daily Plan AI]   │
│ [Add Journal Entry]        │
└─────────────────────────────┘
```

---

## Next Screens to Build

### Goals Screen

**Features Needed:**
- List all goals with progress
- Create new goal form
- Edit existing goal
- Delete goal
- Update progress slider
- Filter by status (active/completed/paused)
- Goal detail view
- Milestones management

**Layout:**
- Floating action button for "Create Goal"
- Goal cards with progress ring
- Swipe actions (edit/delete)
- Status badges

### Habits Screen

**Features Needed:**
- List all habits with streaks
- Daily check-in interface
- Create new habit form
- Edit existing habit
- Delete habit
- View habit history/calendar
- Streak visualization
- Filter active/inactive

**Layout:**
- Today's date picker at top
- Habit cards with checkboxes
- Streak flame icon
- Calendar view for history
- Floating action button for "Create Habit"

### Tasks Screen

**Features Needed:**
- List all tasks
- Create new task
- Edit task
- Delete task
- Toggle completion
- Priority management
- Due date picker
- Filter by priority/completion
- Swipe-to-complete action

**Layout:**
- Tab filters (All/To Do/Done)
- Task cards with checkboxes
- Priority color coding
- Swipe actions (complete/delete)
- Floating action button for "Create Task"

### Journal Screen

**Features Needed:**
- List journal entries
- Create new entry
- Edit entry
- Delete entry
- Mood selector
- Tag management
- AI prompt generator
- Search entries
- View by date

**Layout:**
- Entry cards with mood emoji
- Date grouping
- Floating action button for "New Entry"
- AI prompt button
- Search bar

### Profile Screen

**Features Needed:**
- User info display
- Edit profile (name, bio, avatar)
- Settings
- Logout
- Account stats
- Privacy settings
- Notification preferences

---

## Recommended Next Steps

Given the scope of Phase 7, here's my recommendation:

### Option 1: Build All Screens at Once (2-3 weeks)
I continue building all remaining screens in one go. This gives you a complete app but takes longer.

### Option 2: Build in Iterations (Recommended)
Build and test screens one at a time:
1. **Next: Goals screen** (1-2 hours) - Test goal creation/editing
2. **Then: Habits screen** (1-2 hours) - Test daily check-ins
3. **Then: Tasks screen** (1 hour) - Test task management
4. **Then: Journal screen** (1-2 hours) - Test journaling
5. **Finally: Bottom tabs** (30 min) - Connect everything

This allows you to test each feature as it's built.

### Option 3: Minimal MVP First
Build just the core screens (Goals, Habits, Tasks) without all the bells and whistles, then add features iteratively.

---

## What Would You Like?

**Option A:** Continue building all screens now (Goals, Habits, Tasks, Journal, Navigation)
- Pros: Complete app faster
- Cons: Can't test until all done
- Time: ~4-6 hours of my work

**Option B:** Build Goals screen next, test it, then continue
- Pros: Test as we go, catch issues early
- Cons: Slower overall progress
- Time: ~1 hour per screen

**Option C:** Pause Phase 7 and do something else
- Maybe test what we have so far?
- Maybe build subscriptions (Phase 5)?
- Maybe build onboarding (Phase 6)?

---

## Current Mobile App Status

**What's Working Right Now:**
✅ Beautiful login/signup flow
✅ Email verification
✅ Dashboard showing live data
✅ Real-time updates from Firestore
✅ Firebase services all wired up
✅ API client ready for AI features

**What You Can Test:**
1. Open the app
2. You'll see the new Dashboard
3. It should show "No goals yet" and "No habits yet"
4. Pull down to refresh

**To See Dashboard:**
The app should automatically show it after login. If not, we need to update the navigation (which is part of this phase).

---

## Questions for You

Before I continue building, please let me know:

1. **Which approach do you prefer?** (Option A, B, or C above)

2. **What's most important to test first?**
   - Goals management?
   - Habits tracking?
   - Tasks/to-dos?
   - Journaling?

3. **Do you want to test the Dashboard first** before I build more screens?

4. **Any specific features you want to prioritize** or skip for now?

Let me know and I'll continue accordingly! 🚀
