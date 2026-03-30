# Phase 2: Identity-Based Habits — Design Spec

**Date:** 2026-03-30
**Status:** Pending
**Parent:** Web-Mobile Parity Roadmap
**Depends on:** Phase 1 (Dashboard V2) — Complete

## Problem

Web habits are basic CRUD (name, category, frequency, toggle complete). Mobile habits use a rich identity-based system with scaling versions, completion reflections, bounce-back mechanics, and implementation intentions. Users on web get a stripped-down habit experience compared to mobile.

## Solution

Upgrade the web habit creation, management, and completion flows to match the mobile app's identity-based habit system.

## Habit Document Schema (Target)

```js
{
  userId: string,
  name: string,                          // Required
  type: 'daily' | 'weekly' | 'custom',
  frequency: number,
  streak: number,
  longestStreak: number,
  active: boolean,
  category: string,                      // From 12 categories

  // Identity System
  identity: string | null,               // "A runner", "Someone who writes"
  identityStatement: string | null,      // "I'm becoming {identity}"
  outcomeGoal: string | null,            // Optional traditional goal

  // Scaling Versions (Quick Start)
  fullVersion: string | null,            // "Run 30 min"
  quickStartVersion: string | null,      // "Run 10 min"
  justShowUpVersion: string | null,      // "Put on shoes"

  // Bounce Back (Never Miss Twice)
  missedYesterday: boolean,
  consecutiveMisses: number,

  // Implementation Intention
  cue: { type: 'time' | 'location' | 'after_habit' | 'emotion', value: string } | null,
  implementationIntention: string | null, // "When X, I will Y"

  // Intention & Values
  intention: { label: string, category: string, isCustom: boolean } | null,
  valueAlignment: string | null,

  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

## Habit Categories (12)

Health, Fitness, Mindfulness, Sleep, Nutrition, Productivity, Learning, Social, Connection, Creativity, Self-Care, Brain Health

**Cognitive Reserve categories:** Connection, Brain Health, Fitness, Learning, Sleep, Creativity

## Habit Creation Wizard (6 Steps)

### Step 1: Action (Required)
- Habit name (text input, required)
- Category (dropdown, 12 options)
- Type (daily/weekly/custom radio buttons)
- Frequency (derived from type)
- CR callout if cognitive reserve category selected

### Step 2: Identity (Skippable)
- Identity input ("A runner", "Someone who writes")
- Auto-generated statement preview: "I'm becoming {identity}"
- Optional outcome goal (deemphasized)

### Step 3: Scaling (Skippable)
- Full version description
- Quick start version (5-10 min simplified)
- Just show up version (1-2 min minimal)
- Info card: "Every version counts toward progress"

### Step 4: Trigger (Skippable)
- Cue type selection: Time, After Habit, Location, Feeling
- Cue value input (context-specific per type)
- Generated preview: "When {cue}, I will {habit}"

### Step 5: Intention (Skippable)
- 5 intention categories with 3 options each (15 total):
  - Focus & Clarity: "Sharpen focus", "Clear mental fog", "Stay present"
  - Regulation & Recovery: "Manage stress", "Process emotions", "Build resilience"
  - Sustainable Consistency: "Show up daily", "Build routine", "Create momentum"
  - Energy & Resilience: "Boost energy", "Recover from burnout", "Sustain energy"
  - Brain Health: "Build cognitive reserve", "Support clarity", "Strengthen resilience"
- Custom text input (max 80 chars)
- Optional value alignment link

### Step 6: Review (Final)
- Summary of all entered fields
- Optional problem statement
- CR badge if applicable
- Submit button

## Habit Completion Reflection

### Standard Habits (non-Connection category)
On completion, show a reflection sheet:
- **Reflection chips:** Smooth | Okay | Hard today
- **Skip option:** "Skip reflection" link
- **Value echo:** If valueAlignment set, show "Today, toward {value}"
- **Data saved:** `{ reflection: 'smooth'|'okay'|'hard', skippedReflection: boolean, source: 'track'|'home' }`

### Connection-Category Habits
Different reflection for Connection habits:
- **Options:** Nourishing | Fine | Draining
- **Brain science callout** about social connection
- **Data saved:** `{ connectionQuality: 'nourishing'|'fine'|'draining', skippedReflection: boolean }`

## Completion Document Schema

```js
// habitCompletions collection
{
  userId: string,
  habitId: string,
  dateISO: string,               // YYYY-MM-DD
  reflection: 'smooth' | 'okay' | 'hard' | null,
  connectionQuality: 'nourishing' | 'fine' | 'draining' | null,
  skippedReflection: boolean,
  source: 'track' | 'home',
  crFlagged: boolean,            // true if CR category
  valueAlignment: string | null,
  createdAt: Timestamp,
}
```

## Web Files to Create/Modify

| File | Action |
|------|--------|
| `src/constants/habitCategories.js` | Create — 12 categories + CR mapping |
| `src/constants/intentions.js` | Create — 15 predefined intentions |
| `src/components/habits/HabitWizard.jsx` | Create — 6-step creation wizard |
| `src/components/habits/HabitCompletionSheet.jsx` | Create — Reflection modal |
| `src/services/db/habits.service.js` | Modify — Add reflection fields to completion |
| `src/hooks/useHabits.js` | Modify — Support reflection data in completions |
| `src/pages/Habits.jsx` | Modify — Use wizard for creation, sheet for completion |

## Out of Scope
- Routine integration (Phase 3)
- Habit reminders/notifications (Phase 5)
