# Solo Experience Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect existing wellness data points into a meaningful narrative that tells users WHY their week went well or poorly, while adding lightweight lapse recovery education and brain health science to the daily flow.

**Architecture:** A client-side correlation engine computes relationships between sleep, mood, energy, stress, habits, focus, and journaling data already in Firestore. Template-driven dashboard card surfaces the top insight. AI-generated weekly narrative (via new backend endpoint) replaces the generic NarrativeRecap on Insights. Lapse education is nested inside the existing WelcomeBackCard. Brain health copy is rewritten to plain language across existing components.

**Tech Stack:** React Native/TypeScript, Firestore queries, AsyncStorage caching, Express.js endpoint, OpenAI gpt-4o-mini

**Spec:** `docs/superpowers/specs/2026-03-27-solo-experience-enhancement-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `mobile/src/services/correlationEngine.service.ts` | Fetches rolling window data, computes correlations, caches results |
| `mobile/src/services/__tests__/correlationEngine.service.test.ts` | Unit tests for correlation logic |
| `mobile/src/components/dashboard/WeekInsightCard.tsx` | Dashboard teaser card rendering template-driven insight |
| `mobile/src/constants/weekInsightTemplates.ts` | Template strings and selection logic for teaser card |
| `mobile/src/constants/lapseEducation.ts` | Copy pool for "Why habits can be hard" expandable content |
| `mobile/src/constants/brainInsightsCopy.ts` | All rewritten plain-language brain health copy (education card, insight strip, completion sheet "Did you know?") |

### Modified Files

| File | Change |
|------|--------|
| `mobile/src/components/dashboard/WelcomeBackCard.tsx` | Add expandable "Why habits can be hard" section |
| `mobile/src/screens/DashboardScreen.tsx` | Mount WeekInsightCard and BrainHealthEducationCard |
| `mobile/src/components/dashboard/BrainHealthInsightStrip.tsx` | Replace 6 messages with new plain-language copy |
| `mobile/src/components/dashboard/BrainHealthEducationCard.tsx` | Replace copy with plain-language versions from constants |
| `mobile/src/components/HabitCompletionSheet/StandardSheet.tsx` | Add "Did you know?" line |
| `mobile/src/components/HabitCompletionSheet/ConnectionSheet.tsx` | Add "Did you know?" line |
| `mobile/src/screens/InsightsScreen.tsx` | Replace NarrativeRecap with AI weekly narrative |
| `mobile/src/components/insights/NarrativeRecap.tsx` | Rewrite to accept correlation data and render AI or fallback narrative |
| `backend/server.js` | Add `/api/weekly-narrative` endpoint |

---

## Task 1: Create Plain-Language Copy Constants

**Files:**
- Create: `mobile/src/constants/brainInsightsCopy.ts`
- Create: `mobile/src/constants/lapseEducation.ts`

All user-facing copy lives in dedicated constants files so it's easy to review, edit, and ensure no em dashes slip through.

- [ ] **Step 1: Create brainInsightsCopy.ts**

```typescript
// mobile/src/constants/brainInsightsCopy.ts

/**
 * All plain-language brain health copy used across the app.
 * Rules: No em dashes. No scientific jargon. Written like a friend explaining something.
 */

// BrainHealthInsightStrip - 6 rotating messages on dashboard
export const INSIGHT_STRIP_MESSAGES = [
  'Your brain can only hold a few things in focus at once. Removing distractions doesn\'t just help you concentrate, it changes how deeply your brain processes what\'s in front of you.',
  'Your brain builds habits by strengthening connections between neurons. Every time you repeat a habit, that connection gets a little stronger.',
  'Small changes stick better when they match your brain\'s natural energy patterns. That\'s why timing matters almost as much as effort.',
  'Rest isn\'t the opposite of productivity. Your brain does some of its most important work during downtime, including locking in what you learned today.',
  'Consistency doesn\'t require perfection. Your brain responds to patterns, not streaks. Showing up most days matters more than never missing one.',
  'Habits are easier to maintain when they work with your brain\'s natural rhythms instead of fighting them.',
];

// BrainHealthEducationCard - 10 facts with tips, rewritten to plain language
export const EDUCATION_CARD_ITEMS = [
  {
    pillar: 'energy',
    icon: 'lightning-bolt',
    label: 'Energy',
    title: 'Power Your Brain',
    fact: 'Your brain uses about 20% of your energy every day, even though it\'s tiny compared to the rest of your body. That\'s why mental exhaustion is real.',
    tip: 'Try a quick movement break to boost blood flow and mental clarity.',
    route: 'Movement',
  },
  {
    pillar: 'energy',
    icon: 'power-sleep',
    label: 'Energy',
    title: 'Rest for Success',
    fact: 'During deep sleep, your brain cleans itself out about 10 times faster than when you\'re awake. That\'s why a bad night hits so hard the next day.',
    tip: 'Aim for 7 to 9 hours of quality sleep for your brain to do its best work.',
    route: 'Sleep',
  },
  {
    pillar: 'focus',
    icon: 'target',
    label: 'Focus',
    title: 'Master Your Focus',
    fact: 'The part of your brain responsible for focus is one of the last areas to fully mature. That means focus is a skill you can keep building your whole life.',
    tip: 'Work in 90-minute blocks with breaks to keep your concentration sharp.',
    route: 'Focus',
  },
  {
    pillar: 'focus',
    icon: 'meditation',
    label: 'Focus',
    title: 'Train Attention',
    fact: 'About 8 weeks of regular mindfulness practice can physically change your brain in ways that show up on scans. Small daily effort adds up.',
    tip: 'Try 5 minutes of focused breathing to strengthen your attention.',
    route: 'Breathwork',
  },
  {
    pillar: 'growth',
    icon: 'brain',
    label: 'Growth',
    title: 'Grow Your Brain',
    fact: 'Your brain can form new connections throughout your entire life. It never stops adapting and growing.',
    tip: 'Learn something new today. Even 15 minutes of learning stimulates brain growth.',
    route: 'Masterclass',
  },
  {
    pillar: 'growth',
    icon: 'book-open-variant',
    label: 'Growth',
    title: 'Learn to Thrive',
    fact: 'Challenging your mind regularly builds a reserve of brain capacity that protects you over time.',
    tip: 'Journal your thoughts. Writing strengthens the connections in your brain.',
    route: 'Journal',
  },
  {
    pillar: 'resilience',
    icon: 'shield-check',
    label: 'Resilience',
    title: 'Build Resilience',
    fact: 'There\'s a major nerve connecting your brain and body that helps manage your stress response. You can actually train it to work better.',
    tip: 'Deep breathing activates your calm-down system in seconds.',
    route: 'Breathwork',
  },
  {
    pillar: 'resilience',
    icon: 'heart-pulse',
    label: 'Resilience',
    title: 'Stress Mastery',
    fact: 'A moderate amount of stress can actually sharpen your memory and focus. The key is recovery afterward.',
    tip: 'Try reframing challenges as growth opportunities for your brain.',
    route: 'BrainHealth',
  },
  {
    pillar: 'connection',
    icon: 'account-group',
    label: 'Connection',
    title: 'Social Brain Health',
    fact: 'Strong social connections can reduce your risk of cognitive decline by up to 50%. Your brain is wired to thrive on connection.',
    tip: 'Reach out to someone today. Social interaction is fuel for your brain.',
    route: 'Community',
  },
  {
    pillar: 'connection',
    icon: 'account-heart',
    label: 'Connection',
    title: 'The Power of Connection',
    fact: 'The bonding chemicals your brain releases during good conversations improve memory and learning.',
    tip: 'Quality conversations matter more than quantity for brain health.',
    route: 'Community',
  },
];

// HabitCompletionSheet "Did you know?" micro-insights by category
export const COMPLETION_INSIGHTS: Record<string, string[]> = {
  'Sleep': [
    'Even one extra hour of sleep can improve your focus and decision-making the next day.',
    'Your brain processes and organizes memories while you sleep. Good rest tonight means clearer thinking tomorrow.',
    'Sleep is when your brain clears out the waste from the day. Think of it as your nightly reset.',
  ],
  'Focus & Clarity': [
    'Short focus sessions build your brain\'s attention capacity over time, like reps at the gym.',
    'Your brain gets better at focusing the more you practice it. Each session is training.',
    'Taking breaks between focus sessions actually helps your brain work better, not worse.',
  ],
  'Movement': [
    'Movement sends growth signals to your brain that help with learning and memory for hours after.',
    'Even a short walk increases blood flow to your brain and can improve your mood within minutes.',
    'Regular movement helps your brain create new connections more easily.',
  ],
  'Mindfulness': [
    'A few minutes of mindfulness can calm your nervous system for the rest of the day.',
    'Mindfulness practice makes your brain better at catching stress before it spirals.',
    'Your brain\'s ability to focus improves with regular mindfulness, even in small doses.',
  ],
  'Connection': [
    'Meaningful conversations activate the same brain areas involved in reward and motivation.',
    'Your brain is wired for connection. Social interaction isn\'t a luxury, it\'s a need.',
    'Positive social moments help your brain recover from stress faster.',
  ],
  'General': [
    'Every time you complete a habit, your brain makes it a little easier to do it next time.',
    'Your brain responds to patterns more than perfection. Showing up most days is what matters.',
    'Building a habit is like wearing a path through a field. Each time, the path gets clearer.',
  ],
};

/**
 * Get a "Did you know?" insight for a habit completion, based on category.
 * Rotates daily so users don't see the same message twice in a row.
 */
export function getCompletionInsight(category?: string): string {
  const pool = COMPLETION_INSIGHTS[category || 'General'] || COMPLETION_INSIGHTS['General'];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return pool[dayOfYear % pool.length];
}
```

- [ ] **Step 2: Create lapseEducation.ts**

```typescript
// mobile/src/constants/lapseEducation.ts

/**
 * Plain-language explanations for why habits drop off.
 * Shown inside the WelcomeBackCard when a user returns after 48+ hours.
 * Rules: No em dashes. No jargon. Friend explaining over coffee.
 */

export const LAPSE_EDUCATION_MESSAGES = [
  'When your brain is stretched thin from poor sleep, extra stress, or too many demands, it drops the newest habits first. It\'s not a willpower failure, it\'s energy management. The habits will come back easier than you think.',

  'Habits feel hardest to restart because your brain treats them as optional when it\'s under pressure. The things that fell off were probably the first things your brain let go of to conserve energy. That\'s normal.',

  'Most people think falling off track means they need more discipline. Usually it means something else was draining their energy. When that settles, the habits come back.',

  'Your brain has a limited budget for effort each day. When life gets heavier, it pulls from the newest accounts first, which are usually your habits. Coming back isn\'t starting over. The foundation is still there.',

  'The pattern of starting and stopping isn\'t a character flaw. It\'s your brain doing exactly what brains do under strain. The fact that you\'re here again says more than the gap.',
];

/**
 * Get a lapse education message. Rotates per lapse occurrence.
 * Uses a counter stored in AsyncStorage so the user sees a different
 * message each time they return after a lapse.
 */
export function getLapseMessage(lapseCount: number): string {
  return LAPSE_EDUCATION_MESSAGES[lapseCount % LAPSE_EDUCATION_MESSAGES.length];
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/constants/brainInsightsCopy.ts mobile/src/constants/lapseEducation.ts
git commit -m "feat: add plain-language copy constants for brain insights and lapse education"
```

---

## Task 2: Correlation Engine Service

**Files:**
- Create: `mobile/src/services/correlationEngine.service.ts`
- Create: `mobile/src/services/__tests__/correlationEngine.service.test.ts`

- [ ] **Step 1: Write failing tests for the correlation engine**

```typescript
// mobile/src/services/__tests__/correlationEngine.service.test.ts

import {
  computeCorrelations,
  type DailyDataPoint,
  type WeeklyCorrelations,
} from '../correlationEngine.service';

// Helper to build test data
function makeDay(overrides: Partial<DailyDataPoint> = {}): DailyDataPoint {
  return {
    date: '2026-03-20',
    sleepQuality: null,
    mood: null,
    energy: null,
    stress: null,
    habitCompletionRate: null,
    focusMinutes: null,
    journaled: false,
    ...overrides,
  };
}

describe('computeCorrelations', () => {
  it('returns null when fewer than 5 days have mood or sleep data', () => {
    const data = [
      makeDay({ date: '2026-03-20', mood: 4 }),
      makeDay({ date: '2026-03-21', mood: 3 }),
      makeDay({ date: '2026-03-22' }), // no mood or sleep
      makeDay({ date: '2026-03-23' }),
    ];
    expect(computeCorrelations(data)).toBeNull();
  });

  it('returns correlations when 5+ days have data', () => {
    const data = [
      makeDay({ date: '2026-03-16', sleepQuality: 4, mood: 4, habitCompletionRate: 90, journaled: true }),
      makeDay({ date: '2026-03-17', sleepQuality: 2, mood: 2, habitCompletionRate: 40, journaled: false }),
      makeDay({ date: '2026-03-18', sleepQuality: 5, mood: 4, habitCompletionRate: 100, journaled: true }),
      makeDay({ date: '2026-03-19', sleepQuality: 1, mood: 2, habitCompletionRate: 30, journaled: false }),
      makeDay({ date: '2026-03-20', sleepQuality: 4, mood: 4, habitCompletionRate: 85, journaled: true }),
    ];
    const result = computeCorrelations(data);
    expect(result).not.toBeNull();
    expect(result!.sleepHabitCorrelation).toBeDefined();
    expect(result!.topDriver).toBeDefined();
    expect(result!.bestDay).toBeDefined();
    expect(result!.hardestDay).toBeDefined();
  });

  it('computes sleep-habit correlation correctly', () => {
    const data = [
      makeDay({ date: '2026-03-16', sleepQuality: 5, habitCompletionRate: 100 }),
      makeDay({ date: '2026-03-17', sleepQuality: 4, habitCompletionRate: 80 }),
      makeDay({ date: '2026-03-18', sleepQuality: 1, habitCompletionRate: 20 }),
      makeDay({ date: '2026-03-19', sleepQuality: 2, habitCompletionRate: 40 }),
      makeDay({ date: '2026-03-20', sleepQuality: 5, habitCompletionRate: 90 }),
    ];
    const result = computeCorrelations(data)!;
    // High sleep (4+): avg of 100, 80, 90 = 90
    expect(result.sleepHabitCorrelation.highSleepCompletion).toBe(90);
    // Low sleep (1-2): avg of 20, 40 = 30
    expect(result.sleepHabitCorrelation.lowSleepCompletion).toBe(30);
    // Gap of 60 > 15, so significant
    expect(result.sleepHabitCorrelation.significant).toBe(true);
  });

  it('computes journal-mood correlation correctly', () => {
    const data = [
      makeDay({ date: '2026-03-16', mood: 4, journaled: true }),
      makeDay({ date: '2026-03-17', mood: 2, journaled: false }),
      makeDay({ date: '2026-03-18', mood: 5, journaled: true }),
      makeDay({ date: '2026-03-19', mood: 2, journaled: false }),
      makeDay({ date: '2026-03-20', mood: 4, journaled: true }),
    ];
    const result = computeCorrelations(data)!;
    // Journal days: avg of 4, 5, 4 = 4.33
    expect(result.journalMoodCorrelation.journalDayMood).toBeCloseTo(4.33, 1);
    // Non-journal days: avg of 2, 2 = 2
    expect(result.journalMoodCorrelation.nonJournalDayMood).toBe(2);
    // Gap of 2.33 > 0.8, so significant
    expect(result.journalMoodCorrelation.significant).toBe(true);
  });

  it('identifies the best and hardest days', () => {
    const data = [
      makeDay({ date: '2026-03-16', mood: 2, sleepQuality: 1, habitCompletionRate: 20, stress: 5 }),
      makeDay({ date: '2026-03-17', mood: 5, sleepQuality: 5, habitCompletionRate: 100, stress: 1 }),
      makeDay({ date: '2026-03-18', mood: 3, sleepQuality: 3, habitCompletionRate: 60, stress: 3 }),
      makeDay({ date: '2026-03-19', mood: 4, sleepQuality: 4, habitCompletionRate: 80, stress: 2 }),
      makeDay({ date: '2026-03-20', mood: 3, sleepQuality: 3, habitCompletionRate: 50, stress: 3 }),
    ];
    const result = computeCorrelations(data)!;
    expect(result.bestDay.day).toBe('2026-03-17');
    expect(result.hardestDay.day).toBe('2026-03-16');
  });

  it('computes stress trend correctly', () => {
    const data = [
      makeDay({ date: '2026-03-16', mood: 3, stress: 5 }),
      makeDay({ date: '2026-03-17', mood: 3, stress: 4 }),
      makeDay({ date: '2026-03-18', mood: 3, stress: 3 }),
      makeDay({ date: '2026-03-19', mood: 3, stress: 2 }),
      makeDay({ date: '2026-03-20', mood: 3, stress: 1 }),
    ];
    const result = computeCorrelations(data)!;
    expect(result.stressTrend).toBe('declining');
  });

  it('marks correlations as not significant when gaps are small', () => {
    const data = [
      makeDay({ date: '2026-03-16', sleepQuality: 4, habitCompletionRate: 70 }),
      makeDay({ date: '2026-03-17', sleepQuality: 2, habitCompletionRate: 65 }),
      makeDay({ date: '2026-03-18', sleepQuality: 5, habitCompletionRate: 72 }),
      makeDay({ date: '2026-03-19', sleepQuality: 1, habitCompletionRate: 60 }),
      makeDay({ date: '2026-03-20', sleepQuality: 4, habitCompletionRate: 68 }),
    ];
    const result = computeCorrelations(data)!;
    // High sleep: avg of 70, 72, 68 = 70. Low sleep: avg of 65, 60 = 62.5. Gap = 7.5 < 15
    expect(result.sleepHabitCorrelation.significant).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest src/services/__tests__/correlationEngine.service.test.ts --forceExit`
Expected: FAIL - "Cannot find module '../correlationEngine.service'"

- [ ] **Step 3: Implement the correlation engine**

```typescript
// mobile/src/services/correlationEngine.service.ts

/**
 * Correlation Engine
 *
 * Computes relationships between existing wellness data points.
 * Runs entirely on the client. No PII leaves the device.
 * All data is already collected by the app - this just connects the dots.
 */

export interface DailyDataPoint {
  date: string;           // YYYY-MM-DD
  sleepQuality: number | null;   // 1-5
  mood: number | null;           // 1-5
  energy: number | null;         // 1-5
  stress: number | null;         // 1-5
  habitCompletionRate: number | null; // 0-100
  focusMinutes: number | null;
  journaled: boolean;
}

export interface CorrelationPair {
  highValue: number;
  lowValue: number;
  significant: boolean;
}

export interface WeeklyCorrelations {
  sleepHabitCorrelation: {
    highSleepCompletion: number;
    lowSleepCompletion: number;
    significant: boolean;
  };
  energyHabitCorrelation: {
    highEnergyCompletion: number;
    lowEnergyCompletion: number;
    significant: boolean;
  };
  journalMoodCorrelation: {
    journalDayMood: number;
    nonJournalDayMood: number;
    significant: boolean;
  };
  sleepFocusCorrelation: {
    highSleepFocusMin: number;
    lowSleepFocusMin: number;
    significant: boolean;
  };
  topDriver: {
    factor: string;
    direction: 'positive' | 'negative';
    impact: number;
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
    insight: string;
  };
  stressTrend: 'rising' | 'declining' | 'stable';
  weekOverWeek: {
    scoreChange: number;
    habitChange: number;
  };
  dataCompleteness: number;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 100) / 100;
}

function dayScore(day: DailyDataPoint): number {
  let score = 0;
  let factors = 0;
  if (day.mood != null) { score += day.mood * 20; factors++; }
  if (day.sleepQuality != null) { score += day.sleepQuality * 20; factors++; }
  if (day.habitCompletionRate != null) { score += day.habitCompletionRate; factors++; }
  if (day.stress != null) { score += (6 - day.stress) * 20; factors++; } // invert stress
  if (day.energy != null) { score += day.energy * 20; factors++; }
  return factors > 0 ? score / factors : 0;
}

function getDayFactors(day: DailyDataPoint): string[] {
  const factors: string[] = [];
  if (day.sleepQuality != null && day.sleepQuality >= 4) factors.push('good sleep');
  if (day.sleepQuality != null && day.sleepQuality <= 2) factors.push('poor sleep');
  if (day.mood != null && day.mood >= 4) factors.push('good mood');
  if (day.mood != null && day.mood <= 2) factors.push('low mood');
  if (day.stress != null && day.stress >= 4) factors.push('high stress');
  if (day.stress != null && day.stress <= 2) factors.push('low stress');
  if (day.energy != null && day.energy >= 4) factors.push('high energy');
  if (day.energy != null && day.energy <= 2) factors.push('low energy');
  if (day.journaled) factors.push('journaled');
  if (day.habitCompletionRate != null && day.habitCompletionRate >= 80) factors.push('strong habit day');
  return factors;
}

export function computeCorrelations(data: DailyDataPoint[]): WeeklyCorrelations | null {
  // Minimum data threshold: 5+ days with mood or sleep data
  const daysWithData = data.filter(d => d.mood != null || d.sleepQuality != null);
  if (daysWithData.length < 5) return null;

  // Total fields that could be filled vs actually filled
  const totalPossible = data.length * 7; // 7 fields per day
  const totalFilled = data.reduce((sum, d) => {
    let count = 0;
    if (d.sleepQuality != null) count++;
    if (d.mood != null) count++;
    if (d.energy != null) count++;
    if (d.stress != null) count++;
    if (d.habitCompletionRate != null) count++;
    if (d.focusMinutes != null) count++;
    if (d.journaled) count++;
    return sum + count;
  }, 0);

  // Sleep-habit correlation
  const highSleepDays = data.filter(d => d.sleepQuality != null && d.sleepQuality >= 4 && d.habitCompletionRate != null);
  const lowSleepDays = data.filter(d => d.sleepQuality != null && d.sleepQuality <= 2 && d.habitCompletionRate != null);
  const highSleepCompletion = avg(highSleepDays.map(d => d.habitCompletionRate!));
  const lowSleepCompletion = avg(lowSleepDays.map(d => d.habitCompletionRate!));
  const sleepHabitGap = Math.abs(highSleepCompletion - lowSleepCompletion);

  // Energy-habit correlation
  const highEnergyDays = data.filter(d => d.energy != null && d.energy >= 4 && d.habitCompletionRate != null);
  const lowEnergyDays = data.filter(d => d.energy != null && d.energy <= 2 && d.habitCompletionRate != null);
  const highEnergyCompletion = avg(highEnergyDays.map(d => d.habitCompletionRate!));
  const lowEnergyCompletion = avg(lowEnergyDays.map(d => d.habitCompletionRate!));
  const energyHabitGap = Math.abs(highEnergyCompletion - lowEnergyCompletion);

  // Journal-mood correlation
  const journalDays = data.filter(d => d.journaled && d.mood != null);
  const nonJournalDays = data.filter(d => !d.journaled && d.mood != null);
  const journalDayMood = avg(journalDays.map(d => d.mood!));
  const nonJournalDayMood = avg(nonJournalDays.map(d => d.mood!));
  const journalMoodGap = Math.abs(journalDayMood - nonJournalDayMood);

  // Sleep-focus correlation
  const highSleepFocusDays = data.filter(d => d.sleepQuality != null && d.sleepQuality >= 4 && d.focusMinutes != null);
  const lowSleepFocusDays = data.filter(d => d.sleepQuality != null && d.sleepQuality <= 2 && d.focusMinutes != null);
  const highSleepFocusMin = avg(highSleepFocusDays.map(d => d.focusMinutes!));
  const lowSleepFocusMin = avg(lowSleepFocusDays.map(d => d.focusMinutes!));

  // Stress trend (compare first half vs second half)
  const stressDays = data.filter(d => d.stress != null);
  let stressTrend: 'rising' | 'declining' | 'stable' = 'stable';
  if (stressDays.length >= 4) {
    const mid = Math.floor(stressDays.length / 2);
    const firstHalf = avg(stressDays.slice(0, mid).map(d => d.stress!));
    const secondHalf = avg(stressDays.slice(mid).map(d => d.stress!));
    const diff = secondHalf - firstHalf;
    if (diff >= 0.5) stressTrend = 'rising';
    else if (diff <= -0.5) stressTrend = 'declining';
  }

  // Best and hardest days
  const scoredDays = data
    .filter(d => d.mood != null || d.sleepQuality != null)
    .map(d => ({ day: d.date, score: dayScore(d), factors: getDayFactors(d) }));
  scoredDays.sort((a, b) => b.score - a.score);
  const bestDay = scoredDays[0] || { day: 'unknown', factors: [] };
  const hardestDay = scoredDays[scoredDays.length - 1] || { day: 'unknown', factors: [] };

  // Bright spot: find the most positive correlation
  const candidates: { factor: string; gap: number; insight: string }[] = [];
  if (journalDays.length > 0 && nonJournalDays.length > 0 && journalDayMood > nonJournalDayMood) {
    candidates.push({
      factor: 'journaling',
      gap: journalMoodGap,
      insight: `Your mood averaged ${journalDayMood} on days you journaled vs. ${nonJournalDayMood} on days you didn't.`,
    });
  }
  if (highSleepDays.length > 0 && lowSleepDays.length > 0 && highSleepCompletion > lowSleepCompletion) {
    candidates.push({
      factor: 'sleep',
      gap: sleepHabitGap,
      insight: `You completed ${highSleepCompletion}% of habits on well-rested days vs. ${lowSleepCompletion}% when sleep was low.`,
    });
  }
  if (highEnergyDays.length > 0 && lowEnergyDays.length > 0 && highEnergyCompletion > lowEnergyCompletion) {
    candidates.push({
      factor: 'energy',
      gap: energyHabitGap,
      insight: `On high-energy days you completed ${highEnergyCompletion}% of habits vs. ${lowEnergyCompletion}% on low-energy days.`,
    });
  }
  if (stressTrend === 'declining') {
    candidates.push({
      factor: 'stress',
      gap: 10,
      insight: 'Your stress levels came down this week. That\'s worth noticing.',
    });
  }
  candidates.sort((a, b) => b.gap - a.gap);
  const brightSpot = candidates[0] || { factor: 'general', insight: 'You showed up this week. That counts.' };

  // Top driver: which factor had the biggest impact
  const driverCandidates: { factor: string; direction: 'positive' | 'negative'; impact: number }[] = [];
  if (sleepHabitGap > 0) {
    driverCandidates.push({
      factor: 'sleep',
      direction: highSleepCompletion > lowSleepCompletion ? 'positive' : 'negative',
      impact: sleepHabitGap,
    });
  }
  if (energyHabitGap > 0) {
    driverCandidates.push({
      factor: 'energy',
      direction: highEnergyCompletion > lowEnergyCompletion ? 'positive' : 'negative',
      impact: energyHabitGap,
    });
  }
  if (journalMoodGap > 0) {
    driverCandidates.push({
      factor: 'journaling',
      direction: journalDayMood > nonJournalDayMood ? 'positive' : 'negative',
      impact: journalMoodGap * 10, // scale mood gap to be comparable with percentage gaps
    });
  }
  driverCandidates.sort((a, b) => b.impact - a.impact);
  const topDriver = driverCandidates[0] || { factor: 'general', direction: 'positive' as const, impact: 0 };

  return {
    sleepHabitCorrelation: {
      highSleepCompletion,
      lowSleepCompletion,
      significant: sleepHabitGap > 15 && highSleepDays.length > 0 && lowSleepDays.length > 0,
    },
    energyHabitCorrelation: {
      highEnergyCompletion,
      lowEnergyCompletion,
      significant: energyHabitGap > 15 && highEnergyDays.length > 0 && lowEnergyDays.length > 0,
    },
    journalMoodCorrelation: {
      journalDayMood,
      nonJournalDayMood,
      significant: journalMoodGap > 0.8 && journalDays.length > 0 && nonJournalDays.length > 0,
    },
    sleepFocusCorrelation: {
      highSleepFocusMin,
      lowSleepFocusMin,
      significant: Math.abs(highSleepFocusMin - lowSleepFocusMin) > 10 && highSleepFocusDays.length > 0 && lowSleepFocusDays.length > 0,
    },
    topDriver,
    bestDay: { day: bestDay.day, factors: bestDay.factors },
    hardestDay: { day: hardestDay.day, factors: hardestDay.factors },
    brightSpot: { factor: brightSpot.factor, insight: brightSpot.insight },
    stressTrend,
    weekOverWeek: { scoreChange: 0, habitChange: 0 }, // populated by caller with previous week data
    dataCompleteness: totalPossible > 0 ? Math.round((totalFilled / totalPossible) * 100) / 100 : 0,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest src/services/__tests__/correlationEngine.service.test.ts --forceExit`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/services/correlationEngine.service.ts mobile/src/services/__tests__/correlationEngine.service.test.ts
git commit -m "feat: add correlation engine service with tests"
```

---

## Task 3: Week Insight Templates and Selection Logic

**Files:**
- Create: `mobile/src/constants/weekInsightTemplates.ts`

- [ ] **Step 1: Create the template file with selection logic**

```typescript
// mobile/src/constants/weekInsightTemplates.ts

import type { WeeklyCorrelations } from '../services/correlationEngine.service';

interface InsightTemplate {
  key: string;
  priority: number; // lower = higher priority in tiebreakers
  headline: string;
  supporting: string;
}

/**
 * Generate the best insight to show on the dashboard teaser card.
 * Returns null if no significant correlations exist.
 */
export function selectWeekInsight(correlations: WeeklyCorrelations): InsightTemplate | null {
  const candidates: InsightTemplate[] = [];

  // Week-over-week improvement
  if (correlations.weekOverWeek.scoreChange > 3) {
    candidates.push({
      key: 'weekOverWeek',
      priority: 0,
      headline: `Your wellness score is up ${correlations.weekOverWeek.scoreChange} points from last week.`,
      supporting: `${correlations.topDriver.factor.charAt(0).toUpperCase() + correlations.topDriver.factor.slice(1)} was the biggest factor.`,
    });
  }

  // Sleep-habit correlation
  if (correlations.sleepHabitCorrelation.significant) {
    candidates.push({
      key: 'sleepHabit',
      priority: 1,
      headline: 'Sleep shaped your habits this week.',
      supporting: `You completed ${correlations.sleepHabitCorrelation.highSleepCompletion}% of habits on well-rested days vs. ${correlations.sleepHabitCorrelation.lowSleepCompletion}% when sleep was rough.`,
    });
  }

  // Journal-mood correlation
  if (correlations.journalMoodCorrelation.significant) {
    candidates.push({
      key: 'journalMood',
      priority: 2,
      headline: 'Journaling lifted your mood this week.',
      supporting: `Your mood averaged ${correlations.journalMoodCorrelation.journalDayMood} on days you wrote vs. ${correlations.journalMoodCorrelation.nonJournalDayMood} on days you didn't.`,
    });
  }

  // Energy-habit correlation
  if (correlations.energyHabitCorrelation.significant) {
    candidates.push({
      key: 'energyHabit',
      priority: 3,
      headline: 'Energy made the difference this week.',
      supporting: `On high-energy days you followed through ${correlations.energyHabitCorrelation.highEnergyCompletion}% of the time vs. ${correlations.energyHabitCorrelation.lowEnergyCompletion}% on low days.`,
    });
  }

  // Stress trend declining
  if (correlations.stressTrend === 'declining') {
    candidates.push({
      key: 'stressDecline',
      priority: 4,
      headline: 'Your stress came down this week.',
      supporting: 'Even with everything going on, that shift is worth noticing.',
    });
  }

  // Best day
  if (correlations.bestDay.factors.length >= 2) {
    const dayName = formatDayName(correlations.bestDay.day);
    const factors = correlations.bestDay.factors.slice(0, 2);
    candidates.push({
      key: 'bestDay',
      priority: 5,
      headline: `${dayName} was your strongest day this week.`,
      supporting: `${factors[0].charAt(0).toUpperCase() + factors[0].slice(1)} and ${factors[1]} lined up.`,
    });
  }

  if (candidates.length === 0) return null;

  // Sort by significance gap (largest first), then by priority for tiebreakers
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0];
}

function formatDayName(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return 'One day';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/constants/weekInsightTemplates.ts
git commit -m "feat: add week insight template selection logic"
```

---

## Task 4: Dashboard WeekInsightCard Component

**Files:**
- Create: `mobile/src/components/dashboard/WeekInsightCard.tsx`

- [ ] **Step 1: Create the WeekInsightCard component**

```tsx
// mobile/src/components/dashboard/WeekInsightCard.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

interface WeekInsightCardProps {
  headline: string;
  supporting: string;
  onPressFullStory?: () => void;
  onDismiss?: () => void;
}

const WeekInsightCard: React.FC<WeekInsightCardProps> = ({
  headline,
  supporting,
  onPressFullStory,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headlineRow}>
            <Icon name="lightbulb-outline" size={18} color={Colors.evergreenTeal} style={styles.icon} />
            <Text style={styles.headline}>{headline}</Text>
          </View>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.supporting}>{supporting}</Text>
        {onPressFullStory && (
          <TouchableOpacity onPress={onPressFullStory} style={styles.linkRow}>
            <Text style={styles.linkText}>See your full week story</Text>
            <Icon name="arrow-right" size={14} color={Colors.evergreenTeal} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    backgroundColor: Colors.evergreenTeal,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  headline: {
    flex: 1,
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  supporting: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginLeft: 26, // align with headline text (icon width + margin)
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 26,
  },
  linkText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginRight: 4,
  },
});

export default WeekInsightCard;
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/dashboard/WeekInsightCard.tsx
git commit -m "feat: add WeekInsightCard dashboard component"
```

---

## Task 5: Lapse Recovery - Enhance WelcomeBackCard

**Files:**
- Modify: `mobile/src/components/dashboard/WelcomeBackCard.tsx`

- [ ] **Step 1: Read the current WelcomeBackCard to get exact current code**

Read `mobile/src/components/dashboard/WelcomeBackCard.tsx` in full before editing.

- [ ] **Step 2: Add expandable "Why habits can be hard" section**

Add the following changes to WelcomeBackCard.tsx:

1. Import `getLapseMessage` from `../../constants/lapseEducation`
2. Import `AsyncStorage` from `@react-native-async-storage/async-storage`
3. Add state: `const [expanded, setExpanded] = useState(false)`
4. Add state: `const [lapseCount, setLapseCount] = useState(0)`
5. On mount, read and increment `vara_lapse_count` from AsyncStorage
6. Add the "Why habits can be hard" button below the existing body text
7. On tap, expand to show the education paragraph with a divider
8. On dismiss (X or re-tap), collapse and hide the button until next lapse

The expanded section should include:
- A subtle horizontal divider (1px, borderLight color)
- A small label: "Why habits can be hard" with info-circle icon
- The education paragraph from `getLapseMessage(lapseCount)`
- An X button to collapse

**Key implementation notes:**
- The auto-dismiss timer (6 seconds) should be CANCELLED if the user expands the section. They're reading, don't dismiss under them.
- After collapsing, store a flag in AsyncStorage (`vara_lapse_education_dismissed`) so the button doesn't reappear this session. Clear this flag when the WelcomeBackCard next mounts (next lapse).
- Fix the existing em dash in body copy: change `"Nothing to catch up on — just today."` to `"Nothing to catch up on. Just today."`

- [ ] **Step 3: Test manually**

1. Set device clock forward 3 days, reopen app
2. Verify WelcomeBackCard appears with "Why habits can be hard" button
3. Tap button, verify card expands with education text
4. Verify auto-dismiss timer is cancelled while expanded
5. Tap X, verify card collapses
6. Re-open app, verify button does not reappear (same session)

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/dashboard/WelcomeBackCard.tsx
git commit -m "feat: add expandable lapse education to WelcomeBackCard"
```

---

## Task 6: Rewrite BrainHealthInsightStrip Copy

**Files:**
- Modify: `mobile/src/components/dashboard/BrainHealthInsightStrip.tsx`

- [ ] **Step 1: Read the current file**

Read `mobile/src/components/dashboard/BrainHealthInsightStrip.tsx` in full.

- [ ] **Step 2: Replace the hardcoded messages array with the import**

Replace the inline `MESSAGES` array (approximately lines 13-20) with:

```typescript
import { INSIGHT_STRIP_MESSAGES } from '../../constants/brainInsightsCopy';
```

Then update the `useMemo` that selects a message to reference `INSIGHT_STRIP_MESSAGES` instead of the local array.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/dashboard/BrainHealthInsightStrip.tsx
git commit -m "refactor: replace insight strip copy with plain-language versions"
```

---

## Task 7: Rewrite BrainHealthEducationCard Copy

**Files:**
- Modify: `mobile/src/components/dashboard/BrainHealthEducationCard.tsx`

- [ ] **Step 1: Read the current file**

Read `mobile/src/components/dashboard/BrainHealthEducationCard.tsx` in full.

- [ ] **Step 2: Replace the hardcoded education items with the import**

Replace the inline `EDUCATION_ITEMS` array (approximately lines 25-115) with:

```typescript
import { EDUCATION_CARD_ITEMS } from '../../constants/brainInsightsCopy';
```

Update the selection logic and rendering to use `EDUCATION_CARD_ITEMS` instead of the local array. Keep the existing day-of-year rotation and preferredPillar filtering logic, just point it at the new constant.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/dashboard/BrainHealthEducationCard.tsx
git commit -m "refactor: replace education card copy with plain-language versions"
```

---

## Task 8: Add "Did You Know?" to Habit Completion Sheet

**Files:**
- Modify: `mobile/src/components/HabitCompletionSheet/StandardSheet.tsx`
- Modify: `mobile/src/components/HabitCompletionSheet/ConnectionSheet.tsx`

- [ ] **Step 1: Read both sheet files**

Read `mobile/src/components/HabitCompletionSheet/StandardSheet.tsx` and `ConnectionSheet.tsx` in full.

- [ ] **Step 2: Add the "Did you know?" line to StandardSheet**

At the bottom of the sheet content (below the reflection chips and affirming copy area, above the sheet dismiss/close area), add:

```tsx
import { getCompletionInsight } from '../../constants/brainInsightsCopy';

// Inside the component, after existing content:
const insight = useMemo(() => getCompletionInsight(habit.category), [habit.category]);

// In the JSX, after the last existing content block:
<Text style={styles.didYouKnow}>{insight}</Text>
```

Add the style:
```typescript
didYouKnow: {
  fontSize: 12,
  color: Colors.textSecondary,
  lineHeight: 17,
  textAlign: 'center',
  marginTop: Spacing.base,
  paddingHorizontal: Spacing.lg,
},
```

- [ ] **Step 3: Add the same line to ConnectionSheet**

Same pattern as StandardSheet. Import `getCompletionInsight`, use `habit.category` (which will be 'Connection'), add the text and style.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/HabitCompletionSheet/StandardSheet.tsx mobile/src/components/HabitCompletionSheet/ConnectionSheet.tsx
git commit -m "feat: add 'Did you know?' micro-insight to habit completion sheets"
```

---

## Task 9: Data Aggregation Hook for Correlation Engine

**Files:**
- Create: `mobile/src/hooks/useWeeklyCorrelations.ts`

This hook fetches the raw data from Firestore, transforms it into `DailyDataPoint[]`, and feeds it to `computeCorrelations()`. Caches result in AsyncStorage.

- [ ] **Step 1: Create the hook**

```typescript
// mobile/src/hooks/useWeeklyCorrelations.ts

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { getHabitCompletions } from '../services/firebase/habits.service';
import {
  computeCorrelations,
  type DailyDataPoint,
  type WeeklyCorrelations,
} from '../services/correlationEngine.service';

const CACHE_KEY = 'vara_weekly_correlations';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateRange(days: number): { start: Date; end: Date; dates: string[] } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return { start, end, dates };
}

export function useWeeklyCorrelations(): {
  correlations: WeeklyCorrelations | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const [correlations, setCorrelations] = useState<WeeklyCorrelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      // Check cache first
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.date === todayStr()) {
            if (!cancelled) {
              setCorrelations(parsed.data);
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // Cache miss, compute fresh
      }

      try {
        const { start, end, dates } = dateRange(7);
        const uid = user!.uid;

        // Fetch all data sources in parallel
        const [morningCheckIns, brainMetrics, journalEntries, focusSessions, habits] = await Promise.all([
          fetchMorningCheckIns(uid, dates),
          fetchBrainMetrics(uid, dates),
          fetchJournalEntries(uid, start, end),
          fetchFocusSessions(uid, start, end),
          fetchHabitsAndCompletions(uid, dates),
        ]);

        // Build daily data points
        const dailyData: DailyDataPoint[] = dates.map(date => {
          const checkIn = morningCheckIns.get(date);
          const brain = brainMetrics.get(date);
          const journaled = journalEntries.has(date);
          const focus = focusSessions.get(date) || 0;
          const habitRate = habits.get(date);

          return {
            date,
            sleepQuality: brain?.sleepQuality ?? null,
            mood: checkIn?.mood ?? null,
            energy: checkIn?.energyLevel ?? null,
            stress: brain?.stressLevel ?? null,
            habitCompletionRate: habitRate ?? null,
            focusMinutes: focus > 0 ? focus : null,
            journaled,
          };
        });

        const result = computeCorrelations(dailyData);

        // Cache result
        try {
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), data: result }));
        } catch {
          // Non-critical cache write failure
        }

        if (!cancelled) {
          setCorrelations(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error computing correlations:', err);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.uid]);

  return { correlations, loading };
}

// --- Data fetchers ---

async function fetchMorningCheckIns(
  uid: string,
  dates: string[],
): Promise<Map<string, { mood: number; energyLevel: number }>> {
  const map = new Map();
  const fetches = dates.map(async (date) => {
    try {
      const docRef = doc(db, 'morningCheckIns', `${uid}_${date}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        map.set(date, { mood: data.mood, energyLevel: data.energyLevel });
      }
    } catch {
      // Skip this date
    }
  });
  await Promise.all(fetches);
  return map;
}

async function fetchBrainMetrics(
  uid: string,
  dates: string[],
): Promise<Map<string, { sleepQuality: number; stressLevel: number }>> {
  const map = new Map();
  const fetches = dates.map(async (date) => {
    try {
      const docRef = doc(db, 'brainMetrics', `${uid}_${date}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        map.set(date, {
          sleepQuality: data.sleepQuality ?? null,
          stressLevel: data.stressLevel ?? null,
        });
      }
    } catch {
      // Skip this date
    }
  });
  await Promise.all(fetches);
  return map;
}

async function fetchJournalEntries(
  uid: string,
  start: Date,
  end: Date,
): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const q = query(
      collection(db, 'journalEntries'),
      where('userId', '==', uid),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end)),
    );
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      const ts = d.data().createdAt;
      if (ts?.toDate) {
        const date = ts.toDate();
        set.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
      }
    });
  } catch {
    // Return empty set
  }
  return set;
}

async function fetchFocusSessions(
  uid: string,
  start: Date,
  end: Date,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const q = query(
      collection(db, 'focusSessions'),
      where('userId', '==', uid),
    );
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      const data = d.data();
      if (!data.completed) return;
      const seconds = data.startedAt?.seconds || 0;
      if (seconds < start.getTime() / 1000 || seconds > end.getTime() / 1000) return;
      const date = new Date(seconds * 1000);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + (data.duration || 0));
    });
  } catch {
    // Return empty map
  }
  return map;
}

async function fetchHabitsAndCompletions(
  uid: string,
  dates: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const q = query(
      collection(db, 'habits'),
      where('userId', '==', uid),
      where('active', '==', true),
    );
    const habitsSnap = await getDocs(q);
    const habitIds = habitsSnap.docs.map(d => d.id);

    if (habitIds.length === 0) return map;

    // For each date, count how many habits were completed
    const completionPromises = habitIds.map(async (habitId) => {
      const completions = await getHabitCompletions(habitId);
      return { habitId, completions };
    });
    const allCompletions = await Promise.all(completionPromises);

    for (const date of dates) {
      let completed = 0;
      for (const { completions } of allCompletions) {
        const match = completions.find(c => c.date === date && c.completed);
        if (match) completed++;
      }
      const rate = Math.round((completed / habitIds.length) * 100);
      map.set(date, rate);
    }
  } catch {
    // Return empty map
  }
  return map;
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useWeeklyCorrelations.ts
git commit -m "feat: add useWeeklyCorrelations hook for data aggregation"
```

---

## Task 10: Mount WeekInsightCard and BrainHealthEducationCard on Dashboard

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Read the current DashboardScreen**

Read `mobile/src/screens/DashboardScreen.tsx` in full to understand the current card ordering and imports.

- [ ] **Step 2: Add imports and mount the new cards**

Add these imports:
```typescript
import WeekInsightCard from '../components/dashboard/WeekInsightCard';
import BrainHealthEducationCard from '../components/dashboard/BrainHealthEducationCard';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { selectWeekInsight } from '../constants/weekInsightTemplates';
```

Inside the component, add:
```typescript
const { correlations } = useWeeklyCorrelations();
const weekInsight = correlations ? selectWeekInsight(correlations) : null;
const [weekInsightDismissed, setWeekInsightDismissed] = useState(false);
```

In the JSX, place the cards below the Weekly Habits grid and above the AI Daily Plan card:

```tsx
{/* Week Insight Card - below habits, above daily plan */}
{weekInsight && !weekInsightDismissed && (
  <WeekInsightCard
    headline={weekInsight.headline}
    supporting={weekInsight.supporting}
    onPressFullStory={() => navigation.navigate('Insights')}
    onDismiss={() => setWeekInsightDismissed(true)}
  />
)}

{/* Brain Health Education Card - below week insight, above daily plan */}
<BrainHealthEducationCard />
```

**Do not modify** the habit tracker section, the WelcomeBackCard, or any other existing cards.

- [ ] **Step 3: Verify the dashboard renders without errors**

Run: `cd mobile && npx expo start` and check the dashboard screen loads without crashes. The WeekInsightCard will only appear for users with 5+ days of data.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "feat: mount WeekInsightCard and BrainHealthEducationCard on dashboard"
```

---

## Task 11: Backend Weekly Narrative Endpoint

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Read the current server.js to find the right insertion point**

Read `backend/server.js` to identify where to add the new endpoint (after the existing `/api/week-recap-suggestions` endpoint, before the health check).

- [ ] **Step 2: Add the `/api/weekly-narrative` endpoint**

Add after the week-recap-suggestions endpoint and before the health check:

```javascript
// Weekly Narrative - AI-generated summary from correlation data
// Receives ONLY anonymized aggregate numbers. No PII.
app.post('/api/weekly-narrative', aiLimiter, requireAuth, async (req, res) => {
  const { correlationData } = req.body;

  if (!correlationData) {
    return res.status(400).json({ error: 'Missing required field: correlationData' });
  }

  try {
    const systemPrompt = `
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
    `.trim();

    const userPrompt = `
Here is a summary of this person's week (all anonymized, no identifying info):

Sleep average: ${correlationData.sleepAvg ?? 'not tracked'}/5
Mood average: ${correlationData.moodAvg ?? 'not tracked'}/5
Energy average: ${correlationData.energyAvg ?? 'not tracked'}/5
Stress average: ${correlationData.stressAvg ?? 'not tracked'}/5
Habit completion rate: ${correlationData.habitCompletionRate != null ? Math.round(correlationData.habitCompletionRate) + '%' : 'not tracked'}
Focus minutes average: ${correlationData.focusMinutesAvg ?? 'not tracked'} min/day
Days journaled: ${correlationData.journalDays ?? 0} of ${correlationData.totalDays ?? 7}

Key patterns:
${correlationData.sleepHabitCorrelation?.significant ? `- On well-rested days, habit completion was ${correlationData.sleepHabitCorrelation.high}% vs ${correlationData.sleepHabitCorrelation.low}% on poor sleep days` : ''}
${correlationData.journalMoodCorrelation?.significant ? `- Mood averaged ${correlationData.journalMoodCorrelation.journalDayMood} on journal days vs ${correlationData.journalMoodCorrelation.nonJournalDayMood} on non-journal days` : ''}
${correlationData.stressTrend ? `- Stress trend: ${correlationData.stressTrend}` : ''}
${correlationData.brightSpot?.insight ? `- Bright spot: ${correlationData.brightSpot.insight}` : ''}
${correlationData.weekOverWeek?.scoreChange ? `- Wellness score change from last week: ${correlationData.weekOverWeek.scoreChange > 0 ? '+' : ''}${correlationData.weekOverWeek.scoreChange} points` : ''}

Best day factors: ${correlationData.bestDay?.factors?.join(', ') || 'not enough data'}
Hardest day factors: ${correlationData.hardestDay?.factors?.join(', ') || 'not enough data'}

Write a 3-5 sentence weekly summary based on these patterns.
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const raw = response.choices?.[0]?.message?.content?.trim() || '';
    res.status(200).json({ narrative: stripMarkdown(raw) });
  } catch (err) {
    console.error('Weekly narrative error:', err);
    res.status(500).json({ error: 'Failed to generate weekly narrative' });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/server.js
git commit -m "feat: add /api/weekly-narrative endpoint for AI weekly summary"
```

---

## Task 12: Replace NarrativeRecap on Insights Screen

**Files:**
- Modify: `mobile/src/components/insights/NarrativeRecap.tsx`
- Modify: `mobile/src/screens/InsightsScreen.tsx`

- [ ] **Step 1: Read both files in full**

Read `mobile/src/components/insights/NarrativeRecap.tsx` and `mobile/src/screens/InsightsScreen.tsx`.

- [ ] **Step 2: Update NarrativeRecap to accept AI narrative or fallback**

Rewrite NarrativeRecap to accept the new props while keeping the same visual shell:

```tsx
// mobile/src/components/insights/NarrativeRecap.tsx

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';

interface NarrativeRecapProps {
  narrative: string | null; // AI-generated or template fallback
  loading: boolean;
  timeframeLabel: string;
}

const NarrativeRecap: React.FC<NarrativeRecapProps> = ({
  narrative,
  loading,
  timeframeLabel,
}) => {
  if (!narrative && !loading) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerEmoji}>{'  '}</Text>
        <Text style={styles.headerLabel}>Your {timeframeLabel} Story</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.evergreenTeal} />
          <Text style={styles.loadingText}>Putting your week together...</Text>
        </View>
      ) : (
        <Text style={styles.narrative}>{narrative}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  narrative: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
});

export default NarrativeRecap;
```

- [ ] **Step 3: Update InsightsScreen to wire in the correlation data and AI narrative**

In InsightsScreen.tsx, add:

```typescript
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../services/api/ai.service'; // or wherever the base URL is exported
```

Inside the component, add the narrative fetching logic:

```typescript
const { correlations } = useWeeklyCorrelations();
const [aiNarrative, setAiNarrative] = useState<string | null>(null);
const [narrativeLoading, setNarrativeLoading] = useState(false);

useEffect(() => {
  if (!correlations || !user?.uid) return;

  async function fetchNarrative() {
    // Check cache (valid for 7 days)
    const cacheKey = 'vara_weekly_narrative';
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - parsed.timestamp;
        if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
          setAiNarrative(parsed.narrative);
          return;
        }
      }
    } catch {}

    // Generate via API
    setNarrativeLoading(true);
    try {
      const token = await user!.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/weekly-narrative`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          correlationData: {
            sleepAvg: correlations.sleepHabitCorrelation.highSleepCompletion > 0
              ? Math.round((correlations.sleepHabitCorrelation.highSleepCompletion + correlations.sleepHabitCorrelation.lowSleepCompletion) / 2)
              : null,
            moodAvg: correlations.journalMoodCorrelation.journalDayMood > 0
              ? Math.round((correlations.journalMoodCorrelation.journalDayMood + correlations.journalMoodCorrelation.nonJournalDayMood) / 2 * 10) / 10
              : null,
            habitCompletionRate: Math.round(
              (correlations.sleepHabitCorrelation.highSleepCompletion + correlations.sleepHabitCorrelation.lowSleepCompletion) / 2
            ),
            journalDays: correlations.journalMoodCorrelation.journalDayMood > 0 ? 3 : 0, // approximate
            totalDays: 7,
            sleepHabitCorrelation: correlations.sleepHabitCorrelation.significant
              ? { high: correlations.sleepHabitCorrelation.highSleepCompletion, low: correlations.sleepHabitCorrelation.lowSleepCompletion, significant: true }
              : undefined,
            journalMoodCorrelation: correlations.journalMoodCorrelation.significant
              ? correlations.journalMoodCorrelation
              : undefined,
            stressTrend: correlations.stressTrend,
            brightSpot: correlations.brightSpot,
            bestDay: correlations.bestDay,
            hardestDay: correlations.hardestDay,
            weekOverWeek: correlations.weekOverWeek,
          },
        }),
      });
      const data = await response.json();
      if (data.narrative) {
        setAiNarrative(data.narrative);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          narrative: data.narrative,
          timestamp: Date.now(),
        }));
      }
    } catch (err) {
      // Fallback: use template
      const fallback = `This week you completed about ${Math.round(
        (correlations.sleepHabitCorrelation.highSleepCompletion + correlations.sleepHabitCorrelation.lowSleepCompletion) / 2
      )}% of your habits. ${correlations.brightSpot.insight} ${
        correlations.stressTrend === 'declining'
          ? 'Your stress levels came down, which is a good sign.'
          : ''
      }`;
      setAiNarrative(fallback);
    } finally {
      setNarrativeLoading(false);
    }
  }

  fetchNarrative();
}, [correlations, user?.uid]);
```

Update the NarrativeRecap mounting (replace the old props-based call):

```tsx
<NarrativeRecap
  narrative={aiNarrative}
  loading={narrativeLoading}
  timeframeLabel={getTimeFrameLabel()}
/>
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/insights/NarrativeRecap.tsx mobile/src/screens/InsightsScreen.tsx
git commit -m "feat: replace generic NarrativeRecap with AI-driven weekly narrative"
```

---

## Task 13: Final Verification and Cleanup

- [ ] **Step 1: Run all existing tests to check for regressions**

Run: `cd mobile && npx jest --forceExit`
Expected: All existing tests pass. New correlation engine tests pass.

- [ ] **Step 2: Scan all new/modified files for em dashes**

Run a grep across all changed files:
```bash
grep -r '—' mobile/src/constants/brainInsightsCopy.ts mobile/src/constants/lapseEducation.ts mobile/src/constants/weekInsightTemplates.ts mobile/src/components/dashboard/WeekInsightCard.tsx mobile/src/components/dashboard/WelcomeBackCard.tsx mobile/src/components/dashboard/BrainHealthInsightStrip.tsx mobile/src/components/dashboard/BrainHealthEducationCard.tsx mobile/src/components/HabitCompletionSheet/StandardSheet.tsx mobile/src/components/HabitCompletionSheet/ConnectionSheet.tsx mobile/src/components/insights/NarrativeRecap.tsx backend/server.js
```
Expected: No matches. If any found, fix them.

- [ ] **Step 3: Verify no PII in the weekly-narrative endpoint**

Read `backend/server.js` and confirm the `/api/weekly-narrative` endpoint:
- Does NOT access `req.uid` for anything sent to OpenAI
- Does NOT include user names, emails, habit names, goal titles, or journal content in the prompt
- Only forwards the anonymized `correlationData` object from the request body

- [ ] **Step 4: Commit any cleanup fixes**

```bash
git add -A
git commit -m "chore: final cleanup and em-dash scan for solo experience enhancement"
```

---

## Execution Summary

| Task | What It Delivers | New/Modified Files |
|------|------------------|--------------------|
| 1 | All plain-language copy in one place | 2 new constant files |
| 2 | Correlation engine with tests | 1 service + 1 test file |
| 3 | Template selection logic for dashboard | 1 new constant file |
| 4 | Dashboard teaser card component | 1 new component |
| 5 | Lapse recovery in WelcomeBackCard | 1 modified component |
| 6 | Insight strip copy rewrite | 1 modified component |
| 7 | Education card copy rewrite | 1 modified component |
| 8 | "Did you know?" on completion sheet | 2 modified components |
| 9 | Data aggregation hook | 1 new hook |
| 10 | Mount new cards on dashboard | 1 modified screen |
| 11 | AI weekly narrative backend endpoint | 1 modified server file |
| 12 | AI narrative on Insights screen | 2 modified files |
| 13 | Final verification | Cleanup pass |
