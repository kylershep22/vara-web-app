// Round to 2 decimal places, return integer when no remainder
function avg(values) {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  const result = sum / values.length;
  return Math.round(result * 100) / 100;
}

function getDayFactors(day) {
  const factors = [];
  if (day.sleepQuality !== null) {
    if (day.sleepQuality >= 4) factors.push('good sleep');
    else if (day.sleepQuality <= 2) factors.push('poor sleep');
  }
  if (day.mood !== null) {
    if (day.mood >= 4) factors.push('high mood');
    else if (day.mood <= 2) factors.push('low mood');
  }
  if (day.energy !== null) {
    if (day.energy >= 4) factors.push('high energy');
    else if (day.energy <= 2) factors.push('low energy');
  }
  if (day.stress !== null) {
    if (day.stress >= 4) factors.push('high stress');
    else if (day.stress <= 2) factors.push('low stress');
  }
  if (day.habitCompletionRate !== null) {
    if (day.habitCompletionRate >= 80) factors.push('strong habits');
    else if (day.habitCompletionRate <= 40) factors.push('missed habits');
  }
  if (day.journaled) factors.push('journaled');
  return factors;
}

function compositeScore(day) {
  let score = 0;
  let factors = 0;

  if (day.mood !== null) {
    score += day.mood * 20;
    factors++;
  }
  if (day.sleepQuality !== null) {
    score += day.sleepQuality * 20;
    factors++;
  }
  if (day.habitCompletionRate !== null) {
    score += day.habitCompletionRate;
    factors++;
  }
  if (day.stress !== null) {
    // Invert stress: high stress = low score
    score += (6 - day.stress) * 20;
    factors++;
  }
  if (day.energy !== null) {
    score += day.energy * 20;
    factors++;
  }

  return factors > 0 ? score / factors : 0;
}

export function computeCorrelations(data) {
  // Count days with mood or sleep data
  const daysWithData = data.filter(
    (d) => d.mood !== null || d.sleepQuality !== null
  );
  if (daysWithData.length < 5) return null;

  // Sleep-habit correlation
  const highSleepDays = data.filter(
    (d) => d.sleepQuality !== null && d.sleepQuality >= 4 && d.habitCompletionRate !== null
  );
  const lowSleepDays = data.filter(
    (d) => d.sleepQuality !== null && d.sleepQuality <= 2 && d.habitCompletionRate !== null
  );
  const highSleepCompletion = avg(highSleepDays.map((d) => d.habitCompletionRate));
  const lowSleepCompletion = avg(lowSleepDays.map((d) => d.habitCompletionRate));
  const sleepHabitGap = highSleepCompletion - lowSleepCompletion;
  const sleepHabitSignificant =
    highSleepDays.length > 0 &&
    lowSleepDays.length > 0 &&
    Math.abs(sleepHabitGap) > 15;

  // Energy-habit correlation
  const highEnergyDays = data.filter(
    (d) => d.energy !== null && d.energy >= 4 && d.habitCompletionRate !== null
  );
  const lowEnergyDays = data.filter(
    (d) => d.energy !== null && d.energy <= 2 && d.habitCompletionRate !== null
  );
  const highEnergyCompletion = avg(highEnergyDays.map((d) => d.habitCompletionRate));
  const lowEnergyCompletion = avg(lowEnergyDays.map((d) => d.habitCompletionRate));
  const energyHabitGap = highEnergyCompletion - lowEnergyCompletion;
  const energyHabitSignificant =
    highEnergyDays.length > 0 &&
    lowEnergyDays.length > 0 &&
    Math.abs(energyHabitGap) > 15;

  // Journal-mood correlation
  const journalDays = data.filter((d) => d.journaled && d.mood !== null);
  const nonJournalDays = data.filter((d) => !d.journaled && d.mood !== null);
  const journalDayMood = avg(journalDays.map((d) => d.mood));
  const nonJournalDayMood = avg(nonJournalDays.map((d) => d.mood));
  const journalMoodGap = journalDayMood - nonJournalDayMood;
  const journalMoodSignificant =
    journalDays.length > 0 &&
    nonJournalDays.length > 0 &&
    Math.abs(journalMoodGap) > 0.8;

  // Sleep-focus correlation
  const highSleepFocusDays = data.filter(
    (d) => d.sleepQuality !== null && d.sleepQuality >= 4 && d.focusMinutes !== null
  );
  const lowSleepFocusDays = data.filter(
    (d) => d.sleepQuality !== null && d.sleepQuality <= 2 && d.focusMinutes !== null
  );
  const highSleepFocusMin = avg(highSleepFocusDays.map((d) => d.focusMinutes));
  const lowSleepFocusMin = avg(lowSleepFocusDays.map((d) => d.focusMinutes));
  const sleepFocusGap = highSleepFocusMin - lowSleepFocusMin;
  const sleepFocusSignificant =
    highSleepFocusDays.length > 0 &&
    lowSleepFocusDays.length > 0 &&
    Math.abs(sleepFocusGap) > 15;

  // Best and hardest days
  const scored = data.map((d) => ({ day: d, score: compositeScore(d) }));
  scored.sort((a, b) => b.score - a.score);
  const bestDayEntry = scored[0];
  const hardestDayEntry = scored[scored.length - 1];

  // Stress trend: compare first half vs second half
  const stressDays = data.filter((d) => d.stress !== null);
  let stressTrend = 'stable';
  if (stressDays.length >= 2) {
    const mid = Math.floor(stressDays.length / 2);
    const firstHalf = stressDays.slice(0, mid);
    const secondHalf = stressDays.slice(mid);
    const firstAvg = avg(firstHalf.map((d) => d.stress));
    const secondAvg = avg(secondHalf.map((d) => d.stress));
    const diff = secondAvg - firstAvg;
    if (diff >= 0.5) stressTrend = 'rising';
    else if (diff <= -0.5) stressTrend = 'declining';
  }

  // Top driver: factor with biggest impact gap
  const correlationGaps = [];

  if (highSleepDays.length > 0 && lowSleepDays.length > 0) {
    correlationGaps.push({
      factor: 'sleep',
      direction: sleepHabitGap > 0 ? 'positive' : 'negative',
      impact: Math.abs(sleepHabitGap),
    });
  }
  if (highEnergyDays.length > 0 && lowEnergyDays.length > 0) {
    correlationGaps.push({
      factor: 'energy',
      direction: energyHabitGap > 0 ? 'positive' : 'negative',
      impact: Math.abs(energyHabitGap),
    });
  }
  if (journalDays.length > 0 && nonJournalDays.length > 0) {
    correlationGaps.push({
      factor: 'journaling',
      direction: journalMoodGap > 0 ? 'positive' : 'negative',
      impact: Math.abs(journalMoodGap),
    });
  }
  if (highSleepFocusDays.length > 0 && lowSleepFocusDays.length > 0) {
    correlationGaps.push({
      factor: 'sleep-focus',
      direction: sleepFocusGap > 0 ? 'positive' : 'negative',
      impact: Math.abs(sleepFocusGap),
    });
  }

  correlationGaps.sort((a, b) => b.impact - a.impact);
  const topDriver = correlationGaps[0] ?? {
    factor: 'habits',
    direction: 'positive',
    impact: 0,
  };

  // Bright spot: largest positive correlation
  const positiveCorrelations = correlationGaps.filter(
    (c) => c.direction === 'positive'
  );
  const brightSpotSource =
    positiveCorrelations[0] ?? correlationGaps[0] ?? topDriver;
  const brightSpot = {
    factor: brightSpotSource.factor,
    insight: `${brightSpotSource.factor} is positively influencing your wellbeing`,
  };

  // Data completeness: average of fields present across all days
  const fields = [
    'sleepQuality',
    'mood',
    'energy',
    'stress',
    'habitCompletionRate',
    'focusMinutes',
  ];
  const totalPossible = data.length * fields.length;
  const totalPresent = data.reduce((sum, d) => {
    return (
      sum +
      fields.filter((f) => d[f] !== null && d[f] !== undefined).length
    );
  }, 0);
  const dataCompleteness =
    totalPossible > 0
      ? Math.round((totalPresent / totalPossible) * 100) / 100
      : 0;

  return {
    sleepHabitCorrelation: {
      highSleepCompletion,
      lowSleepCompletion,
      significant: sleepHabitSignificant,
    },
    energyHabitCorrelation: {
      highEnergyCompletion,
      lowEnergyCompletion,
      significant: energyHabitSignificant,
    },
    journalMoodCorrelation: {
      journalDayMood,
      nonJournalDayMood,
      significant: journalMoodSignificant,
    },
    sleepFocusCorrelation: {
      highSleepFocusMin,
      lowSleepFocusMin,
      significant: sleepFocusSignificant,
    },
    topDriver,
    bestDay: {
      day: bestDayEntry.day.date,
      factors: getDayFactors(bestDayEntry.day),
    },
    hardestDay: {
      day: hardestDayEntry.day.date,
      factors: getDayFactors(hardestDayEntry.day),
    },
    brightSpot,
    stressTrend,
    weekOverWeek: { scoreChange: 0, habitChange: 0 },
    dataCompleteness,
  };
}
