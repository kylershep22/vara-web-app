# Brain Health Redesign - Implementation Plan

**Last Updated:** 2025-11-13
**Status:** Planning Phase
**Goal:** Pivot app from general wellness to brain health + productivity + community focus

---

## Table of Contents
1. [Information Architecture](#information-architecture)
2. [Navigation Structure](#navigation-structure)
3. [Data Model](#data-model)
4. [Feature Specifications](#feature-specifications)
5. [UX/UI Best Practices](#uxui-best-practices)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Migration Strategy](#migration-strategy)

---

## Information Architecture

### New Sidebar Navigation

```
┌─────────────────────────────────────┐
│  VARA - Brain Health                │
├─────────────────────────────────────┤
│  📊 Weekly Dashboard                │  ← Default landing page
│  🧠 Mental Resilience               │
│  🎯 Focus                            │
│  💪 Fuel & Recovery                  │
│  💎 Insights / Life Design           │
│  👥 Community                        │
│  🎓 Masterclass                      │
│  📔 Journal                          │
│  🤖 AI Companion                     │
├─────────────────────────────────────┤
│  🔔 Notifications                    │
│  ⚙️  Settings                        │
│  👤 Profile                          │
└─────────────────────────────────────┘
```

### Content Hierarchy

#### 1. Weekly Dashboard (New)
**Route:** `/dashboard`
**Purpose:** Central hub for weekly planning and reflection

**Sections:**
- **Time Filter:** Daily | **Weekly** (default) | Monthly | Yearly
- **Priority Tasks:**
  - Urgent (high priority)
  - Important but not urgent (lower priority)
  - Quick add functionality
- **Habit Tracker:**
  - Visual streak display
  - Quick check-in
  - Pull from existing habits collection
- **Community Highlights:**
  - Auto-populated from public wins
  - Real-time feed
  - "Celebrate" interaction
- **Week Recap (4-3-2-1 Framework):**
  - 4 moments of joy
  - 3 ways you fueled your mind or body
  - 2 friends you connected with
  - 1 biggest win from the week
  - Reflection: Obstacles & boundaries for next week
  - AI-assisted suggestions based on week's activity

---

#### 2. Mental Resilience (New)
**Route:** `/mental-resilience`
**Purpose:** Build cognitive reserve through education and practice

**Sections:**

**A. Understanding Cognitive Reserve**
- **What is it?** Static educational content (markdown/rich text)
- **Why it matters:** Science-backed benefits
- **How to build it:** Actionable strategies
- **Content Type:** Expandable cards, progress tracking

**B. Daily Puzzle**
- **Puzzle Types:**
  - Sudoku
  - Pattern recognition
  - Memory games
  - Logic puzzles
  - Word games
- **Features:**
  - One puzzle per day (refreshes at midnight)
  - Difficulty levels (Easy/Medium/Hard)
  - Timer + score tracking
  - Streak counter
  - Historical performance analytics
- **Data:** Track completions, time, accuracy

**C. Brain-Building Activities**
- **Partner Integrations (Phase 2):**
  - Duolingo affiliate link
  - Other cognitive training platforms
- **AI Suggestions:**
  - Personalized recommendations based on user's routine
  - "Try learning a new skill this week"

---

#### 3. Focus (New)
**Route:** `/focus`
**Purpose:** Tools and techniques for deep work and concentration

**Sections:**

**A. Pomodoro Timer**
- **Presets:** 10, 15, 25, 60, 90 minutes
- **Custom timer:** User-defined duration
- **Features:**
  - Visual countdown
  - Audio notifications (gentle chime)
  - Break reminders (5/15 min based on session length)
  - Session history log
  - Daily/weekly focus time analytics
- **Integration:** Log sessions to track total focus time

**B. Binaural Beats - Deep Focus**
- **Music Library:**
  - Categorized tracks (Alpha waves, Beta waves, Theta)
  - Duration filters (10min, 30min, 60min)
  - Audio player integration (existing AudioPlayerContext)
- **Features:**
  - Background play
  - Favorites
  - Download for offline (mobile only)
  - "Play with timer" (sync with Pomodoro)

**C. Focus Tips & Education**
- **Static content:**
  - Science of focus
  - Common distractions and solutions
  - Environment optimization
  - Cognitive load management
- **Format:** Article cards, quick tips

**D. Routine Designer**
- **Routine Types:**
  - Morning routine
  - Evening routine
  - Sunday planning routine
- **Features:**
  - Drag-and-drop time blocks
  - Activity library (meditation, exercise, reading, etc.)
  - Recurring schedule
  - Reminders
  - Track adherence
- **Alternative placement:** Could also fit in Fuel & Recovery (Sleep)

---

#### 4. Fuel & Recovery (Consolidates existing Library)
**Route:** `/fuel-recovery`
**Purpose:** Physical and mental recovery strategies

**Sections:**

**A. Sleep**
- **Sub-sections:**
  - Why sleep matters (educational)
  - Sleep routine designer (link to Routine Designer)
  - Tips for better sleep (static content + AI personalization)
  - Binaural beats - Deep Sleep (audio library)
  - Sleep tracker (log hours, quality)
- **Migration:** Bring existing sleep content from Library
- **New additions:** Routine builder, tracking

**B. Breathwork**
- **Existing content:** Keep recorded breathwork tracks
- **Enhancements:**
  - Categorize by purpose (Relaxation, Focus, Energy)
  - Track sessions
  - Favorites
  - Audio player integration

**C. Stress Management**
- **Educational Content:**
  - "How stress isn't the enemy" (reframe stress response)
  - Acute vs. chronic stress
  - Hormesis and adaptation
- **Tools:**
  - Stress relief strategies (breathing, movement, connection)
  - Quick stress check-in (mood logging)
  - Track stressors and patterns

**D. Wellness Vault**
- **Content Types:**
  - Videos (movement, educational talks)
  - Blog posts / articles
  - Infographics
  - Downloadable resources
- **Categories:**
  - Nutrition (educational, future masterclass)
  - Movement (educational, future masterclass)
  - Gut Health (educational, future masterclass)
  - Hormones (educational, future masterclass)
  - Longevity (educational, future masterclass)
- **Features:**
  - Search and filter
  - Bookmarks
  - Progress tracking
  - Content recommendations

---

#### 5. Insights / Life Design (Enhanced)
**Route:** `/insights`
**Purpose:** Deep self-reflection and values alignment

**Sections:**

**A. Wheel of Life**
- **Categories (8):**
  1. Career & Purpose
  2. Health & Vitality
  3. Relationships & Love
  4. Personal Growth
  5. Finance & Security
  6. Recreation & Joy
  7. Environment & Space
  8. Contribution & Legacy
- **Features:**
  - Visual wheel chart (0-10 rating)
  - Quarterly re-assessment
  - Historical comparison
  - AI insights on imbalances

**B. Core Values Exploration**
- **Guided exercises:**
  - Values card sort
  - Peak experience reflection
  - Legacy statement
- **Output:** User's top 5 core values
- **Integration:** Connect to goal-setting

**C. Purpose & Legacy**
- **Prompts:**
  - "What do you want to be remembered for?"
  - "Who do you want to become?"
  - "What impact do you want to have?"
- **Format:** Long-form journaling with AI reflection

**D. Goal & Habit Integration**
- **Existing system:** Keep current goals.service.js and habits.service.js
- **Enhancement:**
  - Link goals to core values
  - Tag habits by life category (Wheel of Life)
  - Brain health impact tags (cognitive, physical, social, purpose)

---

#### 6. Community (Keep existing)
**Route:** `/community`
**Status:** Already well-crafted, minimal changes

**Enhancements:**
- Add "public wins" tagging for dashboard highlights
- Brain health-focused groups
- Cognitive challenge groups (puzzle competitions)

---

#### 7. Masterclass (New)
**Route:** `/masterclass`
**Purpose:** Deep-dive video education

**Structure:**
- **Masterclass Catalog:**
  - Card-based layout
  - Topics: Sleep, Breathwork, Nutrition, Movement, etc.
  - Duration, difficulty, instructor
- **Video Player:**
  - Enhance existing VideoPlayerContext
  - Progress tracking
  - Bookmarks/notes
  - Speed control
  - Closed captions
- **Progress Dashboard:**
  - Courses started
  - Courses completed
  - Total learning time
  - Certificates (future)

---

#### 8. Journal (Enhanced)
**Route:** `/journal`
**Current:** Daily journaling with AI prompts

**Enhancements:**
- **Weekly prompts:** Option for once-per-week deeper reflection
- **Brain health prompts:**
  - "What challenged your thinking today?"
  - "What new connection did you make?"
  - "How did you fuel your brain today?"
- **Integration with Week Recap:**
  - Pull journal highlights into 4-3-2-1 recap
  - AI-assisted summary

---

#### 9. AI Companion (Enhanced)
**Route:** `/ai`
**Current:** GPT-4o-mini powered chat

**Enhancements:**
- **Brain health context:**
  - Cognitive science knowledge base
  - Focus on neuroplasticity, cognitive reserve
  - Strengths-based coaching with brain health lens
- **New capabilities:**
  - Suggest daily puzzle strategies
  - Analyze Wheel of Life and suggest focus areas
  - Create personalized focus playlists
  - Generate routine suggestions
  - Interpret stress patterns

---

## Navigation Structure

### Sidebar Implementation

**File:** `src/components/layout/SidebarLayout.jsx`

**Current structure to update:**
```javascript
const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Target, label: 'Goals & Habits', path: '/goals-habits' },
  { icon: Sun, label: 'Daily', path: '/daily' },
  { icon: BookOpen, label: 'Library', path: '/library' },
  { icon: Users, label: 'Community', path: '/community' },
  { icon: BookHeart, label: 'Journal', path: '/journal' },
  { icon: Bot, label: 'AI Companion', path: '/ai' }
];
```

**New structure:**
```javascript
const navItems = [
  { icon: LayoutDashboard, label: 'Weekly Dashboard', path: '/dashboard' },
  { icon: Brain, label: 'Mental Resilience', path: '/mental-resilience' },
  { icon: Target, label: 'Focus', path: '/focus' },
  { icon: Heart, label: 'Fuel & Recovery', path: '/fuel-recovery' },
  { icon: Lightbulb, label: 'Insights', path: '/insights' },
  { icon: Users, label: 'Community', path: '/community' },
  { icon: GraduationCap, label: 'Masterclass', path: '/masterclass' },
  { icon: BookOpen, label: 'Journal', path: '/journal' },
  { icon: Bot, label: 'AI Companion', path: '/ai' }
];
```

**Note:** Remove "Goals & Habits" as separate nav item (now integrated into Insights)

---

## Data Model

### New Firestore Collections

#### 1. `puzzles`
**Purpose:** Store daily puzzle data

```javascript
{
  id: "2025-11-13-sudoku-easy",
  type: "sudoku" | "pattern" | "memory" | "logic" | "word",
  difficulty: "easy" | "medium" | "hard",
  date: "2025-11-13",
  data: {}, // Puzzle-specific data structure
  solution: {}, // Correct answer
  createdAt: Timestamp
}
```

#### 2. `puzzleCompletions`
**Purpose:** Track user puzzle history

```javascript
{
  id: auto,
  userId: "user123",
  puzzleId: "2025-11-13-sudoku-easy",
  completed: true,
  timeSpent: 180, // seconds
  score: 95, // percentage or points
  hints: 2,
  completedAt: Timestamp
}
```

**Indexes needed:**
- `userId` + `completedAt` (descending)
- `puzzleId` + `userId`

#### 3. `focusSessions`
**Purpose:** Track Pomodoro timer sessions

```javascript
{
  id: auto,
  userId: "user123",
  duration: 25, // minutes
  type: "pomodoro" | "short-break" | "long-break",
  completed: true,
  startedAt: Timestamp,
  endedAt: Timestamp,
  interrupted: false,
  tags: ["work", "deep-work"] // optional
}
```

**Indexes needed:**
- `userId` + `startedAt` (descending)

#### 4. `routines`
**Purpose:** User-designed routines

```javascript
{
  id: auto,
  userId: "user123",
  name: "Morning Routine",
  type: "morning" | "evening" | "sunday",
  activities: [
    {
      name: "Meditation",
      duration: 10, // minutes
      order: 1,
      icon: "lotus"
    },
    {
      name: "Exercise",
      duration: 30,
      order: 2,
      icon: "dumbbell"
    }
  ],
  active: true,
  reminderTime: "07:00", // optional
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes needed:**
- `userId` + `type`

#### 5. `weeklyRecaps`
**Purpose:** 4-3-2-1 weekly reflection data

```javascript
{
  id: auto,
  userId: "user123",
  weekStart: "2025-11-10", // ISO date of Monday
  weekEnd: "2025-11-16",
  momentsOfJoy: [
    "Coffee with a friend",
    "Finished a challenging project",
    "Beautiful sunset",
    "Good book"
  ], // 4 items
  mindBodyFuel: [
    "Morning yoga every day",
    "Learned about cognitive reserve",
    "Tried new healthy recipe"
  ], // 3 items
  friendsConnected: [
    { userId: "user456", name: "Sarah" },
    { userId: "user789", name: "Mike" }
  ], // 2 items
  biggestWin: "Completed my first week of daily puzzles",
  obstacles: "Struggled with late-night screen time",
  boundaries: "Set phone alarm to put devices away by 10pm",
  aiSuggestions: {
    momentsOfJoy: ["..."], // AI-suggested based on activity
    mindBodyFuel: ["..."],
    // etc.
  },
  completedAt: Timestamp,
  createdAt: Timestamp
}
```

**Indexes needed:**
- `userId` + `weekStart` (descending)

#### 6. `wheelOfLife`
**Purpose:** Life balance assessments

```javascript
{
  id: auto,
  userId: "user123",
  assessmentDate: Timestamp,
  ratings: {
    careerPurpose: 7,
    healthVitality: 6,
    relationshipsLove: 8,
    personalGrowth: 5,
    financeSecurity: 6,
    recreationJoy: 4,
    environmentSpace: 7,
    contributionLegacy: 5
  },
  notes: "Feeling good about relationships, want to focus on recreation",
  aiInsights: "Your personal growth and recreation scores suggest...",
  createdAt: Timestamp
}
```

**Indexes needed:**
- `userId` + `assessmentDate` (descending)

#### 7. `reflections`
**Purpose:** Deep reflection responses

```javascript
{
  id: auto,
  userId: "user123",
  type: "values" | "purpose" | "legacy",
  prompt: "What do you want to be remembered for?",
  response: "Long form text...",
  coreValues: ["growth", "connection", "creativity", "health", "contribution"], // if values exercise
  aiReflection: "Based on your response...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 8. `educationalContent`
**Purpose:** Static educational content (admin-created)

```javascript
{
  id: "cognitive-reserve-intro",
  category: "mental-resilience" | "focus" | "fuel-recovery" | "insights",
  subcategory: "cognitive-reserve" | "sleep" | "stress" | "nutrition", // optional
  title: "What is Cognitive Reserve?",
  content: "Markdown or HTML content...",
  contentType: "article" | "video" | "audio" | "infographic",
  mediaUrl: "https://...", // if video/audio/image
  readTime: 5, // minutes
  tags: ["brain-health", "cognitive-reserve", "neuroplasticity"],
  order: 1, // for sequencing
  publishedAt: Timestamp,
  updatedAt: Timestamp
}
```

**Indexes needed:**
- `category` + `order`
- `tags` (array-contains)

#### 9. `masterclasses`
**Purpose:** Video masterclass catalog

```javascript
{
  id: "sleep-masterclass-2025",
  title: "The Science of Sleep",
  instructor: "Dr. Jane Smith",
  description: "Deep dive into...",
  duration: 3600, // seconds
  videoUrl: "https://...",
  thumbnailUrl: "https://...",
  topics: ["Sleep", "Circadian Rhythm", "Recovery"],
  difficulty: "beginner" | "intermediate" | "advanced",
  modules: [
    {
      title: "Module 1: Sleep Architecture",
      duration: 900,
      videoUrl: "https://...",
      order: 1
    }
  ],
  publishedAt: Timestamp
}
```

#### 10. `masterclassProgress`
**Purpose:** User progress tracking for masterclasses

```javascript
{
  id: auto,
  userId: "user123",
  masterclassId: "sleep-masterclass-2025",
  started: true,
  completed: false,
  progress: 0.45, // 45% complete
  currentModule: 2,
  watchTime: 1620, // seconds watched
  lastWatchedAt: Timestamp,
  completedAt: null | Timestamp,
  notes: "User's notes...",
  bookmarks: [
    { time: 300, note: "Key insight about REM sleep" }
  ]
}
```

**Indexes needed:**
- `userId` + `masterclassId`
- `userId` + `lastWatchedAt` (descending)

#### 11. `audioLibrary`
**Purpose:** Binaural beats and focus music catalog

```javascript
{
  id: "alpha-waves-focus-30min",
  title: "Alpha Waves - Deep Focus",
  category: "focus" | "sleep" | "relaxation",
  waveType: "alpha" | "beta" | "theta" | "delta", // for binaural beats
  duration: 1800, // seconds
  audioUrl: "https://...",
  thumbnailUrl: "https://...",
  description: "Enhance concentration and...",
  tags: ["focus", "alpha-waves", "30min"],
  createdAt: Timestamp
}
```

#### 12. `audioListens`
**Purpose:** Track audio plays

```javascript
{
  id: auto,
  userId: "user123",
  audioId: "alpha-waves-focus-30min",
  duration: 1800,
  completed: true,
  listenedAt: Timestamp
}
```

### Enhanced Existing Collections

#### `tasks`
**Add fields:**
```javascript
{
  // ... existing fields
  urgency: "urgent" | "important" | "low", // for dashboard categorization
  brainHealthImpact: "cognitive" | "physical" | "social" | "purpose" | null
}
```

#### `habits`
**Add fields:**
```javascript
{
  // ... existing fields
  lifeCategory: "careerPurpose" | "healthVitality" | "relationshipsLove" | // ... (Wheel of Life categories)
  brainHealthImpact: "cognitive" | "physical" | "social" | "purpose" | null
}
```

#### `goals`
**Add fields:**
```javascript
{
  // ... existing fields
  coreValue: "growth" | "connection" | "creativity" | // user's core values
  lifeCategory: // same as habits
}
```

#### `journalEntries`
**Add fields:**
```javascript
{
  // ... existing fields
  promptType: "daily" | "weekly" | "brain-health",
  brainHealthFocus: "cognitive-challenge" | "new-connection" | "fuel" | null
}
```

#### `posts` (Community)
**Add fields:**
```javascript
{
  // ... existing fields
  isPublicWin: false, // if true, can appear on dashboard highlights
  winCategory: "puzzle" | "focus" | "routine" | "general" | null
}
```

#### `users`
**Add fields:**
```javascript
{
  // ... existing fields
  cognitiveHealthScore: 0, // calculated based on activity
  preferences: {
    dashboardView: "weekly", // "daily" | "monthly" | "yearly"
    pomodoroDefault: 25, // default timer duration
    routineReminders: true
  },
  stats: {
    totalFocusMinutes: 0,
    puzzlesCompleted: 0,
    currentPuzzleStreak: 0,
    longestPuzzleStreak: 0
  }
}
```

---

## Feature Specifications

### 1. Weekly Dashboard

#### UI Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Weekly Dashboard                 [Daily|Weekly|Monthly]  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  📋 Priority Tasks   │  │  🔥 Habit Tracker            │ │
│  │                      │  │                              │ │
│  │  🚨 Urgent           │  │  [7-day visual grid]         │ │
│  │  □ Task 1            │  │                              │ │
│  │  □ Task 2            │  │  Meditation: ✅✅✅✅✅⭕⭕ │ │
│  │                      │  │  Exercise:   ✅⭕✅✅⭕⭕⭕ │ │
│  │  📌 Important        │  │  Puzzle:     ✅✅✅✅✅✅✅ │ │
│  │  □ Task 3            │  │                              │ │
│  │  □ Task 4            │  │  [Quick check-in buttons]    │ │
│  │                      │  │                              │ │
│  │  [+ Quick Add]       │  │                              │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🌟 Community Highlights (This Week)                 │  │
│  │                                                       │  │
│  │  💪 Sarah completed 30-day meditation streak!        │  │
│  │  🧩 Mike solved a hard puzzle in 3 minutes!          │  │
│  │  🎯 Alex hit 50 hours of deep focus time!            │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📝 Week Recap (Nov 10-16)          [Complete Recap] │  │
│  │                                                       │  │
│  │  ✨ 4 Moments of Joy                                 │  │
│  │  💪 3 Ways You Fueled Your Mind/Body                │  │
│  │  👥 2 Friends You Connected With                     │  │
│  │  🏆 1 Biggest Win                                    │  │
│  │  🛡️  Obstacles & Boundaries                          │  │
│  │                                                       │  │
│  │  [AI can help suggest based on your week's activity] │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Components to Build

**File:** `src/pages/Dashboard.jsx` (replace current)

**New Components:**
- `src/components/dashboard/PriorityTaskList.jsx`
- `src/components/dashboard/HabitTrackerWeekly.jsx`
- `src/components/dashboard/CommunityHighlights.jsx`
- `src/components/dashboard/WeekRecap.jsx`
- `src/components/dashboard/TimeFilter.jsx`

#### State Management

```javascript
// Dashboard.jsx
const [timeView, setTimeView] = useState('weekly'); // daily, weekly, monthly, yearly
const [currentWeek, setCurrentWeek] = useState(getCurrentWeekRange());
const [tasks, setTasks] = useState([]);
const [habits, setHabits] = useState([]);
const [weekRecap, setWeekRecap] = useState(null);

useEffect(() => {
  // Real-time subscription to tasks
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('userId', '==', user.uid),
    where('completed', '==', false)
  );
  const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTasks(data);
  });

  // Real-time subscription to habits
  const habitsQuery = query(
    collection(db, 'habits'),
    where('userId', '==', user.uid),
    where('active', '==', true)
  );
  const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setHabits(data);
  });

  // Fetch week recap (not real-time)
  fetchWeekRecap(user.uid, currentWeek);

  return () => {
    unsubscribeTasks();
    unsubscribeHabits();
  };
}, [user, currentWeek]);
```

### 2. Mental Resilience Section

#### Daily Puzzle System

**Puzzle Generation Strategy:**
- **Option A:** Pre-generate puzzles and store in Firestore
- **Option B:** Use third-party puzzle API
- **Option C:** Generate on-demand with algorithm

**Recommended:** Option A (pre-generated) for consistency and offline support

**Components:**
- `src/pages/MentalResilience.jsx`
- `src/components/puzzles/PuzzleCard.jsx`
- `src/components/puzzles/SudokuGame.jsx`
- `src/components/puzzles/PatternGame.jsx`
- `src/components/puzzles/MemoryGame.jsx`
- `src/components/puzzles/PuzzleHistory.jsx`

**Third-party libraries to consider:**
- `react-sudoku-component` - Sudoku UI
- `react-pattern-lock` - Pattern recognition
- Custom memory game (flip cards)

### 3. Focus Section

#### Pomodoro Timer

**Components:**
- `src/pages/Focus.jsx`
- `src/components/focus/PomodoroTimer.jsx`
- `src/components/focus/TimerPresets.jsx`
- `src/components/focus/FocusSessionHistory.jsx`

**Timer Features:**
- Visual countdown (circular progress)
- Audio notifications (can mute)
- Break reminders
- Session logging
- Integration with binaural beats (play music during session)

**Libraries:**
- `react-circular-progressbar` - Visual timer
- Native Web Audio API for notifications

#### Binaural Beats Library

**Components:**
- `src/components/focus/BinauraLibrary.jsx`
- Reuse `src/context/AudioPlayerContext.jsx`
- Enhance `src/components/audio/AudioPlayer.jsx`

**Features:**
- Filter by duration, wave type
- Favorites
- "Play with timer" button
- Background playback

#### Routine Designer

**Components:**
- `src/components/focus/RoutineDesigner.jsx`
- `src/components/focus/ActivityLibrary.jsx`
- `src/components/focus/RoutineTimeBlock.jsx`

**Drag-and-drop library:**
- `react-beautiful-dnd` or `@dnd-kit/core`

**Features:**
- Pre-built activity templates
- Custom activities
- Time duration slider
- Recurring reminders
- Track adherence

### 4. Fuel & Recovery Section

#### Sleep Section

**Components:**
- `src/pages/FuelRecovery.jsx`
- `src/components/sleep/SleepRoutineBuilder.jsx`
- `src/components/sleep/SleepTracker.jsx`
- `src/components/sleep/SleepTips.jsx`

**Enhancements:**
- Migrate existing sleep content from Library
- Add sleep quality logging
- Sleep analytics (average hours, consistency)
- Integration with routine designer

#### Breathwork

**Components:**
- Reuse existing breathwork components
- Enhance categorization (Relaxation, Focus, Energy)
- Track breathwork sessions

#### Wellness Vault

**Components:**
- `src/components/vault/WellnessVault.jsx`
- `src/components/vault/ContentCard.jsx`
- `src/components/vault/ContentFilter.jsx`
- `src/components/vault/ContentPlayer.jsx` (video/audio)

**Features:**
- Grid/list view toggle
- Category filters
- Search
- Bookmarks
- Progress tracking
- Recommendations

### 5. Insights / Life Design Section

#### Wheel of Life

**Components:**
- `src/pages/Insights.jsx`
- `src/components/insights/WheelOfLife.jsx`
- `src/components/insights/WheelChart.jsx`
- `src/components/insights/WheelHistory.jsx`

**Chart library:**
- `recharts` (already used in project) - radar chart
- Alternative: `chart.js` with react wrapper

**Features:**
- Interactive rating sliders (0-10)
- Visual radar chart
- Historical comparison
- AI insights
- Goal suggestions based on low scores

#### Core Values & Reflection

**Components:**
- `src/components/insights/ValuesExercise.jsx`
- `src/components/insights/PurposeJournal.jsx`
- `src/components/insights/CoreValuesDisplay.jsx`

**Features:**
- Guided multi-step exercise
- Save core values to user profile
- Link values to goals
- AI reflection on responses

#### Goal & Habit Integration

**Enhancement to existing components:**
- Add "Life Category" dropdown to goal creation
- Add "Core Value" tag to goals
- Show Wheel of Life integration in goals list
- Filter habits by life category

### 6. Masterclass Section

**Components:**
- `src/pages/Masterclass.jsx`
- `src/components/masterclass/MasterclassCatalog.jsx`
- `src/components/masterclass/MasterclassCard.jsx`
- `src/components/masterclass/MasterclassPlayer.jsx`
- `src/components/masterclass/MasterclassProgress.jsx`

**Video Player Enhancement:**
- Reuse `src/context/VideoPlayerContext.jsx`
- Add progress tracking
- Bookmarks with notes
- Speed control (0.5x, 1x, 1.25x, 1.5x, 2x)
- Closed captions support

**Libraries:**
- `react-player` (may already be in use)
- Or native HTML5 video with custom controls

---

## UX/UI Best Practices

### Design Principles for Brain Health App

#### 1. Cognitive Load Reduction
- **One primary action per screen**
- **Clear visual hierarchy** (size, color, spacing)
- **Progressive disclosure** (don't show everything at once)
- **Familiar patterns** (standard UI conventions)

#### 2. Micro-Interactions & Feedback
- **Instant feedback** on all actions (button press, completion)
- **Celebration animations** (streak milestones, puzzle completion)
- **Progress indicators** (loading states, step counters)
- **Haptic feedback** (mobile vibration on key actions)

#### 3. Gamification (Dopamine-Friendly)
- **Streak counters** (visual flame/number)
- **Badges/achievements** (first puzzle, 7-day streak, etc.)
- **Progress bars** (visual completion)
- **Leaderboards** (optional, community puzzles)
- **Levels** (beginner → advanced based on consistency)

#### 4. Data Visualization
- **Trends over time** (line charts for focus minutes, sleep quality)
- **Comparisons** (this week vs. last week)
- **Radar charts** (Wheel of Life)
- **Heat maps** (habit consistency calendar)
- **Minimal data displays** (big numbers, small charts)

#### 5. Personalization
- **Customizable dashboard** (drag widgets? Future enhancement)
- **User preferences** (default timer, theme, notifications)
- **AI-powered suggestions** (based on patterns)
- **Favorites** (audio tracks, articles)

#### 6. Accessibility
- **WCAG 2.1 AA compliance**
- **Keyboard navigation** (tab through all interactive elements)
- **Screen reader support** (ARIA labels)
- **Color contrast** (4.5:1 minimum for text)
- **Focus indicators** (visible outline on keyboard focus)
- **Font size options** (user-adjustable)

#### 7. Mobile-First Considerations
- **Touch targets** (minimum 44x44px)
- **Thumb-friendly zones** (important actions in bottom half)
- **Swipe gestures** (natural interactions)
- **Offline support** (service worker, cached content)
- **Fast loading** (optimize images, lazy load)

#### 8. Color Psychology for Brain Health
- **Calming blues/greens** (trust, tranquility)
- **Energizing oranges/yellows** (focus, motivation - use sparingly)
- **Neutrals** (reduce visual noise)
- **Avoid red overload** (stress/urgency)
- **High contrast for readability**

**Proposed Color Palette:**
- **Primary:** Deep teal/blue (#2C7A7B - calming, focused)
- **Secondary:** Warm amber (#F59E0B - energy, achievement)
- **Success:** Forest green (#10B981 - growth, completion)
- **Accent:** Purple (#8B5CF6 - creativity, insight)
- **Neutrals:** Slate grays (#64748B, #334155)

#### 9. Typography
- **Primary font:** Inter or similar (clean, modern, readable)
- **Base size:** 16px minimum
- **Line height:** 1.5-1.6 for body text
- **Font weights:** 400 (normal), 600 (semibold), 700 (bold)
- **Hierarchy:**
  - H1: 2.5rem (40px)
  - H2: 2rem (32px)
  - H3: 1.5rem (24px)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)

#### 10. Spacing & Layout
- **8px grid system** (all spacing multiples of 8)
- **Consistent padding:** 16px, 24px, 32px
- **Card-based layouts** (clear content boundaries)
- **Whitespace** (breathing room, reduces cognitive load)
- **Max content width:** 1280px (readable line length)

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Set up new structure and data models

- [ ] Update sidebar navigation
- [ ] Create new route structure
- [ ] Define Firestore collections (schema above)
- [ ] Update security rules for new collections
- [ ] Create base page components (empty shells)
- [ ] Set up new service layer files

**Files to create:**
- `src/pages/MentalResilience.jsx`
- `src/pages/Focus.jsx`
- `src/pages/FuelRecovery.jsx`
- `src/pages/Insights.jsx`
- `src/pages/Masterclass.jsx`
- `src/services/db/puzzles.service.js`
- `src/services/db/focus.service.js`
- `src/services/db/routines.service.js`
- `src/services/db/weeklyRecaps.service.js`
- `src/services/db/wheelOfLife.service.js`
- `src/services/db/reflections.service.js`
- `src/services/db/masterclass.service.js`

**Files to update:**
- `src/components/layout/SidebarLayout.jsx`
- `src/App.js` (routes)
- `firestore.rules`

---

### Phase 2: Weekly Dashboard (Week 2)
**Goal:** Build core dashboard experience

- [ ] Time filter component (Daily/Weekly/Monthly/Yearly)
- [ ] Priority task list (urgent vs. important)
- [ ] Habit tracker with 7-day grid
- [ ] Community highlights feed
- [ ] Week recap form (4-3-2-1 framework)
- [ ] AI suggestions for week recap
- [ ] Real-time data subscriptions
- [ ] Mobile responsive layout

**Components:**
- `src/components/dashboard/TimeFilter.jsx`
- `src/components/dashboard/PriorityTaskList.jsx`
- `src/components/dashboard/HabitTrackerWeekly.jsx`
- `src/components/dashboard/CommunityHighlights.jsx`
- `src/components/dashboard/WeekRecap.jsx`

**Backend:**
- Update `/generate-daily-plan` to work for weekly view
- Add `/week-recap-suggestions` endpoint

---

### Phase 3: Mental Resilience (Week 3)
**Goal:** Build cognitive training features

- [ ] Educational content system (static pages)
- [ ] Daily puzzle selector
- [ ] Sudoku game component
- [ ] Pattern recognition game
- [ ] Memory game (flip cards)
- [ ] Puzzle completion tracking
- [ ] Streak counter
- [ ] Puzzle history/analytics
- [ ] Third-party suggestions section

**Components:**
- `src/components/puzzles/PuzzleCard.jsx`
- `src/components/puzzles/SudokuGame.jsx`
- `src/components/puzzles/PatternGame.jsx`
- `src/components/puzzles/MemoryGame.jsx`
- `src/components/puzzles/PuzzleHistory.jsx`
- `src/components/content/EducationalArticle.jsx`

**Data:**
- Pre-generate 30 days of puzzles (seed Firestore)

---

### Phase 4: Focus (Week 4)
**Goal:** Build productivity and focus tools

- [ ] Pomodoro timer with presets
- [ ] Visual countdown (circular progress)
- [ ] Audio notifications
- [ ] Session history log
- [ ] Binaural beats library
- [ ] Audio player integration
- [ ] Focus tips content
- [ ] Routine designer (drag-and-drop)
- [ ] Activity library
- [ ] Routine reminders

**Components:**
- `src/components/focus/PomodoroTimer.jsx`
- `src/components/focus/TimerPresets.jsx`
- `src/components/focus/FocusSessionHistory.jsx`
- `src/components/focus/BinauraLibrary.jsx`
- `src/components/focus/RoutineDesigner.jsx`
- `src/components/focus/ActivityLibrary.jsx`

**Libraries:**
- `react-circular-progressbar`
- `@dnd-kit/core` (drag-and-drop)

---

### Phase 5: Fuel & Recovery (Week 5)
**Goal:** Consolidate recovery features

- [ ] Migrate existing Library content
- [ ] Sleep routine builder
- [ ] Sleep tracker
- [ ] Sleep quality logging
- [ ] Breathwork categorization
- [ ] Stress management content
- [ ] Wellness Vault structure
- [ ] Content filtering and search
- [ ] Video/audio player for vault
- [ ] Bookmarks and progress tracking

**Components:**
- `src/components/sleep/SleepRoutineBuilder.jsx`
- `src/components/sleep/SleepTracker.jsx`
- `src/components/vault/WellnessVault.jsx`
- `src/components/vault/ContentCard.jsx`
- `src/components/vault/ContentFilter.jsx`

**Migration:**
- Move content from `/library/*` to `/fuel-recovery/*`

---

### Phase 6: Insights / Life Design (Week 6)
**Goal:** Deep reflection and values alignment

- [ ] Wheel of Life component (radar chart)
- [ ] 8-category rating system
- [ ] Historical comparison
- [ ] AI insights on balance
- [ ] Core values exercise
- [ ] Values card sort
- [ ] Purpose/legacy journaling
- [ ] Link values to goals
- [ ] Tag habits by life category
- [ ] Filter goals/habits by category

**Components:**
- `src/components/insights/WheelOfLife.jsx`
- `src/components/insights/WheelChart.jsx`
- `src/components/insights/WheelHistory.jsx`
- `src/components/insights/ValuesExercise.jsx`
- `src/components/insights/PurposeJournal.jsx`

**Enhancements:**
- Update goal/habit creation forms
- Add life category and core value fields

---

### Phase 7: Masterclass (Week 7)
**Goal:** Video education platform

- [ ] Masterclass catalog (card grid)
- [ ] Video player enhancement
- [ ] Progress tracking
- [ ] Bookmarks with notes
- [ ] Speed control
- [ ] Closed captions
- [ ] Module navigation
- [ ] Completion certificates (future)
- [ ] Learning dashboard

**Components:**
- `src/components/masterclass/MasterclassCatalog.jsx`
- `src/components/masterclass/MasterclassCard.jsx`
- `src/components/masterclass/MasterclassPlayer.jsx`
- `src/components/masterclass/MasterclassProgress.jsx`

**Content:**
- Seed initial masterclass data (sleep, breathwork)

---

### Phase 8: Additional Brain Health Features (Week 8)
**Goal:** Implement recommended brain health tracking

- [ ] Social Connection Tracker
  - Connection logger component
  - Connection history/analytics
  - Integration with week recap
- [ ] Nature Exposure Logger
  - Quick-log widget
  - Nature time analytics
  - Integration with fuel/recovery section
- [ ] Cognitive Load Monitor
  - Energy check-in widget
  - Time-of-day heatmap
  - Peak performance insights
  - Pomodoro integration
- [ ] Enhanced Gratitude Journal
  - Daily gratitude prompts
  - Gratitude streak counter
  - Integration with moments of joy
- [ ] Digital Wellbeing Dashboard
  - Screen time tracking
  - Break reminders
  - Digital sunset feature
- [ ] Brain Health Score System
  - Score calculation algorithm
  - Dashboard widget
  - Trend visualization
  - Category breakdown (radar chart)
  - AI coaching based on scores

**Components:**
- Social: `ConnectionLogger.jsx`, `ConnectionHistory.jsx`
- Nature: `NatureLogger.jsx`, `NatureDashboard.jsx`
- Energy: `EnergyCheckIn.jsx`, `EnergyHeatmap.jsx`, `PeakPerformanceInsights.jsx`
- Gratitude: `GratitudeEntry.jsx`, `GratitudeHistory.jsx`
- Wellbeing: `DigitalWellbeingDashboard.jsx`, `BreakReminder.jsx`, `ScreenTimeChart.jsx`
- Score: `BrainHealthScore.jsx`, `ScoreTrend.jsx`, `CategoryBreakdown.jsx`

---

### Phase 9: AI Integration & Gamification (Week 9)
**Goal:** AI enhancements and engagement features

- [ ] AI companion brain health context
- [ ] AI suggestions throughout app
- [ ] Personalized coaching based on patterns
- [ ] Gamification system
  - Badge definitions (streaks, milestones)
  - Achievement unlocks
  - Progress celebrations
  - Level system
- [ ] Notification system setup
  - Firebase Cloud Messaging (push)
  - Email service integration
  - In-app notification center
  - User preferences UI
- [ ] Google Analytics integration
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG 2.1)

**AI Enhancements:**
- Update `backend/server.js` prompts
- Add brain health knowledge base
- Context injection for each feature

**Backend endpoints to add:**
- `/calculate-brain-health-score`
- `/ai-coaching-suggestion`
- `/energy-insights`

---

### Phase 10: Polish & Testing (Week 10)
**Goal:** Final polish and comprehensive testing

- [ ] Mobile responsiveness check (all screens)
- [ ] Cross-browser testing
- [ ] Error handling and edge cases
- [ ] Loading states and skeletons
- [ ] Empty states (no data yet)
- [ ] User onboarding flow
- [ ] Tutorial/help tooltips
- [ ] Privacy policy updates
- [ ] Terms of service updates
- [ ] User testing and feedback
- [ ] Bug fixes
- [ ] Performance optimization

**Testing:**
- All new features functional
- Real-time subscriptions working
- Security rules enforced
- No console errors
- Analytics tracking correctly

---

### Phase 11: Migration & Deployment (Week 11)
**Goal:** Data migration and production deploy

- [ ] Migrate existing user data
  - Tasks → add urgency field
  - Habits → add lifeCategory field
  - Goals → add coreValue field
- [ ] Test with real user data
- [ ] Deploy security rules
- [ ] Deploy frontend to Firebase Hosting
- [ ] Deploy backend (if changes)
- [ ] Setup subscription/payment system (Stripe)
- [ ] Monitor errors and performance
- [ ] Post-deployment testing

**Estimated Total Timeline:** 11 weeks (full MVP with all brain health features)

---

## Migration Strategy

### Data Migration Scripts

Since users are test users, we can run migration scripts directly in Firestore Console or via admin script.

**Migration needs:**
1. **Tasks:** Add `urgency: "important"` (default) to all existing tasks
2. **Habits:** Add `lifeCategory: null` and `brainHealthImpact: null`
3. **Goals:** Add `coreValue: null` and `lifeCategory: null`
4. **Posts:** Add `isPublicWin: false` and `winCategory: null`
5. **Users:** Add `preferences`, `stats`, `cognitiveHealthScore` fields

**Script example (run in Node.js with Firebase Admin SDK):**

```javascript
// scripts/migrate-tasks.js
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function migrateTasks() {
  const snapshot = await db.collection('tasks').get();
  const batch = db.batch();

  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      urgency: 'important',
      brainHealthImpact: null
    });
  });

  await batch.commit();
  console.log(`Migrated ${snapshot.size} tasks`);
}

migrateTasks();
```

**Run similar scripts for habits, goals, posts, users.**

---

## Security Rules Updates

Add rules for new collections:

```javascript
// firestore.rules

// Puzzles (read-only, admin-created)
match /puzzles/{puzzleId} {
  allow read: if request.auth != null;
  allow write: if false; // Admin only
}

// Puzzle completions (user owns)
match /puzzleCompletions/{completionId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}

// Focus sessions (user owns)
match /focusSessions/{sessionId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}

// Routines (user owns)
match /routines/{routineId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}

// Weekly recaps (user owns)
match /weeklyRecaps/{recapId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}

// Wheel of Life (user owns)
match /wheelOfLife/{assessmentId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}

// Reflections (user owns)
match /reflections/{reflectionId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}

// Educational content (read-only)
match /educationalContent/{contentId} {
  allow read: if request.auth != null;
  allow write: if false; // Admin only
}

// Masterclasses (read-only)
match /masterclasses/{masterclassId} {
  allow read: if request.auth != null;
  allow write: if false; // Admin only
}

// Masterclass progress (user owns)
match /masterclassProgress/{progressId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}

// Audio library (read-only)
match /audioLibrary/{audioId} {
  allow read: if request.auth != null;
  allow write: if false; // Admin only
}

// Audio listens (user owns)
match /audioListens/{listenId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId;
}
```

---

## Testing Checklist

### Functionality Testing
- [ ] All navigation links work
- [ ] Dashboard loads with correct data
- [ ] Tasks can be created, updated, deleted
- [ ] Habits check-in works
- [ ] Puzzles load and can be completed
- [ ] Timer starts, pauses, completes
- [ ] Audio plays and controls work
- [ ] Video plays and tracks progress
- [ ] Routines can be designed and saved
- [ ] Week recap can be filled and saved
- [ ] Wheel of Life chart renders correctly
- [ ] Real-time updates work (multiple tabs)

### Security Testing
- [ ] Users can only see their own data
- [ ] Cannot access other users' personal data
- [ ] Educational content visible to all auth users
- [ ] Admin-only content cannot be modified

### Performance Testing
- [ ] Dashboard loads in <2 seconds
- [ ] Large lists (habits, tasks) render smoothly
- [ ] Audio/video streaming works without buffering
- [ ] Images optimized and lazy-loaded
- [ ] No memory leaks (check DevTools)

### Accessibility Testing
- [ ] Keyboard navigation works (tab, enter, esc)
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Focus indicators visible
- [ ] Form labels associated with inputs
- [ ] Error messages clear and helpful

### Mobile Testing
- [ ] Responsive on iPhone (iOS Safari)
- [ ] Responsive on Android (Chrome)
- [ ] Touch targets 44x44px minimum
- [ ] No horizontal scrolling
- [ ] Audio/video controls mobile-friendly
- [ ] Timer works in background (mobile)

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

---

## Next Steps

1. **Review this document** - Confirm architecture, features, and timeline
2. **Approve design** - UX/UI mockups if needed
3. **Begin Phase 1** - Set up structure and data models
4. **Iterate** - Build, test, refine each phase
5. **Deploy** - Launch MVP with all sections

**Estimated Timeline:** 9 weeks (full-time development)

**Adjustments:** Phases can be parallelized if multiple developers, or extended if part-time.

---

## Decisions Made

### Content & Assets
- **Timeline:** First content batch ready in 2 weeks
- **Placeholder strategy:** Use placeholder content initially, swap when ready
- **Audio/Video hosting:** Firebase Storage (migrate to CDN if needed later)

### Puzzles
- **Source:** Internal generation
- **Format:** See Puzzle Data Format section below
- **Storage:** Firestore collection with structured JSON

### Analytics & Tracking
- **Current:** Google Analytics (free tier)
- **Future:** Upgrade to robust platform as user base grows
- **Privacy:** Update privacy policy for tracking

### Notifications
- **Types:** Email, Push (mobile), In-app
- **User control:** Preference settings for each type
- **Implementation:** Firebase Cloud Messaging for push, custom email service

### Monetization
- **Model:** Monthly subscription
- **Access:** Full app access (no tiers for MVP)
- **Payment:** Stripe integration (future phase)

---

## Puzzle Data Format Specification

### Storage Location
**Firestore Collection:** `puzzles`
**Document ID format:** `{date}-{type}-{difficulty}` (e.g., `2025-11-13-sudoku-easy`)

### Puzzle Types

#### 1. Sudoku
```json
{
  "id": "2025-11-13-sudoku-easy",
  "type": "sudoku",
  "difficulty": "easy",
  "date": "2025-11-13",
  "data": {
    "grid": [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      // ... 9x9 array, 0 = empty cell
    ]
  },
  "solution": {
    "grid": [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      // ... complete 9x9 array
    ]
  },
  "hints": [
    { "row": 0, "col": 2, "value": 4 },
    // ... pre-calculated hints
  ],
  "createdAt": "2025-11-13T00:00:00Z"
}
```

#### 2. Pattern Recognition
```json
{
  "id": "2025-11-13-pattern-medium",
  "type": "pattern",
  "difficulty": "medium",
  "date": "2025-11-13",
  "data": {
    "sequence": [2, 4, 8, 16, 32],
    "questionIndex": 5,
    "options": [64, 48, 56, 72]
  },
  "solution": {
    "answer": 64,
    "explanation": "Powers of 2: multiply by 2 each time"
  },
  "createdAt": "2025-11-13T00:00:00Z"
}
```

#### 3. Memory Game (Card Matching)
```json
{
  "id": "2025-11-13-memory-easy",
  "type": "memory",
  "difficulty": "easy",
  "date": "2025-11-13",
  "data": {
    "gridSize": "4x4",
    "cards": [
      { "id": 1, "image": "brain.svg", "pair": 2 },
      { "id": 2, "image": "brain.svg", "pair": 1 },
      { "id": 3, "image": "heart.svg", "pair": 4 },
      { "id": 4, "image": "heart.svg", "pair": 3 },
      // ... 16 cards (8 pairs)
    ],
    "maxTime": 120 // seconds
  },
  "solution": {
    "optimalMoves": 16
  },
  "createdAt": "2025-11-13T00:00:00Z"
}
```

#### 4. Logic Puzzle
```json
{
  "id": "2025-11-13-logic-hard",
  "type": "logic",
  "difficulty": "hard",
  "date": "2025-11-13",
  "data": {
    "question": "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies?",
    "options": ["Yes", "No", "Cannot determine"],
    "context": "Additional clues or diagram if needed"
  },
  "solution": {
    "answer": "Yes",
    "explanation": "Transitive property: If A→B and B→C, then A→C"
  },
  "createdAt": "2025-11-13T00:00:00Z"
}
```

#### 5. Word Game (Anagram/Word Search)
```json
{
  "id": "2025-11-13-word-easy",
  "type": "word",
  "difficulty": "easy",
  "date": "2025-11-13",
  "data": {
    "gameType": "anagram",
    "scrambled": "LANRIPCOBE",
    "hint": "Relating to the brain",
    "category": "health"
  },
  "solution": {
    "answer": "PRECLINICAL",
    "alternates": []
  },
  "createdAt": "2025-11-13T00:00:00Z"
}
```

### Batch Upload Script

Create puzzles in JSON files, then upload via script:

**File structure:**
```
puzzles/
  2025-11-13.json
  2025-11-14.json
  ...
```

**Upload script:** `scripts/upload-puzzles.js`
```javascript
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp();
const db = admin.firestore();

async function uploadPuzzles(filePath) {
  const puzzles = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const batch = db.batch();

  puzzles.forEach(puzzle => {
    const ref = db.collection('puzzles').doc(puzzle.id);
    batch.set(ref, puzzle);
  });

  await batch.commit();
  console.log(`Uploaded ${puzzles.length} puzzles`);
}

// Usage: node upload-puzzles.js puzzles/2025-11-13.json
uploadPuzzles(process.argv[2]);
```

---

## Additional Features (Brain Health Best Practices)

### 1. Social Connection Tracker
**Purpose:** Track meaningful social interactions (brain health tied to relationships)

**Collection:** `socialConnections`
```javascript
{
  id: auto,
  userId: "user123",
  date: "2025-11-13",
  connectionType: "conversation" | "activity" | "call" | "message",
  withWhom: "Friend name",
  duration: 60, // minutes
  quality: 1-5, // rating
  notes: "Great catch-up over coffee",
  createdAt: Timestamp
}
```

**UI Integration:**
- Quick log widget on dashboard
- Weekly goal: "Connect with 2 friends"
- Auto-populate from week recap
- Analytics: connections over time

**Components:**
- `src/components/social/ConnectionLogger.jsx`
- `src/components/social/ConnectionHistory.jsx`

---

### 2. Nature Exposure Logger
**Purpose:** Track time outdoors (proven cognitive benefits)

**Collection:** `natureExposure`
```javascript
{
  id: auto,
  userId: "user123",
  date: "2025-11-13",
  duration: 30, // minutes
  activity: "walk" | "hike" | "garden" | "sit" | "exercise",
  location: "Park" | "Forest" | "Beach" | "Backyard",
  weather: "sunny" | "cloudy" | "rainy",
  mood: "energized" | "calm" | "refreshed",
  createdAt: Timestamp
}
```

**UI Integration:**
- Daily quick-log button
- Weekly goal: "30 min outdoors/day"
- Charts: nature time trends
- Integration with "3 ways you fueled your mind/body"

**Components:**
- `src/components/nature/NatureLogger.jsx`
- `src/components/nature/NatureDashboard.jsx`

---

### 3. Cognitive Load Monitor
**Purpose:** Track energy/focus levels throughout day to identify peak performance times

**Collection:** `energyCheckins`
```javascript
{
  id: auto,
  userId: "user123",
  timestamp: Timestamp,
  energyLevel: 1-10,
  focusLevel: 1-10,
  mood: "energized" | "tired" | "stressed" | "calm" | "motivated",
  activity: "work" | "exercise" | "rest" | "social",
  notes: "Post-lunch slump"
}
```

**UI Integration:**
- Quick check-in widget (appears at intervals)
- Time-of-day heatmap (shows peak energy hours)
- AI insights: "You're most focused 9-11am"
- Pomodoro integration: suggest breaks when energy dips

**Components:**
- `src/components/energy/EnergyCheckIn.jsx`
- `src/components/energy/EnergyHeatmap.jsx`
- `src/components/energy/PeakPerformanceInsights.jsx`

---

### 4. Gratitude Journal (Enhanced)
**Purpose:** Expand "4 moments of joy" into dedicated gratitude practice

**Collection:** Extend `journalEntries` or create `gratitudeEntries`
```javascript
{
  id: auto,
  userId: "user123",
  date: "2025-11-13",
  gratitudeItems: [
    "Morning coffee",
    "Supportive friend",
    "Beautiful sunset"
  ],
  reflection: "Feeling grateful for small moments today",
  createdAt: Timestamp
}
```

**UI Integration:**
- Daily gratitude prompt
- Auto-populate "4 moments of joy" from weekly gratitude entries
- Gratitude streak counter
- Monthly gratitude summary

**Components:**
- `src/components/gratitude/GratitudeEntry.jsx`
- `src/components/gratitude/GratitudeHistory.jsx`

---

### 5. Digital Wellbeing Dashboard
**Purpose:** Screen time awareness and scheduled breaks

**Data Sources:**
- Focus sessions (Pomodoro)
- Time spent in app (track with analytics)
- Scheduled breaks

**Collection:** `digitalWellbeing`
```javascript
{
  id: auto,
  userId: "user123",
  date: "2025-11-13",
  screenTimeMinutes: 240,
  breaksTaken: 4,
  focusSessionsCompleted: 6,
  eyeStrainReported: false,
  breakReminders: true
}
```

**UI Integration:**
- Daily screen time summary
- Break reminders every 60-90 minutes
- "Digital sunset" reminder (reduce screens before bed)
- Integration with sleep routine

**Components:**
- `src/components/wellbeing/DigitalWellbeingDashboard.jsx`
- `src/components/wellbeing/BreakReminder.jsx`
- `src/components/wellbeing/ScreenTimeChart.jsx`

---

### 6. Brain Health Score (Composite Metric)
**Purpose:** Gamified overall score based on all brain health activities

**Calculation:**
```javascript
brainHealthScore = (
  puzzleScore * 0.15 +        // Daily puzzles completed
  focusScore * 0.20 +          // Focus time (Pomodoro)
  sleepScore * 0.20 +          // Sleep quality/duration
  socialScore * 0.15 +         // Social connections
  natureScore * 0.10 +         // Nature exposure
  movementScore * 0.10 +       // Physical activity
  gratitudeScore * 0.05 +      // Gratitude practice
  learningScore * 0.05         // Masterclass completion
) * 100
```

**Collection:** `brainHealthScores`
```javascript
{
  id: auto,
  userId: "user123",
  date: "2025-11-13",
  overallScore: 78, // 0-100
  breakdown: {
    puzzle: 85,
    focus: 70,
    sleep: 65,
    social: 90,
    nature: 60,
    movement: 75,
    gratitude: 80,
    learning: 50
  },
  trend: "increasing" | "stable" | "decreasing",
  createdAt: Timestamp
}
```

**UI Integration:**
- Dashboard widget showing current score
- Weekly/monthly trends
- Category breakdown (radar chart)
- AI coaching based on low scores
- Leaderboard (optional, community)

**Components:**
- `src/components/score/BrainHealthScore.jsx`
- `src/components/score/ScoreTrend.jsx`
- `src/components/score/CategoryBreakdown.jsx`

---

**End of document**
