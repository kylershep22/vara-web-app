/**
 * Vara Wellness Score Service
 *
 * Calculates a daily wellness score (0-100) based on 4 pillars:
 * - Foundation (40%): Sleep, hydration, stress
 * - Consistency (30%): Habit compliance, 4-3-2-1, active streaks
 * - Mind (20%): Mood, journal activity, nervous system regulation
 * - Growth (10%): AMCC challenge, connection
 *
 * The score is designed to reflect how users actually feel by combining
 * subjective inputs (mood, energy) with objective behavior tracking.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  DailyWellnessScore,
  WellnessScorePillar,
  WellnessScoreComponent,
  WellnessIncompleteAction,
  MorningCheckIn,
  BrainMetrics,
  Habit,
  HabitCompletion,
  FourThreeTwoOneEntry,
  JournalEntry,
} from '../../types';

// Collection names
const WELLNESS_SCORES_COLLECTION = 'dailyWellnessScores';
const MORNING_CHECKINS_COLLECTION = 'morningCheckIns';
const BRAIN_METRICS_COLLECTION = 'brainMetrics';
const HABITS_COLLECTION = 'habits';
const FOUR_THREE_TWO_ONE_COLLECTION = 'fourThreeTwoOne';
const JOURNAL_ENTRIES_COLLECTION = 'journalEntries';

// Pillar weights
const PILLAR_WEIGHTS = {
  foundation: 0.40,
  consistency: 0.30,
  mind: 0.20,
  growth: 0.10,
};

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get yesterday's date in YYYY-MM-DD format (local timezone)
 */
const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert mood string to numeric value
 */
const moodToNumber = (mood: string | undefined): number => {
  const moodMap: Record<string, number> = {
    'great': 5,
    'good': 4,
    'okay': 3,
    'bad': 2,
    'terrible': 1,
  };
  return mood ? moodMap[mood] || 3 : 3;
};

/**
 * Get or create today's morning check-in
 */
export const getMorningCheckIn = async (userId: string): Promise<MorningCheckIn | null> => {
  if (!db) return null;
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, MORNING_CHECKINS_COLLECTION, checkInId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as MorningCheckIn;
    }
    return null;
  } catch (error) {
    console.error('Error getting morning check-in:', error);
    return null;
  }
};

/**
 * Save morning check-in
 */
export const saveMorningCheckIn = async (
  userId: string,
  energyLevel: number,
  mood: number,
  note?: string
): Promise<MorningCheckIn> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, MORNING_CHECKINS_COLLECTION, checkInId);

    const checkIn: Omit<MorningCheckIn, 'id'> = {
      userId,
      date: todayDate,
      energyLevel,
      mood,
      // Only include note if it has a value (Firebase doesn't accept undefined)
      ...(note !== undefined && note !== null && { note }),
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(docRef, checkIn);

    return {
      id: checkInId,
      ...checkIn,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  } catch (error) {
    console.error('Error saving morning check-in:', error);
    throw error;
  }
};

/**
 * Fetch all data needed for wellness score calculation
 */
interface WellnessDataSources {
  brainMetrics: BrainMetrics | null;
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  fourThreeTwoOne: FourThreeTwoOneEntry | null;
  journalEntry: JournalEntry | null;
  recentJournalEntries: JournalEntry[];
  morningCheckIn: MorningCheckIn | null;
  yesterdayScore: DailyWellnessScore | null;
}

const fetchWellnessData = async (userId: string): Promise<WellnessDataSources> => {
  const todayDate = getTodayDate();
  const yesterdayDate = getYesterdayDate();

  // Fetch all data sources in parallel
  const [
    brainMetricsSnap,
    habitsSnap,
    fourThreeTwoOneSnap,
    journalEntriesSnap,
    morningCheckInSnap,
    yesterdayScoreSnap,
  ] = await Promise.all([
    // Brain metrics for today
    getDoc(doc(db, BRAIN_METRICS_COLLECTION, `${userId}_${todayDate}`)),
    // All active habits
    getDocs(query(
      collection(db, HABITS_COLLECTION),
      where('userId', '==', userId),
      where('active', '==', true)
    )),
    // 4-3-2-1 for today
    getDoc(doc(db, FOUR_THREE_TWO_ONE_COLLECTION, `${userId}_${todayDate}`)),
    // Recent journal entries (last 7 days)
    getDocs(query(
      collection(db, JOURNAL_ENTRIES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(7)
    )),
    // Morning check-in for today
    getDoc(doc(db, MORNING_CHECKINS_COLLECTION, `${userId}_${todayDate}`)),
    // Yesterday's wellness score
    getDoc(doc(db, WELLNESS_SCORES_COLLECTION, `${userId}_${yesterdayDate}`)),
  ]);

  // Get habits
  const habits = habitsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));

  // Fetch today's completions for each habit
  const completionPromises = habits.map(habit =>
    getDoc(doc(db, HABITS_COLLECTION, habit.id, 'completions', todayDate))
  );
  const completionSnaps = await Promise.all(completionPromises);
  const habitCompletions = completionSnaps
    .filter(snap => snap.exists())
    .map(snap => ({ id: snap.id, ...snap.data() } as HabitCompletion));

  // Process journal entries
  const journalEntries = journalEntriesSnap.docs.map(
    doc => ({ id: doc.id, ...doc.data() } as JournalEntry)
  );
  const todayJournalEntry = journalEntries.find(entry => {
    const entryDate = entry.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0];
    return entryDate === todayDate;
  }) || null;

  return {
    brainMetrics: brainMetricsSnap.exists()
      ? { id: brainMetricsSnap.id, ...brainMetricsSnap.data() } as BrainMetrics
      : null,
    habits,
    habitCompletions,
    fourThreeTwoOne: fourThreeTwoOneSnap.exists()
      ? { id: fourThreeTwoOneSnap.id, ...fourThreeTwoOneSnap.data() } as FourThreeTwoOneEntry
      : null,
    journalEntry: todayJournalEntry,
    recentJournalEntries: journalEntries,
    morningCheckIn: morningCheckInSnap.exists()
      ? { id: morningCheckInSnap.id, ...morningCheckInSnap.data() } as MorningCheckIn
      : null,
    yesterdayScore: yesterdayScoreSnap.exists()
      ? { id: yesterdayScoreSnap.id, ...yesterdayScoreSnap.data() } as DailyWellnessScore
      : null,
  };
};

/**
 * Calculate Foundation pillar (40%)
 * Components: Sleep (20%), Hydration (10%), Stress (10%)
 * Only includes components with actual data in the score
 */
const calculateFoundationPillar = (
  brainMetrics: BrainMetrics | null,
  morningCheckIn: MorningCheckIn | null
): WellnessScorePillar => {
  const components: WellnessScoreComponent[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;
  let componentsWithData = 0;

  // Sleep Quality (20% of total = 50% of pillar)
  const hasSleepData = brainMetrics?.sleepQuality !== undefined && brainMetrics?.sleepQuality !== null;
  const sleepQuality = brainMetrics?.sleepQuality ?? 0;
  const sleepScore = hasSleepData ? (sleepQuality / 5) * 50 : 0;

  components.push({
    name: 'sleepQuality',
    value: hasSleepData ? sleepQuality : 0,
    maxValue: 5,
    contribution: sleepScore,
    status: !hasSleepData ? 'missing' : sleepQuality >= 4 ? 'positive' : sleepQuality >= 3 ? 'neutral' : 'negative',
    label: hasSleepData ? `Sleep: ${sleepQuality}/5` : 'Sleep: Not tracked',
    hasData: hasSleepData,
    actionRoute: 'BrainHealth',
    actionLabel: 'Log sleep quality',
  });

  if (hasSleepData) {
    totalScore += sleepScore;
    componentsWithData++;
  }
  maxPossibleScore += 50;

  // Hydration (10% of total = 25% of pillar)
  const hasHydrationData = brainMetrics?.hydrationChecks !== undefined && brainMetrics?.hydrationChecks !== null;
  const hydration = brainMetrics?.hydrationChecks ?? 0;
  const hydrationNormalized = Math.min(hydration, 5);
  const hydrationScore = hasHydrationData ? (hydrationNormalized / 5) * 25 : 0;

  components.push({
    name: 'hydration',
    value: hasHydrationData ? hydrationNormalized : 0,
    maxValue: 5,
    contribution: hydrationScore,
    status: !hasHydrationData ? 'missing' : hydrationNormalized >= 4 ? 'positive' : hydrationNormalized >= 3 ? 'neutral' : 'negative',
    label: hasHydrationData ? `Hydration: ${hydrationNormalized}/5` : 'Hydration: Not tracked',
    hasData: hasHydrationData,
    actionRoute: 'BrainHealth',
    actionLabel: 'Log hydration',
  });

  if (hasHydrationData) {
    totalScore += hydrationScore;
    componentsWithData++;
  }
  maxPossibleScore += 25;

  // Stress Level (10% of total = 25% of pillar) - inverted
  const hasStressData = brainMetrics?.stressLevel !== undefined && brainMetrics?.stressLevel !== null;
  const stressLevel = brainMetrics?.stressLevel ?? 0;
  const stressInverted = hasStressData ? 6 - stressLevel : 0;
  const stressScore = hasStressData ? (stressInverted / 5) * 25 : 0;

  components.push({
    name: 'stressLevel',
    value: hasStressData ? stressLevel : 0,
    maxValue: 5,
    contribution: stressScore,
    status: !hasStressData ? 'missing' : stressLevel <= 2 ? 'positive' : stressLevel <= 3 ? 'neutral' : 'negative',
    label: hasStressData ? `Stress: ${stressLevel}/5` : 'Stress: Not tracked',
    hasData: hasStressData,
    actionRoute: 'BrainHealth',
    actionLabel: 'Log stress level',
  });

  if (hasStressData) {
    totalScore += stressScore;
    componentsWithData++;
  }
  maxPossibleScore += 25;

  // Calculate pillar score as percentage of tracked components only
  const pillarScore = componentsWithData > 0
    ? Math.round((totalScore / maxPossibleScore) * 100 * (componentsWithData / 3))
    : 0;

  return {
    name: 'foundation',
    score: pillarScore,
    weight: PILLAR_WEIGHTS.foundation,
    weightedScore: Math.round(pillarScore * PILLAR_WEIGHTS.foundation),
    components,
  };
};

/**
 * Calculate Consistency pillar (30%)
 * Components: Habit Compliance (15%), 4-3-2-1 (10%), Streak Bonus (5%)
 * Only includes components with actual data in the score
 */
const calculateConsistencyPillar = (
  habits: Habit[],
  habitCompletions: HabitCompletion[],
  fourThreeTwoOne: FourThreeTwoOneEntry | null
): WellnessScorePillar => {
  const components: WellnessScoreComponent[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;
  let componentsWithData = 0;

  // Habit Compliance (15% of total = 50% of pillar)
  const dailyHabits = habits.filter(h => h.type === 'daily');
  const hasHabits = dailyHabits.length > 0;
  const completedHabits = habitCompletions.filter(c => c.completed).length;
  const habitComplianceRate = hasHabits ? (completedHabits / dailyHabits.length) * 100 : 0;
  const habitScore = hasHabits ? (habitComplianceRate / 100) * 50 : 0;

  components.push({
    name: 'habitCompliance',
    value: completedHabits,
    maxValue: dailyHabits.length,
    contribution: habitScore,
    status: !hasHabits ? 'missing' : habitComplianceRate >= 80 ? 'positive' : habitComplianceRate >= 50 ? 'neutral' : 'negative',
    label: hasHabits ? `Habits: ${completedHabits}/${dailyHabits.length}` : 'Habits: None set up',
    hasData: hasHabits,
    actionRoute: 'Habits',
    actionLabel: hasHabits ? 'Complete habits' : 'Create a habit',
  });

  if (hasHabits) {
    totalScore += habitScore;
    componentsWithData++;
  }
  maxPossibleScore += 50;

  // 4-3-2-1 Practice (10% of total = 33% of pillar)
  const hasFourThreeTwoOne = fourThreeTwoOne !== null;
  const fourThreeTwoOneCompleted = fourThreeTwoOne?.completed || false;
  const fourThreeTwoOnePartsCompleted = fourThreeTwoOne
    ? [
        fourThreeTwoOne.fourMinutes,
        fourThreeTwoOne.threeWins?.completed,
        fourThreeTwoOne.twoFuel?.completed,
        fourThreeTwoOne.oneConnection,
      ].filter(Boolean).length
    : 0;
  const fourThreeTwoOneScore = hasFourThreeTwoOne ? (fourThreeTwoOnePartsCompleted / 4) * 33 : 0;

  components.push({
    name: 'fourThreeTwoOne',
    value: fourThreeTwoOnePartsCompleted,
    maxValue: 4,
    contribution: fourThreeTwoOneScore,
    status: !hasFourThreeTwoOne ? 'missing' : fourThreeTwoOneCompleted ? 'positive' : fourThreeTwoOnePartsCompleted >= 2 ? 'neutral' : 'negative',
    label: hasFourThreeTwoOne ? `4-3-2-1: ${fourThreeTwoOnePartsCompleted}/4` : '4-3-2-1: Not started',
    hasData: hasFourThreeTwoOne,
    actionRoute: 'Dashboard',
    actionLabel: 'Complete 4-3-2-1',
  });

  if (hasFourThreeTwoOne) {
    totalScore += fourThreeTwoOneScore;
    componentsWithData++;
  }
  maxPossibleScore += 33;

  // Streak Bonus (5% of total = 17% of pillar) - only counts if habits exist
  const activeStreaks = habits.filter(h => (h.streak ?? 0) >= 3).length;
  const totalHabitsWithStreakPotential = habits.length;
  const hasStreakData = totalHabitsWithStreakPotential > 0;
  const streakRate = hasStreakData ? (activeStreaks / totalHabitsWithStreakPotential) * 100 : 0;
  const streakScore = hasStreakData ? (streakRate / 100) * 17 : 0;

  components.push({
    name: 'streakBonus',
    value: activeStreaks,
    maxValue: totalHabitsWithStreakPotential,
    contribution: streakScore,
    status: !hasStreakData ? 'missing' : activeStreaks >= 2 ? 'positive' : activeStreaks >= 1 ? 'neutral' : 'negative',
    label: hasStreakData ? `Active runs: ${activeStreaks}` : 'Streaks: Build consistency',
    hasData: hasStreakData,
    actionRoute: 'Habits',
    actionLabel: 'Keep returning',
  });

  if (hasStreakData) {
    totalScore += streakScore;
    componentsWithData++;
  }
  maxPossibleScore += 17;

  // Calculate pillar score as percentage of tracked components only
  const pillarScore = componentsWithData > 0
    ? Math.round((totalScore / maxPossibleScore) * 100 * (componentsWithData / 3))
    : 0;

  return {
    name: 'consistency',
    score: pillarScore,
    weight: PILLAR_WEIGHTS.consistency,
    weightedScore: Math.round(pillarScore * PILLAR_WEIGHTS.consistency),
    components,
  };
};

/**
 * Calculate Mind pillar (20%)
 * Components: Mood (10%), Journal Activity (5%), Nervous System (5%)
 * Only includes components with actual data in the score
 */
const calculateMindPillar = (
  journalEntry: JournalEntry | null,
  recentJournalEntries: JournalEntry[],
  brainMetrics: BrainMetrics | null,
  morningCheckIn: MorningCheckIn | null
): WellnessScorePillar => {
  const components: WellnessScoreComponent[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;
  let componentsWithData = 0;

  // Mood (10% of total = 50% of pillar)
  // Priority: morning check-in > journal entry
  const hasMoodFromCheckIn = morningCheckIn?.mood !== undefined && morningCheckIn?.mood !== null;
  const hasMoodFromJournal = journalEntry?.mood !== undefined && journalEntry?.mood !== null;
  const hasMoodData = hasMoodFromCheckIn || hasMoodFromJournal;

  let moodValue = 0;
  if (hasMoodFromCheckIn) {
    moodValue = morningCheckIn!.mood;
  } else if (hasMoodFromJournal) {
    moodValue = moodToNumber(journalEntry!.mood);
  }
  const moodScore = hasMoodData ? (moodValue / 5) * 50 : 0;

  components.push({
    name: 'mood',
    value: hasMoodData ? moodValue : 0,
    maxValue: 5,
    contribution: moodScore,
    status: !hasMoodData ? 'missing' : moodValue >= 4 ? 'positive' : moodValue >= 3 ? 'neutral' : 'negative',
    label: hasMoodData ? `Mood: ${moodValue}/5` : 'Mood: Not logged',
    hasData: hasMoodData,
    actionRoute: 'Journal',
    actionLabel: 'Log your mood',
  });

  if (hasMoodData) {
    totalScore += moodScore;
    componentsWithData++;
  }
  maxPossibleScore += 50;

  // Journal Activity (5% of total = 25% of pillar)
  const journaledToday = !!journalEntry;
  const recentJournalCount = recentJournalEntries.length;
  const hasJournalActivity = journaledToday || recentJournalCount > 0;
  const journalScore = journaledToday ? 25 : (recentJournalCount >= 3 ? 15 : (recentJournalCount > 0 ? 10 : 0));

  components.push({
    name: 'journalActivity',
    value: journaledToday ? 1 : 0,
    maxValue: 1,
    contribution: journalScore,
    status: !hasJournalActivity ? 'missing' : journaledToday ? 'positive' : recentJournalCount >= 3 ? 'neutral' : 'negative',
    label: journaledToday ? 'Journaled today' : hasJournalActivity ? `${recentJournalCount} entries this week` : 'Journal: Not started',
    hasData: hasJournalActivity,
    actionRoute: 'Journal',
    actionLabel: 'Write in journal',
  });

  if (hasJournalActivity) {
    totalScore += journalScore;
    componentsWithData++;
  }
  maxPossibleScore += 25;

  // Nervous System Regulation (5% of total = 25% of pillar)
  const hasNervousSystemData = brainMetrics?.nervousSystemToolUses !== undefined && brainMetrics?.nervousSystemToolUses !== null;
  const nervousSystemUses = brainMetrics?.nervousSystemToolUses ?? 0;
  const nervousSystemScore = hasNervousSystemData ? Math.min(nervousSystemUses, 2) * 12.5 : 0;

  components.push({
    name: 'nervousSystemRegulation',
    value: hasNervousSystemData ? nervousSystemUses : 0,
    maxValue: 2,
    contribution: nervousSystemScore,
    status: !hasNervousSystemData ? 'missing' : nervousSystemUses >= 2 ? 'positive' : nervousSystemUses >= 1 ? 'neutral' : 'negative',
    label: hasNervousSystemData ? `Calming tools: ${nervousSystemUses}` : 'Calming tools: Not used',
    hasData: hasNervousSystemData,
    actionRoute: 'Breathwork',
    actionLabel: 'Try a breathing exercise',
  });

  if (hasNervousSystemData) {
    totalScore += nervousSystemScore;
    componentsWithData++;
  }
  maxPossibleScore += 25;

  // Calculate pillar score as percentage of tracked components only
  const pillarScore = componentsWithData > 0
    ? Math.round((totalScore / maxPossibleScore) * 100 * (componentsWithData / 3))
    : 0;

  return {
    name: 'mind',
    score: pillarScore,
    weight: PILLAR_WEIGHTS.mind,
    weightedScore: Math.round(pillarScore * PILLAR_WEIGHTS.mind),
    components,
  };
};

/**
 * Calculate Growth pillar (10%)
 * Components: AMCC Challenge (5%), Connection (5%)
 * These are binary actions - they count as "has data" once completed
 */
const calculateGrowthPillar = (
  brainMetrics: BrainMetrics | null,
  fourThreeTwoOne: FourThreeTwoOneEntry | null
): WellnessScorePillar => {
  const components: WellnessScoreComponent[] = [];
  let totalScore = 0;
  let componentsWithData = 0;

  // AMCC Challenge (5% of total = 50% of pillar)
  // This is an optional daily challenge - not having it is different from "missing data"
  const amccCompleted = brainMetrics?.amccCompleted === true;
  const amccScore = amccCompleted ? 50 : 0;

  components.push({
    name: 'amccChallenge',
    value: amccCompleted ? 1 : 0,
    maxValue: 1,
    contribution: amccScore,
    status: amccCompleted ? 'positive' : 'neutral', // Not negative - it's optional
    label: amccCompleted ? 'Did something hard' : 'Challenge yourself',
    hasData: true, // Always counts as "has data" since it's an optional action
    actionRoute: 'BrainHealth',
    actionLabel: 'Do something challenging',
  });
  totalScore += amccScore;
  componentsWithData++;

  // Connection (5% of total = 50% of pillar)
  // Also an optional daily action
  const hadConnection = fourThreeTwoOne?.oneConnection === true;
  const connectionScore = hadConnection ? 50 : 0;

  components.push({
    name: 'connection',
    value: hadConnection ? 1 : 0,
    maxValue: 1,
    contribution: connectionScore,
    status: hadConnection ? 'positive' : 'neutral', // Not negative - it's optional
    label: hadConnection ? 'Connected today' : 'Connect with someone',
    hasData: true, // Always counts as "has data" since it's an optional action
    actionRoute: 'Dashboard',
    actionLabel: 'Log a connection',
  });
  totalScore += connectionScore;
  componentsWithData++;

  return {
    name: 'growth',
    score: Math.round(totalScore),
    weight: PILLAR_WEIGHTS.growth,
    weightedScore: Math.round(totalScore * PILLAR_WEIGHTS.growth),
    components,
  };
};

/**
 * Determine what's helping and hurting the score
 */
const determineInsights = (
  pillars: DailyWellnessScore['pillars']
): { topContributor: string; topDetractor: string; suggestion: string } => {
  // Collect all components with their absolute contribution
  const allComponents: { name: string; contribution: number; label: string; pillar: string }[] = [];

  Object.entries(pillars).forEach(([pillarName, pillar]) => {
    pillar.components.forEach(component => {
      allComponents.push({
        name: component.name,
        contribution: component.contribution,
        label: component.label || component.name,
        pillar: pillarName,
      });
    });
  });

  // Sort by contribution
  const sorted = [...allComponents].sort((a, b) => b.contribution - a.contribution);

  // Top contributor is the highest scoring component
  const topContributor = sorted[0]?.label || 'Sleep';

  // Top detractor is the lowest scoring component that could be higher
  const detractors = allComponents.filter(c => c.contribution < 15); // Below threshold
  const sortedDetractors = detractors.sort((a, b) => a.contribution - b.contribution);
  const topDetractor = sortedDetractors[0]?.label || 'None';

  // Generate suggestion based on biggest opportunity
  const suggestions: Record<string, string> = {
    sleepQuality: 'Try to get 7-8 hours of sleep tonight',
    hydration: 'Aim for 8 glasses of water today',
    stressLevel: 'Take a few deep breaths or try a calming exercise',
    habitCompliance: 'Complete one more habit to boost your score',
    fourThreeTwoOne: 'Try the 4-3-2-1 practice before bed',
    streakBonus: 'Consistency supports progress',
    mood: 'Try journaling about how you feel',
    journalActivity: 'Take 5 minutes to journal today',
    nervousSystemRegulation: 'Try a physiological sigh to calm your nervous system',
    amccChallenge: 'Do one small thing outside your comfort zone',
    connection: 'Reach out to someone you care about',
  };

  const suggestion = sortedDetractors[0]
    ? suggestions[sortedDetractors[0].name] || 'Keep up the great work!'
    : 'You\'re doing amazing! Keep it up!';

  return { topContributor, topDetractor, suggestion };
};

/**
 * Calculate data completeness (how much data we have)
 */
const calculateDataCompleteness = (data: WellnessDataSources): { completeness: number; missing: string[] } => {
  const missing: string[] = [];
  let available = 0;
  const total = 6;

  if (data.brainMetrics?.sleepQuality) available++; else missing.push('Sleep quality');
  if (data.brainMetrics?.hydrationChecks) available++; else missing.push('Hydration');
  if (data.brainMetrics?.stressLevel) available++; else missing.push('Stress level');
  if (data.habits.length > 0) available++; else missing.push('Habits');
  if (data.morningCheckIn || data.journalEntry?.mood) available++; else missing.push('Mood check-in');
  if (data.fourThreeTwoOne) available++; else missing.push('4-3-2-1 practice');

  return {
    completeness: Math.round((available / total) * 100),
    missing,
  };
};

/**
 * Calculate the complete wellness score
 */
export const calculateWellnessScore = async (userId: string): Promise<DailyWellnessScore> => {
  if (!db) throw new Error('Firestore is not initialized');
  // Fetch all data
  const data = await fetchWellnessData(userId);

  // Calculate pillars
  const foundationPillar = calculateFoundationPillar(data.brainMetrics, data.morningCheckIn);
  const consistencyPillar = calculateConsistencyPillar(data.habits, data.habitCompletions, data.fourThreeTwoOne);
  const mindPillar = calculateMindPillar(data.journalEntry, data.recentJournalEntries, data.brainMetrics, data.morningCheckIn);
  const growthPillar = calculateGrowthPillar(data.brainMetrics, data.fourThreeTwoOne);

  const pillars = {
    foundation: foundationPillar,
    consistency: consistencyPillar,
    mind: mindPillar,
    growth: growthPillar,
  };

  // Calculate overall score
  const overallScore = Math.round(
    foundationPillar.weightedScore +
    consistencyPillar.weightedScore +
    mindPillar.weightedScore +
    growthPillar.weightedScore
  );

  // Determine trend (use null instead of undefined for Firebase compatibility)
  const previousScore = data.yesterdayScore?.score ?? null;
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (previousScore !== null) {
    if (overallScore > previousScore + 5) trend = 'up';
    else if (overallScore < previousScore - 5) trend = 'down';
  }

  // Get insights
  const { topContributor, topDetractor, suggestion } = determineInsights(pillars);

  // Calculate data completeness
  const { completeness, missing } = calculateDataCompleteness(data);

  // Gather all components and calculate tracking stats
  const allComponents: { component: WellnessScoreComponent; pillar: 'foundation' | 'consistency' | 'mind' | 'growth' }[] = [];

  foundationPillar.components.forEach(c => allComponents.push({ component: c, pillar: 'foundation' }));
  consistencyPillar.components.forEach(c => allComponents.push({ component: c, pillar: 'consistency' }));
  mindPillar.components.forEach(c => allComponents.push({ component: c, pillar: 'mind' }));
  growthPillar.components.forEach(c => allComponents.push({ component: c, pillar: 'growth' }));

  const componentsTotal = allComponents.length;
  const componentsTracked = allComponents.filter(c => c.component.hasData).length;

  // Calculate max possible score based on components with data
  // Each pillar contributes its weighted percentage when fully complete
  const maxPossibleScore = Math.round(
    (foundationPillar.components.some(c => c.hasData) ? PILLAR_WEIGHTS.foundation * 100 : 0) +
    (consistencyPillar.components.some(c => c.hasData) ? PILLAR_WEIGHTS.consistency * 100 : 0) +
    (mindPillar.components.some(c => c.hasData) ? PILLAR_WEIGHTS.mind * 100 : 0) +
    (growthPillar.components.some(c => c.hasData) ? PILLAR_WEIGHTS.growth * 100 : 0)
  );

  // Generate incomplete actions for components without data
  // Priority based on pillar weight (foundation > consistency > mind > growth)
  const pillarPriority: Record<string, number> = {
    foundation: 1,
    consistency: 2,
    mind: 3,
    growth: 4,
  };

  const incompleteActions: WellnessIncompleteAction[] = allComponents
    .filter(({ component }) => !component.hasData && component.status === 'missing')
    .map(({ component, pillar }) => ({
      component: component.name,
      label: component.label || component.name,
      description: component.actionLabel || `Track your ${component.name}`,
      route: component.actionRoute || 'Dashboard',
      priority: pillarPriority[pillar],
      pillar,
    }))
    .sort((a, b) => a.priority - b.priority);

  const todayDate = getTodayDate();
  const scoreId = `${userId}_${todayDate}`;

  const wellnessScore: DailyWellnessScore = {
    id: scoreId,
    userId,
    date: todayDate,
    score: overallScore,
    previousScore,
    trend,
    pillars,
    topContributor,
    topDetractor,
    suggestion,
    dataCompleteness: completeness,
    missingData: missing.length > 0 ? missing : null,
    maxPossibleScore,
    componentsTracked,
    componentsTotal,
    incompleteActions,
    morningCheckIn: data.morningCheckIn ? {
      energyLevel: data.morningCheckIn.energyLevel,
      mood: data.morningCheckIn.mood,
    } : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  return wellnessScore;
};

/**
 * Get today's wellness score (cached if already calculated)
 */
export const getTodayWellnessScore = async (userId: string): Promise<DailyWellnessScore | null> => {
  if (!db) return null;
  try {
    const todayDate = getTodayDate();
    const scoreId = `${userId}_${todayDate}`;
    const docRef = doc(db, WELLNESS_SCORES_COLLECTION, scoreId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DailyWellnessScore;
    }
    return null;
  } catch (error) {
    console.error('Error getting wellness score:', error);
    return null;
  }
};

/**
 * Save today's wellness score
 */
export const saveWellnessScore = async (score: DailyWellnessScore): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const docRef = doc(db, WELLNESS_SCORES_COLLECTION, score.id);
    await setDoc(docRef, {
      ...score,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving wellness score:', error);
    throw error;
  }
};

/**
 * Refresh and save wellness score (recalculate from current data)
 */
export const refreshWellnessScore = async (userId: string): Promise<DailyWellnessScore> => {
  const score = await calculateWellnessScore(userId);
  await saveWellnessScore(score);
  return score;
};

/**
 * Get wellness score history for charts/trends
 */
export const getWellnessScoreHistory = async (
  userId: string,
  days: number = 7
): Promise<DailyWellnessScore[]> => {
  if (!db) return [];
  try {
    const scoresQuery = query(
      collection(db, WELLNESS_SCORES_COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(days)
    );

    const snapshot = await getDocs(scoresQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyWellnessScore));
  } catch (error) {
    console.error('Error getting wellness score history:', error);
    return [];
  }
};

/**
 * Get score color based on value
 */
export const getScoreColor = (score: number): 'error' | 'warning' | 'success' => {
  if (score < 50) return 'error';
  if (score < 75) return 'warning';
  return 'success';
};

/**
 * Get score label based on value
 */
export const getScoreLabel = (score: number): string => {
  if (score >= 85) return 'Excellent';
  if (score >= 75) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 35) return 'Needs attention';
  return 'Rest day';
};

/**
 * Get whether wellness score tracking is enabled for a user
 */
export const getWellnessScoreEnabled = async (userId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      // Default to false (opt-in)
      return data.wellnessScoreEnabled === true;
    }
    return false;
  } catch (error) {
    console.error('Error getting wellness score enabled:', error);
    return false;
  }
};

/**
 * Set whether wellness score tracking is enabled for a user
 */
export const setWellnessScoreEnabled = async (userId: string, enabled: boolean): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      wellnessScoreEnabled: enabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error setting wellness score enabled:', error);
    throw error;
  }
};
