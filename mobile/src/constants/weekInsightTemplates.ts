import type { WeeklyCorrelations } from '../services/correlationEngine.service';

interface InsightTemplate {
  key: string;
  priority: number;
  headline: string;
  supporting: string;
}

export function selectWeekInsight(correlations: WeeklyCorrelations): InsightTemplate | null {
  const candidates: InsightTemplate[] = [];

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

function formatDayName(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return 'One day';
  }
}
