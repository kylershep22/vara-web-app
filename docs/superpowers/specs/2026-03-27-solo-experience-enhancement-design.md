# Solo Experience Enhancement - Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Branch:** feature/solo-experience-enhancement (to be created)

---

## Overview

Enhance the solo (non-community) mobile app experience by addressing three gaps identified through persona analysis and beta feedback. The core investment is a correlation engine that connects existing wellness data points into a meaningful narrative. Lightweight enhancements to lapse recovery and brain health education round out the work.

### Persona Triggers Served

| Persona | Hook | What This Delivers |
|---------|------|--------------------|
| #1 Shame loop | "It's not a discipline problem. It's a brain under strain." | Lapse recovery education nested in Welcome Back card |
| #2 Brain health trigger | Science-backed framework | Plain-language brain health insights surfaced in daily flow |
| #3 Bad week | Connection between inputs and outputs | Correlation engine + weekly narrative showing WHY |
| #4 App consolidation | One system that connects everything | Data points finally talk to each other across features |

### Design Principles

- No new data collection or user input required
- No changes to the existing habit tracking UI
- No scientific jargon in user-facing copy
- No em dashes in any UI text
- No PII or identifying data sent to OpenAI
- Plain language always - written like a knowledgeable friend, not a textbook

---

## Gap 3 (Primary): Connecting the Dots

### 3A. Correlation Engine

A new client-side service that computes relationships between existing wellness data points.

**File:** `mobile/src/services/correlationEngine.service.ts`

**Inputs (all already stored in Firestore):**

| Data Point | Source | Frequency |
|-----------|--------|-----------|
| Sleep quality (1-5) | Brain readiness check-in | Daily |
| Hydration (1-5) | Brain readiness check-in | Daily |
| Stress (1-5) | Brain readiness check-in | Daily |
| Mood (1-5) | Morning check-in | Daily |
| Energy (1-5) | Morning check-in | Daily |
| Habit completions | Habit tracking | Daily per habit |
| Focus session minutes | Pomodoro timer | Per session |
| Journal entry count | Journal | Daily |

**Computed Correlations (rolling 7-day and 28-day windows):**

- Habit completion rate on high-sleep days (4+) vs low-sleep days (1-2)
- Habit completion rate on high-energy days vs low-energy days
- Average mood on journal days vs non-journal days
- Focus minutes on high-sleep days vs low-sleep days
- Stress trend direction (rising, falling, stable)
- Best day and hardest day identification with contributing factors
- Top driver: which single input had the strongest correlation to wellness score movement
- Week-over-week score and habit compliance deltas

**Output structure:**

```typescript
interface WeeklyCorrelations {
  sleepHabitCorrelation: {
    highSleepCompletion: number;  // percentage
    lowSleepCompletion: number;
    significant: boolean;         // gap > 15 points
  };
  energyHabitCorrelation: {
    highEnergyCompletion: number;
    lowEnergyCompletion: number;
    significant: boolean;
  };
  journalMoodCorrelation: {
    journalDayMood: number;       // average
    nonJournalDayMood: number;
    significant: boolean;         // gap > 0.8 points
  };
  sleepFocusCorrelation: {
    highSleepFocusMin: number;
    lowSleepFocusMin: number;
    significant: boolean;
  };
  topDriver: {
    factor: string;               // "sleep" | "stress" | "energy" | "journaling"
    direction: "positive" | "negative";
    impact: number;               // score point delta
  };
  bestDay: {
    day: string;
    factors: string[];
  };
  hardestDay: {
    day: string;
    factors: string[];
  };
  brightSpot: {
    factor: string;
    insight: string;              // pre-formatted template string
  };
  stressTrend: "rising" | "declining" | "stable";
  weekOverWeek: {
    scoreChange: number;
    habitChange: number;
  };
  dataCompleteness: number;       // 0-1
}
```

**Minimum data threshold:** 5+ days with at least mood OR sleep data in the 7-day window. Below this, the engine returns `null` and all dependent UI shows nothing (no empty states).

**Caching:** Computed once per day, stored in AsyncStorage with a date key. Recomputed on next app open after midnight.

### 3B. Dashboard Teaser Card - "Your Week at a Glance"

**Component:** `mobile/src/components/dashboard/WeekInsightCard.tsx`

**Placement:** Below the Weekly Habits grid, above the AI Daily Plan card. Does not modify the habit tracker in any way.

**Visibility:** Only appears when the correlation engine returns a non-null result (5+ days of data).

**Content (template-driven):**

1. Headline insight - one sentence connecting two data points (semibold, 15px)
2. Supporting context - one sentence with the numbers (regular, 13px, secondary color)
3. "See your full week story" link (semibold, 13px, teal)

**Template pool (selection based on highest-significance correlation):**

Sleep-habit correlation:
- "Sleep shaped your habits this week. You completed {high}% of habits on well-rested days vs. {low}% when sleep was rough."

Energy-habit correlation:
- "Energy made the difference this week. On high-energy days you followed through {high}% of the time vs. {low}% on low days."

Journal-mood correlation:
- "Journaling lifted your mood this week. Your mood averaged {journalMood} on days you wrote vs. {nonJournalMood} on days you didn't."

Stress trend (declining):
- "Your stress came down this week, even with everything going on. That's worth noticing."

Best day:
- "{day} was your strongest day this week - {factor1} and {factor2} lined up."

Bright spot:
- "{brightSpot.insight}"

Week-over-week improvement:
- "Your wellness score is up {change} points from last week. {topDriver.factor} was the biggest reason."

**Selection logic:** Rank all significant correlations by gap size. Show the one with the largest gap. Ties broken by: topDriver > sleepHabit > journalMood > energyHabit > stressTrend > bestDay.

**Visual design:**
- Full-width card, 16px padding, 12px border radius
- 3px left accent bar in Evergreen Teal (#1B5E57)
- White background with Silver Sage border at 30% opacity
- Small icon (lightbulb or similar, 18px, teal) next to headline
- Dismiss X button, top right. Reappears next day with fresh data.

### 3C. AI Weekly Narrative on Insights Screen

**New endpoint:** `POST /api/weekly-narrative`

**Replaces:** The existing `NarrativeRecap` component on the Insights screen.

**Flow:**
1. Correlation engine produces the structured output (same object as 3A)
2. On first Insights screen visit of the week, the anonymized correlation object is sent to the new endpoint
3. AI writes 3-5 sentences in Vara's coaching voice
4. Response is cached in AsyncStorage for 7 days (one API call per user per week)
5. On subsequent visits, cached narrative is displayed instantly

**Data sent to OpenAI (anonymized aggregates only):**

```json
{
  "sleepAvg": 3.2,
  "moodAvg": 3.8,
  "energyAvg": 3.0,
  "stressAvg": 2.4,
  "habitCompletionRate": 0.72,
  "focusMinutesAvg": 38,
  "journalDays": 3,
  "totalDays": 7,
  "sleepHabitCorrelation": { "high": 87, "low": 42, "significant": true },
  "bestDay": { "factors": ["high sleep", "journaled"] },
  "hardestDay": { "factors": ["poor sleep", "high stress"] },
  "brightSpot": { "factor": "journaling", "moodLift": 1.2 },
  "stressTrend": "declining",
  "weekOverWeek": { "scoreChange": -4, "habitChange": -8 }
}
```

**Not sent:** No user ID, name, email, habit names, goal titles, journal content, timestamps, device info, or any personally identifiable information.

**System prompt:**

```
You are Vara, a supportive wellness coach writing a brief weekly summary for a user.

Rules:
- Write 3-5 sentences in a warm, conversational tone like a supportive friend.
- Your output is displayed as plain text in a mobile app. Never use any formatting - no markdown, no bold, no italics, no asterisks, no hashtags, no headers, no bullet points, no numbered lists.
- Never use em dashes. Use commas, periods, or rewrite the sentence instead.
- Use plain language only. No scientific or medical jargon.
- Acknowledge hard days without dwelling on them.
- Highlight the bright spot.
- End with one gentle, specific suggestion for next week.
- Never make medical claims or diagnoses.
- Reference the data patterns provided but keep it natural, not robotic.
```

**Placement on Insights screen:** Top of screen, above all charts and heatmaps. Full-width card with the same styling as other Insights cards. Loading skeleton shown during first-of-week generation.

**Fallback (offline or API failure):** Template-based summary using the same correlation data:
- "This week you completed {rate}% of your habits across {days} active days. Your strongest day was {bestDay}. {topCorrelation template sentence}."

---

## Gap 1 (Lightweight): Lapse Recovery

### Enhancement to Welcome Back Card

**File modified:** `mobile/src/components/dashboard/WelcomeBackCard.tsx`

**Change:** Add a "Why habits can be hard" text button at the bottom of the existing card. On tap, the card expands inline to reveal a plain-language paragraph. No new screen, no modal, no navigation.

**Button:** "Why habits can be hard" in Evergreen Teal, text-only style, with right arrow indicator.

**Expanded content:** One paragraph from a rotating pool of 5 messages. Rotates per lapse occurrence (not per session).

**Copy pool:**

1. "When your brain is stretched thin from poor sleep, extra stress, or too many demands, it drops the newest habits first. It's not a willpower failure, it's energy management. The habits will come back easier than you think."

2. "Habits feel hardest to restart because your brain treats them as optional when it's under pressure. The things that fell off were probably the first things your brain let go of to conserve energy. That's normal."

3. "Most people think falling off track means they need more discipline. Usually it means something else was draining their energy. When that settles, the habits come back."

4. "Your brain has a limited budget for effort each day. When life gets heavier, it pulls from the newest accounts first, which are usually your habits. Coming back isn't starting over. The foundation is still there."

5. "The pattern of starting and stopping isn't a character flaw. It's your brain doing exactly what brains do under strain. The fact that you're here again says more than the gap."

**Dismiss behavior:** Collapsing the expanded section (tap X or tap the button again) dismisses it. The "Why habits can be hard" button does not reappear until the next lapse (next time the Welcome Back card triggers after 48+ hours away).

**Expanded section visual:**
- Subtle divider line between welcome message and expanded content
- Body text: regular 14px, #3E3E3E, line-height 21px
- Small "Why habits can be hard" header label: semibold 13px, #6F7F77, with info-circle icon
- X dismiss button in bottom-right of expanded section

### Future Enhancement (Documented for Roadmap)

Once the correlation engine is production-stable, replace the generic copy rotation with a data-informed message. If the engine can detect that sleep or stress declined in the days before the lapse, the expanded message says something specific:

- "Looks like sleep got rough before everything else did. That's usually how it works. Your brain deprioritizes habits when it's under-resourced."
- "Stress was climbing in the days before you stepped away. When your brain is managing that much, habits are the first thing it lets go of."

**This is NOT in scope for the current release.** It is documented here so it does not fall off the roadmap. It should be planned as a fast-follow once the correlation engine has 4+ weeks of production data confirming reliability.

---

## Gap 2 (Lightweight): Science Layer in Daily Flow

### 2A. Activate BrainHealthEducationCard on Dashboard

**Current state:** The component `mobile/src/components/brain/BrainHealthEducationCard.tsx` exists with 10 educational facts and "Try this" action tips. It is not mounted on any screen.

**Change:** Mount it on the Dashboard, below the new WeekInsightCard, above the AI Daily Plan card.

**Copy rewrite required:** Review all 10 messages. Rewrite any that use scientific jargon to plain language. These cards always use plain language regardless of the brain health vocabulary toggle in settings.

**Rewrite examples:**

| Before | After |
|--------|-------|
| "Your brain uses 20% of your body's energy despite being only 2% of your weight" | "Your brain uses about 20% of your energy every day, even though it's tiny compared to the rest of your body. That's why mental exhaustion is real." |
| "During deep sleep, your brain clears toxins via the glymphatic system 10x faster" | "During deep sleep, your brain cleans itself out about 10 times faster than when you're awake. That's why a bad night hits so hard the next day." |
| "Just 8 weeks of mindfulness practice can measurably change brain structure" | "About 8 weeks of regular mindfulness practice can physically change your brain in ways that show up on scans. Small daily effort adds up." |

All rewrites must avoid em dashes.

### 2B. Rewrite BrainHealthInsightStrip Copy

**Current state:** 6 rotating messages on the dashboard that are vague and abstract.

**Change:** Rewrite all 6 to be concrete, actionable, and in plain language.

**Rewrite examples:**

| Before | After |
|--------|-------|
| "Supporting brain health creates the conditions where habits can stick." | "Your brain builds habits by strengthening connections between neurons. Every time you repeat a habit, that connection gets a little stronger." |
| "Focus often improves when there's less competing demand on your attention." | "Your brain can only hold a few things in focus at once. Removing distractions doesn't just help you concentrate, it actually changes how deeply your brain processes what's in front of you." |
| "Recovery isn't a break from progress. It's part of how the brain sustains it." | "Rest isn't the opposite of productivity. Your brain does some of its most important work during downtime, including locking in what you learned today." |

### 2C. "Did You Know?" Line on Habit Completion Sheet

**File modified:** `mobile/src/components/HabitCompletionSheet/index.tsx` (and variant sheets)

**Change:** Add a single line of text at the bottom of the completion sheet. Rotates daily. Tied to the habit's category when available, falls back to general pool.

**Category-specific examples:**

| Category | Copy |
|----------|------|
| Sleep | "Even one extra hour of sleep can improve your focus and decision-making the next day." |
| Focus | "Short focus sessions build your brain's attention capacity over time, like reps at the gym." |
| Movement | "Movement sends growth signals to your brain that help with learning and memory for hours after." |
| Mindfulness | "A few minutes of mindfulness can calm your nervous system for the rest of the day." |
| General | "Every time you complete a habit, your brain makes it a little easier to do it next time." |

**Visual treatment:**
- Small text, 12px, secondary color (#6F7F77)
- No icon, no background, no border - just a quiet line of text
- Sits below the mood/note capture area, above the sheet dismiss area
- Does not interfere with the completion flow or add any taps

---

## Technical Considerations

### New Files

| File | Purpose |
|------|---------|
| `mobile/src/services/correlationEngine.service.ts` | Core correlation computation |
| `mobile/src/components/dashboard/WeekInsightCard.tsx` | Dashboard teaser card |
| `backend/server.js` (new endpoint) | `/api/weekly-narrative` |

### Modified Files

| File | Change |
|------|--------|
| `mobile/src/screens/DashboardScreen.tsx` | Mount WeekInsightCard, BrainHealthEducationCard |
| `mobile/src/components/dashboard/WelcomeBackCard.tsx` | Add expandable "Why habits can be hard" |
| `mobile/src/screens/InsightsScreen.tsx` | Replace NarrativeRecap with AI narrative |
| `mobile/src/components/brain/BrainHealthEducationCard.tsx` | Rewrite copy to plain language |
| `mobile/src/components/dashboard/BrainHealthInsightStrip.tsx` | Rewrite 6 messages |
| `mobile/src/components/HabitCompletionSheet/index.tsx` | Add "Did you know?" line |
| `mobile/src/constants/brainInsights.ts` (or similar) | New copy constants for all plain-language content |

### Data Privacy

- The `/api/weekly-narrative` endpoint receives only anonymized aggregate numbers
- No user ID, name, email, habit names, goal titles, journal content, or device info is sent
- The correlation engine runs entirely on the client
- Cached narrative is stored locally in AsyncStorage

### Performance

- Correlation engine computation is lightweight (simple averages and comparisons over 7-28 data points)
- Computed once per day, cached in AsyncStorage
- AI narrative generated once per week, cached for 7 days
- No impact on app launch time (computed after dashboard renders, not blocking)

---

## Out of Scope

- Changes to the habit tracking UI
- New data collection or user input
- Community features
- Discover/Library content expansion (separate initiative)
- Personalized lapse recovery messages based on correlation data (documented as future enhancement above)
- Changes to the Brain Health Dashboard screen itself
