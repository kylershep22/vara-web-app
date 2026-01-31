# Demo Account Data Population Guide

This guide will help you populate the `demo@varawellness.app` account with realistic demo data for Apple's App Review.

## Prerequisites

1. Demo account created: `demo@varawellness.app` / `Demo2026!`
2. Access to Firebase Console
3. Demo user UID (get this from Firebase Console → Authentication → Users)

---

## Option 1: Use the App (EASIEST & RECOMMENDED)

**This is the simplest approach and ensures all data is formatted correctly.**

1. **Log in to the app** as `demo@varawellness.app`

2. **Create 3 Goals** (Go to Goals/Habits screen):
   - Goal 1: "Run a 10K race" | Focus: Fitness | Timeframe: 3 months | Progress: 35%
   - Goal 2: "Learn Spanish conversationally" | Focus: Learning | Timeframe: 6 months | Progress: 20%
   - Goal 3: "Improve sleep quality" | Focus: Wellness | Timeframe: 2 months | Progress: 60%

3. **Create 5 Habits** (Go to Habits screen):
   - "Morning run" | Daily | 5x per week
   - "Read for 20 minutes" | Daily | 7x per week
   - "Practice Spanish" | Daily | 5x per week
   - "Meditate" | Daily | 7x per week
   - "Drink 8 glasses of water" | Daily | 7x per week

4. **Check off habits** for the past 7-14 days to build streaks

5. **Create 8 Tasks** (Go to Tasks screen):
   - High priority: "Schedule dentist appointment", "Finish quarterly report"
   - Medium: "Buy new running shoes", "Update LinkedIn profile"
   - Low: "Organize closet", "Research vacation destinations"
   - Mark 2-3 as completed

6. **Write 5 Journal Entries** (Go to Journal screen) - use the content below:

**Journal Entry 1** (Great mood):
```
Had an amazing run this morning - finally hit my 5K goal without stopping! The weather was perfect, cool and crisp. I'm noticing that waking up earlier is really making a difference in my energy levels throughout the day. Still struggling with the Spanish practice, but I'm trying not to be too hard on myself. Progress over perfection.
```
Tags: running, goals, gratitude

**Journal Entry 2** (Okay mood):
```
Feeling a bit tired today. Stayed up too late watching Netflix (again). Need to be more disciplined about my bedtime routine. On the positive side, I did manage to meditate this morning and it helped me feel more centered. Work was stressful with the quarterly report deadline approaching, but I made good progress.
```
Tags: sleep, work, meditation

**Journal Entry 3** (Good mood):
```
Really proud of myself for maintaining my reading habit. Just finished chapter 5 of 'Atomic Habits' and the identity-based habits concept is resonating with me. Started thinking about who I want to become, not just what I want to achieve. Had a great conversation with Sarah about my Spanish learning journey - she recommended some podcasts that I'm excited to try.
```
Tags: reading, learning, friendship

**Journal Entry 4** (Good mood):
```
Grateful for small wins today. Even though I was tempted to skip my morning routine, I showed up and did the minimum version of my run (just 10 minutes). It's funny how just showing up makes such a difference. Also had a video call with Mom which always lifts my spirits. She's proud of my wellness journey.
```
Tags: gratitude, family, habits

**Journal Entry 5** (Okay mood):
```
Today was tough. Woke up late, skipped my run, felt guilty about it all day. But then I remembered the 'never miss twice' rule and made sure to at least do my meditation and reading. Sometimes life happens and that's okay. Tomorrow is a new day to get back on track.
```
Tags: reflection, self-compassion, mindset

7. **Update Profile** (Go to Profile screen):
   - Bio: "Wellness enthusiast working on building sustainable habits. Runner, language learner, and lifelong student. Currently training for my first 10K!"
   - Set privacy to Public

---

## Option 2: Manual Entry via Firebase Console

**Only use this if you can't use the app for some reason.**

### Step 1: Get Demo User UID

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **vara-4a99f**
3. Go to **Authentication → Users**
4. Find `demo@varawellness.app`
5. **COPY THE UID** (looks like: `xYz123AbC...`)

### Step 2: Update User Profile

1. Go to **Firestore Database**
2. Navigate to `users` collection
3. Find the document with ID = the UID you copied
4. Click **Edit** and add/update these fields:
   ```
   bio: "Wellness enthusiast working on building sustainable habits. Runner, language learner, and lifelong student. Currently training for my first 10K!"
   privacy: "public"
   hasCompletedOnboarding: true
   ```

### Step 3: Create Goals

Click **+ Start collection** or open `goals` collection → **+ Add document**

For each goal below, click **Auto-ID** and add these fields (+ add `userId`, `createdAt`, `updatedAt`):

**Goal 1:**
```javascript
{
  userId: "[DEMO_USER_UID]",
  title: "Run a 10K race",
  primaryFocus: "fitness",
  refinedFocus: "Build endurance and cardiovascular health",
  timeframe: "3 months",
  progress: 35,
  status: "active",
  brainPillars: ["energy", "resilience"],
  milestones: [
    { id: "1", title: "Run 5K without stopping", completed: true },
    { id: "2", title: "Complete 3 runs per week for a month", completed: true },
    { id: "3", title: "Run 8K distance", completed: false },
    { id: "4", title: "Complete full 10K", completed: false }
  ],
  createdAt: [timestamp],
  updatedAt: [timestamp]
}
```

**Goal 2:**
```javascript
{
  userId: "[DEMO_USER_UID]",
  title: "Learn Spanish conversationally",
  primaryFocus: "learning",
  refinedFocus: "Achieve conversational fluency for upcoming trip",
  timeframe: "6 months",
  progress: 20,
  status: "active",
  brainPillars: ["growth", "focus"],
  milestones: [
    { id: "1", title: "Complete beginner course", completed: true },
    { id: "2", title: "Practice 15 minutes daily for 30 days", completed: false },
    { id: "3", title: "Have first conversation with native speaker", completed: false },
    { id: "4", title: "Watch a movie in Spanish without subtitles", completed: false }
  ],
  createdAt: [timestamp],
  updatedAt: [timestamp]
}
```

**Goal 3:**
```javascript
{
  userId: "[DEMO_USER_UID]",
  title: "Improve sleep quality",
  primaryFocus: "wellness",
  refinedFocus: "Get consistent 7-8 hours of quality sleep",
  timeframe: "2 months",
  progress: 60,
  status: "active",
  brainPillars: ["energy", "resilience", "focus"],
  milestones: [
    { id: "1", title: "Establish consistent bedtime routine", completed: true },
    { id: "2", title: "No screens 1 hour before bed for 2 weeks", completed: true },
    { id: "3", title: "Track sleep for 30 days", completed: false },
    { id: "4", title: "Achieve 7+ hours sleep for 14 consecutive nights", completed: false }
  ],
  createdAt: [timestamp],
  updatedAt: [timestamp]
}
```

### Step 4: Create Habits

Same process - go to `habits` collection → **+ Add document**

**Habit 1 - Morning run:**
```javascript
{
  userId: "[DEMO_USER_UID]",
  name: "Morning run",
  title: "Morning run",
  type: "daily",
  frequency: 5,
  active: true,
  category: "fitness",
  streak: 12,
  longestStreak: 23,
  bestStreak: 23,
  identity: "A runner",
  createdAt: [timestamp],
  updatedAt: [timestamp]
}
```

**Habit 2 - Read:**
```javascript
{
  userId: "[DEMO_USER_UID]",
  name: "Read for 20 minutes",
  title: "Read for 20 minutes",
  type: "daily",
  frequency: 7,
  active: true,
  category: "learning",
  streak: 8,
  longestStreak: 15,
  bestStreak: 15,
  identity: "A reader",
  createdAt: [timestamp],
  updatedAt: [timestamp]
}
```

**Habit 3 - Spanish:**
```javascript
{
  userId: "[DEMO_USER_UID]",
  name: "Practice Spanish",
  title: "Practice Spanish",
  type: "daily",
  frequency: 5,
  active: true,
  category: "learning",
  streak: 5,
  longestStreak: 11,
  bestStreak: 11,
  identity: "A language learner",
  createdAt: [timestamp],
  updatedAt: [timestamp]
}
```

**Habit 4 - Meditate:**
```javascript
{
  userId: "[DEMO_USER_UID]",
  name: "Meditate",
  title: "Meditate",
  type: "daily",
  frequency: 7,
  active: true,
  category: "mindfulness",
  streak: 18,
  longestStreak: 18,
  bestStreak: 18,
  identity: "A mindful person",
  createdAt: [timestamp],
  updatedAt: [timestamp]
}
```

**Habit 5 - Water:**
```javascript
{
  userId: "[DEMO_USER_UID]",
  name: "Drink 8 glasses of water",
  title: "Drink 8 glasses of water",
  type: "daily",
  frequency: 7,
  active: true,
  category: "health",
  streak: 6,
  longestStreak: 14,
  bestStreak: 14,
  identity: "Someone who prioritizes hydration",
  createdAt: [timestamp],
  updatedAt: [timestamp]
}
```

### Step 5: Create Tasks

Go to `tasks` collection → **+ Add document**

Create 8 tasks with varying priorities and completion statuses:

```javascript
// Task 1
{ userId: "[UID]", title: "Schedule dentist appointment", description: "Call Dr. Smith's office for 6-month checkup", priority: "high", completed: false, createdAt: [timestamp], updatedAt: [timestamp] }

// Task 2
{ userId: "[UID]", title: "Finish quarterly report", description: "Complete analysis and submit by Friday", priority: "high", completed: false, createdAt: [timestamp], updatedAt: [timestamp] }

// Task 3
{ userId: "[UID]", title: "Buy new running shoes", description: "Current pair has over 400 miles", priority: "medium", completed: false, createdAt: [timestamp], updatedAt: [timestamp] }

// Task 4 (COMPLETED)
{ userId: "[UID]", title: "Meal prep for the week", description: "Prepare healthy lunches for Monday-Friday", priority: "medium", completed: true, completedAt: [timestamp], createdAt: [timestamp], updatedAt: [timestamp] }

// Task 5
{ userId: "[UID]", title: "Update LinkedIn profile", description: "Add recent projects and skills", priority: "medium", completed: false, createdAt: [timestamp], updatedAt: [timestamp] }

// Task 6
{ userId: "[UID]", title: "Organize closet", description: "Donate clothes I haven't worn in a year", priority: "low", completed: false, createdAt: [timestamp], updatedAt: [timestamp] }

// Task 7
{ userId: "[UID]", title: "Research vacation destinations", description: "Look into Spain or Portugal for summer trip", priority: "low", completed: false, createdAt: [timestamp], updatedAt: [timestamp] }

// Task 8 (COMPLETED)
{ userId: "[UID]", title: "Call Mom", description: "Weekly check-in", priority: "medium", completed: true, completedAt: [timestamp], createdAt: [timestamp], updatedAt: [timestamp] }
```

### Step 6: Create Journal Entries

Go to `journalEntries` collection → **+ Add document**

Create 5 entries (copy the text from Option 1 above), structure:

```javascript
{
  userId: "[DEMO_USER_UID]",
  content: "[entry text]",
  text: "[entry text]",  // same as content
  mood: "great", // or "good", "okay", "bad", "terrible"
  tags: ["tag1", "tag2", "tag3"],
  createdAt: [timestamp - vary these by a few days],
  updatedAt: [timestamp]
}
```

---

## Verification Checklist

Once you've populated the data, log in as `demo@varawellness.app` and verify:

- [ ] Profile has bio and is set to Public
- [ ] Dashboard shows 3 active goals with progress bars
- [ ] Habits screen shows 5 active habits with streaks
- [ ] Tasks screen shows mix of completed and pending tasks
- [ ] Journal screen shows 5 entries with different moods
- [ ] All features are accessible and have content to demo

---

## Add to App Store Connect

Once verified:

1. Go to **App Store Connect**
2. Navigate to your app → **TestFlight** tab
3. Click **Test Information**
4. Scroll to **Beta App Review Information**
5. Check **"Sign-in required"**
6. Enter credentials:
   - **Username:** `demo@varawellness.app`
   - **Password:** `Demo2026!`
7. **Save**
8. **Reply to Apple's message** in App Store Connect to notify them

---

**Tip:** Option 1 (using the app) is much faster and ensures everything works correctly!
