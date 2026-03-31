/**
 * Week Insight Templates
 * Two selection strategies:
 *   - selectInsight(data)         — simple threshold-based (legacy)
 *   - selectWeekInsight(correlations) — correlation-driven (v2)
 */

/* ==================== Legacy templates ==================== */

export const WEEK_INSIGHT_TEMPLATES = [
  {
    id: "high_completions",
    check: (data) => {
      if (data.totalCompletions >= 14) {
        return {
          headline: "Strong week — you're building momentum",
          detail: `${data.totalCompletions} habit completions this week. Consistency is compounding.`,
        };
      }
      return null;
    },
  },
  {
    id: "journal_mood",
    check: (data) => {
      if (data.journalDays >= 3) {
        return {
          headline: "Journaling is paying off",
          detail: `You journaled ${data.journalDays} days this week. Written reflection strengthens self-awareness.`,
        };
      }
      return null;
    },
  },
  {
    id: "focus_sessions",
    check: (data) => {
      if (data.focusMinutes >= 50) {
        return {
          headline: "Deep work gains",
          detail: `${data.focusMinutes} minutes of focused time this week. Your attention muscle is growing.`,
        };
      }
      return null;
    },
  },
  {
    id: "best_day",
    check: (data) => {
      if (data.totalCompletions >= 5) {
        return {
          headline: `${data.bestDay} was your best day`,
          detail: "Look for patterns — what made that day click? Lean into it.",
        };
      }
      return null;
    },
  },
  {
    id: "getting_started",
    check: (data) => {
      if (data.totalCompletions > 0) {
        return {
          headline: "Every step counts",
          detail: `${data.totalCompletions} completions this week. You're showing up — that's what matters most.`,
        };
      }
      return null;
    },
  },
];

export function selectInsight(data) {
  if (!data) return null;
  for (const template of WEEK_INSIGHT_TEMPLATES) {
    const result = template.check(data);
    if (result) return { id: template.id, ...result };
  }
  return null;
}

/* ==================== Correlation-driven (v2) ==================== */

export function selectWeekInsight(correlations) {
  const candidates = [];

  if (correlations.weekOverWeek.scoreChange > 3) {
    candidates.push({
      key: 'weekOverWeek',
      priority: 0,
      headline: `Your wellness score is up ${correlations.weekOverWeek.scoreChange} points from last week.`,
      supporting: `${correlations.topDriver.factor.charAt(0).toUpperCase() + correlations.topDriver.factor.slice(1)} was the biggest factor.`,
    });
  }

  if (correlations.sleepHabitCorrelation.significant) {
    candidates.push({
      key: 'sleepHabit',
      priority: 1,
      headline: 'Sleep shaped your habits this week.',
      supporting: `You completed ${correlations.sleepHabitCorrelation.highSleepCompletion}% of habits on well-rested days vs. ${correlations.sleepHabitCorrelation.lowSleepCompletion}% when sleep was rough.`,
    });
  }

  if (correlations.journalMoodCorrelation.significant) {
    candidates.push({
      key: 'journalMood',
      priority: 2,
      headline: 'Journaling lifted your mood this week.',
      supporting: `Your mood averaged ${correlations.journalMoodCorrelation.journalDayMood} on days you wrote vs. ${correlations.journalMoodCorrelation.nonJournalDayMood} on days you didn't.`,
    });
  }

  if (correlations.energyHabitCorrelation.significant) {
    candidates.push({
      key: 'energyHabit',
      priority: 3,
      headline: 'Energy made the difference this week.',
      supporting: `On high-energy days you followed through ${correlations.energyHabitCorrelation.highEnergyCompletion}% of the time vs. ${correlations.energyHabitCorrelation.lowEnergyCompletion}% on low days.`,
    });
  }

  if (correlations.stressTrend === 'declining') {
    candidates.push({
      key: 'stressDecline',
      priority: 4,
      headline: 'Your stress came down this week.',
      supporting: 'Even with everything going on, that shift is worth noticing.',
    });
  }

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
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0];
}

function formatDayName(dateStr) {
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return 'One day';
  }
}
