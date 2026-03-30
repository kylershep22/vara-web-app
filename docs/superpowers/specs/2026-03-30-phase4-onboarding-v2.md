# Phase 4: Onboarding V2 — Design Spec

**Date:** 2026-03-30
**Status:** Pending
**Parent:** Web-Mobile Parity Roadmap

## Problem

Web onboarding is a 7-step legacy flow (Welcome → Check-In → Insight → Activity → Confirmation → Profile → Set Goal). Mobile uses a streamlined flow. The web flow is longer than necessary and doesn't align with the mobile experience.

## Solution

Replace web onboarding with a streamlined flow matching mobile's approach. Mobile actually has 6 screens but the core value loop is: check in → get insight → try one thing → optionally create a habit from it.

## Onboarding Flow (6 Screens)

### Screen 1: Welcome
- Brand introduction
- Single "Let's begin" CTA

### Screen 2: Check-In
- Three sliders/selectors for:
  - Energy (1-10 scale)
  - Focus (1-10 scale)
  - Mood (1-10 scale)
- Visual dot-scale selector for each
- Data saved to user doc field `onboardingCheckIn`

### Screen 3: Brain-Health Insight
- Personalized insight generated from check-in data
- Recommended brain pillar focus (Growth/Energy/Focus/Resilience/Connection)
- User can adjust the recommendation
- Data saved: `onboardingInsight`, `selectedPillar`

### Screen 4: Try One Thing
- Shows 3 micro-activities based on selected pillar:
  - Breathing exercise (1 min guided)
  - Set an intention (30 sec)
  - 2-min reflection
- User picks one and completes it inline
- Data saved: `completedOnboardingActivity`

### Screen 5: Confirmation & Habit Offer
- Celebration of completed activity
- Soft offer: "Add to your routine?" with Yes / Maybe Later
- If Yes: creates a daily habit from the completed activity
- Data saved: `hasCompletedOnboarding: true`, `onboardingHabitCreated: boolean`

### Screen 6: Values & Personalized Entry
- Values grid selection (pick 2-3 values from predefined list)
- Summary screen showing selected values + starting focus
- "Begin" button enters the app
- Data saved: `selectedValues`

## User Document Fields Set During Onboarding

```js
{
  onboardingCheckIn: {
    energy: number,      // 1-10
    focus: number,       // 1-10
    mood: number,        // 1-10
    timestamp: string,   // ISO 8601
  },
  onboardingInsight: {
    text: string,
    recommendedFocus: string,  // brain pillar
    focusExplanation: string,
  },
  selectedPillar: string,
  completedOnboardingActivity: {
    id: string,
    name: string,
    type: 'breathing' | 'reflection' | 'intention',
    duration: string,
    completedAt: Timestamp,
    response: string | null,
  },
  selectedValues: string[],          // 2-3 values
  hasCompletedOnboarding: true,
  onboardingCompletedAt: Timestamp,
  onboardingHabitCreated: boolean,
}
```

## Activities by Pillar

| Pillar | Activity 1 | Activity 2 | Activity 3 |
|--------|-----------|-----------|-----------|
| Focus | Calming Breath (1 min) | Set an Intention (30 sec) | 2-Min Reflection |
| Energy | Energizing Breath (1 min) | Movement Intention (30 sec) | Energy Reflection (2 min) |
| Growth | Curiosity Breath (1 min) | Learning Intention (30 sec) | Growth Reflection (2 min) |
| Resilience | Grounding Breath (1 min) | Resilience Intention (30 sec) | Stress Reflection (2 min) |
| Connection | Heart-Opening Breath (1 min) | Connection Intention (30 sec) | Gratitude Reflection (2 min) |

## Web Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/onboarding/OnboardingWelcome.jsx` | Rewrite |
| `src/pages/onboarding/OnboardingCheckIn.jsx` | Rewrite |
| `src/pages/onboarding/OnboardingInsight.jsx` | Rewrite |
| `src/pages/onboarding/OnboardingActivity.jsx` | Rewrite |
| `src/pages/onboarding/OnboardingConfirmation.jsx` | Rewrite |
| `src/pages/onboarding/OnboardingValues.jsx` | Create |
| `src/services/db/onboarding.service.js` | Create or modify |
| `src/App.js` | Modify — update onboarding routes |

## Routes to Remove
- `/onboarding/profile`
- `/onboarding/set-goal`

## Out of Scope
- Brain pillar recommendation AI (use simple rules based on check-in scores)
- Guided breathing animation (simple timer with text instruction is fine for web)
